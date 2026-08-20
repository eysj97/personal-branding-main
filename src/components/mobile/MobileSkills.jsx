import { useEffect, useRef, useState } from "react";
import {
  FOLDER_BODY_TOP,
  FOLDER_H,
  FOLDER_PATH,
  FOLDER_W,
  SKILLS,
  bodyTopFor,
} from "../../data/skills";
import { HEADER_H, SECTION_TITLE, vw } from "./MobileHeader";

// The SKILLS board, on a phone. Figma 350:3433, drawn at 430 x 932.
//
// Same eight folders, same three colours, same drawing — see data/skills. What
// the design changes is the board: three across with the heading standing in it
// becomes four down and two across, with the heading underneath where PROJECT
// and Learn put theirs. So this is a different arrangement of the same set
// rather than a different section, and it shares everything but the geometry.
//
// The card is 182.76 x 159 against the desktop's 290 x 252.3 — a shade under
// two thirds — and that is the size the design asks for. What does *not* scale
// with it is the copy: two thirds of 12px is 8px, which is not type any more.
// The box is in vw so the board keeps its proportions on every phone, and the
// words are in fixed px so they stay legible on the small ones, wrapping to a
// second line where they need to. Same split the hero makes, for the same
// reason.
const CARD_W = 182.76;
const CARD_H = 159.004;
const COL_GAP = 25.48;
const ROW_GAP = 18;
const SIDE_PAD = 20;
// The gap between the board and the heading under it. Smaller than PROJECT's or
// LEARN's 66 because the board is four rows tall and the two together already
// fill the screen.
const HEADING_GAP = 16;

const BODY_TOP_PX = bodyTopFor(CARD_H);

// The folders are dealt out rather than simply being there — the desktop board
// does the same, and a grid that is fully drawn before you arrive is a picture
// where the desktop's is a hand being laid down.
//
// From the top right, which is where the design starts: row by row, and each
// row right to left. Written as a sort over the grid position so the order
// follows the layout rather than the order SKILLS happens to be written in.
const DEAL_STEP_MS = 110; // between one folder and the next
const DEAL_SNAP_MS = 260; // and how long one takes to arrive
// How much of the section has to be on screen before the deal starts. The board
// is nearly the whole section, so waiting for half of it is waiting until it is
// the thing being looked at.
const DEAL_VISIBLE = 0.35;

const DEAL_ORDER = SKILLS.map((skill, i) => ({
  skill,
  // Two columns, filled in the order the list is written.
  row: Math.floor(i / 2),
  col: i % 2,
}))
  .sort((a, b) => a.row - b.row || b.col - a.col)
  .map(({ skill }, n) => [skill.title, n * DEAL_STEP_MS]);
const DEAL_DELAY = Object.fromEntries(DEAL_ORDER);
// The design's own padding inside a card, and it does not scale down with the
// card: at two thirds it would be 11px, which is not enough air around type
// this size.
const PAD_X = 14;
const PAD_Y = 14;

