import { useEffect, useRef, useState } from "react";
import { driveWithScroll } from "../lib/scrollDriver";
// The same two files the hero is built from. Not a copy of them: the glasses
// that lands on the handoff blob *is* the hero's glasses, and the black that
// fills its lenses is the same shape at the same 50% the hero opens on. Doing
// it with a second, flatter drawing would be a different pair of glasses that
// happened to look similar.
import glassesImg from "../assets/hero/glasses.avif";
import heroEyes from "../assets/hero/hero-eyes.svg?raw";
import role1Img from "../assets/role/1.avif";
import role2Img from "../assets/role/2.avif";
import role3Img from "../assets/role/3.avif";
import role4Img from "../assets/role/4.avif";
import role5Img from "../assets/role/5.avif";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

// One continuous story, driven by one circle, across two acts:
//  Act 1 (steps 0-6): the "every role" wheel — START, then 5 roles
//    orbiting a shared center slot, then converging into a single grown
//    circle.
//  Act 2 (steps 7-10): that exact same circle (role 5's — see the
//    survivor logic below) keeps moving, becoming the "about" section's
//    background blob for three career chapters and a closing contact
//    card.
// Same 1920x1080 design canvas + scale-to-fit approach throughout.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const ROLES = [
  {
    n: 1,
    title: "Daughter",
    desc: "표현이 서툰 부모님을 위해,\n먼저 원하는 걸 제안할 줄 아는 딸",
    img: role1Img,
    imgFit: { position: "center" },
  },
  {
    n: 2,
    title: "Older sister",
    desc: "내가 겪은 불편을 동생은 겪지 않도록 살피는 언니이자 누나",
    img: role2Img,
    imgFit: { position: "center" },
  },
  {
    n: 3,
    title: "Friend",
    desc: "사소한 말도 기억하고 챙기는 친구",
    img: role3Img,
    imgFit: { position: "center" },
  },
  {
    n: 4,
    title: "Student",
    desc: "옳다고 생각한 일은 스스로 해내던 학생",
    img: role4Img,
    imgFit: {
      custom: { width: "100%", height: "138.64%", left: "0%", top: "-11.25%" },
    },
  },
  {
    n: 5,
    title: "Employee",
    desc: "맡은 일은 방법을 찾아내서라도 끝내는 직원",
    img: role5Img,
    imgFit: { position: "center" },
  },
];

// Two sizes, not one. The design draws the circle at CENTER — START, and then
// whichever role has come round to it — at 80, and the four waiting their turn
// on the ring at 40 (node 154:3767). They were all 80 here, which made the
// wheel five identical beads with only a fill to tell them apart; at half the
// size the four are plainly the queue and the big one is plainly the subject.
//
// A circle is whatever size its own focus says, so it grows on its way in to
// CENTER and shrinks on the way out rather than snapping between the two.
const CIRCLE_SIZE = 80;
const CIRCLE_SIZE_SMALL = 40;
// Both blobs in the design are 620 across — the handoff one at "Role / Led me
// to a career" (node 154:3911) and the closing one behind the contact card
// (node 154:3984) — and both sit dead centre of the canvas, so this is the size
// the survivor circle grows to and every blob position below is derived from it.
const GROWN_SIZE = 620;

// The wheel is a ring hung off the bottom of the canvas with five 80px slots
// spaced around its top arc. CENTER holds the currently-focused role, and each
// circle steps CENTER -> A -> C -> D -> B -> CENTER as the wheel advances one
// role at a time.
//
// The ring is read straight off the design (node 316:1823). The slots are not:
// the design's five boxes do not all sit the same distance from it — the centre
// one and the upper pair are 710.5 out, the lower pair 720.6 — so lifting the
// literal coordinates put two of the circles ~10px further from the line than
// the other three, which shows plainly on a shape as regular as a circle.
//
// So a slot is stated as an angle instead, and its position is computed from
// the ring: every one sits a SPOKE clear of the line, and moving between two of
// them means interpolating the *angle* (see slotFor), so a circle keeps that
// clearance the whole way round rather than cutting the chord across the ring.
//
// The ring is nearly twice what it was (651 -> 1293) and hangs that much lower.
// Everything here is derived from it, so the wheel follows on its own: a far
// shallower arc across the bottom of the canvas, with the circles strung along
// it much further apart.
const RING = { x: 314, y: 897, size: 1293 };
const RING_CENTER = {
  x: RING.x + RING.size / 2,
  y: RING.y + RING.size / 2,
};
const RING_RADIUS = RING.size / 2;
// Every circle hangs off the track on a stem of its own: a 40px line running
// straight out from the ring to the circle's edge (nodes 355:258..262). So what
// is held constant across the five is the *clearance* — the length of that
// stem — and not the radius their centres sit on.
//
// It was one shared radius before, on the reasoning that spacing along a curve
// is arc length, so two different radii would make the big circle's gap to its
// neighbours read wider than the small ones' gap to each other. That was the
// right answer to the design as it then stood: with nothing drawn between the
// ring and a circle, a circle's centre is the only thing saying where it
// belongs, and five centres that disagree about their arc do not read as one
// wheel. The stem says where a circle belongs instead, and says it better —
// each one is plainly the same 40 clear of the track, and the big one reaches
// further out because it is bigger, which is a thing the stem shows you rather
// than an inconsistency it hides.
const SPOKE = 40;
/** How far out the centre of a circle of `size` parks: the far end of its stem,
 *  plus its own radius. */
const slotRadius = (size) => RING_RADIUS + SPOKE + size / 2;
// One step, and everything on the ring is a multiple of it.
//
// The design lays these out as two horizontal rows rather than by angle, so
// lifting its literal positions gave a wheel whose beads were 8.4, 10.2, 8.4,
// 5.7, 7.1 and 6.5 degrees apart — a rhythm that wanders, on the one shape
// where a wandering rhythm is impossible to miss. A circle is regular or it is
// wrong.
//
// 8deg is that step, fitted to the design's own two slot angles (27.0 and 46.3)
// so the wheel keeps the footprint it was drawn with: the near pair lands at
// 24, the far pair at 48, and the beads fill in every position between.
const SLOT_STEP_DEG = 8;
// Slots take every third position, which leaves exactly two beads between the
// centre and each near slot and two more between near and far.
const SLOT_NEAR_DEG = SLOT_STEP_DEG * 3;
const SLOT_FAR_DEG = SLOT_STEP_DEG * 6;
// The order is the wheel's own — CENTER -> A -> C -> D -> B -> CENTER — so the
// circles run down the left side, cross the bottom unseen, and come back up the
// right.
const SLOT_ANGLES = [
  0,
  -SLOT_NEAR_DEG,
  -SLOT_FAR_DEG,
  SLOT_FAR_DEG,
  SLOT_NEAR_DEG,
];

// Beads threaded on the ring itself (node 154:3767). New in the design, and the
// only thing that changed about the wheel: the arc used to be a bare hairline
// with five circles floating clear of it, and a line that thin reads as a stray
// stroke rather than as the track the wheel runs on. Eight solid dots strung
// along it say what it is.
//
// They sit *on* the line — measured at 643..653 from the ring's centre against
// a radius of 646.5, so the design draws them centred on it — while the slots
// stand a SPOKE clear of it. That difference is the whole reading: the beads are
// part of the track, the circles are what travels along it, and the stem is what
// says which of the two a given mark is.
//
// Every position on the wheel that a slot does not take — all the way round,
// not only across the visible arc.
//
// The whole ring turns as the wheel advances (see the dots' rotation in
// applyRaw), so beads leave through one end of the arc and have to come up
// through the other. A band that only covered what is on screen at rest would
// empty itself out the first time it moved. The ones off-canvas cost nothing:
// they are 20px divs with no content.
//
// Derived from the step rather than listed, so the beads and the slots can
// never drift apart: change SLOT_STEP_DEG and both move.
const DOT_SIZE = 20;
const DOT_ANGLES = Array.from(
  { length: 360 / SLOT_STEP_DEG },
  (_, n) => n * SLOT_STEP_DEG,
).filter((deg) => deg % SLOT_NEAR_DEG !== 0);
const DOT_RADIUS = RING_RADIUS;

/** Top-left corner of a DOT_SIZE bead sitting `deg` around the ring. */
function dotAt(deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: RING_CENTER.x + DOT_RADIUS * Math.sin(rad) - DOT_SIZE / 2,
    y: RING_CENTER.y - DOT_RADIUS * Math.cos(rad) - DOT_SIZE / 2,
  };
}

/** Where the stem for the slot at `deg` meets the track. */
function spokeFoot(deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: RING_CENTER.x + RING_RADIUS * Math.sin(rad),
    y: RING_CENTER.y - RING_RADIUS * Math.cos(rad),
  };
}

/** Centre of a circle of `size` sitting `deg` around the ring.
 *
 *  Centres, not corners. With two circle sizes a corner says nothing on its own
 *  — the same corner puts a 40 and an 80 in different places — and every caller
 *  wants the middle anyway: the slot is a point on the wheel, and the circle is
 *  whatever is currently parked on it.
 *
 *  `deg` comes back out again because the stem has to be drawn along the same
 *  line the circle was placed on, and reaching that angle by working backwards
 *  from x/y is both slower and a chance for the two to disagree. */
function slotAt(deg, size) {
  const rad = (deg * Math.PI) / 180;
  const radius = slotRadius(size);
  return {
    deg,
    x: RING_CENTER.x + radius * Math.sin(rad),
    y: RING_CENTER.y - radius * Math.cos(rad),
  };
}
// Where the focused circle sits, and so where the convergence gathers. The
// focused one is always the large one, so this is its radius the circle is
// asked for at.
const CENTER_POS = slotAt(0, CIRCLE_SIZE);

// Only the circle sitting at CENTER is filled; the other four are white
// outlines. This is how wide the crossfade between those two states is, in
// legs — so a circle is solid only while it is really the focused role, and
// spends the middle of its trip out to A as an outline like the rest.
const FOCUS_WINDOW = 0.5;

const centredX = (width) => DESIGN_WIDTH / 2 - width / 2;
const IMAGE_BOX = { x: centredX(647), y: 232, width: 647, height: 350 };
// The role's name and line sit under the photo again — the ring has grown far
// too large to frame them, and its arc now passes well below where they read.
// Stated as the design's own gap below the photo rather than as a second
// measurement off the canvas, so moving the photo carries the copy with it.
const ROLE_TEXT_WIDTH = 560;
const ROLE_TEXT_GAP = 42;
const TEXT_BOX = {
  x: centredX(ROLE_TEXT_WIDTH),
  y: IMAGE_BOX.y + IMAGE_BOX.height + ROLE_TEXT_GAP,
  width: ROLE_TEXT_WIDTH,
};

