import { b, t } from "./snapkeepLayouts";

/**
 * The component sheet for each built-in reference.
 *
 * Same drawing language as the structure tab — greyscale, `Abcdefg` for words,
 * a circle for an icon — because the two views are one notation seen at two
 * scales, not two notations. The structure tab is the whole screen and answers
 * "how is this laid out"; this is one element blown up and answers "what could
 * I take from it, and what states does it have". Snapkeep's own hand-drawn
 * Activity sheet is exactly this, and it is colourless: a component sheet in
 * this app is not a spec sheet with swatches on it.
 *
 * Each state is a miniature layout in its own box, so it is drawn by the same
 * LayoutWireframe that draws the screens. Nothing here knows how to paint.
 *
 * `radius` and `border` are fractions of the *component's* width rather than
 * the screen's, since the component is now the frame. They are the same
 * measurements the structure data carries, converted once:
 *
 *     local = screen_fraction × screen_px ÷ component_px
 */

/** One component: what it is called, its proportions, and its states. */
const c = (name, aspect, states) => ({ name, aspect, states });

/** One state. `label` is what the real screen calls it, or 기본 when a screen
 *  only ever shows the one — see the note on states below. */
const s = (label, layout) => ({ label, layout });

// Only the states actually visible in the screenshot are listed. A screen that
// shows a button in one state gets one state, labelled 기본 — the component
// certainly has others, but they are not in this reference and inventing them
// would put a claim in the sheet that nothing backs.

