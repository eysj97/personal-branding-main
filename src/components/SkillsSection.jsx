import { useEffect, useRef, useState } from "react";
// The board's content and the folder it is drawn on live in data/skills — the
// phone lays the same eight out 4x2 (see mobile/MobileSkills), and only the
// sizes and the arrangement differ.
import {
  FOLDER_BODY_TOP as BODY_TOP,
  FOLDER_H as PATH_HEIGHT,
  FOLDER_PATH as TAB_PATH,
  FOLDER_W as PATH_WIDTH,
  SKILLS,
  bodyTopFor,
} from "../data/skills";

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

// The layout the design moved to. It used to be a staircase — each row starting
// a column further right than the one above, opening a hole at bottom-left for
// the heading. It is a plain 3x3 grid now with the heading standing *in* the
// grid, in the middle row's first cell, so the composition is symmetrical and
// SKILLS reads as one of the nine things on the board rather than as a label
// pushed into the leftover space.
//
// One pitch for both axes and every cell measured off it, so nothing can drift:
// the columns are 370 apart, the rows 352.303, and a card is always at
// (COL_X[c], ROW_Y[r]).
const CARD_WIDTH = 290;
const CARD_HEIGHT = 252.303;
const COL_PITCH = 370;
const ROW_PITCH = 352.303;
// Where the grid's first cell sits on the canvas. The design nests this two
// frames deep (154:3510 > 352:3605 > the row); both offsets are folded in here
// rather than reproduced as wrappers, since nothing else hangs off either.
const GRID_LEFT = 408.786 + 72.428;
const GRID_TOP = 99.547;
const COL_X = [0, 1, 2].map((c) => GRID_LEFT + c * COL_PITCH);
const ROW_Y = [0, 1, 2].map((r) => GRID_TOP + r * ROW_PITCH);


// The heading's cell. SKILLS is set at 120 and comes out wider than a card, so
// the block is 338 across and hangs past its cell's left edge — the design lets
// it, and the canvas has the room there. Both numbers are offsets from the cell
// rather than absolute canvas coordinates, so moving the grid carries the
// heading with it.
const HEADING_WIDTH = 338;
const HEADING_OVERHANG = 60.214;
const HEADING_DROP = 42.152;




// Which cell each card sits in, as [row, col] on the 3x3 grid above. The
// heading takes [1, 0] and is the only cell without a folder in it.
//
// Written per card rather than as three rows sliced out of SKILLS, because the
// grid order and the deal order are no longer the same list: the design reads
// left-to-right, top-to-bottom, and the SKILLS array is grouped by colour.
// Ordered so the three colours band across the rows — blue, lime, pink — with
// the heading taking the one cell the top-left of the pink row would have used.
// It is the design's own arrangement and worth stating: the grid is not sorted
// by discipline, it is sorted by colour, and the colours are what carry the
// reading order down the board.
const CELLS = {
  "UX Research": [0, 0],
  Planning: [0, 1],
  "UI Design": [0, 2],
  FIGMA: [1, 1],
  "Interaction Design": [1, 2],
  AI: [2, 0],
  CSS: [2, 1],
  HTML: [2, 2],
};
const HEADING_CELL = [1, 0];

// The cards are dealt in reading order — row by row, left to right — which is
// not the order SKILLS is written in (that list is grouped by colour). Sorted
// off CELLS rather than reordered by hand, so a card that moves cell is dealt
// in its new place without this being touched.
const DEAL_ORDER = [...SKILLS].sort((a, b) => {
  const [ar, ac] = CELLS[a.title];
  const [br, bc] = CELLS[b.title];
  return ar - br || ac - bc;
});

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

// Where the folder body's top edge falls on this card, in card px — which is
// what the text block is positioned against. Derived rather than measured a
// second time: the design's 37.7 on a 290-wide card is exactly this.
const BODY_TOP_PX = bodyTopFor(CARD_HEIGHT);

function CardFace({ title, desc, list, level, color }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${PATH_WIDTH} ${PATH_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={TAB_PATH} fill={color} />
        <path d={TAB_PATH} fill="#000000" fillOpacity="0.08" />
        <rect
          x="0"
          y={BODY_TOP}
          width={PATH_WIDTH}
          height={PATH_HEIGHT - BODY_TOP}
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
        style={{ top: BODY_TOP_PX }}
      >
        <div className="flex flex-col gap-[16px] items-start">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[24px] tracking-[-0.1em] whitespace-pre-line">
            {title}
          </p>
          {list ? (
            <div className="flex flex-col gap-[10px] font-['Plus_Jakarta_Sans'] text-[12px] tracking-[-0.1em]">
              {list.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p className="font-['Pretendard'] text-[12px] tracking-[-0.1em]">
              {desc}
            </p>
          )}
        </div>
        <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[18px] tracking-[-0.02em] text-right">
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
          {/* Every card placed straight onto the canvas at its cell, rather
              than as three flex rows. The rows no longer share a starting
              column or a card count — the middle one has a hole in it where the
              heading goes — so a row is not a thing the layout needs any more,
              and a grid of nine cells with one left empty says it plainly. */}
          {DEAL_ORDER.map((skill, d) => {
            const [row, col] = CELLS[skill.title];
            return (
              <div
                key={skill.title}
                className="absolute"
                style={{
                  left: COL_X[col],
                  top: ROW_Y[row],
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
              >
                {/* No perspective, no back face, no preserve-3d: the cards used
                    to flip, and all of that existed for the turn. They do not
                    move at all now — they are simply not there, and then they
                    are. Indexed by deal order, so the run reads across the
                    board rather than jumping about it. */}
                <div
                  ref={(el) => {
                    cardRefs.current[d] = el;
                  }}
                  className="absolute inset-0 will-change-[opacity]"
                  style={{ opacity: 0 }}
                >
                  <CardFace {...skill} />
                </div>
              </div>
            );
          })}

          {/* The heading, standing in the grid's empty middle-left cell. It is
              a cell like the other eight now rather than a label parked in
              leftover space, so it is centred in that cell instead of ranged
              left against the canvas: the design gives SKILLS 338px and centres
              the two-line caption under it.
              Placed in canvas px like everything else here — the whole
              composition is scaled as one piece, so viewport units would get
              scaled a second time and drift off the design. */}
          <div
            ref={headingRef}
            className="absolute flex flex-col items-center gap-[10px]"
            style={{
              left: COL_X[HEADING_CELL[1]] - HEADING_OVERHANG,
              top: ROW_Y[HEADING_CELL[0]] + HEADING_DROP,
              width: HEADING_WIDTH,
              opacity: 0,
            }}
          >
            <p
              className="font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap tracking-[-0.1em]"
              style={{ fontSize: 120 }}
            >
              SKILLS
            </p>
            <p
              className="font-['Pretendard'] text-center leading-[1.2] text-white tracking-[-0.05em]"
              style={{ fontSize: 16 }}
            >
              기획부터 화면 구현까지,
              <br />
              직접 만들 수 있는 범위입니다
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
