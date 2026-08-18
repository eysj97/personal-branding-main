import { useEffect, useRef, useState } from "react";
import { vw } from "./MobileHeader";
import { EMAIL, RESUME_HREF } from "../../data/contact";
import glasses from "../../assets/hero/glasses.svg";

/*  ABOUT — what the roles led to.
 *  Figma 1317:1149, 1318:1177, 1318:1230, 1318:1276, 1318:1304, all drawn at
 *  430 x 932.
 *
 *  Scrolled down, and that is the whole reason it is a section of its own
 *  rather than four more screens on CAREER's strip. The wheel is swiped
 *  through: it is one object being turned, and every screen of it is another
 *  turn of the same thing. This is not that. The circle has left the wheel, and
 *  leaving it should feel like leaving — a different gesture, a different
 *  section, the page moving on rather than the same page moving across.
 *
 *  What carries over is the circle. It arrives at the size CAREER hands it over
 *  at, grows into a face, drops to the foot of the screen and becomes the
 *  ground each chapter's word is set on, turns white when the page does, and
 *  ends up back in the middle carrying nothing. One element in five positions,
 *  because that is what it is — and because a thing that changes into another
 *  thing has to be the same node or there is nothing to interpolate.
 */

// The design's canvas, the same one every mobile section is written in.
const CANVAS = { width: 430, height: 932 };

// The three chapters share one circle: a 430 disc hung off the bottom left, so
// only its cap is on screen and the word it is carrying sits on that cap.
const BLOB = (fill) => ({ cx: 214, cy: 933, size: 430, fill });

// Where the circle is on each panel, and what it is. Centres rather than
// corners: it moves and resizes at every step, and a corner does both at once.
//
// Panel 0 is the handoff's own frame — the circle grown into a face, under the
// line that names what the roles led to. 1 to 3 hang it off the bottom of the
// screen so only its cap shows, which is the ground the chapter word sits on.
// 4 puts it back in the middle, smaller, with nothing on it.
const PANELS = [
  {
    key: "role",
    ground: "light",
    circle: { cx: 215, cy: 539.5, size: 371, fill: "#ffd527", face: true },
  },
  { key: "social", ground: "light", chapter: true, circle: BLOB("#ffd527") },
  {
    key: "change",
    ground: "dark",
    // The one frame the design writes her name backwards. The page turns over
    // here and so does she.
    reverse: true,
    chapter: true,
    circle: BLOB("#ffffff"),
  },
  { key: "uxui", ground: "dark", chapter: true, circle: BLOB("#ffffff") },
  {
    key: "contact",
    ground: "dark",
    // Up by the same 117 the card under it came up by.
    //
    // The design centres this on the canvas at 466 with the card starting at
    // 721 — 255 below it. The card is anchored to the bottom now so it clears
    // the chat character, which moved it up about 117, and the circle has to
    // come with it or the two stop being one composition: a disc centred on a
    // page whose copy has shuffled up is a disc sitting slightly low, and it
    // reads as a mistake rather than as a layout.
    circle: { cx: 215, cy: 349, size: 322, fill: "#ffffff" },
  },
];

// The three chapters, and they are not three screens with a label on each: they
// are three spokes of one wheel, a third of a turn apart. The wheel turns, the
// next spoke comes up, and that turn *is* how the chapter changes — word,
// heading and paragraph arriving together because they are bolted to the same
// arm. It is the wheel the circle came off doing the only thing a wheel does.
//
// Everything inside a spoke is written in plain canvas coordinates, exactly as
// the design gives them. The spoke is placed and turned; what it carries does
// not have to know it is on a wheel.
const WORD_TURN = 120;
const SPOKES = [
  {
    word: { text: "SOCIALWORKER", right: 399, top: 863, ink: "text-black" },
    tone: "light",
    top: 311,
    align: "center",
    title: "니즈를 찾고\n충족시키는 일",
    body:
      "4년간 정신건강사회복지사로 일하며,\n사람들이 말하지 않는 니즈를 읽고,\n채우는 일을 했습니다.\n니즈는 요구하는 것만이 아니라,\n미처 말하지 못하는 것까지\n포함합니다.",
  },
  {
    word: { text: "CHANGE", right: 314, top: 868, ink: "text-[#336bec]" },
    tone: "dark",
    top: 283,
    align: "center",
    title: "개입의 시점을\n고민하게 됩니다",
    body:
      "개입은 늘 문제가 발생한 이후였습니다\n문제가 생기기 전에 막을 수는 없을까\n그 고민의 끝에서 디자인을 만났습니다\n도망친 것이 아니라, 개입의 시점을\n사후에서 사전으로 재정의한 것입니다",
  },
  {
    word: { text: "UXUI DESIGNER", right: 383, top: 858, ink: "text-[#336bec]" },
    tone: "dark",
    top: 352,
    align: "center",
    title: "스스로 답을 찾습니다",
    body:
      "방향이 필요하면 스스로 답을\n찾는 것이 익숙합니다.\n막히면 방법을 찾아 풀고,\n그 과정에 AI를 도구로 씁니다.\n지금 보고 계신 이 사이트도\n직접 설계하고 만들었습니다.",
  },
];

