import { useEffect, useLayoutEffect, useRef, useState } from "react";

import SnapkeepSpread from "./detail/SnapkeepSpread";
import ProjectAppWindow from "./ProjectAppWindow";
import { driveWithScroll } from "../lib/scrollDriver";

import noteMark from "../assets/experience/note-mark.avif";
import boxBase from "../assets/experience/box-base.svg";
import boxLid from "../assets/experience/box-lid.svg";
import savedScreen from "../assets/experience/saved-screen.avif";
import savedFigma from "../assets/experience/saved-figma.avif";
import savedSiteMenu from "../assets/experience/saved-site-menu.avif";
import archiveCapture from "../assets/experience/archive-capture.avif";
import snapkeepGrid from "../assets/experience/snapkeep-grid.avif";

// The drawn-on layer: lime and pink marks scribbled over the panels, and the
// blue swashes that run under the headlines. All of it is exported straight
// from the design — the composite ones (the sparkle clusters, the long arrow)
// as a single SVG of the whole group rather than as the loose vector layers
// they are built from, since nothing here needs to move independently.
//
// The colour lives inside each file, so a mark that changes colour in the
// design is a new export, not a class here. Where one drawing appears in more
// than one colour there is a file per colour (see the folder icons).
import savedArrowTop from "../assets/experience/doodle/saved-arrow-top.svg";
import savedArrowLow from "../assets/experience/doodle/saved-arrow-low.svg";
// Inlined as source rather than pointed at as files, because an <img> is an
// opaque box — nothing inside one can be animated. Same `?raw` trick the hero
// uses for its eyes.
//
// The star cluster is inlined for its twinkle: each star in it is a group the
// loop has to reach to make it flash. It is *not* drawn on — it pops in like
// the rest of the artwork.
import archiveSparkles from "../assets/experience/doodle/archive-sparkles.svg?raw";
// These three are the marks that are drawn stroke by stroke.
import problemSquiggle from "../assets/experience/doodle/problem-squiggle.svg?raw";
import problemArrow from "../assets/experience/doodle/problem-arrow.svg?raw";
import solutionSparkle from "../assets/experience/doodle/solution-sparkle.svg?raw";
// The three drawn swashes that used to run under the solution headlines, and
// the tick beside the third row, are gone from the design — the swashes are
// plain blue rectangles now (see Swash) and the tick was dropped. Their files
// are left in place unimported, since nothing else is drawn like them and
// getting them back is a one-line import rather than another export.
import tagSparkle from "../assets/experience/doodle/tag-sparkle.svg";
import tagMark from "../assets/experience/doodle/tag-mark.svg";
import searchLoupe from "../assets/experience/doodle/search-loupe.svg";
import searchPin from "../assets/experience/doodle/search-pin.svg";
import searchBubble from "../assets/experience/doodle/search-bubble.svg";
// One glyph at four sizes in the design. The drawing is identical every time —
// same path, same 1.2016 aspect — so the size stays on the box and is not what
// these files are for: the cluster is three colours now, and a flat-filled SVG
// carries its colour inside itself. One file per colour, each straight from the
// design; the sizes are still CSS.
import folderIconLime from "../assets/experience/doodle/folder.svg";
import folderIconPink from "../assets/experience/doodle/folder-pink.svg";
import folderIconBlue from "../assets/experience/doodle/folder-blue.svg";

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
import imacFrame from "../assets/project/mockup/imac.avif";
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
  { width: 4477, stops: 4 },
  { width: SCREEN },
];
const TOTAL_WIDTH = PANELS.reduce((sum, panel) => sum + panel.width, 0);

// The stops the strip travels between as the page is scrolled. These are only
// the *order* of them and a fallback position — where each one actually lands
// is measured off its own content at runtime, so that a stop frames what it is
// for rather than a fixed slice of the strip.
const STOPS = PANELS.reduce(
  (acc, panel) => {
    const count = panel.stops ?? Math.max(1, Math.ceil(panel.width / SCREEN));
    for (let k = 0; k < count; k += 1) {
      const offset =
        count === 1 ? 0 : ((panel.width - SCREEN) * k) / (count - 1);
      acc.stops.push(acc.at + offset);
    }
    acc.at += panel.width;
    return acc;
  },
  { stops: [], at: 0 },
).stops;

// How much page scroll each leg of the strip's journey costs. The travel is
// read off the scroll position now rather than played back per wheel tick, so
// this is the section's actual pace: one screen of scrolling carries you a
// little past one stop to the next.
//
// Plus the one screen the sticky stage itself occupies, which is scrolled
// through without moving the strip at all.
const STOP_VH = 80;
const TRACK_VH = 100 + (STOPS.length - 1) * STOP_VH;

// A hold for the handful of sequences that must not start until their panel is
// actually settled under them. Sequences are armed a little before the strip
// finishes arriving (see TRIGGER_LEAD), which is right for most of them — the
// entrance and the last of the travel overlap, and the panel is alive by the
// time it is centred. It is wrong for a headline sweep, which is the first
// thing the eye goes to and reads as having already happened if it plays while
// the panel is still sliding.
const SETTLE_DELAY = 520;

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
// pace — playback is deliberately *not* tied to scroll position, unlike the
// strip's travel. A half-drawn line held at whatever fraction of a stroke the
// reader stopped on is not a drawing, it is a broken one; and a typewriter
// that runs backwards when you scroll up is a gimmick. The travel is scrubbed,
// what lands on the panels is played.
//
// Keying off the stop rather than the element's own position is what makes the
// sequencing readable: triggering on x meant everything in a panel fired
// within a few frames of everything else no matter how far apart the pieces
// sat.
// ---------------------------------------------------------------------------

// Text is quick — it is read, not watched. The artwork is the opposite: the
// pop is the thing you are meant to notice, so it gets room to be seen.
const DURATIONS = {
  sweep: 600,
  wipe: 460,
  popup: 560,
  pop: 640,
  type: 650,
  // Longer than the rest on purpose: this one is meant to be watched being
  // made, and at the others' pace the stroke is over before you find it. These
  // are big marks — the arrow crosses 440px — so even a second reads as the
  // line appearing rather than as a pen travelling along it.
  draw: 1500,
};