export const REFERENCE_COMPONENTS = {
  "ref-aqua": [
    c("티켓 버튼", 112 / 41, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.5, 0.179, 0.0134),
        t(0.15, 0.28, 0.7, 0.44, 0.97, 6, 1, "가운데"),
      ]),
    ]),
    // Light type carries its ground with it. On the screen this sits on the sky,
    // and lifted out onto the sheet's pale paper it would be white on white —
    // a component drawn as nothing. The background is part of what the
    // component is when the component is a piece of reversed-out type.
    c("내비 링크", 74 / 29, [
      s("기본", [b("배경", 0, 0, 1, 1, 0.52), t(0.06, 0.2, 0.88, 0.6, 0.97, 8)]),
    ]),
  ],

  "ref-followart-hero": [
    c("후원 배지", 84 / 17, [
      s("기본", [
        b("배경", 0, 0, 1, 1, 0.08),
        b("칩", 0.04, 0.06, 0.92, 0.88, 0.93, 0.1, 0),
        t(0.1, 0.25, 0.8, 0.5, 0.15, 10, 1, "가운데"),
      ]),
    ]),
    c("지갑 버튼", 74 / 23, [
      s("기본", [
        b("배경", 0, 0, 1, 1, 0.08),
        b("칩", 0.04, 0.08, 0.92, 0.84, 0.92, 0.113, 0),
        b("아이콘", 0.09, 0.26, 0.16, 0.5, 0.6),
        t(0.32, 0.32, 0.58, 0.36, 0.15, 8),
      ]),
    ]),
    c("아티스트 카드", 245 / 314, [
      s("기본", [
        b("카드", 0, 0, 1, 1, 0.08, 0, 0.00914),
        t(0.08, 0.14, 0.42, 0.09, 0.95, 5),
        t(0.08, 0.2, 0.5, 0.09, 0.95, 8),
        b("칩", 0.6, 0.24, 0.35, 0.055, 0.93, 0.03, 0),
        t(0.22, 0.36, 0.16, 0.05, 0.75, 7),
        t(0.22, 0.42, 0.22, 0.05, 0.95, 10),
        b("이미지", 0.58, 0.36, 0.36, 0.26, 0.5),
        b("칩", 0.36, 0.62, 0.32, 0.075, 0.92, 0.02, 0),
      ]),
    ]),
  ],

  "ref-followart-voices": [
    c("후기 카드", 451 / 436, [
      s("기본", [
        b("배경", 0, 0, 1, 1, 0.72),
        b("카드", 0.02, 0.02, 0.96, 0.96, 0.99),
        t(0.07, 0.07, 0.84, 0.53, 0.12, 48, 8),
        b("구분선", 0.07, 0.71, 0.84, 0.006, 0.85),
        b("이미지", 0.07, 0.77, 0.14, 0.18, 0.5),
        t(0.26, 0.78, 0.38, 0.043, 0.2, 27),
        t(0.26, 0.86, 0.1, 0.038, 0.45, 7),
      ]),
    ]),
    c("페이지 이동", 90 / 31, [
      s("기본", [
        b("아이콘", 0, 0, 0.34, 1, 0.3),
        t(0.42, 0.2, 0.5, 0.6, 0.3, 4),
      ]),
    ]),
  ],

  "ref-mosbys": [
    // The tabs come in two weights on the same screen — most sit mid-grey, one
    // is nearly black. Not a state so much as an emphasis, which is why they
    // are two components rather than two states of one.
    c("폴더 탭", 252 / 37, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.35, 0.0778, 0),
        t(0.06, 0.22, 0.85, 0.56, 0.97, 18),
      ]),
    ]),
    c("강조 탭", 210 / 37, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.06, 0.0933, 0),
        t(0.08, 0.22, 0.84, 0.56, 0.97, 12),
      ]),
    ]),
    c("분류 밴드", 12, [
      s("기본", [
        b("카드", 0, 0, 1, 1, 0.35),
        t(0.6, 0.25, 0.38, 0.5, 0.95, 27, 1, "오른쪽"),
      ]),
    ]),
  ],

  "ref-duolingo-quiz": [
    // Both states are on screen at once: the words waiting in the bank are
    // filled, the slots they drop into are outlined and empty.
    c("단어 칩", 151 / 82, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.82, 0.1057, 0),
        t(0.1, 0.35, 0.8, 0.3, 0.4, 6, 1, "가운데"),
      ]),
      s("빈 슬롯", [b("칩", 0, 0, 1, 1, 0.93, 0.1057, 0.0133)]),
    ]),
    c("하단 버튼", 773 / 104, [
      s("주요", [
        b("버튼", 0, 0, 1, 1, 0.5, 0.0206, 0),
        t(0.4, 0.3, 0.2, 0.4, 0.98, 8, 1, "가운데"),
      ]),
      s("보조", [
        b("버튼", 0, 0, 1, 1, 0.93, 0.0206, 0.0026),
        t(0.4, 0.3, 0.2, 0.4, 0.5, 9, 1, "가운데"),
      ]),
    ]),
    c("진행 바", 525 / 42, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.88, 0.04, 0),
        b("칩", 0, 0, 0.55, 1, 0.55, 0.04, 0),
      ]),
    ]),
  ],

  "ref-duolingo-result": [
    c("성과 카드", 168 / 177, [
      s("기본", [
        b("카드", 0, 0, 1, 1, 0.96, 0.095, 0.018),
        t(0.1, 0.08, 0.8, 0.12, 0.7, 5, 1, "가운데"),
        b("아이콘", 0.15, 0.45, 0.22, 0.2, 0.7),
        t(0.45, 0.44, 0.4, 0.22, 0.7, 2),
      ]),
    ]),
    c("주요 버튼", 651 / 110, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.6, 0.0245, 0),
        t(0.4, 0.3, 0.2, 0.4, 0.98, 7, 1, "가운데"),
      ]),
    ]),
    c("보조 버튼", 92 / 110, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.96, 0.173, 0.0329),
        b("아이콘", 0.3, 0.3, 0.4, 0.4, 0.6),
      ]),
    ]),
  ],

  "ref-zero-jelly": [
    c("후기 말풍선", 545 / 199, [
      s("기본", [
        b("배경", 0, 0, 1, 1, 0.55),
        b("카드", 0.02, 0.05, 0.96, 0.9, 0.99, 0.175, 0),
        t(0.13, 0.32, 0.48, 0.38, 0.35, 20, 2),
        b("이미지", 0.7, 0.11, 0.25, 0.78, 0.5, 0, 0, "원"),
      ]),
    ]),
    c("계정 태그", 275 / 55, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.85, 0.099, 0),
        t(0.06, 0.28, 0.88, 0.44, 0.25, 16, 1, "가운데"),
      ]),
    ]),
  ],

  "ref-grocery": [
    c("상품 리스트 카드", 592 / 183, [
      s("기본", [
        b("카드", 0, 0, 1, 1, 0.6, 0.0389, 0),
        b("이미지", 0.03, 0.08, 0.23, 0.84, 0.5),
        t(0.37, 0.22, 0.28, 0.24, 0.2, 7),
        t(0.37, 0.53, 0.11, 0.16, 0.35, 4),
        b("아이콘", 0.78, 0.23, 0.15, 0.5, 0.3),
      ]),
    ]),
    c("검색 바", 281 / 85, [
      s("기본", [
        b("검색바", 0, 0, 1, 1, 0.55, 0.1327, 0),
        b("아이콘", 0.07, 0.3, 0.13, 0.4, 0.85),
        t(0.25, 0.32, 0.4, 0.36, 0.85, 9),
      ]),
    ]),
    // Tall and narrow, so the drawing turns it — the same rule the structure
    // tab uses for the rail these sit on. The rail comes along for the same
    // reason the sky does under Aqua Planet's nav link: the label is reversed
    // out, and without its ground there is nothing to reverse it out of.
    c("세로 카테고리", 34 / 142, [
      s("기본", [b("배경", 0, 0, 1, 1, 0.3), t(0.2, 0.1, 0.6, 0.8, 0.9, 10)]),
    ]),
  ],
};