// "START" isn't a separate page — it's simply what sits at the CENTER
// slot before role 1 arrives there. There is no 6th slot for it: at
// centerValue 0, role 5 is the one that's naturally sitting at CENTER
// (the wheel is a 5-cycle, so position 0 == position 5), so role 5's
// circle stays hidden there and this title/START content shows in its
// place until the wheel starts turning and role 5 rotates out to reveal
// its own circle underneath.
// The title has its own box in the design (node 154:3770) rather than sharing
// the role photo's — it sits higher and narrower than the photo does, so that
// the START circle below it still lands on the wheel's CENTER slot.
const START_TITLE_BOX = { x: centredX(560), y: 481, width: 560 };
const START_FADE_WINDOW = 0.35;

// Where role 5's circle goes once it stops being a wheel slot and becomes the
// sole background blob: dead centre of the canvas. It cannot simply grow where
// the wheel left it — the wheel sits low, and a 620px circle grown from there
// hangs off the bottom of the screen — so it travels here as it grows, and the
// step lands with it centred.
const BLOB_CENTER_X = DESIGN_WIDTH / 2;
const BLOB_CENTER_Y = DESIGN_HEIGHT / 2;
const BLOB_STEPS = [
  {
    x: BLOB_CENTER_X - GROWN_SIZE / 2,
    y: BLOB_CENTER_Y - GROWN_SIZE / 2,
    size: GROWN_SIZE,
  }, // 6: "Role / Led me to a career"
  { x: -570, y: -86, size: 1252 }, // 7: SOCIALWORKER
  { x: -570, y: -86, size: 1252 }, // 8: CHANGE
  { x: -570, y: -86, size: 1252 }, // 9: UXUI DESIGNER
];
// Steps run 0-10 below (11 positions); the outro/contact card is the
// 11th and reuses the same blob-tween mechanism. It comes back to the same
// 620 dead-centre circle the handoff step used (node 154:3984) rather than
// stopping somewhere of its own, so the story closes where it turned.
// The closing card's blob is the centred one the handoff step used to be —
// nothing sits above it there, so it has the middle of the canvas to itself.
const OUTRO_BLOB = {
  x: BLOB_CENTER_X - GROWN_SIZE / 2,
  y: BLOB_CENTER_Y - GROWN_SIZE / 2,
  size: GROWN_SIZE,
};

// The blob sits still at this same spot for all three chapters — so this
// is also the fixed pivot each chapter's word/title/paragraph rotates
// around (see CHAPTERS' transform-origin below), instead of each
// spinning around its own center.
const CHAPTER_BLOB = BLOB_STEPS[1];
const CHAPTER_PIVOT = {
  x: CHAPTER_BLOB.x + CHAPTER_BLOB.size / 2,
  y: CHAPTER_BLOB.y + CHAPTER_BLOB.size / 2,
};

// Each chapter's word + text block sit flat (0deg) at rest — matching
// Figma's node 160:160 exactly — and only rotate as a transition: as the
// chapter arrives or leaves, it swings through this many degrees rather
// than simply crossfading in place.
const ROTATE_SPIN = -360;
// The handoff title, "Role / Led me to a career". Its block is about 330 tall
// on the 1080 canvas — two 120px lines plus the caption — so at the old y of
// 217 it sat with its middle near 380 and read as floating in the upper half
// rather than as sitting at the top of the page. Level with its own left inset
// instead: the same 118 down as across, which puts it clear of the blob's arc
// and gives the two lines the top of the canvas to themselves.
// Where the contact card's resume link points.
//
// Hosted rather than shipped: it used to be a PDF expected at a path under
// public/, which meant the link 404'd until someone remembered to drop the file
// there, and every revision needed a redeploy. A document she can edit in place
// is always the current one, and the site never has to be rebuilt for it.
//
// It opens rather than downloads, so nothing lands in a stranger's downloads
// folder uninvited — see the link itself for the rest of that.
const RESUME_HREF =
  "https://docs.google.com/document/d/1BD-tuQ1CIKCkFO7WHgnvyTyeyUlkUPOZ/edit?usp=sharing&ouid=106727088774758261640&rtpof=true&sd=true";

const CHAPTER_TITLE_POS = { x: 118, y: 118 };
const WORD_RIGHT = 1249;
const WORD_TOP = 492;

// Each chapter is anchored to the step(s) it owns — a single step for
// SOCIALWORKER/UXUI DESIGNER, and both 8 and 9 for CHANGE, whose
// copy rides the wipe instead of the shared canvas.
const CHAPTERS = [
  {
    anchorStart: 7,
    anchorEnd: 7,
    word: "SOCIALWORKER",
    title: "니즈를 찾고 충족시키는 일을 했습니다",
    box: { x: 774, y: 467, width: 621 },
    dark: true,
    paragraph: [
      "4년간 정신건강사회복지사로 일하며,",
      "사람들의 말해지지 않은 니즈를 읽고 채우는 일을 했습니다.",
      "니즈는 요구하는 것만이 아니라,",
      "미처 말하지 못한 것까지 포함합니다.",
    ].join("\n"),
  },
  {
    anchorStart: 8,
    anchorEnd: 8,
    word: "CHANGE",
    // This chapter's copy is not laid out on the shared design canvas at
    // all. It's rendered twice — once white, once black — inside the two
    // layers that ride the wipe (see ChangeCopy below), so word, title
    // and paragraph are all bolted to the wipe's own edge and travel with
    // it. Nothing here animates its own color: the black/white split
    // simply is wherever that edge currently falls.
    ridesWipe: true,
    title: "개입의 시점을 고민하게 됩니다",
    box: { x: 740, y: 465, width: 722 },
    dark: false,
    paragraph: [
      "개입은 늘 문제가 발생한 이후였습니다.",
      "문제가 생기기 전에 막을 수는 없을까",
      "그 고민의 끝에서 디자인을 만났습니다.",
      "도망친 것이 아니라, 개입의 시점을",
      "사후에서 사전으로 재정의한 것입니다.",
    ].join("\n"),
  },
  {
    anchorStart: 9,
    anchorEnd: 9,
    word: "UXUI DESIGNER",
    title: "스스로 답을 찾습니다",
    box: { x: 753, y: 447, width: 770 },
    dark: false,
    paragraph: [
      "방향이 필요하면 스스로 답을 찾는 것이 익숙합니다.",
      "막히면 방법을 찾아 풀고,",
      "그 과정에 AI를 도구로 씁니다.",
      "지금 보고 계신 이 사이트도 직접 설계하고 만들었습니다.",
    ].join("\n"),
  },
];

const CHANGE_CHAPTER = CHAPTERS.find((c) => c.ridesWipe);

// CHANGE's copy rides the wipe rather than sitting on the shared canvas, so
// its paragraph gets a box of its own to sit in.
//
// This used to be a window the text was read *through*: the paragraph ran to
// fifteen lines, eight showed, and CHANGE was given a second step whose only
// job was to page down to the rest. The copy is five lines now — it fits
// whole — so that step had nothing to do but take a scroll, and both it and
// the paging are gone. The box is sized to the copy and asserts it: it is
// measured off the line count below, so trimming or adding a line resizes it
// on its own.
const CHANGE_PARA_LINE_HEIGHT = 24 * 1.3;
const CHANGE_PARA_LINES = CHANGE_CHAPTER.paragraph.split("\n").length;
const CHANGE_PARA_WINDOW_HEIGHT = CHANGE_PARA_LINE_HEIGHT * CHANGE_PARA_LINES;

// Each chapter's subtitle sharpens from its left edge to its right rather
// than simply fading in.
//
// The mask is three times the subtitle's own width: solid across its left
// side, clear across its right, with the fade in between. Sliding it from
// `100%` (the text sampling the clear end, so it is invisible) to `0%` (the
// solid end) walks that fade across the line, left to right. Position is the
// only thing that animates, which keeps it a compositor-side job.
//
// The fade band is deliberately narrow — 10% of a mask three times the text's
// width, so about a third of the line. Widen it much past that and the band
// covers the whole line at once, which stops reading as an edge travelling
// left to right and just looks like the line fading in as a block.
//
// The clear end is 0.2, not 0: the line is always faintly there, and the
// sweep lifts it to full rather than writing it in from nothing. At 0 the
// early part of the sweep has nothing on screen to be read against, which
// is what made the effect hard to notice at all.
const SUBTITLE_MASK_IMAGE =
  "linear-gradient(90deg, #000 0%, #000 45%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.2) 100%)";
const SUBTITLE_MASK_STYLE = {
  maskImage: SUBTITLE_MASK_IMAGE,
  WebkitMaskImage: SUBTITLE_MASK_IMAGE,
  maskSize: "300% 100%",
  WebkitMaskSize: "300% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "100% 0",
  WebkitMaskPosition: "100% 0",
};

// This runs on its own clock once the step machine has come to rest on a
// chapter (see settleOn) — not off the arrival `reveal`, which is finished
// the instant the chapter lands, so the sweep was over before there was
// anything settled to watch it on.
const TITLE_SHARPEN_MS = 900;
// A short pause after landing, so the sweep reads as its own beat rather
// than as the tail of the spin that brought the chapter in.
const TITLE_SHARPEN_DELAY_MS = 150;
// The paragraph types itself out alongside the title's sweep, off the same
// clock. It used to run off the arrival value like everything else, which
// gave it only the back half of a 600ms tween — several hundred characters
// in a couple of hundred milliseconds, so it read as the text simply
// appearing. On its own clock it is actually a typewriter, and long and
// short chapters take the same time rather than the short ones being over
// instantly. Longer than the title sweep on purpose: they start together,
// and the heading resolving first leads the eye down into the text.
const PARAGRAPH_TYPE_MS = 1800;

// reveal 0 = not yet arrived (fully masked), 1 = fully sharp.
function applySubtitleReveal(el, reveal) {
  if (!el) return;
  const position = `${(1 - reveal) * 100}% 0`;
  el.style.maskPosition = position;
  el.style.webkitMaskPosition = position;
}

