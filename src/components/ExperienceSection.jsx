import { useEffect, useRef, useState } from "react";

import SnapkeepSpread from "./detail/SnapkeepSpread";

import browserShot from "../assets/experience/browser-shot.png";
import browserShotOverlay from "../assets/experience/browser-shot-2.png";
import savedBoard from "../assets/experience/saved-board.png";
import phoneScreen from "../assets/experience/phone-screen.png";
import phoneFrame from "../assets/experience/phone-frame.png";
import scribbleArrow from "../assets/experience/scribble-arrow.svg";
import scribbleStack from "../assets/experience/scribble-stack.svg";
import underline from "../assets/experience/underline.svg";
import tagCluster from "../assets/experience/tag-cluster.svg";
import folderA from "../assets/experience/folder-a.svg";
import folderB from "../assets/experience/folder-b.svg";
import folderC from "../assets/experience/folder-c.svg";
import cube from "../assets/experience/cube.svg";

import icSidebar from "../assets/experience/safari/sidebar-leading.svg";
import icChevronDown from "../assets/experience/safari/chevron-down.svg";
import icChevronLeft from "../assets/experience/safari/chevron-left.svg";
import icChevronRight from "../assets/experience/safari/chevron-right.svg";
import icShield from "../assets/experience/safari/shield.svg";
import icLock from "../assets/experience/safari/lock.svg";
import icReload from "../assets/experience/safari/arrow-clockwise.svg";
import icShare from "../assets/experience/safari/share.svg";
import icPlus from "../assets/experience/safari/plus.svg";
import icGrid from "../assets/experience/safari/grid.svg";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (v) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
// Overshoot-and-settle, for things that should land with a bounce. Higher
// `overshoot` swings further past 1 before coming back to it.
const backOut = (v, overshoot = 1.70158) => {
  const p = clamp01(v) - 1;
  return 1 + (overshoot + 1) * p * p * p + overshoot * p * p;
};

// The Figma frame is one continuous strip of four 1080px-tall panels laid out
// left to right. Everything below is positioned in those literal design px and
// the whole strip is then scaled to the viewport height, so the composition
// stays pixel-identical to the design at any screen size — the same approach
// SkillsSection and CareerSection use for their canvases.
const DESIGN_HEIGHT = 1080;
const PANELS = [1920, 1920, 3031, 2545, 1920];
const TOTAL_WIDTH = PANELS.reduce((sum, w) => sum + w, 0);

// One wheel tick moves the strip one screenful, rather than the strip tracking
// the scrollbar continuously. Every panel gets a stop; the two wide ones get a
// second so they can be read all the way across before the section moves on.
// Positions are the design-px the viewport's left edge lands on.
const STOPS = PANELS.reduce(
  (acc, width) => {
    acc.stops.push(acc.at);
    if (width > PANELS[0] * 1.2) acc.stops.push(acc.at + width - PANELS[0]);
    acc.at += width;
    return acc;
  },
  { stops: [], at: 0 },
).stops;

// The section only needs enough range to park each stop at a distinct scroll
// position — the travel itself is driven by the wheel, not by this height.
const TRACK_VH = 200;
const STEP_RAW = STOPS.map((_, i) => i / Math.max(1, STOPS.length - 1));
const TWEEN_MS = 520;

// Which stop shows each panel. Elements name the stop they belong to and are
// sequenced entirely by `data-delay` from there.
const STOP = {
  intro: 0,
  saved: 1,
  problemA: 2,
  problemB: 3,
  solutionA: 4,
  solutionB: 5,
  snapkeep: 6,
};

// ---------------------------------------------------------------------------
// Entrance animations.
//
// Every animated element carries `data-anim` (which effect), `data-stop` (the
// stop it belongs to) and `data-delay` (ms after that stop lands). Once the
// strip has arrived, each effect runs on its own clock and finishes at its own
// pace — playback is never tied to scroll position, which would stall every
// animation the moment the reader stops moving.
//
// Keying off the stop rather than the element's own position is what makes the
// sequencing readable: a whole panel arrives in one 520ms tween, so triggering
// on x meant everything in it fired within a few frames of everything else no
// matter how far apart the pieces sat.
// ---------------------------------------------------------------------------

// Text is quick — it is read, not watched. The artwork is the opposite: the
// pop is the thing you are meant to notice, so it gets room to be seen.
const DURATIONS = {
  sweep: 600,
  wipe: 460,
  popup: 560,
  pop: 640,
  tint: 300,
  type: 650,
};

