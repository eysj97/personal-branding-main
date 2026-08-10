import { useEffect, useRef, useState } from "react";

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Figma frame's own pixel dimensions (node 154:3510). Everything below is
// laid out in these same literal px, then the whole canvas is scaled down
// (or up) to fit the viewport — so the composition, gaps, and card ratio
// stay pixel-identical to the design at any screen size, instead of each
// piece being independently responsive and drifting out of proportion.
const DESIGN_WIDTH = 1920;
// The frame's full height, not a crop of it: the three rows of cards run from
// its very top to its very bottom, so there is no dead space left to trim.
const DESIGN_HEIGHT = 1156;
const GRID_LEFT = 40;
const GRID_TOP = 0;

// One column grid the whole staircase stands on. The rows used to be laid out
// by justify-start / justify-end against a fixed grid width, which only lines
// the columns up if the row widths happen to divide into it — and they did not,
// so every card in rows 2 and 3 sat a pixel to the left of the card above it.
// Stated as a pitch instead: a card is always at `GRID_LEFT + col * COL_PITCH`,
// whichever row it is in, so the columns cannot drift apart.
const CARD_WIDTH = 400;
const CARD_HEIGHT = 348;
const CARD_GAP = 80;
const ROW_GAP = 56;
const COL_PITCH = CARD_WIDTH + CARD_GAP;
const GRID_COLUMNS = 4;
const GRID_WIDTH = GRID_COLUMNS * COL_PITCH - CARD_GAP;

// Three folder colours, used straight from the design. They are not a scale —
// nothing about a card's colour says anything about its level, which every card
// now states in words anyway.
const BLUE = "#0492bd";
const LIME = "#c9e529";
const PINK = "#ff60b8";

const SKILLS = [
  {
    title: "UX Research",
    desc: "사용자 조사와 경쟁 분석으로 문제를 정의",
    level: "Proficient",
    color: BLUE,
  },
  {
    title: "Planning",
    desc: "서비스 구조와 화면 흐름 설계",
    level: "Proficient",
    color: BLUE,
  },
  {
    title: "UI Design",
    desc: "화면 설계와 비주얼 디자인",
    level: "Proficient",
    color: LIME,
  },
  {
    // Broken over two lines in the design rather than left to wrap — the card
    // is wide enough to hold it on one, so the break is a choice, and
    // `whitespace-pre-line` on the heading is what honours it.
    title: "Interaction\nDesign",
    desc: "화면의 움직임과 전환 설계",
    level: "Proficient",
    color: LIME,
  },
  {
    title: "FIGMA",
    desc: "디자인 시스템과 프로토타입 제작",
    level: "Proficient",
    color: LIME,
  },
  {
    title: "AI",
    list: [
      "CLAUDE - 코딩 및 기획",
      "CHAT GPT - 아이디어확장, 기획, 이미지생성",
      "JEMINI - 이미지 및 영상 생성",
    ],
    level: "Proficient",
    color: PINK,
  },
  {
    title: "HTML",
    desc: "구조에 맞게 마크업",
    level: "Proficient",
    color: PINK,
  },
  {
    title: "CSS",
    desc: "디자인을 반응형 화면으로 구현",
    level: "Proficient",
    color: PINK,
  },
];



// Rows match the Figma layout's staircase: each one starts a column further
// right than the one above it, which is what opens the growing gap at
// bottom-left for the "SKILLS" heading to sit in. Stated as the column each row
// begins at rather than as an alignment, so every card lands on the shared
// pitch above and the staircase is the only thing the rows disagree about.
const ROWS = [
  { startCol: 0, cards: SKILLS.slice(0, 3).map((skill, i) => ({ skill, i })) },
  {
    startCol: 1,
    cards: SKILLS.slice(3, 6).map((skill, i) => ({ skill, i: i + 3 })),
  },
  {
    startCol: 2,
    cards: SKILLS.slice(6, 8).map((skill, i) => ({ skill, i: i + 6 })),
  },
];

// Cards appear where they belong — no travel, they are simply not there and
// then they are, one at a time.
//
// On a clock, not on scroll position. Tied to scroll, the run only advances
// while the reader keeps moving, so arriving at the section and stopping left
// it half dealt. Reaching the section is the cue; it plays itself out from
// there whether or not anything else happens.
const ENTER_STEP_MS = 140; // between one card and the next
const ENTER_SNAP_MS = 80; // and how long one card takes to be there at all

