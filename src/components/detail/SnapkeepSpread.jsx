import { useEffect, useId, useMemo, useRef, useState } from "react";
import bookmarkIcon from "../../assets/bookmark.svg";
import { measureType, withMeasuredType } from "./measureType";
import { scanReference, useReferenceFile } from "./snapkeepAnalyze";
// The library itself, and everything that reads it, now that the phone runs the
// same app off the same references — see snapkeepLibrary.
import {
  DETAIL_TABS,
  FILTERS,
  OPTIONS_BY_GROUP,
  REFERENCES,
  STORAGE,
  VIEWS,
  readJSON,
  searchTextFor,
  tagGroupsFor,
  usePersisted,
  writeJSON,
} from "./snapkeepLibrary";

// The whole screen is styled from index.css with structural selectors
// (`div:has(> header .font-serif) > main > div[class~="mt-[21px]"] > button`,
// `aside[class*="snapkeep-filter-in"]`, ...), so the element order and the
// class names below are load-bearing: they are what the design hangs off.
// Behaviour lives here in state; only the markup shape is fixed.


/** Shows one analysed component by cropping it out of the screenshot it came
 *  from, rather than redrawing it.
 *
 *  The analysis gives each part a box in 0-1 coordinates. Scaling the image up
 *  by 1/w and 1/h makes that box exactly one container wide and tall; the
 *  position is then the box's origin expressed against the *scrollable* range
 *  (`x / (1 - w)`), which is what background-position takes — 100% means "the
 *  far edge", not "one image width across". */
const cropStyle = (image, part) => {
  const w = Math.min(1, Math.max(part.w, 0.02));
  const h = Math.min(1, Math.max(part.h, 0.02));
  const x = Math.min(Math.max(part.x, 0), 1 - w);
  const y = Math.min(Math.max(part.y, 0), 1 - h);
  return {
    backgroundImage: `url(${image})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${(100 / w).toFixed(2)}% ${(100 / h).toFixed(2)}%`,
    backgroundPosition: `${w >= 1 ? 50 : (x / (1 - w)) * 100}% ${
      h >= 1 ? 50 : (y / (1 - h)) * 100
    }%`,
  };
};

// The crop's own proportions: the box is a fraction of a screenshot whose shape
// is `aspect`, so its shape is that scaled by the box's own ratio. Without this
// every crop would be squashed into whatever box the row gives it.
const cropAspect = (part, aspect) => {
  const ratio = ((part.w || 1) / (part.h || 1)) * (Number(aspect) > 0 ? Number(aspect) : 0.5);
  // Clamped: a full-width divider is not worth a row 20 screens wide, and a
  // hairline is not worth one 20 screens tall.
  return Math.min(6, Math.max(0.6, ratio));
};

function Icon({ children }) {
  return <span className="grid size-[22px] place-items-center text-[22px] leading-none">{children}</span>;
}

function Wireframe({ accent }) {
  return (
    <div className="flex h-full flex-col gap-[12px] bg-[#eff1f0] p-[18px]">
      <div className="flex items-center justify-between">
        <span className="h-[9px] w-[72px] rounded-full bg-[#aeb7b3]" />
        <span className="size-[20px] rounded-full border-2 border-[#aeb7b3]" />
      </div>
      <div className="h-[54px] rounded-[10px] border border-[#b9c1bd] bg-white p-[13px]">
        <span className="block h-[8px] w-[52%] rounded-full bg-[#cbd1ce]" />
      </div>
      <div className="flex-1 rounded-[12px] border border-[#b9c1bd] bg-white p-[14px]">
        <span className="mb-[13px] block h-[9px] w-[38%] rounded-full bg-[#9fa9a4]" />
        <span className="mb-[8px] block h-[7px] w-full rounded-full bg-[#d6dcda]" />
        <span className="block h-[7px] w-[72%] rounded-full bg-[#d6dcda]" />
      </div>
      <span className="h-[36px] rounded-[10px]" style={{ backgroundColor: accent }} />
    </div>
  );
}

// Wireframe drawing language.
//
// Greyscale, not colourless. Dropping the hues is what stops the drawing from
// reading as a bad mock-up of the screen it came from; keeping each element's
// *darkness* is what stops it from reading as a diagram of nothing. A black nav
// bar was the heaviest thing on the real screen and stays the heaviest thing
// here, a pale card stays quiet, and the hierarchy survives losing the colour.
//
// Everything else is notation: text becomes abcd at the size the real text was,
// a picture becomes a crossed box, an avatar a crossed circle. Same place, same
// size, no colour, no words.
//
// Six steps rather than a continuous ramp. The tone coming back from the
// analysis is an estimate read off an image, and estimates that disagree by a
// hundredth should not produce two visibly different greys — quantising means
// two things the model judged equally dark are drawn identically, which is what
// makes "these two are the same weight" legible in the drawing.
const WIRE_GREYS = ["#1c1c1c", "#4a4a4a", "#767676", "#a0a0a0", "#c8c8c8", "#e8e8e8"];
// The lightest step of the ramp rather than pure white, so that the white
// page is one of the six greys rather than pure white, so a pale card sits on a
// ground that belongs to the same scale it does.
const WIRE_PAPER = WIRE_GREYS[WIRE_GREYS.length - 1];

// Pictures get their own six greys, offset half a step from the ramp above.
//
// Still greyscale — the drawing has no colour in it and should not start now —
// but a picture never lands on exactly the grey of the thing it sits on, so it
// separates by tone wherever it is put. That is what tells a picture from a
// panel now that the cross through it is gone: the cross was the older, louder
// way of saying it, and forty of them on a screen read as a page of deletions.
const WIRE_IMAGE = ["#2b2b2b", "#5e5e5e", "#8b8b8b", "#b4b4b4", "#d8d8d8", "#f0f0f0"];

/**
 * Icon glyphs, drawn rather than stood in for.
 *
 * A chevron is a chevron — it says "back" to anyone who looks, and replacing it
 * with a circle throws away something the reader already knew for free. Paths
 * are authored on a 24x24 grid and scaled into whatever box the element has, so
 * one definition serves every size.
 */
const WIRE_ICONS = {
  "chevron-left": "M15 5 8 12l7 7",
  "chevron-right": "M9 5l7 7-7 7",
  "chevron-down": "M5 9l7 7 7-7",
  "arrow-right": "M4 12h15M13 6l6 6-6 6",
  "arrow-up-right": "M7 17 17 7M8 7h9v9",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  check: "M4 13l5 5L20 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16.2 16.2 21 21",
  more: "M12 6.2v.01M12 12v.01M12 17.8v.01",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 2.5l1.4 2.2 2.6-.5.6 2.5 2.4 1.1-1.2 2.3 1.2 2.3-2.4 1.1-.6 2.5-2.6-.5L12 21.5l-1.4-2.2-2.6.5-.6-2.5-2.4-1.1 1.2-2.3-1.2-2.3 2.4-1.1.6-2.5 2.6.5z",
  cart: "M3 5h2.2l2 10h9.6l2-7H6.4M9 19.5v.01M17 19.5v.01",
  speaker: "M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16 9a4.5 4.5 0 0 1 0 6",
  share: "M12 15V4M8 7.5 12 3.5l4 4M5 13v6.5h14V13",
  bookmark: "M6 3.5h12v17l-6-4.5-6 4.5z",
  flag: "M6 3.5v17M6 4.5h11l-2.5 4 2.5 4H6",
  bolt: "M13.5 2.5 5.5 13.5h5l-.5 8 8.5-11.5h-5z",
  target: "M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  clock: "M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M12 7.5V12l3 2",
  sparkle: "M12 3.5 13.8 9 19 10.8 13.8 12.6 12 18l-1.8-5.4L5 10.8 10.2 9z",
  wifi: "M3.5 9a13 13 0 0 1 17 0M6.5 12.5a8.5 8.5 0 0 1 11 0M9.5 16a4 4 0 0 1 5 0M12 19.5v.01",
  signal: "M4 19.5v-3M9.3 19.5v-7M14.7 19.5v-11M20 19.5v-15",
  battery: "M2.5 8.5h15v7h-15zM20 11v2",
  dot: "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5",
};

const clampUnit = (value) => Math.min(1, Math.max(0, Number(value) || 0));

/** The step this element's real lightness lands on. `tone` is 0 = black,
 *  1 = white; the ramp above runs the same way, so this is a direct lookup.
 *
 *  Missing tone means an upload analysed before the field existed. Those get
 *  the middle of the ramp rather than being dropped: an old wireframe should
 *  still draw, just without the weighting. */
const toneIndex = (tone) =>
  Math.round(clampUnit(tone === undefined || tone === null ? 0.5 : tone) * (WIRE_GREYS.length - 1));
const toneFill = (tone) => WIRE_GREYS[toneIndex(tone)];
/**
 * The edge: two steps away from the face it borders, in whichever direction has
 * room. Without it a near-white element on white paper would have no shape at
 * all — and "a white card sits here" is exactly the kind of thing a structure
 * view has to be able to say.
 *
 * Darker was the only direction once, which meant an element already sitting on
 * the darkest step got an edge its own colour and so no edge at all. On a dark
 * page that is every card on the screen, and four black cards overlapping with
 * no edges are one black shape.
 */
const toneEdge = (tone) => {
  const index = toneIndex(tone);
  return WIRE_GREYS[index <= 1 ? index + 2 : index - 2];
};

