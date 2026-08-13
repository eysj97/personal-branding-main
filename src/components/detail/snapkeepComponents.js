import { b, t, componentsFromLayout, REFERENCE_LAYOUTS, REFERENCE_ASPECTS, REFERENCE_PIXELS } from "./snapkeepLayouts";

/**
 * The component sheet for each built-in reference.
 *
 * It is not drawn. It is read back out of the structure — the components a
 * screen was assembled from, lifted out of it and shown on their own.
 *
 * It used to be drawn, and that was the mistake. The same component was
 * declared twice: once for the screen, once for the sheet, in two different
 * frames. Every number therefore crossed between frames twice and each
 * crossing was a place to be wrong, so a chip's label came out 2px tall in one
 * view and 36px in the other, a button was 92 tall on the screen and 104 in the
 * sheet, a card had a flag in one and not the other. None of that is reachable
 * now: these are the screen's own blocks. If the sheet is wrong the screen is
 * wrong in exactly the same way, which is the only honest relationship the two
 * views can have.
 *
 * What is still written here is what cannot be measured off a screenshot — what
 * to call the thing, and the two entries not yet placed as components.
 */

/** What kind of thing it is. A judgement, so it is stated rather than derived —
 *  the drawing knows a chip's shape but not that a chip is what it is. */
const TAGS = {
  "내비게이션 바": ["헤더", "버튼"],
  "폴더 탭": ["칩"],
  "단어 칩": ["칩"],
  "하단 버튼": ["버튼"],
  "진행 바": ["스텝퍼"],
  "성과 카드": ["카드"],
  "후기 말풍선": ["카드"],
  "후기 카드": ["카드"],
  "페이지 이동": ["버튼", "아이콘"],
  "상품 리스트 카드": ["카드", "리스트"],
};

/**
 * A tone to lay under a component whose own colour is the page's.
 *
 * FOLLOW.ART's bar is white type over orange and brings no ground of its own,
 * so on the sheet's pale paper it would be a component drawn as nothing. This
 * is the sheet's addition and it is the only one — everything else here comes
 * off the screen.
 */
const GROUND = { "ref-followart-hero": { "내비게이션 바": 0.58 } };

/** Written by hand still: components the structure does not yet place, so there
 *  is nothing to read them out of. Each one here is a component drawn twice —
 *  the thing this file exists to stop — and is waiting to be unified. */
const c = (name, aspect, states, tags = [], spec = "") => ({ name, aspect, states, tags, spec });
const s = (label, layout) => ({ label, layout });

const STILL_DRAWN_TWICE = {
  "ref-aqua": [
    c("티켓 버튼", 112 / 41, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.5, 0.179, 0.0134),
        t(0.15, 0.28, 0.7, 0.44, 0.97, 6, 1, "가운데"),
      ]),
    ], ["버튼"], "112 X 41"),
  ],

  "ref-followart-hero": [
    c("후원 배지", 84 / 17, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.93, 0.1, 0),
        t(0.1, 0.25, 0.8, 0.5, 0.15, 10, 1, "가운데"),
      ]),
    ], ["칩"], "84 X 17"),
    c("지갑 버튼", 74 / 23, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.92, 0.113, 0),
        b("아이콘", 0.06, 0.2, 0.18, 0.6, 0.6),
        t(0.3, 0.28, 0.62, 0.44, 0.15, 8),
      ]),
    ], ["버튼", "아이콘"], "74 X 23"),
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
    ], ["카드"], "245 X 314"),
  ],

  "ref-mosbys": [
    c("분류 밴드", 12, [
      s("기본", [
        b("카드", 0, 0, 1, 1, 0.35),
        t(0.6, 0.25, 0.38, 0.5, 0.95, 27, 1, "오른쪽"),
      ]),
    ], ["리스트"], "1210 X 43"),
  ],

  "ref-duolingo-result": [
    c("주요 버튼", 651 / 110, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.6, 0.0245, 0),
        t(0.4, 0.3, 0.2, 0.4, 0.98, 7, 1, "가운데"),
      ]),
    ], ["버튼"], "651 X 110"),
    c("보조 버튼", 92 / 110, [
      s("기본", [
        b("버튼", 0, 0, 1, 1, 0.96, 0.173, 0.0329),
        b("아이콘", 0.3, 0.3, 0.4, 0.4, 0.6),
      ]),
    ], ["버튼", "아이콘"], "92 X 110"),
  ],

  "ref-zero-jelly": [
    c("계정 태그", 275 / 55, [
      s("기본", [
        b("칩", 0, 0, 1, 1, 0.85, 0.099, 0),
        t(0.06, 0.28, 0.88, 0.44, 0.25, 16, 1, "가운데"),
      ]),
    ], ["칩"], "275 X 55"),
  ],

  "ref-grocery": [
    c("검색 바", 281 / 85, [
      s("기본", [
        b("검색바", 0, 0, 1, 1, 0.55, 0.1327, 0),
        b("아이콘", 0.07, 0.3, 0.13, 0.4, 0.85),
        t(0.25, 0.32, 0.4, 0.36, 0.85, 9),
      ]),
    ], ["검색바"], "281 X 85"),
    c("세로 카테고리", 34 / 142, [
      s("기본", [b("배경", 0, 0, 1, 1, 0.3), t(0.2, 0.1, 0.6, 0.8, 0.9, 10)]),
    ], ["라벨"], "34 X 142"),
  ],
};

/**
 * Collects one reference's placements into sheet entries.
 *
 * Several placements of one component become one entry with several states —
 * a chip that appears tapped, waiting and spent is one chip — and the first
 * placement of each state is the one shown, since they are the same component
 * and any of them would do.
 */
const sheetFor = (id) => {
  const [pw, ph] = REFERENCE_PIXELS[id];
  const ground = GROUND[id] ?? {};
  const entries = new Map();
  for (const found of componentsFromLayout(REFERENCE_LAYOUTS[id], REFERENCE_ASPECTS[id])) {
    const under = ground[found.name];
    const layout = under === undefined ? found.layout : [b("배경", 0, 0, 1, 1, under), ...found.layout];
    const entry = entries.get(found.name) ?? {
      name: found.name,
      aspect: found.aspect,
      states: [],
      tags: TAGS[found.name] ?? [],
      // The size it is on the screen, worked out from the box it occupies
      // there — not a figure typed in beside it that nothing keeps true.
      spec: `${Math.round(found.box.w * pw)} X ${Math.round(found.box.h * ph)}`,
    };
    entry.states.push({ label: found.state, layout });
    entries.set(found.name, entry);
  }
  return [...entries.values(), ...(STILL_DRAWN_TWICE[id] ?? [])];
};

export const REFERENCE_COMPONENTS = Object.fromEntries(
  Object.keys(REFERENCE_LAYOUTS).map((id) => [id, sheetFor(id)]),
);