/** A line drawing that draws itself. The SVG source is inlined so its paths are
 *  real elements the animation can reach, and each one is measured up front so
 *  the frame loop only has to move the dash offset.
 *
 *  Measured with getTotalLength rather than normalised with `pathLength="1"`,
 *  which is what this used to do. A dash pattern of 1 only hides the line if
 *  the browser has actually renormalised the path to a length of 1 — and where
 *  it has not, `stroke-dasharray: 1` on a 400-unit path is a 1-unit dash every
 *  1 unit, which with a 5-wide round cap overlaps into what looks exactly like
 *  a solid, finished line. The mark then sits there fully drawn and the offset
 *  moving from 1 to 0 changes nothing you can see. Real lengths in real user
 *  units cannot fail that way.
 *
 *  Kept out of the float set — a mark still being drawn must not also be
 *  drifting, or the line lands somewhere other than where it started.
 *
 *  `relay` draws the paths one after another in the order the file lists them,
 *  rather than all on the same clock. For a mark whose strokes are genuinely
 *  sequential — an arrow, where the head is added once the shaft is there —
 *  see the `draw` case in applyAnim. */
function DrawnMark({ raw, className, stop, delay, relay, duration }) {
  const ref = useRef(null);

  // Layout, not plain effect: nothing here sets opacity, so the only thing
  // hiding the mark before its turn is the dash offset. Set after a paint,
  // the finished drawing flashes up on screen first.
  useLayoutEffect(() => {
    for (const path of ref.current?.querySelectorAll("path") ?? []) {
      hidePath(path);
    }
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // The exported file carries its own width/height; this makes the svg
      // fill the box the design gives it instead.
      className={`pointer-events-none absolute [&>svg]:size-full ${className}`}
      data-anim="draw"
      data-stop={stop}
      data-delay={delay}
      data-relay={relay ? "" : undefined}
      data-duration={duration}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}

// The blink each star settles into once its mark has been drawn.
//
// This used to be the other way round: the star sat at 0.72 and briefly
// brightened to 1. A quarter of a step of extra brightness on a line drawing is
// not something you notice — it read as sitting still. It goes out and comes
// back now, which is a thing that plainly happens.
//
// How dim it gets at the bottom of a blink. 0 is all the way out.
const TWINKLE_DIM = 0;
// How much of each cycle the blink takes. The rest is the star sitting lit —
// which is what keeps this a blink rather than a pulse, and what stops the
// panel looking like it is flickering.
const TWINKLE_BLINK = 0.34;
// How far a star draws in on itself as it goes. Small, and inward rather than
// out: it reads as the star closing up rather than as the drawing resizing.
const TWINKLE_SWELL = 0.12;

/** A line drawing that pops in like the rest of the artwork, but is inlined all
 *  the same so the pieces inside it can be reached — the star cluster needs
 *  that for its twinkle. Nothing here is drawn on: an <img> would do for the
 *  entrance, but not for anything that has to keep moving afterwards.
 *
 *  Unlike DrawnMark this stays in the float set, so it drifts once it lands. */
function InlineMark({ raw, className, stop, delay, float }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute [&>svg]:size-full ${className}`}
      data-anim="pop"
      data-stop={stop}
      data-delay={delay}
      data-float={float}
      style={{ opacity: 0 }}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}

// A highlighter is drawn over writing that is already there. So every marker
// stroke — the bar behind "Needed", the block through "The problem wasn't
// saving", the three swashes under the solution lines — starts only once its
// own headline has finished being written in, rather than racing it. Derived
// from the sweep's own length so retiming the text retimes the marker with it.
const HIGHLIGHT_AFTER = DURATIONS.sweep + 60;

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

/** A path's own length in user units, measured once and remembered on the
 *  element. Every frame of a draw needs it, and measuring a path is not free. */
function pathLength(path) {
  const cached = Number(path.dataset.length);
  if (cached > 0) return cached;
  const length = path.getTotalLength();
  path.dataset.length = String(length);
  return length;
}

/** Wind a path back to before it was drawn. */
function hidePath(path) {
  const length = pathLength(path);
  path.style.strokeDasharray = `${length} ${length}`;
  path.style.strokeDashoffset = String(length);
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
    case "draw": {
      // Drawn on, the way a pen would. One dash as long as the whole line
      // followed by a gap just as long, slid along by the offset: at a full
      // length the dash sits entirely past the end of the path and nothing
      // shows, and as the offset comes down to zero the line is uncovered from
      // its start.
      const paths = el.querySelectorAll("path");

      // `data-relay` — one path after another instead of all at once.
      //
      // The default below is all together, because most of these marks are a
      // single gesture: a loop, a burst. Their strokes are one movement of the
      // hand that happens to be exported as several paths, and relaying those
      // reads as separate marks being placed rather than as one drawing.
      //
      // An arrow is the exception, and it is the one case where the default is
      // actually wrong: the shaft and the head are two strokes, in that order,
      // and nobody draws an arrowhead at the same time as the line it caps.
      // Drawn together the head is already sitting there while the line is
      // still crawling towards it, which reads as the arrow fading up rather
      // than being drawn at all.
      //
      // The share of the clock each path gets is its share of the total
      // length, not an equal slice — that is one nib moving at one speed
      // across the whole mark, so the short head takes the short time it
      // should rather than as long as the long shaft.
      if (el.dataset.relay !== undefined) {
        let total = 0;
        for (const path of paths) total += pathLength(path);
        // How far the nib has travelled along the whole mark, then spent one
        // path at a time.
        let travelled = t * total;
        for (const path of paths) {
          const length = pathLength(path);
          path.style.strokeDasharray = `${length} ${length}`;
          path.style.strokeDashoffset = String(
            length * (1 - clamp01(travelled / length)),
          );
          travelled -= length;
        }
        break;
      }

      for (const path of paths) {
        const length = pathLength(path);
        path.style.strokeDasharray = `${length} ${length}`;
        path.style.strokeDashoffset = String(length * (1 - t));
      }
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
        {/* Starts on the same beat as the title rather than waiting for the
            sweep to finish. This is the panel that hands off from the hero, and
            the two lines read as one title card — staggering them left the
            second line arriving late enough to feel like a separate event. */}
        <TypedText
          lines={["말보다 먼저, 만든 걸 보여드릴게요."]}
          className="font-['Pretendard'] text-[22px] tracking-[-0.44px]"
          stop={STOP.intro}
          delay={0}
        />
      </div>
    </div>
  );
}

/** Panel 2 — what the thing actually is, before the story of building it.
 *
 *  One centred column of three blocks 32 apart: what it is called and what it
 *  claims to be, the app itself, and the line that hands off to the rest of
 *  the section. The column is centred by transform rather than by a computed
 *  top, so its height is whatever the three blocks come to. */
function ArchivePanel() {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Marker-pen highlight behind the last word of the headline. First in
          the panel, so the white type sits on top of it — which is the whole
          effect. `wipe` because a highlighter is drawn across, not popped in. */}
      <div
        className="absolute left-[1144px] top-[269px] flex h-[32.604px] w-[177.246px] items-center justify-center"
        data-anim="wipe"
        data-stop={STOP.archive}
        data-delay={260 + HIGHLIGHT_AFTER}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      >
        <div className="rotate-[-3.01deg]">
          <div className="h-[23.369px] w-[176.261px] bg-[#0492bd]" />
        </div>
      </div>

      <div className="absolute left-1/2 top-[calc(50%+0.22px)] flex w-[710px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[32px]">
        <div className="flex w-full flex-col items-center gap-[24px]">
          {/* The credit line. It used to sit on the next panel against the
              iMac; the design moves it here, shortened, to open the panel. */}
          <TypedText
            lines={["SNAPKEEP · 개인 프로젝트"]}
            className="px-[10px] text-center font-['Pretendard'] text-[12px] font-medium leading-none text-white whitespace-nowrap"
            stop={STOP.archive}
            delay={0}
          />

          <div className="relative flex w-full flex-col items-center gap-[12px] leading-none text-white">
            {/* Scribbled over the front of the headline, hanging above the
                block's own top — hence the negative offset.

                The design hangs it off the column that carries the credit line
                as well (node 285:3243, at 7 / -43); this sits inside the
                headline block, which starts 36 lower — the 12px credit line
                and the 24 gap under it — so the same position is -79 here.

                Pops in and then drifts, like the rest of the artwork — the
                marks that write themselves on are the ones over on the problem
                and solution panels. It is inlined anyway so that the three
                stars in it can be reached and twinkled. */}
            <InlineMark
              raw={archiveSparkles}
              className="left-[7px] top-[-79px] h-[157px] w-[186px]"
              stop={STOP.archive}
              delay={620}
              float="10"
            />

            {/* Set at 42px, which is what makes this line come out just about
                exactly the column's own 710 — so it reads as the width of the
                block rather than as a line sitting inside it. */}
            <p
              className={`font-['Plus_Jakarta_Sans'] text-[42px] font-bold whitespace-nowrap ${SWEEP_BOX}`}
              data-anim="sweep"
              data-stop={STOP.archive}
              data-delay={260}
              style={sweepStyle}
            >
              {"The Archive You've Always Needed"}
            </p>
            <TypedText
              lines={["모은 레퍼런스를 제때 꺼내 쓸 수 있는 경험"]}
              className="w-full text-center font-['Pretendard'] text-[16px] font-medium leading-none"
              stop={STOP.archive}
              delay={620}
            />
          </div>
        </div>

        {/* 710 x 444.35 is the design's 778:487 box resolved at this column's
            width; the capture is exported at exactly that size. */}
        <div
          className="h-[444.35px] w-[710px] overflow-hidden rounded-[8px]"
          data-anim="popup"
          data-stop={STOP.archive}
          data-delay={1000}
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
          className="text-center font-['Pretendard'] text-[22px] font-medium leading-none text-white whitespace-nowrap"
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
      {/* The design lays this panel out as one centred row: a 466-wide column,
          58, then the 738 monitor. That comes to 1262, so the row starts at
          315 and the column's right edge — which the headline hangs off —
          lands at 781.

          The column's height is what sets the tops, and it is added up rather
          than guessed: 84 for the headline (two 42px lines at leading-none), 12
          for the gap, 16 for the single line below. 112 in all, centred on the
          monitor's own middle at 540, so it starts at 484 and the line below at
          580. */}
      {/* The two thumb marks come before the headline so they paint under it —
          they are meant to sit behind the words, not across them. Nothing here
          uses z-index: within one stacking context the later element wins, so
          the running order *is* the depth. */}
      <img
        src={savedArrowTop}
        alt=""
        className="pointer-events-none absolute left-[555px] top-[484px] h-[44px] w-[35px] max-w-none"
        data-anim="pop"
        data-stop={STOP.saved}
        data-delay={200}
        data-float="9"
        style={{ opacity: 0 }}
      />
      {/* The turn goes on an inner element on purpose: `pop` and the drift
          after it both write this element's own transform every frame, so a
          rotate on the same node would be overwritten on the first one. */}
      <div
        className="absolute left-[786px] top-[522px] h-[44px] w-[35px]"
        data-anim="pop"
        data-stop={STOP.saved}
        data-delay={280}
        data-float="9"
        style={{ opacity: 0 }}
      >
        <img
          src={savedArrowLow}
          alt=""
          className="pointer-events-none block h-[44px] w-[35px] max-w-none rotate-180"
        />
      </div>

      <TypedText
        lines={["Saved it,", "can’t find it"]}
        className="absolute left-[781px] top-[484px] -translate-x-full text-right font-['Plus_Jakarta_Sans'] text-[42px] font-bold leading-none text-white"
        stop={STOP.saved}
        delay={0}
      />

      {/* "But" is no longer part of the headline — the design lifts it out into
          a chip tipped off the horizontal, sitting where the word used to be.
          The offsets are the design's own, measured from the 466 column (left
          315) and the headline block (top 484). */}
      <div
        className="absolute left-[474px] top-[527px] flex h-[50.704px] w-[74.174px] items-center justify-center"
        data-anim="pop"
        data-stop={STOP.saved}
        data-delay={340}
        data-float="8"
        style={{ opacity: 0 }}
      >
        <div className="rotate-[11.41deg]">
          <div className="flex items-center justify-center rounded-[10px] bg-[#0492bd] px-[10px] py-[5px]">
            <p className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold leading-none text-white whitespace-nowrap">
              But
            </p>
          </div>
        </div>
      </div>

      {/* The line that says what the picture beside it is evidence of. One line
          now rather than two, and centred on the column instead of ranged right
          against its edge — so it is a caption under the headline rather than
          another thing lined up with it.

          It is wider than the 466 column it is centred in, and deliberately
          keeps that width rather than shrink-wrapping: the overhang falls
          evenly on both sides, which is what centres it on the headline above
          rather than on itself. */}
      <TypedText
        lines={["사용자들이 레퍼런스는 많이 저장하지만,  정작 필요할 때 찾지 못하는 문제"]}
        className="absolute left-[315px] top-[580px] w-[466px] text-center font-['Pretendard'] text-[16px] font-medium leading-none text-white"
        stop={STOP.saved}
        delay={620}
      />

      {/* `popup` rather than `pop`: a screen full of saved work should open
          like a window, not spring in from a third of its size. */}
      <div
        className="absolute left-[839px] top-[229px] h-[622px] w-[738px]"
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
      {/* What used to be a drawn wave under the first headline is now a plain
          block of colour struck through it. Ahead of the headline in the panel
          so the type sits on top, and wiped open left to right the way the
          wave was. */}
      <div
        className="absolute left-[285px] top-[457px] h-[36px] w-[505px] bg-[#ff60b8]"
        data-anim="wipe"
        data-stop={STOP.problemA}
        data-delay={HIGHLIGHT_AFTER}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      />

      {/* Both halves of this panel are the design's own flex group, dropped on
          the canvas at its top-left corner rather than unpacked into separate
          absolute boxes. The group has no width of its own, so the headline
          sets it and `items-end` hangs the line underneath off that same right
          edge — which is the whole point of the arrangement and is not
          something a fixed left offset can reproduce, since it depends on how
          wide the headline actually renders. */}
      <div className="absolute left-[307px] top-[401px] flex flex-col items-end gap-[12px]">
        <p
          className={`text-right font-['Pretendard'] text-[80px] font-bold leading-none text-white whitespace-nowrap ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.problemA}
          style={sweepStyle}
        >
          The problem wasn&rsquo;t saving
        </p>

        <div className="flex items-center justify-center pr-[10px]">
          <TypedText
            lines={["현재 있는 저장기능은 충분히 다양하게 존재합니다"]}
            className="w-[435px] text-right font-['Pretendard'] text-[16px] font-medium leading-none text-white"
            stop={STOP.problemA}
            delay={700}
          />
        </div>

      </div>

      <img
        src={noteMark}
        alt=""
        className="absolute left-[1158px] top-[278px] size-[140px] max-w-none object-cover"
        data-anim="pop"
        data-stop={STOP.problemA}
        data-delay={450}
        data-float="12"
        style={{ opacity: 0 }}
      />

      {/* The second half. This one the design does give a width — 809 — and
          the headline fills it, so the line below hangs off that edge rather
          than off the text's own. */}
      <div className="absolute left-[1205px] top-[605px] flex w-[809px] flex-col items-end gap-[12px]">
        <p
          className={`w-full text-right font-['Pretendard'] text-[70px] font-bold leading-none text-white ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.problemB}
          style={sweepStyle}
        >
          it was getting it back out
        </p>

        <div className="flex items-center justify-center pr-[10px]">
          <TypedText
            lines={[
              "핵심는 저장된 데이터를 조직하고 검색하는 경험의 부재였습니다",
            ]}
            className="w-[435px] text-right font-['Pretendard'] text-[16px] font-medium leading-none text-white"
            stop={STOP.problemB}
            delay={450}
          />
        </div>
      </div>

      {/* Two pieces that make one open box: the base, and a lid tipped off it. */}
      <div
        className="absolute left-[1869px] top-[526px] h-[90px] w-[91.5px]"
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

      {/* Both marks are drawn over the top of everything — last in the panel,
          as the design has them. Each is exported as a single SVG of the whole
          group, and each keeps the square box the design gives it: the drawing
          sits inside that box with its own slack, so cropping to the ink would
          move it. */}
      <DrawnMark
        raw={problemSquiggle}
        className="left-[357px] top-[266px] size-[216.784px]"
        stop={STOP.problemA}
        delay={HIGHLIGHT_AFTER}
      />
      {/* Relayed: the shaft is drawn, and only then does the head go on the
          end of it.

          Quicker than the shared `draw` time, which is set for a mark that is
          made in one pass. This one is two, so at that pace the whole gesture
          ran on for well over a second and the head — the point of the arrow —
          did not arrive until the reader had stopped watching. The shaft still
          gets about two thirds of this, the head the rest. */}
      <DrawnMark
        raw={problemArrow}
        className="left-[1818px] top-[429px] size-[439.666px]"
        stop={STOP.problemB}
        delay={HIGHLIGHT_AFTER}
        relay
        duration={950}
      />
    </div>
  );
}

/** Panel 5 — the three answers, stepped down and across.
 *
 *  The rows used to be a mark and its line side by side. They are not any
 *  more: each row is now just its two lines, with a blue swash struck under
 *  the headline and the drawn marks scattered around and over the type rather
 *  than lined up beside it. The rows still stagger diagonally across the
 *  panel, so each one keeps its own stop.
 *
 *  Every offset below is the design's own. The ones inside a row are relative
 *  to that row's text column — including the negative ones, which is how a
 *  swash starts to the left of the word it runs under. */
const ROW_LEAD = 260; // ms from a row's line to its own marks
const rowLineClass =
  "shrink-0 text-right font-['Plus_Jakarta_Sans'] text-[70px] font-bold leading-none tracking-[-1.4px] text-white whitespace-nowrap";
// The Korean line under each headline. The design sets two of these in Plus
// Jakarta Sans and two in Pretendard, which is a distinction without a
// difference — Plus Jakarta Sans carries no Hangul, so all four fall back to
// the same face anyway. Pretendard for all of them says that on purpose.
const rowSubClass =
  "w-full shrink-0 text-center font-['Pretendard'] text-[16px] font-medium leading-none text-white";

/** The blue bar struck through a row's headline. Wiped open left to right,
 *  behind the type — so it has to be the first thing in the row's column.
 *
 *  A plain block of colour, not a drawing. These were drawn swashes with
 *  slanted ends, exported one per row; the design has replaced all three with
 *  straight rectangles, the same move the problem panel's headline already
 *  made. Nothing is left to stretch out of shape, so the box is the whole of
 *  it and the size just comes in on the class. */
function Swash({ className, stop, delay }) {
  return (
    <div
      className={`pointer-events-none absolute bg-[#0492bd] ${className}`}
      data-anim="wipe"
      data-stop={stop}
      data-delay={delay}
      style={{ clipPath: "inset(0 100% 0 0)" }}
    />
  );
}

/** One of the folder icons scattered over the end of the first row. The design
 *  exports this glyph once per size; it is the same drawing every time, so the
 *  box carries the size and the inset is the design's own padding inside it.
 *  `src` picks which of the three colours this one is. */
function FolderIcon({ src, size, left, top, stop, delay }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left, top, width: size, height: size, opacity: 0 }}
      data-anim="pop"
      data-stop={stop}
      data-delay={delay}
      data-float="7"
    >
      <div className="absolute inset-[6.25%_1.19%_12.5%_1.18%]">
        <img src={src} alt="" className="block size-full max-w-none" />
      </div>
    </div>
  );
}