// Left-to-right sharpen for headlines. The mask is three times the text's own
// width — solid on the left, clear on the right — so sliding it from `100%` to
// `0%` walks the boundary across the line.
//
// `floor` is how visible the line is *before* the sweep reaches it. 0 means it
// starts from nothing, which is the default: a headline that is already
// legible before its own entrance has nothing left to reveal.
const sweepStyleFrom = (floor) => {
  const mask = `linear-gradient(90deg, #000 0%, #000 45%, rgba(0,0,0,${floor}) 55%, rgba(0,0,0,${floor}) 100%)`;
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "300% 100%",
    WebkitMaskSize: "300% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "100% 0",
    WebkitMaskPosition: "100% 0",
  };
};
const sweepStyle = sweepStyleFrom(0);
// The opening title is the exception: it is meant to sit faintly on screen and
// come into focus, rather than being written in from blank.
const sweepStyleGhosted = sweepStyleFrom(0.2);

// A mask clips to the element's own box, and `leading-none` makes that box
// exactly the font size — so descenders (g, p, y) hang outside it and get
// sliced off flat. The padding grows the box the mask is measured against;
// the matching negative margin puts the text back where the design has it.
const SWEEP_BOX = "py-[0.22em] -my-[0.22em]";

/** Text that types itself out. Every character is rendered up front in its own
    span and only its opacity changes, so the line is laid out in full from the
    start and never reflows as it "types" — the same approach CareerSection's
    paragraphs use. The spans are hidden from assistive tech and the whole
    string is put back as a label, so a screen reader reads one sentence. */