// Paragraphs type themselves out a character at a time.
//
// Every character is rendered up front, each in its own span, and only its
// opacity changes — so the text is laid out in full from the start and lines
// never reflow as it "types". Swapping textContent instead would re-wrap the
// paragraph on almost every frame.
//
// The spans are hidden from assistive tech and the whole string is put back
// on the paragraph as a label, so a screen reader reads one sentence rather
// than several hundred single letters.
function TypedParagraph({ text, className, pRef, charsRef }) {
  return (
    <p ref={pRef} className={className} aria-label={text}>
      {Array.from(text).map((character, i) => (
        <span
          key={i}
          aria-hidden="true"
          ref={(el) => {
            charsRef.current[i] = el;
          }}
          style={{ opacity: 0 }}
        >
          {character}
        </span>
      ))}
    </p>
  );
}

// Only the characters that actually changed state get touched — walking all
// of them every frame is what makes this kind of effect stutter.
function applyTyping(charsRef, typedRef, reveal, total) {
  const next = Math.round(clamp01(reveal) * total);
  const previous = typedRef.current;
  if (next === previous) return;

  if (next > previous) {
    for (let i = previous; i < next; i += 1) {
      const el = charsRef.current[i];
      if (el) el.style.opacity = "1";
    }
  } else {
    for (let i = next; i < previous; i += 1) {
      const el = charsRef.current[i];
      if (el) el.style.opacity = "0";
    }
  }
  typedRef.current = next;
}

// CHANGE's copy, at its plain design-canvas coordinates — identical
// markup to what every other chapter puts on the canvas, except the color
// is left to the caller. Rendered twice, into the two layers that ride
// the wipe: white into the one clipped to the uncovered side, black into
// the one clipped to the covered side. Neither copy ever changes color;
// each is simply cut off at the wipe's edge, and the two cuts are the
// same line, so the two halves always meet exactly.
function ChangeCopy({ tone, paraRef, subtitleRef, charsRef }) {
  return (
    <>
      <p
        className={`absolute font-['Plus_Jakarta_Sans'] font-bold text-[70px] tracking-[-0.02em] leading-[1.2] text-right whitespace-nowrap ${tone}`}
        style={{ right: WORD_RIGHT, top: WORD_TOP }}
      >
        {CHANGE_CHAPTER.word}
      </p>
      <div
        className="absolute flex flex-col gap-[42px] items-start"
        style={{
          left: CHANGE_CHAPTER.box.x,
          top: CHANGE_CHAPTER.box.y,
          width: CHANGE_CHAPTER.box.width,
        }}
      >
        <p
          ref={subtitleRef}
          className={`font-['Pretendard'] font-bold text-[50px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap ${tone}`}
          style={SUBTITLE_MASK_STYLE}
        >
          {CHANGE_CHAPTER.title}
        </p>
        <div
          className="w-full overflow-hidden"
          style={{ height: CHANGE_PARA_WINDOW_HEIGHT }}
        >
          <TypedParagraph
            text={CHANGE_CHAPTER.paragraph}
            pRef={paraRef}
            charsRef={charsRef}
            className={`font-['Pretendard'] text-[24px] tracking-[-0.02em] leading-[1.3] whitespace-pre-line [word-break:keep-all] ${tone}`}
          />
        </div>
      </div>
    </>
  );
}

const CONTACT_BOX = { x: 1066, y: 740 };

// The full half-step to the next one, so a role hands over to its neighbour by
// crossfading exactly at the midpoint between them and the stage is never
// empty.
//
// This was 0.2 — a quick fade with a blank gap in the middle of every leg —
// and it worked only because the wheel could not be stopped inside one: the
// step machine tweened from integer to integer at a fixed speed, and the gap
// went past too quickly to be seen. Read off the scroll, that same gap is a
// place the reader can come to rest, and did: park mid-leg and the whole stage
// is bare but for the outlines.
const REVEAL_WINDOW = 0.5;
// Chapters have always used the full half-step, for the same reason the roles
// do now: the outgoing chapter should still be visible (mid-spin) handing off
// to the incoming one, rather than fading to nothing before it rotates in.
const CHAPTER_REVEAL_WINDOW = 0.5;
// 11 steps (0-10): 0 START, 1-5 roles, 6 grown handoff title, 7
// SOCIALWORKER, 8 CHANGE, 9 UXUI DESIGNER, 10 outro contact.
//
// These are positions along a continuous 0-1 timeline that the page's scroll
// through the section is mapped onto, not a slideshow of frames to be paged
// between. Every value applyRaw computes is a smooth function of that timeline,
// so the wheel turning between two steps shows the circle actually travelling
// its arc — which used to be a 600ms tween played back at a fixed speed no
// matter how you scrolled.
// The step "Role / Led me to a career" belongs to — the handoff between the
// wheel and the chapters. Named because two things read it: the title's own
// reveal, and the moment the circles drop behind the canvas so the title can
// paint over the blob.
const TITLE_STEP = 6;

// The glasses that lands on the handoff blob (node 154:3910), and the four
// beats it plays once it has.
//
// The box is the design's own, in canvas px. Black rather than the hero's blue,
// which is a `brightness(0)` on the same file: the artwork is one flat colour
// through an alpha mask, so knocking its brightness out leaves the exact same
// shape in black and there is no second export to keep in step.
const GLASSES_BOX = { x: 634, y: 247, width: 651, height: 632.0785 };
// Where the drawing's right tip actually is inside that box, as a fraction of
// it. The file carries margin — the frame stops about 29px short of the box's
// right edge — and this is the point the whole thing is hinged on, so it has to
// be the tip and not the box.
const GLASSES_PIVOT_X = 0.955;

// Standing on its right end, then swung down flat. Positive is upright: with
// the origin at the right tip, +90 puts the free end above the pivot, and
// coming back to 0 drops it into place.
const GLASSES_START_DEG = 90;
// Upright to flat.
const GLASSES_SWING_MS = 760;
// The lenses filling with the hero's own 50% black.
const GLASSES_DARKEN_MS = 420;
// A band of light crossing them.
const GLASSES_SHINE_MS = 720;
// A beat with the light gone and the glasses simply sitting there.
const GLASSES_HOLD_MS = 260;
// And out, leaving a clean blob for whatever the reader scrolls to next.
const GLASSES_LEAVE_MS = 420;
const GLASSES_AT = {
  darken: GLASSES_SWING_MS,
  shine: GLASSES_SWING_MS + GLASSES_DARKEN_MS,
  hold: GLASSES_SWING_MS + GLASSES_DARKEN_MS + GLASSES_SHINE_MS,
  leave:
    GLASSES_SWING_MS + GLASSES_DARKEN_MS + GLASSES_SHINE_MS + GLASSES_HOLD_MS,
};
const GLASSES_END = GLASSES_AT.leave + GLASSES_LEAVE_MS;
const STEP_COUNT = 10;
// How much page scroll each step costs, plus the one screen the sticky stage
// occupies. This is the section's pace: a screen of scrolling moves the story
// on by roughly one step.
// Up from 70. Nothing about the animation changed — each step still eases in
// and out exactly as it did — there is simply more page to scroll through
// before the story moves on, so the whole section reads slower under the same
// wheel. This is the one number that sets the pace: raise it to slow the
// section down further, lower it to speed it up.
const STEP_VH = 95;
// How much of a step is spent parked on it before the next leg starts, as a
// fraction of that step's scroll.
//
// The easing on each leg (see stepPos in applyRaw) already slows the ends to a
// crawl, but slow is not stopped: a chapter's copy is rotated by how far the
// timeline is from its step, so it is square for one instant and creeping
// either side of it, and there is no scroll position where a reader can simply
// be looking at a finished line. This is a real plateau — the timeline sits
// exactly on the integer for the first STEP_HOLD of the step.
//
// It holds the *clock*, and nothing else. An earlier attempt at this also
// widened each chapter's visible band, which is what left the outgoing page
// still hanging about while the next one arrived; the reveal windows below are
// deliberately untouched, so a chapter appears and leaves exactly when it did.
const STEP_HOLD = 0.3;
const TRACK_VH = 100 + STEP_COUNT * STEP_VH;

// C -> D is the one leg that would run straight across the bottom of the
// canvas, cutting a chord clean through the ring the other four slots sit
// on — which reads as a circle rolling through the middle of the wheel
// rather than round it. So this leg is never travelled: the circle fades
// out standing still at C, is moved over to D while nobody can see it, and
// fades back in there. The crossing has no on-screen motion of any kind.
//
// C itself is never left empty by this — one circle fading out of C and
// the next arriving into it from A are two different circles, and the
// arrival is a normal leg. Only the departing one is cut.
const HIDDEN_LEG = 2;
const HIDDEN_FADE = 0.35;

// Continuous position for role number `r` when the wheel's focus sits at
// `centerValue` (a real number, e.g. 2.4 = 40% of the way from role 2 to
// role 3). Matches the Figma keyframes exactly at integer centerValues —
// every leg lands on its slot fully visible, so no circle is ever hidden
// at rest, only mid-turn.
/**
 * How far the wheel has turned, in slots, at `centerValue`.
 *
 * The whole point of this existing separately is that everything standing on
 * the wheel is placed from it — the beads on the track, the stems, and the
 * circles — so no two of them can travel at different rates.
 *
 * They did. The beads turned on `centerValue` raw while the circles eased
 * across each leg on `smoothstep`, which agree at rest and nowhere else: stop
 * the scroll mid-step and a circle sat visibly off the gap in the beads it is
 * supposed to be standing in, and through the middle of a step the circles
 * ran ahead of the track and then waited for it. Five things sliding against
 * each other is not a wheel turning, it is five things moving at once, and it
 * is the reason the wheel read as lights coming on in a fixed row.
 *
 * Note that the eased fraction is shared by all five circles for free: the leg
 * a circle is on differs per role, but how far along it is does not, because
 * role numbers are whole and `centerValue - r` therefore has the same
 * fractional part for every one of them.
 */
function wheelTurn(centerValue) {
  const whole = Math.floor(centerValue);
  return whole + smoothstep(centerValue - whole);
}

