import { useEffect, useState } from "react";

/**
 * Snapkeep's library, and the rules for reading it.
 *
 * Pulled out of SnapkeepSpread when the phone got its own layout (Figma
 * 1303:48311). Nothing here is about how the app *looks* — it is the
 * references themselves, the filter vocabulary they are tagged from, and the
 * localStorage keys the two layouts share. Both screens are the same app over
 * the same data, so a reference saved on the desktop is saved on the phone and
 * a tag edited in one shows up in the other; that only holds while there is
 * exactly one copy of this, which is why it is a module rather than a second
 * list in the mobile file.
 */

// Snapkeep's own reference library — src/assets/snapkeep/ exists purely for
// these, so swapping a sample out never touches the project cards' artwork.
// They are thumbnails: the card shows them ~420px wide, so these are sized for
// that at 2x rather than being full-resolution card art.
//
// To add one: drop the file in that folder, import it here, and point a
// REFERENCES entry's `image` at it. An entry with `image: null` renders the
// built-in wireframe placeholder instead, which is what the last two do.
// The wide desktop captures are 1400px; the phone ones keep the library's
// original 840. A 1400x670 screenshot is fewer pixels than an 840x1800 one, so
// the wider file is not the heavier file — and the detail panel shows a
// screenshot at the panel's full width, where a landscape shot is the one that
// runs out of resolution first.
import aquaPlanet from "../../assets/snapkeep/aqua-planet.avif";
import followArtHero from "../../assets/snapkeep/follow-art-hero.avif";
import followArtTestimonials from "../../assets/snapkeep/follow-art-testimonials.avif";
import mosbysFiles from "../../assets/snapkeep/mosbys-files.avif";
import duolingoQuiz from "../../assets/snapkeep/duolingo-quiz.avif";
import duolingoResult from "../../assets/snapkeep/duolingo-result.avif";
import zeroJelly from "../../assets/snapkeep/zero-jelly.avif";
import groceryHome from "../../assets/snapkeep/grocery-home.avif";
// A fully documented reference: the screen itself, its wireframe, and each
// component in both states. `structure` and `components` are optional — an
// entry without them falls back to the drawn wireframe and colour swatches.
import activityOriginal from "../../assets/snapkeep/activity-original.avif";
import activityStructure from "../../assets/snapkeep/activity-structure.avif";
import activityChipDefault from "../../assets/snapkeep/activity-chip-default.avif";
import activityChipSelected from "../../assets/snapkeep/activity-chip-selected.avif";
import activityLabelDefault from "../../assets/snapkeep/activity-label-default.avif";
import activityLabelSelected from "../../assets/snapkeep/activity-label-selected.avif";

import { REFERENCE_ASPECTS, REFERENCE_LAYOUTS } from "./snapkeepLayouts";
import { REFERENCE_COMPONENTS } from "./snapkeepComponents";

export const REFERENCES = [
  {
    id: "ref-activity",
    title: "Activity picker",
    image: activityOriginal,
    structure: activityStructure,
    // Each component carries both of its states; the labels come baked into
    // the artwork, so nothing is captioned again here.
    components: [
      // 태그는 FILTERS의 "UI 요소" 값만 씁니다 — 여기 붙은 태그도 필터로
      // 그대로 되찾을 수 있어야 하므로, 자유 문구를 두지 않습니다.
      { name: "활동 칩", tags: ["칩", "아이콘"], default: activityChipDefault, selected: activityChipSelected },
      { name: "라벨", tags: ["라벨"], default: activityLabelDefault, selected: activityLabelSelected },
    ],
    platform: "모바일 앱",
    service: "헬스케어",
    screen: "홈",
    elements: ["리스트", "칩", "버튼"],
    mood: "미니멀",
    accent: "#e879c7",
    note: "운동 종류를 곡선 캐러셀로 훑어 고르는 화면. 선택된 항목만 색과 외곽선을 얻어, 나머지가 흐려진 자리에서 하나만 또렷하게 읽힙니다.",
  },
  { id: "ref-aqua", title: "Aqua Planet", image: aquaPlanet, platform: "웹(데스크톱)", service: "여행·이동", screen: "랜딩·히어로", elements: ["헤더", "버튼"], mood: "사진 중심", accent: "#2686e7", note: "유리질 해양 생물이 수면 위로 떠오르는 히어로. 내비게이션과 티켓 버튼만 남기고 첫 화면 전체를 이미지에 내줬습니다." },
  { id: "ref-followart-hero", title: "FOLLOW.ART", image: followArtHero, platform: "웹(데스크톱)", service: "소셜", screen: "랜딩·히어로", elements: ["헤더", "카드", "버튼"], mood: "비비드", accent: "#ef6c2c", note: "화면을 가득 채운 글자 위로 카드가 지나가는 히어로. 배경 타이포를 카드가 가리게 두어 깊이를 만듭니다." },
  { id: "ref-followart-voices", title: "FOLLOW.ART Testimonials", image: followArtTestimonials, platform: "웹(데스크톱)", service: "소셜", screen: "상세", elements: ["카드", "버튼"], mood: "라이트", accent: "#8f9cb0", note: "후기 카드를 흩뿌려 두고 가운데 한 장만 정면으로 세운 섹션. 읽을 것과 배경을 각도로 구분합니다." },
  { id: "ref-mosbys", title: "Mosby's Files", image: mosbysFiles, platform: "웹(데스크톱)", service: "콘텐츠·미디어", screen: "홈", elements: ["헤더", "리스트", "라벨"], mood: "다크", accent: "#2c6ef2", note: "분류를 색이 다른 폴더 탭으로 쌓아 올린 아카이브 홈. 탭 하나를 열면 그 아래 목록이 드러납니다." },
  { id: "ref-duolingo-quiz", title: "Duolingo 학습", image: duolingoQuiz, platform: "모바일 앱", service: "콘텐츠·미디어", screen: "상세", elements: ["버튼", "칩", "라벨"], mood: "비비드", accent: "#58cc02", note: "문장을 단어 조각으로 맞추는 학습 화면. 정답 피드백이 하단에서 올라와 다음 버튼과 한 덩어리로 붙습니다." },
  { id: "ref-duolingo-result", title: "Duolingo 레슨 결과", image: duolingoResult, platform: "모바일 앱", service: "콘텐츠·미디어", screen: "대시보드", elements: ["카드", "버튼"], mood: "라이트", accent: "#1cb0f6", note: "레슨을 마친 뒤 성과를 카드 세 장으로 요약한 화면. 캐릭터·칭찬 문구·수치 순으로 위에서 아래로 읽힙니다." },
  { id: "ref-zero-jelly", title: "제로 젤리 체험단", image: zeroJelly, platform: "웹(모바일)", service: "커머스", screen: "상세", elements: ["카드", "라벨"], mood: "비비드", accent: "#00a9e8", note: "체험단 후기를 말풍선 카드로 엮은 상세 구간. 계정 이름을 노란 라벨로 카드 밖에 띄워 출처를 붙였습니다." },
  { id: "ref-grocery", title: "Grocery home", image: groceryHome, platform: "모바일 앱", service: "커머스", screen: "홈", elements: ["탭바", "카드", "리스트", "검색바"], mood: "미니멀", accent: "#3f6b3a", note: "카테고리를 세로 탭으로 세운 장보기 홈. 대표 상품은 큰 카드로, 인기 상품은 리스트로 훑는 밀도를 달리했습니다." },
  // Attached here rather than written into each entry above: the structure data
  // is thirty lines of coordinates per reference and would bury the one line
  // that says what the reference actually is. Activity picker matches neither
  // table and gets neither field, which is right — it has real structure
  // artwork, and that wins over a redrawing of it either way.
].map((reference) => ({
  ...reference,
  layout: REFERENCE_LAYOUTS[reference.id],
  aspect: REFERENCE_ASPECTS[reference.id],
  pieces: REFERENCE_COMPONENTS[reference.id],
}));

