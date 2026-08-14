import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import glassesImg from "../../assets/hero/glasses.svg";
import heroEyes from "../../assets/hero/hero-eyes.svg?raw";
import { driveWithScroll } from "../../lib/scrollDriver";
import { holdInside } from "../../lib/scrollHold";
import { HEADER_H, vw } from "./MobileHeader";

// The hero, on a phone. Figma 349:153, drawn at 430 x 932.
//
// A layout rather than a scaled-down copy of the desktop hero. The desktop one
// is a composition on a 1920 canvas; what survives a 390px screen is the shape
// of the thing — name at the top, glasses in the middle, the lead at the bottom
// — so it is built as three rows and the middle one takes whatever is left.
//
// The scroll timeline is the desktop's, beat for beat: black to the page
// colour, the eye shut then open, the copy arriving after it, and the English
// handing over to the Korean. Same numbers, same easing, read off the same scroll
// position. See Hero.jsx — the two render functions are meant to match, and if
// one is retimed the other should be.
//
// What is not here is the gaze. The desktop pupils follow a pointer, and a phone
// has none: a finger only reports while it is down, so following it would leave
// the eyes frozen wherever the last tap landed. They sit where the drawing puts
// them, which is exactly where the mobile design draws them.
//
// Sizes split two ways, and the split is the point:
//
//   - Display elements (the name, the glasses) are in vw off the design's 430
//     width, so the composition holds its proportions on any phone.
//   - The copy is in fixed px. Scaling 12px type by viewport is how you get 10px
//     body text on a small phone, and this is the one block on the screen that
//     has to be read rather than looked at. It wraps instead.
// The glasses artwork on the design's canvas. Same drawing as the desktop's, at
// the same aspect (324.43/315 against 512.91/498), which is why the eye overlay
// authored for the desktop lands on it unchanged — its open pupils sit at 31.4%
// and 47.4%, and the mobile design puts them at 31.4% and 47.4%.
const ART = { w: 324.43, h: 315 };

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// The timeline finishes here and the rest of the track is run-out — the
// desktop's number, for the desktop's reasons. See TIMELINE_END in Hero.jsx;
// the two are meant to match and retiming one means retiming the other.
const TIMELINE_END = 0.9;

// How wide the glasses ends up once it has parked on the chat button, and how
// long the travel takes to get going. Both the desktop's — see the dock loop in
// Hero.jsx, which this is the phone's half of.
const DOCK_SIZE = 126;
// How wide the glasses is against the circle it lands on.
//
// The design's own 64 on a 56 circle. The artwork carries its own margin — the
// frame sits inside about three quarters of the file's width — so this lands
// the lenses across the circle with the temple tips just inside its edge,
// which is a face wearing glasses. Pushed past this the temples hang off both
// sides and it stops being worn and starts being held.
const DOCK_OVERHANG = 64 / 56;

