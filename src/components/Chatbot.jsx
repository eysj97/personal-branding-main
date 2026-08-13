import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GREETING, QUICK } from "../data/chatbot";
import { match } from "../lib/chatbotMatch";
import { useIsMobile } from "../lib/viewport";

// A launcher in the corner and a panel above it. Fixed, so it rides over every
// section without joining any of them — none of the scroll timelines on this
// page should ever have to know it is there.
//
// The answers are generated from her own written material — see ../data/
// chatbot.js for what that material is and lib/chatbotMatch for how the panel
// gets one, including what it does when there is no endpoint to ask.

// A floor on how long "답변 중…" is up, not a delay added to the answer.
//
// It was theatre over an instant lookup. Now the answer is a real request and
// usually takes longer than this anyway — what the floor is for is the case
// that does not: a fallback to the written answer returns in about a
// millisecond, and a reply that appears in the same frame as the question reads
// as a canned response rather than as her answering.
const REPLY_MS = 380;

// How long the greeting has the panel to itself before the quick questions
// come in under it.
const CHIPS_MS = 520;

// The character: the pink circle, and how far it stands off the conversation
// when the chat is open.
//
// 90, against the 56 the design draws it at. It is the only thing on the page
// inviting you to ask something, it sits in the corner competing with whatever
// section is behind it, and at 56 it read as a dot. The gap grows with it so
// the character keeps the same relationship to the bubbles.
//
// This number is the source: the glasses that lands on it measures the circle
// rather than carrying its own size (see the dock loops in Hero and
// mobile/MobileHero), so changing it here moves both.
const CHAR_SIZE = 90;
const CHAR_GAP = 30;
// The conversation is set at 16 against the design's 12, and everything that
// holds it is scaled by the same ratio: the bubbles' radius and padding, the
// quick questions, the composer and its button, the gaps between them, and the
// panel's own width.
//
// One factor rather than a size per element, because a chat panel is a stack of
// boxes wrapped around one line height — grow the type and leave the boxes and
// it is type in cramped boxes; grow them by different amounts and the padding
// stops being padding and starts being a set of unrelated numbers.
const CHAT_FONT = 16;
const CHAT_SCALE = CHAT_FONT / 12;
const px = (n) => `${Math.round(n * CHAT_SCALE)}px`;

// Its home while the chat is shut — 44 in from the right, 20 up from the
// bottom, which puts its middle on the corner insets Hero falls back to.
const corner = () => ({
  left: window.innerWidth - 44 - CHAR_SIZE,
  top: window.innerHeight - 20 - CHAR_SIZE,
});

// The two bubbles, from the design (Figma 343:3338 and 343:3335).
//
// The square corner is the tail. Each bubble is rounded on three corners and
// left square on the one nearest its own side of the panel — bottom-left for
// hers, bottom-right for yours — so which way a message is pointing is legible
// without reading it.
//
// Hers is white with a #0492bd outline and runs the full column width; yours is
// filled #0492bd and shrinks to its text. 12px both, and `leading-[14px]` is
// the design's own measurement (its greeting is a 28px box over two lines).
//
// pre-line so a written answer can break its own lines. The greeting does.
// `snap-start` is what makes the log scroll a bubble at a time — see the log's
// own snap-y/snap-mandatory. Every scroll settles with some bubble's top edge
// on the top of the log, so it never stops halfway through one.
// `word-break: keep-all` is not a nicety here. Korean has no default break
// opportunity inside a word, so a browser laying out Hangul will split one
// wherever the line runs out — which is how the greeting's "알려드립니다" came
// to be "알려드립니 / 다". With this, a line that does not fit breaks between
// words, which is what a reader expects and what the design shows.
//
// The greeting is written as two sentences on two lines — a newline in
// GREETING, honoured by `whitespace-pre-line` — and the panel is sized so each
// of them fits on one. But that is a fact about this one string; the rule above
// is what keeps every other answer readable when it does not fit.
const BOT_BUBBLE =
  "w-full snap-start whitespace-pre-line [word-break:keep-all] rounded-bl-none border-2 border-[#0492bd] bg-white font-['Pretendard'] text-black";
const YOU_BUBBLE =
  "max-w-[85%] snap-start self-end whitespace-pre-line [word-break:keep-all] rounded-br-none bg-[#0492bd] font-['Pretendard'] font-medium text-white";
