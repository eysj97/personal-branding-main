import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import SnapkeepSpread from "./detail/SnapkeepSpread";
import ProjectAppWindow from "./ProjectAppWindow";
import { driveWithScroll } from "../lib/scrollDriver";
import { isLightUnder } from "../lib/ground";
import { MOBILE_MAX } from "../lib/viewport";

// A png where its neighbours are avif, and deliberately so. The floppy is pink
// now rather than the teal Figma exported, and there is no avif encoder in this
// project to re-export it through — so the recolour was done on the png and the
// avif, which no longer showed the right colour, is gone. It is a flat two-tone
// shape at 420px for a 140px box, which is 33kB: the avif's own 12kB is not
// worth a second copy of the drawing to keep in step.
import noteMark from "../assets/experience/note-mark.png";
import boxBase from "../assets/experience/box-base.svg";
import boxLid from "../assets/experience/box-lid.svg";
import savedScreen from "../assets/experience/saved-screen.avif";
import savedFigma from "../assets/experience/saved-figma.avif";
import savedSiteMenu from "../assets/experience/saved-site-menu.avif";
// The still behind the recording, for a build with no video file. A png rather
// than the avif the rest of these are, because that is the format it arrives in
// and there is no avif encoder in this project to put it back through.
import archiveCapture from "../assets/experience/archive-capture.png";
// The library as it actually looks, re-captured. A png rather than the avif it
// replaces, for the reason the archive still is one: it arrived as a png and
// there is no avif encoder here to put it back through. Downscaled to 1420 —
// twice the 710 it is shown at — from the 8304 it was exported at, which was
// eleven megabytes for a picture a tenth that wide on screen.
import snapkeepGrid from "../assets/experience/snapkeep-grid.png";

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
// One file per colour, because an svg cannot be recoloured from the outside
// once it is in an <img>. Between them these are the section's whole palette
// bar the black and the white, which belong to the type — so the scatter reads
// as the section's own colours piled up rather than as one tinted glyph
// repeated. (`folder-teal` was `folder-blue`: the blue left the palette.)
import folderIconGold from "../assets/experience/doodle/folder.svg";
import folderIconPink from "../assets/experience/doodle/folder-pink.svg";
import folderIconTeal from "../assets/experience/doodle/folder-teal.svg";

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
// The browser chrome the stacked windows are drawn in, and the size it is
// drawn at. Its own file because the phone's EXPERIENCE draws the same window
// inside the same monitor at a different scale — see mobile/MobileExperience.
import SafariWindow, { WINDOW } from "./experience/SafariWindow";

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

/** How big the strip is drawn, and where it sits vertically in its stage.
 *
 *  Desktop fits it to the viewport's *height*: the strip is one 1080-tall band
 *  and all its travel is sideways, so height is the dimension that has to
 *  match, and the width follows from the design's own ratio. On anything close
 *  to 16:9 that also lands a panel at about a screen wide, which is what makes
 *  a stop frame one panel.
 *
 *  A phone breaks that. At 430 x 932 the height rule gives a scale of 0.86 and a
 *  panel 1657px wide, so a quarter of one is on screen at a time and the strip
 *  reads as a wall being panned past rather than as panels arriving. Fitting to
 *  the *width* instead puts one whole panel on the screen again — which is the
 *  only thing that changes down here. Same composition, same travel, same
 *  sequencing; it is simply smaller, and the copy is small with it. That is the
 *  deliberate trade: this section has no mobile design of its own, and showing
 *  all of it small is nearer the truth than showing a quarter of it large.
 *
 *  `offsetY` centres what is left over. It is exactly 0 on the desktop branch —
 *  the strip is the viewport's height there, so there is nothing to centre — so
 *  one formula covers both and the desktop composition is untouched.
 */
function fitStrip() {
  // clientWidth, not innerWidth: see the note in metrics() below.
  const viewportWidth = document.documentElement.clientWidth;
  const scale =
    viewportWidth <= MOBILE_MAX
      ? viewportWidth / SCREEN
      : window.innerHeight / DESIGN_HEIGHT;
  return {
    scale,
    offsetY: Math.max(0, (window.innerHeight - DESIGN_HEIGHT * scale) / 2),
  };
}
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

// The stars in the sparkle cluster blink. Their timing lives in index.css, on
// `[data-twinkle]` — see the note where the float loop used to drive it.

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

// And the words standing *on* a marker come after the marker itself. They are
// black, on a page that is blue until the white block arrives under them — so
// written in with the rest of the line they are a dark smudge on the blue for
// as long as the highlighter takes to catch up. Held back to the far side of
// that wipe instead, the order reads the way the drawing was made: the line,
// then the marker struck through it, then the words the marker leaves standing.
const MARKED_AFTER = HIGHLIGHT_AFTER + DURATIONS.wipe;

// And when the marker is at the *left* end, the same rule runs the other way:
// the highlighter is the leftmost thing on the line, so it goes first, the words
// standing on it follow it, and the rest of the sentence is written after them.
// The marker's own delay is 0 on those lines — there is nothing for it to wait
// behind.
const LEAD_MARK = DURATIONS.wipe;
const LEAD_REST = DURATIONS.wipe + DURATIONS.sweep;

/** One half of a split headline, swept on its own clock.
 *
 *  A headline reads left to right, so it is written left to right: whichever
 *  half is on the left goes first, and a marker goes before the words standing
 *  on it. Two arrangements come out of that, and which one a line uses depends
 *  only on which end its marker is at —
 *
 *    marker on the right   line, then marker, then the black words
 *                          (MARKED_AFTER — the line sweeps as one <p>)
 *    marker on the left    marker, then the black words, then the rest
 *                          (LEAD_MARK / LEAD_REST — the <p> does not sweep at
 *                          all; each half carries its own)
 *
 *  `inline-block` because a mask on a plain inline box is not reliably applied;
 *  the padding pair is SWEEP_BOX's, for the same reason it is on the headline
 *  (a mask clips to the box, and `leading-none` puts descenders outside it).
 *  Any space beside these words belongs to the line, not to the span: a leading
 *  space inside an inline-block is collapsed away, which closed the gap between
 *  the two halves. */