// The deal starts when the section pins — and because of the overlap below,
// that is now the same instant LEARN's last file leaves the screen, not a
// screen of scrolling later.
//
// Why this section starts one screen early (the -100vh margin on the <section>
// below): a sticky stage stops being pinned when its section's bottom edge
// reaches the bottom of the screen, which is where LEARN's scroll progress
// hits 1 and its deck has finished exiting. The next section's top is at that
// bottom edge — a full screen below the fold — so unpinning LEARN and pinning
// SKILLS are a screen of scrolling apart no matter how either section is
// timed. Pulling this one up by exactly that screen closes the gap: LEARN's
// progress reaching 1 and this section's top reaching 0 become the same scroll
// position.
//
// The cost is that this section now sits *over* LEARN's last screen, which is
// why its background moved onto the stage and the stage is hidden until it
// pins (see stageRef) — otherwise it would slide up over the files while they
// were still on screen, and swallow their clicks on the way.
const ARM_AT = 0;
// Rearmed a little further down than it arms, so a scroll that hovers right on
// the line does not replay the deal every few pixels.
const REARM_AT = 0.12;

// The card is a manila folder seen face-on, and it is two shapes rather than
// one: a tab that runs the full width behind the card, stepping down partway
// across from its raised left end, and the folder body laid over it. The body
// hides all but the top BODY_TOP of the tab, which is why the path below is far
// taller than the sliver of it you actually see.
//
// Two shapes, not one silhouette, because the tab is darker than the body — the
// design paints the same fill and then washes 8% black over it, which is what
// makes the tab read as sitting behind rather than as part of the front face.
// A single path could not carry two fills.
//
// Taken from the design (node 316:1684) at the card's own 400x348, so it needs
// no scaling of its own, and drawn rather than exported per colour since the
// three variants differ only in that fill.
const TAB_PATH =
  "M0 125.516H400V48.7928C400 40.5085 393.284 33.7928 385 33.7928H175.305C170.461 33.7928 165.915 31.4533 163.099 27.5114L147.935 6.28137C145.119 2.33946 140.573 0 135.729 0H15C6.71573 0 0 6.71573 0 15V125.516Z";
// Where the folder body starts, and so how much of the tab stays visible.
const BODY_TOP = 52;