function slotFor(r, centerValue) {
  const e = (((centerValue - r) % 5) + 5) % 5;
  const i = Math.floor(e);
  // The same easing wheelTurn applies to the track — see there.
  const frac = smoothstep(e - i);
  const from = SLOT_ANGLES[i];
  const to = SLOT_ANGLES[(i + 1) % 5];
  // How much this circle is *the* focused one: 1 sitting at CENTER, 0 anywhere
  // else on the ring. The wheel is a 5-cycle, so a circle is as near CENTER at
  // e = 4.8 (arriving) as at e = 0.2 (leaving) — hence the distance is measured
  // both ways round.
  const focus = 1 - smoothstep(clamp01(Math.min(e, 5 - e) / FOCUS_WINDOW));
  // 40 out on the ring, 80 at CENTER, and everything between on the way. It
  // rides the same `focus` the fill does, so a circle grows as it colours in
  // and shrinks as it fades back to an outline — one gesture, not two.
  const size = lerp(CIRCLE_SIZE_SMALL, CIRCLE_SIZE, focus);
  if (i !== HIDDEN_LEG) {
    // The angle is what travels, not the x/y. Interpolating the positions drew
    // a straight line between two points on a circle, which dips inside it —
    // the circle visibly closed on the ring mid-leg and pulled away again.
    return { ...slotAt(lerp(from, to, frac), size), visible: 1, focus, size };
  }
  // The jump from one end to the other happens at the halfway point,
  // where both fades have already bottomed out at zero — so the circle
  // is never once drawn anywhere between C and D.
  const landed = frac >= 0.5;
  return {
    ...slotAt(landed ? to : from, size),
    visible: landed
      ? smoothstep(clamp01((frac - (1 - HIDDEN_FADE)) / HIDDEN_FADE))
      : 1 - smoothstep(clamp01(frac / HIDDEN_FADE)),
    focus,
    size,
  };
}