function Half({ children, stop, after, tone = "text-black" }) {
  return (
    <span
      className={`inline-block ${tone} ${SWEEP_BOX}`}
      data-anim="sweep"
      data-stop={stop}
      data-delay={after}
      style={sweepStyle}
    >
      {children}
    </span>
  );
}

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
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#336bec]">
      {/* No left padding: it would be inside the box being centred, which
          pushes the type half of it off to the right. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[24px] leading-[1.2] text-white">
        {/* tracking in em rather than the -2.4px it was: -2.4 on 120 *is*
            -0.02em, so the desktop is unchanged, and the phone's much larger
            authored size then keeps the same letterfit instead of a tracking
            that has quietly become a tenth of what it should be. */}
        <p
          className={`font-['Plus_Jakarta_Sans'] text-[120px] font-semibold tracking-[-0.02em] ${SWEEP_BOX}`}
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
            second line arriving late enough to feel like a separate event.

            16 at -0.05em, which is what every other section sets its line under
            the name at — LEARN, SKILLS and the phone's PROJECT all use it. This
            one was 22, and a section heading that sizes its caption differently
            from the rest of the site reads as belonging to a different site.
            The title above is already the shared 120. */}
        <TypedText
          lines={["말보다 먼저, 만든 걸 보여드릴게요."]}
          className="font-['Pretendard'] text-[16px] tracking-[-0.05em]"
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
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#336bec]">
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

          <div className="relative flex w-full flex-col items-center gap-[20px] leading-none text-white">
            {/* Marker-pen highlight behind the last word of the headline.
                `wipe` because a highlighter is drawn across, not popped in.

                It was a thin blue bar struck through the line, and tilted a few
                degrees. The design makes it white and the height of the type
                itself, so it stops being a strike and becomes a block the word
                is printed on — which is why "Needed" is set black: on white, at
                this size, the word is the marker's whole reason for being
                there. Upright too; a highlight that covers the line has no
                slant to read as a hand gesture.

                In here, against the headline, rather than out in the panel
                where it was. It used to be at 1144/257 in panel coordinates,
                which is where the headline happens to land — and only while the
                column below it is a particular height. The column is centred by
                transform, so growing the video box pushes the headline up by
                half of whatever it grew, and the bar stayed behind: 190px of
                new video left it 95px adrift, sitting under the line it is
                supposed to be behind. Hung off the headline instead, there is
                nothing left to keep in step. The offsets are the old ones
                rebased on this block — 1144 - 605 across, and 3 down. */}
            <div
              className="absolute left-[539px] top-[3px] h-[47px] w-[176px] bg-white"
              data-anim="wipe"
              data-stop={STOP.archive}
              data-delay={260 + HIGHLIGHT_AFTER}
              style={{ clipPath: "inset(0 100% 0 0)" }}
            />

            {/* Set at 42px, which is what makes this line come out just about
                exactly the column's own 710 — so it reads as the width of the
                block rather than as a line sitting inside it.

                `relative` only for the paint order. The highlight above is
                positioned, and a positioned box paints over an in-flow one
                however early it comes in the markup — so without this the
                marker covers the words it is meant to sit behind. */}
            <p
              className={`relative font-['Plus_Jakarta_Sans'] text-[42px] font-bold whitespace-nowrap ${SWEEP_BOX}`}
              data-anim="sweep"
              data-stop={STOP.archive}
              data-delay={260}
              style={sweepStyle}
            >
              {"The Archive You've Always "}
              <Half stop={STOP.archive} after={260 + MARKED_AFTER}>
                Needed
              </Half>
            </p>

            {/* Scribbled over the front of the headline, hanging above the
                block's own top — hence the negative offset.

                After the headline in the markup, not before it, for the same
                paint-order reason: the headline is positioned now, so a mark
                meant to sit *over* the words has to come later.

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
            <TypedText
              lines={["모은 레퍼런스를 제때 꺼내 쓸 수 있는 경험"]}
              className="w-full text-center font-['Pretendard'] text-[16px] font-medium leading-none"
              stop={STOP.archive}
              delay={620}
            />
          </div>
        </div>

        {/* 710 x 635 — the column's width at the *picture's* aspect, which is
            not the file's.

            The file is 1920 x 1080, but the recording inside it is not: it is a
            1207.5 x 1080 capture of a tall app window, sitting centred on black
            with 356px bars either side. Measured off a frame, not guessed — 805
            of 1280 columns on the thumbnail, full height. So the shape to build
            the frame from is 1207.5:1080, or 1.118:1, and 710 / 1.118 is 635.

            Sizing to the file instead is what put the bars on screen: a 16:9
            hole for a 1.118:1 picture leaves the difference showing, and the
            difference is black. The width is the column the copy above and
            below sits in and cannot move, so the height is what gives. */}
        <div
          className="h-[635px] w-[710px] overflow-hidden rounded-[8px]"
          data-anim="popup"
          data-stop={STOP.archive}
          data-delay={1000}
          style={{ opacity: 0 }}
        >
          {ARCHIVE_VIDEO ? (
            <video
              src={ARCHIVE_VIDEO}
              // `object-cover` is what actually removes the bars. The box is
              // the picture's aspect and the file is wider than that, so cover
              // fits by height and throws away the overflow either side — which
              // is exactly the black, and nothing else.
              //
              // The 1% is slack on the measurement. The bar edge was read off a
              // 1280-wide thumbnail, so it is good to about 1.5px of the real
              // 1920 — a quarter of a per cent. Cropping one per cent is four
              // times that and costs three pixels of picture, which is a better
              // trade than a hairline of black down one side.
              className="h-full w-full max-w-none scale-[1.01] object-cover"
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
              // Sized to the box rather than to itself. This still is a frame of
              // the *old* capture at the old 778:487, so it no longer matches
              // the box — cover crops it rather than letting it hang out of a
              // shorter frame. It only shows on a build with no video file at
              // all; re-export it from the new recording and the crop goes away.
              className="h-full w-full max-w-none object-cover"
            />
          )}
        </div>

        <TypedText
          lines={["스냅킵을 만들기까지의 과정입니다"]}
          className="text-center font-['Pretendard'] text-[22px] font-medium leading-none text-white whitespace-nowrap"
          stop={STOP.archive}
          delay={1100}
        />
      </div>
    </div>
  );
}

// Where the three windows sit inside the 738x622 monitor and how big they are.
const MONITOR = { width: 738, height: 622 };
// The glass, as fractions of the monitor — the screen inside the bezel, which
// is what the windows are laid out against and clipped to. Written here rather
// than only as a Tailwind inset on the element, because the placement below is
// measured off it and the two must not be able to disagree.
const GLASS = { top: 0.0462, right: 0.0389, bottom: 0.3205, left: 0.04 };
const GLASS_WIDTH = MONITOR.width * (1 - GLASS.left - GLASS.right);

const WINDOW_SCALE = 0.62;
const WINDOW_STEP = { x: 46, y: 34 };
// One beat apart, after the monitor itself has finished opening.
const WINDOW_DELAY = [1000, 1340, 1680];

// Where the first window's top-left corner goes.
//
// The x is derived rather than set, and that is the point: the three windows
// cascade to the right, so the shape they make once they are all out is a block
// two steps wider than one window. Centring the *first* window leaves that
// block sitting off to the right — which is what it was doing, hard against the
// bezel with 58px of empty glass down the left. Centring the block is what
// makes the finished stack look placed rather than dropped.
//
// The y is left as the design's. Vertically the stack deliberately runs past
// the bottom of the glass and is cut off by the bezel, the way a real window
// stack would be, so there is nothing to centre.
const WINDOW_STACK_WIDTH =
  WINDOW_STEP.x * (WINDOW_DELAY.length - 1) + WINDOW.width * WINDOW_SCALE;