function Card({ title, desc, list, short, level, color }) {
  // The phone's shorter version of the AI card's list where there is one — the
  // full lines wrap to two apiece at this width and run the body past its own
  // bottom edge.
  const lines = short ?? list;
  return (
    <div className="relative w-full" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${FOLDER_W} ${FOLDER_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={FOLDER_PATH} fill={color} />
        <path d={FOLDER_PATH} fill="#000000" fillOpacity="0.08" />
        <rect
          x="0"
          y={FOLDER_BODY_TOP}
          width={FOLDER_W}
          height={FOLDER_H - FOLDER_BODY_TOP}
          rx="15"
          fill={color}
        />
      </svg>

      {/* Against the body alone, not the whole card — the tab above it is
          behind the folder, so anything measured from the card's own top edge
          would sit that much too high. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-between leading-none text-black"
        style={{
          top: `${(BODY_TOP_PX / CARD_H) * 100}%`,
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
          paddingTop: PAD_Y,
          paddingBottom: PAD_Y,
        }}
      >
        <div className="flex flex-col items-start gap-[6px]">
          <p className="font-['Plus_Jakarta_Sans'] text-[15px] font-semibold tracking-[-0.1em] whitespace-pre-line">
            {title}
          </p>
          {lines ? (
            <div className="flex flex-col gap-[4px] font-['Plus_Jakarta_Sans'] text-[10px] leading-[1.2] tracking-[-0.06em]">
              {lines.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p className="font-['Pretendard'] text-[10px] leading-[1.2] tracking-[-0.06em]">
              {desc}
            </p>
          )}
        </div>
        <p className="text-right font-['Plus_Jakarta_Sans'] text-[11px] font-semibold tracking-[-0.02em]">
          {level}
        </p>
      </div>
    </div>
  );
}

export default function MobileSkills() {
  const sectionRef = useRef(null);
  const [dealt, setDealt] = useState(false);

  // Dealt when the board is genuinely on screen, and re-armed when it is not —
  // so coming back to it plays the deal again rather than handing over a grid
  // that is already out. The same rearm the desktop board does.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setDealt(entry.intersectionRatio >= DEAL_VISIBLE),
      // Two thresholds, not one: an observer only reports when it crosses a
      // threshold it was given, and a single value would never fire on a
      // section that scrolls into view and stops short of it.
      { threshold: [0, DEAL_VISIBLE] },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-ground="light"
      className="section-mobile-skills flex min-h-[100svh] flex-col bg-white"
    >
      {/* Clear of the fixed header — see MobileHeader. */}
      <div className="shrink-0" style={{ height: HEADER_H }} />

      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: vw(HEADING_GAP), paddingBottom: vw(40) }}
      >
        <div
          className="grid w-full grid-cols-2"
          style={{
            paddingLeft: vw(SIDE_PAD),
            paddingRight: vw(SIDE_PAD),
            columnGap: vw(COL_GAP),
            rowGap: vw(ROW_GAP),
          }}
        >
          {/* In the order the list is written, which is the order the desktop
              board bands its colours in — two blue, three lime, three pink.
              Read down the two columns that comes out as a colour per pair of
              rows, which is the same reading the desktop grid gives across its
              rows. */}
          {SKILLS.map((skill) => (
            <div
              key={skill.title}
              // Snapped up into place rather than faded: a folder being put
              // down on the board, which is what the desktop's deal reads as
              // too. The delay is its own place in the run — top right first,
              // then along the row and down. Zero on the way out, so a section
              // being scrolled away from clears all at once instead of
              // un-dealing itself.
              className="will-change-[opacity,transform]"
              style={{
                opacity: dealt ? 1 : 0,
                transform: dealt ? "none" : "translateY(-10px) scale(0.96)",
                transition: `opacity ${DEAL_SNAP_MS}ms ease-out, transform ${DEAL_SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                transitionDelay: dealt ? `${DEAL_DELAY[skill.title]}ms` : "0ms",
              }}
            >
              <Card {...skill} />
            </div>
          ))}
        </div>

        {/* The same pair every mobile section ends on — the name of the section
            and the one line that says what it is — at the same sizes, so they
            read as one page. */}
        {/* Black, because this section is on a white ground now. <body> is
            `text-white`, which is right on the page's blue sections and
            invisible here, so this states its own colour rather than
            inheriting one that would leave it off the page. */}
        <div className="flex flex-col items-center gap-[18px] text-black">
          <p
            // The page's blue, which is what a section's name is set in
            // wherever the ground is white — LEARN, SKILLS and the desktop's
            // PROJECT all do it, and the phone's CAREER design draws "Every
            // Role" the same way. Only the line under it is black.
            className="font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] text-[#336bec]"
            // Capped at 90 — see SECTION_TITLE, so this lands where Experience's
            // title does instead of running on to 107 by the 767 handover.
            // The tracking moves into the style with it: -1.2px on the design's 60
            // *is* -0.02em, and pinned as a px it reads looser the bigger this gets.
            style={{ fontSize: SECTION_TITLE, letterSpacing: "-0.02em" }}
          >
            Skill
          </p>
          <p className="px-[10px] text-center font-['Pretendard'] text-[16px] leading-[1.2] tracking-[-0.32px]">
            기획부터 화면구현까지,
            <br />
            직접 만들 수 있는 범위입니다
          </p>
        </div>
      </div>
    </section>
  );
}