// In viewBox units, and the drawing is usually shown at about a third of that,
// so a hairline here would disappear on screen.
const WIRE_LINE = 4;
// The drawing is shown at about a third of the viewBox, so three units is the
// one screen pixel an annotation wants — present enough to follow, quiet
// enough not to join the design.
const WIRE_HAIRLINE = 3;

// Every letterform in the drawing.
//
// A run is as many letters as the real text had characters — not a filler
// repeated until the box is full. That is the difference between a drawing that
// says "type goes here" and one you can read a heading off: eight letters where
// there were eight, thirty where there were thirty, so the eye gets the length
// of the real words and the gaps between them.
//
// The alphabet cycles rather than repeating one word, so nothing about the
// filler suggests where one word ended and the next began — the run is a
// measurement, and a measurement should not imply structure it did not take.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const letterRun = (count, upper = false) => {
  let run = "";
  for (let i = 0; i < Math.max(1, Math.min(200, Math.round(count) || 1)); i += 1) {
    run += upper ? ALPHABET[i % ALPHABET.length].toUpperCase() : ALPHABET[i % ALPHABET.length];
  }
  return run;
};
const GLYPH_FONT = "'JetBrains Mono', ui-monospace, monospace";
// One monospaced glyph is 0.6em wide. This is what converts a character count
// into a width, so it has to match the font actually used above.
const GLYPH_ADVANCE = 0.581;

/**
 * How much of its em the stand-in font actually inks, measured in the browser.
 *
 * The data carries each text's real *ink* height, read off the screenshot. Ink
 * is what you see; `font-size` is an em, and how much of an em a font inks is
 * a property of that font. Measuring it here rather than baking a number means
 * the drawing is right whatever font ends up loading — a value measured on a
 * build machine that has no JetBrains Mono installed describes a fallback font
 * and not the one the page draws with.
 */
// How much of its em the stand-in font inks, measured in the browser — twice,
// because it depends on what is in the run.
//
//   full — lowercase, ascender down through the tail of a g or j
//   tall — uppercase, cap height down to the baseline
//
// The stand-in takes the case of the text it replaces, so these are the two
// runs actually drawn and not two guesses about one. All-caps English and
// Hangul both stop at the baseline; drawn in lowercase against the same ink
// their own tails would eat a quarter of it and the body would come out half
// the size. Drawn in uppercase the edges are the same edges, and the number
// below only converts ink to an em.
const GLYPH_INK_FALLBACK = { full: 0.965, tall: 0.72 };

function useGlyphInk() {
  const [ratio, setRatio] = useState(GLYPH_INK_FALLBACK);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let cancelled = false;
    const probe = () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
      const measureOf = (run) => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("font-family", GLYPH_FONT);
        text.setAttribute("font-size", "100");
        text.setAttribute("font-weight", "600");
        text.textContent = run;
        svg.appendChild(text);
        return text;
      };
      const withTails = measureOf("abcdefghij");
      const noTails = measureOf("ABCDEHIKLMN");
      document.body.appendChild(svg);
      const full = withTails.getBBox().height / 100;
      const tall = noTails.getBBox().height / 100;
      document.body.removeChild(svg);
      const sane = (v) => v > 0.3 && v < 2;
      if (!cancelled && sane(full) && sane(tall)) setRatio({ full, tall });
    };
    if (document.fonts?.ready) document.fonts.ready.then(() => !cancelled && probe());
    else probe();
    return () => { cancelled = true; };
  }, []);
  return ratio;
}

// The viewBox is the screenshot's own proportions, so a tall phone stays tall.
const WIREFRAME_UNITS = 1000;

const clampSigned = (value) => Math.min(1, Math.max(-1, Number(value) || 0));

/**
 * The four corners of a block, with `taper` narrowing one of the two horizontal
 * edges about the centre.
 *
 * This is what a rectangle lying back in perspective actually is: its far edge
 * is shorter than its near one. Drawn with both edges equal it stops being a
 * card seen at an angle and becomes a card seen flat on, which on a page built
 * out of tilted cards is the whole subject of the page thrown away.
 *
 * Positive taper narrows the top (leaning away), negative narrows the bottom.
 */
function taperedCorners(x, y, w, h, taper) {
  const k = clampSigned(taper);
  const top = k > 0 ? (k * w) / 2 : 0;
  const bottom = k < 0 ? (-k * w) / 2 : 0;
  return [
    [x + top, y],
    [x + w - top, y],
    [x + w - bottom, y + h],
    [x + bottom, y + h],
  ];
}

/**
 * A block as a path: tapered corners, bowed edges, rounded corners.
 *
 * `bend` bows the two *longer* edges, which is how a sheet of paper curls —
 * it wraps around one axis and the edges running along that axis stay put. The
 * shorter pair is left straight so the shape reads as bent rather than as a
 * blob.
 *
 * Corners are rounded by cutting back along each edge and turning through the
 * corner point itself, which works the same whether the edge arriving at that
 * corner was straight or bowed.
 */
function blockPath(x, y, w, h, { taper = 0, bend = 0, radius = 0 } = {}) {
  const points = taperedCorners(x, y, w, h, taper);
  const bow = clampSigned(bend) * Math.min(w, h) * 0.5;
  // Edge i runs from points[i] to points[(i+1) % 4]: top, right, bottom, left.
  const bowed = h >= w ? [false, true, false, true] : [true, false, true, false];

  const controls = points.map((from, i) => {
    const to = points[(i + 1) % 4];
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    if (!bow || !bowed[i]) return null;
    // Perpendicular to the edge, normalised, pushed out by the bow. Edges 1 and
    // 2 face the opposite way round the ring, so the sign flips for them and
    // the whole outline bends one way instead of pinching.
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const side = i === 1 || i === 2 ? 1 : -1;
    return [mid[0] + ((-dy / len) * bow * side), mid[1] + ((dx / len) * bow * side)];
  });

  // How far back from each corner the rounding starts, capped so two roundings
  // on a short edge cannot cross each other.
  const shortest = Math.min(
    ...points.map((from, i) => {
      const to = points[(i + 1) % 4];
      return Math.hypot(to[0] - from[0], to[1] - from[1]);
    }),
  );
  const r = Math.max(0, Math.min(radius, shortest / 2));

  const along = (from, to, distance) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / len) * distance, from[1] + (dy / len) * distance];
  };

  let d = "";
  for (let i = 0; i < 4; i += 1) {
    const from = points[i];
    const to = points[(i + 1) % 4];
    const control = controls[i];
    // Cut back toward whatever the edge actually heads for, so a bowed edge
    // starts its rounding along the curve rather than along the chord.
    const start = along(from, control ?? to, r);
    const end = along(to, control ?? from, r);
    d += i === 0 ? `M${start[0].toFixed(2)} ${start[1].toFixed(2)}` : "";
    d += control
      ? ` Q${control[0].toFixed(2)} ${control[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`
      : ` L${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
    if (r > 0) {
      const next = points[(i + 1) % 4];
      const following = points[(i + 2) % 4];
      const resume = along(next, controls[(i + 1) % 4] ?? following, r);
      d += ` Q${next[0].toFixed(2)} ${next[1].toFixed(2)} ${resume[0].toFixed(2)} ${resume[1].toFixed(2)}`;
    }
  }
  return `${d} Z`;
}

/** Is this element anything other than an upright rectangle? */
const isWarped = ({ rotate, taper, bend }) =>
  Boolean((Number(rotate) || 0) || (Number(taper) || 0) || (Number(bend) || 0));

/**
 * Corner radius for a box, in viewBox units.
 *
 * A measured `radius` wins over everything. It is the difference between a
 * design that rounds everything to a soft 24 and one that rounds to a crisp 8,
 * and a formula cannot tell those apart — it gives both the same fraction of
 * their own size, which is exactly the information a structure view is supposed
 * to carry and the reason every screen used to come out looking alike.
 *
 * The `shape` and `role` branches below are only the fallback for uploads
 * analysed before the field existed.
 */
function cornerRadius(role, shape, w, h, radius, frameWidth) {
  if (Number.isFinite(radius) && radius > 0 && frameWidth) {
    return Math.min(radius * frameWidth, Math.min(w, h) / 2);
  }
  if (shape === "원") return Math.min(w, h) / 2;
  if (Number.isFinite(radius)) return 0;
  if (shape === "사각형") return 0;
  if (shape === "둥근사각형") return Math.min(w, h) * 0.16;
  if (role === "칩" || role === "버튼" || role === "검색바") return Math.min(h / 2, 16);
  if (role === "아이콘") return Math.min(w, h) / 2;
  return 8;
}

/** One line of stand-in type: `chars` letters, set to fit the measured box.
 *
 *  The size is the smaller of what the line height allows and what the width
 *  allows for this many letters. Both readings matter and they are measurements
 *  of different things — the line height is how tall the real type was, the
 *  width over the character count is how wide its glyphs were — so taking the
 *  smaller keeps the run inside the box the real text occupied while still
 *  spending the whole of it when the two agree.
 *
 *  Monospace makes that arithmetic hold: every letter is the same width, so
 *  `chars` letters really is `chars` times one advance and not a guess that
 *  drifts with which letters happen to be in the run. */
function TextRun({ x, y, w, lineHeight, chars, fill, align, clipId, ink, inkPerEm, descends, weight }) {
  const anchor = align === "가운데" ? "middle" : align === "오른쪽" ? "end" : "start";
  const anchorX = align === "가운데" ? x + w / 2 : align === "오른쪽" ? x + w : x;
  const count = Math.max(1, Math.round(chars) || 1);
  // Measured ink wins; without it the old box-derived guess still stands in.
  const per = descends ? inkPerEm.full : inkPerEm.tall;
  const size = ink > 0 ? ink / per : Math.min(lineHeight * 0.74, w / (count * GLYPH_ADVANCE));

  return (
    <text
      x={anchorX}
      // Centred in its line box, not hung from the top of it. The size is the
      // smaller of what the height allows and what the width allows, so a run
      // squeezed by its width comes out shorter than its box — measured from
      // the top that leaves it sitting high, which on a button label reads as
      // the label having slipped. Cap height is about 0.7 of the size, so half
      // of it below the middle puts the middle of the letters on the middle of
      // the box.
      y={y + lineHeight / 2 + size * 0.35}
      textAnchor={anchor}
      fontFamily={GLYPH_FONT}
      fontSize={size}
      fontWeight={weight || 600}
      fill={fill}
      data-ink={ink > 0 ? ink : undefined}
      clipPath={clipId ? `url(#${clipId})` : undefined}
    >
      {letterRun(count, !descends)}
    </text>
  );
}