const WINDOW_ORIGIN = { x: (GLASS_WIDTH - WINDOW_STACK_WIDTH) / 2, y: 38 };

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
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#336bec]">
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
          <div className="flex items-center justify-center rounded-[10px] bg-black px-[10px] py-[5px]">
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
          rather than on itself.

          588 is 20px under the headline, and it is arithmetic rather than a
          number chosen by eye: the headline starts at 484 and is two lines of
          42px at `leading-none`, so its box ends at 568. Both blocks are typed
          on rather than laid out together — they are separate absolute boxes —
          so nothing keeps this gap for us. Retiming or resizing the headline
          means redoing this sum. */}
      <TypedText
        lines={["사용자들이 레퍼런스는 많이 저장하지만,  정작 필요할 때 찾지 못하는 문제"]}
        className="absolute left-[315px] top-[588px] w-[466px] text-center font-['Pretendard'] text-[16px] font-medium leading-none text-white"
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
        <div
          className="absolute overflow-hidden rounded-[10px] bg-[#d9d9d9]"
          // The same GLASS the windows are centred against, so the box they
          // are centred in and the box they are clipped to are one number.
          style={{
            inset: `${GLASS.top * 100}% ${GLASS.right * 100}% ${GLASS.bottom * 100}% ${GLASS.left * 100}%`,
          }}
        >
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
    <div className="relative h-full w-[3031px] shrink-0 overflow-hidden bg-[#336bec]">
      {/* What used to be a drawn wave under the first headline is now a plain
          block struck through it. Ahead of the headline in the panel so the
          type sits on top, and wiped open left to right the way the wave was.
          White and the full height of the 80px line, so "The problem" reads as
          printed on it rather than crossed out by it — hence the black span on
          those two words and only those. */}
      <div
        className="absolute left-[301px] top-[407px] h-[83px] w-[486px] bg-white"
        data-anim="wipe"
        data-stop={STOP.problemA}
        data-delay={0}
        style={{ clipPath: "inset(0 100% 0 0)" }}
      />

      {/* Both halves of this panel are the design's own flex group, dropped on
          the canvas at its top-left corner rather than unpacked into separate
          absolute boxes. The group has no width of its own, so the headline
          sets it and `items-end` hangs the line underneath off that same right
          edge — which is the whole point of the arrangement and is not
          something a fixed left offset can reproduce, since it depends on how
          wide the headline actually renders.

          The gap is box to box, which is the only measurable thing here: the
          headline is `leading-none`, so its box is exactly the 80px em box and
          the descender on "saving" hangs below it. The ink is therefore nearer
          than 20px and always will be — closing that instead would mean moving
          the caption on a number that changes with every word in the line. */}
      <div className="absolute left-[307px] top-[401px] flex flex-col items-end gap-[20px]">
        {/* No sweep on the <p>: each half carries its own, because they do not
            arrive together. */}
        <p className="text-right font-['Pretendard'] text-[80px] font-bold leading-none whitespace-nowrap">
          <Half stop={STOP.problemA} after={LEAD_MARK}>
            The problem
          </Half>{" "}
          <Half stop={STOP.problemA} after={LEAD_REST} tone="text-white">
            wasn&rsquo;t saving
          </Half>
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
          than off the text's own.

          20px, matching the pair above it. It survives SWEEP_BOX sitting on the
          <p> itself here rather than on spans inside it: a flex gap is measured
          between margin boxes, and that pair cancels to nothing, so the box the
          gap starts from is still the 70px em box. The padding does hang into
          the gap, but it is padding — there is nothing in it to see. */}
      <div className="absolute left-[1205px] top-[605px] flex w-[809px] flex-col items-end gap-[20px]">
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
 *  it and the size just comes in on the class.
 *
 *  White, and tall enough to cover the 70px line rather than underscore it —
 *  the same change every other marker in this section made. Each row sets the
 *  words standing on it in black; which words those are is per row, so it is
 *  said at each headline rather than here. */