// The part of a bubble that is a number, scaled. `leading-[14px]` on 12px type
// is the design's own measurement — its greeting is a 28px box over two lines —
// so it rides the same factor rather than becoming a ratio.
const bubbleStyle = {
  borderRadius: px(15),
  paddingLeft: px(20),
  paddingRight: px(20),
  paddingTop: px(10),
  paddingBottom: px(10),
  fontSize: px(12),
  lineHeight: px(14),
};

let seq = 0;
const nextId = () => (seq += 1);

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState([
    { id: nextId(), from: "bot", text: GREETING },
  ]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  // Whether the question field has focus. Only the send button's brightness
  // reads it — see the input at the foot of the panel.
  const [inputFocused, setInputFocused] = useState(false);
  // The chat is a corner panel on the desktop and a page of its own on a phone
  // — see the panel's className for why.
  const isMobile = useIsMobile();
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  // Keep the newest message in view. `scrollTop` on the log rather than
  // scrollIntoView, which would drag the whole page to the panel.
  //
  // Layout, not effect, and declared above the character's placement below so
  // it runs first: that one measures the last bubble, and measuring it before
  // this scroll has happened reads the position it is about to leave.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [thread, pending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The quick questions hold back on the first frame, so opening the chat is
  // the character saying hello and nothing else. They arrive a moment later,
  // which is also the moment the greeting's "상단 버튼" starts being true.
  const [chipsIn, setChipsIn] = useState(false);
  useEffect(() => {
    if (!open) {
      setChipsIn(false);
      return undefined;
    }
    const t = setTimeout(() => setChipsIn(true), CHIPS_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Where the character sits, in viewport px — its own top-left corner.
  //
  // Set here rather than left to `bottom-5 right-11`, because it has two homes
  // now: the corner while the chat is shut, and beside the conversation once it
  // is open, which is where the design puts it. Neither is expressible as one
  // fixed pair of utilities, and the open one depends on how tall the panel has
  // grown.
  //
  // `left`/`top` and not a transform: the shared idle animation owns transform
  // on this element, and a second one here would simply overwrite it.
  //
  // Hero measures this element every frame and puts the glasses on top of
  // whatever it finds, so nothing there needs telling about any of this.
  const [spot, setSpot] = useState(() => corner());
  useLayoutEffect(() => {
    function place() {
      const panel = panelRef.current;
      if (!open || !panel) {
        setSpot(corner());
        return;
      }
      const p = panel.getBoundingClientRect();
      // The newest thing she has said — including "답변 중…", which is her
      // about to say it. The character belongs to whichever bubble is hers
      // most recently, so it walks down the conversation as it goes rather
      // than staying parked at the greeting.
      const bubbles = panel.querySelectorAll('[data-from="bot"]');
      const last = bubbles[bubbles.length - 1]?.getBoundingClientRect();
      setSpot({
        // Never off the left edge — a narrow window keeps the character on
        // screen even if that means crowding the panel.
        left: Math.max(8, p.left - CHAR_GAP - CHAR_SIZE),
        // Centred on that bubble. Its height varies a lot — the greeting is two
        // lines and a full answer can be six — and centring is the one rule
        // that reads right at both ends.
        top: last ? last.top + last.height / 2 - CHAR_SIZE / 2 : p.top,
      });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    // Every new message moves the bubble this is meant to be level with, and
    // `pending` is its own move: out to "답변 중…" and then on to the answer.
  }, [open, thread.length, pending]);

  // The button waits for the hero to be done with the page.
  //
  // It checks the hero's own bottom edge rather than a scroll number, because
  // that is the same edge the glasses' travel is timed off (see the dock loop
  // in Hero) — the circle appears exactly as the glasses sets out towards it,
  // and the two cannot drift apart when the hero's height changes.
  //
  // Its own listener rather than being told by Hero: a button that decides when
  // it is available is easier to reason about than one waiting to be switched
  // on from another section.
  //
  // Two moments, not one. `docked` is the circle appearing, as the glasses sets
  // out towards it. `landed` is the glasses arriving — the same instant Hero's
  // dock loop reaches the end of its travel — and it is what starts the idle.
  // Both are read off the hero's own bottom edge, so neither can drift from the
  // motion it belongs to.
  const [docked, setDocked] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    // Either hero — the desktop's or the phone's. They are two components with
    // two class names but one job, and the circle's timing is the same for
    // both: it belongs to whichever one is on the page.
    const hero = document.querySelector(".section-hero, .section-mobile-hero");
    // No hero on the page at all — then there is nothing to wait for.
    if (!hero) {
      setDocked(true);
      setLanded(true);
      return undefined;
    }
    const check = () => {
      const { bottom } = hero.getBoundingClientRect();
      setDocked(bottom <= window.innerHeight);
      // The hero fully gone, which is where the travel ends.
      setLanded(bottom <= 0);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);


  // One way to close, however it was asked for — the X in the header, Escape,
  // or the launcher again. Focus goes back to the launcher rather than being
  // left on a panel that is no longer there.
  const close = useCallback(() => {
    setOpen(false);
    document.getElementById("chatbot-launcher")?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Ask, then answer. The wait used to be REPLY_MS of theatre over an instant
  // lookup; it is a real request now, so the delay is only a floor — enough for
  // "답변 중…" to register as her thinking rather than as a flicker, and no more
  // than that if the answer takes longer anyway.
  async function ask(question) {
    const text = question.trim();
    if (!text || pending) return;
    setDraft("");
    setThread((t) => [...t, { id: nextId(), from: "you", text }]);
    setPending(true);

    // The matcher is instant, so what paces the reply is the timer below rather
    // than the lookup. It is still awaited as a pair: if an endpoint is ever put
    // back in front of this, the slower of the two wins and nothing else here
    // has to change.
    const [answer] = await Promise.all([
      Promise.resolve(match(text).text),
      new Promise((resolve) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(resolve, REPLY_MS);
      }),
    ]);

    setThread((t) => [...t, { id: nextId(), from: "bot", text: answer }]);
    setPending(false);
  }

  return (
    <>
      {/* The face the hero's glasses comes down to land on.
          It is here from the first frame and never moves — the travelling part
          is the glasses, which parks over this and stays pointer-transparent so
          every click lands here. 56px across at `right-11` / `bottom-5` puts its
          middle 72 in from the right and 48 up from the bottom, which is the
          pair of numbers the dock loop in Hero aims at; get one of them wrong
          and the glasses sits beside its own button.

          Hover is a brightness change rather than a scale on purpose. Once the
          glasses has landed the two are meant to read as one character, and a
          scale here would move the circle out from under a pair of glasses that
          knows nothing about it. Only the shared idle transforms this. */}
      <button
        id="chatbot-launcher"
        type="button"
        data-chat-idle={landed ? "" : undefined}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chatbot-panel"
        aria-label={open ? "챗봇 닫기" : "윤수정에게 물어보기"}
        style={{
          left: spot.left,
          top: spot.top,
          // Sized here rather than by a `size-*` utility so CHAR_SIZE is the
          // one number: `corner()` and the walk beside the conversation are
          // both measured from it, and a class would be a second copy to keep
          // in step.
          width: CHAR_SIZE,
          height: CHAR_SIZE,
          transition:
            "left 340ms ease-out, top 340ms ease-out, opacity 300ms ease-out, filter 200ms ease-out",
        }}
        // Above the panel on a phone, below it on the desktop. The desktop
        // panel has no background of its own, so the circle shows through it
        // wherever it walks; the phone's panel is an opaque page, and at z-58
        // the character would be behind it — the one element that must stay
        // visible while the chat is open, since it is the chat.
        className={`fixed ${isMobile ? "z-[62]" : "z-[58]"} rounded-full bg-[#ff60b8] shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9e529] ${
          docked ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {open && (
        <div
          id="chatbot-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="윤수정 소개 챗봇"
          /* On the desktop: 300px in the corner, which is the width every
             bubble and the input are drawn at in the design.

             On a phone: the whole screen, on the site's own background. A 300px
             panel floating in the bottom corner of a 430px screen is a panel
             taking up most of the screen and pretending not to — it leaves a
             strip of the page showing round the edges that you cannot read or
             touch, which reads as something half-open. Filling the screen and
             painting the same colour makes it a page you went to, and the X in
             the corner is the way back.

             No card either way — no border, no header. The design is the
             conversation and nothing else, so the bubbles sit straight on the
             ground and each one carries its own fill.

             `pl` on the phone is the character's lane: the glasses walks down
             the left of the conversation beside whichever bubble is hers, and
             on a full-width panel the bubbles would otherwise be underneath it. */
          className={
            isMobile
              ? "fixed inset-0 z-[60] flex flex-col bg-[#06252e] px-5 pb-6 pl-[112px] pt-16"
              : "fixed bottom-24 right-11 z-[60] flex w-[min(440px,calc(100vw-5.5rem))] flex-col"
          }
        >
          {/* Escape and the launcher both close this, but neither is visible,
              and the design has no chrome to put a control in. So: a bare X in
              the corner, no title bar around it — the one closing affordance
              you can actually find, at the cost of the least design possible. */}
          <button
            type="button"
            onClick={close}
            aria-label="챗봇 닫기"
            className="mb-1 grid size-7 shrink-0 place-items-center self-end rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9e529]"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>

          {/* Above the thread, which is the design's arrangement and not a
              detail — the greeting sends you to "상단 버튼", and it would be
              pointing at nothing if these sat under the log the way they used
              to. They stay put as the conversation grows, so the way back to a
              starting question is always in the same place. */}
          <div
            className="flex flex-wrap gap-2 transition-opacity duration-300 ease-out"
            style={{
              opacity: chipsIn ? 1 : 0,
              pointerEvents: chipsIn ? "auto" : "none",
            }}
          >
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={pending}
                className="bg-[#c9e529] font-['Pretendard'] text-black transition-[filter,opacity] hover:brightness-95 disabled:opacity-50"
                style={{
                  borderRadius: px(15),
                  paddingLeft: px(10),
                  paddingRight: px(10),
                  paddingTop: px(3),
                  paddingBottom: px(3),
                  fontSize: px(12),
                  lineHeight: px(15),
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* max-h in vh so a short window does not push the composer off the
              screen; the log is what gives, not the input.

              Snapping is what makes it scroll a bubble at a time. Every child
              is a snap point (`snap-start` on the bubble classes), and mandatory
              rather than proximity because proximity only tidies up a stop that
              already landed near an edge — it will still leave you halfway
              through a bubble if that is where you stopped.

              A bubble taller than the log would be unreachable under a
              mandatory snap, so this only holds while they stay short of it:
              the log runs to 420px and six lines of answer is about 105px. Well
              clear, but that is the constraint if the type ever grows. */}
          {/* On a phone the log takes whatever is left of the page rather than
              being capped: the panel *is* the screen there, so a 420px ceiling
              would leave the conversation in a band with empty ground under it
              and the input floating below that. `flex-1` with `min-h-0` is what
              lets a flex child actually shrink and scroll. */}
          <div
            ref={logRef}
            className={`flex snap-y snap-mandatory flex-col overflow-y-auto ${
              isMobile ? "min-h-0 flex-1" : "max-h-[min(60vh,560px)]"
            }`}
            style={{ marginTop: px(11), gap: px(19) }}
          >
            {thread.map((m) => (
              <p
                key={m.id}
                data-from={m.from}
                className={m.from === "you" ? YOU_BUBBLE : BOT_BUBBLE}
                style={bubbleStyle}
              >
                {m.text}
              </p>
            ))}
            {pending && (
              <p
                data-from="bot"
                className={`${BOT_BUBBLE} text-black/45`}
                style={bubbleStyle}
                aria-live="polite"
              >
                답변 중…
              </p>
            )}
          </div>

          {/* The composer, scaled with the character.

              Every number here is the design's own multiplied by CHAR_SCALE —
              the bar's height and radius, the type, the padding that keeps the
              text clear of the button, and the button and its arrow. Scaled
              rather than re-chosen so the pill keeps its proportions: the
              button is still the same fraction of the bar's height and still
              sits the same fraction of it off the right edge.

              The send button sits inside the pill rather than beside it, which
              is where the design puts it — hence the field's larger padding on
              that side. */}
          <form
            className="relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            {/* No focus ring. It was a lime one, and lime is the site's accent
                rather than this control's: on a white pill with a blue border
                it read as a second, brighter border drawn around the first.
                The field says it has focus by lighting the send button instead
                — see below — which is the thing you were reaching for anyway. */}
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="궁금한 걸 입력해 주세요"
              aria-label="질문 입력"
              className="w-full border-2 border-[#0492bd] bg-white font-['Pretendard'] text-[#06252e] placeholder:text-black/35 focus:outline-none"
              style={{
                height: px(30),
                borderRadius: px(15),
                paddingLeft: px(14),
                paddingRight: px(30),
                fontSize: px(12),
              }}
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              aria-label="보내기"
              className="absolute grid place-items-center rounded-full bg-[#0492bd] text-white transition-opacity"
              // Full strength the moment the field is yours, not only once you
              // have typed something. Clicking into an input is the point at
              // which the control you are about to use should look available;
              // holding it at 40% until the first keystroke reads as the button
              // being broken rather than as the field being empty.
              //
              // It stays genuinely `disabled` while there is nothing to send —
              // this changes how it looks, not what it does.
              style={{
                right: px(4),
                top: px(4),
                width: px(22),
                height: px(22),
                opacity: inputFocused || draft.trim() ? 1 : 0.4,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: px(12), height: px(12) }}
                aria-hidden="true"
              >
                <path
                  d="M4 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