// The point the wheel turns about: the blob's own centre, which is where the
// words sit on the rim and where the arms carrying the copy are hinged.
const HUB = { x: 214, y: 933 };

const MOVE_MS = 700;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// The size CAREER hands the circle over at — its wheel circle, unchanged — and
// the size this section's first panel wants it at.
//
// Between the two there is no animation, there is a scroll: the circle is the
// width of the reader's own travel out of one section and into the next, so it
// grows under the finger rather than playing a clip once the finger stops. That
// is what makes it read as the same circle rather than a small one leaving and
// a big one arriving.
// A third of a turn per chapter, which is what brings the next word up.
//
// It was a continuous roll off the scroll position for a while, on the reading
// that a wheel rolls as you push it. That is true and it was the wrong shape
// here: nothing was written on the rim, so the turn showed only in the face on
// the first panel, which rotated to vertical and read as a picture that had
// fallen over rather than a wheel going round. With the words on the rim the
// turn has something to carry, and it is a step rather than a drift — one
// chapter, one third.
const roll = (panel) => -WORD_TURN * Math.min(SPOKES.length - 1, Math.max(0, panel - 1));

const HANDOVER_FROM = 80;
const HANDOVER_TO = PANELS[0].circle.size;
// How far in before the circle answers at all.
//
// Nothing to do with taste: the section above ends where this one begins, so a
// few px of overscroll already counts as "entered", and the circle would come
// up in the middle of the window while the wheel above still had its own circle
// on the arc. Two circles in two places, which is what a peek buys. Past a
// tenth of a screen the section above is plainly leaving and there is only one.
const ENTRY_DEAD = 0.1;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** A chapter's heading and the paragraph under it. The chapter on white ranges
 *  its block left; the two on blue centre theirs, which is the design's own
 *  split rather than a preference. */
function Chapter({ title, body, tone, top, align, spin }) {
  const centred = align === "center";
  return (
    // `inset-x-0`, not `left: 50%` and a translate back.
    //
    // An absolutely positioned box with an automatic width is only as wide as
    // what is left after its offsets — so `left: 50%` capped these at half the
    // screen, and every line the design had set re-wrapped inside it. The
    // heading came out in three lines instead of two and the paragraph broke
    // mid-word. Spanning the full width and centring the *contents* is the
    // same placement without the cap.
    //
    // `whitespace-pre` for the same reason from the other side: the line breaks
    // are the design's, written into the copy, and nothing here should be free
    // to pick its own.
    <div
      className={`absolute inset-x-0 flex flex-col ${centred ? "items-center" : "items-start"}`}
      style={{
        top: vw(top),
        gap: vw(42),
        paddingInline: vw(27),
        // Levelled about its own middle while the arm it is on goes round — see
        // the note where this is passed in.
        transform: spin,
        transformOrigin: "center",
        transition: spin ? `transform ${MOVE_MS}ms ${EASE}` : undefined,
      }}
    >
      <p
        className={`whitespace-pre font-['Pretendard'] font-bold leading-none ${
          tone === "light" ? "text-[#336bec]" : "text-white"
        } ${centred ? "text-center" : "text-left"}`}
        style={{ fontSize: vw(42) }}
      >
        {title}
      </p>
      <p
        className={`whitespace-pre font-['Pretendard'] leading-[1.3] ${
          centred ? "text-center" : "text-left"
        } ${tone === "light" ? "text-black" : "text-white"}`}
        style={{ fontSize: vw(24) }}
      >
        {body}
      </p>
    </div>
  );
}

