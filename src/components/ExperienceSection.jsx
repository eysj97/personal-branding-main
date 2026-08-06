import { useEffect, useRef, useState } from "react";

import SnapkeepSpread from "./detail/SnapkeepSpread";
import ProjectAppWindow from "./ProjectAppWindow";

import noteMark from "../assets/experience/note-mark.png";
import underlineWave from "../assets/experience/underline-wave.svg";
import boxBase from "../assets/experience/box-base.svg";
import boxLid from "../assets/experience/box-lid.svg";
import searchMark from "../assets/experience/search-mark.svg";
import tagMark from "../assets/experience/tag-mark.svg";
import savedScreen from "../assets/experience/saved-screen.png";
import savedFigma from "../assets/experience/saved-figma.png";
import savedSiteMenu from "../assets/experience/saved-site-menu.png";
import archiveCapture from "../assets/experience/archive-capture.png";
import snapkeepGrid from "../assets/experience/snapkeep-grid.png";

// The archive capture is a screen recording. Figma will only hand out still
// frames of a video fill, so the file has to be dropped in by hand — put it at
// src/assets/experience/archive-capture.mp4 (or .webm/.mov) and the panel picks
// it up on the next build with no code change. A glob rather than a plain
// import so that the build does not break while the file is not there yet;
// until then the panel shows the still frame Figma did give us.
const ARCHIVE_VIDEO =
  Object.values(
    import.meta.glob("../assets/experience/archive-capture.{mp4,webm,mov}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  )[0] ?? null;
// The recording is slow to watch at its own pace; the design's point is the
// scrolling, not the reading.
const ARCHIVE_SPEED = 2;
// The same monitor the project cards' hover cluster uses — one asset, one
// download, rather than a second copy of the identical frame.
import imacFrame from "../assets/project/mockup/imac.png";
import sfSidebar from "../assets/experience/safari/sidebar-leading.svg";
import sfChevronDown from "../assets/experience/safari/chevron-down.svg";
import sfChevronLeft from "../assets/experience/safari/chevron-left.svg";
import sfChevronRight from "../assets/experience/safari/chevron-right.svg";
import sfShield from "../assets/experience/safari/shield.svg";
import sfLock from "../assets/experience/safari/lock.svg";
import sfReload from "../assets/experience/safari/reload.svg";
import sfShare from "../assets/experience/safari/share.svg";
import sfPlus from "../assets/experience/safari/plus.svg";
import sfGrid from "../assets/experience/safari/grid.svg";

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
const SCREEN = 1920;
// `stops` defaults to how many screens wide the panel is, which is the fewest
// that can frame all of it. A panel whose content sits in more groups than
// that asks for more, so that each group gets a scroll of its own.
const PANELS = [
  { width: SCREEN },
  { width: SCREEN },
  { width: SCREEN },
  { width: 3031 },
  { width: 3966, stops: 4 },
  { width: SCREEN },
];
const TOTAL_WIDTH = PANELS.reduce((sum, panel) => sum + panel.width, 0);

// One wheel tick moves the strip one screenful, rather than the strip tracking
// the scrollbar continuously. These are only the *order* of the steps and a
// fallback position — where each one actually lands is measured off its own
// content at runtime, so that a stop frames what it is for rather than a fixed
// slice of the strip.
const STOPS = PANELS.reduce(
  (acc, panel) => {
    const count = panel.stops ?? Math.max(1, Math.ceil(panel.width / SCREEN));
    for (let k = 0; k < count; k += 1) {
      const offset = count === 1 ? 0 : ((panel.width - SCREEN) * k) / (count - 1);
      acc.stops.push(acc.at + offset);
    }
    acc.at += panel.width;
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
  archive: 1,
  saved: 2,
  problemA: 3,
  problemB: 4,
  solutionLead: 5,
  solutionTag: 6,
  solutionSearch: 7,
  solutionLayout: 8,
  snapkeep: 9,
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
      {/* No left padding: it would be inside the box being centred, which
          pushes the type half of it off to the right. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[24px] leading-[1.2] text-white">
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

/** Panel 2 — what the thing actually is, before the story of building it.
 *
 *  One centred column: the line that names it, the app itself, and the line
 *  that hands off to the rest of the section. */
function ArchivePanel() {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[710px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[50px]">
        <TypedText
          lines={["레퍼런스를 저장해 두었다가", "필요할 때 꺼내 쓰는 아카이브"]}
          className="text-center font-['Pretendard'] text-[32px] font-medium leading-none text-white whitespace-nowrap"
          stop={STOP.archive}
          delay={0}
        />

        {/* 710 x 444.35 is the design's 778:487 box resolved at this column's
            width; the capture is exported at exactly that size. */}
        <div
          className="h-[444.35px] w-[710px] overflow-hidden rounded-[8px]"
          data-anim="popup"
          data-stop={STOP.archive}
          data-delay={520}
          style={{ opacity: 0 }}
        >
          {ARCHIVE_VIDEO ? (
            <video
              src={ARCHIVE_VIDEO}
              // Nudged past the frame it is clipped to. The recording carries
              // a dark column of its own along the edge, and `cover` fits this
              // one by width, so that column lands just inside the box and
              // reads as a hairline drawn down the side of the video.
              className="h-[444.35px] w-[710px] max-w-none scale-[1.03] object-cover"
              autoPlay
              muted
              loop
              playsInline
              // Set on both: assigning it before the metadata is in gets
              // dropped, and some browsers reset it on each loop.
              ref={(el) => {
                if (el) el.playbackRate = ARCHIVE_SPEED;
              }}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = ARCHIVE_SPEED;
              }}
            />
          ) : (
            <img
              src={archiveCapture}
              alt=""
              className="h-[444.35px] w-[710px] max-w-none"
            />
          )}
        </div>

        <TypedText
          lines={["이걸 만들기까지의 이야기입니다"]}
          className="text-center font-['Pretendard'] text-[32px] font-medium leading-none text-white whitespace-nowrap"
          stop={STOP.archive}
          delay={1100}
        />
      </div>
    </div>
  );
}

// The size the design draws a browser window at. Its chrome is fixed px, so
// the only way a smaller copy keeps its proportions is to build it at this size
// and scale the whole thing — the same fixed-canvas trick the sections use.
const WINDOW = { width: 852, height: 494 };

/** The Safari chrome, at the design's own window size. */
function SafariWindow({ url, children }) {
  return (
    <div className="absolute inset-0 flex flex-col items-start overflow-hidden rounded-[10px] border-[0.5px] border-solid border-[#a5a5a5] bg-[#bfc2c8]">
      <div className="relative h-[52px] w-full shrink-0 overflow-hidden bg-[rgba(255,255,255,0.8)] backdrop-blur-[24px]">
        <div className="absolute left-[20px] top-[20px] flex items-start gap-[8px]">
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#ec6b5e]" />
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#f4bf4f]" />
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#61c453]" />
        </div>

        <img
          src={sfSidebar}
          alt=""
          className="absolute left-[110.91px] top-[20.41px] h-[14.383px] w-[18.422px] max-w-none"
        />
        <div className="absolute left-[139.21px] top-[19.09px] h-[18px] w-px bg-[rgba(0,0,0,0.1)]" />
        <img
          src={sfChevronDown}
          alt=""
          className="absolute left-[147.07px] top-[28.07px] h-[3px] w-[6px] max-w-none"
        />
        <img
          src={sfChevronLeft}
          alt=""
          className="absolute left-[163.63px] top-[18.58px] h-[13.563px] w-[7.641px] max-w-none"
        />
        <img
          src={sfChevronRight}
          alt=""
          className="absolute left-[199.61px] top-[18.58px] h-[13.563px] w-[7.641px] max-w-none"
        />

        <div className="absolute left-[27.69%] right-[29.84%] top-1/2 h-[28px] -translate-y-1/2">
          <img
            src={sfShield}
            alt=""
            className="absolute left-[0.76px] top-[6.68px] h-[15.781px] w-[12.984px] max-w-none"
          />
          <div className="absolute left-[29.5px] right-0 top-1/2 h-[28px] -translate-y-1/2 overflow-hidden rounded-[8px] border border-solid border-[rgba(0,0,0,0.25)]">
            <div className="absolute left-1/2 top-[5.5px] flex -translate-x-1/2 items-center justify-center gap-[8px]">
              <img
                src={sfLock}
                alt=""
                className="h-[11.432px] w-[7.828px] max-w-none shrink-0"
              />
              <p className="shrink-0 font-['Roboto'] text-[14px] leading-normal text-[#999] whitespace-nowrap">
                {url}
              </p>
            </div>
            <img
              src={sfReload}
              alt=""
              className="absolute right-[5.77px] top-[5.58px] h-[13.667px] w-[11.216px] max-w-none"
            />
          </div>
        </div>

        <img
          src={sfShare}
          alt=""
          className="absolute right-[93.57px] top-[15.97px] h-[17.633px] w-[13.867px] max-w-none"
        />
        <img
          src={sfPlus}
          alt=""
          className="absolute right-[57.55px] top-[18.91px] size-[12.891px] max-w-none"
        />
        <img
          src={sfGrid}
          alt=""
          className="absolute right-[19.81px] top-[18.18px] h-[14.383px] w-[14.383px] max-w-none"
        />
      </div>

      <div className="relative min-h-px w-full flex-1 overflow-hidden bg-[#f5f5f5]">
        {children}
        {/* The hairline the design puts under the toolbar. */}
        <div className="absolute inset-x-0 top-0 h-[0.5px] bg-[rgba(0,0,0,0.2)]" />
        <div className="absolute inset-x-0 top-[0.5px] h-[0.5px] bg-[rgba(0,0,0,0.1)]" />
      </div>
    </div>
  );
}

// Where the three windows sit inside the 738x622 monitor and how big they are.
// The monitor's glass is inset 4%/4.62%/3.89%/32.05%, and the stack is centred
// in it with room for two cascade steps.
const WINDOW_SCALE = 0.62;
const WINDOW_STEP = { x: 46, y: 34 };
const WINDOW_ORIGIN = { x: 58, y: 38 };
// One beat apart, after the monitor itself has finished opening.
const WINDOW_DELAY = [1000, 1340, 1680];

/** One browser window in the stack: a full-size window scaled down into place.
 *
 *  The scale lives on the inner element because `popup` drives the outer one's
 *  transform — the two would otherwise overwrite each other. */
function StackedWindow({ index, children }) {
  return (
    <div
      className="absolute overflow-hidden rounded-[10px]"
      style={{
        left: WINDOW_ORIGIN.x + WINDOW_STEP.x * index,
        top: WINDOW_ORIGIN.y + WINDOW_STEP.y * index,
        width: WINDOW.width * WINDOW_SCALE,
        height: WINDOW.height * WINDOW_SCALE,
        // Not in the design, which parks the three windows side by side rather
        // than stacked: without it a window landing on another one of the same
        // size and colour reads as a redraw rather than as a new window.
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
        opacity: 0,
      }}
      data-anim="popup"
      data-stop={STOP.saved}
      data-delay={WINDOW_DELAY[index]}
    >
      <div
        style={{
          width: WINDOW.width,
          height: WINDOW.height,
          transform: `scale(${WINDOW_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Panel 2 — the "everything saved, nothing findable" line.
 *
 *  The headline, and the evidence: an iMac with three windows opening onto it
 *  one after another — the board, the file, and the bookmark menu you get lost
 *  in. Three windows rather than one because the point of the line is the pile,
 *  not any single screen. */
function SavedPanel() {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Right-aligned to x=748, hence the translate rather than a left
          offset — the two lines differ in length. */}
      <TypedText
        lines={["Saved it,", "But can’t find it"]}
        className="absolute left-[748px] top-[472px] -translate-x-full text-right font-['Plus_Jakarta_Sans'] text-[50px] font-bold leading-none text-white"
        stop={STOP.saved}
        delay={0}
      />

      {/* The credit line, on the same right edge as the headline. 572 is the
          headline's own bottom — two 50px lines at leading-none — plus the
          section's usual 24. */}
      <TypedText
        lines={["SNAPKEEP · 개인 프로젝트 · 기획 · UX/UI 디자인 · 프로토타이핑"]}
        className="absolute left-[748px] top-[596px] -translate-x-full text-right font-['Pretendard'] text-[12px] leading-none tracking-[-0.24px] text-white"
        stop={STOP.saved}
        delay={620}
      />

      {/* `popup` rather than `pop`: a screen full of saved work should open
          like a window, not spring in from a third of its size. */}
      <div
        className="absolute left-[800px] top-[229px] h-[622px] w-[738px]"
        data-anim="popup"
        data-stop={STOP.saved}
        data-delay={400}
        style={{ opacity: 0 }}
      >
        <img
          src={imacFrame}
          alt=""
          className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
        />

        {/* Clipped to the glass, so a window that lands past the edge of the
            screen is cut off by the bezel the way a real one would be. The grey
            is the desktop the windows are opening onto — without it they float
            on the section's own dark teal and read as pasted-on rather than as
            windows on a screen. */}
        <div className="absolute inset-[4.62%_3.89%_32.05%_4%] overflow-hidden rounded-[10px] bg-[#d9d9d9]">
          <StackedWindow index={0}>
            <SafariWindow url="khazifire.com">
              {/* The board overflows its viewport in the design — the crop is
                  what makes it read as a page you have scrolled into, not a
                  thumbnail. */}
              <img
                src={savedScreen}
                alt=""
                className="absolute left-[-0.01%] top-[-13.74%] h-[118.18%] w-full max-w-none"
              />
            </SafariWindow>
          </StackedWindow>

          {/* The design draws this one as a bare screenshot — it is a desktop
              app, so it brings its own chrome and takes no Safari frame. */}
          <StackedWindow index={1}>
            <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-[#f5f5f5]">
              <img
                src={savedFigma}
                alt=""
                className="absolute left-[-0.17%] top-[-0.18%] h-[107.03%] w-[100.17%] max-w-none"
              />
            </div>
          </StackedWindow>

          {/* Two layers, as the design has it: the page, and the bookmark menus
              cascading over it. */}
          <StackedWindow index={2}>
            <SafariWindow url="khazifire.com">
              <img
                src={savedScreen}
                alt=""
                className="absolute left-[-0.01%] top-[-13.74%] h-[118.18%] w-full max-w-none"
              />
              <img
                src={savedSiteMenu}
                alt=""
                className="absolute left-0 top-[-4.1%] h-[108.4%] w-[100.78%] max-w-none"
              />
            </SafariWindow>
          </StackedWindow>
        </div>
      </div>
    </div>
  );
}

/** Panel 3 — the problem statement, the widest panel in the strip. */
function ProblemPanel() {
  return (
    <div className="relative h-full w-[3031px] shrink-0 overflow-hidden bg-[#06252e]">
      <p
        className={`absolute left-[calc(50%+50.5px)] top-[calc(50%-139px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none text-white whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.problemA}
        style={sweepStyle}
      >
        The problem wasn&rsquo;t saving
      </p>

      {/* Wipes open from its left edge, chasing the headline above it, with
          the note mark popping in beside them on the same beat. */}
      <div
        className="absolute left-[307px] top-[501px] h-[20px] w-[594px]"
        data-anim="wipe"
        data-stop={STOP.problemA}
        data-delay={450}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      >
        {/* The stroke overshoots its own box top and bottom, which is what the
            negative inset is — without it the wave's crests get clipped. */}
        <div className="absolute inset-[-7.5%_-0.13%_-7.5%_-0.15%]">
          <img
            src={underlineWave}
            alt=""
            className="block size-full max-w-none"
          />
        </div>
      </div>

      <img
        src={noteMark}
        alt=""
        className="absolute left-[1426px] top-[299px] size-[140px] max-w-none object-cover"
        data-anim="pop"
        data-stop={STOP.problemA}
        data-delay={450}
        data-float="12"
        style={{ opacity: 0 }}
      />

      <p
        className={`absolute left-[calc(50%+1012.5px)] top-[calc(50%+124px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none text-white whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.problemB}
        style={sweepStyle}
      >
        it was getting it back out
      </p>

      {/* Two pieces that make one open box: the base, and a lid tipped off it. */}
      <div
        className="absolute left-[2427px] top-[574px] h-[90px] w-[91.5px]"
        data-anim="pop"
        data-stop={STOP.problemB}
        data-delay={450}
        data-float="14"
        style={{ opacity: 0 }}
      >
        <img
          src={boxBase}
          alt=""
          className="absolute left-0 top-[29.5px] h-[60.5px] w-[91.5px] max-w-none"
        />
        <div className="absolute left-[13px] top-0 flex h-[41.924px] w-[50.636px] items-center justify-center">
          <div className="rotate-[-10.94deg]">
            <img
              src={boxLid}
              alt=""
              className="h-[34.001px] w-[45px] max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Panel 5 — the three answers, stepped down and across.
 *
 *  Each row is a mark and its line side by side rather than the two being
 *  parked at opposite ends of the panel, and the rows now stagger diagonally
 *  across three screens, so each one gets its own stop. */
const ROW_LEAD = 260; // ms from a row's line to its own mark
const rowLineClass =
  "shrink-0 text-right font-['Plus_Jakarta_Sans'] text-[70px] font-bold leading-none tracking-[-1.4px] text-white whitespace-nowrap";

function SolutionPanel() {
  return (
    <div className="relative h-full w-[3966px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Right-aligned to x=1166 — the design's calc(50% - 817px) on this
          panel's own width. */}
      <p
        className={`absolute left-[calc(50%-817px)] top-[calc(50%-74px)] -translate-x-full text-right font-['Pretendard'] text-[100px] font-bold leading-none text-white whitespace-nowrap ${SWEEP_BOX}`}
        data-anim="sweep"
        data-stop={STOP.solutionLead}
        // Held until the panel has finished sliding in. Armed at zero, the
        // whole sharpen plays out while the strip is still travelling, so by
        // the time anything is still to look at it has already happened.
        data-delay={TWEEN_MS}
        style={sweepStyleGhosted}
      >
        Produce <span className="text-[#0492bd]">3</span>solution
      </p>

      {/* Row 1 — AI tagging */}
      <div className="absolute left-[1426px] top-[225px] flex items-center gap-[40px]">
        <div
          className="flex h-[104.755px] w-[81.731px] shrink-0 items-center justify-center"
          data-anim="pop"
          data-stop={STOP.solutionTag}
          data-delay={ROW_LEAD}
          data-float="11"
          style={{ opacity: 0 }}
        >
          <div className="rotate-[2.14deg]">
            <img
              src={tagMark}
              alt=""
              className="h-[101.911px] w-[77.976px] max-w-none"
            />
          </div>
        </div>
        <p
          className={`${rowLineClass} ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.solutionTag}
          data-delay={0}
          style={sweepStyle}
        >
          AI tagging instead of folders
        </p>
      </div>

      {/* Row 2 — search in design language */}
      <div className="absolute left-[2237px] top-[466px] flex w-[957px] items-center gap-[40px]">
        {/* The magnifier sits in a rotated box, and its own stroke overshoots
            that box — the negative inset is what keeps the glass from being
            clipped flat. */}
        <div
          className="flex h-[71.6px] w-[66.936px] shrink-0 items-center justify-center"
          data-anim="pop"
          data-stop={STOP.solutionSearch}
          data-delay={ROW_LEAD}
          data-float="11"
          style={{ opacity: 0 }}
        >
          <div className="-scale-y-100 rotate-[-174.14deg] skew-x-[3.86deg]">
            <div className="relative size-[65px]">
              <div className="absolute inset-[-7.69%]">
                <img
                  src={searchMark}
                  alt=""
                  className="block size-full max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
        <p
          className={`${rowLineClass} ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.solutionSearch}
          data-delay={0}
          style={sweepStyle}
        >
          Search in design language
        </p>
      </div>

      {/* Row 3 — layout structure. Drawn, not exported: the design builds this
          from four plain rectangles, so there is no asset to render. */}
      <div className="absolute left-[3022px] top-[719px] flex items-center gap-[40px]">
        <div
          className="relative h-[88.361px] w-[94px] shrink-0 rounded-[10px] bg-white"
          data-anim="pop"
          data-stop={STOP.solutionLayout}
          data-delay={ROW_LEAD}
          data-float="11"
          style={{ opacity: 0 }}
        >
          <div className="absolute left-[5.55px] top-[3.17px] h-[81.597px] w-[22.974px] rounded-[5px] bg-[#0492bd]" />
          <div className="absolute left-[33.27px] top-[4.75px] h-[19.013px] w-[56.247px] rounded-[5px] bg-[#0492bd]" />
          <div className="absolute left-[33.27px] top-[27.73px] h-[54.662px] w-[56.247px] rounded-[5px] bg-[#0492bd]" />
        </div>
        <p
          className={`${rowLineClass} ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.solutionLayout}
          data-delay={0}
          style={sweepStyle}
        >
          Layout structure
        </p>
      </div>
    </div>
  );
}

/** Panel 6 — the payoff: the invitation, and the app behind it.
 *
 *  The app used to be embedded live in the strip. It is a picture now, and the
 *  real thing opens on click — the strip is a read-through, and an app you can
 *  type into sitting inside it competes with that. Opening it deliberately
 *  also gives it the whole screen instead of a panel's worth. */
// 710 x 443.4 is the design's 2307:1441 box at this column's width. The inner
// offsets are the design's own crop of the capture.
const GRID_BOX = { width: 710, height: 443.4 };

function SnapkeepPanel({ onOpen }) {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      <div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[710px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[50px]">
        <TypedText
          lines={["저장만 하던 레퍼런스, 이번엔 꺼내보세요."]}
          className="text-center font-['Pretendard'] text-[32px] font-medium leading-none text-white whitespace-nowrap"
          stop={STOP.snapkeep}
          delay={0}
        />

        {/* `data-interactive` so the section's wheel handler leaves gestures
            that start here alone — otherwise a click-drag on the app would be
            read as a step. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label="Snapkeep 열기"
          data-interactive
          className="group relative block cursor-pointer overflow-hidden rounded-[8px]"
          style={{ width: GRID_BOX.width, height: GRID_BOX.height, opacity: 0 }}
          data-anim="popup"
          data-stop={STOP.snapkeep}
          data-delay={520}
        >
          <img
            src={snapkeepGrid}
            alt=""
            className="absolute left-[-1.69%] top-[-2.71%] h-[105.9%] w-[104.12%] max-w-none transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {/* Nothing in the design says this is clickable, so the panel says
              it — on hover only, so the still frame stays the design's. */}
          <span className="absolute inset-0 flex items-end justify-center bg-[rgba(6,37,46,0)] pb-[22px] opacity-0 transition-opacity duration-300 group-hover:bg-[rgba(6,37,46,0.35)] group-hover:opacity-100">
            <span className="rounded-full bg-white px-[18px] py-[8px] font-['Pretendard'] text-[14px] font-semibold text-[#06252e]">
              직접 써보기
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

export default function ExperienceSection() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [scale, setScale] = useState(1);
  // Snapkeep opens over the whole page rather than inside the strip, so it
  // lives here and not in the panel that launches it.
  const [appOpen, setAppOpen] = useState(false);

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
      duration:
        Number(el.dataset.duration) || DURATIONS[el.dataset.anim] || 800,
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
      return { stripScale, viewportWidth };
    }

    // Where each stop should aim: the middle of whatever belongs to it. Held in
    // design px, so it is measured once and survives any resize.
    //
    // Measured rather than declared, because a stop's position is a fact about
    // its content, not a slice of the strip — and the strip is fitted to the
    // viewport's *height*, so a panel only happens to fill the width on a 16:9
    // screen. Anywhere else, parking a stop at a fixed offset leaves whatever
    // it was meant to frame sitting off to one side.
    let stopCentres = [];
    function measureStops() {
      const trackLeft = trackRef.current.getBoundingClientRect().left;
      const { stripScale } = metrics();
      const bounds = STOPS.map(() => null);
      for (const item of animated) {
        const rect = item.el.getBoundingClientRect();
        const left = (rect.left - trackLeft) / stripScale;
        const right = (rect.right - trackLeft) / stripScale;
        const seen = bounds[item.stop];
        bounds[item.stop] = seen
          ? { left: Math.min(seen.left, left), right: Math.max(seen.right, right) }
          : { left, right };
      }
      stopCentres = bounds.map((box, i) =>
        box ? (box.left + box.right) / 2 : STOPS[i] + SCREEN / 2,
      );
    }

    function targetXFor(index) {
      const { stripScale, viewportWidth } = metrics();
      const centre = stopCentres[index];
      if (centre == null) return STOPS[index] * stripScale;
      // Deliberately not clamped to the strip's own ends. The strip is fitted
      // to the viewport's *height*, so on a wide screen a 1920-wide panel comes
      // out narrower than the viewport — and clamping to 0 then pins it to the
      // left edge instead of centring it, which is exactly the case this is
      // supposed to handle. Running off either end is harmless: the section
      // behind the strip is the same colour as the panels, so what shows there
      // is indistinguishable from the panel itself.
      return centre * stripScale - viewportWidth / 2;
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
        applyAnim(
          item.el,
          item.kind,
          item.kind === "type" ? t : smoothstep(t),
          typedCounts,
        );
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
      if (
        e.target instanceof Element &&
        e.target.closest("[data-interactive]")
      ) {
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
      if (
        e.target instanceof Element &&
        e.target.closest("[data-interactive]")
      ) {
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
      if (Math.abs(v - raw0) < Math.abs(STEP_RAW[stepIndex] - raw0))
        stepIndex = i;
    });
    // Before anything is armed, so nothing has an entrance transform on it yet
    // and every box is its resting one.
    measureStops();
    applyX(targetXFor(stepIndex));
    refreshTriggers();
    // Headlines are the widest things here, and a webfont arriving after this
    // changes how wide they are — so the centres are taken again once the
    // fonts are actually in.
    document.fonts?.ready.then(() => {
      measureStops();
      if (!busy) applyX(targetXFor(stepIndex));
    });

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
              <ArchivePanel />
              <SavedPanel />
              <ProblemPanel />
              <SolutionPanel />
              <SnapkeepPanel onOpen={() => setAppOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Outside the strip and its scale, so the app gets the whole screen —
          the same window the Snapkeep project card opens. */}
      {appOpen && (
        <ProjectAppWindow
          card={{ detail: SnapkeepSpread }}
          onClose={() => setAppOpen(false)}
        />
      )}
    </section>
  );
}