function TypedText({ lines, className, style, stop, delay = 0 }) {
  return (
    <p
      className={className}
      style={style}
      aria-label={lines.join(" ")}
      data-anim="type"
      data-stop={stop}
      data-delay={delay}
    >
      {lines.map((line, li) => (
        <span key={li} className="block whitespace-pre">
          {Array.from(line).map((character, ci) => (
            <span key={ci} aria-hidden="true" data-char style={{ opacity: 0 }}>
              {character}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

/** Wraps a piece of artwork in a box matching its own bounds, so the popup
    scale grows from that element's centre rather than the panel's, and so the
    transform has somewhere to live that isn't already carrying one from the
    design's layout. */
function Popup({ stop, delay = 0, left, top, width, height, children }) {
  return (
    <div
      className="absolute"
      data-anim="popup"
      data-stop={stop}
      data-delay={delay}
      style={{ left, top, width, height, opacity: 0 }}
    >
      {children}
    </div>
  );
}

function applyAnim(el, kind, t, typedCounts) {
  switch (kind) {
    case "sweep": {
      const position = `${(1 - t) * 100}% 0`;
      el.style.maskPosition = position;
      el.style.webkitMaskPosition = position;
      break;
    }
    case "wipe": {
      el.style.clipPath = `inset(0 ${(1 - t) * 100}% 0 0)`;
      break;
    }
    case "popup": {
      // Window-opening, not drifting in: it snaps up to size with a small
      // overshoot and the opacity is over almost immediately, so what you read
      // is the scale rather than a fade. The element's own box carries this,
      // so it grows from its own centre.
      el.style.opacity = String(clamp01(t * 4));
      el.style.transform = `scale(${0.85 + 0.15 * backOut(t, 2.6)})`;
      break;
    }
    case "pop": {
      // Opacity resolves in the first third so the overshoot is visible rather
      // than happening while the element is still fading up.
      el.style.opacity = String(clamp01(t * 3));
      el.style.transform = `scale(${0.3 + 0.7 * backOut(t)})`;
      break;
    }
    case "tint": {
      // #0492bd -> #ffffff. The line arrives entirely in the accent colour and
      // only the second half lifts to white, so the emphasis lands as a beat
      // of its own rather than being baked into the markup.
      const r = Math.round(4 + (255 - 4) * t);
      const g = Math.round(146 + (255 - 146) * t);
      const b = Math.round(189 + (255 - 189) * t);
      el.style.color = `rgb(${r}, ${g}, ${b})`;
      break;
    }
    case "type": {
      const chars = el.querySelectorAll("[data-char]");
      // Linear, not eased — an eased typewriter visibly speeds up and slows
      // down mid-word, which reads as a glitch rather than typing.
      const next = Math.round(t * chars.length);
      const previous = typedCounts.get(el) ?? 0;
      if (next === previous) break;
      // Only the characters that actually changed state get touched; walking
      // all of them every frame is what makes this kind of effect stutter.
      if (next > previous) {
        for (let i = previous; i < next; i += 1) chars[i].style.opacity = "1";
      } else {
        for (let i = next; i < previous; i += 1) chars[i].style.opacity = "0";
      }
      typedCounts.set(el, next);
      break;
    }
    default:
      break;
  }
}

/** Panel 1 — the title card that hands off from the hero. */
function IntroPanel() {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[24px] pl-[20px] leading-[1.2] text-white">
        <p
          className={`font-['Plus_Jakarta_Sans'] text-[120px] font-semibold tracking-[-2.4px] ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.intro}
          data-delay={0}
          data-duration={220}
          style={sweepStyleGhosted}
        >
          Experience It
        </p>
        <TypedText
          lines={["말보다 먼저, 만든 걸 보여드릴게요."]}
          className="font-['Pretendard'] text-[22px] tracking-[-0.44px]"
          stop={STOP.intro}
          delay={400}
        />
      </div>
    </div>
  );
}

/** The Safari chrome around the desktop screenshot. Its own sub-pixel sizes
    come straight from the design — this is a scaled-down device frame, so the
    fractional values are load-bearing rather than noise. */
function SafariWindow() {
  return (
    // Fills the Popup box that positions it — the design's own 754/113 origin
    // and 1006.6x538.3 size live there now.
    <div className="absolute inset-0 flex flex-col items-start overflow-hidden rounded-[10px] border-[0.35px] border-solid border-[#a5a5a5] bg-[#bfc2c8] shadow-[0px_11.2px_33.6px_0px_rgba(0,0,0,0.5)]">
      <div className="relative h-[36.4px] w-full shrink-0 overflow-hidden bg-[rgba(255,255,255,0.8)] backdrop-blur-[16.8px]">
        <div className="absolute left-[14px] top-[14px] flex items-start gap-[5.6px]">
          <div className="size-[8.4px] shrink-0 rounded-[6px] bg-[#ec6b5e]" />
          <div className="size-[8.4px] shrink-0 rounded-[6px] bg-[#f4bf4f]" />
          <div className="size-[8.4px] shrink-0 rounded-[6px] bg-[#61c453]" />
        </div>

        <img src={icSidebar} alt="" className="absolute left-[48.41px] top-[8.91px] h-[10.068px] w-[12.895px]" />
        <div className="absolute left-[60.76px] top-[8.33px] h-[12.6px] w-[0.7px] bg-[rgba(0,0,0,0.1)]" />
        <img src={icChevronDown} alt="" className="absolute left-[64.19px] top-[12.25px] h-[2.1px] w-[4.2px]" />

        <img src={icChevronLeft} alt="" className="absolute left-[114.54px] top-[13px] h-[9.494px] w-[5.348px]" />
        <img src={icChevronRight} alt="" className="absolute left-[139.73px] top-[13px] h-[9.494px] w-[5.348px]" />

        {/* Address bar — left/right insets rather than a width, so it keeps the
            design's proportion of the toolbar. */}
        <div className="absolute left-[27.69%] right-[29.84%] top-1/2 h-[19.6px] -translate-y-1/2">
          <img src={icShield} alt="" className="absolute left-[0.53px] top-[4.68px] h-[11.047px] w-[9.089px]" />
          <div className="absolute left-[20.65px] right-0 top-1/2 h-[19.6px] -translate-y-1/2 overflow-hidden rounded-[8px] border-[0.7px] border-solid border-[rgba(0,0,0,0.25)]">
            <div className="absolute left-1/2 top-[3.85px] flex -translate-x-1/2 items-center justify-center gap-[5.6px]">
              <img src={icLock} alt="" className="h-[8.002px] w-[5.48px] shrink-0" />
              <p className="font-['Pretendard'] text-[9.8px] leading-none text-[#999]">
                khazifire.com
              </p>
            </div>
            <img src={icReload} alt="" className="absolute right-[4.04px] top-[3.9px] h-[9.567px] w-[7.851px]" />
          </div>
        </div>

        <img src={icShare} alt="" className="absolute right-[65.5px] top-[11.18px] h-[12.343px] w-[9.707px]" />
        <img src={icPlus} alt="" className="absolute right-[40.29px] top-[13.24px] size-[9.023px]" />
        <img src={icGrid} alt="" className="absolute right-[13.87px] top-[12.73px] size-[10.068px]" />
      </div>

      <div className="relative w-full flex-1 overflow-hidden bg-[#f5f5f5]">
        {/* Two exported layers stacked exactly as the design composes them:
            the base shot, then an overlay nudged up by 4.1% of its own box. */}
        <div className="absolute left-0 top-0 h-[504px] w-[1008px]">
          <img src={browserShot} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
          <div className="absolute inset-0 overflow-hidden">
            <img src={browserShotOverlay} alt="" className="absolute left-0 top-[-4.1%] h-[108.4%] w-[100.78%] max-w-none" />
          </div>
        </div>
        <div className="absolute inset-x-0 top-0 h-[0.35px] bg-[rgba(0,0,0,0.2)]" />
        <div className="absolute inset-x-0 top-[0.35px] h-[0.35px] bg-[rgba(0,0,0,0.1)]" />
      </div>
    </div>
  );
}

/** Panel 2 — the "everything saved, nothing findable" board. The three pieces
    of artwork rise in the order they reach the screen; the headline is held
    back until they have all landed, since it is the punchline. */
function SavedPanel() {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <Popup stop={STOP.saved} delay={0} left={189} top={492} width={800} height={495}>
        <div className="absolute inset-0 overflow-hidden">
          <img src={savedBoard} alt="" className="absolute left-[-0.17%] top-[-0.17%] h-[100.33%] w-[100.17%] max-w-none" />
        </div>
      </Popup>

      <Popup stop={STOP.saved} delay={260} left={754} top={113} width={1006.6} height={538.3}>
        <SafariWindow />
      </Popup>

      {/* The phone's two layers share one box, so the frame and the screen
          inside it pop as a single object. Their offsets are the design's own,
          rebased onto the frame's origin. */}
      <Popup stop={STOP.saved} delay={520} left={1386} top={434} width={309} height={605.336}>
        <div className="absolute left-[18.36px] top-[22.16px] h-[561.012px] w-[272.275px] rounded-[30px]">
          <img src={phoneScreen} alt="" className="absolute inset-0 size-full max-w-none rounded-[30px] object-contain" />
        </div>
        <div className="absolute inset-0">
          <img src={phoneFrame} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
        </div>
      </Popup>

      {/* Right-aligned to x=708 in the design, hence the translate rather than
          a left offset — the two lines differ in length. */}
      <TypedText
        lines={["Saved it,", "But can’t find it"]}
        className="absolute left-[708px] top-[339px] -translate-x-full text-right font-['Plus_Jakarta_Sans'] text-[50px] font-bold leading-none text-[#0492bd]"
        stop={STOP.saved}
        delay={860}
      />
    </div>
  );
}

/** Panel 3 — the problem statement, the widest panel in the strip. Its pieces
    are triggered by their own left edges, which happens to be exactly the
    reading order: headline, the squiggle under it, then the marks. */
function ProblemPanel() {
  return (
    <div className="relative h-full w-[3031px] shrink-0 overflow-hidden bg-[#06252e]">
      <p
        className={`absolute left-[calc(50%+50.5px)] top-[calc(50%-139px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none text-[#0492bd] whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.problemA}
        style={sweepStyle}
      >
        The problem wasn&rsquo;t saving
      </p>

      {/* Both hang off the headline's own trigger on the same delay, so they
          arrive together once the line has been written — the squiggle wiping
          open under it while the mark pops in beside it. */}
      <div
        className="absolute left-[308px] top-[511px] flex h-[29px] w-[582px] items-center justify-center"
        data-anim="wipe"
        data-stop={STOP.problemA}
        data-delay={450}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      >
        <img src={underline} alt="" className="h-[29px] w-[582px] max-w-none -scale-y-100" />
      </div>

      <div
        className="absolute left-[1238px] top-[203px] flex h-[197.986px] w-[198.12px] items-center justify-center"
        data-anim="pop"
        data-stop={STOP.problemA}
        data-delay={450}
        data-float="12"
        style={{ opacity: 0 }}
      >
        <div className="rotate-[11.95deg]">
          <img src={scribbleArrow} alt="" className="h-[167.001px] w-[167.173px] max-w-none" />
        </div>
      </div>

      <p
        className={`absolute left-[calc(50%+1052.5px)] top-[calc(50%+121px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.problemB}
        style={sweepStyle}
      >
        <span className="text-[#0492bd]">it was </span>
        {/* Keyed to the box's own x rather than this line's, with a delay that
            lands the colour change while that pop is playing — the emphasis is
            supposed to read as a reaction to it. */}
        <span
          data-anim="tint"
          data-stop={STOP.problemB}
          data-delay={900}
          style={{ color: "#0492bd" }}
        >
          getting it back out.
        </span>
      </p>

      <img
        src={scribbleStack}
        alt=""
        className="absolute left-[2592px] top-[521px] h-[294.5px] w-[259px] max-w-none"
        data-anim="pop"
        data-stop={STOP.problemB}
        data-delay={450}
        data-float="14"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

/** A stand-in reference card — the repeated block in the "AI tagging" cluster.
    Drawn rather than exported because the design builds it from plain
    rectangles, so there is no asset to render. */
function TagCard({ left, top, stop, delay }) {
  return (
    <div
      className="absolute h-[82px] w-[176px] rounded-[8px] bg-[rgba(4,146,189,0.2)]"
      style={{ left, top, opacity: 0 }}
      data-anim="pop"
      data-stop={stop}
      data-delay={delay}
    >
      <div className="absolute left-[7px] top-[7px] size-[66px] rounded-[8px] bg-[rgba(4,146,189,0.3)]" />
      <div className="absolute left-[87px] top-[13px] h-[11px] w-[42px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
      <div className="absolute left-[87px] top-[34px] h-[11px] w-[80px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
      <div className="absolute left-[87px] top-[55px] h-[11px] w-[80px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
    </div>
  );
}

function FilterChip({ label, left, top, stop, delay }) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-[8px] bg-[rgba(4,146,189,0.4)] px-[10px] py-[5px]"
      style={{ left, top, opacity: 0 }}
      data-anim="pop"
      data-stop={stop}
      data-delay={delay}
    >
      <p className="font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-none tracking-[-0.6px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">
        {label}
      </p>
    </div>
  );
}

/** Panel 4 — the three answers, read top to bottom.
 *
 *  Each row is one beat: the headline sweeps in, then that row's graphics pop
 *  in one after another. The rows are keyed to their own headline's left edge,
 *  which runs top-to-bottom in x as well, so they play in reading order; the
 *  graphics then hang off that same trigger on a delay rather than their own
 *  positions, which is what keeps each row's pieces together. */
const POP_STEP = 150; // ms between graphics inside one row — one at a time, visibly
const ROW_LEAD = 200; // ms from a row's headline to its first graphic
// Row 2 shares a stop with row 1, so it waits out row 1's whole sequence
// before starting its own — otherwise both headlines write at once.
const ROW_B = 950;
// Row 3 follows row 2 in the same breath rather than waiting for a scroll.
const ROW_C = 1900;
const headlineClass =
  "absolute -translate-x-full text-right font-['Plus_Jakarta_Sans'] text-[70px] font-bold leading-none tracking-[-1.4px] text-white whitespace-nowrap";

function SolutionPanel() {
  return (
    <div className="relative h-full w-[2545px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Row 1 — AI tagging */}
      <p
        className={`${headlineClass} left-[1386px] top-[275px] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.solutionA}
        style={sweepStyle}
      >
        AI tagging instead of folders
      </p>
      {/* The folder trio keeps the design's percentage insets — they were
          authored against the panel width, so hardcoding px would drift. */}
      <img
        src={folderC}
        alt=""
        className="absolute left-[146px] top-[174px] h-[117.907px] w-[157.907px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_LEAD}
        data-float="11"
        style={{ opacity: 0 }}
      />
      <img
        src={folderB}
        alt=""
        className="absolute left-[11.47%] right-[83.04%] top-[299.66px] h-[96.671px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_LEAD + POP_STEP}
        data-float="11"
        style={{ opacity: 0 }}
      />
      <img
        src={folderA}
        alt=""
        className="absolute left-[15.83%] right-[78.38%] top-[154px] h-[95.861px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_LEAD + POP_STEP * 2}
        data-float="11"
        style={{ opacity: 0 }}
      />
      <img
        src={tagCluster}
        alt=""
        className="absolute left-[1317px] top-[143px] h-[129.291px] w-[161.633px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_LEAD + POP_STEP * 3}
        data-float="11"
        style={{ opacity: 0 }}
      />

      {/* Row 2 — search in design language */}
      <p
        className={`${headlineClass} left-[1664px] top-[calc(50%-35px)] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.solutionA}
        data-delay={ROW_B}
        style={sweepStyle}
      >
        Search in design language
      </p>
      <FilterChip label="Screen" left={702} top={465} stop={STOP.solutionA} delay={ROW_B + ROW_LEAD} />
      <FilterChip label="Platform" left={641} top={523} stop={STOP.solutionA} delay={ROW_B + ROW_LEAD + POP_STEP} />
      <FilterChip label="Mood" left={1633} top={465} stop={STOP.solutionA} delay={ROW_B + ROW_LEAD + POP_STEP * 2} />
      <FilterChip label="Service" left={1686} top={529} stop={STOP.solutionA} delay={ROW_B + ROW_LEAD + POP_STEP * 3} />
      <img
        src={cube}
        alt=""
        className="absolute inset-[20.74%_40.75%_72.31%_56.31%] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_B + ROW_LEAD + POP_STEP * 4}
        data-float="11"
        style={{ opacity: 0 }}
      />

      {/* Row 3 — layout structure */}
      <p
        className={`${headlineClass} left-[2043px] top-[735px] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.solutionA}
        data-delay={ROW_C}
        style={sweepStyle}
      >
        Layout structure
      </p>
      <TagCard left={1245} top={696} stop={STOP.solutionA} delay={ROW_C + ROW_LEAD} />
      <TagCard left={1313} top={805} stop={STOP.solutionA} delay={ROW_C + ROW_LEAD + POP_STEP} />

      {/* Wireframe stand-in for the layout-structure idea: a sidebar rotated
          onto its side plus a header and body block. */}
      <div
        className="absolute left-[2072px] top-[655px] flex h-[150px] w-[37px] items-center justify-center"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_C + ROW_LEAD + POP_STEP * 2}
        style={{ opacity: 0 }}
      >
        {/* `flex-none` is load-bearing: the bar is 150px long inside a 37px
            wide flex line, so without it the bar is shrunk to fit *before* it
            is rotated and the sidebar comes out a square instead of a
            full-height column. */}
        <div className="-rotate-90 flex-none">
          <div className="h-[37px] w-[150px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
        </div>
      </div>
      <div
        className="absolute left-[2121px] top-[655px] h-[37px] w-[143px] rounded-[8px] bg-[rgba(4,146,189,0.4)]"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_C + ROW_LEAD + POP_STEP * 3}
        style={{ opacity: 0 }}
      />
      <div
        className="absolute left-[2121px] top-[701px] h-[102px] w-[143px] rounded-[8px] bg-[rgba(4,146,189,0.2)]"
        data-anim="pop"
        data-stop={STOP.solutionA}
        data-delay={ROW_C + ROW_LEAD + POP_STEP * 4}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

/** Panel 5 — the payoff: the line that states the idea, then Snapkeep itself.
 *
 *  The real app, live and usable. This only works because the strip moves in
 *  discrete steps and is otherwise still — on a surface that tracked the
 *  scrollbar continuously, the click targets would be sliding under the
 *  cursor the whole time. */
// The line and the app are a pair, so the gap between them is stated once and
// the app's top is derived from it rather than being a second hand-tuned
// number that drifts whenever the type size changes.
const LINE_TOP = 120;
const LINE_SIZE = 22;
const LINE_LEADING = 1.3;
const LINE_GAP = 24;
const APP_TOP = Math.round(LINE_TOP + LINE_SIZE * LINE_LEADING + LINE_GAP);
// The space left under the line that the app has to fit inside, in design px.
const APP_AREA = { top: APP_TOP, height: DESIGN_HEIGHT - APP_TOP - 60, maxWidth: 1700 };

// The window is a fixed frame, sized from Snapkeep's own authored dimensions
// (index.css pins the shell to 1440 wide with a 900 min-height) rather than
// from whatever it currently renders as. Measuring the live app instead makes
// the window grow and shrink as references are added or deleted, which reads
// as the layout breaking rather than as content changing — so the frame is
// constant and anything past it scrolls inside.
const APP_FRAME = { width: 1440, height: 900 };
const APP_FIT = Math.min(
  1,
  APP_AREA.height / APP_FRAME.height,
  APP_AREA.maxWidth / APP_FRAME.width,
);

function SnapkeepPanel() {
  const width = APP_FRAME.width * APP_FIT;
  const height = APP_FRAME.height * APP_FIT;

  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <TypedText
        lines={["스크린샷을 올려보세요. AI가 태깅하고, 내 언어로 검색됩니다"]}
        className="absolute left-1/2 -translate-x-1/2 text-center font-['Pretendard'] text-[22px] font-medium leading-[1.3] tracking-[-0.44px] text-white"
        style={{ top: LINE_TOP }}
        stop={STOP.snapkeep}
        delay={150}
      />

      <Popup
        stop={STOP.snapkeep}
        delay={620}
        left={(1920 - width) / 2}
        top={APP_AREA.top}
        width={width}
        height={height}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[24px] shadow-[0px_24px_60px_0px_rgba(0,0,0,0.45)]">
          {/* Live and clickable. `data-interactive` tells the section's wheel
              handler to keep its hands off gestures that start in here, so the
              app's own scrolling works instead of being turned into a step.

              The scroller is sized to the frame and scaled as a whole, so a
              long reference list scrolls within a window that never changes
              size. */}
          <div
            className="snapkeep-frame origin-top-left overflow-y-auto"
            style={{
              width: APP_FRAME.width,
              height: APP_FRAME.height,
              transform: `scale(${APP_FIT})`,
            }}
            data-interactive
          >
            <SnapkeepSpread />
          </div>
        </div>
      </Popup>
    </div>
  );
}

export default function ExperienceSection() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Fit the strip's height to the viewport; the width then follows from the
  // design's own aspect ratio and becomes the horizontal travel distance.
  useEffect(() => {
    const fit = () => setScale(window.innerHeight / DESIGN_HEIGHT);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const animated = [...section.querySelectorAll("[data-anim]")].map((el) => ({
      el,
      kind: el.dataset.anim,
      stop: Number(el.dataset.stop) || 0,
      delay: Number(el.dataset.delay) || 0,
      duration: Number(el.dataset.duration) || DURATIONS[el.dataset.anim] || 800,
      // Wall-clock time this one is due to begin; null until it is on screen.
      startAt: null,
      done: false,
    }));
    const typedCounts = new Map();
    let paintId = null;

    // --- the step machine ------------------------------------------------
    // One wheel tick / swipe advances one stop; the strip tweens there and
    // stays put until the next one. At either end the event is deliberately
    // not claimed, which hands the gesture straight to the neighbouring
    // section — that is what makes "read to the end, scroll once more, next
    // section" work without any special-casing.
    let stepIndex = 0;
    let currentX = 0;
    let busy = false;
    let tweenId = null;
    let selfScrollUntil = 0;

    function metrics() {
      const stripScale = window.innerHeight / DESIGN_HEIGHT;
      const viewportWidth = window.innerWidth;
      return {
        stripScale,
        viewportWidth,
        maxX: Math.max(0, TOTAL_WIDTH * stripScale - viewportWidth),
      };
    }

    function targetXFor(index) {
      const { stripScale, maxX } = metrics();
      // The last stop goes all the way, so the final panel is never left with
      // a sliver of itself off the right edge.
      if (index >= STOPS.length - 1) return maxX;
      return Math.min(STOPS[index] * stripScale, maxX);
    }

    // Playback runs on its own clock: once an element is on screen it plays
    // through at its own pace, whether or not the reader keeps scrolling.
    function paint(now) {
      let running = false;
      for (const item of animated) {
        if (item.startAt === null || item.done) continue;
        const elapsed = now - item.startAt;
        if (elapsed < 0) {
          running = true; // still inside its stagger delay
          continue;
        }
        const t = clamp01(elapsed / item.duration);
        // Typing stays linear — an eased typewriter visibly speeds up and slows
        // down mid-word, which reads as a glitch rather than typing.
        applyAnim(item.el, item.kind, item.kind === "type" ? t : smoothstep(t), typedCounts);
        if (t >= 1) item.done = true;
        else running = true;
      }
      paintId = running ? requestAnimationFrame(paint) : null;
    }

    function applyX(x) {
      currentX = x;
      trackRef.current.style.transform = `translate3d(${-x}px, 0, 0)`;
    }

    // Arm everything belonging to stops we have reached, and rearm anything
    // above them so scrolling back and returning replays it.
    function refreshTriggers() {
      const beforeSection = section.getBoundingClientRect().top > 0;
      let started = false;
      for (const item of animated) {
        const reached = !beforeSection && stepIndex >= item.stop;
        if (item.startAt === null) {
          if (reached) {
            item.startAt = performance.now() + item.delay;
            started = true;
          }
        } else if (!reached) {
          item.startAt = null;
          item.done = false;
          applyAnim(item.el, item.kind, 0, typedCounts);
        }
      }
      if (started && paintId === null) paintId = requestAnimationFrame(paint);
    }

    // Once a graphic has landed it drifts, so the panels are never completely
    // static while you read them. Each gets its own phase and period, or they
    // bob in lockstep and read as one rigid sheet moving.
    // Everything that pops in drifts afterwards — the chips, cards and layout
    // blocks beside the headlines as much as the drawn marks, since they read
    // as the same family of floating pieces. `data-float` overrides how far.
    const floaters = animated
      .filter((item) => item.kind === "pop")
      .map((item, n) => ({
        item,
        amplitude: Number(item.el.dataset.float) || 9,
        phase: n * 1.9,
        period: 2600 + n * 220,
      }));
    let floatId = null;

    function floatTick(now) {
      for (const { item, amplitude, phase, period } of floaters) {
        // While the entrance is still playing it owns the transform.
        if (!item.done) continue;
        const y = Math.sin((now / period) * Math.PI * 2 + phase) * amplitude;
        item.el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(1)`;
      }
      floatId = requestAnimationFrame(floatTick);
    }

    // Only drift while the section is actually on screen.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && floatId === null) {
          floatId = requestAnimationFrame(floatTick);
        } else if (!entry.isIntersecting && floatId !== null) {
          cancelAnimationFrame(floatId);
          floatId = null;
        }
      },
      { threshold: 0 },
    );
    visibility.observe(section);

    function tweenTo(target) {
      busy = true;
      const from = currentX;
      const startedAt = performance.now();
      function step() {
        const t = clamp01((performance.now() - startedAt) / TWEEN_MS);
        applyX(from + (target - from) * smoothstep(t));
        if (t < 1) {
          tweenId = requestAnimationFrame(step);
        } else {
          busy = false;
          tweenId = null;
          // Start the panel's sequence once it has actually landed, so the
          // entrances are not competing with the strip still sliding under
          // them — which is what made them impossible to follow.
          refreshTriggers();
        }
      }
      step();
    }

    function isEngaged() {
      const rect = section.getBoundingClientRect();
      return rect.top <= 1 && rect.bottom >= window.innerHeight - 1;
    }

    // Park the page at the scroll position that matches the current stop, so
    // that at either end the page already sits on that edge of the section and
    // handing back to normal scrolling is a plain hand-off.
    function syncScroll() {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      selfScrollUntil = performance.now() + 200;
      window.scrollTo({
        top: section.offsetTop + STEP_RAW[stepIndex] * scrollable,
      });
    }

    function advance(direction) {
      const next = Math.min(
        STOPS.length - 1,
        Math.max(0, stepIndex + direction),
      );
      if (next === stepIndex) return;
      stepIndex = next;
      syncScroll();
      tweenTo(targetXFor(stepIndex));
    }

    let snapUntil = 0;

    function onWheel(e) {
      // The hero runs its own beats off the same wheel and claims the event
      // when it consumes one. Without this the last hero beat and the jump
      // into this section both happen on a single tick.
      if (e.defaultPrevented) return;
      // Anything inside the embedded app owns its own scrolling.
      if (e.target instanceof Element && e.target.closest("[data-interactive]")) {
        return;
      }
      const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (direction === 0) return;

      // Arriving from the hero: one tick lands on the section rather than
      // creeping into it, so entering reads the same as moving between the
      // panels inside it.
      const rect = section.getBoundingClientRect();
      // `<=` with a little slack: the hero hands off with its bottom edge
      // exactly on the viewport's, which puts this section's top at precisely
      // one viewport down. A strict `<` would need a second tick to catch it.
      if (
        !isEngaged() &&
        direction > 0 &&
        rect.top > 1 &&
        rect.top <= window.innerHeight + 4
      ) {
        e.preventDefault();
        if (performance.now() < snapUntil) return;
        snapUntil = performance.now() + 800;
        selfScrollUntil = performance.now() + 1000;
        window.scrollTo({ top: section.offsetTop, behavior: "smooth" });
        return;
      }

      if (!isEngaged()) return;
      if (busy) {
        e.preventDefault();
        return;
      }
      // At either end the page is already parked on that edge, so simply not
      // claiming the event hands the gesture to the neighbouring section.
      if (direction > 0 && stepIndex >= STOPS.length - 1) return;
      if (direction < 0 && stepIndex <= 0) return;
      e.preventDefault();
      advance(direction);
    }

    let touchStartY = null;
    function onTouchStart(e) {
      touchStartY = isEngaged() ? e.touches[0].clientY : null;
    }
    function onTouchMove(e) {
      if (touchStartY === null || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest("[data-interactive]")) {
        return;
      }
      if (busy) {
        e.preventDefault();
        return;
      }
      const delta = touchStartY - e.touches[0].clientY;
      if (Math.abs(delta) < 40) return;
      const direction = delta > 0 ? 1 : -1;
      touchStartY = e.touches[0].clientY;
      if (direction > 0 && stepIndex >= STOPS.length - 1) return;
      if (direction < 0 && stepIndex <= 0) return;
      e.preventDefault();
      advance(direction);
    }

    // The wheel owns the steps, but the page can still be moved under us — the
    // nav, a jump link, a resize. Re-derive the step from where the page landed
    // for moves we did not make ourselves.
    function onScroll() {
      // Re-derive the step only for moves we did not make ourselves — but run
      // the trigger check either way. Skipping it wholesale meant that landing
      // here via the hero's snap left the section parked with nothing played:
      // the smooth scroll finished inside the guard window, and with no
      // further scroll events there was nothing left to start the entrances.
      if (busy || performance.now() < selfScrollUntil) {
        refreshTriggers();
        return;
      }
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const raw = clamp01((window.scrollY - section.offsetTop) / scrollable);
      let nearest = 0;
      STEP_RAW.forEach((v, i) => {
        if (Math.abs(v - raw) < Math.abs(STEP_RAW[nearest] - raw)) nearest = i;
      });
      if (nearest !== stepIndex) stepIndex = nearest;
      applyX(targetXFor(stepIndex));
      refreshTriggers();
    }

    function onResize() {
      applyX(targetXFor(stepIndex));
    }

    // Pick up whichever stop the page already sits on, so a reload partway
    // through the section doesn't snap back to the beginning.
    const scrollable0 = section.offsetHeight - window.innerHeight;
    const raw0 =
      scrollable0 > 0
        ? clamp01((window.scrollY - section.offsetTop) / scrollable0)
        : 0;
    STEP_RAW.forEach((v, i) => {
      if (Math.abs(v - raw0) < Math.abs(STEP_RAW[stepIndex] - raw0)) stepIndex = i;
    });
    applyX(targetXFor(stepIndex));
    refreshTriggers();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (paintId !== null) cancelAnimationFrame(paintId);
      if (tweenId !== null) cancelAnimationFrame(tweenId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-experience relative bg-[#06252e]"
      style={{ height: `${TRACK_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={trackRef} className="h-full will-change-transform">
          <div
            className="origin-top-left"
            style={{
              width: TOTAL_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            <div className="flex h-full">
              <IntroPanel />
              <SavedPanel />
              <ProblemPanel />
              <SolutionPanel />
              <SnapkeepPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
