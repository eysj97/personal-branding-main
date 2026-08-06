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
const GRID_WIDTH = 1875;

const SKILLS = [
  {
    title: "UX Research",
    desc: "사용자 조사와 경쟁 분석으로 문제를 정의",
    level: "Proficient",
  },
  {
    title: "Planning",
    desc: "서비스 구조와 화면 흐름 설계",
    level: "Proficient",
  },
  {
    title: "UI Design",
    desc: "화면 설계와 비주얼 디자인",
    level: "Proficient",
  },
  {
    title: "Interaction Design",
    desc: "화면의 움직임과 전환 설계",
    level: "Proficient",
  },
  {
    title: "AI",
    list: [
      "CLAUDE - 코딩 및 기획",
      "CHAT GPT - 아이디어 확장, 기획, 이미지생성",
      "JEMINI - 이미지 및 영상 생성",
    ],
    level: "Proficient",
  },
  {
    title: "FIGMA",
    desc: "디자인 시스템과 프로토타입 제작",
    level: "Advanced",
  },
  { title: "HTML", desc: "구조에 맞게 마크업", level: "Advanced" },
  {
    title: "CSS",
    desc: "디자인을 반응형 화면으로 구현",
    level: "Proficient",
  },
];



// Rows match the Figma layout's staircase: row 1 is left-aligned and full,
// rows 2-3 are right-aligned within the same GRID_WIDTH, so with fewer (or
// differently counted) cards they hug the right edge — leaving a growing
// gap at bottom-left for the "SKILLS" heading to sit in.
const ROWS = [
  {
    cards: SKILLS.slice(0, 3).map((skill, i) => ({ skill, i })),
    justify: "justify-start",
  },
  {
    cards: SKILLS.slice(3, 6).map((skill, i) => ({ skill, i: i + 3 })),
    justify: "justify-end",
  },
  {
    cards: SKILLS.slice(6, 8).map((skill, i) => ({ skill, i: i + 6 })),
    justify: "justify-end",
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

function CardFace({ title, desc, list, level }) {
  return (
    <div className="absolute inset-0 rounded-[8px] overflow-hidden [backface-visibility:hidden] flex flex-col">
      <div className="flex-1 bg-white text-black flex flex-col justify-between gap-[10px] p-[18px]">
        <div className="flex flex-col gap-[5px]">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[28px] tracking-[-0.1em] leading-none">
            {title}
          </p>
          {list ? (
            <div className="flex flex-col gap-[6px] text-[18px] tracking-[-0.1em] leading-none">
              {list.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p className="font-['Pretendard'] text-[18px] tracking-[-0.1em] leading-none">
              {desc}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 h-[64px] bg-[#0492bd] flex items-center justify-end px-[18px]">
        <p className="font-['JetBrains_Mono'] font-semibold text-white text-[24px] tracking-[-0.1em] leading-none">
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
      className="section-skills relative h-[260vh] bg-[#06252e]"
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
              <div key={r} className={`flex gap-[16px] ${row.justify}`}>
                {row.cards.map(({ skill, i }) => (
                  <div
                    key={skill.title}
                    className="relative shrink-0"
                    style={{ width: 457, height: 239 }}
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
              style={{ fontSize: 22 }}
            >
              그렇게 지금 다루는 것들입니다
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