function CardFace({ title, desc, list, level, color }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={TAB_PATH} fill={color} />
        <path d={TAB_PATH} fill="#000000" fillOpacity="0.08" />
        <rect
          x="0"
          y={BODY_TOP}
          width={CARD_WIDTH}
          height={CARD_HEIGHT - BODY_TOP}
          rx="15"
          fill={color}
        />
      </svg>
      {/* Text is laid out against the body alone, not the whole card — the tab
          above it is behind the folder, so anything measured from the card's
          own top edge would sit that much too high.
          justify-between rather than the design's hand-measured gap: the top
          block and the level line are pinned to the padding box, which comes
          out at the same place on a two-line heading and on the AI card's
          three-line list without either one being measured. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-between px-[18px] py-[20px] leading-none text-black"
        style={{ top: BODY_TOP }}
      >
        <div className="flex flex-col gap-[16px] items-start">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[28px] tracking-[-0.1em] whitespace-pre-line">
            {title}
          </p>
          {list ? (
            <div className="flex flex-col gap-[10px] font-['Plus_Jakarta_Sans'] text-[18px] tracking-[-0.1em]">
              {list.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p className="font-['Pretendard'] text-[18px] tracking-[-0.1em]">
              {desc}
            </p>
          )}
        </div>
        <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[24px] tracking-[-0.02em] text-right">
          {level}
        </p>
      </div>
    </div>
  );
}

export default function SkillsSection() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const headingRef = useRef(null);
  const cardRefs = useRef([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    let startedAt = null;
    let rafId = null;

    // The stage carries the background as well as the grid, so hiding it hides
    // the whole section — which is what keeps it out of the way while it is
    // overlapping LEARN's last screen. pointer-events goes with it: a stage
    // that is merely transparent still sits over the files and eats the clicks
    // on their links.
    function showStage(on) {
      stage.style.opacity = on ? "1" : "0";
      stage.style.pointerEvents = on ? "auto" : "none";
    }

    function paint(now) {
      const elapsed = now - startedAt;
      let running = false;
      // The heading is not one of the folders, but it should not simply be
      // there before them either — it comes in on the same beat as the first
      // one, so the section assembles rather than appearing part-drawn.
      const headingT = clamp01(elapsed / ENTER_SNAP_MS);
      if (headingRef.current)
        headingRef.current.style.opacity = String(headingT);
      if (headingT < 1) running = true;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const t = clamp01((elapsed - i * ENTER_STEP_MS) / ENTER_SNAP_MS);
        el.style.opacity = String(t);
        if (t < 1) running = true;
      });
      rafId = running ? requestAnimationFrame(paint) : null;
    }

    // Arrival is the section's top climbing past ARM_AT — half a screen before
    // it pins, by which point the top rows are already in frame and the grid is
    // what you are looking at.
    function check() {
      const rect = section.getBoundingClientRect();
      const arrived =
        rect.top <= window.innerHeight * ARM_AT && rect.bottom > 0;

      if (arrived && startedAt === null) {
        startedAt = performance.now();
        showStage(true);
        if (rafId === null) rafId = requestAnimationFrame(paint);
        return;
      }
      // Rearm once the section is back below, so coming down to it a second
      // time deals the cards again rather than showing them already out — and
      // so scrolling back up hands the screen to LEARN's files again.
      if (rect.top > window.innerHeight * REARM_AT && startedAt !== null) {
        startedAt = null;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        showStage(false);
        if (headingRef.current) headingRef.current.style.opacity = "0";
        cardRefs.current.forEach((el) => {
          if (el) el.style.opacity = "0";
        });
      }
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();

    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    // Whichever of width and height is tighter, with a 20px margin on every
    // side. This used to scale to width alone, which was right while the canvas
    // was a wide crop — it is 1920x1156 now, taller than a landscape viewport
    // once it has been fitted to the width, and fitting to width alone would
    // hang the bottom row off the stage where `overflow-hidden` cuts it off.
    function updateScale() {
      setScale(
        Math.min(
          (window.innerWidth - 40) / DESIGN_WIDTH,
          (window.innerHeight - 40) / DESIGN_HEIGHT,
        ),
      );
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <section
      ref={sectionRef}
      /* 260vh was sized for the old scroll-driven flip, where every one of
         those extra screens bought another frame of animation. The deal is on
         a clock now and is over in about a second, so all that height became
         dead weight: the stage pinned for a screen and a half while nothing
         happened, which reads as the page refusing to scroll, and then lets go
         all at once. 150vh is half a screen of hold — about as long as the
         cards take to arrive. */
      className="section-skills relative h-[150vh]"
      /* Pulled up by exactly the screen that would otherwise sit between
         LEARN unpinning and this section pinning — see ARM_AT. The background
         is not on the section any more: at this margin the section's own box
         covers LEARN's last screen, so a background here would paint over the
         files while they are still leaving. It lives on the stage below
         instead, which is hidden until this section actually pins. */
      style={{ marginTop: "-100vh" }}
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-[#06252e]"
        style={{ opacity: 0, pointerEvents: "none" }}
      >
        <div
          className="relative shrink-0"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="absolute flex flex-col"
            style={{
              left: GRID_LEFT,
              top: GRID_TOP,
              width: GRID_WIDTH,
              gap: ROW_GAP,
            }}
          >
            {ROWS.map((row, r) => (
              <div
                key={r}
                className="flex"
                style={{
                  gap: CARD_GAP,
                  paddingLeft: row.startCol * COL_PITCH,
                }}
              >
                {row.cards.map(({ skill, i }) => (
                  <div
                    key={skill.title}
                    className="relative shrink-0"
                    style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
                  >
                    {/* No perspective, no back face, no preserve-3d: the cards
                        used to flip, and all of that existed for the turn.
                        They do not move at all now — they are simply not
                        there, and then they are. */}
                    <div
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      className="absolute inset-0 will-change-[opacity]"
                      style={{ opacity: 0 }}
                    >
                      <CardFace {...skill} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* The heading stands in the hole the staircase opens at bottom-left:
              row 2 starts a column in, so the space beside it is the one place
              on the canvas nothing else wants. Placed in canvas px like
              everything else here — the whole composition is scaled as one
              piece, so viewport units would get scaled a second time and drift
              off the design. */}
          <p
            ref={headingRef}
            className="absolute font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap tracking-[-0.1em]"
            style={{ left: 22, top: 429, fontSize: 120, opacity: 0 }}
          >
            SKILLS
          </p>
        </div>
      </div>
    </section>
  );
}