/**
 * How wide to draw one component state in the sheet.
 *
 * Given the panel's full width, a component taller than it is wide comes back
 * that many times taller again — the grocery category rail is 34:142, so at
 * full width it would run four panel widths down the page and the sheet would
 * be one component long. Anything clearly upright is held to a third of the
 * width and takes its height from its own proportions.
 */
const stateWidth = (aspect) => (Number(aspect) < 0.9 ? "33%" : "100%");

/**
 * One component card — Figma 211:3476.
 *
 * States stack down the card with their name above each drawing, and the card
 * closes with the tags the component belongs to and its measurement. No title:
 * the design leaves it out, and it is right to — a chip called 칩 twice over is
 * the tag repeating the heading, while the size is the thing you cannot get by
 * looking.
 *
 * Widths are worked back from a target drawing height so that a wide component
 * and a tall one come out the same weight on the page, held between a third of
 * the card and its full width. Left to fill the width, the grocery rail at
 * 34:142 would be four cards tall on its own.
 */
// Exported for the phone: the component tab there places these directly.
export function PieceCard({ piece, compact }) {
  // A nav bar is 32:1. Held to a third of the row it comes back as a thread,
  // so anything this wide takes the whole row instead and keeps a height you
  // can read the spacing off.
  const wide = Number(piece.aspect) > 6;
  return (
    <div
      className="flex min-w-0 flex-col items-center overflow-hidden rounded-[12px] border border-solid border-[#e7e6e3] bg-[#f7f7f5]"
      style={{ gap: compact ? 12 : 24, padding: compact ? 10 : 20, gridColumn: wide ? "1 / -1" : undefined }}
    >
      <div
        className="flex w-full flex-1 flex-col items-center justify-center"
        style={{ gap: compact ? 14 : 30 }}
      >
        {piece.states.map((state) => (
          <div key={state.label} className="flex w-full flex-col items-center gap-[4px]">
            <p className="snapkeep-piece-state">{state.label}</p>
            <div style={{ width: stateWidth(piece.aspect) }}>
              <LayoutWireframe layout={state.layout} aspect={piece.aspect} compact={false} paper={false} />
            </div>
          </div>
        ))}
      </div>
      <div className="snapkeep-piece-foot">
        <div className="flex flex-wrap gap-[6px]">
          {(piece.tags ?? []).map((tag) => (
            <span key={tag} className="snapkeep-piece-tag">
              {tag}
            </span>
          ))}
        </div>
        {piece.spec && (
          <p className="snapkeep-piece-spec">{piece.spec}</p>
        )}
      </div>
    </div>
  );
}

/** One element, drawn in the notation for whatever it is: its real box, its
 *  real darkness, and no colour or words. */