export default function MobileAbout() {
  const [at, setAt] = useState(0);
  const sectionRef = useRef(null);
  const layerRef = useRef(null);
  const circleRef = useRef(null);
  const faceRef = useRef(null);
  const wordsRef = useRef(null);
  const atRef = useRef(0);
  // `at` is only here for the things React has to re-render: the ground under
  // the header and the name over it. The circle does not read it — it works the
  // panel out itself, in the same frame it draws, because a state update that
  // arrives one frame late is a frame with the wrong circle on it. That is what
  // put a face on the first chapter.

  // The circle, written straight onto the element every frame the page moves.
  //
  // Not React state: on the way in it tracks the scroll, which would be a
  // re-render of the whole section per frame to move one box. The panels' own
  // state is the observer's above, and it changes five times in the whole
  // section.
  useEffect(() => {
    const section = sectionRef.current;
    const layer = layerRef.current;
    const dot = circleRef.current;
    const face = faceRef.current;
    const words = wordsRef.current;
    let ticking = false;

    const draw = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // Gone once the section is behind or ahead of the reader entirely.
      if (rect.bottom <= 0 || rect.top >= vh) {
        layer.style.opacity = "0";
        return;
      }

      // How far into the section the reader has come, as a fraction of one
      // screen. 0 is the section's top sitting on the bottom of the window,
      // which is the frame CAREER's own circle is still on.
      const raw = clamp01((vh - rect.top) / vh);
      const entry = clamp01((raw - ENTRY_DEAD) / (1 - ENTRY_DEAD));
      layer.style.opacity = raw > ENTRY_DEAD ? "1" : "0";

      // Which panel the reader is in front of: whichever one the middle of the
      // window is inside. Worked out here rather than watched for, so the
      // circle and the panel under it can never be a frame out of step.
      const index = Math.min(
        PANELS.length - 1,
        Math.max(0, Math.floor((vh / 2 - rect.top) / vh)),
      );
      if (index !== atRef.current) {
        atRef.current = index;
        setAt(index);
      }

      const panel = PANELS[index].circle;
      const arriving = entry < 1;
      const size = arriving ? lerp(HANDOVER_FROM, HANDOVER_TO, entry) : panel.size;
      const cx = arriving ? CANVAS.width / 2 : panel.cx;
      const cy = arriving ? CANVAS.height / 2 : panel.cy;
      const rolled = arriving ? 0 : roll(index);

      // No transition while it is being grown by the scroll — a transition
      // there would be the box chasing the finger a beat behind. It comes back
      // for the panel-to-panel moves, which are steps rather than travel.
      dot.style.transition = arriving
        ? "none"
        : `left ${MOVE_MS}ms ${EASE}, top ${MOVE_MS}ms ${EASE}, width ${MOVE_MS}ms ${EASE}, height ${MOVE_MS}ms ${EASE}, background-color 500ms ease-out, transform ${MOVE_MS}ms ${EASE}`;
      dot.style.transform = `translate(-50%, -50%) rotate(${rolled}deg)`;
      // The words read this to turn themselves back by it.
      dot.style.setProperty("--roll", `${rolled}deg`);
      dot.style.left = `${(cx / CANVAS.width) * 100}%`;
      dot.style.top = `${(cy / CANVAS.height) * 100}%`;
      dot.style.width = vw(size);
      dot.style.height = vw(size);
      dot.style.backgroundColor = arriving ? PANELS[0].circle.fill : panel.fill;

      // The face belongs to the first panel only: it arrives as the circle
      // finishes growing and goes with it when the circle drops.
      const wearing = !arriving && PANELS[index].circle.face;
      face.style.opacity = wearing ? "1" : "0";
      face.style.transform = `translate(-50%, -50%) rotate(${-rolled}deg)`;

      // And the words only while the circle is the ground a chapter is set on.
      //
      // They were on the whole time, which is what put all three of them across
      // the middle of the screen with the face still on: the two that are not
      // up are only out of sight because the disc is hung off the bottom of the
      // window, and on any screen where it is not, they are simply three words
      // in a heap.
      // The wheel carries the word, the heading and the paragraph together, so
      // one opacity covers the lot.
      words.style.opacity = !arriving && PANELS[index].chapter ? "1" : "0";
      words.style.setProperty("--roll", `${rolled}deg`);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const panel = PANELS[at];
  const dark = panel.ground === "dark";

  return (
    <section
      ref={sectionRef}
      // The ground turns over on CHANGE, and the fixed header reads both of
      // these off whatever is under it — see MobileHeader.
      data-ground={panel.ground}
      data-name={panel.reverse ? "reverse" : undefined}
      className="section-mobile-about relative transition-colors duration-500"
      style={{ backgroundColor: dark ? "#336bec" : "#ffffff" }}
    >
      {/* The circle, fixed to the screen while the panels scroll past it.
          Fixed rather than sticky, and that is what lets it start before this
          section does: on the way in it is grown straight off the scroll from
          the size CAREER left it at, so the wheel's small circle and this one
          are the same circle to look at even though they are two elements. A
          sticky layer cannot do that — it is pinned inside its own box, and its
          box has not started yet.

          One circle for all five panels, not one per panel: a new one drawn in
          each place it stops is five circles that happen to look alike. */}
      <div ref={layerRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0 }}>
        <div
          ref={circleRef}
          className="absolute rounded-full"
          style={{ transform: "translate(-50%, -50%)", willChange: "transform" }}
        >
          {/* The face it wears for one panel — the same drawing the chat
              character wears, so the two read as one face. Turned back by
              whatever the disc is turned by, so it stays level: a pair of
              glasses standing on end is not a wheel rolling, it is a picture
              that has fallen over.

              Painted black here. The drawing is white, which is right on the
              chat character's pink and all but invisible on this yellow. A
              filter rather than a second file: `brightness(0)` takes every
              channel to nothing and leaves the alpha, so a white line drawing
              comes out a black one — and there is still only one drawing, which
              is the point. Two files of the same glasses would be two things to
              keep in step and one of them would eventually be wrong. */}
          <img
            ref={faceRef}
            src={glasses}
            alt=""
            className="absolute left-1/2 top-1/2 block max-w-none"
            style={{
              width: "82%",
              opacity: 0,
              filter: "brightness(0)",
              transition: "opacity 500ms ease-out, transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
            }}
          />

        </div>

        {/* The wheel. Nothing of it is drawn — it is an arm hinged on the
            blob's centre, and what it carries is drawn where the design puts
            it. Each spoke is the whole canvas, turned into place by its own
            third of a turn and turned back again inside so its contents stay
            level: the seat of a big wheel goes round and stays upright, which
            is exactly what a page of copy has to do.

            The two spokes that are not up are a third of a turn away, and at
            this radius that is well off the screen — which is why they need no
            hiding of their own. The wrapper's opacity is only for the panels
            where the wheel is not the subject at all. */}
        <div
          ref={wordsRef}
          className="absolute transition-opacity duration-300"
          style={{
            left: `${(HUB.x / CANVAS.width) * 100}%`,
            top: `${(HUB.y / CANVAS.height) * 100}%`,
            width: 0,
            height: 0,
            opacity: 0,
          }}
        >
          {SPOKES.map((spoke, k) => (
            <div
              key={spoke.word.text}
              className="absolute"
              style={{
                left: vw(-HUB.x),
                top: vw(-HUB.y),
                width: vw(CANVAS.width),
                height: vw(CANVAS.height),
                transform: `rotate(calc(var(--roll, 0deg) + ${k * WORD_TURN}deg))`,
                transformOrigin: `${vw(HUB.x)} ${vw(HUB.y)}`,
                transition: `transform ${MOVE_MS}ms ${EASE}`,
              }}
            >
              {/* Each thing the arm carries is turned back about *its own*
                  middle, not about the hub.
                  
                  That distinction is the whole mechanism. Turn the arm by a
                  third about the hub and turn its contents back by a third
                  about the same hub, and the two cancel exactly — orientation
                  and position both — so all three spokes land on top of each
                  other in the design's own place, which is what they were
                  doing. A seat on a big wheel is hinged at the end of the arm:
                  the arm carries it round, and it levels itself where it is. */}
              <p
                // Centred, where the design ranges each word to its own right
                // edge. Ranged right they sit at three different x's — 399,
                // 314, 383 — which on a wheel means the word jumps sideways as
                // well as round every time the chapter changes. Centred, the
                // three arrive in the same place and only the word differs.
                className={`absolute -translate-x-1/2 whitespace-nowrap text-center font-['Plus_Jakarta_Sans'] font-bold leading-none ${spoke.word.ink}`}
                style={{
                  left: "50%",
                  top: vw(spoke.word.top),
                  fontSize: vw(48),
                  letterSpacing: vw(-2.4),
                  transform: `rotate(calc(-1 * var(--roll, 0deg) - ${k * WORD_TURN}deg))`,
                  transformOrigin: "center",
                  transition: `transform ${MOVE_MS}ms ${EASE}`,
                }}
              >
                {spoke.word.text}
              </p>
              <Chapter
                tone={spoke.tone}
                top={spoke.top}
                align={spoke.align}
                title={spoke.title}
                body={spoke.body}
                spin={`rotate(calc(-1 * var(--roll, 0deg) - ${k * WORD_TURN}deg))`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* The panels themselves, stacked and scrolled. */}
      <div className="relative z-10">
        {PANELS.map((p, i) => (
          <div
            key={p.key}
            data-index={i}
            className="relative h-[100svh] w-full overflow-hidden"
          >
            {p.key === "role" && (
              // The line the circle arrives under. The design centres the whole
              // group — two lines of 42 over the 371 circle, 51 apart — on the
              // canvas' middle, which is what puts this at 207.
              <div
                className="absolute flex w-full flex-col"
                style={{ top: vw(207), gap: vw(12), paddingInline: vw(20) }}
              >
                <p
                  className="w-full text-left font-['Plus_Jakarta_Sans'] font-bold leading-none text-[#336bec]"
                  style={{ fontSize: vw(42) }}
                >
                  Role
                </p>
                <p
                  className="w-full text-left font-['Plus_Jakarta_Sans'] font-bold leading-none text-[#336bec]"
                  style={{ fontSize: vw(42) }}
                >
                  Led me to a career
                </p>
              </div>
            )}




            {p.key === "contact" && (
              <div
                // Anchored to the bottom rather than dropped at the design's
                // 721, and measured off the chat character rather than guessed:
                // it sits 44 up from the bottom and is 60 across, so 128 clears
                // its top by a comfortable 24. At 721 the card ran to the foot
                // of the screen and the last two lines went under the
                // character, which is a fixed thing that does not move out of
                // the way.
                //
                // From the bottom, because that is the edge the character is
                // measured from too — tie the card to the top and the two drift
                // apart on every screen that is not 932 tall.
                className="absolute flex flex-col text-white"
                style={{ left: vw(27), bottom: vw(128), gap: vw(24) }}
              >
                <p
                  className="whitespace-pre font-['Pretendard'] font-semibold leading-none"
                  style={{ fontSize: vw(32) }}
                >
                  {"더 나은 사용자 경험,\n함께 고민하겠습니다"}
                </p>
                {/* The four rows are one run at the design's 10, whatever they
                    are made of — which is why the grid and the two loose lines
                    are wrapped together rather than sitting in the 24 the
                    heading is held off by. */}
                <div className="flex flex-col" style={{ gap: vw(10) }}>
                {/* One grid, so the two leading bars land on the same x. The
                    desktop card is built the same way and for the same reason:
                    the labels are different lengths and it is the values that
                    have to line up. */}
                <div
                  className="grid items-center justify-start font-['Pretendard'] font-medium leading-none"
                  style={{
                    // Two content-sized columns and a gap of about three
                    // characters between them. It was a 4.5em label column,
                    // which is a width chosen in advance and therefore wrong:
                    // "email" is nowhere near that long, so the bar sat a
                    // clear half-inch out from it. Sized to the longest label
                    // instead, the gap is the gap and both bars still line up,
                    // which is the only thing the grid was ever for.
                    gridTemplateColumns: "auto auto",
                    columnGap: vw(13),
                    rowGap: vw(10),
                    fontSize: vw(16),
                  }}
                >
                  <p>email</p>
                  <p>| {EMAIL}</p>

                  <p>이력서</p>
                  {/* The design writes the address again here; the desktop card
                      links the document, which is what the row is for. */}
                  <a
                    href={RESUME_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="justify-self-start underline decoration-1 underline-offset-4"
                  >
                    | 보러가기
                  </a>

                </div>

                {/* Out of the grid, and that is the fix rather than tidiness.
                    A grid item that spans both columns still contributes its
                    width to both, so these two long lines were what set the
                    label column's width — "email" had a bar half an inch away
                    from it because a sentence three rows down was that wide.
                    They have no label and no value; they were only in there to
                    inherit the row gap, which a flex column gives them just as
                    well. */}
                <div
                  className="flex flex-col font-['Pretendard'] font-medium leading-none"
                  style={{ gap: vw(10), fontSize: vw(16) }}
                >
                  <p>이 사이트는 Claude Code로 직접 만들었습니다</p>
                  <p>©2026yunsujeong</p>
                </div>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>
    </section>
  );
}