export default function MobileHero({ menuRef }) {
  const sectionRef = useRef(null);
  const overlayRef = useRef(null);
  // Two elements for one pair of glasses. `slotRef` is an empty box that stays
  // in the stage's layout and does nothing but hold the place — it is what the
  // flex row sizes and centres, exactly as before. `artRef` is the drawing
  // itself, portalled out to the end of `body` and `fixed`, sitting on top of
  // whatever the slot's box currently is.
  //
  // Split because the glasses has to outlive the hero: it travels down to the
  // corner and becomes the chat character, and an element inside a `sticky`
  // stage cannot — sticky makes a stacking context, which boxes it in at the
  // stage's place in the paint order however high its z-index. Same reason and
  // same fix as the desktop's, and the slot is what keeps the composition
  // responsive rather than pinning it to a constant.
  const slotRef = useRef(null);
  const artRef = useRef(null);
  const idleRef = useRef(null);
  const textEnRef = useRef(null);
  const textKoRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const q = (sel) => [...artRef.current.querySelectorAll(sel)];
    const closedEye = q('[data-eye="closed"]');
    const openEye = q('[data-eye="open"]');
    const closedLens = q('[data-lens="closed"]');
    // Whether the intro has actually been played to its last frame — what the
    // scroll hold waits on. See scrollHold, and Hero.jsx for the same pair.
    let timelineDone = false;

    function render(raw) {
      const progress = clamp01(raw / TIMELINE_END);
      if (progress >= 1) timelineDone = true;
      const eyeProgress = clamp01(progress / 0.6);
      overlayRef.current.style.opacity = Math.pow(1 - eyeProgress, 1.5);

      // Shut, then open — one handover, on the same band the desktop uses. An
      // eyelid travels, it does not fade.
      const toOpen = smoothstep(0.6, 0.85, eyeProgress);
      const openOp = toOpen;
      const closedOp = 1 - toOpen;
      for (const el of closedEye) el.style.opacity = closedOp;
      for (const el of openEye) el.style.opacity = openOp;
      // The tint on the shut eye's own fade, so the lens clears as the eye
      // comes up instead of holding at one value and then vanishing.
      for (const el of closedLens) el.style.opacity = closedOp;

      // The copy arrives here, and the menu button with it — the same beat the
      // desktop brings its nav in on. The eyes finish opening at 0.6, so this
      // band is the moment just after: nothing to navigate with while she is
      // still asleep, and a way out of the hero the moment she is looking at
      // you.
      const revealT = smoothstep(0.55, 0.7, progress);
      if (menuRef?.current) {
        menuRef.current.style.opacity = revealT;
        // Faded alone, it would be an invisible button sitting over the
        // glasses for the whole first half of the scroll.
        menuRef.current.style.pointerEvents = revealT > 0.5 ? "auto" : "none";
      }
      // One leaves before the other arrives. The two languages are the same
      // sentence in the same place, so any moment where both are part-way up is
      // two paragraphs printed over each other — and tied to the scroll, that
      // moment is somewhere a reader can stop and sit.
      const langOut = smoothstep(0.76, 0.87, progress);
      const langIn = smoothstep(0.88, 0.99, progress);

      textEnRef.current.style.opacity = revealT * (1 - langOut);
      textKoRef.current.style.opacity = revealT * langIn;
    }

    // The glasses leaving the hero for the corner, and becoming the chat
    // character when it gets there. The desktop's dock loop, with the gaze
    // taken out — a phone has no hovering pointer for the eyes to follow.
    //
    // Driven by the section's own bottom edge rather than by its scroll
    // progress: progress is spent by the time the copy has arrived, and the
    // travel belongs to the screen after that, where the hero is scrolling
    // away. The bottom goes from a full viewport down to zero over exactly that
    // screen, which is the whole journey.
    function dock() {
      const art = artRef.current;
      const slot = slotRef.current;
      if (!art || !slot) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = clamp01((vh - rect.bottom) / vh);
      // Eased, so it neither sets off the instant the hero starts to leave nor
      // slams into the corner.
      const e = t * t * (3 - 2 * t);

      // Where it belongs right now if it were still in the layout — measured,
      // not computed, so the composition stays as responsive as it was.
      const from = slot.getBoundingClientRect();
      const circle = document.getElementById("chatbot-launcher");
      const to = circle?.getBoundingClientRect();

      const size = from.width || DOCK_SIZE;
      const endSize = to ? to.width * DOCK_OVERHANG : DOCK_SIZE;
      const width = size + (endSize - size) * e;
      const fromX = from.left + from.width / 2;
      const fromY = from.top + from.height / 2;
      const toX = to ? to.left + to.width / 2 : window.innerWidth - 72;
      const toY = to ? to.top + to.height / 2 : vh - 48;

      art.style.width = `${width}px`;
      art.style.left = `${fromX + (toX - fromX) * e}px`;
      art.style.top = `${fromY + (toY - fromY) * e}px`;

      // Once it has arrived, the character breathes — the same shared animation
      // the chat circle underneath runs, started off the same edge so the two
      // are in step. See `chatbot-idle` in index.css.
      idleRef.current?.toggleAttribute("data-chat-idle", t >= 1);
    }

    // Every frame, not just on scroll. The circle it follows moves without the
    // page moving: opening the chat walks it up beside the conversation, and
    // over a 340ms transition at that. Scroll alone would leave the glasses
    // parked in the corner while its circle walked out from under it, and it
    // would only catch up on the next wheel tick.
    //
    // Always running, and deliberately not gated on the hero being on screen.
    // The glasses is never off screen — once the hero has gone it is the chat
    // character in the corner — so there is no state in which the work is
    // wasted, and a background tab stops rAF on its own. Same reasoning, and
    // the same loop, as the desktop's.
    let dockId = requestAnimationFrame(function tick() {
      dock();
      dockId = requestAnimationFrame(tick);
    });
    window.addEventListener("resize", dock);

    const driver = driveWithScroll(section, render);
    document.fonts?.ready.then(driver.refresh);
    window.addEventListener("load", driver.refresh);
    // On a phone this matters more than on the desktop, not less: a flick
    // carries most of a page, and the menu's own jumps are the main way anyone
    // moves around down here.
    const releaseHold = holdInside(section, () => timelineDone);
    return () => {
      window.removeEventListener("load", driver.refresh);
      cancelAnimationFrame(dockId);
      window.removeEventListener("resize", dock);
      releaseHold();
      driver.stop();
    };
    // `menuRef` is a ref object created once by the page and never replaced, so
    // it is stable and this stays a mount-once effect.
  }, [menuRef]);

  return (
    // One screen of sticky stage plus two of scroll for the timeline to be read
    // off.
    //
    // dvh, and both of these have to be the same unit as each other *and* as
    // `window.innerHeight`, which is what the scroll driver measures against.
    // This was svh, and svh is the viewport with the address bar showing —
    // smaller than the screen whenever the bar is hidden. Two things went wrong
    // at once: the stage was shorter than the window, so the project section sat
    // visible in the strip underneath it the whole way through, and the driver's
    // range (300svh - innerHeight) no longer matched the distance the stage
    // actually stays pinned (200svh), so the timeline and the pin ended at
    // different scroll positions.
    //
    // dvh is the live viewport, so it equals innerHeight at every moment: the
    // stage exactly fills the screen, and the animation finishes on the same
    // pixel the hero starts to leave. The bar hiding resizes it, and the driver
    // re-measures on resize.
    <section ref={sectionRef} className="section-mobile-hero relative h-[300dvh]">
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden bg-[#336bec]">
        {/* A wash behind the composition, not a curtain over it.
            The name and the glasses are on the screen from the first frame and
            stay there — what the scroll changes is the ground they stand on,
            black to teal. Everything else in here sits above this and fades in
            on its own. */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 z-0 bg-black opacity-100"
        />

        {/* No header here — it is one fixed bar for the whole page now, drawn
            in MobileHeader. The stage keeps its height clear of it so the
            glasses sit where the design puts them rather than sliding up under
            the name. */}
        <div className="shrink-0" style={{ height: HEADER_H }} />

        {/* The glasses take the space between the two blocks and sit in the
            middle of it. `min-h-0` so this row is what gives on a short screen —
            the name and the copy keep their size and the artwork shrinks, which
            is the right way round. */}
        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
          {/* An empty box. It is the composition — the flex row sizes and
              centres it exactly as it always did — but the drawing is not in
              it: that is portalled out below and laid on top of whatever this
              box measures. See the note on slotRef. */}
          <div
            ref={slotRef}
            style={{ width: vw(ART.w), aspectRatio: `${ART.w} / ${ART.h}` }}
          />
        </div>

        {/* Both languages in one grid cell so the block does not change height
            at the handover — only the words change. */}
        <div className="relative z-10 grid shrink-0 px-[10px] py-[40px] text-white">
          <div
            ref={textEnRef}
            className="col-start-1 row-start-1 flex flex-col gap-[10px] font-['Plus_Jakarta_Sans'] opacity-0"
          >
            <p className="text-[18px] font-semibold leading-[1.2] tracking-[-0.36px]">
              Discover users&rsquo; unknown needs
              <br />
              and design experiences
            </p>
            <p className="text-[12px] leading-[1.2] tracking-[-0.24px]">
              With the sense of reading clients&rsquo; needs in the field of social
              welfare,
              <br />
              I&rsquo;m Sujeong Yoon, a UX/UI designer focused on improving user
              experience.
            </p>
          </div>

          <div
            ref={textKoRef}
            className="col-start-1 row-start-1 flex flex-col gap-[10px] font-['Pretendard'] opacity-0"
          >
            <p className="text-[18px] font-semibold leading-[1.2] tracking-[-0.36px]">
              사용자의 숨은 니즈를 발견하고
              <br />
              경험을 설계합니다
            </p>
            <p className="text-[12px] leading-[1.2] tracking-[-0.24px]">
              사회복지 현장에서 클라이언트의 니즈를 읽던 감각으로,
              <br />
              사용자 경험을 개선하는 UX/UI 디자이너 윤수정입니다.
            </p>
          </div>
        </div>
      </div>

      {/* The glasses itself, at the end of `body` rather than in the stage.
          While the hero is pinned it is laid exactly on the empty slot above,
          so the composition is unchanged; once the hero starts to leave it
          travels to the chat button and stays there as the character.

          Centred on its own position — hence the -50%/-50% — because the dock
          loop works in centres, which is the only thing the two ends have in
          common: the slot is 324 wide and the chat circle is 56.

          Decoration all the way down, never a control. It lands on the chat
          button rather than becoming one, and stays pointer-transparent so the
          taps it looks like it should take go straight through to the circle
          underneath. z-59 puts it over that circle's z-58. */}
      {createPortal(
        <div
          ref={artRef}
          aria-hidden="true"
          // z-63, one above the chat circle's z-62 on a phone — the glasses
          // lands *on* the circle and has to paint over it. Both sit under the
          // menu sheet and the case study at z-70, which are pages of their own
          // and do cover the character.
          className="pointer-events-none fixed z-[63] -translate-x-1/2 -translate-y-1/2 will-change-transform [&_svg]:absolute [&_svg]:inset-0 [&_svg]:h-full [&_svg]:w-full"
          style={{ aspectRatio: `${ART.w} / ${ART.h}` }}
        >
          {/* A layer of its own for the idle, because the element above owns
              its own position every frame. Nested, the two compose instead of
              overwriting each other. */}
          <div ref={idleRef} className="absolute inset-0">
            {/* Back to front: eye, the tinted lens over it, the frame over
                both. The overlay carries the first two in that order; the frame
                is the image, and it comes last because it is the thing in
                front. */}
            <span
              className="absolute inset-0 block"
              dangerouslySetInnerHTML={{ __html: heroEyes }}
            />
            <img
              src={glassesImg}
              alt=""
              className="absolute inset-0 h-full w-full"
              // No filter, for the reason the desktop hero gives: the frame is
              // a white stroke now rather than a bitmap that had to be turned
              // white. Both still wear the one file.
            />
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
