/**
 * Structure data for the built-in reference library.
 *
 * The same shape the upload analyser returns (see TAG_SCHEMA in vite.config.js),
 * so the structure tab draws these with exactly the code that draws an upload's.
 * Written by hand rather than generated because the seeds ship with the site:
 * `/api/analyze` only exists under `npm run dev`, so a deployed build has no way
 * to produce this, and a reference whose structure tab is a generic placeholder
 * is a reference that cannot demonstrate the feature it is there to demonstrate.
 *
 * Coordinates are fractions of the screenshot — 0 is the left/top edge, 1 the
 * right/bottom — read off the images against a tenths grid. `tone` is the
 * element's real lightness with the colour thrown away: 0 is black, 1 is white.
 *
 * Order is paint order. Backgrounds and containers come before the things that
 * sit on them, so a label lands on top of its button rather than under it.
 */

/**
 * One element.
 *
 * `radius` and `border` are fractions of the screen's *width*, not of the
 * element — a design rounds every card to the same 24px whatever size the card
 * is, and expressing it against the element would turn one decision into forty
 * different numbers. They are measured, not guessed: they are most of what is
 * left of a reference's character once the colour and the words are gone, so a
 * pill that should be a pill and a crisp 8 that should stay crisp are the whole
 * difference between two screens in this view.
 *
 * `border` is 0 for almost everything. A filled card has no outline; its edge
 * is the tone change against what it sits on.
 */
export const b = (role, x, y, w, h, tone, radius = 0, border = 0, shape = "사각형", warp = {}) => ({
  role,
  x,
  y,
  w,
  h,
  tone,
  shape,
  radius,
  border,
  rotate: warp.rotate ?? 0,
  taper: warp.taper ?? 0,
  bend: warp.bend ?? 0,
  icon: warp.icon ?? null,
  lines: 0,
  chars: 0,
  align: "왼쪽",
});

/**
 * How an element sits off the upright: tilted, lying back, curled.
 *
 * `x`/`y`/`w`/`h` stay the upright box the element would occupy if it were
 * straight, and this says how it departs from that. Keeping the two apart is
 * what lets a tilted card still be positioned by measuring where it sits,
 * rather than by solving for four rotated corners.
 *
 * - `rotate` — degrees, clockwise positive.
 * - `taper`  — perspective: how much shorter the top edge is than the bottom.
 * - `bend`   — how far the long edges bow, as a fraction of the short side.
 */
const tilt = (rotate = 0, taper = 0, bend = 0) => ({ rotate, taper, bend });

/** Which glyph an icon is, for the ones the screen makes unambiguous. */
const ic = (icon) => ({ icon });

/**
 * Places children inside a parent, their coordinates given as fractions of the
 * parent's box rather than the screen's.
 *
 * The point is to stop measuring the same relationship twice. Four speech
 * bubbles that each hold a photo at one end are not four positions to read off
 * a grid, they are one arrangement repeated — and read off the grid four times
 * it came out with the photo at 80% of the bubble's height in one and 96% in
 * another, and the inset from the edge varying by two and a half times. Nothing
 * in the design does that. Given as one set of fractions, they cannot drift.
 */
const inside = (parent, children) => [
  parent,
  ...children.map((child) => ({
    ...child,
    x: parent.x + child.x * parent.w,
    y: parent.y + child.y * parent.h,
    w: child.w * parent.w,
    h: child.h * parent.h,
  })),
];

/**
 * A circle tucked into one end of its parent, inset by `pad` of the parent's
 * height on every side.
 *
 * A circle needs equal width and height *in pixels*, and x is a fraction of the
 * screen's width while y is a fraction of its height — so the conversion has to
 * go through the screen's aspect ratio or the circle comes out an egg. Doing it
 * here means one number (`pad`) decides the inset, the diameter and the
 * centring for every instance at once.
 */
const endCircle = (parent, side, pad, tone, aspect) => {
  const diameter = parent.h * (1 - 2 * pad);
  const width = diameter / aspect;
  const insetX = (parent.h * pad) / aspect;
  return b(
    "이미지",
    side === "오른쪽" ? parent.x + parent.w - insetX - width : parent.x + insetX,
    parent.y + parent.h * pad,
    width,
    diameter,
    tone,
    0,
    0,
    "원",
  );
};

/**
 * A run of type. `chars` is how many characters the real text had, because the
 * drawing sets exactly that many letters — it is the only thing carrying the
 * length of the original words.
 *
 * Most of this file still counts Hangul double, on the assumption that a Hangul
 * syllable is about twice the width of a Latin letter. Measured, it is not.
 * On Duolingo's quiz screen, at 36px of ink:
 *
 *     감사합니다  5 syllables  178px   →  35.6px each
 *     우리는      3 syllables  105px   →  35.0px each
 *     먹었어요    4 syllables  139px   →  34.8px each
 *
 * and one JetBrains Mono glyph at that ink height advances about 28.6px. So a
 * syllable is 1.2 stand-in letters, not 2 — counting it double sets every
 * Korean label about 60% too long, which is why Korean runs overshoot their
 * boxes and get clipped. The word chips below now carry their true syllable
 * count; the rest of the file has not been recounted yet.
 */
export const t = (x, y, w, h, tone, chars, lines = 1, align = "왼쪽", warp = {}) => ({
  role: "텍스트",
  x,
  y,
  w,
  h,
  tone,
  shape: "사각형",
  radius: 0,
  border: 0,
  rotate: warp.rotate ?? 0,
  taper: warp.taper ?? 0,
  bend: warp.bend ?? 0,
  lines,
  chars,
  align,
});

/**
 * A component: one definition, drawn in two places.
 *
 * `build` returns the component's own parts in coordinates local to its box —
 * 0 is its left/top edge, 1 its right/bottom. The structure tab places it into
 * a screen (see `place`); the component tab draws the same call on its own at
 * `aspect`. Neither redraws it, so the sheet cannot drift out of agreement with
 * the screen it claims to have come from, and four instances of one component
 * cannot end up with four different insets.
 *
 * `build` is given the aspect of the box it is being placed into, because some
 * of what a component knows about itself is only answerable there: a circle
 * needs equal width and height in pixels, and x is a fraction of width while y
 * is a fraction of height, so the ratio between them has to come in from
 * outside or the circle comes out an egg.
 */
export const JELLY_BUBBLE = {
  name: "후기 말풍선",
  aspect: 609 / 190,
  build: ({ side = "오른쪽", chars = 20, aspect = 609 / 190 } = {}) => {
    const right = side === "오른쪽";
    // One number decides the photo's inset, its diameter and its centring.
    const pad = 0.06;
    const diameter = 1 - 2 * pad;
    const width = diameter / aspect;
    const inset = pad / aspect;
    return [
      // radius 0.5/aspect is exactly half the box's height, which is what makes
      // the pill a pill whatever proportions it is placed at.
      b("카드", 0, 0, 1, 1, 0.99, 0.5 / aspect, 0),
      t(right ? 0.11 : 0.36, 0.3, 0.53, 0.5, 0.35, chars, 2),
      b("이미지", right ? 1 - inset - width : inset, pad, width, diameter, right ? 0.5 : 0.45, 0, 0, "원"),
    ];
  },
};

