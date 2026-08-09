import { useEffect, useRef, useState } from "react";
import { driveWithScroll } from "../lib/scrollDriver";
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

const CIRCLE_SIZE = 80;
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
// the ring: every one sits SLOT_GAP clear of the line, and moving between two
// of them means interpolating the *angle* (see slotFor), so a circle keeps that
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
// Taken from the three slots the design does agree on: 710.5 out from the ring's
// centre, which off a radius of 646.5 and a circle of 40 leaves this much air.
const SLOT_GAP = 24;
const SLOT_RADIUS = RING.size / 2 + SLOT_GAP + CIRCLE_SIZE / 2;
// Five slots around the top of the ring, measured in degrees from straight up:
// CENTER at 0, a pair to each side. They are *not* evenly spaced — the design
// lays the four out as two horizontal rows rather than by angle, and those rows
// land 27.46deg and 45.67deg off centre. Written out as the two the design
// actually uses rather than as multiples of one step, since a single step that
// fits the near pair misses the far one by more than a circle's width.
const SLOT_NEAR_DEG = 27.46;
const SLOT_FAR_DEG = 45.67;
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

/** Top-left corner of the 80px box for a circle sitting `deg` around the ring. */
function slotAt(deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: RING_CENTER.x + SLOT_RADIUS * Math.sin(rad) - CIRCLE_SIZE / 2,
    y: RING_CENTER.y - SLOT_RADIUS * Math.cos(rad) - CIRCLE_SIZE / 2,
  };
}
const CENTER_POS = slotAt(0);

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
const OUTRO_BLOB = BLOB_STEPS[0];

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
const CHAPTER_TITLE_POS = { x: 118, y: 217 };
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
      "그런데 개입은 늘 문제가 발생한 이후였습니다.",
      "문제가 생기기 전에 막을 수는 없을까",
      "이 고민의 끝에서 디자인을 만났습니다.",
      "저는 무언가를 막아설 때보다",
      "조금씩 나아지게 만들 때 힘을 얻는 사람입니다.",
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
      "체계가 없는 작은 기관에서 일하며,",
      "방향이 필요하면 스스로 답을 찾는 게 익숙해졌습니다.",
      "지금도 막히면 방법을 찾아 풀고,",
      "그 과정에 기록과 AI를 도구로 씁니다.",
      "지금 보고 계신 이 사이트도 직접 설계하고 만들었습니다.",
      "",
      "개입의 시점을 문제 이후에서 설계 이전으로 옮기는 것.",
      "사용자도 의식하지 못한 불편을 설계하려는 이유입니다.",
    ].join("\n"),
  },
];

const CHANGE_CHAPTER = CHAPTERS.find((c) => c.ridesWipe);

