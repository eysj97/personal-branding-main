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

// The section's own scroll range is what the horizontal travel is spent
// against: roughly one viewport of vertical scroll per viewport of strip, plus
// one to hold the sticky stage in place while the last panel finishes.
const TRAVEL_VH = Math.round((TOTAL_WIDTH / PANELS[0]) * 100);
// A beat at the top where the strip does not move yet, so the first panel
// lands, holds still long enough to be read, and plays its own entrance before
// the horizontal travel takes over.
const HOLD_VH = 50;
const TRACK_VH = TRAVEL_VH + HOLD_VH + 100;
const HOLD_FRACTION = HOLD_VH / (TRACK_VH - 100);

// ---------------------------------------------------------------------------
// Entrance animations.
//
// Every animated element carries `data-anim` (which effect) and `data-x` (its
// own left edge along the strip, in design px). Scrolling only decides *when*
// an element is considered on screen; once it is, the effect runs on its own
// clock and finishes at its own pace. Tying playback to scroll position
// instead makes every animation stall the moment the reader stops moving, and
// run at whatever speed they happen to be scrolling at.
//
// `data-delay` (ms) staggers elements that arrive together — the first panel is
// already on screen when the section pins, so its elements all trigger at once
// and lean on the delay entirely.
// ---------------------------------------------------------------------------

// How far past the right edge an element must be before it counts as on
// screen, in viewport widths — a little inside, so it isn't animating while
// still clipped by the edge.
const ENTER_MARGIN = 0.85;
// How far back out an element has to travel before it is rearmed to play
// again. Without the gap, an element parked exactly on its trigger would
// restart on every jitter of the scroll wheel.
const RESET_MARGIN = 0.15;

const DURATIONS = {
  sweep: 1000,
  wipe: 800,
  popup: 520,
  pop: 700,
  tint: 500,
  type: 1100,
};

// Left-to-right sharpen for headlines. The mask is three times the text's own
// width — solid on the left, near-clear on the right — so sliding it from
// `100%` to `0%` walks the boundary across the line. The clear end is 0.2, not
// 0: the line is always faintly there and the sweep lifts it to full, which
// reads as coming into focus rather than being written in from nothing.
const SWEEP_MASK =
  "linear-gradient(90deg, #000 0%, #000 45%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.2) 100%)";
// A mask clips to the element's own box, and `leading-none` makes that box
// exactly the font size — so descenders (g, p, y) hang outside it and get
// sliced off flat. The padding grows the box the mask is measured against;
// the matching negative margin puts the text back where the design has it.
const SWEEP_BOX = "py-[0.22em] -my-[0.22em]";
const sweepStyle = {
  maskImage: SWEEP_MASK,
  WebkitMaskImage: SWEEP_MASK,
  maskSize: "300% 100%",
  WebkitMaskSize: "300% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "100% 0",
  WebkitMaskPosition: "100% 0",
};

/** Text that types itself out. Every character is rendered up front in its own
    span and only its opacity changes, so the line is laid out in full from the
    start and never reflows as it "types" — the same approach CareerSection's
    paragraphs use. The spans are hidden from assistive tech and the whole
    string is put back as a label, so a screen reader reads one sentence. */