/**
 * Places a component into a screen.
 *
 * Coordinates scale into the given box; `radius` and `border` scale by the
 * box's width alone, and `ink` by its height, because all three are fractions
 * of whatever frame they are drawn in and the frame changes from the
 * component's own box to the screen. A component states its type size against
 * itself — a label is half the height of the chip it sits in, wherever the chip
 * is — and only here does that become a fraction of a screen.
 */
export const place = (component, screenAspect, x, y, w, h, opts = {}) => {
  const parts = component.build({ ...opts, aspect: (w / h) * screenAspect }).map((part) => ({
    ...part,
    x: x + part.x * w,
    y: y + part.y * h,
    w: part.w * w,
    h: part.h * h,
    radius: part.radius * w,
    border: part.border * w,
    ...(part.ink === undefined ? {} : { ink: part.ink * h }),
  }));
  // The outline takes the shape of the component's own outermost part, so a
  // pill-shaped component is marked with a pill and not a box around it.
  parts.forEach((part) => { part.of = component.name; });
  const outer = parts[0];
  return [
    ...parts,
    {
      role: "컴포넌트",
      // The marker names what was placed and which state of it, so the
      // component sheet can be read back out of the screen rather than drawn
      // a second time. See componentsFromLayout below.
      of: component.name,
      state: opts.state ?? "기본",
      x,
      y,
      w,
      h,
      tone: 0.5,
      shape: outer?.shape ?? "사각형",
      radius: outer?.radius ?? 0,
      border: 0,
      rotate: outer?.rotate ?? 0,
      taper: outer?.taper ?? 0,
      bend: outer?.bend ?? 0,
      icon: null,
      lines: 0,
      chars: 0,
      align: "왼쪽",
    },
  ];
};

/**
 * A folder tab. Eight of them on one screen, so eight chances to drift — and
 * they had: heights of 0.053 to 0.055, label insets varying by a third, four
 * rows whose spacing wandered. One definition, one row pitch, one inset.
 *
 * `w` comes in because the tabs are different widths and the corner is a fixed
 * 20px whatever the width: a radius given as a fraction of the element has to
 * be divided back out by how wide this one happens to be.
 */
export const MOSBY_TAB = {
  name: "폴더 탭",
  aspect: 252 / 37,
  build: ({ w = 0.18, tone = 0.35, ink = 0.97, chars = 18 } = {}) => [
    b("칩", 0, 0, 1, 1, tone, 0.014 / w, 0),
    // `ink` is the measured height of one line of the real label, as a fraction
    // of the screenshot's height — the same field the screen blocks carry, and
    // the reason it is stated here is that a component is measured once rather
    // than once per instance, so the eight tabs cannot come out eight sizes.
    { ...t(0.014 / w, 0.236, 1 - 0.028 / w, 0.49, ink, chars, 1, "가운데"), ink: 16 / 37, weight: 400 },
  ],
};

/**
 * The whole top bar, not one link out of it.
 *
 * A single nav link is type and a hit area — there is no box, no state, and
 * nothing to report but a font size, which is not a component so much as a
 * text style. The bar is the reusable unit: four links at their real spacing,
 * the gap that throws the ticket button to the far edge, and the button.
 *
 * It brings its sky with it. White type over a photograph is what this bar is,
 * and lifted onto pale paper without its ground it would be a component drawn
 * as nothing.
 */
export const AQUA_NAV = {
  name: "내비게이션 바",
  aspect: 1340 / 41,
  build: () => [
    b("배경", 0, 0, 1, 1, 0.52),
    t(0, 0.16, 0.0554, 0.7, 0.97, 8),
    t(0.0836, 0.16, 0.0867, 0.7, 0.97, 13),
    t(0.1996, 0.16, 0.0554, 0.7, 0.97, 8),
    t(0.2853, 0.16, 0.0543, 0.7, 0.97, 7),
    b("버튼", 0.9164, 0, 0.0836, 1, 0.5, 0.01526, 0.00115),
    t(0.9279, 0.28, 0.0439, 0.48, 0.97, 6, 1, "가운데"),
    b("아이콘", 0.977, 0.28, 0.01463, 0.44, 0.97, 0, 0, "사각형", ic("arrow-up-right")),
  ],
};

/**
 * FOLLOW.ART's top bar — the same bar on both of its screens, which is the
 * whole reason it is a component. The hero reverses it out of orange and the
 * testimonials page sets it dark on pale, so the ink comes in as a parameter;
 * everything about where the links sit is shared, because on the real site it
 * is one bar and not two that resemble each other.
 */
export const FOLLOWART_NAV = {
  name: "내비게이션 바",
  aspect: 1379 / 26,
  build: ({ ink = 0.97, subInk = 0.9 } = {}) => [
    t(0, 0, 0.0589, 0.4615, ink, 11),
    t(0, 0.5385, 0.0761, 0.4359, subInk, 22),
    t(0.5025, 0.0769, 0.0274, 0.4615, ink, 5),
    t(0.5432, 0.0769, 0.0457, 0.4615, ink, 11),
    t(0.6041, 0.0769, 0.068, 0.4615, ink, 15),
    t(0.6883, 0.0769, 0.0305, 0.4615, ink, 7),
    t(0.736, 0.0769, 0.0213, 0.4615, ink, 3),
    t(0.934, 0.0769, 0.0284, 0.4615, ink, 5),
    t(0.9777, 0.0769, 0.0223, 0.4615, ink, 4),
  ],
};

/**
 * Duolingo's word chip. Seven of them on the quiz screen in three conditions,
 * which is exactly the kind of repetition that drifts when it is drawn seven
 * times: the hand-read version had them at three different heights.
 *
 * The corner is a fixed 16px however wide the word is, so — as with the folder
 * tab — a radius given as a fraction of the element has to be divided back out
 * by this one's width. `border` likewise: the bank's untapped chips carry a 2px
 * outline, the tapped ones are solid, and the spent slots are flat grey.
 */
export const DUO_WORD_CHIP = {
  name: "단어 칩",
  aspect: 160 / 79,
  build: ({ w = 0.19, tone = 0.84, ink = 0.45, chars = 6, border = 0 } = {}) => [
    b("칩", 0, 0, 1, 1, tone, 0.019 / w, border / w),
    // 36px of ink on an 1826px screen, the same in the bank as in the answer.
    ...(chars ? [{ ...t(0.08, 0.25, 0.84, 0.5, ink, chars, 1, "가운데"), ink: 36 / 79 }] : []),
  ],
};

/**
 * The pair of buttons at the foot of the quiz. Measured, both are 774×92 — the
 * hand-drawn version had them 99 and 104 tall, and the sheet claimed a third
 * figure again. The solid one carries Duolingo's 12px bottom lip; that is a
 * shadow rather than part of the button, so the component is the face.
 */
export const DUO_BOTTOM_BUTTON = {
  name: "하단 버튼",
  aspect: 774 / 92,
  build: ({ w = 0.9214, tone = 0.64, ink = 0.98, chars = 4, border = 0 } = {}) => [
    b("버튼", 0, 0, 1, 1, tone, 0.019 / w, border / w),
    { ...t(0.3, 0.3, 0.4, 0.4, ink, chars, 1, "가운데"), ink: 30 / 92 },
  ],
};

/** The lesson's progress bar: a track with the same bar filled part of the way
 *  along it, so the fill cannot end up a different height from what holds it. */