// CHANGE's copy rides the wipe rather than sitting on the shared canvas, so
// its paragraph gets a box of its own to sit in.
//
// This used to be a window the text was read *through*: the paragraph ran to
// fifteen lines, eight showed, and CHANGE was given a second step whose only
// job was to page down to the rest. The copy is seven lines now — it fits
// whole — so that step had nothing to do but take a scroll, and both it and
// the paging are gone. The box is sized to the copy and asserts it.
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
const STEP_COUNT = 10;
// How much page scroll each step costs, plus the one screen the sticky stage
// occupies. This is the section's pace: a screen of scrolling moves the story
// on by roughly one step.
const STEP_VH = 70;
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
function slotFor(r, centerValue) {
  const e = (((centerValue - r) % 5) + 5) % 5;
  const i = Math.floor(e);
  const frac = smoothstep(e - i);
  const from = SLOT_ANGLES[i];
  const to = SLOT_ANGLES[(i + 1) % 5];
  // How much this circle is *the* focused one: 1 sitting at CENTER, 0 anywhere
  // else on the ring. The wheel is a 5-cycle, so a circle is as near CENTER at
  // e = 4.8 (arriving) as at e = 0.2 (leaving) — hence the distance is measured
  // both ways round.
  const focus = 1 - smoothstep(clamp01(Math.min(e, 5 - e) / FOCUS_WINDOW));
  if (i !== HIDDEN_LEG) {
    // The angle is what travels, not the x/y. Interpolating the positions drew
    // a straight line between two points on a circle, which dips inside it —
    // the circle visibly closed on the ring mid-leg and pulled away again.
    return { ...slotAt(lerp(from, to, frac)), visible: 1, focus };
  }
  // The jump from one end to the other happens at the halfway point,
  // where both fades have already bottomed out at zero — so the circle
  // is never once drawn anywhere between C and D.
  const landed = frac >= 0.5;
  return {
    ...slotAt(landed ? to : from),
    visible: landed
      ? smoothstep(clamp01((frac - (1 - HIDDEN_FADE)) / HIDDEN_FADE))
      : 1 - smoothstep(clamp01(frac / HIDDEN_FADE)),
    focus,
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
  const circleRefs = useRef([]);
  // [outline, lime, blue] per circle — see the crossfade in applyRaw.
  const coatRefs = useRef([]);
  const ringRef = useRef(null);
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
      const stepPos = whole + smoothstep(linear - whole);

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
      const baseSize = CIRCLE_SIZE * s;
      const grownSize = baseSize * circleScale;

      startCircleRef.current.style.left = `${canvasOffsetX + CENTER_POS.x * s}px`;
      startCircleRef.current.style.top = `${canvasOffsetY + CENTER_POS.y * s}px`;
      startCircleRef.current.style.width = `${baseSize}px`;
      startCircleRef.current.style.height = `${baseSize}px`;
      startCircleRef.current.style.opacity = String(1 - startT);

      for (let r = 1; r <= 5; r++) {
        const el = circleRefs.current[r - 1];
        if (!el) continue;
        const base = slotFor(r, centerValue);
        const dx = lerp(base.x, CENTER_POS.x, convergeT);
        const dy = lerp(base.y, CENTER_POS.y, convergeT);
        let centerX = canvasOffsetX + dx * s + baseSize / 2;
        let centerY = canvasOffsetY + dy * s + baseSize / 2;
        // Role 5 is the survivor, and it does not just swell where the wheel
        // left it: the wheel sits low on the canvas, so a circle this size
        // grown there would hang off the bottom. It travels to the blob's own
        // centre on the same curve it grows on — which is also exactly where
        // the next step reads it from, so 6 -> 7 has nothing to jump over.
        if (r === 5) {
          centerX = lerp(centerX, canvasOffsetX + BLOB_CENTER_X * s, growT);
          centerY = lerp(centerY, canvasOffsetY + BLOB_CENTER_Y * s, growT);
        }
        el.style.left = `${centerX - grownSize / 2}px`;
        el.style.top = `${centerY - grownSize / 2}px`;
        el.style.width = `${grownSize}px`;
        el.style.height = `${grownSize}px`;
        // Role 5 is the one hiding behind the START circle near
        // centerValue 0, and the one that survives the convergence to
        // become the sole blob for the rest of the story — the other 4
        // fade out as they arrive so 5 stacked translucent layers don't
        // compound into something far more opaque than the single blob.
        const survivorFade = r === 5 ? 1 : 1 - convergeT;
        el.style.opacity = String(
          circleOpacity * (r === 5 ? startT : 1) * survivorFade * base.visible,
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
        if (limeEl) limeEl.style.opacity = String(base.focus * (1 - growT));
        if (blueEl) blueEl.style.opacity = String(growT);
      }

      // Circles paint above the role photos during the wheel (so the one
      // sitting right below a photo is never clipped by it), then below
      // the canvas once past the handoff, since the survivor becomes a
      // background blob that chapter text needs to sit on top of.
      // Strictly < 6, not <=: at step 6 itself the "Role / Led me to a
      // career" title needs to sit in front of the now-grown blob, not
      // behind it.
      circlesLayerRef.current.style.zIndex = stepPos < 6 ? "2" : "0";
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
        el.style.opacity = String(visible * (1 - convergeT));
      });

      // The ring the slots stand on is the wheel itself, so it is there for
      // every role and for START, and gone the moment the circles leave their
      // slots and gather in the middle.
      ringRef.current.style.opacity = String(1 - convergeT);

      const titleDist = Math.abs(stepPos - 6);
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
      contactRef.current.style.opacity = String(
        1 - smoothstep(clamp01(contactDist / REVEAL_WINDOW)),
      );
    }

    // Which step the scroll is currently nearest. Only the chapter copy cares
    // — everything on the canvas reads the continuous position instead — so
    // rounding is all it needs: a chapter takes over as its step becomes the
    // closer one, which is the midpoint of the hand-off its crossfade is
    // already centred on.
    function render(raw) {
      applyRaw(raw);
      settleOn(Math.round(raw * STEP_COUNT));
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
          className="absolute bg-white"
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
        <div ref={circlesLayerRef} className="absolute inset-0">
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
              className="absolute rounded-full border border-solid border-white"
              style={{
                left: RING.x,
                top: RING.y,
                width: RING.size,
                height: RING.size,
              }}
            />

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
                <div
                  className="absolute overflow-hidden rounded-[8px]"
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
                <div className="flex items-center justify-between w-[379px]">
                  <p>이력서</p>
                  <p>| eysj1620@gmail.com</p>
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