function TypedText({ lines, className, x, delay = 0 }) {
  return (
    <p
      className={className}
      aria-label={lines.join(" ")}
      data-anim="type"
      data-x={x}
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
function Popup({ x, delay = 0, left, top, width, height, children }) {
  return (
    <div
      className="absolute"
      data-anim="popup"
      data-x={x}
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
          data-x={0}
          data-delay={0}
          style={sweepStyle}
        >
          Experience It
        </p>
        <TypedText
          lines={["말보다 먼저, 만든 걸 보여드릴게요."]}
          className="font-['Pretendard'] text-[22px] tracking-[-0.44px]"
          x={0}
          delay={700}
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
function SavedPanel({ start }) {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <Popup x={start + 189} left={189} top={492} width={800} height={495}>
        <div className="absolute inset-0 overflow-hidden">
          <img src={savedBoard} alt="" className="absolute left-[-0.17%] top-[-0.17%] h-[100.33%] w-[100.17%] max-w-none" />
        </div>
      </Popup>

      <Popup x={start + 754} left={754} top={113} width={1006.6} height={538.3}>
        <SafariWindow />
      </Popup>

      {/* The phone's two layers share one box, so the frame and the screen
          inside it pop as a single object. Their offsets are the design's own,
          rebased onto the frame's origin. */}
      <Popup x={start + 1386} left={1386} top={434} width={309} height={605.336}>
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
        x={start + 1386}
        delay={520}
      />
    </div>
  );
}

/** Panel 3 — the problem statement, the widest panel in the strip. Its pieces
    are triggered by their own left edges, which happens to be exactly the
    reading order: headline, the squiggle under it, then the marks. */
function ProblemPanel({ start }) {
  return (
    <div className="relative h-full w-[3031px] shrink-0 overflow-hidden bg-[#06252e]">
      <p
        className={`absolute left-[calc(50%+50.5px)] top-[calc(50%-139px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none text-[#0492bd] whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-x={start + 166}
        style={sweepStyle}
      >
        The problem wasn&rsquo;t saving
      </p>

      {/* Wipes open from its left edge, chasing the headline above it. */}
      <div
        className="absolute left-[308px] top-[511px] flex h-[29px] w-[582px] items-center justify-center"
        data-anim="wipe"
        data-x={start + 308}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      >
        <img src={underline} alt="" className="h-[29px] w-[582px] max-w-none -scale-y-100" />
      </div>

      <div
        className="absolute left-[1238px] top-[203px] flex h-[197.986px] w-[198.12px] items-center justify-center"
        data-anim="pop"
        data-x={start + 1238}
        style={{ opacity: 0 }}
      >
        <div className="rotate-[11.95deg]">
          <img src={scribbleArrow} alt="" className="h-[167.001px] w-[167.173px] max-w-none" />
        </div>
      </div>

      <p
        className={`absolute left-[calc(50%+1052.5px)] top-[calc(50%+121px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-x={start + 1468}
        style={sweepStyle}
      >
        <span className="text-[#0492bd]">it was </span>
        {/* Keyed to the box's own x rather than this line's, with a delay that
            lands the colour change while that pop is playing — the emphasis is
            supposed to read as a reaction to it. */}
        <span
          data-anim="tint"
          data-x={start + 2592}
          data-delay={650}
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
        data-x={start + 2592}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

/** A stand-in reference card — the repeated block in the "AI tagging" cluster.
    Drawn rather than exported because the design builds it from plain
    rectangles, so there is no asset to render. */
function TagCard({ left, top, x, delay }) {
  return (
    <div
      className="absolute h-[82px] w-[176px] rounded-[8px] bg-[rgba(4,146,189,0.2)]"
      style={{ left, top, opacity: 0 }}
      data-anim="pop"
      data-x={x}
      data-delay={delay}
    >
      <div className="absolute left-[7px] top-[7px] size-[66px] rounded-[8px] bg-[rgba(4,146,189,0.3)]" />
      <div className="absolute left-[87px] top-[13px] h-[11px] w-[42px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
      <div className="absolute left-[87px] top-[34px] h-[11px] w-[80px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
      <div className="absolute left-[87px] top-[55px] h-[11px] w-[80px] rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
    </div>
  );
}

function FilterChip({ label, left, top, x, delay }) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-[8px] bg-[rgba(4,146,189,0.4)] px-[10px] py-[5px]"
      style={{ left, top, opacity: 0 }}
      data-anim="pop"
      data-x={x}
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
const ROW_TEXT_X = [396, 804, 1498];
const POP_STEP = 130; // ms between graphics inside one row
const headlineClass =
  "absolute -translate-x-full text-right font-['Plus_Jakarta_Sans'] text-[70px] font-bold leading-none tracking-[-1.4px] text-white whitespace-nowrap";

function SolutionPanel({ start }) {
  const row = (i) => start + ROW_TEXT_X[i];
  return (
    <div className="relative h-full w-[2545px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Row 1 — AI tagging */}
      <p
        className={`${headlineClass} left-[1386px] top-[275px] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-x={row(0)}
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
        data-x={row(0)}
        data-delay={320}
        style={{ opacity: 0 }}
      />
      <img
        src={folderB}
        alt=""
        className="absolute left-[11.47%] right-[83.04%] top-[299.66px] h-[96.671px] max-w-none"
        data-anim="pop"
        data-x={row(0)}
        data-delay={320 + POP_STEP}
        style={{ opacity: 0 }}
      />
      <img
        src={folderA}
        alt=""
        className="absolute left-[15.83%] right-[78.38%] top-[154px] h-[95.861px] max-w-none"
        data-anim="pop"
        data-x={row(0)}
        data-delay={320 + POP_STEP * 2}
        style={{ opacity: 0 }}
      />
      <img
        src={tagCluster}
        alt=""
        className="absolute left-[1317px] top-[143px] h-[129.291px] w-[161.633px] max-w-none"
        data-anim="pop"
        data-x={row(0)}
        data-delay={320 + POP_STEP * 3}
        style={{ opacity: 0 }}
      />

      {/* Row 2 — search in design language */}
      <p
        className={`${headlineClass} left-[1654px] top-[calc(50%-35px)] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-x={row(1)}
        style={sweepStyle}
      >
        Search in design language
      </p>
      <FilterChip label="Screen" left={702} top={465} x={row(1)} delay={320} />
      <FilterChip label="Platform" left={641} top={523} x={row(1)} delay={320 + POP_STEP} />
      <FilterChip label="Mood" left={1633} top={465} x={row(1)} delay={320 + POP_STEP * 2} />
      <FilterChip label="Service" left={1686} top={529} x={row(1)} delay={320 + POP_STEP * 3} />
      <img
        src={cube}
        alt=""
        className="absolute inset-[20.74%_40.75%_72.31%_56.31%] max-w-none"
        data-anim="pop"
        data-x={row(1)}
        data-delay={320 + POP_STEP * 4}
        style={{ opacity: 0 }}
      />

      {/* Row 3 — layout structure */}
      <p
        className={`${headlineClass} left-[2043px] top-[735px] ${SWEEP_BOX}`}
        data-anim="sweep"
        data-x={row(2)}
        style={sweepStyle}
      >
        Layout structure
      </p>
      <TagCard left={1245} top={696} x={row(2)} delay={320} />
      <TagCard left={1313} top={805} x={row(2)} delay={320 + POP_STEP} />

      {/* Wireframe stand-in for the layout-structure idea: a sidebar rotated
          onto its side plus a header and body block. */}
      <div
        className="absolute left-[2072px] top-[655px] flex h-[150px] w-[37px] items-center justify-center"
        data-anim="pop"
        data-x={row(2)}
        data-delay={320 + POP_STEP * 2}
        style={{ opacity: 0 }}
      >
        <div className="h-[37px] w-[150px] -rotate-90 rounded-[8px] bg-[rgba(4,146,189,0.6)]" />
      </div>
      <div
        className="absolute left-[2121px] top-[655px] h-[37px] w-[143px] rounded-[8px] bg-[rgba(4,146,189,0.4)]"
        data-anim="pop"
        data-x={row(2)}
        data-delay={320 + POP_STEP * 3}
        style={{ opacity: 0 }}
      />
      <div
        className="absolute left-[2121px] top-[701px] h-[102px] w-[143px] rounded-[8px] bg-[rgba(4,146,189,0.2)]"
        data-anim="pop"
        data-x={row(2)}
        data-delay={320 + POP_STEP * 4}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

/** Panel 5 — the payoff: the line that states the idea, then Snapkeep itself.
 *
 *  The app is shown, not driven. It sits inside a strip that is being
 *  translated under a sticky stage, so leaving it interactive would put click
 *  targets on a moving surface and swallow scrolls meant for the page — the
 *  working version is the one the PROJECT section opens. */
const SNAPKEEP_SCALE = 0.85;
const SNAPKEEP_WIDTH = 1440;
const SNAPKEEP_HEIGHT = 900;

function SnapkeepPanel({ start }) {
  const width = SNAPKEEP_WIDTH * SNAPKEEP_SCALE;
  const height = SNAPKEEP_HEIGHT * SNAPKEEP_SCALE;
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <TypedText
        lines={["스크린샷을 올려보세요. AI가 태깅하고, 내 언어로 검색됩니다"]}
        className="absolute left-1/2 top-[120px] -translate-x-1/2 text-center font-['Pretendard'] text-[44px] font-medium leading-[1.3] tracking-[-0.88px] text-white"
        x={start}
        delay={200}
      />

      <Popup
        x={start}
        delay={900}
        left={(1920 - width) / 2}
        top={250}
        width={width}
        height={height}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[24px] shadow-[0px_24px_60px_0px_rgba(0,0,0,0.45)]">
          <div
            className="pointer-events-none origin-top-left"
            style={{ width: SNAPKEEP_WIDTH, transform: `scale(${SNAPKEEP_SCALE})` }}
            aria-hidden="true"
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
      x: Number(el.dataset.x) || 0,
      delay: Number(el.dataset.delay) || 0,
      duration: DURATIONS[el.dataset.anim] ?? 800,
      // Wall-clock time this one is due to begin; null until it is on screen.
      startAt: null,
      done: false,
    }));
    const typedCounts = new Map();
    let scrollTicking = false;
    let paintId = null;

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

    // Scrolling only decides *when* something is on screen.
    function checkTriggers() {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

      // Recompute the scale here rather than reading the state value, so a
      // resize between renders can't leave the two disagreeing.
      const stripScale = window.innerHeight / DESIGN_HEIGHT;
      const viewportWidth = window.innerWidth;
      const maxX = Math.max(0, TOTAL_WIDTH * stripScale - viewportWidth);
      // The hold: the strip stays at 0 through the first stretch of the
      // section's scroll, so the opening panel arrives, sits still, and plays
      // its entrance before anything starts moving sideways.
      const travelled = clamp01((progress - HOLD_FRACTION) / (1 - HOLD_FRACTION));
      const x = travelled * maxX;
      trackRef.current.style.transform = `translate3d(${-x}px, 0, 0)`;

      // Scrolled back above the section entirely: rearm the whole sequence, so
      // coming down into it again replays it from the top. The first panel's
      // trigger clamps to 0 and can never go off to the right, so this is the
      // only thing that rearms it.
      const beforeSection = rect.top > 0;

      let started = false;
      for (const item of animated) {
        // Clamped at 0 so the first panel — already on screen when the section
        // pins — starts with the section rather than never triggering.
        const trigger = Math.max(
          0,
          item.x * stripScale - viewportWidth * ENTER_MARGIN,
        );
        const offScreen =
          beforeSection || x < trigger - viewportWidth * RESET_MARGIN;

        if (item.startAt === null) {
          if (!offScreen) {
            item.startAt = performance.now() + item.delay;
            started = true;
          }
        } else if (offScreen) {
          item.startAt = null;
          item.done = false;
          applyAnim(item.el, item.kind, 0, typedCounts);
        }
      }
      if (started && paintId === null) paintId = requestAnimationFrame(paint);

      scrollTicking = false;
    }

    function onScroll() {
      if (!scrollTicking) {
        requestAnimationFrame(checkTriggers);
        scrollTicking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    checkTriggers();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (paintId !== null) cancelAnimationFrame(paintId);
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
              <SavedPanel start={PANELS[0]} />
              <ProblemPanel start={PANELS[0] + PANELS[1]} />
              <SolutionPanel start={PANELS[0] + PANELS[1] + PANELS[2]} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