export const DUO_PROGRESS = {
  name: "진행 바",
  aspect: 513 / 34,
  build: ({ w = 0.6107, fill = 0.55 } = {}) => [
    b("칩", 0, 0, 1, 1, 0.88, 0.0202 / w, 0),
    b("칩", 0, 0, fill, 1, 0.55, 0.0202 / w, 0),
  ],
};

/**
 * Duolingo's end-of-lesson stat card. Three across the bottom, and the reason
 * they are one definition is that they are one card: measured, all three are
 * 213×180, where drawing them separately had produced widths of 0.20, 0.26 and
 * 0.255 — a sixth of the card's width apart.
 *
 * The colour is the outer card; the figure sits on a white panel inset within
 * it. The icon and the figure are centred *as a pair*, which is why the icon
 * is not at a fixed inset: a card reading 2:10 pushes its glyph further left
 * than one reading 29.
 */
export const DUO_STAT_CARD = {
  name: "성과 카드",
  aspect: 213 / 180,
  build: ({ w = 0.2536, tone = 0.82, chars = 5, digits = 2, icon = "bolt" } = {}) => {
    const glyph = 0.2;
    const gap = 0.03;
    // 29 measures 51px inside a 213px card, so a digit is 0.12 of the card and
    // the pair's width follows from how many there are. Measured on all three:
    // the icon then lands within a hundredth of where the screenshot puts it.
    const figure = digits * 0.13;
    const left = (1 - (glyph + gap + figure)) / 2;
    return [
      b("카드", 0, 0, 1, 1, tone, 0.032 / w, 0),
      { ...t(0.08, 0.07, 0.84, 0.16, 0.98, chars, 1, "가운데"), ink: 21 / 180 },
      b("배경", 0.042, 0.256, 0.906, 0.617, 0.99, 0.026 / w, 0),
      b("아이콘", left, 0.483, glyph, 0.278, tone, 0, 0, "사각형", ic(icon)),
      { ...t(left + glyph + gap, 0.47, figure, 0.3, tone, digits, 1, "왼쪽"), ink: 34 / 180 },
    ];
  },
};

/**
 * The grocery list's product row. Two of them, identical to within two pixels
 * on the real screen (600×188 and 602×187), so any difference between them in
 * the drawing was the drawing's, not the screen's.
 */
export const GROCERY_ITEM = {
  name: "상품 리스트 카드",
  aspect: 600 / 188,
  build: ({ w = 0.7143, chars = 7, sub = 4 } = {}) => [
    b("카드", 0, 0, 1, 1, 0.56, 0.024 / w, 0),
    b("이미지", 0.053, 0.17, 0.24, 0.606, 0.5),
    // The boxes start where the real type starts and are left wider than it:
    // the box is only what the run is clipped to, and a monospaced stand-in set
    // to the same ink height as a proportional original runs longer than it.
    { ...t(0.38, 0.314, 0.27, 0.16, 0.2, chars), ink: 25 / 188 },
    { ...t(0.38, 0.516, 0.15, 0.128, 0.35, sub), ink: 22 / 188 },
    b("버튼", 0.783, 0.266, 0.13, 0.41, 0.35, 0, 0, "원"),
    b("아이콘", 0.822, 0.335, 0.052, 0.27, 0.95, 0, 0, "사각형", ic("plus")),
  ],
};

/**
 * FOLLOW.ART's testimonial card. Three of them on the page — one straightened
 * and brought forward, two thrown back at an angle — and they are one card, so
 * `warp` comes in as a parameter and every part of the card takes it. That is
 * the whole difference between a card that is tilted and a tilted arrangement
 * of parts that happen to line up.
 *
 * The quote's length, the name and the two lines under it change per card and
 * nothing else does.
 */
export const FOLLOWART_TESTIMONIAL = {
  name: "후기 카드",
  aspect: 451 / 436,
  build: ({ chars = 48, lines = 8, name = 27, role = 7, from = 7, warp = {} } = {}) => [
    b("카드", 0, 0, 1, 1, 0.99, 0, 0, "사각형", warp),
    t(0.0466, 0.0538, 0.8696, 0.5462, 0.12, chars, lines, "왼쪽", warp),
    b("구분선", 0.0466, 0.7154, 0.8696, 0.0046, 0.85, 0, 0, "사각형", warp),
    b("이미지", 0.0466, 0.7769, 0.1491, 0.1538, 0.5, 0, 0, "사각형", warp),
    t(0.2484, 0.7877, 0.3944, 0.0354, 0.2, name, 1, "왼쪽", warp),
    t(0.2484, 0.8969, 0.0963, 0.0323, 0.45, role, 1, "왼쪽", warp),
    t(0.2484, 0.9323, 0.0963, 0.0323, 0.45, from, 1, "왼쪽", warp),
    // The flag in the bottom corner.
    b("이미지", 0.8292, 0.8846, 0.1025, 0.0692, 0.5, 0, 0, "사각형", warp),
  ],
};

/**
 * Prev and Next under the testimonials. The same control mirrored — the chevron
 * leads on the way back and follows on the way on — which is one component with
 * a side, not two.
 */
export const FOLLOWART_PAGER = {
  name: "페이지 이동",
  aspect: (0.048 * 1400) / (0.03 * 670),
  build: ({ side = "왼쪽", chars = 4, w = 0.048 } = {}) => {
    const back = side === "왼쪽";
    const glyph = b(
      "아이콘",
      back ? 0 : 0.63,
      0,
      0.37,
      1,
      0.3,
      0.006 / w,
      0,
      "원",
      ic(back ? "chevron-left" : "chevron-right"),
    );
    const label = t(back ? 0.48 : 0, 0.2, 0.52, 0.63, 0.3, chars, 1, back ? "왼쪽" : "오른쪽");
    return back ? [glyph, label] : [label, glyph];
  },
};

const FOLLOWART_NAV_BOX = [0.01, 0.012, 0.985, 0.039];
const followArtNav = (screenAspect, ink, subInk) =>
  place(FOLLOWART_NAV, screenAspect, ...FOLLOWART_NAV_BOX, { ink, subInk });

// Sky, sea, and a shoal of glass animals hanging between them, with a nav bar
// floating over the lot.
//
// The sky and the sea are ground, not pictures — they are what the page is
// printed on, and a crossed box over the whole frame would say "a photograph
// goes here" about the entire screen, which is true and useless. The shoal is
// the one thing on this page that is a picture, so it is the one crossed box.
const aquaplanet = [
  b("배경", 0, 0, 1, 0.78, 0.52, 0, 0, "사각형"),
  b("배경", 0, 0.779, 1, 0.221, 0.33, 0, 0, "사각형"),
  b("이미지", 0.265, 0.09, 0.46, 0.78, 0.66, 0, 0, "사각형"),
  b("구분선", 0, 0.775, 1, 0.005, 0.42, 0.0146, 0),
  ...place(AQUA_NAV, 1400 / 818, 0.02, 0.032, 0.957, 0.05),
];