function SolutionPanel() {
  return (
    <div className="relative h-full w-[4477px] shrink-0 overflow-hidden bg-[#06252e]">
      {/* Anchored by its left edge at the design's own 372, with the line under
          it centred on the headline rather than hung off either end. */}
      <div className="absolute left-[372px] top-[442px] flex flex-col items-center gap-[16px]">
        <p
          className={`text-right font-['Pretendard'] text-[100px] font-bold leading-none text-white whitespace-nowrap ${SWEEP_BOX}`}
          data-anim="sweep"
          data-stop={STOP.solutionLead}
          // Held until the panel has finished sliding in. Armed at zero, the
          // whole sharpen plays out while the strip is still travelling, so by
          // the time anything is still to look at it has already happened.
          data-delay={SETTLE_DELAY}
          style={sweepStyleGhosted}
        >
          Produce <span className="text-[#ff60b8]">3 </span>solution
        </p>
        <TypedText
          lines={["사용자의 행동 패턴에서 도출한 3가지 핵심 기능"]}
          className={rowSubClass}
          stop={STOP.solutionLead}
          delay={SETTLE_DELAY + 400}
        />
      </div>

      {/* Plain HIGHLIGHT_AFTER, not SETTLE_DELAY + HIGHLIGHT_AFTER. The strip's
          own travel used to be part of every delay here, from when the
          sequences were armed as the tween began; they are armed as it lands
          now, so carrying it still would hold this mark back for over a second
          after the panel had settled — long enough to be scrolled past
          unseen. */}
      <DrawnMark
        raw={solutionSparkle}
        className="left-[734px] top-[326px] h-[203px] w-[170px]"
        stop={STOP.solutionLead}
        delay={HIGHLIGHT_AFTER}
      />

      {/* Row 1 — AI tagging */}
      <div className="absolute left-[2011px] top-[227px] flex items-center">
        <div className="relative flex flex-col items-center gap-[16px]">
          <Swash
            className="left-[-26px] top-[56px] h-[26px] w-[368px]"
            stop={STOP.solutionTag}
            delay={HIGHLIGHT_AFTER}
          />
          <p
            className={`${rowLineClass} ${SWEEP_BOX}`}
            data-anim="sweep"
            data-stop={STOP.solutionTag}
            data-delay={0}
            style={sweepStyle}
          >
            AI tagging instead of folders
          </p>
          <TypedText
            lines={["폴더 체계 대신 AI 기반 태그로 자동 분류"]}
            className={rowSubClass}
            stop={STOP.solutionTag}
            delay={420}
          />
          {/* Turn on an inner element — `pop` owns the outer one's transform. */}
          <div
            className="pointer-events-none absolute left-[95.27px] top-[1.62px] flex size-[28.316px] items-center justify-center"
            data-anim="pop"
            data-stop={STOP.solutionTag}
            data-delay={ROW_LEAD + 120}
            data-float="7"
            style={{ opacity: 0 }}
          >
            <div className="rotate-[-34.27deg]">
              <img
                src={tagSparkle}
                alt=""
                className="block size-[20.379px] max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
      <img
        src={tagMark}
        alt=""
        className="pointer-events-none absolute left-[1986px] top-[191px] h-[66px] w-[49px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionTag}
        data-delay={ROW_LEAD}
        data-float="9"
        style={{ opacity: 0 }}
      />
      {/* Piled at the tail of the line, over the word "folders". */}
      <FolderIcon src={folderIconPink} size={18} left={2830} top={196} stop={STOP.solutionTag} delay={ROW_LEAD + 60} />
      <FolderIcon src={folderIconLime} size={33} left={2852} top={209} stop={STOP.solutionTag} delay={ROW_LEAD + 120} />
      <FolderIcon src={folderIconBlue} size={24} left={2868} top={183} stop={STOP.solutionTag} delay={ROW_LEAD + 180} />
      <FolderIcon src={folderIconPink} size={24} left={2896} top={205} stop={STOP.solutionTag} delay={ROW_LEAD + 240} />

      {/* Row 2 — search in design language */}
      <div className="absolute left-[2508px] top-[467px] flex items-center">
        <div className="relative flex flex-col items-center gap-[16px]">
          {/* Struck through from a third of the way into the headline, not
              from its start — this bar is the one the design offsets. */}
          <Swash
            className="left-[293px] top-[54px] h-[26px] w-[560px]"
            stop={STOP.solutionSearch}
            delay={HIGHLIGHT_AFTER}
          />
          <p
            className={`${rowLineClass} ${SWEEP_BOX}`}
            data-anim="sweep"
            data-stop={STOP.solutionSearch}
            data-delay={0}
            style={sweepStyle}
          >
            Search in design language
          </p>
          <TypedText
            lines={["디자인언어를 사용한 태깅 및 검색 제공"]}
            className={rowSubClass}
            stop={STOP.solutionSearch}
            delay={420}
          />
          <img
            src={searchLoupe}
            alt=""
            className="pointer-events-none absolute inset-[-18.63%_39.33%_81.58%_56.31%] max-w-none"
            data-anim="pop"
            data-stop={STOP.solutionSearch}
            data-delay={ROW_LEAD + 120}
            data-float="8"
            style={{ opacity: 0 }}
          />
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-[2563px] top-[448px] h-[32.391px] w-[116.653px]"
        data-anim="pop"
        data-stop={STOP.solutionSearch}
        data-delay={ROW_LEAD + 60}
        data-float="8"
        style={{ opacity: 0 }}
      >
        {/* The drawing runs a shade wider than its frame on the left. */}
        <div className="absolute inset-[0_0_0_-0.72%]">
          <img src={searchPin} alt="" className="block size-full max-w-none" />
        </div>
      </div>
      <img
        src={searchBubble}
        alt=""
        className="pointer-events-none absolute left-[3241px] top-[430px] h-[58.055px] w-[59.74px] max-w-none"
        data-anim="pop"
        data-stop={STOP.solutionSearch}
        data-delay={ROW_LEAD + 180}
        data-float="9"
        style={{ opacity: 0 }}
      />

      {/* Row 3 — layout structure.

          This row's bar is the one the design hangs off the panel rather than
          inside the row, so it is placed in panel coordinates like the blocks
          below it, and comes before the row so it paints behind the type. */}
      <Swash
        className="left-[3045px] top-[731px] h-[26px] w-[560px]"
        stop={STOP.solutionLayout}
        delay={HIGHLIGHT_AFTER}
      />
      <div className="absolute left-[3054px] top-[677px] flex items-center">
        <div className="flex flex-col items-center gap-[16px]">
          <p
            className={`${rowLineClass} ${SWEEP_BOX}`}
            data-anim="sweep"
            data-stop={STOP.solutionLayout}
            data-delay={0}
            style={sweepStyle}
          >
            Layout structure
          </p>
          <TypedText
            lines={["원본뿐만 아니라 구조 분석 후 구조도 및 컴포넌트 제공"]}
            className={rowSubClass}
            stop={STOP.solutionLayout}
            delay={420}
          />
        </div>
      </div>
      {/* Three loose blocks standing in for a layout, in place of the drawn
          card the row used to carry. */}
      <div
        className="absolute left-[2989px] top-[726px] size-[29px] bg-white"
        data-anim="pop"
        data-stop={STOP.solutionLayout}
        data-delay={ROW_LEAD + 60}
        data-float="7"
        style={{ opacity: 0 }}
      />
      <div
        className="absolute left-[3001px] top-[692px] size-[29px] bg-[#c9e529]"
        data-anim="pop"
        data-stop={STOP.solutionLayout}
        data-delay={ROW_LEAD + 120}
        data-float="7"
        style={{ opacity: 0 }}
      />
      <div
        className="absolute left-[2949px] top-[697px] flex h-[61.751px] w-[35.113px] items-center justify-center"
        data-anim="pop"
        data-stop={STOP.solutionLayout}
        data-delay={ROW_LEAD + 180}
        data-float="7"
        style={{ opacity: 0 }}
      >
        <div className="rotate-[-6.11deg]">
          <div className="h-[59px] w-[29px] bg-[#ff60b8]" />
        </div>
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
      {/* The design gives this panel real copy now: a 42px title over one
          Korean line, 12 apart, then the capture 32 below — the same block the
          archive panel opens with, which is what makes the two read as the
          bookends they are. */}
      <div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[710px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[32px]">
        <div className="relative flex w-full flex-col items-center justify-center gap-[12px] leading-none text-white">
          {/* The leading space is the design's own, and it is load-bearing:
              the word is pushed right so the "Try" chip pinned above its left
              shoulder sits beside it rather than over the S. Needs
              `whitespace-pre` or the browser collapses it away and the chip
              lands back on the letter. */}
          <p
            className={`font-['Plus_Jakarta_Sans'] text-[42px] font-bold whitespace-pre ${SWEEP_BOX}`}
            data-anim="sweep"
            data-stop={STOP.snapkeep}
            data-delay={0}
            style={sweepStyle}
          >
            {"          Snapkeep"}
          </p>
          <TypedText
            lines={["완성된 서비스 경험  클릭해서 직접 체험해보세요"]}
            className="w-full text-center font-['Pretendard'] text-[16px] font-medium leading-none"
            stop={STOP.snapkeep}
            delay={420}
          />

          {/* The design's own call to action — the same tipped chip the saved
              panel puts "But" in. It replaces the hover pill this panel used to
              invent for itself, so the invitation is now on screen rather than
              only appearing once you are already over the picture. */}
          <div
            className="absolute left-[213px] top-[-11px] flex h-[49.318px] w-[67.313px] items-center justify-center"
            data-anim="pop"
            data-stop={STOP.snapkeep}
            data-delay={760}
            data-float="8"
            style={{ opacity: 0 }}
          >
            <div className="rotate-[11.41deg]">
              <div className="flex items-center justify-center rounded-[10px] bg-[#0492bd] px-[10px] py-[5px]">
                <p className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold leading-none text-white whitespace-nowrap">
                  Try
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* `data-interactive` marks this out as owning its own gestures. The
            section no longer claims the wheel at all, so nothing here is at
            risk of being read as strip travel — the attribute stays because
            the app window inside scrolls on its own. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label="Snapkeep 열기"
          data-interactive
          className="group relative block cursor-pointer overflow-hidden rounded-[8px]"
          style={{ width: GRID_BOX.width, height: GRID_BOX.height, opacity: 0 }}
          data-anim="popup"
          data-stop={STOP.snapkeep}
          data-delay={1000}
        >
          <img
            src={snapkeepGrid}
            alt=""
            className="absolute left-[-1.69%] top-[-2.71%] h-[105.9%] w-[104.12%] max-w-none transition-transform duration-500 group-hover:scale-[1.03]"
          />
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

    // --- where the strip is ------------------------------------------------
    // A continuous position along the list of stops: 0 is the first stop, 3.5
    // is halfway between the fourth and fifth. It is the page's scroll through
    // this section and nothing else, so the strip moves exactly as far as you
    // scroll and stops the instant you do.
    //
    // It used to be an integer plus a 520ms tween per wheel tick, which is why
    // the strip could only ever be *at* a stop: everything between two panels
    // was passed through at a fixed speed with no way to stop in it.
    let stopPos = 0;
    let currentX = 0;

    function metrics() {
      const stripScale = window.innerHeight / DESIGN_HEIGHT;
      // clientWidth, not innerWidth. innerWidth — and CSS `100vw` — count the
      // vertical scrollbar, which is not part of what you can actually see, so
      // centring on half of it puts everything half a scrollbar's width off to
      // the right. About 8px on a desktop browser, and invisible in a headless
      // test because there is no scrollbar there to get it wrong.
      const viewportWidth = document.documentElement.clientWidth;
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
      // The scale the strip is *wearing right now*, read back off the canvas,
      // rather than the one it is supposed to end up with. Converting measured
      // screen px into design px is only correct if the divisor is the scale
      // those px were actually rendered at, and the two disagree for a frame
      // or two after mount and after a resize. Read it back and they cannot
      // drift apart.
      const canvas = trackRef.current.firstElementChild;
      const renderedWidth = canvas?.getBoundingClientRect().width ?? 0;
      const stripScale =
        renderedWidth > 0 ? renderedWidth / TOTAL_WIDTH : metrics().stripScale;
      const bounds = STOPS.map(() => null);
      // Measure the laid-out box, with any entrance transform set aside and put
      // back afterwards. `pop` and `popup` scale their element, and a scaled
      // element measures smaller — so measuring one mid-entrance records a
      // centre that stays wrong for the rest of the session. Resetting them to
      // t=0 does not help: at t=0 a pop is scale(0.3), which is smaller still.
      // On a cold load nothing has played yet, but that is not the case that
      // matters — a hot reload with the section on screen re-runs this over
      // elements still carrying the previous run's transforms.
      const heldTransforms = animated.map((item) => item.el.style.transform);
      for (const item of animated) item.el.style.transform = "none";

      for (const item of animated) {
        const rect = item.el.getBoundingClientRect();
        const left = (rect.left - trackLeft) / stripScale;
        const right = (rect.right - trackLeft) / stripScale;
        const seen = bounds[item.stop];
        bounds[item.stop] = seen
          ? {
              left: Math.min(seen.left, left),
              right: Math.max(seen.right, right),
            }
          : { left, right };
      }
      animated.forEach((item, i) => {
        item.el.style.transform = heldTransforms[i];
      });

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

    /** Is this element's middle actually inside the viewport right now? */
    function inView(el) {
      const rect = el.getBoundingClientRect();
      const middle = rect.left + rect.width / 2;
      return middle > 0 && middle < document.documentElement.clientWidth;
    }

    // How close the strip has to get to a stop before that stop's sequence is
    // armed. Not zero: with the travel tied to the scroll, the strip creeps up
    // on a panel over most of a screen of scrolling, and waiting for it to be
    // exactly centred means the panel sits fully readable on screen for a
    // second or so with nothing on it yet. Firing a little early has the
    // entrances play as the panel settles, which is what they were written to
    // do back when it arrived in one 520ms tween.
    const TRIGGER_LEAD = 0.35;

    // How far the section's top may still be below the top of the screen and
    // count as arrived, as a fraction of a screen.
    //
    // This used to be a flat `top > 0` — nothing at all played until the
    // section had pinned. But a sticky stage pins a whole screen after its
    // panel first comes into view, so "Experience It" slid up, sat there fully
    // legible and ghosted, and only started sharpening a screen of scrolling
    // later. The opening title card is the one panel where that gap is
    // unmissable, because it is the first thing the section says.
    //
    // A third of a screen puts the intro's centred type in the lower middle of
    // the view — on screen and being read — which is the moment its sweep and
    // its line should be running. Later stops are unaffected: they are gated on
    // `stopPos` as well, and that only advances once the strip is travelling.
    const SECTION_ARM_LEAD = 0.35;

    // Arm everything belonging to stops we have reached, and rearm anything
    // above them so scrolling back and returning replays it.
    function refreshTriggers() {
      const beforeSection =
        section.getBoundingClientRect().top >
        window.innerHeight * SECTION_ARM_LEAD;
      let started = false;
      for (const item of animated) {
        // Reaching a mark's stop is not the same as being able to see it. The
        // strip is one long horizontal panel, a stop frames its own group, and
        // a mark can sit well off to one side of that — so the stop alone
        // would start the line being drawn while it is still past the edge of
        // the screen, and it is already finished by the time it slides into
        // view. That is the whole of this effect missed.
        //
        // Only the drawn marks are held this way. Everything else is either
        // inside the group its stop frames anyway, or is text, which is read
        // rather than watched and does not suffer from having started early.
        const reached =
          !beforeSection &&
          stopPos >= item.stop - TRIGGER_LEAD &&
          (item.kind !== "draw" || inView(item.el));
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
    // blocks beside the headlines read as the same family of floating pieces.
    // `data-float` overrides how far.
    //
    // Except anything that twinkles. A star is meant to catch the light where
    // it is, and a point of light that is also wandering around the panel
    // stops reading as a star at all — so the flash replaces the drift rather
    // than being added on top of it.
    const floaters = animated
      .filter(
        (item) => item.kind === "pop" && !item.el.querySelector("[data-twinkle]"),
      )
      .map((item, n) => ({
        item,
        amplitude: Number(item.el.dataset.float) || 9,
        phase: n * 1.9,
        period: 2600 + n * 220,
      }));
    // Once a mark has landed, the stars in it keep twinkling. Each star is its
    // own group in the artwork (`data-twinkle`, carrying the centre it should
    // swell about), and each gets its own period and phase — flashing in step
    // would read as the whole cluster blinking rather than as separate points
    // of light.
    //
    // Found by looking inside every animated element rather than by which
    // entrance it uses: a star twinkles whether its mark was popped in or
    // drawn on, and nothing about the flash depends on how it arrived.
    const twinklers = animated
      .filter((item) => item.el.querySelector("[data-twinkle]"))
      .flatMap((item) =>
        [...item.el.querySelectorAll("[data-twinkle]")].map((group, n) => ({
          item,
          group,
          cx: Number(group.dataset.cx) || 0,
          cy: Number(group.dataset.cy) || 0,
          phase: n * 0.37,
          period: 1900 + n * 520,
          lit: false,
        })),
      );
    let floatId = null;

    function floatTick(now) {
      for (const { item, amplitude, phase, period } of floaters) {
        // While the entrance is still playing it owns the transform.
        if (!item.done) continue;
        const y = Math.sin((now / period) * Math.PI * 2 + phase) * amplitude;
        item.el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(1)`;
      }

      for (const star of twinklers) {
        // The entrance owns the *transform* until it is finished — a star
        // cannot scale about its own centre while the whole cluster is still
        // popping in. It does not own the opacity: that is set on the wrapper
        // and this is set on the group inside it, so the two multiply and the
        // blink can simply always run.
        //
        // It used to skip the whole star until `item.done`, which meant a
        // cluster that never finished its entrance — scrolled past, rearmed,
        // caught mid-stagger — sat at a flat opacity 1 and never blinked at
        // all. Nothing about a blink needs to wait for an entrance.
        const settled = star.item.done;
        if (!settled && star.lit) {
          star.group.removeAttribute("transform");
          star.lit = false;
        }
        if (settled) star.lit = true;
        const cycle = (((now / star.period + star.phase) % 1) + 1) % 1;
        // A twinkle is a flash, not a throb. A plain sine would spend half of
        // every cycle dimmed, which reads as slow breathing; this sits at rest
        // for most of the period and then briefly catches the light.
        const spike =
          cycle < TWINKLE_BLINK
            ? Math.sin((cycle / TWINKLE_BLINK) * Math.PI)
            : 0;
        // spike runs 0 -> 1 -> 0 across the blink, and it is subtracted, so the
        // star fades out and comes back rather than brightening. At
        // TWINKLE_DIM = 0 it is gone entirely at the bottom of the swing.
        star.group.style.opacity = (
          1 -
          (1 - TWINKLE_DIM) * spike
        ).toFixed(3);
        // Out to the star's own centre, scaled, and back — an SVG group has no
        // box of its own to be a transform-origin, so the swell has to be
        // carried out to the middle of the drawing and returned.
        if (settled) {
          const swell = 1 - TWINKLE_SWELL * spike;
          star.group.setAttribute(
            "transform",
            `translate(${star.cx} ${star.cy}) scale(${swell.toFixed(4)}) translate(${-star.cx} ${-star.cy})`,
          );
        }
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

    /** Where the strip sits at a continuous position along the stop list.
     *
     *  Eased *within* each leg rather than run as one straight line across the
     *  whole strip. Both are equally tied to the scroll — the difference is
     *  that this one comes to a stand at every stop and pulls away from it
     *  again, so a panel reads as arriving and being held rather than as one
     *  endless sideways pan that happens to have things in it.
     *
     *  The travel per leg is not equal, either: some stops are a screen apart
     *  and some are most of a 4477px panel. Easing per leg is what keeps the
     *  long ones from feeling like a sprint and the short ones like a nudge —
     *  each gets the same screen of scrolling regardless of its distance. */
    function stripXAt(pos) {
      if (STOPS.length === 1) return targetXFor(0);
      const i = Math.min(STOPS.length - 2, Math.max(0, Math.floor(pos)));
      const local = clamp01(pos - i);
      const from = targetXFor(i);
      const to = targetXFor(i + 1);
      return from + (to - from) * smoothstep(local);
    }

    function render(raw) {
      stopPos = raw * (STOPS.length - 1);
      applyX(stripXAt(stopPos));
      refreshTriggers();
    }

    // Before anything is armed, so nothing has an entrance transform on it yet
    // and every box is its resting one.
    measureStops();

    // Re-measure, and re-park on the stop, whenever something that changes how
    // wide things are has landed.
    //
    // This is not belt-and-braces, it is the fix for a real bug: the fitted
    // scale is set from a *different* effect, so at this point React has only
    // scheduled it and the strip is still sitting at scale 1. Measuring here
    // and dividing by the scale it is *about* to have inflated every centre by
    // 1/scale, and the strip parked well off to one side.
    //
    // It only showed up on reload because of what used to correct it. The
    // fonts.ready pass below re-measures, and on a cold load the fonts are
    // still downloading, so that lands late — after the scale has painted —
    // and quietly fixed the numbers. On a refresh the fonts are cached, it
    // resolves almost immediately, and the second measurement was as early and
    // as wrong as the first. Hence: fine the first time, off on every reload.
    const driver = driveWithScroll(section, render);

    function settle() {
      measureStops();
      driver.refresh();
    }

    // Two frames: one for React to commit the scale, one for the browser to
    // lay out with it.
    let settleId = requestAnimationFrame(() => {
      settleId = requestAnimationFrame(settle);
    });
    // Headlines are the widest things here, and a webfont arriving late
    // changes how wide they are.
    document.fonts?.ready.then(settle);
    // The capture and the drawn marks carry real size too, and a stop framing
    // one of them is measured wrong until it has decoded.
    window.addEventListener("load", settle);

    return () => {
      window.removeEventListener("load", settle);
      driver.stop();
      if (paintId !== null) cancelAnimationFrame(paintId);
      if (settleId !== null) cancelAnimationFrame(settleId);
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