// [그룹 이름, 선택지, 레퍼런스에서 이 그룹의 값을 담고 있는 필드]
// 필터 값과 카드 태그가 같은 목록에서 나오므로, 화면에 보이는 태그는 전부
// 필터로 되찾을 수 있습니다 (폼·스텝퍼·토글도 포함).
export const FILTERS = [
  ["플랫폼", ["모바일 앱", "웹(데스크톱)", "웹(모바일)", "태블릿"], "platform"],
  ["서비스 유형", ["커머스", "핀테크", "콘텐츠·미디어", "여행·이동", "헬스케어", "소셜"], "service"],
  ["화면 유형", ["홈", "상세", "랜딩·히어로", "대시보드", "결제·주문", "프로필·설정"], "screen"],
  // 아이콘·라벨은 컴포넌트 탭의 태그가 쓰는 값입니다. 컴포넌트 태그도 이
  // 목록에서 나와야 같은 규칙이 지켜지므로 여기에 함께 둡니다.
  ["UI 요소", ["헤더", "탭바", "카드", "리스트", "칩", "검색바", "버튼", "폼", "스텝퍼", "토글", "아이콘", "라벨"], "elements"],
  ["무드", ["미니멀", "다크", "라이트", "파스텔", "비비드", "사진 중심"], "mood"],
];

// 그룹 이름으로 그 그룹의 선택지를 바로 찾기 위한 표 — 상세 패널의 태그
// 추가 버튼이 "이 그룹에 어떤 값이 있는지"를 보여줄 때 씁니다.
export const OPTIONS_BY_GROUP = Object.fromEntries(
  FILTERS.map(([label, options]) => [label, options]),
);

export const VIEWS = [["original", "원본"], ["structure", "구조"], ["component", "컴포넌트"]];
export const DETAIL_TABS = [["original", "원본"], ["structure", "구조"], ["component", "컴포넌트"]];

// Bumping a key abandons whatever was stored under the old one — the browser
// keeps it, the app stops reading it. `uploads` went to v3 to drop test
// screenshots that had been scanned in during development and then sat in the
// library looking like part of it: they live in localStorage, so no amount of
// reloading the page removes them, and only the browser that made them ever saw
// them.
//
// `deleted` went to v3 for the mirror image of that problem: references deleted
// while trying the app out stayed deleted forever, so the library a visitor
// opens was whatever the last person happened to leave behind. The built-in
// nine are the case study — they are not the visitor's to lose permanently, and
// there is no way back to them from inside the app.
//
// The rest stay at v2 because saved marks and tag edits are worth keeping.
export const STORAGE = {
  uploads: "snapkeep-uploads-v3",
  deleted: "snapkeep-deleted-v3",
  saved: "snapkeep-saved-v2",
  tags: "snapkeep-tags-v2",
  recents: "snapkeep-recents-v2",
  queries: "snapkeep-queries-v2",
};

export const readJSON = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export const writeJSON = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => readJSON(key, fallback));
  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);
  return [value, setValue];
}

/** A reference's tags, with any edit the user has made in the detail panel applied on top. */
export function tagGroupsFor(reference, overrides) {
  const override = overrides[reference.id] ?? {};
  return FILTERS.map(([label, , field]) => {
    if (override[label]) return { label, tags: override[label] };
    const value = reference[field];
    return { label, tags: Array.isArray(value) ? value : value ? [value] : [] };
  });
}

export const searchTextFor = (reference, groups) =>
  [reference.title, reference.note, ...groups.flatMap((group) => group.tags)].join(" ").toLowerCase();