export default function CareerSection() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasLayerRef = useRef(null);
  const circlesLayerRef = useRef(null);
  const startPanelRef = useRef(null);
  const startCircleRef = useRef(null);
  const roleRefs = useRef([]);
  // The framed photo inside each role, so the grayscale can be written to it
  // per frame without touching the copy that sits under it.
  const rolePhotoRefs = useRef([]);
  const circleRefs = useRef([]);
  // The stem each circle hangs off the track on — one per circle, travelling
  // with it.
  const spokeRefs = useRef([]);
  // [outline, lime, blue] per circle — see the crossfade in applyRaw.
  const coatRefs = useRef([]);
  const ringRef = useRef(null);
  const dotsRef = useRef(null);
  // The handoff glasses: the box that swings, the inlined overlay whose lens
  // shapes are the black, and the band of light that crosses them.
  const glassesRef = useRef(null);
  const glassesLensRef = useRef(null);
  const glassesShineRef = useRef(null);
  const changeWipeRef = useRef(null);
  const changeWhiteLayerRef = useRef(null);
  const changeWhiteCanvasRef = useRef(null);
  const changeBlackLayerRef = useRef(null);
  const changeBlackCanvasRef = useRef(null);
  const changeWhiteParaRef = useRef(null);
  const changeBlackParaRef = useRef(null);
  const chapterTitleRef = useRef(null);
  const chapterRefs = useRef([]);
  // Subtitle (masked sweep) and paragraph characters (typing) per canvas
  // chapter, so both run independently of the wrapper's own fade. CHANGE
  // lives on the wipe instead and keeps its own pair below — one set per
  // colour copy, driven from the same number so they stay identical.
  const subtitleRefs = useRef([]);
  const paraCharRefs = useRef(CHAPTERS.map(() => ({ current: [] })));
  const paraTypedRefs = useRef(CHAPTERS.map(() => ({ current: 0 })));
  const changeWhiteSubtitleRef = useRef(null);
  const changeBlackSubtitleRef = useRef(null);
  const changeWhiteCharsRef = useRef([]);
  const changeBlackCharsRef = useRef([]);
  const changeWhiteTypedRef = useRef(0);
  const changeBlackTypedRef = useRef(0);
  const contactRef = useRef(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    function updateScale() {
      const next = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT,
      );
      scaleRef.current = next;
      setScale(next);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    // Which chapter the step machine is currently at rest on, and when that
    // rest began. -1 means nothing is settled, so every title stays masked.
    // Only one chapter is ever focused, so one clock covers all of them.
    let settledChapter = -1;
    let settleTime = 0;
    let sharpenRaf = null;
    // The handoff glasses runs on its own clock too: when it started, and the
    // frame loop driving it. `null` means it is not playing — either it has
    // never been reached or the reader has scrolled off the step.
    let glassesTime = null;
    let glassesRaf = null;
    // Everything in hero-eyes.svg except the shut lens. That file carries three
    // eye states and two tints for the hero to cross-fade between; here only
    // the 50% black is wanted, so the rest is switched off once and never
    // touched again.
    // The gradient that sweeps across the lenses, and the id it is referenced
    // by. In user space so it can be moved in the drawing's own units — the
    // band is 160 wide against the file's 512.91, and angled by running its two
    // ends down the full height.
    const SHINE_ID = "role-glasses-shine";
    const SHINE_BAND = 160;
    const SHINE_DEFS = `<defs><linearGradient id="${SHINE_ID}" gradientUnits="userSpaceOnUse" x1="${-SHINE_BAND}" y1="0" x2="0" y2="498"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>`;
    // How far the band travels: clear off one side to clear off the other.
    const SHINE_TRAVEL = 512.91 + SHINE_BAND * 2;
    let shineGradient = null;

    /** Strip an overlay copy down to its shut-lens shapes. */
    function onlyClosedLens(root) {
      const kept = [];
      for (const el of root.querySelectorAll("[data-eye], [data-lens]")) {
        if (el.dataset.lens === "closed") kept.push(el);
        else el.style.opacity = "0";
      }
      for (const el of kept) el.style.opacity = "1";
      return kept;
    }

    function prepareGlasses() {
      const lensRoot = glassesLensRef.current;
      const shineRoot = glassesShineRef.current;
      if (!lensRoot || !shineRoot || shineGradient) return;

      // The black: the file's own shut-lens tint, at the 50% the hero opens on.
      onlyClosedLens(lensRoot);

      // The light: the same shapes again, repainted with the gradient.
      const svg = shineRoot.querySelector("svg");
      if (!svg) return;
      svg.insertAdjacentHTML("afterbegin", SHINE_DEFS);
      shineGradient = svg.querySelector(`#${SHINE_ID}`);
      for (const group of onlyClosedLens(shineRoot)) {
        for (const shape of group.querySelectorAll("path, ellipse, circle")) {
          shape.setAttribute("fill", `url(#${SHINE_ID})`);
          shape.setAttribute("fill-opacity", "1");
          // The tint carries a stroke of its own, which would draw a white
          // outline round each lens as the light went by.
          shape.setAttribute("stroke", "none");
        }
      }
    }

    // CHANGE is the exception everywhere in this file: it never touches the
    // shared canvas, it rides the wipe as two colour copies, so its title is
    // two elements that have to sharpen in lockstep or the seam would show.
    function titleElementsFor(i) {
      if (i < 0) return [];
      return CHAPTERS[i].ridesWipe
        ? [changeWhiteSubtitleRef.current, changeBlackSubtitleRef.current]
        : [subtitleRefs.current[i]];
    }

    function chapterAtStep(stepIdx) {
      return CHAPTERS.findIndex(
        (c) => stepIdx >= c.anchorStart && stepIdx <= c.anchorEnd,
      );
    }

    // Same two-copy problem as the title: CHANGE's paragraph exists twice, and
    // both have to be typed identically or the seam between the wipe's halves
    // would show a different number of characters on each side.
    function paragraphRefsFor(i) {
      if (i < 0) return [];
      return CHAPTERS[i].ridesWipe
        ? [
            [changeWhiteCharsRef, changeWhiteTypedRef],
            [changeBlackCharsRef, changeBlackTypedRef],
          ]
        : [[paraCharRefs.current[i], paraTypedRefs.current[i]]];
    }

    function applyChapterTyping(i, value) {
      if (i < 0) return;
      const total = CHAPTERS[i].paragraph.length;
      paragraphRefsFor(i).forEach(([charsRef, typedRef]) =>
        applyTyping(charsRef, typedRef, value, total),
      );
    }

    // Title and paragraph start together off one clock — the sweep runs across
    // the heading while the text types underneath it, rather than the page
    // sitting still through the sweep before anything else happens.
    function paintSettled() {
      if (settledChapter < 0) return;
      const elapsed = performance.now() - settleTime - TITLE_SHARPEN_DELAY_MS;
      const titleT = clamp01(elapsed / TITLE_SHARPEN_MS);
      titleElementsFor(settledChapter).forEach((el) =>
        applySubtitleReveal(el, smoothstep(titleT)),
      );

      const typeT = clamp01(elapsed / PARAGRAPH_TYPE_MS);
      // Linear, not smoothstepped — an eased typewriter visibly speeds up and
      // slows down mid-sentence, which reads as a glitch rather than typing.
      applyChapterTyping(settledChapter, typeT);

      sharpenRaf =
        titleT < 1 || typeT < 1 ? requestAnimationFrame(paintSettled) : null;
    }

    /** Park the glasses back before its first frame. */
    function resetGlasses() {
      glassesTime = null;
      if (glassesRaf) cancelAnimationFrame(glassesRaf);
      glassesRaf = null;
      const box = glassesRef.current;
      if (!box) return;
      box.style.opacity = "0";
      box.style.transform = `rotate(${GLASSES_START_DEG}deg)`;
      if (glassesLensRef.current) glassesLensRef.current.style.opacity = "0";
      if (glassesShineRef.current) glassesShineRef.current.style.opacity = "0";
    }

    // Four beats, in order: swung down onto the blob from upright, the lenses
    // filling with black, a band of light crossing them, and out.
    function paintGlasses() {
      if (glassesTime === null) return;
      const box = glassesRef.current;
      const lens = glassesLensRef.current;
      const shine = glassesShineRef.current;
      if (!box) return;
      const t = performance.now() - glassesTime;

      // Swing. Eased at both ends so it leaves the upright slowly and settles
      // rather than slamming flat.
      const swing = smoothstep(clamp01(t / GLASSES_SWING_MS));
      box.style.transform = `rotate(${GLASSES_START_DEG * (1 - swing)}deg)`;

      // On screen for the whole of the swing, and gone again over the last
      // beat. Nothing else fades the frame itself.
      const leaving = clamp01((t - GLASSES_AT.leave) / GLASSES_LEAVE_MS);
      box.style.opacity = String(clamp01(t / 160) * (1 - smoothstep(leaving)));

      // The lenses fill once it has landed.
      if (lens) {
        lens.style.opacity = String(
          smoothstep(clamp01((t - GLASSES_AT.darken) / GLASSES_DARKEN_MS)),
        );
      }

      // And the light crosses them. Travels a full width and a half so the
      // band is clear of the box at both ends, and fades at the extremes so it
      // never simply switches off mid-sweep.
      if (shine && shineGradient) {
        const p = clamp01((t - GLASSES_AT.shine) / GLASSES_SHINE_MS);
        const across = p > 0 && p < 1;
        // Faded in and out at the extremes so the band never simply switches
        // off part-way across a lens.
        shine.style.opacity = across ? String(Math.sin(p * Math.PI)) : "0";
        shineGradient.setAttribute(
          "gradientTransform",
          `translate(${(p * SHINE_TRAVEL).toFixed(1)} 0)`,
        );
      }

      glassesRaf = t < GLASSES_END ? requestAnimationFrame(paintGlasses) : null;
    }

    // Called with whichever step the scroll is nearest. CHANGE owns two steps,
    // so moving within it stays on the same chapter and deliberately does
    // not restart the sweep — the title is already settled and sharp.
    //
    // The title sweep and the typing are the one part of this section that is
    // *not* scrubbed. A half-swept heading held at whatever fraction the reader
    // stopped on is an unreadable heading, and a sentence that untypes itself
    // when you scroll back up is a gimmick; both want a clock. Everything the
    // canvas does — the wheel, the convergence, the wipe — is tied to the
    // scroll, and these run off arrival.
    function settleOn(stepIdx) {
      const next = chapterAtStep(stepIdx);
      if (next === settledChapter) return;
      titleElementsFor(settledChapter).forEach((el) =>
        applySubtitleReveal(el, 0),
      );
      applyChapterTyping(settledChapter, 0);
      if (sharpenRaf) cancelAnimationFrame(sharpenRaf);
      sharpenRaf = null;
      settledChapter = next;
      settleTime = performance.now();
      if (next >= 0) paintSettled();
    }

    // The glasses belongs to the handoff step, which is not a chapter — so it
    // gets its own arrival rather than riding settleOn's chapter index.
    // Restarted every time the step is left and returned to, like the chapter
    // sweeps: an animation you can only ever see once is one most readers never
    // see at all.
    function settleGlasses(stepIdx) {
      if (stepIdx === TITLE_STEP) {
        if (glassesTime !== null) return;
        prepareGlasses();
        glassesTime = performance.now();
        paintGlasses();
        return;
      }
      if (glassesTime !== null) resetGlasses();
    }

    function applyRaw(raw) {
      // Eased within each step rather than run as one straight line from 0 to
      // 11. Both are equally tied to the scroll — the difference is that this
      // comes to a stand on every step and pulls away from it again, so each
      // one is a place the story rests rather than a single instant it passes
      // through.
      //
      // Which matters here more than anywhere: a chapter's copy is rotated by
      // how far the timeline is from its step, so on a straight line the text
      // is turning the entire time it is on screen and is only upright for the
      // one frame the step goes past. The reader cannot stop on it. Eased, the
      // ends of every leg are slow and flat, and each chapter has a real band
      // of scroll where it sits still and square to be read.
      const linear = raw * STEP_COUNT;
      const whole = Math.min(STEP_COUNT - 1, Math.floor(linear));
      // STEP_HOLD parks the timeline on the integer for the first slice of the
      // step — a flat plateau, so copy that has just landed square in the
      // middle genuinely stops there. The smoothstep then eases what is left,
      // so the leg pulls away gently and decelerates into the next step rather
      // than slamming into its hold.
      const local = clamp01((linear - whole - STEP_HOLD) / (1 - STEP_HOLD));
      const stepPos = whole + smoothstep(local);

      // Act 1, phase A: the wheel — 0 (START at center) to 5 (role 5).
      // Already eased per leg by stepPos above, so it is taken straight.
      const centerValue = Math.min(5, stepPos);

      const startT = smoothstep(clamp01(centerValue / START_FADE_WINDOW));
      startPanelRef.current.style.opacity = String(1 - startT);

      // Act 1, phase B: 5 -> 6, converge + grow into one blob.
      const collapsePos = clamp01(stepPos - 5);
      const convergeT = smoothstep(clamp01(collapsePos / 0.6));
      const growT = smoothstep(clamp01((collapsePos - 0.3) / 0.7));
      const circleScale = lerp(1, GROWN_SIZE / CIRCLE_SIZE, growT);
      const circleOpacity = lerp(1, 0.5, growT);

      const s = scaleRef.current;
      const canvasOffsetX = (window.innerWidth - DESIGN_WIDTH * s) / 2;
      const canvasOffsetY = (window.innerHeight - DESIGN_HEIGHT * s) / 2;
      // START is always the focused circle, so it is always the large one.
      const startSize = CIRCLE_SIZE * s;
      startCircleRef.current.style.left = `${canvasOffsetX + CENTER_POS.x * s - startSize / 2}px`;
      startCircleRef.current.style.top = `${canvasOffsetY + CENTER_POS.y * s - startSize / 2}px`;
      startCircleRef.current.style.width = `${startSize}px`;
      startCircleRef.current.style.height = `${startSize}px`;
      startCircleRef.current.style.opacity = String(1 - startT);

      for (let r = 1; r <= 5; r++) {
        const el = circleRefs.current[r - 1];
        if (!el) continue;
        const base = slotFor(r, centerValue);
        const dx = lerp(base.x, CENTER_POS.x, convergeT);
        const dy = lerp(base.y, CENTER_POS.y, convergeT);
        // Its own size out on the ring, growing to the focused one as the five
        // gather in the middle — so the blob they become starts from the size
        // the survivor is already wearing rather than jumping to it.
        const baseSize = lerp(base.size, CIRCLE_SIZE, convergeT) * s;
        // Only the survivor swells and only the survivor travels. The other
        // four gather at the meeting point and stay the size they arrived at.
        //
        // Both of those used to apply to all five, which is what put two blobs
        // on the screen at once: the survivor climbed towards the canvas centre
        // as it grew while the other four sat back at the wheel's slot, growing
        // in place. They were invisible before only because they faded out
        // before they arrived — now that they stay for the meeting, they have
        // to stay *at* it.
        const isSurvivor = r === 5;
        const grownSize = isSurvivor ? baseSize * circleScale : baseSize;
        let centerX = canvasOffsetX + dx * s;
        let centerY = canvasOffsetY + dy * s;
        // The survivor does not just swell where the wheel left it: the wheel
        // sits low on the canvas, so a circle this size grown there would hang
        // off the bottom. It travels to the blob's own centre on the same curve
        // it grows on — which is also exactly where the next step reads it
        // from, so 6 -> 7 has nothing to jump over.
        if (isSurvivor) {
          centerX = lerp(centerX, canvasOffsetX + BLOB_CENTER_X * s, growT);
          centerY = lerp(centerY, canvasOffsetY + BLOB_CENTER_Y * s, growT);
        }
        el.style.left = `${centerX - grownSize / 2}px`;
        el.style.top = `${centerY - grownSize / 2}px`;
        el.style.width = `${grownSize}px`;
        el.style.height = `${grownSize}px`;
        // The four that are not the survivor stay whole for the whole journey
        // in, and only give way once they have actually met.
        //
        // They used to fade across the travel itself, so they never arrived:
        // the convergence read as four circles evaporating on their way to the
        // middle rather than as five becoming one. The window here starts at
        // half the collapse, by which point they are stacked on the same spot,
        // so what you watch is a gathering and not a disappearance — and being
        // coincident by then, fading them *is* merging them.
        const survivorFade = isSurvivor
          ? 1
          : 1 - smoothstep(clamp01((collapsePos - 0.5) / 0.2));
        el.style.opacity = String(
          circleOpacity * (isSurvivor ? startT : 1) * survivorFade * base.visible,
        );

        // Three coats, one circle. On the ring a circle is a white outline
        // until it reaches CENTER, where it fills lime; once the wheel is over
        // and the survivor is swelling into the background blob it turns blue.
        // Crossfades rather than swapped classes, so a circle on its way to
        // CENTER is genuinely halfway between the two states.
        const [ringEl, limeEl, blueEl] = coatRefs.current[r - 1] ?? [];
        if (ringEl) {
          ringEl.style.opacity = String((1 - base.focus) * (1 - growT));
          // The circles live in real screen px rather than on the scaled
          // canvas, so the outline has to be scaled by hand or it would sit at
          // a flat 2px however far the canvas has been shrunk.
          ringEl.style.borderWidth = `${2 * s}px`;
        }
        // The fill goes as the five gather, not as the blob grows. The focused
        // circle is the big lime one, and it should be gone by the time they
        // meet — what swells out of that meeting is the blue blob, and a lime
        // disc still sitting inside it while it grows reads as the big circle
        // *becoming* the blob rather than as five circles making one.
        if (limeEl) limeEl.style.opacity = String(base.focus * (1 - convergeT));
        // Only the survivor takes the blue. The other four are still white
        // outlines when they go, so nothing stacks up under the blob.
        if (blueEl) blueEl.style.opacity = String(isSurvivor ? growT : 0);

        // The stem, laid along the very angle the circle was placed on: from
        // the track outwards, ending where the circle's edge begins.
        //
        // It belongs to the track rather than to the circle once they part
        // company, so it fades on the ring's own `convergeT` and does not
        // travel to the meeting point — five stems following their circles
        // into the middle would draw a star in the centre of the canvas.
        const spoke = spokeRefs.current[r - 1];
        if (spoke) {
          const foot = spokeFoot(base.deg);
          spoke.style.left = `${canvasOffsetX + foot.x * s}px`;
          // The bar is 2 screen px tall and turns about its left edge, so it
          // has to be lifted its own half-height to put its *middle* on the
          // track rather than its top.
          spoke.style.top = `${canvasOffsetY + foot.y * s - 1}px`;
          spoke.style.width = `${SPOKE * s}px`;
          // A bar with no rotation points along +x; `deg` is measured from
          // straight up, so pointing it outwards is a quarter turn back.
          spoke.style.transform = `rotate(${base.deg - 90}deg)`;
          spoke.style.opacity = String(base.visible * (1 - convergeT));
        }
      }

      // Circles paint above the role photos during the wheel — so the one
      // sitting right below a photo is never clipped by it — and below the
      // canvas from the handoff onwards, since the survivor is a background
      // blob by then and the chapter copy has to sit on top of it.
      //
      // The swap happens when the handoff title starts to appear, not when the
      // step lands. It used to be `stepPos < 6`, and the half-step before 6 is
      // exactly the band where the title is fading up *and* the blob is
      // swelling: for that whole stretch the circle was still the upper layer
      // and grew straight over the words. The title has to be in front of the
      // circle for every frame it is legible, so the two switch on the same
      // number — see the title's own reveal below, which uses this window.
      const titleIn = TITLE_STEP - REVEAL_WINDOW;
      circlesLayerRef.current.style.zIndex = stepPos < titleIn ? "2" : "0";
      canvasLayerRef.current.style.zIndex = "1";

      // Act 2: past step 6, role 5's circle (still the very same element)
      // keeps moving through the chapter/outro blob positions instead of
      // the wheel's — picking up exactly where the convergence left it.
      if (stepPos > 6) {
        // One position per step from 6 to the outro, so these two are the
        // length of that list rather than written-out numbers — a chapter
        // gaining or losing a step must not silently leave the blob parked
        // one position short.
        const blobLast = BLOB_STEPS.length; // + the outro, minus one
        const blobPos = Math.min(blobLast, stepPos - 6);
        const blobIdx = Math.min(blobLast - 1, Math.floor(blobPos));
        const blobLocal = blobPos - blobIdx;
        const bt = smoothstep(blobLocal);
        const steps = [...BLOB_STEPS, OUTRO_BLOB];
        const bFrom = steps[blobIdx];
        const bTo = steps[blobIdx + 1];
        const bx = lerp(bFrom.x, bTo.x, bt);
        const by = lerp(bFrom.y, bTo.y, bt);
        const bsize = lerp(bFrom.size, bTo.size, bt);
        const survivor = circleRefs.current[4];
        if (survivor) {
          survivor.style.left = `${canvasOffsetX + bx * s}px`;
          survivor.style.top = `${canvasOffsetY + by * s}px`;
          survivor.style.width = `${bsize * s}px`;
          survivor.style.height = `${bsize * s}px`;
          survivor.style.opacity = "0.5";
        }
      }

      // The section only flips fully white once the wipe has actually
      // finished covering everything, on its way OUT to UXUI DESIGNER
      // (step 10) — not partway through CHANGE. During CHANGE itself the
      // background stays this dark navy as the base color, with the wipe
      // rectangle painting white on top of whatever it currently covers.
      section.style.backgroundColor = stepPos >= 10 ? "#ffffff" : "#06252e";

      // CHANGE is a rectangle three times the viewport's size (300vw x
      // 300vh), pinned by the midpoint of its own long (top) edge to a
      // fixed point at the vertical center of the screen's left edge,
      // rotating counter-clockwise around that point. It turns in from
      // fully off-screen to exactly flat (0deg) as CHANGE arrives — flat
      // is the half-covering pose, boundary running straight across the
      // screen — and HOLDS there through both of CHANGE's own steps
      // (word/title/paragraph all read their black-vs-white off this
      // same still boundary the whole time). Only once CHANGE is leaving
      // for UXUI DESIGNER (steps 9->10) does it keep turning the rest of
      // the way to fully cover everything.
      const wipeW = window.innerWidth * 3;
      const wipeH = window.innerHeight * 3;
      // In over 7 -> 7.8, held square across the screen either side of step 8,
      // then out over 8.2 -> 9. CHANGE used to own two steps and the hold was
      // the whole of the second one; on a single step the hold has to be a
      // band around it instead, or the wipe would arrive and start leaving on
      // the same frame and the copy riding it would never be still to read.
      const entryT = smoothstep(clamp01((stepPos - 7) / 0.8));
      const exitT = smoothstep(clamp01((stepPos - 8.2) / 0.8));
      const wipeAngle = 90 * (1 - entryT) - 90 * exitT;
      const wipeLeft = -wipeW / 2;
      const wipeTop = window.innerHeight / 2;
      const wipeOriginX = wipeW / 2;
      const wipeOriginY = 0;
      changeWipeRef.current.style.width = `${wipeW}px`;
      changeWipeRef.current.style.height = `${wipeH}px`;
      changeWipeRef.current.style.left = `${wipeLeft}px`;
      changeWipeRef.current.style.top = `${wipeTop}px`;
      changeWipeRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeOriginY}px`;
      changeWipeRef.current.style.transform = `rotate(${wipeAngle}deg)`;

      // CHANGE's whole text block is bolted to the wipe and travels with
      // it, so its black/white split is never animated — the split simply
      // IS the wipe's own edge, at whatever angle that edge happens to be
      // in right now. Two layers carry it, both turning around the exact
      // same pivot by the exact same wipeAngle:
      //
      //   BLACK is the wipe's own box, so its overflow:hidden clips the
      //         copy to precisely the covered side.
      //   WHITE is the mirror box sitting directly above that same edge
      //         (top shifted up by one full height, origin moved to its
      //         bottom edge), so it clips to precisely the uncovered side.
      //
      // The two clip edges are therefore the same screen line by
      // construction, not two things kept in sync: at any angle the
      // halves meet exactly, with no seam and no overlap. Each layer holds
      // a plain copy of the design canvas (see ChangeCopy), so word,
      // title and paragraph all ride together as one printed board — they
      // tilt on the way in, land flat when the wipe stops, and tilt away
      // again on the way out.
      const rideX = wipeOriginX + canvasOffsetX;
      const rideY = canvasOffsetY - wipeTop;
      changeBlackLayerRef.current.style.width = `${wipeW}px`;
      changeBlackLayerRef.current.style.height = `${wipeH}px`;
      changeBlackLayerRef.current.style.left = `${wipeLeft}px`;
      changeBlackLayerRef.current.style.top = `${wipeTop}px`;
      changeBlackLayerRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeOriginY}px`;
      changeBlackLayerRef.current.style.transform = `rotate(${wipeAngle}deg)`;
      changeBlackCanvasRef.current.style.left = `${rideX}px`;
      changeBlackCanvasRef.current.style.top = `${rideY}px`;
      changeBlackCanvasRef.current.style.transform = `scale(${s})`;

      changeWhiteLayerRef.current.style.width = `${wipeW}px`;
      changeWhiteLayerRef.current.style.height = `${wipeH}px`;
      changeWhiteLayerRef.current.style.left = `${wipeLeft}px`;
      changeWhiteLayerRef.current.style.top = `${wipeTop - wipeH}px`;
      changeWhiteLayerRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeH}px`;
      changeWhiteLayerRef.current.style.transform = `rotate(${wipeAngle}deg)`;
      changeWhiteCanvasRef.current.style.left = `${rideX}px`;
      changeWhiteCanvasRef.current.style.top = `${rideY + wipeH}px`;
      changeWhiteCanvasRef.current.style.transform = `scale(${s})`;

      // At the extreme angles the board is swung almost entirely off
      // screen, but a sliver of the word can still clip the pivot corner —
      // so both layers fade in together at the very start of the swing in
      // and out together at the very end of the swing out. One shared
      // value for both, so a fade can never break the half-and-half.
      const rideOpacity =
        smoothstep(clamp01((stepPos - 7) / 0.35)) *
        (1 - smoothstep(clamp01((stepPos - 8.65) / 0.35)));
      changeBlackLayerRef.current.style.opacity = String(rideOpacity);
      changeWhiteLayerRef.current.style.opacity = String(rideOpacity);

      // CHANGE used to own a second step whose only job was to page the
      // paragraph down to the rest of itself. The copy fits the window whole
      // now, so that step was a scroll that changed nothing on screen — it has
      // gone, and with it the paging. Both copies are simply pinned at the top
      // of their window; the offset is still written to both together so the
      // black/white split cannot drift apart if this ever moves again.
      if (changeWhiteParaRef.current)
        changeWhiteParaRef.current.style.transform = "translateY(0px)";
      if (changeBlackParaRef.current)
        changeBlackParaRef.current.style.transform = "translateY(0px)";

      roleRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(centerValue - (i + 1));
        const visible = 1 - smoothstep(clamp01(dist / REVEAL_WINDOW));
        const shown = visible * (1 - convergeT);
        el.style.opacity = String(shown);
        // All five roles are stacked on the same spot, and a faded-out one is
        // still a pointer target — so the topmost role in the DOM would
        // otherwise swallow anything aimed at the one you can actually see.
        el.style.pointerEvents = shown > 0.5 ? "auto" : "none";

        // Grey on the way in, full colour once the role is square in front of
        // you. Held back to the last part of the reveal (visible > 0.55) on
        // purpose: sharing the window with the fade would mean the photo was
        // still half transparent while it coloured, and the two together read
        // as one muddy dissolve rather than as a photograph arriving and then
        // filling in.
        const photo = rolePhotoRefs.current[i];
        if (photo) {
          const colour = smoothstep(clamp01((visible - 0.55) / 0.45));
          photo.style.filter = `grayscale(${((1 - colour) * 100).toFixed(1)}%)`;
        }
      });

      // The ring the slots stand on is the wheel itself, so it is there for
      // every role and for START, and gone the moment the circles leave their
      // slots and gather in the middle.
      ringRef.current.style.opacity = String(1 - convergeT);
      // The track turns with the wheel. One slot's worth of angle per role, in
      // the direction the circles themselves travel — CENTER to A is a step
      // anticlockwise — so a bead and the circle beside it move together and
      // the whole thing reads as one wheel rotating rather than as five lights
      // moving along a fixed row.
      //
      // `centerValue` is continuous, so this is scrubbed by the scroll like
      // everything else here: stop halfway between two roles and the ring is
      // halfway through its turn.
      //
      // Through wheelTurn rather than off `centerValue` raw, so the track eases
      // exactly as the circles standing on it do — see wheelTurn. Four of the
      // five legs are a 24deg step in the same direction this turns, so with
      // the easing shared a circle holds its place in the gap between two beads
      // for the whole leg, and the wheel moves as one piece.
      dotsRef.current.style.transform = `rotate(${-wheelTurn(centerValue) * SLOT_NEAR_DEG}deg)`;

      const titleDist = Math.abs(stepPos - TITLE_STEP);
      chapterTitleRef.current.style.opacity = String(
        1 - smoothstep(clamp01(titleDist / REVEAL_WINDOW)),
      );

      chapterRefs.current.forEach((el, i) => {
        if (!el) return;
        const chapter = CHAPTERS[i];
        // Below its start step or above its end step, distance is to
        // whichever edge is nearer; inside its own range (CHANGE spans
        // two steps) it's the focused chapter throughout, distance 0.
        const signedDist =
          stepPos < chapter.anchorStart
            ? stepPos - chapter.anchorStart
            : stepPos > chapter.anchorEnd
              ? stepPos - chapter.anchorEnd
              : 0;
        const dist = Math.abs(signedDist);
        // The circle "turns" as each chapter's text arrives/leaves: 0deg
        // exactly when it's the focused chapter, swinging away in the
        // direction of travel as it fades. Rotating this whole wrapper
        // (word + title + paragraph together) around the circle's own
        // center — not each element's own center — is what makes the
        // text read as riding on the turning circle, rather than each
        // block spinning in place like its own little pinwheel.
        const clampedDist = Math.min(1, Math.max(-1, signedDist));
        const spin = clampedDist * ROTATE_SPIN;
        const reveal = 1 - smoothstep(clamp01(dist / CHAPTER_REVEAL_WINDOW));
        el.style.opacity = String(reveal);
        el.style.transform = `rotate(${spin}deg)`;
        // The title is no longer driven off `reveal` — it has its own
        // post-settle clock. All that is left to do here is hold it fully
        // masked for as long as this chapter is not the settled one; on the
        // way out it simply fades with the wrapper's opacity above.
        // The paragraph is on the same footing as the title now: held empty
        // until this chapter is the settled one, then typed by that clock.
        // On the way out it stays whole and leaves with the wrapper's fade,
        // because the outgoing chapter is still the settled one until the
        // next step lands.
        if (i !== settledChapter) {
          applySubtitleReveal(subtitleRefs.current[i], 0);
          applyChapterTyping(i, 0);
        }
      });

      // CHANGE never touches the canvas above — it rides the wipe — so it is
      // driven here rather than in the loop. Both colour copies get the
      // identical numbers, or the white/black halves would arrive at
      // different rates and the seam between them would show.
      //
      // Same split as the canvas chapters above: held empty until CHANGE is
      // the settled chapter, then title and paragraph run off that clock.
      const changeIndex = CHAPTERS.indexOf(CHANGE_CHAPTER);
      if (changeIndex !== settledChapter) {
        applySubtitleReveal(changeWhiteSubtitleRef.current, 0);
        applySubtitleReveal(changeBlackSubtitleRef.current, 0);
        applyChapterTyping(changeIndex, 0);
      }

      const contactDist = Math.abs(stepPos - 10);
      const contactShown = 1 - smoothstep(clamp01(contactDist / REVEAL_WINDOW));
      contactRef.current.style.opacity = String(contactShown);
      // The card holds the resume link, and a faded-out element is still a
      // click target. Without this it would sit invisibly over the section for
      // the whole scroll, catching clicks meant for whatever is on screen.
      contactRef.current.style.pointerEvents =
        contactShown > 0.5 ? "auto" : "none";
    }

    // Which step the scroll is currently nearest. Only the chapter copy cares
    // — everything on the canvas reads the continuous position instead — so
    // rounding is all it needs: a chapter takes over as its step becomes the
    // closer one, which is the midpoint of the hand-off its crossfade is
    // already centred on.
    function render(raw) {
      applyRaw(raw);
      const step = Math.round(raw * STEP_COUNT);
      settleOn(step);
      settleGlasses(step);
    }

    const driver = driveWithScroll(section, render);
    // The chapter copy sets the section's own height on a cold load, and a
    // webfont landing late moves where every step sits.
    document.fonts?.ready.then(driver.refresh);
    window.addEventListener("load", driver.refresh);

    return () => {
      window.removeEventListener("load", driver.refresh);
      driver.stop();
      if (sharpenRaf) cancelAnimationFrame(sharpenRaf);
      if (glassesRaf) cancelAnimationFrame(glassesRaf);
    };
  }, []);

  return (
    // One screen of sticky content plus a screen of scroll range per step. The
    // steps *are* this range now — the story is read off how far through it we
    // are — so its length is what sets the section's pace rather than being
    // dead distance to be crossed.
    <section
      ref={sectionRef}
      className="section-career relative bg-[#06252e]"
      style={{ height: `${TRACK_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* CHANGE's white reveal — a viewport-sized rectangle pinned by its
            left-edge-center to that same point on the screen, rotating
            counter-clockwise to cover the whole background white (see
            applyRaw). */}
        <div
          ref={changeWipeRef}
          // Three viewports across and three down, swung about a point on the
          // left edge — so wherever it is in its swing it is covering a great
          // deal of screen. It is a block of colour and nothing more, and
          // leaving it hittable puts a huge invisible sheet over the stage.
          className="absolute bg-white pointer-events-none"
          style={{ width: 0, height: 0 }}
        />

        {/* CHANGE's copy, riding the wipe. Two layers, both moving and
            turning exactly like the wipe above (all kept identical in
            applyRaw), each holding its own full-color copy of the same
            design canvas and each clipped by its own overflow:hidden.

            The white one's box sits directly above the wipe's edge, the
            black one's box IS the wipe, so between them they cut the copy
            along that one edge and nothing else — the halves can't drift
            apart, because there is only ever one line. Neither copy ever
            recolors or fades on its own; the board just swings in, stops,
            and swings out, and the edge decides what's what. */}
        <div
          ref={changeWhiteLayerRef}
          className="absolute overflow-hidden pointer-events-none"
          style={{ width: 0, height: 0, opacity: 0, zIndex: 3 }}
        >
          <div
            ref={changeWhiteCanvasRef}
            className="absolute"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transformOrigin: "0 0",
            }}
          >
            <ChangeCopy
              tone="text-white"
              paraRef={changeWhiteParaRef}
              subtitleRef={changeWhiteSubtitleRef}
              charsRef={changeWhiteCharsRef}
            />
          </div>
        </div>
        <div
          ref={changeBlackLayerRef}
          className="absolute overflow-hidden pointer-events-none"
          style={{ width: 0, height: 0, opacity: 0, zIndex: 4 }}
        >
          <div
            ref={changeBlackCanvasRef}
            className="absolute"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transformOrigin: "0 0",
            }}
          >
            <ChangeCopy
              tone="text-black"
              paraRef={changeBlackParaRef}
              subtitleRef={changeBlackSubtitleRef}
              charsRef={changeBlackCharsRef}
            />
          </div>
        </div>

        {/* START + the 5 role circles — one of which (role 5) becomes the
            sole "about" blob later. Sized/positioned directly in real
            screen px, not via the canvas's transform: scale. Stacking
            flips between the two acts (see circlesLayerRef in applyRaw):
            on top of the canvas during the wheel, so a circle never gets
            clipped by the role photo above it, then behind it once the
            survivor becomes the blob, so it sits under the chapter text. */}
        {/* pointer-events-none: during the wheel this layer sits at z-index 2,
            above the role photo, and it covers the whole stage. Without this it
            catches the pointer over the photo and the hover below never fires.
            The circles are drawn decoration — nothing here is meant to be
            clicked or hovered. */}
        <div
          ref={circlesLayerRef}
          className="absolute inset-0 pointer-events-none"
        >
          {/* The stems, before the circles so they paint underneath — a stem
              runs to the circle's edge, and a pixel of it crossing the edge on
              a rounded corner is the kind of thing you only see once you have
              seen it.

              One per circle rather than one per slot, and they move with the
              circle rather than sitting on the track. That is the difference
              between a wheel and a row of sockets: five fixed stems with
              circles hopping between them says the mounts stay and the circles
              move, which is exactly the reading the beads exist to prevent.

              Sized in screen px per frame like everything else in this layer,
              which is also why the 2px is not scaled here — the track's own
              stroke is set in screen px too, and a stem thinner than the line
              it joins reads as a hair rather than a bar. */}
          {[1, 2, 3, 4, 5].map((r) => (
            <div
              key={r}
              ref={(el) => {
                spokeRefs.current[r - 1] = el;
              }}
              className="absolute bg-white"
              style={{ left: 0, top: 0, height: 2, transformOrigin: "0 50%" }}
            />
          ))}

          <div
            ref={startCircleRef}
            className="absolute bg-[#c9e529] rounded-full flex items-center justify-center"
            style={{
              left: 0,
              top: 0,
              width: CIRCLE_SIZE * scale,
              height: CIRCLE_SIZE * scale,
            }}
          >
            <p
              className="font-['JetBrains_Mono'] font-bold text-[#06252e] leading-none"
              style={{ fontSize: 24 * scale }}
            >
              START
            </p>
          </div>

          {/* No numbers on the circles any more — the design marks the current
              role by filling its circle, and the four waiting ones are bare
              outlines. All three coats are always mounted and only their
              opacities move (see applyRaw), so a circle can be caught halfway
              between outline and fill on its way in or out of CENTER. */}
          {[1, 2, 3, 4, 5].map((r) => (
            <div
              key={r}
              ref={(el) => {
                circleRefs.current[r - 1] = el;
              }}
              className="absolute rounded-full"
              style={{
                left: 0,
                top: 0,
                width: CIRCLE_SIZE * scale,
                height: CIRCLE_SIZE * scale,
              }}
            >
              {[
                "absolute inset-0 rounded-full border-solid border-white",
                "absolute inset-0 rounded-full bg-[#c9e529]",
                "absolute inset-0 rounded-full bg-[#0492bd]",
              ].map((className, coat) => (
                <div
                  key={coat}
                  ref={(el) => {
                    coatRefs.current[r - 1] ??= [];
                    coatRefs.current[r - 1][coat] = el;
                  }}
                  className={className}
                  style={{ opacity: 0, borderWidth: coat === 0 ? 2 : 0 }}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          ref={canvasLayerRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            ref={canvasRef}
            className="relative shrink-0"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            {/* The ring the five slots stand on. It sits on the canvas rather
                than in the circles layer above, so it paints behind them and
                the circles read as beads threaded on it. Its centre is below
                the canvas's bottom edge on purpose — only the top of the arc
                is ever meant to be seen. */}
            <div
              ref={ringRef}
              className="absolute"
              style={{ left: 0, top: 0, width: "100%", height: "100%" }}
            >
              {/* The line the wheel runs on. Its centre is below the canvas's
                  bottom edge on purpose — only the top of the arc is ever meant
                  to be seen.

                  The stroke is set in *screen* pixels — divided by the canvas
                  scale, since everything in here is drawn in canvas units and
                  then scaled. A flat 1px was 1 canvas px, which on a 1440-wide
                  window is three quarters of a screen pixel and less than that
                  on a laptop: the browser renders the shortfall as a grey wash
                  rather than a line, and along the shallow top of the arc,
                  where the curve is nearly horizontal and the antialiasing
                  spreads over two rows, it disappears entirely.

                  Two screen px rather than one for the same reason a hairline
                  is the wrong weight here at all: this is the track five
                  circles run on, and it has to be visible enough to be read as
                  one. */}
              <div
                className="absolute rounded-full border-solid border-white"
                style={{
                  left: RING.x,
                  top: RING.y,
                  width: RING.size,
                  height: RING.size,
                  borderWidth: 2 / scale,
                }}
              />
              {/* The beads on the line, in a layer of their own so the whole
                  string can be turned at once — one transform a frame rather
                  than thirty positions.

                  Turned about the ring's own centre, which is well below the
                  canvas, so what you see at the top of the arc is the beads
                  travelling sideways along the line. That is the point: the
                  five circles hopping from slot to slot say the wheel advanced,
                  but only the track moving says the wheel *turned*. Without it
                  the circles read as lights coming on in a fixed row of
                  sockets.

                  Inside the ring's element, so the beads fade with the line —
                  they are the track, and a track that half-disappears as the
                  wheel converges would leave a string of dots hanging in an
                  empty canvas. */}
              <div
                ref={dotsRef}
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  transformOrigin: `${RING_CENTER.x}px ${RING_CENTER.y}px`,
                }}
              >
                {DOT_ANGLES.map((deg) => {
                  const { x, y } = dotAt(deg);
                  return (
                    <div
                      key={deg}
                      className="absolute rounded-full bg-white"
                      style={{ left: x, top: y, width: DOT_SIZE, height: DOT_SIZE }}
                    />
                  );
                })}
              </div>
            </div>

            <div
              ref={startPanelRef}
              className="absolute flex flex-col items-center gap-[24px] leading-none"
              style={{
                left: START_TITLE_BOX.x,
                top: START_TITLE_BOX.y,
                width: START_TITLE_BOX.width,
              }}
            >
              <div className="flex items-start gap-[20px] font-['Plus_Jakarta_Sans'] font-bold text-[#0492bd] text-[84px] whitespace-nowrap">
                <p>EVERY</p>
                <p className="text-right">ROLE</p>
              </div>
              <p className="font-['Pretendard'] font-medium text-white text-[24px] text-center">
                제가 맡고 있는 역할로 저를 소개합니다
              </p>
            </div>

            {ROLES.map((role, i) => (
              <div
                key={role.n}
                ref={(el) => {
                  roleRefs.current[i] = el;
                }}
                className="absolute inset-0"
                style={{ opacity: 0 }}
              >
                {/* The photo arrives grey and comes up in colour as the role
                    turns to face you — see the grayscale written in applyRaw.
                    Read off the scroll like everything else on this canvas, so
                    it runs backwards when you scroll back up rather than
                    playing once and staying.

                    The filter goes on this box rather than on the image so it
                    survives the two different fits below, and rather than on
                    the role wrapper so it never touches the copy underneath. */}
                <div
                  ref={(el) => {
                    rolePhotoRefs.current[i] = el;
                  }}
                  className="absolute overflow-hidden rounded-[20px]"
                  style={{
                    left: IMAGE_BOX.x,
                    top: IMAGE_BOX.y,
                    width: IMAGE_BOX.width,
                    height: IMAGE_BOX.height,
                  }}
                >
                  {role.imgFit.custom ? (
                    <img
                      src={role.img}
                      alt={role.title}
                      className="absolute max-w-none"
                      style={{
                        width: role.imgFit.custom.width,
                        height: role.imgFit.custom.height,
                        left: role.imgFit.custom.left,
                        top: role.imgFit.custom.top,
                      }}
                    />
                  ) : (
                    <img
                      src={role.img}
                      alt={role.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: role.imgFit.position }}
                    />
                  )}
                </div>
                {/* Inside the ring now rather than under the photo, and
                    correspondingly smaller — the wheel is the frame the copy
                    is read in, so it has the ring's width to work with rather
                    than the canvas's. */}
                <div
                  className="absolute flex flex-col items-center gap-[12px] leading-none"
                  style={{
                    left: TEXT_BOX.x,
                    top: TEXT_BOX.y,
                    width: TEXT_BOX.width,
                  }}
                >
                  <p className="font-['Plus_Jakarta_Sans'] font-bold text-[#0492bd] text-[42px] whitespace-nowrap">
                    {role.title}
                  </p>
                  <p className="font-['Pretendard'] font-medium text-white text-[16px] text-center whitespace-pre-line">
                    {role.desc}
                  </p>
                </div>
              </div>
            ))}

            <div
              ref={chapterTitleRef}
              className="absolute flex flex-col font-['Plus_Jakarta_Sans'] font-bold text-white text-[120px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap"
              style={{
                left: CHAPTER_TITLE_POS.x,
                top: CHAPTER_TITLE_POS.y,
                opacity: 0,
              }}
            >
              <p>Role</p>
              <p>Led me to a career</p>

              {/* Every text property here is restated rather than inherited —
                  the wrapper carries the 120px bold heading style, which this
                  caption would otherwise pick up wholesale. */}
              <p className="mt-[24px] font-['Pretendard'] font-medium text-[16px] tracking-[-0.02em] leading-[1.2]">
                개입의 시점을 재정의합니다
              </p>
            </div>

            {/* The glasses that lands on the blob at the handoff (154:3910).
                On the canvas rather than in the circles layer, so it paints
                over the blob — the circles drop behind the canvas at exactly
                this step (see the z-index swap in applyRaw).

                It plays on a clock rather than off the scroll, like the chapter
                sweeps and for the same reason: it is a four-beat sequence with
                an order, and scrubbed it would run backwards, stall halfway and
                have no end. Reaching the step is the cue; it plays itself out
                from there. See paintGlasses. */}
            <div
              ref={glassesRef}
              aria-hidden="true"
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: GLASSES_BOX.x,
                top: GLASSES_BOX.y,
                width: GLASSES_BOX.width,
                height: GLASSES_BOX.height,
                // Hinged on the drawing's own right tip — the point the whole
                // thing stands on and swings down from.
                transformOrigin: `${GLASSES_PIVOT_X * 100}% 50%`,
                opacity: 0,
              }}
            >
              {/* Back to front, as in the hero: the lens tint, then the light
                  crossing it, then the frame over both. The frame comes last
                  because it is the thing in front — a lens painted over its own
                  glasses is the one arrangement that reads as wrong at once. */}
              <div
                ref={glassesLensRef}
                className="absolute inset-0 [&_svg]:absolute [&_svg]:inset-0 [&_svg]:h-full [&_svg]:w-full"
                style={{ opacity: 0 }}
                dangerouslySetInnerHTML={{ __html: heroEyes }}
              />
              {/* The light crossing them — a second copy of the same overlay,
                  with the lens shapes filled by a moving gradient instead of
                  black.

                  A plain band swept over the box was the obvious thing and the
                  wrong one: the box is the artwork's, which is half again as
                  tall as the glasses and sits on a 620px circle, so what
                  crossed the screen was a searchlight over the whole blob. The
                  light belongs to the lenses, so it is painted *as* the lenses
                  — masked by the only shapes that are actually lens-shaped,
                  which are already in this file. */}
              <div
                ref={glassesShineRef}
                className="absolute inset-0 [&_svg]:absolute [&_svg]:inset-0 [&_svg]:h-full [&_svg]:w-full"
                style={{ opacity: 0 }}
                dangerouslySetInnerHTML={{ __html: heroEyes }}
              />
              <img
                src={glassesImg}
                alt=""
                className="absolute inset-0 h-full w-full"
                // The hero's blue knocked out to the black the design draws
                // here. One flat colour through an alpha mask, so this is the
                // same shape and nothing is re-exported to keep in step.
                style={{ filter: "brightness(0)" }}
              />
            </div>

            {/* CHANGE is absent here on purpose — it lives entirely in the
                two wipe-riding layers above, so it never sits on this
                canvas and never takes this canvas's spin-out exit. */}
            {CHAPTERS.map((chapter, i) =>
              chapter.ridesWipe ? null : (
                <div
                  key={i}
                  ref={(el) => {
                    chapterRefs.current[i] = el;
                  }}
                  className="absolute inset-0"
                  style={{
                    opacity: 0,
                    transformOrigin: `${CHAPTER_PIVOT.x}px ${CHAPTER_PIVOT.y}px`,
                  }}
                >
                  <p
                    className={`absolute font-['Plus_Jakarta_Sans'] font-bold text-[70px] tracking-[-0.02em] leading-[1.2] text-right whitespace-nowrap ${chapter.dark ? "text-white" : "text-black"}`}
                    style={{ right: WORD_RIGHT, top: WORD_TOP }}
                  >
                    {chapter.word}
                  </p>
                  <div
                    className="absolute flex flex-col gap-[42px] items-start"
                    style={{
                      left: chapter.box.x,
                      top: chapter.box.y,
                      width: chapter.box.width,
                    }}
                  >
                    <p
                      ref={(el) => {
                        subtitleRefs.current[i] = el;
                      }}
                      className={`font-['Pretendard'] font-bold text-[50px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap ${chapter.dark ? "text-white" : "text-black"}`}
                      style={SUBTITLE_MASK_STYLE}
                    >
                      {chapter.title}
                    </p>
                    <TypedParagraph
                      text={chapter.paragraph}
                      charsRef={paraCharRefs.current[i]}
                      className={`font-['Pretendard'] text-[24px] tracking-[-0.02em] leading-[1.3] whitespace-pre-line [word-break:keep-all] ${chapter.dark ? "text-white" : "text-black"}`}
                    />
                  </div>
                </div>
              ),
            )}

            <div
              ref={contactRef}
              className="absolute flex flex-col gap-[42px] items-start text-black"
              style={{ left: CONTACT_BOX.x, top: CONTACT_BOX.y, opacity: 0 }}
            >
              <p className="font-['Pretendard'] font-semibold text-[48px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap">
                더 나은 사용자 경험, 함께 고민하겠습니다
              </p>
              <div className="flex flex-col gap-[10px] items-start font-['Pretendard'] font-medium text-[28px] tracking-[-0.02em] leading-[1.2]">
                <div className="flex items-center justify-between w-[379px]">
                  <p>email</p>
                  <p>| eysj1620@gmail.com</p>
                </div>
                {/* Opens the document, and in a new tab: a recruiter reading
                    this is somewhere in the middle of a scroll-driven page, and
                    navigating away from it loses that place. `noreferrer` for
                    the usual reason — a new tab opened this way otherwise gets a
                    handle back to the page that opened it. */}
                <div className="flex items-center justify-between w-[215px]">
                  <p>이력서</p>
                  <a
                    href={RESUME_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    | 보러가기
                  </a>
                </div>
                <p>이 사이트는 Claude Code로 직접 만들었습니다</p>
                <p>©2026yunsujeong</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