// Display type running the full width with four cards crossing over it. Each
// card is drawn with its own contents — name, role, patron badge, photo, wallet
// button — because the repetition of those four is the whole composition.
const followArtHero = [
  b("배경", 0, 0, 1, 1, 0.58, 0, 0, "사각형"),
  t(0.01, 0.045, 0.975, 0.74, 0.97, 9, 1, "가운데"),
  b("카드", 0.277, 0.445, 0.118, 0.41, 0.08, 0, 0.0016, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.283, 0.455, 0.016, 0.055, 0.95, 12, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  b("칩", 0.327, 0.563, 0.035, 0.024, 0.93, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("이미지", 0.318, 0.625, 0.054, 0.075, 0.5, 0, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("카드", 0.345, 0.375, 0.175, 0.47, 0.08, 0, 0.0016, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.36, 0.443, 0.065, 0.042, 0.95, 5, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.36, 0.468, 0.072, 0.042, 0.95, 8, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.383, 0.545, 0.025, 0.016, 0.75, 7, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.383, 0.562, 0.033, 0.017, 0.95, 10, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  b("칩", 0.452, 0.488, 0.06, 0.025, 0.93, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.462, 0.494, 0.04, 0.013, 0.15, 10, 1, "가운데", tilt(-20, 0.05, 0.05)),
  b("이미지", 0.448, 0.545, 0.087, 0.12, 0.5, 0, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("칩", 0.41, 0.665, 0.053, 0.035, 0.92, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("아이콘", 0.416, 0.673, 0.012, 0.018, 0.6, 0, 0, "사각형", tilt(-20, 0, 0)),
  t(0.432, 0.674, 0.026, 0.016, 0.15, 8, 1, "왼쪽", tilt(-20, 0, 0)),
  b("카드", 0.513, 0.285, 0.167, 0.475, 0.08, 0, 0.0016, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.528, 0.308, 0.078, 0.043, 0.95, 6, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.528, 0.333, 0.084, 0.043, 0.95, 12, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.552, 0.436, 0.023, 0.016, 0.75, 6, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  t(0.552, 0.453, 0.038, 0.017, 0.95, 10, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  b("칩", 0.617, 0.363, 0.048, 0.026, 0.93, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.625, 0.369, 0.033, 0.014, 0.15, 10, 1, "가운데", tilt(-20, 0.05, 0.05)),
  b("이미지", 0.607, 0.42, 0.085, 0.125, 0.5, 0, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("칩", 0.572, 0.558, 0.056, 0.036, 0.92, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("아이콘", 0.578, 0.566, 0.012, 0.019, 0.6, 0, 0, "사각형", tilt(-20, 0, 0)),
  t(0.594, 0.567, 0.028, 0.017, 0.15, 8, 1, "왼쪽", tilt(-20, 0, 0)),
  b("카드", 0.64, 0.175, 0.1, 0.485, 0.08, 0, 0.0016, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.645, 0.193, 0.019, 0.072, 0.95, 14, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  b("칩", 0.678, 0.238, 0.032, 0.023, 0.93, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  t(0.66, 0.308, 0.017, 0.015, 0.75, 6, 1, "왼쪽", tilt(-20, 0.05, 0.05)),
  b("이미지", 0.688, 0.418, 0.045, 0.068, 0.5, 0, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("칩", 0.678, 0.502, 0.04, 0.03, 0.92, 0.006, 0, "사각형", tilt(-20, 0.05, 0.05)),
  b("이미지", 0.63, 0.63, 0.115, 0.145, 0.12, 0, 0, "사각형", tilt(-24, 0, 0.18)),
  ...followArtNav(1400 / 669, 0.97, 0.9),
  t(0.01, 0.915, 0.065, 0.03, 0.97, 9),
  t(0.01, 0.955, 0.235, 0.03, 0.97, 34),
  b("버튼", 0.833, 0.88, 0.164, 0.11, 0.05, 0, 0, "사각형"),
  t(0.845, 0.942, 0.025, 0.023, 0.97, 4),
  b("아이콘", 0.965, 0.9, 0.02, 0.025, 0.95, 0.006, 0, "원", ic("arrow-right")),
];

// Testimonial cards scattered at angles over the same display type, one of them
// straightened and brought forward. The angles are not in the data — the boxes
// are, and the drawing keeps them where they land.
const VOICES_ASPECT = 1400 / 670;
const voicesCard = (x, y, w, h, opts) =>
  place(FOLLOWART_TESTIMONIAL, VOICES_ASPECT, x, y, w, h, opts);

const followArtVoices = [
  b("배경", 0, 0, 1, 1, 0.72, 0, 0, "사각형"),
  t(0.01, 0.05, 0.975, 0.6, 0.06, 12, 1, "가운데"),
  // Two thrown back, one straightened and brought forward — the same card each
  // time, so the sheet cannot claim proportions the page does not have.
  ...voicesCard(0.095, 0.265, 0.195, 0.55, { chars: 34, lines: 9, name: 13, role: 6, from: 14, warp: tilt(20, 0.05, 0.06) }),
  ...voicesCard(0.695, 0.255, 0.19, 0.535, { chars: 36, lines: 9, name: 4, role: 18, from: 12, warp: tilt(-13, 0.05, 0.06) }),
  // The fourth is a sliver off the right edge — a card's edge, not a card.
  b("카드", 0.925, 0.275, 0.075, 0.515, 0.97, 0, 0, "사각형", tilt(-13, 0.05, 0.06)),
  ...voicesCard(0.345, 0.25, 0.322, 0.65, { chars: 48, lines: 8, name: 27, role: 7, from: 7 }),
  ...place(FOLLOWART_PAGER, VOICES_ASPECT, 0.34, 0.92, 0.048, 0.03, { side: "왼쪽", chars: 4, w: 0.048 }),
  ...place(FOLLOWART_PAGER, VOICES_ASPECT, 0.616, 0.92, 0.049, 0.03, { side: "오른쪽", chars: 4, w: 0.049 }),
  ...followArtNav(1400 / 670, 0.15, 0.3),
  t(0.01, 0.955, 0.06, 0.032, 0.5, 7),
  b("버튼", 0.833, 0.88, 0.164, 0.11, 0.05, 0, 0, "사각형"),
  t(0.845, 0.942, 0.025, 0.023, 0.97, 4),
  b("아이콘", 0.965, 0.9, 0.02, 0.025, 0.95, 0.006, 0, "원"),
];

// A dark page whose whole lower half is a stack of overlapping folder tabs. The
// background element is what keeps the white headline visible — see the 배경
// case in SnapkeepSpread's WireBlock.
// Four rows, evenly pitched, tabs sitting on the band below each.
const MOSBY_ASPECT = 1400 / 674;
const MOSBY_ROW_TOP = 0.645;
const MOSBY_ROW_PITCH = 0.0723;
const MOSBY_TAB_H = 0.055;
const mosbyTab = (x, row, w, tone, chars, ink = 0.97) =>
  place(MOSBY_TAB, MOSBY_ASPECT, x, MOSBY_ROW_TOP + row * MOSBY_ROW_PITCH, w, MOSBY_TAB_H, {
    // One tab on the screen is set far darker than the rest. Not another
    // component — the same one, emphasised.
    state: tone < 0.2 ? "강조" : "기본",
    w, tone, ink, chars,
  });

const mosbys = [
  // 0.08 rather than 0.1: the ramp has six steps, and 0.1 rounds up off the
  // darkest one. The real page is very nearly black and should sit on it.
  b("배경", 0, 0, 1, 1, 0.08, 0, 0, "사각형"),
  t(0.455, 0.02, 0.09, 0.035, 0.95, 13, 1, "가운데"),
  t(0.955, 0.025, 0.03, 0.023, 0.9, 5),
  t(0.13, 0.175, 0.748, 0.145, 0.95, 18, 1, "가운데"),
  t(0.32, 0.395, 0.365, 0.1, 0.6, 70, 3, "가운데"),
  b("카드", 0.073, 0.698, 0.864, 0.064, 0.35, 0, 0, "사각형"),
  b("카드", 0.073, 0.762, 0.864, 0.06, 0.32, 0, 0, "사각형"),
  b("카드", 0.073, 0.822, 0.864, 0.073, 0.28, 0, 0, "사각형"),
  b("카드", 0.073, 0.895, 0.864, 0.105, 0.4, 0, 0, "사각형"),
  ...mosbyTab(0.098, 0, 0.18, 0.35, 18),
  ...mosbyTab(0.283, 0, 0.127, 0.42, 11),
  ...mosbyTab(0.098, 1, 0.137, 0.3, 11),
  ...mosbyTab(0.098, 2, 0.124, 0.25, 10),
  ...mosbyTab(0.235, 2, 0.108, 0.75, 9, 0.1),
  ...mosbyTab(0.355, 2, 0.15, 0.06, 12),
  ...mosbyTab(0.098, 3, 0.14, 0.4, 11),
  ...mosbyTab(0.248, 3, 0.144, 0.33, 14),
  t(0.77, 0.735, 0.15, 0.02, 0.95, 27, 1, "오른쪽"),
  t(0.855, 0.808, 0.065, 0.02, 0.95, 12, 1, "오른쪽"),
  t(0.8, 0.88, 0.12, 0.02, 0.95, 22, 1, "오른쪽"),
  t(0.71, 0.955, 0.21, 0.02, 0.95, 40, 1, "오른쪽"),
];

// A lesson screen: progress rail at the top, the prompt, the word bank, and a
// feedback panel that slides up over the bottom third. The status bar is three
// separate glyphs, not one strip — at this granularity the drawing starts to
// read as the real screen rather than as a diagram of it.
const DUO_ASPECT = 840 / 1826;
// The three conditions the chip appears in. Only what differs is named here;
// everything else about the chip is the component's. The heights are measured:
// the answer line's chips really do sit 79px where the bank's sit 84.
const DUO_TAPPED = { state: "탭됨", tone: 0.84, ink: 0.5, border: 0, h: 0.0433 };
const DUO_BANK = { state: "기본", tone: 0.99, ink: 0.25, border: 0.0024, h: 0.046 };
const DUO_SPENT = { state: "빈 슬롯", tone: 0.9, ink: 0.9, border: 0, h: 0.046 };
const duoChip = (x, y, w, chars, state = DUO_TAPPED) =>
  place(DUO_WORD_CHIP, DUO_ASPECT, x, y, w, state.h, { ...state, w, chars });

const DUO_BUTTON_BOX = { x: 0.0393, w: 0.9214, h: 0.0504 };
const duoButton = (y, opts) =>
  place(DUO_BOTTOM_BUTTON, DUO_ASPECT, DUO_BUTTON_BOX.x, y, DUO_BUTTON_BOX.w, DUO_BUTTON_BOX.h, {
    ...opts, w: DUO_BUTTON_BOX.w,
  });

const duolingoQuiz = [
  // The screen itself is white, and it has to be said: the wireframe’s paper is
  // a light grey, so without it the spent word slots — a real #E5E5E5 on white —
  // would come out the same tone as the page and read as nothing.
  b("배경", 0, 0, 1, 1, 1),
  t(0.4, 0.008, 0.2, 0.022, 0.55, 8, 1, "가운데"),
  t(0.11, 0.026, 0.09, 0.022, 0.15, 4),
  b("아이콘", 0.212, 0.028, 0.032, 0.018, 0.3, 0, 0, "사각형"),
  b("아이콘", 0.702, 0.029, 0.048, 0.016, 0.2, 0, 0, "사각형", ic("signal")),
  b("아이콘", 0.772, 0.029, 0.042, 0.016, 0.2, 0, 0, "사각형", ic("wifi")),
  b("아이콘", 0.838, 0.029, 0.062, 0.016, 0.2, 0, 0, "사각형", ic("battery")),
  b("아이콘", 0.045, 0.095, 0.065, 0.035, 0.55, 0, 0, "사각형", ic("close")),
  t(0.26, 0.084, 0.12, 0.018, 0.5, 7, 1, "가운데"),
  ...place(DUO_PROGRESS, DUO_ASPECT, 0.1595, 0.104, 0.6107, 0.0186, { w: 0.6107, fill: 0.55 }),
  b("칩", 0.8, 0.1, 0.055, 0.026, 0.5, 0.019, 0),
  t(0.872, 0.099, 0.045, 0.026, 0.5, 2),
  b("아이콘", 0.048, 0.148, 0.052, 0.027, 0.6, 0.019, 0, "사각형", ic("sparkle")),
  t(0.11, 0.152, 0.2, 0.02, 0.5, 10),
  t(0.045, 0.193, 0.535, 0.033, 0.2, 24),
  b("이미지", 0.11, 0.245, 0.18, 0.185, 0.55, 0, 0, "사각형"),
  b("카드", 0.34, 0.305, 0.45, 0.07, 0.97, 0.019, 0),
  b("아이콘", 0.408, 0.325, 0.062, 0.032, 0.5, 0, 0, "사각형", ic("speaker")),
  t(0.5, 0.324, 0.25, 0.032, 0.25, 11),
  // The seven word chips, all one component. The tapped words sit filled on the
  // answer line; the bank below holds the ones still untapped, outlined, and
  // the flat grey blanks left where a word has been lifted out of it.
  ...duoChip(0.0393, 0.4567, 0.1905, 3),
  ...duoChip(0.2452, 0.4567, 0.1119, 1),
  ...duoChip(0.3726, 0.4567, 0.2333, 4),
  b("구분선", 0.04, 0.508, 0.93, 0.003, 0.85, 0.019, 0),
  b("구분선", 0.04, 0.569, 0.93, 0.003, 0.85, 0.019, 0),
  ...duoChip(0.0702, 0.6763, 0.2762, 5, DUO_BANK),
  ...duoChip(0.3607, 0.6763, 0.1131, 0, DUO_SPENT),
  ...duoChip(0.4881, 0.6763, 0.2369, 0, DUO_SPENT),
  ...duoChip(0.7393, 0.6763, 0.1917, 0, DUO_SPENT),
  ...duoChip(0.349, 0.7317, 0.176, 3, DUO_BANK),
  ...duoChip(0.554, 0.7317, 0.1, 1, DUO_BANK),
  b("카드", 0, 0.755, 1, 0.245, 0.9, 0, 0, "사각형"),
  b("아이콘", 0.04, 0.777, 0.06, 0.028, 0.55, 0.019, 0, "원", ic("check")),
  t(0.11, 0.776, 0.19, 0.029, 0.45, 7),
  b("아이콘", 0.812, 0.777, 0.042, 0.028, 0.5, 0, 0, "사각형", ic("share")),
  b("아이콘", 0.898, 0.777, 0.05, 0.028, 0.5, 0, 0, "사각형", ic("flag")),
  // 정답 해설 / 계속하기 — one button, outlined and solid.
  ...duoButton(0.8231, { state: "보조", tone: 0.95, ink: 0.62, chars: 5, border: 0.0024 }),
  ...duoButton(0.8872, { state: "주요", tone: 0.64, ink: 0.98, chars: 4 }),
];

// The reward screen. Sparse on purpose — a mascot, two lines of praise, three
// stat cards and the button out. Each stat card carries its own label, glyph
// and figure, which is the repetition the screen is built on.
const STAT_BOX = { y: 0.7251, w: 0.2536, h: 0.0986 };
const statCard = (x, tone, chars, digits, icon) =>
  place(DUO_STAT_CARD, DUO_ASPECT, x, STAT_BOX.y, STAT_BOX.w, STAT_BOX.h, {
    w: STAT_BOX.w, tone, chars, digits, icon,
  });

const duolingoResult = [
  t(0.11, 0.026, 0.09, 0.022, 0.15, 4),
  b("아이콘", 0.212, 0.028, 0.032, 0.018, 0.3, 0, 0, "사각형"),
  b("아이콘", 0.702, 0.029, 0.048, 0.016, 0.2, 0, 0, "사각형"),
  b("아이콘", 0.772, 0.029, 0.042, 0.016, 0.2, 0, 0, "사각형"),
  b("아이콘", 0.838, 0.029, 0.062, 0.016, 0.2, 0, 0, "사각형"),
  b("이미지", 0.09, 0.155, 0.74, 0.285, 0.6, 0, 0, "사각형"),
  t(0.22, 0.477, 0.57, 0.036, 0.6, 17, 1, "가운데"),
  t(0.07, 0.545, 0.86, 0.071, 0.55, 34, 2, "가운데"),
  // Three of one card. Measured they are 213×180 apiece and evenly pitched;
  // what changes between them is the colour, the label and the figure.
  ...statCard(0.0738, 0.82, 5, 2, "bolt"),
  ...statCard(0.3726, 0.65, 4, 3, "target"),
  ...statCard(0.6726, 0.63, 3, 4, "clock"),
  b("버튼", 0.05, 0.875, 0.11, 0.06, 0.96, 0.019, 0.0036),
  b("아이콘", 0.088, 0.891, 0.042, 0.028, 0.6, 0, 0, "사각형", ic("share")),
  b("버튼", 0.19, 0.875, 0.775, 0.06, 0.6, 0.019, 0),
  t(0.48, 0.892, 0.2, 0.028, 0.98, 7, 1, "가운데"),
];

// A promo page, so the structure is a rhythm rather than a hierarchy: four
// speech-bubble cards alternating photo-left and photo-right, each with its
// account tag breaking out over the card's top edge.

const JELLY_ASPECT = 736 / 1472;
// One box for all four — measured at 609x190 starting at x=72 on a 736px-wide
// screenshot — and one pitch between them. Only the row index, the side the
// photo sits on and the length of the copy change, so nothing about the four
// can come out irregular when the page is regular.
const JELLY_BUBBLE_BOX = { x: 72 / 736, w: 609 / 736, h: 190 / 1472 };
const JELLY_ROW_TOP = 322 / 1472;
const JELLY_ROW_PITCH = 217 / 1472;
const bubble = (row, chars) =>
  place(
    JELLY_BUBBLE,
    JELLY_ASPECT,
    JELLY_BUBBLE_BOX.x,
    JELLY_ROW_TOP + row * JELLY_ROW_PITCH,
    JELLY_BUBBLE_BOX.w,
    JELLY_BUBBLE_BOX.h,
    // The photo alternates ends down the column.
    { side: row % 2 === 0 ? "오른쪽" : "왼쪽", chars },
  );

const zeroJelly = [
  b("배경", 0, 0, 1, 1, 0.55, 0, 0, "사각형"),
  t(0.215, 0.019, 0.53, 0.034, 0.85, 7, 1, "가운데"),
  t(0.175, 0.085, 0.64, 0.072, 0.97, 25, 2, "가운데"),
  ...bubble(0, 20),
  b("칩", 0.4346, 0.2055, 0.374, 0.0374, 0.85, 0.037, 0, "사각형", tilt(10.9)),
  t(0.455, 0.2132, 0.334, 0.022, 0.25, 16, 1, "가운데", tilt(10.9)),
  ...bubble(1, 24),
  b("칩", 0.1963, 0.4454, 0.299, 0.0391, 0.85, 0.039, 0, "사각형", tilt(-11.7)),
  t(0.216, 0.454, 0.259, 0.022, 0.25, 10, 1, "가운데", tilt(-11.7)),
  ...bubble(2, 19),
  b("칩", 0.6765, 0.499, 0.272, 0.044, 0.85, 0.044, 0, "사각형", tilt(14.2)),
  t(0.696, 0.51, 0.232, 0.022, 0.25, 8, 1, "가운데", tilt(14.2)),
  ...bubble(3, 27),
  b("칩", 0.2164, 0.6317, 0.472, 0.0497, 0.85, 0.05, 0, "사각형", tilt(-4.3)),
  t(0.236, 0.6456, 0.432, 0.022, 0.25, 19, 1, "가운데", tilt(-4.3)),
  b("이미지", 0.18, 0.786, 0.8, 0.113, 0.95, 0, 0, "사각형"),
  b("이미지", 0.13, 0.871, 0.59, 0.129, 0.6, 0, 0, "사각형"),
];

// Categories stood up as a vertical rail down the left edge, one hero product
// card, then the list. The rail is the thing that makes this screen its own —
// its labels are set sideways, which the drawing turns too.
const GROCERY_ASPECT = 840 / 1493;
const GROCERY_ITEM_BOX = { x: 0.2857, w: 0.7143, h: 0.1256 };
const groceryItem = (y, chars, sub) =>
  place(GROCERY_ITEM, GROCERY_ASPECT, GROCERY_ITEM_BOX.x, y, GROCERY_ITEM_BOX.w, GROCERY_ITEM_BOX.h, {
    w: GROCERY_ITEM_BOX.w, chars, sub,
  });

const groceryHome = [
  b("카드", 0, 0, 0.1905, 1, 0.3, 0.075, 0),
  b("아이콘", 0.06, 0.075, 0.055, 0.04, 0.95, 0, 0, "사각형", ic("settings")),
  t(0.075, 0.205, 0.04, 0.095, 0.9, 10),
  t(0.075, 0.415, 0.04, 0.055, 0.9, 4),
  t(0.075, 0.605, 0.04, 0.045, 0.95, 5),
  t(0.075, 0.755, 0.04, 0.045, 0.9, 4),
  b("아이콘", 0.135, 0.618, 0.025, 0.022, 0.97, 0.0274, 0, "원", ic("dot")),
  b("아이콘", 0.065, 0.89, 0.06, 0.035, 0.9, 0, 0, "사각형", ic("cart")),
  t(0.27, 0.067, 0.08, 0.021, 0.35, 6),
  t(0.27, 0.091, 0.22, 0.026, 0.1, 13),
  b("검색바", 0.61, 0.064, 0.335, 0.0566, 0.55, 0.0444, 0),
  b("아이콘", 0.635, 0.077, 0.037, 0.022, 0.85, 0, 0, "사각형", ic("search")),
  t(0.69, 0.078, 0.11, 0.021, 0.85, 9),
  b("카드", 0.2857, 0.2016, 0.5, 0.3664, 0.3, 0.033, 0),
  b("카드", 0.92, 0.2016, 0.08, 0.3664, 0.3, 0.033, 0),
  b("이미지", 0.47, 0.132, 0.39, 0.267, 0.55, 0, 0, "사각형"),
  t(0.345, 0.478, 0.2, 0.031, 0.97, 7),
  t(0.345, 0.514, 0.07, 0.021, 0.9, 4),
  b("버튼", 0.625, 0.485, 0.1, 0.057, 0.55, 0.0274, 0),
  b("아이콘", 0.66, 0.499, 0.03, 0.026, 0.97, 0, 0, "사각형", ic("plus")),
  t(0.29, 0.609, 0.225, 0.038, 0.12, 7),
  b("아이콘", 0.903, 0.614, 0.022, 0.027, 0.3, 0, 0, "사각형", ic("more")),
  ...groceryItem(0.6832, 7, 4),
  ...groceryItem(0.8453, 7, 4),
];

const LAYOUTS = {
  "ref-aqua": aquaplanet,
  "ref-followart-hero": followArtHero,
  "ref-followart-voices": followArtVoices,
  "ref-mosbys": mosbys,
  "ref-duolingo-quiz": duolingoQuiz,
  "ref-duolingo-result": duolingoResult,
  "ref-zero-jelly": zeroJelly,
  "ref-grocery": groceryHome,
};

/**
 * The layouts with their measured type folded in.
 *
 * Applied here rather than written into the hundred `t(...)` calls: many of
 * those sit inside components in local coordinates and could not carry a size
 * measured off the screen anyway, and a generated table can be regenerated
 * when a screenshot is replaced.
 */
export const REFERENCE_LAYOUTS = Object.fromEntries(
  Object.entries(LAYOUTS).map(([id, layout]) => [
    id,
    layout,
  ]),
);

/** Each screenshot's width ÷ height. The wireframe's viewBox is built from it,
 *  so without it a phone layout would be drawn into a 2:1 box. Measured from
 *  the committed .avif files, not guessed. */
/**
 * Reads the component sheet back out of a finished screen.
 *
 * The sheet used to be written separately: the same component declared once for
 * the screen and once for the sheet, in two different frames — the screen's for
 * one, the component's own for the other. Every measurement therefore crossed
 * between frames twice, and each crossing was somewhere to be wrong. It was:
 * a chip's label came out 2px tall in the sheet and 36px on the screen, a
 * button was 92 tall on the screen and 104 in the sheet, a card had a flag in
 * one and not the other.
 *
 * None of that can happen if the sheet is not drawn at all. These *are* the
 * blocks the screen is made of — placed, scaled, in their final positions —
 * lifted out and put back at 0..1 in their own box. One crossing, in one place,
 * for every component there is.
 */
export const componentsFromLayout = (layout, screenAspect) => {
  const found = new Map();
  layout.forEach((block, index) => {
    if (block.role !== "컴포넌트") return;
    const key = `${block.of} ${block.state}`;
    // The parts of this placement are the run of blocks that ends at its
    // marker — place() emits them together and nothing gets between them.
    const parts = [];
    for (let i = index - 1; i >= 0 && layout[i].of === block.of && layout[i].role !== "컴포넌트"; i -= 1)
      parts.unshift(layout[i]);
    // Any instance of a state would do, so the first is taken — except for two
    // things. A card thrown back at an angle on the page is still an upright
    // card, and the sheet is where you go to see what the component is, so an
    // upright instance replaces a tilted one. And an instance read in more
    // detail replaces one read in less: on a built-in screen every instance of
    // a component has the same parts, because they are all one `place()` call,
    // but an analysed screen can hand back a card in four pieces here and in
    // two there, and the sheet should show the card.
    const upright = !block.rotate && !block.taper && !block.bend;
    const held = found.get(key);
    const better =
      !held ||
      (held.tilted && upright) ||
      (held.tilted === !upright && parts.length > held.count);
    if (!better) return;
    found.set(key, {
      name: block.of,
      state: block.state,
      tilted: !upright,
      count: parts.length,
      aspect: (block.w / block.h) * screenAspect,
      box: { w: block.w, h: block.h },
      layout: parts.map((part) => ({
        ...part,
        x: (part.x - block.x) / block.w,
        y: (part.y - block.y) / block.h,
        w: part.w / block.w,
        h: part.h / block.h,
        radius: part.radius / block.w,
        border: part.border / block.w,
        ...(part.ink === undefined ? {} : { ink: part.ink / block.h }),
      })),
    });
  });
  return [...found.values()];
};

/**
 * Assembles an analysed layout the way a built-in screen is assembled.
 *
 * The built-in screens are not described element by element — they are built:
 * a component is defined once and `place()` puts that one definition down
 * wherever it appears. Four instances of a chip cannot come out with four
 * different corner radii or four different label insets, because there is only
 * ever one chip. That is the property the component tab depends on, and the
 * reason the sheet can be read straight back out of the screen.
 *
 * An uploaded screen arrives without it. It is read off a screenshot in one
 * pass, so each instance of a component is measured separately and comes back
 * separately — a chip 0.052 tall beside a chip 0.0518 tall, a label inset by
 * 0.031 beside one inset by 0.028. Small enough to be noise, large enough to
 * show as a wobble in a row that is not wobbly on the screen.
 *
 * So this does to an upload what the source files do to a built-in. It reads
 * the marks the model left, takes *one* definition per component and state, and
 * places that definition at every instance — through the same arithmetic
 * `place()` uses, ending at the same markers `place()` emits. After it, an
 * uploaded layout and a built-in one are the same kind of object, and
 * `componentsFromLayout` cannot tell them apart.
 *
 * What stays per instance is what genuinely differs between instances: the box
 * it occupies, and how many characters its text has. A folder tab is the same
 * component at two widths and a word chip is the same chip around a longer
 * word — the built-in definitions take both as parameters for that reason.
 */

// An instance is a *run*: consecutive blocks carrying the same component name
// and state, container first. The run also breaks on a block whose centre
// falls outside the one that opened it, which is what keeps a row of four
// identical chips from collapsing into a single box four chips wide — the
// second chip is not in the first, so it starts an instance of its own.
const CONTAINS = 0.01; // slack on the belonging test, in screen fractions

// How close two of a component's measurements have to be before they are taken
// to be one measurement read twice. 0.6% of the screen: about 5px on an
// 818-tall desktop capture, 11px on an 1826-tall phone one. Deliberately
// narrow — it is there to absorb reading noise, not to tidy up a layout that
// really is uneven, and a screen whose rows genuinely do not line up should go
// on not lining up.
const SNAP = 0.006;

/** Collapses values already within SNAP of one another onto their mean.
 *  Grouped against the lowest member rather than the previous one, so a long
 *  chain of near-misses cannot drag a group wider than SNAP. */
const snapValues = (values) => {
  const out = new Array(values.length);
  let group = [];
  const flush = () => {
    if (group.length === 0) return;
    const mean = group.reduce((sum, [value]) => sum + value, 0) / group.length;
    group.forEach(([, index]) => { out[index] = mean; });
    group = [];
  };
  values
    .map((value, index) => [value, index])
    .sort((a, b) => a[0] - b[0])
    .forEach((entry) => {
      if (group.length && entry[0] - group[0][0] > SNAP) flush();
      group.push(entry);
    });
  flush();
  return out;
};

const boxAround = (parts) => {
  const x = Math.min(...parts.map((part) => part.x));
  const y = Math.min(...parts.map((part) => part.y));
  return {
    x,
    y,
    w: Math.max(...parts.map((part) => part.x + part.w)) - x,
    h: Math.max(...parts.map((part) => part.y + part.h)) - y,
  };
};

// Into the component's own frame and back out of it — the two halves of the one
// crossing, written next to each other so they stay each other's inverse. Same
// rule as `place()`: radius and border scale by width and ink by height,
// because that is the axis each is a fraction of.
const intoBox = (parts, box) =>
  parts.map((part) => ({
    ...part,
    x: (part.x - box.x) / box.w,
    y: (part.y - box.y) / box.h,
    w: part.w / box.w,
    h: part.h / box.h,
    radius: (part.radius ?? 0) / box.w,
    border: (part.border ?? 0) / box.w,
    ...(part.ink === undefined ? {} : { ink: part.ink / box.h }),
  }));

const outOfBox = (parts, box, of) =>
  parts.map((part) => ({
    ...part,
    of,
    x: box.x + part.x * box.w,
    y: box.y + part.y * box.h,
    w: part.w * box.w,
    h: part.h * box.h,
    radius: (part.radius ?? 0) * box.w,
    border: (part.border ?? 0) * box.w,
    ...(part.ink === undefined ? {} : { ink: part.ink * box.h }),
  }));

// Field for field what `place()` writes, because componentsFromLayout reads one
// shape and this has to be it.
const markerFor = (of, state, box, outer) => ({
  role: "컴포넌트",
  of,
  state,
  x: box.x,
  y: box.y,
  w: box.w,
  h: box.h,
  tone: 0.5,
  shape: outer?.shape ?? "사각형",
  radius: outer?.radius ?? 0,
  border: 0,
  rotate: outer?.rotate ?? 0,
  taper: outer?.taper ?? 0,
  bend: outer?.bend ?? 0,
  icon: null,
  lines: 0,
  chars: 0,
  align: "왼쪽",
});

const instanceKey = (parts) => `${parts[0].component} ${parts[0].state || "기본"}`;

export const withPlacedComponents = (layout) => {
  // 1. Cut the layout into instances and the blocks between them, keeping the
  //    order, since the order is the drawing order.
  //
  //    Belonging is decided on the block's centre rather than its whole box.
  //    Full containment was the first rule and it was too strict: a product
  //    photo that bleeds over the top of its card, a caption that hangs a
  //    thousandth below one, and the card is cut into three components. The
  //    centre still lands outside the moment the next card starts, which is
  //    the split this has to keep making.
  const belongsTo = (part, outer) => {
    const x = part.x + part.w / 2;
    const y = part.y + part.h / 2;
    return (
      x >= outer.x - CONTAINS &&
      y >= outer.y - CONTAINS &&
      x <= outer.x + outer.w + CONTAINS &&
      y <= outer.y + outer.h + CONTAINS
    );
  };

  const items = [];
  let run = [];
  const close = () => {
    if (run.length) items.push({ parts: run });
    run = [];
  };
  for (const block of layout) {
    if (!block.component) {
      close();
      items.push({ block });
      continue;
    }
    const sameRun =
      run.length > 0 &&
      run[0].component === block.component &&
      (run[0].state || "기본") === (block.state || "기본") &&
      belongsTo(block, run[0]);
    if (run.length && !sameRun) close();
    run.push(block);
  }
  close();

  const instances = items.filter((item) => item.parts);
  if (instances.length === 0) return layout;

  // 2. Each instance's box, with a component's near-equal measurements read as
  //    equal. Per name rather than per state, because a chip is the same chip
  //    whether it is selected or not and should sit on the line one sits on.
  //
  //    Two boxes per instance: the one it was read at, and the one it is
  //    drawn at. A definition is lifted out through the box it was read at,
  //    so its parts land exactly in 0..1, and put back through the snapped
  //    one. Lift and place through the same box and the snap would show up
  //    as a component poking a thousandth outside its own marker.
  const read = instances.map((item) => boxAround(item.parts));
  const boxes = read.map((box) => ({ ...box }));
  const byName = new Map();
  instances.forEach((item, index) => {
    const name = item.parts[0].component;
    byName.set(name, [...(byName.get(name) ?? []), index]);
  });
  for (const indices of byName.values()) {
    for (const field of ["x", "y", "w", "h"]) {
      const values = snapValues(indices.map((index) => boxes[index][field]));
      indices.forEach((index, at) => { boxes[index][field] = values[at]; });
    }
  }

  // 3. One definition per component and state. Upright beats tilted — a card
  //    thrown back at an angle is still an upright card, and the sheet is where
  //    you go to see what the component is — and among equals the one read in
  //    most detail wins, since a part missed on the instance chosen here is a
  //    part missing from every instance once it is placed.
  const definitions = new Map();
  instances.forEach((item, index) => {
    const outer = item.parts[0];
    const tilted = Boolean(outer.rotate || outer.taper || outer.bend);
    const held = definitions.get(instanceKey(item.parts));
    const better =
      !held ||
      (held.tilted && !tilted) ||
      (held.tilted === tilted && item.parts.length > held.parts.length);
    if (better) {
      definitions.set(instanceKey(item.parts), { tilted, parts: intoBox(item.parts, read[index]) });
    }
  });

  // 4. Put that definition down at every instance. The instance keeps its own
  //    box and its own text lengths; everything else — insets, radii, tones,
  //    the measured type size — comes from the one definition.
  //
  //    Only where the instance was read the same way, though. Two instances
  //    with different numbers of parts are not one shape read twice: the model
  //    saw a card with a photo and a title here and a bare card there, and
  //    pouring the four-part definition into the bare one would draw a card
  //    the screen does not have. Those keep exactly what was read of them,
  //    which is where this started and no worse than it.
  const out = [];
  let at = 0;
  for (const item of items) {
    if (item.block) {
      out.push(item.block);
      continue;
    }
    const index = at;
    at += 1;
    const definition = definitions.get(instanceKey(item.parts));
    const name = item.parts[0].component;
    const state = item.parts[0].state || "기본";
    const alike = definition.parts.length === item.parts.length;
    const box = alike ? boxes[index] : read[index];
    const placed = alike
      ? outOfBox(definition.parts, box, name).map((part, part_index) => ({
        // Text lengths are the instance's own. The definition fixes where the
        // words sit and how big they are; it cannot fix how many there are,
        // and a row of chips all captioned to the same length is a drawing of
        // a screen nobody uploaded.
        ...part,
        lines: item.parts[part_index].lines,
        chars: item.parts[part_index].chars,
      }))
      : item.parts.map((part) => ({ ...part, of: name }));
    out.push(...placed, markerFor(name, state, box, placed[0]));
  }
  return out;
};

/** Pixel size of each reference's screenshot, so a component can report the
 *  size it actually is rather than a figure typed in beside it. */
export const REFERENCE_PIXELS = {
  "ref-aqua": [1400, 818],
  "ref-followart-hero": [1400, 669],
  "ref-followart-voices": [1400, 670],
  "ref-mosbys": [1400, 674],
  "ref-duolingo-quiz": [840, 1826],
  "ref-duolingo-result": [840, 1826],
  "ref-zero-jelly": [736, 1472],
  "ref-grocery": [840, 1493],
};

export const REFERENCE_ASPECTS = {
  "ref-aqua": 1400 / 818,
  "ref-followart-hero": 1400 / 669,
  "ref-followart-voices": 1400 / 670,
  "ref-mosbys": 1400 / 674,
  "ref-duolingo-quiz": 840 / 1826,
  "ref-duolingo-result": 840 / 1826,
  "ref-zero-jelly": 736 / 1472,
  "ref-grocery": 840 / 1493,
};