function WireBlock({
  role, x, y, w, h, tone, shape, radius, border, taper, bend,
  lines, chars, align, icon, ink, descends, weight, inkPerEm, clipId, frameWidth,
}) {
  const fill = role === "이미지" ? WIRE_IMAGE[toneIndex(tone)] : toneFill(tone);
  const edge = toneEdge(tone);
  const rx = cornerRadius(role, shape, w, h, radius, frameWidth);

  // A border is drawn only where the real element had one, at the weight it had.
  //
  // Everything used to get the same two-step-darker outline at the same weight.
  // That is what made every reference come out looking like the same reference:
  // an outline around a filled shape is a strong mark, and putting an identical
  // one on all forty elements of every screen drowns out the differences that
  // the drawing exists to show. A filled card has no outline, so it gets none —
  // its edge is the tone change against what it sits on, which is exactly how
  // the edge reads on the real screen.
  //
  // The floor keeps a hairline visible: this is drawn at about a third of the
  // viewBox, so a border under ~2 units would vanish and read as "no border",
  // which is a different design.
  const stroke = Number.isFinite(border) && border > 0 && frameWidth
    ? { stroke: edge, strokeWidth: Math.max(2, border * frameWidth) }
    : null;

  // Legacy uploads, analysed before `border` existed, keep the old outline so
  // their wireframes do not silently turn into a field of flat rectangles.
  const legacyStroke = border === undefined ? { stroke: edge, strokeWidth: WIRE_LINE } : null;
  const outline = stroke ?? legacyStroke;

  // An upright rectangle stays a <rect> — crisper, and the overwhelming
  // majority of elements are one. Anything tapered or bowed becomes a path.
  const warped = Boolean(taper || bend);
  const box = warped
    ? { d: blockPath(x, y, w, h, { taper, bend, radius: rx }), fill, ...(outline ?? {}) }
    : { x, y, width: w, height: h, rx, fill, ...(outline ?? {}) };
  const Box = warped ? "path" : "rect";

  switch (role) {
    // The page's own ground, and the only element allowed to cover the frame.
    // Present only when the real screen was not on white — a dark site's white
    // headline is invisible on white paper, and losing it loses the loudest
    // thing on the page. No edge: paper has no border.
    // Not part of the screen: a mark around one placed component, so the
    // structure view can show which of its parts are a component repeated and
    // which were put down one at a time. Unfilled, hairline, and shaped like
    // the component it wraps.
    case "컴포넌트": {
      const marker = { fill: "none", stroke: WIRE_GREYS[2], strokeWidth: WIRE_HAIRLINE };
      if (shape === "원") {
        return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...marker} />;
      }
      return warped ? (
        <path d={blockPath(x, y, w, h, { taper, bend, radius: rx })} {...marker} />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={rx} {...marker} />
      );
    }

    case "배경":
      return <rect x={x} y={y} width={w} height={h} fill={fill} />;

    // The crossed box: the one piece of wireframe notation everybody already
    // reads as "a picture goes here". Round when the picture was round, which
    // is what an avatar is.
    //
    // An icon is a circle. Always, whatever glyph was really there.
    //
    // Two marks are enough for the whole vocabulary of pictorial things: a
    // crossed box is a picture, a circle is an icon. Drawing the real glyph, or
    // even crossing the circle, spends detail on the one part of a screen whose
    // specifics this view is not deciding — and buys noise, because at icon size
    // any of it is a smudge.
    case "아이콘": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const glyph = WIRE_ICONS[icon];
      if (!glyph) {
        return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={fill} {...(outline ?? {})} />;
      }
      // Drawn on a 24x24 grid and fitted to the shorter side, so the glyph
      // keeps its proportions inside a box that may not be square.
      const size = Math.min(w, h);
      const scale = size / 24;
      return (
        <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})`}>
          <path
            d={glyph}
            fill="none"
            stroke={fill}
            // 1.6 of the 24 grid — about 7% of the icon, which is where drawn
            // icon sets sit. Weight scales with the glyph rather than being
            // fixed in the drawing's units: the structural line is the right
            // weight for a line that crosses a screen and far too heavy inside
            // something the size of a fingernail. The floor keeps the smallest
            // icons from thinning out to nothing.
            strokeWidth={Math.max(1.6, (WIRE_LINE * 0.5) / scale)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    }

    // The crossed box, or a crossed ellipse where the picture is round.
    //
    // `shape` follows the container that clips the picture, not the outline of
    // the artwork inside it. A photograph dropped into the rounded end of a
    // speech bubble is a circle here because the bubble cuts it into one; a
    // cutout floating free on a page — a lime, a mascot, a shoal of fish — is
    // still a rectangle, because what this view draws is the space the picture
    // occupies in the layout and not the silhouette of what was drawn.
    //
    // Which is also why the box stays even when the real picture has no frame
    // at all. Dropping it and leaving a bare X would say nothing about how far
    // the picture reaches, and reach is the whole subject here.
    case "이미지":
      // No cross through it any more: the tint is what marks it as a picture,
      // and the cross was the older, louder way of saying the same thing.
      return shape === "원" ? (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} {...(outline ?? {})} />
      ) : (
        <Box {...box} />
      );

    // Text is the one thing with no box of its own — a paragraph is its letters
    // and the space they take, not a rectangle around them. `tone` here is the
    // ink, so pale grey captions stay pale next to black headings.
    case "텍스트": {
      const glyphInk = (Number(ink) || 0) * WIREFRAME_UNITS;
      const count = Math.max(1, Math.min(12, Number(lines) || 1));

      // A label turned on its side, which is what a vertical category rail is.
      // Drawn flat it would be one enormous letter in a tall thin box — the
      // size comes from the line height, and for this box the line height is
      // the long side. Turning it puts the long side along the reading
      // direction, where it belongs.
      //
      // No clip here: the run is already fitted to the width by TextRun, and
      // the clip rects live in the drawing's unrotated space, so applying one
      // inside this group would cut the text against a box at right angles to
      // it.
      if (count === 1 && h > w * 1.6) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        return (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <TextRun
              x={cx - h / 2}
              y={cy - w / 2}
              w={h}
              lineHeight={w}
              chars={chars}
              ink={glyphInk}
              inkPerEm={inkPerEm}
              descends={descends}
              weight={weight}
              fill={fill}
              align={align}
              clipId={null}
            />
          </g>
        );
      }

      const lineHeight = h / count;
      return (
        <g>
          {Array.from({ length: count }, (_, i) => {
            // A paragraph's last line runs short, the way a real one does — so
            // it gets proportionally fewer letters rather than a shorter box,
            // which is what keeps the letters themselves the same size as the
            // lines above.
            const last = i === count - 1 && count > 1;
            return (
              <TextRun
                key={i}
                x={x}
                y={y + lineHeight * i}
                w={w}
                lineHeight={lineHeight}
                chars={last ? Math.max(1, Math.round(chars * 0.62)) : chars}
                ink={glyphInk}
                inkPerEm={inkPerEm}
              descends={descends}
                descends={descends}
                weight={weight}
                fill={fill}
                align={align}
                clipId={clipId}
              />
            );
          })}
        </g>
      );
    }

    // A rule, not a box: height is whatever the model reported, and what makes
    // it read as a divider is that it is drawn solid at its own darkness.
    case "구분선":
      return <rect x={x} y={y} width={w} height={Math.max(WIRE_LINE, h)} fill={fill} />;

    // A line that is not straight — the rail a row of items is threaded along,
    // an arc sweeping through a screen. Nothing else in this notation can say
    // "curve": a box with rounded corners is still a box, and a screen built
    // around an arc drawn as a stack of rectangles is a different screen.
    //
    // The element's box is the envelope the curve travels through rather than
    // a shape to fill: the run follows the longer side, and `bend` bows it out
    // across the shorter one.
    case "곡선": {
      const vertical = h >= w;
      const bow = clampSigned(bend);
      const [from, control, to] = vertical
        ? [
            [x + w / 2, y],
            [x + w / 2 + bow * w, y + h / 2],
            [x + w / 2, y + h],
          ]
        : [
            [x, y + h / 2],
            [x + w / 2, y + h / 2 + bow * h],
            [x + w, y + h / 2],
          ];
      return (
        <path
          d={`M${from[0]} ${from[1]} Q${control[0]} ${control[1]} ${to[0]} ${to[1]}`}
          fill="none"
          stroke={fill}
          strokeWidth={outline?.strokeWidth ?? WIRE_LINE}
          strokeLinecap="round"
        />
      );
    }

    // Everything else is its box at its own weight. The role no longer changes
    // what is drawn, only how the corners round — a button is a button because
    // of where it sits and how dark it is, and the label on top of it is its
    // own element.
    default:
      return <Box {...box} />;
  }
}

/** A wireframe redrawn from the analysis's own block list, so the structure
    tab shows this screenshot's layout rather than a generic placeholder.

    Drawn as SVG rather than positioned divs because `preserveAspectRatio`
    letterboxes the whole drawing to whatever box it is given. Percentage
    divs would stretch a 9:19.5 phone layout flat across a wide panel. */
export function LayoutWireframe({ layout, aspect, compact, paper = true, fill = false }) {
  const inkPerEm = useGlyphInk();
  const svgRef = useRef(null);


  const height = WIREFRAME_UNITS;
  const width = Math.round(height * (Number(aspect) > 0 ? Number(aspect) : 0.5));

  // Placed once here rather than inside each block: the boxes are needed both
  // for drawing and for clipping the text, and computing them twice is how the
  // clip ends up one rounding off the thing it is supposed to be clipping.
  const blocks = layout
    .map((block, index) => {
      const x = clampUnit(block.x);
      const y = clampUnit(block.y);
      // Clamped against the origin so a block that overshoots the frame is
      // trimmed at the edge instead of pushing past it.
      return {
        block,
        index,
        x: x * width,
        y: y * height,
        w: Math.min(1 - x, clampUnit(block.w)) * width,
        h: Math.min(1 - y, clampUnit(block.h)) * height,
      };
    })
    .filter(({ w, h }) => w >= 2 && h >= 2);

  // Ids have to be unique across the document: a card and the detail panel can
  // both be drawing the same reference at the same moment, and two clipPaths
  // sharing an id means one of the two drawings silently uses the other's box.
  // Stripped to alphanumerics: useId's own format has varied across React
  // versions (`:r0:`, `«r0»`), and those characters are not safe inside the
  // unquoted `url(#…)` a clip-path reference is.
  const scope = `wf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Text is the only thing clipped now, and only as a guard against an
  // over-long run: a picture is drawn as notation rather than as a window onto
  // the screenshot, so it has no window to cut.
  const clipped = blocks.filter(({ block }) => block.role === "텍스트");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof document === "undefined") return undefined;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      const runs = svg.querySelectorAll("text[data-ink]");
      for (const node of runs) {
        const target = Number(node.dataset.ink);
        if (!(target > 0)) continue;
        node.setAttribute("font-size", "100");
        let at100 = 0;
        try {
          at100 = node.getBBox().height;
        } catch {
          at100 = 0;
        }
        if (at100 > 0) {
          const size = (100 * target) / at100;
          node.setAttribute("font-size", String(size));
        }
      }
    };
    fit();
    // Again once the webfont lands: its metrics are not the fallback's.
    document.fonts?.ready?.then(fit);
    return () => {
      cancelled = true;
    };
  }, [layout, width, height, inkPerEm]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      // `slice` is cover and `meet` is contain. A card in the phone's grid
      // asks for cover, because the 원본 beside it is an <img> with
      // object-cover object-top and a 구조 that letterboxes into grey bands
      // instead reads as a different kind of card rather than the same card
      // in a different view. Top-aligned for the same reason.
      preserveAspectRatio={fill ? "xMidYMin slice" : "xMidYMid meet"}
      // On a card the well is a fixed 1.43:1 box, so the drawing letterboxes
      // itself into it. In the detail panel the well has no height of its own,
      // so `h-full` would resolve to nothing and the height comes from the
      // viewBox instead.
      className={`block ${paper ? "bg-[#eff1f0]" : ""} ${compact ? "size-full" : "h-auto w-full"}`}
      role="img"
      aria-label="화면 구조 와이어프레임"
    >
      <defs>
        {clipped.map(({ index, x, y, w, h }) => (
          <clipPath key={index} id={`${scope}-${index}`}>
            <rect x={x} y={y} width={w} height={h} />
          </clipPath>
        ))}
      </defs>
      {paper && <rect width={width} height={height} fill={WIRE_PAPER} />}
      {blocks.map(({ block, index, x, y, w, h }) => {
        // Rotation is applied here rather than inside the block so that every
        // notation gets it for free — a label on a tilted card turns with the
        // card, a crossed box turns, a curve turns. About the element's own
        // centre, so `x`/`y` stay the upright position they were measured at
        // and the angle is the only thing the rotation changes.
        const angle = Number(block.rotate) || 0;
        const drawn = (
          <WireBlock
            key={index}
            role={block.role}
            x={x}
            y={y}
            w={w}
            h={h}
            tone={block.tone}
            shape={block.shape}
            radius={block.radius}
            border={block.border}
            taper={block.taper}
            bend={block.bend}
            lines={block.lines}
            chars={block.chars}
            ink={block.ink}
            descends={block.descends}
            weight={block.weight}
            inkPerEm={inkPerEm}
            icon={block.icon}
            align={block.align}
            clipId={`${scope}-${index}`}
            frameWidth={width}
          />
        );
        if (!angle) return drawn;
        return (
          <g key={index} transform={`rotate(${angle} ${x + w / 2} ${y + h / 2})`}>
            {drawn}
          </g>
        );
      })}
    </svg>
  );
}

/** Component view. Root has to be a div — a bare span here would pick up the
    bookmark styling that index.css applies to `> div:first-child > span`. */
function ComponentSheet({ reference, compact }) {
  // Real artwork when the reference has it — each component shown in both of
  // its states side by side, since that pairing is the point of the view.
  if (reference.components) {
    return (
      <div className={`flex h-full flex-col justify-center bg-[#eff1f0] ${compact ? "gap-[8px] p-[12px]" : "gap-[12px] p-[18px]"}`}>
        {reference.components.map((component) => (
          <div key={component.name} className="rounded-[10px] border border-[#e2e6e3] bg-white p-[10px]">
            <p className={`${compact ? "text-[10px]" : "text-[12px]"} font-semibold`}>{component.name}</p>
            <div className="mt-[6px] flex items-center justify-around gap-[8px]">
              <img src={component.default} alt="" className="max-h-[64px] min-w-0 flex-1 object-contain" />
              <img src={component.selected} alt="" className="max-h-[64px] min-w-0 flex-1 object-contain" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // An analysed upload: the components the model picked out, cut from the
  // screenshot itself. Real pixels, so it can be checked against the original.
  if (reference.parts?.length && reference.image) {
    return (
      <div className={`flex h-full flex-col justify-center bg-[#eff1f0] ${compact ? "gap-[6px] p-[12px]" : "gap-[10px] p-[18px]"}`}>
        {reference.parts.slice(0, compact ? 3 : 5).map((part, index) => (
          <div
            key={`${part.label}-${index}`}
            className="flex items-center gap-[10px] rounded-[10px] border border-[#e2e6e3] bg-white p-[8px]"
          >
            <span
              className="shrink-0 overflow-hidden rounded-[6px] border border-black/10 bg-[#f2f4f3]"
              style={{
                ...cropStyle(reference.image, part),
                height: compact ? 26 : 34,
                width: (compact ? 26 : 34) * cropAspect(part, reference.aspect),
              }}
            />
            <span className={`min-w-0 flex-1 truncate ${compact ? "text-[10px]" : "text-[11px]"} font-semibold`}>
              {part.label}
            </span>
            {!compact && (
              <span className="shrink-0 text-[10px] text-[#7c847f]">{part.role}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Drawn components: the same notation as the structure tab, one element at a
  // time, with whichever of its states the screen actually shows. Each state is
  // a miniature layout, so it goes through the drawing code the screens use and
  // there is nothing here that knows how to paint a chip.
  if (reference.pieces?.length) {
    return (
      <div className={`grid h-full grid-cols-3 content-center gap-[8px] overflow-hidden bg-[#eff1f0] ${compact ? "p-[10px]" : "p-[14px]"}`}>
        {reference.pieces.map((piece) => (
          <PieceCard key={piece.name} piece={piece} compact={compact} />
        ))}
      </div>
    );
  }

  // Nothing to show. Previously three invented colour swatches appeared here,
  // identical for every reference — a card, a filter chip and a primary button
  // that no screen had been looked at to produce. A view that says the same
  // thing about everything is saying nothing, and worse, it looks like it read
  // the screen.
  return (
    <div className="flex h-full items-center justify-center bg-[#eff1f0] px-[24px] text-center">
      <p className="text-[11px] leading-[1.5] text-[#7c847f]">
        이 레퍼런스는 아직 컴포넌트를 정리하지 않았어요.
      </p>
    </div>
  );
}


/**
 * Measures a reference's type from its own screenshot, in the browser.
 *
 * The built-in references used to carry a table of sizes generated offline. It
 * was measured on a machine with no JetBrains Mono installed and against a
 * rasteriser that is not the one the page draws with, so the numbers described
 * a font nobody sees — and worse, it meant the eight shipped screens were
 * measured by one implementation and every uploaded screen by another.
 *
 * The image is already a bundled asset and the canvas is already how uploads
 * are measured, so a reference can simply measure itself. One implementation,
 * running where the pixels and the font both are.
 */
const typeCache = new Map();

function useMeasuredLayout(reference) {
  const [measured, setMeasured] = useState(() => typeCache.get(reference?.id) ?? null);

  useEffect(() => {
    const id = reference?.id;
    const layout = reference?.layout;
    if (!id || !layout?.length || !reference.image) return undefined;
    if (typeCache.has(id)) {
      setMeasured(typeCache.get(id));
      return undefined;
    }
    if (typeof document === "undefined") return undefined;

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      let next = layout;
      try {
        next = withMeasuredType(layout, measureType(context.getImageData(0, 0, canvas.width, canvas.height), layout));
      } catch {
        next = layout;
      }
      typeCache.set(id, next);
      if (!cancelled) setMeasured(next);
    });
    image.src = reference.image;
    return () => {
      cancelled = true;
    };
  }, [reference?.id, reference?.image, reference?.layout]);

  return measured ?? reference?.layout;
}

// Exported for the phone, which draws the same three views in its own layout.
export function ReferencePreview({ reference, view, compact, fill }) {
  const layout = useMeasuredLayout(reference);
  if (view === "structure") {
    // Hand-made artwork wins; then a wireframe drawn from this screenshot's
    // own analysed layout; then the generic stand-in, which is all a
    // reference has when the analysis ran locally (no key, static build).
    //
    // object-top matches the original view, so the two tabs stay on the same
    // part of a tall screen instead of jumping when you switch.
    if (reference.structure) {
      return <img src={reference.structure} alt="" className="h-full w-full object-cover object-top" />;
    }
    if (layout?.length) {
      return <LayoutWireframe layout={layout} aspect={reference.aspect} compact={compact} fill={fill} />;
    }
    return <Wireframe accent={reference.accent} />;
  }
  if (view === "component") return <ComponentSheet reference={reference} compact={compact} />;
  if (reference.image) return <img src={reference.image} alt="" className="h-full w-full object-cover object-top" />;
  return (
    <div className="flex h-full flex-col justify-between p-[18px]" style={{ backgroundColor: `${reference.accent}22` }}>
      <div className="flex gap-[6px]">
        <span className="h-[8px] w-[45px] rounded-full bg-black/25" />
        <span className="h-[8px] w-[32px] rounded-full bg-black/10" />
      </div>
      <div className="rounded-[13px] bg-white p-[14px]">
        <span className="mb-[10px] block h-[8px] w-[62%] rounded-full bg-black/20" />
        <span className="block h-[7px] w-full rounded-full bg-black/10" />
      </div>
    </div>
  );
}

function ReferenceCard({ reference, groups, view, saved, onOpen, onToggleSaved }) {
  // The two chips on the card follow the tags, so editing them in the detail
  // panel shows up here too.
  const tagIn = (label) => groups.find((group) => group.label === label)?.tags[0];
  const platform = tagIn("플랫폼");
  const screen = tagIn("화면 유형");

  const toggleSaved = (event) => {
    // The bookmark sits inside the card button, so the click must not also open
    // the detail panel.
    event.preventDefault();
    event.stopPropagation();
    onToggleSaved();
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-[1.43/1] w-full overflow-hidden rounded-[14px] border border-[#e7e6e3] bg-white p-[10px] text-left transition-transform hover:-translate-y-[3px]"
    >
      <div className="relative size-full overflow-hidden rounded-[10px] bg-[#edf0ee]">
        <ReferencePreview reference={reference} view={view} compact />
        <span
          role="button"
          tabIndex={0}
          aria-label={saved ? `${reference.title} 저장 해제` : `${reference.title} 저장`}
          aria-pressed={saved}
          data-saved={String(saved)}
          onClick={toggleSaved}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") toggleSaved(event);
          }}
          className="absolute right-[6px] top-[6px] grid size-[32px] place-items-center rounded-full bg-white/90 p-[4px]"
        >
          <img src={bookmarkIcon} alt="" className="size-[20px]" />
        </span>
        <div className="absolute inset-x-[10px] bottom-[10px] flex flex-wrap gap-[6px]">
          {platform && <span className="inline-flex items-center rounded-[50px] border border-[#e7e6e3] bg-white px-[12px] py-[6px] text-[10px] font-medium tracking-[-0.2px] text-[#1d1c1c]">{platform}</span>}
          {screen && <span className="inline-flex items-center rounded-[50px] border border-[#e7e6e3] bg-white px-[12px] py-[6px] text-[10px] font-medium tracking-[-0.2px] text-[#1d1c1c]">{screen}</span>}
        </div>
      </div>
    </button>
  );
}

const ANALYZED_AT = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

const formatAnalyzedAt = (value) => {
  const analyzedAt = new Date(value);
  return Number.isNaN(analyzedAt.valueOf()) ? null : ANALYZED_AT.format(analyzedAt);
};

/** Says which analysis actually ran, when, and on what evidence. */
function AnalysisRecord({ analysis }) {
  const analyzedAt = formatAnalyzedAt(analysis.analyzedAt);
  const label = analysis.source === "claude" ? `${analysis.model ?? "Claude"} 분석` : "로컬 분석";

  return (
    <span className="snapkeep-analysis-record">
      <span className="snapkeep-analysis-source">
        {label}
        {analyzedAt && ` · ${analyzedAt}`}
      </span>
      {analysis.basis && <span className="snapkeep-analysis-basis">{analysis.basis}</span>}
      {analysis.fallbackReason && <span className="snapkeep-analysis-basis">{analysis.fallbackReason}</span>}
    </span>
  );
}

function DetailPanel({ reference, groups, initialTab, onAddTag, onRemoveTag, onClose, onDelete }) {
  // The grid's own toggle decides which tab opens: the panel is keyed by
  // reference id, so it mounts fresh each time and picks this up on the way in.
  const [tab, setTab] = useState(initialTab ?? "original");
  const [addingGroup, setAddingGroup] = useState(null);
  const [draftTag, setDraftTag] = useState("");

  const commitTag = () => {
    const value = draftTag.trim();
    if (value) onAddTag(addingGroup, value);
    setAddingGroup(null);
    setDraftTag("");
  };

  // 이 그룹이 가진 필터 값 중 아직 안 붙은 것들. 입력 중이면 그 글자로
  // 좁혀서, 목록이 길어져도 원하는 값이 바로 보이게 합니다.
  const suggestionsFor = (group) => {
    const already = new Set(group.tags);
    const typed = draftTag.trim().toLowerCase();
    return (OPTIONS_BY_GROUP[group.label] ?? []).filter(
      (option) =>
        !already.has(option) &&
        (!typed || option.toLowerCase().includes(typed)),
    );
  };

  // The real artwork for the current tab, when there is any. Null means this
  // tab falls back to something drawn in code, which needs a fixed height.
  const previewImage = tab === "structure" ? reference.structure : tab === "original" ? reference.image : null;
  // A wireframe drawn from this screenshot's analysed layout is real content,
  // not a placeholder, so it earns the same tall well the screenshots get —
  // only the generic stand-in stays in the short one.
  const showsWireframe =
    tab === "structure" && !reference.structure && reference.layout?.length > 0;

  return (
    <aside className="absolute bottom-0 right-0 top-0 z-30 flex w-[465px] flex-col border-l border-[#e1e5e2] bg-[#fbfcfa] p-[30px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[1.1px] text-[#017c6e]">REFERENCE DETAIL</p>
          <h3 className="mt-[7px] font-['Plus_Jakarta_Sans'] text-[27px] font-semibold tracking-[-1.2px]">{reference.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="snapkeep-detail-close grid size-[34px] place-items-center rounded-full bg-[#edf0ee] text-[20px] text-[#4d5751]" aria-label="상세 닫기">×</button>
      </div>

      <div className="mt-[27px] flex rounded-full bg-[#e7e6e3] p-[3px]">
        {DETAIL_TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 rounded-full py-[9px] text-[12px] font-semibold ${tab === value ? "bg-white text-[#1d1c1c]" : "text-[#6b716e]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* This is a detail view, so a real screenshot is shown whole: the width
          is the panel's and the height follows the image. The `h-[265px]` class
          is deliberately gone — index.css pinned the well to 360px through
          `div:nth-of-type(3)[class*="h-[265px]"]`, and dropping the class is
          what releases that. The border and spacing that rule also supplied are
          restored here. It still has to stay the third div.

          Only the drawn stand-ins (wireframe, empty-state) keep a fixed height,
          since they have no aspect ratio of their own to follow. */}
      {tab !== "component" && (
        <div
          className={`relative mt-[18px] shrink-0 overflow-hidden rounded-[12px] border border-[#e7e6e3] bg-[#edf0ee] ${previewImage || showsWireframe ? "" : "h-[360px]"}`}
        >
          {previewImage ? (
            /* Full width, natural height — the screenshot is shown whole and
               the panel grows around it rather than the image being squeezed
               into a fixed box. `shrink-0` above is what makes that stick:
               the panel is a flex column, so without it the well would be
               shrunk back to whatever space was left over.

               Only the drawn stand-ins keep a fixed height, since they have
               no aspect ratio of their own to follow. */
            <img src={previewImage} alt="" className="block h-auto w-full" />
          ) : (
            <ReferencePreview reference={reference} view={tab === "structure" ? "structure" : "original"} />
          )}

          <button
            type="button"
            onClick={onDelete}
            className="snapkeep-image-delete absolute bottom-[12px] right-[12px]"
          >
            삭제
          </button>
        </div>
      )}

      {tab === "component" ? (
        <div className="mt-[18px] space-y-[10px]">
          {reference.components
            ? reference.components.map((component) => (
                <div key={component.name} className="rounded-[13px] border border-[#e2e6e3] bg-white p-[12px]">
                  <p className="text-[13px] font-semibold">{component.name}</p>
                  {/* Same pill shape the reference's own tags use, so the two
                      read as one vocabulary. */}
                  <div className="snapkeep-component-tags mt-[8px] flex flex-wrap gap-[6px]">
                    {component.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[#dfe5e1] bg-white px-[10px] py-[6px]">{tag}</span>
                    ))}
                  </div>
                  {/* Both states together — the artwork already labels which
                      is which, so they are shown plain. */}
                  <div className="mt-[10px] flex items-center justify-around gap-[12px]">
                    <img src={component.default} alt={`${component.name} 기본 상태`} className="max-h-[110px] min-w-0 flex-1 object-contain" />
                    <img src={component.selected} alt={`${component.name} 선택 상태`} className="max-h-[110px] min-w-0 flex-1 object-contain" />
                  </div>
                </div>
              ))
            : reference.parts?.length && reference.image
              ? reference.parts.map((part, index) => (
                  /* Cut from this screenshot, at the box the analysis gave —
                     so what is shown can be checked against the original
                     rather than taken on trust. */
                  <div key={`${part.label}-${index}`} className="rounded-[13px] border border-[#e2e6e3] bg-white p-[12px]">
                    <div className="flex items-baseline justify-between gap-[10px]">
                      <p className="text-[13px] font-semibold">{part.label}</p>
                      <span className="shrink-0 text-[11px] text-[#7c847f]">{part.role}</span>
                    </div>
                    <div className="mt-[10px] flex justify-center rounded-[9px] bg-[#eff1f0] p-[10px]">
                      <span
                        className="max-w-full rounded-[6px] border border-black/10 bg-white"
                        style={{
                          ...cropStyle(reference.image, part),
                          height: 84,
                          width: 84 * cropAspect(part, reference.aspect),
                        }}
                      />
                    </div>
                    {part.spec && (
                      <p className="mt-[8px] text-[11px] leading-[1.5] text-[#7c847f]">{part.spec}</p>
                    )}
                  </div>
                ))
              : reference.pieces?.length
                ? [
                    <div key="pieces" className="grid grid-cols-3 gap-[12px]">
                      {reference.pieces.map((piece) => (
                        <PieceCard key={piece.name} piece={piece} compact={false} />
                      ))}
                    </div>,
                  ]
                : (
                    <p className="text-[12px] leading-[1.6] text-[#7c847f]">
                      이 레퍼런스는 아직 컴포넌트를 정리하지 않았어요.
                    </p>
                  )}
        </div>
      ) : (
        <>
          <div className="snapkeep-detail-meta">
            {groups.map((group) => (
              <div key={group.label} className="snapkeep-detail-meta-row">
                <span className="snapkeep-detail-meta-label">{group.label}</span>
                <div className="snapkeep-detail-meta-tags">
                  {group.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[#dfe5e1] bg-white px-[10px] py-[6px] text-[11px] text-[#536059]">
                      {tag}
                      <button
                        type="button"
                        onClick={() => onRemoveTag(group.label, tag)}
                        aria-label={`${tag} 태그 삭제`}
                        className="ml-[6px] align-middle text-[#969d99]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {addingGroup === group.label ? (
                    // Typing still works, but the group's own filter values are
                    // listed underneath so you can see what this group actually
                    // holds instead of having to remember it. Free text stays
                    // allowed — it is how a value that is not in the taxonomy
                    // yet gets added at all.
                    <span className="snapkeep-tag-picker">
                      <input
                        autoFocus
                        value={draftTag}
                        onChange={(event) => setDraftTag(event.target.value)}
                        onBlur={commitTag}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitTag();
                          if (event.key === "Escape") {
                            setAddingGroup(null);
                            setDraftTag("");
                          }
                        }}
                        placeholder="태그 입력"
                        aria-label={`${group.label} 태그 이름`}
                        className="w-[104px] rounded-full border border-[#017c6e] px-[10px] py-[5px] text-[14px] outline-none"
                      />
                      {suggestionsFor(group).length > 0 && (
                        <span className="snapkeep-tag-picker-list" role="listbox">
                          {suggestionsFor(group).map((option) => (
                            <button
                              key={option}
                              type="button"
                              role="option"
                              aria-selected="false"
                              // mousedown, not click: the input's onBlur commits
                              // and closes the picker, and blur lands first.
                              onMouseDown={(event) => {
                                event.preventDefault();
                                onAddTag(group.label, option);
                                setAddingGroup(null);
                                setDraftTag("");
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </span>
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="snapkeep-detail-tag-add"
                      onClick={() => {
                        setAddingGroup(group.label);
                        setDraftTag("");
                      }}
                      aria-label={`${group.label} 태그 추가`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-[15px] bg-[#e1f2ec] p-[15px]">
            <p className="text-[10px] font-bold tracking-[1px] text-[#017c6e]">AI DESCRIPTION</p>
            {/* The analysis record nests inside this <p> on purpose: index.css
                sizes the description via `> p:last-child`, and a sibling
                element after it would take that selector away. */}
            <p className="mt-[6px] text-[13px] leading-[1.5] tracking-[-0.35px] text-[#356057]">
              {reference.note}
              {reference.analysis && <AnalysisRecord analysis={reference.analysis} />}
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function ScanModal({ onClose, onSubmit, isAnalyzing }) {
  // The picking and reading are shared with the phone's own dropzone, which is
  // a sheet rather than a modal — see useReferenceFile.
  const { fileName, error, selectFile, dropFile } = useReferenceFile(onSubmit);

  const hint = error
    || (isAnalyzing ? "화면 유형, UI 요소, 분위기를 정리하고 있어요" : "PNG, JPG, WEBP 이미지를 넣어주세요");

  return (
    <>
      <button type="button" className="snapkeep-scan-backdrop" onClick={onClose} aria-label="스캔 팝업 닫기" />
      <section className="snapkeep-scan-modal" aria-modal="true" aria-busy={isAnalyzing} role="dialog" aria-labelledby="snapkeep-scan-title">
        <header className="snapkeep-scan-header">
          <h2 id="snapkeep-scan-title">레퍼런스 등록하기</h2>
          <button type="button" className="snapkeep-scan-close" onClick={onClose} aria-label="스캔 팝업 닫기" />
        </header>
        <label
          className={`snapkeep-scan-dropzone ${fileName && !error ? "is-selected" : ""} ${isAnalyzing ? "is-analyzing" : ""}`}
          htmlFor="snapkeep-file-input"
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropFile}
        >
          <input id="snapkeep-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} disabled={isAnalyzing} />
          <strong>{isAnalyzing ? "AI가 레퍼런스를 분석하고 있어요" : fileName || "레퍼런스 선택 또는 드래그"}</strong>
          <span>{hint}</span>
        </label>
      </section>
    </>
  );
}

function FilterDrawer({ activeGroup, onActiveGroupChange, selectedFilters, onToggle, onClear, onClose, resultCount }) {
  const [filterQuery, setFilterQuery] = useState("");
  const [, values] = FILTERS.find(([group]) => group === activeGroup) ?? FILTERS[0];
  const visibleValues = values.filter((value) => value.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <>
      <button type="button" className="absolute inset-0 z-30 cursor-default bg-[#336bec]/10" onClick={onClose} aria-label="필터 닫기" />
      {/* The `snapkeep-filter-in` class is how index.css tells this drawer apart
          from the detail panel — both are <aside> siblings. */}
      <aside className="absolute bottom-0 right-0 top-0 z-40 flex w-[650px] flex-col border-l border-[#e0e4e1] bg-white animate-[snapkeep-filter-in_240ms_ease-out]">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e1e4e1] px-[28px]">
          <h2 className="text-[20px] font-semibold tracking-[-0.7px]">Data Filters</h2>
          <button type="button" onClick={onClose} className="grid size-[34px] place-items-center rounded-full text-[23px] text-[#68716c] hover:bg-[#f1f3f1]" aria-label="필터 닫기">×</button>
        </header>
        <div className="border-b border-[#e1e4e1] px-[28px] py-[12px]">
          <div className="flex h-[40px] items-center gap-[9px] rounded-full border border-[#e1e4e1] bg-[#f7f8f7] px-[13px]">
            <span className="text-[18px] text-[#8a928d]">⌕</span>
            <input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#939995]" placeholder="필터 검색" aria-label="필터 검색" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="w-[178px] shrink-0 overflow-y-auto border-r border-[#e1e4e1] bg-[#f8f9f8] py-[14px]">
            {FILTERS.map(([group]) => (
              <button
                key={group}
                type="button"
                onClick={() => {
                  onActiveGroupChange(group);
                  setFilterQuery("");
                }}
                className={`w-full px-[28px] py-[10px] text-left text-[14px] transition-colors ${activeGroup === group ? "bg-[#e1f2ec] font-semibold text-[#017c6e]" : "text-[#555e58] hover:bg-[#f0f2f0]"}`}
              >
                {group}
              </button>
            ))}
          </nav>
          <section className="min-w-0 flex-1 overflow-y-auto px-[26px] py-[25px]">
            <h3 className="text-[17px] font-semibold tracking-[-0.5px]">{activeGroup}</h3>
            <p className="mt-[5px] text-[12px] text-[#7d8580]">원하는 항목을 여러 개 선택할 수 있어요.</p>
            <div className="mt-[21px] flex flex-wrap gap-[9px]">
              {visibleValues.map((value) => {
                const selected = selectedFilters.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onToggle(value)}
                    aria-pressed={selected}
                    className={`flex items-center gap-[7px] rounded-full border px-[12px] py-[8px] text-[12px] transition-colors ${selected ? "border-[#017c6e] bg-[#e1f2ec] font-semibold text-[#017c6e]" : "border-[#dfe4e1] bg-white text-[#58615b] hover:border-[#9dc8bb]"}`}
                  >
                    <span className={`grid size-[15px] place-items-center rounded-full border text-[11px] ${selected ? "border-[#017c6e] bg-[#017c6e] text-white" : "border-[#cdd3cf] text-transparent"}`}>✓</span>
                    {value}
                  </button>
                );
              })}
            </div>
            {visibleValues.length === 0 && <p className="mt-[30px] text-[13px] text-[#858c87]">일치하는 필터가 없습니다.</p>}
          </section>
        </div>
        <footer className="flex h-[76px] items-center justify-between border-t border-[#e1e4e1] px-[28px]">
          <button type="button" onClick={onClear} className="rounded-full border border-[#dde2df] px-[14px] py-[9px] text-[12px] font-medium text-[#636b66]">모두 지우기</button>
          <p className="text-[12px] text-[#747d77]">{resultCount}개 결과</p>
          <button type="button" onClick={onClose} className="rounded-full bg-[#017c6e] px-[18px] py-[10px] text-[12px] font-semibold text-white">필터 적용</button>
        </footer>
      </aside>
    </>
  );
}

export default function SnapkeepSpread() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [view, setView] = useState("original");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(FILTERS[0][0]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const searchRef = useRef(null);

  const [uploadedReferences, setUploadedReferences] = useState(() => readJSON(STORAGE.uploads, []));
  const [deletedIds, setDeletedIds] = usePersisted(STORAGE.deleted, []);
  const [savedIds, setSavedIds] = usePersisted(STORAGE.saved, []);
  const [tagOverrides, setTagOverrides] = usePersisted(STORAGE.tags, {});
  const [recentIds, setRecentIds] = usePersisted(STORAGE.recents, []);
  const [recentQueries, setRecentQueries] = usePersisted(STORAGE.queries, []);

  // Uploads carry base64 images, so they are the one thing that can overflow the
  // 5MB quota. Persist as many as fit, oldest dropped first — the in-memory list
  // is left alone so nothing disappears from the screen mid-session.
  useEffect(() => {
    let persistable = uploadedReferences;
    while (persistable.length > 0 && !writeJSON(STORAGE.uploads, persistable)) {
      persistable = persistable.slice(0, -1);
    }
    if (persistable.length === 0) writeJSON(STORAGE.uploads, []);
  }, [uploadedReferences]);

  const references = useMemo(
    () => [...uploadedReferences, ...REFERENCES.filter((reference) => !deletedIds.includes(reference.id))],
    [deletedIds, uploadedReferences],
  );

  const selectedReference = useMemo(
    () => references.find((reference) => reference.id === selectedId) ?? null,
    [references, selectedId],
  );

  const visibleReferences = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return references.filter((reference) => {
      if (savedOnly && !savedIds.includes(reference.id)) return false;

      const groups = tagGroupsFor(reference, tagOverrides);
      if (keyword && !searchTextFor(reference, groups).includes(keyword)) return false;

      // Each filter group is matched against that group's own tags, so picking
      // "홈" finds home screens rather than anything with 홈 in its description.
      return FILTERS.every(([label, values]) => {
        const selectedInGroup = values.filter((value) => selectedFilters.includes(value));
        if (selectedInGroup.length === 0) return true;
        const tags = groups.find((group) => group.label === label)?.tags ?? [];
        return selectedInGroup.some((value) => tags.includes(value));
      });
    });
  }, [query, references, savedIds, savedOnly, selectedFilters, tagOverrides]);

  // Recently opened first, then whatever else is on hand, so the panel always
  // has three rows like the design.
  const recentReferences = useMemo(() => {
    const byId = new Map(references.map((reference) => [reference.id, reference]));
    const opened = recentIds.map((id) => byId.get(id)).filter(Boolean);
    const rest = references.filter((reference) => !recentIds.includes(reference.id));
    return [...opened, ...rest].slice(0, 3);
  }, [recentIds, references]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const closeOnOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [searchOpen]);

  useEffect(() => {
    const closeTopmost = (event) => {
      if (event.key !== "Escape") return;
      if (scanOpen && !uploading) setScanOpen(false);
      else if (selectedId) setSelectedId(null);
      else if (filterOpen) setFilterOpen(false);
      else if (searchOpen) setSearchOpen(false);
    };
    document.addEventListener("keydown", closeTopmost);
    return () => document.removeEventListener("keydown", closeTopmost);
  }, [filterOpen, scanOpen, searchOpen, selectedId, uploading]);

  const openReference = (reference) => {
    setSelectedId(reference.id);
    setRecentIds((current) => [reference.id, ...current.filter((id) => id !== reference.id)].slice(0, 8));
  };

  // Recorded on Enter rather than on every keystroke, so the history holds
  // searches the user actually committed to.
  const rememberQuery = (value) => {
    const keyword = value.trim();
    if (!keyword) return;
    setRecentQueries((current) => [keyword, ...current.filter((entry) => entry !== keyword)].slice(0, 6));
  };

  const forgetQuery = (keyword) =>
    setRecentQueries((current) => current.filter((entry) => entry !== keyword));

  const toggleSaved = (id) =>
    setSavedIds((current) => (current.includes(id) ? current.filter((saved) => saved !== id) : [id, ...current]));

  const toggleFilter = (value) =>
    setSelectedFilters((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  /** Back to the default view — what the logo does. Saved references, tags and
      uploads are the user's data and are deliberately left alone; this only
      clears what is narrowing the view. */
  const goHome = () => {
    setQuery("");
    setSelectedFilters([]);
    setSavedOnly(false);
    setView("original");
    setSelectedId(null);
    setSearchOpen(false);
    setFilterOpen(false);
    setScanOpen(false);
  };

  const updateTags = (reference, label, updater) =>
    setTagOverrides((current) => {
      const tags = tagGroupsFor(reference, current).find((group) => group.label === label)?.tags ?? [];
      return { ...current, [reference.id]: { ...(current[reference.id] ?? {}), [label]: updater(tags) } };
    });

  const deleteReference = (reference) => {
    if (uploadedReferences.some((uploaded) => uploaded.id === reference.id)) {
      setUploadedReferences((current) => current.filter((uploaded) => uploaded.id !== reference.id));
    } else {
      setDeletedIds((current) => (current.includes(reference.id) ? current : [...current, reference.id]));
    }
    setSavedIds((current) => current.filter((id) => id !== reference.id));
    setRecentIds((current) => current.filter((id) => id !== reference.id));
    setTagOverrides((current) => {
      const { [reference.id]: removed, ...rest } = current;
      return rest;
    });
    setSelectedId(null);
  };

  const submitScan = async ({ fileName, dataUrl }) => {
    setUploading(true);
    const { reference, error } = await scanReference({ fileName, dataUrl });
    if (error) {
      setUploading(false);
      return error;
    }

    setUploadedReferences((current) => [reference, ...current]);
    setScanOpen(false);
    setUploading(false);
    openReference(reference);
    return null;
  };

  return (
    <div className="relative min-h-[1030px] w-[1489px] overflow-hidden rounded-[24px] bg-[#f7f7f5] font-['Pretendard'] text-[#1d1c1c]">
      <header className="flex items-center justify-between px-[62px] pb-[28px] pt-[46px]">
        {/* The logo doubles as home, the way a site's wordmark does: it clears
            the search, the filters and any open panel, and puts the grid back
            to its default view. */}
        <div
          role="button"
          tabIndex={0}
          onClick={goHome}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              goHome();
            }
          }}
          className="cursor-pointer select-none text-left"
          aria-label="snapkeep 홈으로"
        >
          <p className="font-serif text-[42px] font-bold italic tracking-[-3.1px]">snapkeep</p>
          <p className="mt-[7px] text-[13px] tracking-[-0.3px] text-[#777d79]">스크린샷을 넣고, AI가 정리한 레퍼런스를 다시 찾으세요.</p>
        </div>
      </header>

      <main className="px-[62px] pb-[86px]">
        <div ref={searchRef} className="relative z-10">
          <div className="flex h-[70px] items-center gap-[17px] rounded-[14px] bg-[#f0f1f0] px-[22px]">
            <svg aria-hidden="true" className="size-[28px] shrink-0 text-[#999f9c]" fill="none" viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="7.1" stroke="currentColor" strokeWidth="1.6" />
              <path d="m16.1 16.1 4.1 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
            </svg>
            <input
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                rememberQuery(query);
                setSearchOpen(false);
              }}
              className="min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-[#9a9e9d]"
              placeholder="키워드 또는 질문으로 검색"
              aria-label="레퍼런스 검색"
            />
            <button type="button" onClick={() => setSearchOpen((open) => !open)} className="grid size-[35px] place-items-center rounded-[7px] text-[#1d1c1c]" aria-label="검색">
              <svg aria-hidden="true" className="size-[25px]" fill="none" viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="7.1" stroke="currentColor" strokeWidth="1.6" />
                <path d="m16.1 16.1 4.1 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
              </svg>
            </button>
          </div>

          {searchOpen && (
            <div className="absolute left-0 right-0 top-[61px] overflow-hidden rounded-[16px] border border-[#e4e5e3] bg-white p-[16px]">
              {/* A <section>, not a <div> — index.css hides the dropdown's first
                  div child, which would swallow this block. */}
              {recentQueries.length > 0 && (
                <section className="mb-[16px]">
                  <p className="px-[3px] text-[14px] font-medium text-[#7e8380]">Recent searches</p>
                  <div className="mt-[8px] flex flex-wrap gap-[6px] px-[3px]">
                    {recentQueries.map((keyword) => (
                      <span key={keyword} className="inline-flex items-center rounded-full border border-[#e4e5e3] py-[6px] pl-[12px] pr-[8px] text-[12px]">
                        <button type="button" onClick={() => { setQuery(keyword); setSearchOpen(false); }}>
                          {keyword}
                        </button>
                        <button
                          type="button"
                          onClick={() => forgetQuery(keyword)}
                          aria-label={`${keyword} 검색 기록 삭제`}
                          className="ml-[6px] px-[2px] leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
              )}
              <p className="px-[3px] text-[14px] font-medium text-[#7e8380]">Recents</p>
              <div className="mt-[8px] space-y-[3px]">
                {recentReferences.map((reference) => (
                  <button
                    key={reference.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      openReference(reference);
                    }}
                    className="flex w-full items-center gap-[12px] rounded-[10px] px-[10px] py-[10px] text-left transition-colors hover:bg-[#f4f5f3]"
                  >
                    <span className="grid size-[32px] place-items-center overflow-hidden rounded-[8px] bg-[#edf0ee] text-[14px] text-[#68716c]">
                      {reference.image ? <img src={reference.image} alt="" className="h-full w-full object-cover" /> : "▧"}
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[15px] font-medium tracking-[-0.4px] text-[#1d1c1c]">{reference.title}</span>
                    <span className="rounded-[6px] border border-[#e2e4e1] px-[7px] py-[3px] text-[10px] text-[#858a87]">{reference.service}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar. index.css reorders these three children (view pill left,
            filter then bookmark right) and swaps in the SVG icons. */}
        <div className="mt-[21px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`grid size-[46px] place-items-center rounded-full border transition-colors ${selectedFilters.length > 0 ? "border-[#017c6e] bg-[#017c6e] text-white" : "border-[#e3e4e1] bg-white text-[#1d1c1c]"}`}
            aria-label="필터 열기"
          >
            <Icon>☷</Icon>
          </button>
          <div className="flex h-[44px] rounded-full bg-[#e7e6e3] p-[3px]">
            {VIEWS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                data-active={String(view === value)}
                className={`rounded-full px-[18px] text-[14px] font-bold italic ${view === value ? "bg-white text-[#1d1c1c]" : "text-[#474646]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-snapkeep-save="true"
            data-saved={String(savedOnly)}
            aria-pressed={savedOnly}
            aria-label={savedOnly ? "저장한 레퍼런스만 보기 해제" : "저장한 레퍼런스만 보기"}
            onClick={() => setSavedOnly((only) => !only)}
          />
        </div>

        {selectedFilters.length > 0 && (
          <div className="mt-[18px] flex flex-wrap gap-[6px]">
            {selectedFilters.map((value) => (
              <button key={value} type="button" onClick={() => toggleFilter(value)} className="rounded-full bg-[#e1f2ec] px-[12px] py-[7px] text-[11px] font-semibold text-[#017c6e]" aria-label={`${value} 필터 해제`}>
                {value} ×
              </button>
            ))}
          </div>
        )}

        <div className="mt-[26px] grid grid-cols-3 gap-[18px]" data-saved-only={String(savedOnly)}>
          {visibleReferences.map((reference) => (
            <ReferenceCard
              key={reference.id}
              reference={reference}
              groups={tagGroupsFor(reference, tagOverrides)}
              view={view}
              saved={savedIds.includes(reference.id)}
              onOpen={() => openReference(reference)}
              onToggleSaved={() => toggleSaved(reference.id)}
            />
          ))}
        </div>

        {visibleReferences.length === 0 && (
          <div className="mt-[26px] grid h-[370px] place-items-center rounded-[22px] border border-dashed border-[#ced6d1] bg-white">
            <div className="text-center">
              <p className="text-[21px] font-medium tracking-[-0.8px]">{savedOnly ? "저장한 레퍼런스가 없어요" : "저장된 레퍼런스가 없어요"}</p>
              <p className="mt-[8px] text-[14px] text-[#777f7a]">{savedOnly ? "카드의 북마크를 눌러 저장해 보세요." : "검색어나 필터를 바꿔 보세요."}</p>
            </div>
          </div>
        )}
      </main>

      {/* Sticky rather than absolute, in a zero-height row so it takes no
          layout space of its own. Absolute put it at the bottom of the
          *content*, which slid out of reach as soon as the reference list grew
          past the window; sticky keeps it on the visible bottom edge, and
          degrades to sitting exactly where it used to wherever there is no
          internal scrolling. */}
      <div className="sticky bottom-0 z-20 flex h-0 items-end justify-end pr-[55px]">
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="mb-[38px] flex h-[58px] items-center gap-[9px] rounded-full bg-[#017c6e] px-[23px] font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-white shadow-[0px_6px_18px_0px_rgba(0,0,0,0.18)]"
        >
          <span className="text-[25px] font-normal">+</span>
          {uploading ? "AI 분석 중..." : "등록"}
        </button>
      </div>

      {filterOpen && (
        <FilterDrawer
          activeGroup={activeGroup}
          onActiveGroupChange={setActiveGroup}
          selectedFilters={selectedFilters}
          onToggle={toggleFilter}
          onClear={() => setSelectedFilters([])}
          onClose={() => setFilterOpen(false)}
          resultCount={visibleReferences.length}
        />
      )}

      {selectedReference && (
        <>
          <button type="button" className="snapkeep-detail-backdrop" onClick={() => setSelectedId(null)} aria-label="상세 패널 닫기" />
          <DetailPanel
            key={selectedReference.id}
            reference={selectedReference}
            groups={tagGroupsFor(selectedReference, tagOverrides)}
            initialTab={view}
            onAddTag={(label, value) => updateTags(selectedReference, label, (tags) => (tags.includes(value) ? tags : [...tags, value]))}
            onRemoveTag={(label, value) => updateTags(selectedReference, label, (tags) => tags.filter((tag) => tag !== value))}
            onClose={() => setSelectedId(null)}
            onDelete={() => deleteReference(selectedReference)}
          />
        </>
      )}

      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} onSubmit={submitScan} isAnalyzing={uploading} />}
    </div>
  );
}
