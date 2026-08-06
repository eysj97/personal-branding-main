import { useEffect, useRef, useState } from "react";

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Figma frame's own pixel dimensions (node 160:502). Everything below is
// laid out in these same literal px, then the whole canvas is scaled down
// (or up) to fit the viewport — so the composition, gaps, and card ratio
// stay pixel-identical to the design at any screen size, instead of each
// piece being independently responsive and drifting out of proportion.
const DESIGN_WIDTH = 1920;
// Cropped to the content's own bounding box (cards + heading), not the
// full Figma frame — the frame has ~410px of dead space above the grid,
// and centering the full frame vertically would center that dead space
// too, pushing the actual content (which hugs the frame's bottom edge)
// off-screen at the bottom instead.
const DESIGN_HEIGHT = 747;
const GRID_LEFT = 30;
const GRID_TOP = 0;

// One column grid the whole staircase stands on. The rows used to be laid out
// by justify-start / justify-end against a fixed grid width, which only lines
// the columns up if the row widths happen to divide into it — and they did not,
// so every card in rows 2 and 3 sat a pixel to the left of the card above it.
// Stated as a pitch instead: a card is always at `GRID_LEFT + col * COL_PITCH`,
// whichever row it is in, so the columns cannot drift apart.
const CARD_WIDTH = 457;
const CARD_HEIGHT = 239;
const CARD_GAP = 16;
const COL_PITCH = CARD_WIDTH + CARD_GAP;
const GRID_COLUMNS = 4;
const GRID_WIDTH = GRID_COLUMNS * COL_PITCH - CARD_GAP;

// Three folder colours, used straight from the design. They are not a scale —
// nothing about a card's colour says anything about its level, which every card
// now states in words anyway.
const BLUE = "#0492bd";
const LIME = "#c9e529";
const PINK = "#e3b0df";

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

// The card is a manila folder seen face-on: a rounded rectangle whose top edge
// steps up on the left into a tab, with a slanted shoulder between the two. One
// path at the card's own 457x239, so it needs no scaling of its own — and drawn
// rather than exported per colour, since the three variants differ only in fill.
//
// Taken from the design (node 290:3715) with Figma's own vertical flip already
// folded in, so the tab sits top-left here exactly as it reads on the canvas
// instead of needing a -scale-y-100 wrapper to look right.
const FOLDER_PATH =
  "M15 0H163.355C168.435 0 173.169 2.571 175.936 6.831L192.064 31.669C194.831 35.929 199.565 38.5 204.645 38.5H442C450.284 38.5 457 45.216 457 53.5V224C457 232.284 450.284 239 442 239H15C6.71573 239 0 232.284 0 224V15C0 6.71573 6.71573 0 15 0Z";

function CardFace({ title, desc, list, level, color }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 457 239"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={FOLDER_PATH} fill={color} />
      </svg>
      {/* Text sits over the shape rather than inside a flex column beside it —
          the notch is transparent, so there is no box to lay out against.
          justify-between rather than the design's hand-measured gap: the top
          block and the level line are pinned to the padding box, which comes
          out at the same place on a two-line heading and on the AI card's
          three-line list without either one being measured. */}
      <div className="absolute inset-0 flex flex-col justify-between px-[18px] py-[20px] leading-none text-black">
        <div className="flex flex-col gap-[16px] items-start">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[28px] tracking-[-0.1em] whitespace-pre-line">
            {title}
          </p>
          {list ? (
            <div className="flex flex-col gap-[10px] font-['Pretendard'] text-[18px] tracking-[-0.1em]">
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
  const cardRefs = useRef([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const section = sectionRef.current;
    let startedAt = null;
    let rafId = null;

    function paint(now) {
      const elapsed = now - startedAt;
      let running = false;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const t = clamp01((elapsed - i * ENTER_STEP_MS) / ENTER_SNAP_MS);
        el.style.opacity = String(t);
        if (t < 1) running = true;
      });
      rafId = running ? requestAnimationFrame(paint) : null;
    }

    // Arrival is the section's top reaching the top of the screen — the point
    // at which the sticky stage is the whole view and the grid is what you are
    // looking at.
    function check() {
      const rect = section.getBoundingClientRect();
      const arrived = rect.top <= 0 && rect.bottom > 0;

      if (arrived && startedAt === null) {
        startedAt = performance.now();
        if (rafId === null) rafId = requestAnimationFrame(paint);
        return;
      }
      // Rearm once the section is fully back below, so coming down to it a
      // second time deals the cards again rather than showing them already out.
      if (!arrived && rect.top > 0 && startedAt !== null) {
        startedAt = null;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
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
    // Scale to the viewport width (minus a 20px margin each side), not the
    // smaller of width/height — the canvas fills the screen edge-to-edge
    // (aside from that margin) with its ratio intact, rather than being
    // letterboxed to whichever dimension is tighter.
    function updateScale() {
      setScale((window.innerWidth - 40) / DESIGN_WIDTH);
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
      className="section-skills relative h-[150vh] bg-[#06252e]"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div
          className="relative shrink-0"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="absolute flex flex-col gap-[15px]"
            style={{ left: GRID_LEFT, top: GRID_TOP, width: GRID_WIDTH }}
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

          {/* Heading and its caption share one absolutely-placed column so
              the gap between them is a real gap, not a second hand-tuned
              `top` that has to be re-derived whenever the heading resizes. */}
          <div
            className="absolute flex flex-col gap-[24px]"
            style={{ left: 30, top: 288 }}
          >
            <p
              className="font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap tracking-[-0.1em]"
              style={{ fontSize: 120 }}
            >
              SKILLS
            </p>
            {/* Sized in canvas px like everything else here — the whole
                composition is scaled as one piece, so viewport units would
                get scaled a second time and drift off the design. */}
            <p
              className="font-['Pretendard'] leading-[1.2] text-white whitespace-nowrap tracking-[-0.02em]"
              style={{ fontSize: 16 }}
            >
              그렇게 지금 다루는 것들입니다
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