function Swash({ className, stop, delay }) {
  return (
    <div
      className={`pointer-events-none absolute bg-white ${className}`}
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
 *  `src` is now always the same file — see the import. */
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
    <div className="relative h-full w-[4477px] shrink-0 overflow-hidden bg-[#336bec]">
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
          Produce <span className="text-[#f460c0]">3</span> solution
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

      {/* Row 1 — AI tagging.

          20px between the headline and its Korean line, and the same on the two
          rows below — the three read as one list, so the gap is theirs jointly
          rather than each row's own. Only the swash and the loose marks are
          absolute inside these columns, so they sit outside the gap and none of
          this moves them. */}
      <div className="absolute left-[2011px] top-[227px] flex items-center">
        <div className="relative flex flex-col items-center gap-[20px]">
          <Swash
            className="left-[-6px] top-[7px] h-[75px] w-[348px]"
            stop={STOP.solutionTag}
            delay={0}
          />
          <p className={rowLineClass}>
            <Half stop={STOP.solutionTag} after={LEAD_MARK}>
              AI tagging
            </Half>{" "}
            <Half stop={STOP.solutionTag} after={LEAD_REST} tone="text-white">
              instead of folders
            </Half>
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
      <FolderIcon src={folderIconGold} size={33} left={2852} top={209} stop={STOP.solutionTag} delay={ROW_LEAD + 120} />
      <FolderIcon src={folderIconTeal} size={24} left={2868} top={183} stop={STOP.solutionTag} delay={ROW_LEAD + 180} />
      <FolderIcon src={folderIconPink} size={24} left={2896} top={205} stop={STOP.solutionTag} delay={ROW_LEAD + 240} />

      {/* Row 2 — search in design language */}
      <div className="absolute left-[2508px] top-[467px] flex items-center">
        <div className="relative flex flex-col items-center gap-[20px]">
          {/* Struck through from a third of the way into the headline, not
              from its start — this bar is the one the design offsets. */}
          <Swash
            className="left-[309px] top-[8px] h-[74px] w-[544px]"
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
            Search in{" "}
            <Half stop={STOP.solutionSearch} after={MARKED_AFTER}>
              design language
            </Half>
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
        className="left-[3054px] top-[683px] h-[76px] w-[545px]"
        stop={STOP.solutionLayout}
        delay={0}
      />
      <div className="absolute left-[3054px] top-[677px] flex items-center">
        <div className="flex flex-col items-center gap-[20px]">
          {/* Every word of this one stands on the marker, so there is no
              second half to follow it. */}
          <p className={rowLineClass}>
            <Half stop={STOP.solutionLayout} after={LEAD_MARK}>
              Layout structure
            </Half>
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
        className="absolute left-[2989px] top-[726px] size-[29px] bg-[#28c9a0]"
        data-anim="pop"
        data-stop={STOP.solutionLayout}
        data-delay={ROW_LEAD + 60}
        data-float="7"
        style={{ opacity: 0 }}
      />
      <div
        className="absolute left-[3001px] top-[692px] size-[29px] bg-[#f460c0]"
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
          <div className="h-[59px] w-[29px] bg-[#ffd527]" />
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
// 710 x 631 — the column's width at the capture's own 1420:1262.
//
// It was 710 x 443.4, the design's 2307:1441 box, and the capture was cropped
// to it by hand: the <img> below carried a set of percentage offsets that
// stretched a 1.60 picture over a 1.60 hole. The re-capture is 1.125 — a much
// taller shot, because it holds the whole library rather than the first row and
// a half — and forcing that into the old frame squashes every card in it. The
// width is fixed by the column the copy above it sits in, so the height gives.
const GRID_BOX = { width: 710, height: 631 };

function SnapkeepPanel({ onOpen }) {
  return (
    <div className="relative h-full w-[1920px] shrink-0 overflow-hidden bg-[#336bec]">
      {/* The design gives this panel real copy now: a 42px title over one
          Korean line, 12 apart, then the capture 32 below — the same block the
          archive panel opens with, which is what makes the two read as the
          bookends they are. */}
      <div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[710px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[32px]">
        <div className="relative flex w-full flex-col items-center justify-center gap-[24px] leading-none text-white">
          {/* The leading space is the design's own, and it is load-bearing:
              the word is pushed right so the "Try" chip pinned above its left
              shoulder sits beside it rather than over the S. Needs
              `whitespace-pre` or the browser collapses it away and the chip
              lands back on the letter.

              The word itself is wrapped so it can be measured on its own. It is
              the box the flying copy starts from as the section leaves (see
              SnapkeepFly), and the <p>'s box is the word *plus* those ten
              spaces — starting from that would launch the copy from a point well
              to the left of the letters. The spaces stay outside the span so
              they still belong to the line. */}
          <p
            className={`font-['Plus_Jakarta_Sans'] text-[42px] font-bold whitespace-pre ${SWEEP_BOX}`}
            data-anim="sweep"
            data-stop={STOP.snapkeep}
            data-delay={0}
            style={sweepStyle}
          >
            {"          "}
            {/* `inline-block` so the box it hands over is a real one. A plain
                inline span measures to the font's own ascent and descent, which
                is a couple of px taller than the 42px line the copy is laid out
                on — enough for the word to hop as the two swap. */}
            <span data-snapkeep-word className="inline-block">
              Snapkeep
            </span>
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
              <div className="flex items-center justify-center rounded-[10px] bg-black px-[10px] py-[5px]">
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
          {/* Fills the box, because the box is the capture's own aspect now.
              The offsets and the 104/105% that used to be here were the crop
              that made the old shot fit a frame it did not match; there is
              nothing left for them to correct. The hover scale stays — that is
              the picture answering the pointer, not a fit. */}
          <img
            src={snapkeepGrid}
            alt=""
            className="absolute inset-0 h-full w-full max-w-none object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {/* Darkens under the pointer so the call to action has something to
              sit on — the screenshot underneath is a bright grid of other
              people's UI, and a label laid straight over it is unreadable
              wherever it happens to land.

              pointer-events-none on both: they are inside the button and would
              be hovered *instead* of it otherwise, and group-hover keys off the
              button. Nothing here is a target of its own. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            {/* Just the word. The line above this panel already says "클릭해서
                직접 체험해보세요", and a button repeating it back is the same
                sentence twice — by the time the pointer is on the image the
                reader has been told what this is.

                Rises a little as it arrives rather than simply appearing, so it
                reads as a thing being offered rather than as a flash. The lime
                and the black on it are the chips this section already uses. */}
            <span className="translate-y-[10px] rounded-full bg-[#ffd527] px-[20px] py-[16px] font-['Plus_Jakarta_Sans'] text-[22px] font-bold leading-none tracking-[0.06em] text-black opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              CLICK
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The word leaving with the section.
//
// The last panel's invitation is the end of the Snapkeep story, and the reader
// is about to be handed to the projects. So the word does not simply scroll
// away with its panel: it comes off the panel, picks up the section's own
// colours and shrinks onto the chat character in the corner, which is where
// Snapkeep stays reachable for the rest of the page.
//
// The colour is a sequence, not a blend: white, then pink, then yellow, then
// green, then the site's blue, each one arriving as a change rather than as a
// point on a gradient. `from` is where along the travel each takes over.
//
// Blue last, and blue is the one that has to be checked against what is behind
// it. It lands on the projects, which are white; it would be invisible against
// this section's own #336bec, and it is only ever blue after this section has
// gone.
const FLY_WORD = "Snapkeep";
// Four colours, and the first of them is not a fixed one.
//
// Two of this site's colours are also its two grounds: white is what the
// projects are on, and #336bec is what this section is on. Either of them, put
// on the other, is a word you cannot see — and the word crosses from one to the
// other on its way to the corner, so there is no single choice that works for
// the whole trip.
//
// So slot 0 is whichever of the two is *not* the ground underneath the word at
// that moment: white while it is still over this section, the blue once it is
// over the projects. The other three are chromatic and read on both.
const FLY_TINTS = ["#ffffff", "#f460c0", "#ffd527", "#28c9a0"];
const FLY_ON_WHITE = "#336bec";
function flyTone(index, overWhite) {
  const i = ((index % FLY_TINTS.length) + FLY_TINTS.length) % FLY_TINTS.length;
  return i === 0 && overWhite ? FLY_ON_WHITE : FLY_TINTS[i];
}
// How much of the leaving screen the word spends still sitting in its panel
// before it sets off, as a fraction of that screen.
//
// It used to leave on the first pixel of scroll, which is the panel and the
// word coming apart the instant the section starts to go — the word appeared to
// detach from copy it was still next to. Held for the first third instead, it
// scrolls away *with* its panel and then leaves, which reads as a decision
// rather than as a seam.
//
// Everything below is measured against what is left after this: the travel, the
// colour steps and the landing all live in the remaining screen, so moving this
// one number re-times the whole thing and keeps it in proportion.
const FLY_START = 0.3;
// Where along that travel each colour takes over. Four slots, four thresholds,
// and the last of them lands before the corner does — so the word turns over
// its whole palette exactly once on the way down and arrives on the last of
// them, rather than getting part way round or going round twice.
const FLY_STEPS = [0, 0.25, 0.5, 0.75];
// The last step whose threshold has been passed.
function flyStageAt(t) {
  let found = 0;
  for (let i = 1; i < FLY_STEPS.length; i += 1) {
    if (t >= FLY_STEPS[i]) found = i;
  }
  return found;
}

// The word is drawn several times over, in the section's colours.
//
// StaggeredMenu opens as a set of coloured sheets that cross the screen 0.07
// apart and arrive *before* the panel does — the colours run ahead and the real
// thing lands last. This is that, on a word: each coloured copy is further
// along the same flight than the one behind it, and the word itself is the one
// at the back. What you see is the colours already most of the way to the
// corner while the word is still catching up.
//
// Ahead, not behind. It was built the other way round first — copies chasing
// the word from where it had been — and that is a wake, which is not what the
// menu does and not what was asked for.
// Three: the word, and two copies ahead of it.
//
// It was five, one per colour in the palette, and five is the whole palette on
// screen at once — a ladder of Snapkeeps in every colour the site owns, which
// reads as a list rather than as one word moving. Two is enough to say "there
// is more of this coming" without any of them being legible as its own word for
// long enough to count.
//
// Which two changes as the word changes: they are always the next two colours
// after whatever the word is wearing (see paintColours), so each step of the
// sequence brings a different pair with it rather than the same pair trailing
// the whole way down.
const FLY_LAYERS = 3;
// How much further along the travel each copy runs, as a fraction of the whole.
// Read straight off the scroll rather than chased frame by frame, so the copies
// string out along the actual flight path — a curve into the corner, shrinking
// as it goes — instead of trailing off in a straight line behind.
//
// Small, and it has to be. This has come down a long way: 0.055 strung the
// copies far enough apart to be read as separate words crossing the screen,
// which is a queue rather than a trail, and 0.022 was still three whole words
// stacked one under the next.
//
// How far the copies stand off the word, sideways, in the word's own px.
//
// Sideways, and nothing else. Every version of this until now offset the copies
// *along the flight* — a fraction of the path, so one sat further down it and
// one further back — and the flight runs diagonally down the screen. What that
// produces is three words stacked down and to the right of each other, which is
// the thing the word is supposed to be one of, not a rim on it. Worse, the
// length of the path is not a constant: the panel it starts from is scrolling
// away the whole time, so the same fraction was a different number of pixels in
// every frame and there was no value that stayed small.
//
// Left a little and right a little instead. A fixed number of pixels, in the
// word's own units so it holds its proportion as the word shrinks, and it moves
// nothing else — the copies sit at exactly the word's position and size and are
// only nudged apart. 4 across is about a tenth of the cap height: enough to
// show a coloured edge down each side of every letter, not enough to be read as
// a second Snapkeep.
//
// And a little up with the left one, a little down with the right. Straight
// sideways, the two copies and the word share one baseline, so what shows is
// three words on a line with their edges touching — a widened word rather than
// a doubled one. Tipping the pair the other way off the baseline separates them
// where the letters do not: the colour comes out above the word on one side and
// below it on the other, and the black-and-white shape in the middle stays
// whole. Less than the sideways figure, so the offset still reads as mostly
// horizontal.
const FLY_NUDGE = { x: 4, y: 2.5 };
// Per copy of depth, and 1 means none at all.
//
// It was 0.72, and fading a flat colour is not making it fainter — it is mixing
// it with whatever is behind. Behind here is the section's #336bec, and the
// second copy at 0.52 was the palette's yellow blended halfway into blue, which
// arrives as a muddy olive that is in no part of this site. Every copy is a
// palette colour or it is a colour nobody chose.
//
// Nothing is lost by dropping it. Depth is carried by the overlap instead: the
// copies are a hair ahead of the word and it is drawn over them, so all that
// shows of each is the edge it sticks out by — which reads as behind without
// needing to be dimmer, and reads as the actual colour while it does.
const FLY_FADE = 1;
// How long each colour is held once the word has parked on the chat character.
// Slower than anything in the travel: up there it is a thing in the corner of a
// page being read, and a word changing colour every half second beside the copy
// is a thing being looked at instead of read.
const FLY_HOLD_MS = 1400;
// The "Try" chip, carried along with the word.
//
// The panel has one of these already (see SnapkeepPanel), and the word leaving
// without it was the word arriving as a label rather than as the invitation it
// is. The same drawing at the same tilt — but centred over the word rather than
// pinned to its left shoulder the way the panel's is. The panel can hang it off
// to one side because there is a 710 column around it; out here the word is on
// its own in a corner, and anything off to one side of it just reads as adrift.
//
// `top` puts the *box* four above the word's cap line. The black pill inside is
// smaller than the box and centred in it, so what actually shows is a gap of
// about ten — which is the gap, the box being a centring frame from the design
// rather than the shape itself.
//
// Rides the word only, not the copies running ahead of it — five tilted chips
// strung across the screen is a different effect from the one asked for.
const FLY_CHIP = { width: 67.313, height: 49.318, gap: 4 };
// How far the word's underside sits above the chat circle. The glasses that
// parks on that circle is a shade wider than it and overhangs its top by about
// 5px, so anything under about 8 would land the word on the frame rather than
// above it.
const FLY_GAP = 16;
// The corner the circle sits in, for a page with no chat on it — Chatbot's own
// 44/20 insets on a 90px character. See `corner()` there.
const FLY_FALLBACK = { size: 90, inset: 44, drop: 20 };

export default function ExperienceSection() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  // The travelling copy of the word. A copy, and portalled out to the end of
  // `body`, for the reason Hero's glasses is: it has to be `fixed` to outlive
  // its section, and the strip's stage is `sticky` — which makes a stacking
  // context, so anything inside it paints at the stage's place in the order no
  // matter its z-index, and every section after this one would draw over it.
  const flyRef = useRef(null);
  // Whether the word has finished its travel and is sitting on the corner.
  //
  // State, not a property the loop pokes onto the element. It was the latter,
  // and the button stayed dead: `disabled` and `pointerEvents` are both things
  // React believes it owns — it wrote `disabled` at mount and holds a record of
  // the inline style — so writing them from outside is a bet on React never
  // re-rendering this subtree, which it does the moment anything else here
  // changes. One re-render on landing is cheaper than a control that works
  // until something unrelated happens.
  const [flyLanded, setFlyLanded] = useState(false);
  const [{ scale, offsetY }, setFit] = useState({ scale: 1, offsetY: 0 });
  // Snapkeep opens over the whole page rather than inside the strip, so it
  // lives here and not in the panel that launches it.
  const [appOpen, setAppOpen] = useState(false);

  // See fitStrip: height on the desktop, width on a phone, and the leftover
  // centred either way.
  useEffect(() => {
    const fit = () => setFit(fitStrip());
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // The word's travel out of the last panel and onto the chat character.
  //
  // Driven by the section's own bottom edge rather than by its scroll progress,
  // the same way Hero's glasses is: progress is spent by the time the strip has
  // reached its last stop, and this belongs to the screen *after* all of that,
  // where the section is scrolling away and the projects are coming up. The
  // bottom edge goes from a full viewport to zero over exactly that screen.
  //
  // Its own effect, and not folded into the strip's: nothing here reads the
  // strip's state, and this outlives the section's entrance machinery — the
  // word stays parked in the corner for the rest of the page.
  useEffect(() => {
    const section = sectionRef.current;
    const fly = flyRef.current;
    // The word in the panel, which is both what this starts from and what it
    // replaces.
    const slot = section.querySelector("[data-snapkeep-word]");
    if (!fly || !slot) return undefined;

    // Index 0 is the word itself, and every index after it is a copy running
    // that much further ahead. They are drawn back to front so the word paints
    // over its own colours, which makes the markup order the reverse of this.
    const layers = [...fly.querySelectorAll("[data-fly-layer]")].sort(
      (a, b) => Number(a.dataset.flyLayer) - Number(b.dataset.flyLayer),
    );
    const word = layers[0];

    // Whether what is behind the word is light, and therefore which way round
    // slot 0 resolves.
    //
    // Read off the page rather than worked out from the scroll. It was the
    // latter — "past this section's bottom edge, so it must be on the projects'
    // white" — and that is true for exactly one boundary. The word does not stop
    // there: it stays in the corner for the whole rest of the page, and the page
    // goes back to blue further down (the career section paints its own), where
    // a blue word on blue is nothing at all. That is the bug in the screenshot,
    // and no amount of adjusting a threshold fixes it, because the ground is not
    // a function of how far you have scrolled.
    let overWhite = false;
    // Last checked at, so this runs a few times a second rather than sixty. It
    // hit-tests and reads a computed style, both of which make the browser
    // settle layout, and the answer changes about four times in a whole page.
    let groundAt = 0;

    // The ground is read by isLightUnder — see lib/ground, which the chat panel
    // uses for the same reason. The word's own copies are passed as the thing to
    // ignore: they are at that point by definition.

    // The word's own colour, and the ones after it in the sequence on the copies
    // running ahead — so what is in front of the word is literally what it is
    // about to become. Every step swaps all three, which is what keeps a
    // different pair on screen at each stage instead of one fixed pair trailing
    // the whole way down.
    function paintColours() {
      word.style.color = flyTone(colour, overWhite);
      for (let i = 1; i < layers.length; i += 1) {
        layers[i].style.color = flyTone(colour + i, overWhite);
      }
    }

    // The copy's own untransformed size. Everything below is written as a scale
    // against this, so it has to be the size the copy is laid out at rather
    // than the size it is currently wearing — hence offsetWidth, which a
    // transform does not touch. Measured off the front copy, since the wrapper
    // holds nothing but absolutely positioned children and has no size at all.
    let naturalW = 0;
    let naturalH = 0;
    function measure() {
      naturalW = layers[0]?.offsetWidth ?? 0;
      naturalH = layers[0]?.offsetHeight ?? 0;
    }
    measure();
    // The word is the widest thing this measures and it is set in a webfont, so
    // a cold load has it at fallback metrics until the real face lands.
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);

    // Written only when it changes. The two are a handover rather than a fade:
    // at the first frame of travel the copy is laid exactly on the word it
    // replaces, so swapping them outright is invisible and crossing them over
    // would just be the word printed on itself at half strength.
    let travelling = null;
    // Which colour is on the front copy. During the travel it is read off the
    // scroll; once parked it walks on by itself.
    let colour = 0;
    let heldSince = 0;
    // Whether the travel is over. The copies ahead of the word only exist while
    // it is going somewhere.
    let landed = null;
    let frameId = null;
    // After `colour` exists, since that is what it reads. The markup's own
    // colours are the same set for stage 0, so nothing moves on screen — this
    // is here so the two are stated in one place rather than agreeing by luck.
    paintColours();

    function tick(now) {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // How far the section has gone, and how far the word has gone — which
      // are not the same thing. The word holds for the first FLY_START of the
      // screen and then covers the rest of it, so `travel` is the one every
      // number below is written against.
      const t = clamp01((vh - rect.bottom) / vh);
      const travel = clamp01((t - FLY_START) / (1 - FLY_START));
      // The handover from the panel's word happens at the top of the screen,
      // not at the top of the travel. Through the hold the copy is laid exactly
      // on the word it replaced and tracks it as the panel scrolls away, so the
      // two are interchangeable and swapping early costs nothing — and it means
      // there is no swap left to notice at the moment it sets off.
      const moving = t > 0;

      if (moving !== travelling) {
        travelling = moving;
        slot.style.opacity = moving ? "0" : "";
        fly.style.opacity = moving ? "1" : "0";
      }

      // The copies are the travel, so they are switched off once it is over.
      //
      // Not left stacked and relied on being covered: at the landing every copy
      // is on the same spot and the word is opaque on top of them, which looks
      // like one word until you look at its edges. Type is antialiased, so the
      // colours underneath come through every soft edge — the word arrives
      // wearing a coloured fringe that never goes away, and each change of
      // colour drags it along. One word up there means one word drawn.
      const parked = travel >= 1;
      if (parked !== landed) {
        landed = parked;
        for (let i = 1; i < layers.length; i += 1) {
          layers[i].style.opacity = parked ? "0" : String(Math.pow(FLY_FADE, i));
        }
        // And it only becomes something you can press once it has arrived.
        // Mid-flight it is a word crossing the screen, and a button moving
        // under the pointer is a button you hit by accident.
        setFlyLanded(parked);
      }

      if (parked) {
        // Parked. The colour keeps going, on a clock rather than on the scroll,
        // because there is no scroll left to read — the section is gone and the
        // word is part of the corner now.
        //
        // Every slot, white included — up here `overWhite` is true and slot 0
        // resolves to the blue, so nothing in the rotation is the ground.
        if (now - heldSince >= FLY_HOLD_MS) {
          heldSince = now;
          colour = (colour + 1) % FLY_TINTS.length;
          paintColours();
        }
      } else {
        // Still travelling, so the scroll is the clock. Held here as well, so
        // that landing does not immediately fire a change on top of the one the
        // last step just made.
        heldSince = now;
        const next = flyStageAt(travel);
        if (next !== colour) {
          colour = next;
          paintColours();
        }
      }

      if (moving && naturalW > 0) {
        // Eased, so the word neither sets off abruptly nor slams into the
        // corner. Off `travel`, so the ease belongs to the journey rather than
        // to the screen the journey happens on — read off `t` it would spend
        // its slow start on the hold, where nothing is moving anyway.
        const e = smoothstep(travel);
        // Measured every frame rather than captured when the travel began. The
        // start moves — the panel is scrolling away underneath it — and so does
        // the end, because opening the chat walks the character up beside the
        // conversation. Reading both live is the only version of this with no
        // second copy of a position to keep in step.
        const from = slot.getBoundingClientRect();
        const circle = document.getElementById("chatbot-launcher");
        const to = circle
          ? circle.getBoundingClientRect()
          : {
              left: vw - FLY_FALLBACK.inset - FLY_FALLBACK.size,
              top: vh - FLY_FALLBACK.drop - FLY_FALLBACK.size,
              width: FLY_FALLBACK.size,
            };

        // The panel's word is inside the strip's own scale, so the size it
        // starts at is whatever it currently measures rather than its 42px.
        const startScale = from.width / naturalW;
        // "The width of the chat button", which is the whole point of where it
        // is going: the word ends up as wide as the character it sits on.
        const endScale = to.width / naturalW;

        const startX = from.left + from.width / 2;
        // Where the word was when the section began to leave, not where its
        // panel has since carried it.
        //
        // `from` is the live box, and once the stage unsticks it travels up the
        // screen one-for-one with the page — so read straight, the word rises
        // with its panel through the hold and then comes back down to the
        // corner. Scrolled back the other way it does the same in reverse: the
        // word lifts off its own resting place before settling onto it again,
        // which is a bob nobody asked for on a move that is supposed to be one
        // direction only.
        //
        // `vh - rect.bottom` is exactly how far the stage has gone, so adding it
        // back puts the origin at the resting position and holds it there. No
        // capturing, no first-frame snapshot to get wrong on a fast flick: it is
        // the same number on every frame however the reader got here.
        const startY = from.top + from.height / 2 + (vh - rect.bottom);
        const endX = to.left + to.width / 2;
        const endY = to.top - FLY_GAP - (naturalH * endScale) / 2;

        // How far open the spread is: shut while the word is still standing in
        // its panel, open for the whole of the way down, shut again as it comes
        // to rest.
        //
        // It was the ease's own slope — 4·travel·(1−travel) — which is the
        // physically honest version and the wrong one to look at. That peaks
        // for an instant in the middle and is near nothing either side of it,
        // so the offset the word wears is different in every frame and only
        // really there in the one place. What was asked for is a fixed
        // misregistration, held the whole way down like a print run out of
        // alignment.
        //
        // So: a ramp rather than a curve. Nothing for the first fifteenth,
        // because the word is still at the position it left the panel in and a
        // trail on something that has not moved is just three words; full for
        // the descent; and back to nothing over the last tenth so it does not
        // snap shut on landing.
        const speed =
          smoothstep(travel / 0.15) * (1 - smoothstep((travel - 0.9) / 0.1));

        // Every copy is at the word's own place on the flight, at the word's own
        // size — the only difference between them is a few px off to one side.
        //
        // Odd copies go right and down, even copies left and up, and the step
        // grows every pair, so this keeps working if the layer count ever goes
        // back up.
        const scale = startScale + (endScale - startScale) * e;
        const x = startX + (endX - startX) * e;
        const y = startY + (endY - startY) * e;

        // Now that there is a point to sample. Down here rather than up with
        // the other colour work because it needs the word's actual position,
        // and that is not known until the flight has been read for this frame.
        if (now - groundAt > 180) {
          groundAt = now;
          const light = isLightUnder(x, y, fly);
          if (light !== overWhite) {
            overWhite = light;
            paintColours();
          }
        }

        for (let i = 0; i < layers.length; i += 1) {
          const side = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2);
          // Scaled with the word, so the offset keeps its proportion to the
          // letters all the way down rather than growing into them.
          const nudgeX = side * FLY_NUDGE.x * scale * speed;
          const nudgeY = side * FLY_NUDGE.y * scale * speed;
          // `transform-origin: 0 0` and the half-size taken off by hand, rather
          // than a -50% translate: with the origin at the corner the scale is
          // not applied to the travel, so the point a copy lands on is the
          // point asked for at every size along the way.
          layers[i].style.transform = `translate(${(x + nudgeX - (naturalW * scale) / 2).toFixed(2)}px, ${(y + nudgeY - (naturalH * scale) / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
        }
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
    };
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
      const { scale: stripScale } = fitStrip();
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

    /** How opaque the strip is. Only the stepped mobile mode ever moves it. */
    function applyFade(opacity) {
      trackRef.current.style.opacity = String(opacity);
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
    //
    // Half a leg, which is the exact moment a panel becomes the nearest stop.
    // It was 0.35, and on the phone's stepped mode that is a sixth of a leg
    // *after* the panel has appeared: the screen arrived and then sat there
    // blank for a beat before anything on it started. Armed at the switch, the
    // entrance runs with the fade-in rather than behind it. The desktop, where
    // the strip creeps up on a panel over most of a screen of scrolling, is
    // barely affected — it was already arming while the panel was on its way.
    const TRIGGER_LEAD = 0.5;

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
    // The stars in the sparkle cluster blink, and none of that is done here any
    // more — it is three keyframes on `[data-twinkle]` in index.css.
    //
    // It used to be driven from this loop, gated on the mark's entrance having
    // finished and on the loop running at all, and between those two conditions
    // the stars spent most of their time sitting perfectly still. A blink needs
    // neither: it is a property of the artwork, not of the section's state, so
    // it belongs somewhere that cannot be switched off by accident. The opacity
    // the entrance sets on the wrapper still multiplies with it, so a cluster
    // that has not arrived yet is invisible whether or not its stars are
    // mid-blink.
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

    // Where the mid-point handover ends and the panel is fully itself again, as
    // a fraction of a leg. Half a leg is where the strip switches; this is how
    // much of the run either side of that is spent fading.
    //
    // A third of the leg, not a fifth. At 0.22 the handover was over almost as
    // soon as it started — one panel snapped out and the next snapped in, which
    // reads as a cut rather than as a page being turned. Widening it spends
    // more of the scroll on the change itself and less of it parked.
    const STEP_FADE = 0.34;

    function render(raw) {
      stopPos = raw * (STOPS.length - 1);

      if (document.documentElement.clientWidth <= MOBILE_MAX) {
        // Stepped, not travelled. On the desktop the strip slides sideways and
        // that sideways travel *is* the section — six panels laid out left to
        // right, panned past. A phone cannot pan: a panel is the whole screen
        // wide down here, so the same travel is a full-screen image sliding off
        // one edge while the next comes in the other, over and over, and the
        // reader spends most of the section looking at two half-panels.
        //
        // So the strip does not travel at all. It sits exactly on whichever
        // stop is nearest and jumps to the next one at the midpoint, and the
        // handover is a fade rather than a slide. The scroll still drives it
        // and the stops are still the stops — what changes is that a screen
        // arrives, is looked at, and gives way to the next one.
        const nearest = Math.round(stopPos);
        // 0 at a stop, 0.5 at the midpoint between two.
        const away = Math.abs(stopPos - nearest);
        applyX(targetXFor(nearest));
        applyFade(clamp01((0.5 - away) / STEP_FADE));
      } else {
        applyX(stripXAt(stopPos));
      }

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
      className="section-experience relative bg-[#336bec]"
      style={{ height: `${TRACK_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={trackRef} className="h-full will-change-transform">
          <div
            className="origin-top-left"
            style={{
              width: TOTAL_WIDTH,
              height: DESIGN_HEIGHT,
              // Scale first, then drop the result into the middle of the stage.
              // Written in this order the translate is *not* multiplied by the
              // scale, so offsetY is the screen px it says it is. It is 0 on the
              // desktop, where the strip already fills the height.
              transform: `translateY(${offsetY}px) scale(${scale})`,
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

      {/* The travelling word, at the end of `body`. See flyRef for why it
          cannot live in the stage above.

          z-57 puts it under the chat circle at z-58 and the glasses at z-59.
          It lands above both rather than on them, so nothing here overlaps —
          but if the word is ever nudged down onto the character, the character
          is the thing that should be in front.

          Decoration on the way down and a control once it gets there. It was
          decoration all the way through, on the grounds that the thing you press
          in that corner is the chat circle — but the word does not land *on* the
          circle, it lands above it, and a word that plainly says Snapkeep and
          does nothing when pressed is a dead spot rather than a picture. So it
          opens Snapkeep, which is what the panel it came from offers, and stays
          inert until it has actually parked. See the `landed` block in the loop.

          `visibility` rather than anything the loop owns, for the case where
          Snapkeep is already open: the app window is z-50 and this is z-57, so
          without it the word sits on top of the very thing it just opened. The
          loop writes `opacity`, so taking a different property keeps the two
          from overwriting each other frame by frame. */}
      {createPortal(
        <div
          ref={flyRef}
          className="pointer-events-none fixed left-0 top-0 z-[57]"
          style={{ opacity: 0, visibility: appOpen ? "hidden" : undefined }}
        >
          {/* The word, and the coloured copies running ahead of it. Every one is
              positioned in viewport coordinates by the loop, so this wrapper
              carries no transform and no size of its own — it is here to be the
              containing block and the one opacity that switches the whole set
              on and off.

              No `aria-hidden` on the wrapper any more. The word is a real
              control once it has parked — a second way into Snapkeep, kept in
              the corner after the panel that offers it has scrolled away — and
              hiding the whole set would take the button with it. The copies
              carry their own `aria-hidden` instead, which is where it belongs:
              they are the same word drawn four more times, and a screen reader
              should hear it once.

              `pointer-events-none` stays on the wrapper so the copies can never
              take a click; the word turns its own back on once it lands.

              Written furthest-ahead first, so the word at index 0 comes last in
              the markup and paints over the colours rather than under them.

              Colour and opacity are fixed per copy and set here rather than in
              the loop: they are what a copy *is*. Index 0 is the exception — it
              starts white and the loop repaints it, which is the sequence the
              word itself steps through. The rest take the palette in order,
              which is the menu's own set of sheets. */}
          {Array.from({ length: FLY_LAYERS }, (_, i) => {
            const ahead = FLY_LAYERS - 1 - i;
            // The word itself is the one you can press once it has parked; the
            // copies ahead of it are decoration and stay out of the way of both
            // the pointer and a screen reader.
            const Tag = ahead === 0 ? "button" : "span";
            return (
              <Tag
                key={ahead}
                data-fly-layer={ahead}
                {...(ahead === 0
                  ? {
                      type: "button",
                      disabled: !flyLanded,
                      onClick: () => setAppOpen(true),
                      "aria-label": "Snapkeep 열기",
                    }
                  : { "aria-hidden": "true" })}
                className={`absolute left-0 top-0 font-['Plus_Jakarta_Sans'] text-[42px] font-bold leading-none whitespace-nowrap will-change-transform${ahead === 0 ? " cursor-pointer" : ""}`}
                style={{
                  transformOrigin: "0 0",
                  // The stage-0 set, over this section's blue — which is where
                  // the word starts. The loop repaints all of these before the
                  // first frame is seen; this is here so the markup is never
                  // momentarily colourless rather than to decide anything.
                  color: flyTone(ahead, false),
                  opacity: Math.pow(FLY_FADE, ahead),
                  // The wrapper turns every copy pointer-transparent; the word
                  // takes it back once it has landed, and only then.
                  pointerEvents: ahead === 0 && flyLanded ? "auto" : "none",
                }}
              >
                {FLY_WORD}
                {/* Something to actually hit. Parked, the word is drawn at
                    about 0.45 — the chat button's width over its own — so the
                    letters come to roughly 90 by 19 on screen, which is a
                    target you have to aim at. This pads it out from the inside:
                    absolutely positioned, so it adds nothing to the box the
                    loop measures and moves the word by not a pixel, and it is
                    stated in the word's own units so the 30 and 20 here are
                    about 13 and 9 by the time they are on screen.

                    It stops short of the chat circle below — the word parks
                    FLY_GAP above it, and this reaches nowhere near that far. */}
                {ahead === 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -inset-x-[20px] -inset-y-[30px]"
                  />
                )}
                {/* Inside the word's own span, so it inherits the whole travel
                    — position, scale and all — without a second set of sums to
                    keep in step with it. Absolutely positioned, so it adds
                    nothing to the box the loop measures. */}
                {ahead === 0 && (
                  <span
                    className="absolute flex items-center justify-center"
                    style={{
                      // Centred by a half-width margin rather than a translate:
                      // the pill inside is already rotated, and stacking a
                      // second transform on the box around it is a way to
                      // discover that the two do not commute.
                      left: "50%",
                      marginLeft: -FLY_CHIP.width / 2,
                      top: -(FLY_CHIP.height + FLY_CHIP.gap),
                      width: FLY_CHIP.width,
                      height: FLY_CHIP.height,
                      // Only once the word has actually arrived. It is a label
                      // on a thing you can press, and until the travel is over
                      // there is nothing to press — see `flyLanded`, which is
                      // the same moment the button turns itself on. Carried
                      // down the whole way it was also a black chip tumbling
                      // across the screen with the copies, which is a fourth
                      // thing moving in a shot that already has three.
                      //
                      // Faded rather than switched, and kept mounted either
                      // way: the word is measured for its own travel and a chip
                      // appearing inside it is one more thing that could move
                      // that measurement.
                      opacity: flyLanded ? 1 : 0,
                      transition: "opacity 260ms ease-out",
                    }}
                  >
                    <span className="flex rotate-[11.41deg] items-center justify-center rounded-[10px] bg-black px-[10px] py-[5px] text-[28px] leading-none text-white">
                      Try
                    </span>
                  </span>
                )}
              </Tag>
            );
          })}
        </div>,
        document.body,
      )}
    </section>
  );
}
