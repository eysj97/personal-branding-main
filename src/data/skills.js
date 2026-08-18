// The skills board's content and the folder shape it is drawn on. Shared,
// because there are two layouts now: the desktop's 3x3 grid with the heading
// standing beside it (SkillsSection) and the phone's 4x2 (mobile/MobileSkills).
// Only the sizes and the arrangement differ; the folders and what is on them
// are the same board.

// Three folder colours. Two are the design's own (node 1303:46631, the
// `per/sub` and `per/point2` tokens); the middle band is the page's blue.
//
// Banded gold / blue / pink, top to bottom.
//
// The middle band was teal for a while, and the note here said blue had gone
// because the page's own ground was blue and a blue folder on it stops being a
// folder. That is no longer the case: SKILLS is drawn on white in both layouts
// now (see SkillsSection and mobile/MobileSkills), so the page's own blue is
// the strongest of the three against it rather than the one that disappears.
//
// Not a scale, either way — nothing about a card's colour says anything about
// its level, which every card states in words anyway. The design bands them by
// row, so the colour is what carries the reading order down the board.
export const GOLD = "#ffd527";
export const BLUE = "#336bec";
export const PINK = "#f460c0";

// The card is a manila folder seen face-on, and it is two shapes rather than
// one: a tab that runs the full width behind the card, stepping down partway
// across from its raised left end, and the folder body laid over it. The body
// hides all but the top BODY_TOP of the tab, which is why the path is far
// taller than the sliver of it you actually see.
//
// Two shapes, not one silhouette, because the tab is darker than the body — the
// design paints the same fill and then washes 8% black over it, which is what
// makes the tab read as sitting behind rather than as part of the front face. A
// single path could not carry two fills.
//
// Authored on its own 400x348 grid (node 316:1684). That is not any card's
// size any more — the desktop draws it at 290 and the phone at 182.76 — so the
// svg keeps this viewBox and is stretched to whatever the card is. Both sizes
// are a uniform scale of it, so nothing distorts.
export const FOLDER_PATH =
  "M0 125.516H400V48.7928C400 40.5085 393.284 33.7928 385 33.7928H175.305C170.461 33.7928 165.915 31.4533 163.099 27.5114L147.935 6.28137C145.119 2.33946 140.573 0 135.729 0H15C6.71573 0 0 6.71573 0 15V125.516Z";
export const FOLDER_W = 400;
export const FOLDER_H = 348;
// Where the folder body starts, in the path's own units — so how much of the
// tab stays visible. Stated here rather than in card px because the two
// layouts have different cards and this is a property of the drawing.
export const FOLDER_BODY_TOP = 52;

/** Where the body's top edge falls on a card `height` tall. */
export const bodyTopFor = (height) => (FOLDER_BODY_TOP / FOLDER_H) * height;

// `list` is for the one card whose body is a list rather than a sentence.
// `short` is the phone's version of that list: the card is 63% of the desktop's
// width, and the full lines wrap to two apiece there, which runs the card's
// body past its own bottom edge. Same three tools, said in fewer words.
export const SKILLS = [
  {
    title: "UX Research",
    desc: "사용자 조사와 경쟁 분석으로 문제를 정의",
    level: "Proficient",
    color: PINK,
  },
  {
    title: "Planning",
    desc: "서비스 구조와 화면 흐름 설계",
    level: "Proficient",
    color: PINK,
  },
  {
    title: "UI Design",
    desc: "화면 설계와 비주얼 디자인",
    level: "Proficient",
    color: BLUE,
  },
  {
    // One line. It used to carry a hard break, because at 400 wide and 28px the
    // design set it over two; the card is smaller and the type smaller with it,
    // and the design gives this one a single line. The heading still honours a
    // break if one is put back (`whitespace-pre-line` on both card faces).
    title: "Interaction Design",
    desc: "화면의 움직임과 전환 설계",
    level: "Proficient",
    color: BLUE,
  },
  {
    title: "FIGMA",
    desc: "디자인 시스템과 프로토타입 제작",
    level: "Proficient",
    color: BLUE,
  },
  {
    title: "AI",
    list: [
      "CLAUDE - 코딩 및 기획",
      "CHAT GPT - 아이디어확장, 기획, 이미지생성",
      "JEMINI - 이미지 및 영상 생성",
    ],
    short: ["CLAUDE - 코딩·기획", "CHAT GPT - 기획·이미지", "JEMINI - 이미지·영상"],
    level: "Proficient",
    color: GOLD,
  },
  {
    title: "HTML",
    desc: "구조에 맞게 마크업",
    level: "Proficient",
    color: GOLD,
  },
  {
    title: "CSS",
    desc: "디자인을 반응형 화면으로 구현",
    level: "Proficient",
    color: GOLD,
  },
];
