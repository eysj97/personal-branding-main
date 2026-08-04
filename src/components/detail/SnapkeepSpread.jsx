import { useEffect, useMemo, useRef, useState } from "react";
import oceanReference from "../../assets/project/card-photo.png";
import santalReference from "../../assets/project/card-santal-hover-body.png";
import viewReference from "../../assets/project/card-view-hover-body.png";
import snapkeepReference from "../../assets/project/card-snapkeep-body.png";
import bookmarkIcon from "../../assets/bookmark.svg";

// The whole screen is styled from index.css with structural selectors
// (`div:has(> header .font-serif) > main > div[class~="mt-[21px]"] > button`,
// `aside[class*="snapkeep-filter-in"]`, ...), so the element order and the
// class names below are load-bearing: they are what the design hangs off.
// Behaviour lives here in state; only the markup shape is fixed.

const REFERENCES = [
  { id: "ref-aqua", title: "Aqua Planet", image: oceanReference, platform: "웹(데스크톱)", service: "여행·이동", screen: "랜딩·히어로", elements: ["헤더", "카드", "버튼"], mood: "사진 중심", accent: "#2686e7", note: "티켓 예매를 위한 메인 히어로. 사진과 카드의 레이어를 분명히 나눈 구성입니다." },
  { id: "ref-santal", title: "Santal 33", image: santalReference, platform: "모바일 앱", service: "커머스", screen: "상세", elements: ["헤더", "카드", "버튼"], mood: "다크", accent: "#ff5b16", note: "제품 사진을 중심에 두고, 구매 행동을 하단으로 모은 상세 화면입니다." },
  { id: "ref-view", title: "VIEW", image: viewReference, platform: "모바일 앱", service: "콘텐츠·미디어", screen: "홈", elements: ["탭바", "카드", "검색바"], mood: "비비드", accent: "#78db44", note: "다양한 콘텐츠를 빠르게 훑을 수 있도록 카드와 탐색 요소를 배치했습니다." },
  { id: "ref-routine", title: "Daily routine", image: snapkeepReference, platform: "태블릿", service: "헬스케어", screen: "대시보드", elements: ["리스트", "칩", "토글"], mood: "미니멀", accent: "#017c6e", note: "상태를 한눈에 보고 다음 행동을 선택하도록 정리한 루틴 대시보드입니다." },
  { id: "ref-payment", title: "Quick pay", image: null, platform: "모바일 앱", service: "핀테크", screen: "결제·주문", elements: ["폼", "버튼", "스텝퍼"], mood: "라이트", accent: "#946ee9", note: "결제 정보를 단계별로 확인하며 진행하는 간결한 입력 플로우입니다." },
  { id: "ref-profile", title: "Creator profile", image: null, platform: "웹(모바일)", service: "소셜", screen: "프로필·설정", elements: ["헤더", "리스트", "칩"], mood: "파스텔", accent: "#eb8fa8", note: "프로필 정보와 소통 카드를 위계로 구분한 설정 화면입니다." },
];

// [그룹 이름, 선택지, 레퍼런스에서 이 그룹의 값을 담고 있는 필드]
// 필터 값과 카드 태그가 같은 목록에서 나오므로, 화면에 보이는 태그는 전부
// 필터로 되찾을 수 있습니다 (폼·스텝퍼·토글도 포함).
const FILTERS = [
  ["플랫폼", ["모바일 앱", "웹(데스크톱)", "웹(모바일)", "태블릿"], "platform"],
  ["서비스 유형", ["커머스", "핀테크", "콘텐츠·미디어", "여행·이동", "헬스케어", "소셜"], "service"],
  ["화면 유형", ["홈", "상세", "랜딩·히어로", "대시보드", "결제·주문", "프로필·설정"], "screen"],
  ["UI 요소", ["헤더", "탭바", "카드", "리스트", "칩", "검색바", "버튼", "폼", "스텝퍼", "토글"], "elements"],
  ["무드", ["미니멀", "다크", "라이트", "파스텔", "비비드", "사진 중심"], "mood"],
];

const VIEWS = [["original", "원본"], ["structure", "구조"], ["component", "컴포넌트"]];
const DETAIL_TABS = [["original", "원본"], ["structure", "구조"], ["component", "컴포넌트"]];

const STORAGE = {
  uploads: "snapkeep-uploads-v2",
  deleted: "snapkeep-deleted-v2",
  saved: "snapkeep-saved-v2",
  tags: "snapkeep-tags-v2",
  recents: "snapkeep-recents-v2",
  queries: "snapkeep-queries-v2",
};

const readJSON = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => readJSON(key, fallback));
  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);
  return [value, setValue];
}

/** A reference's tags, with any edit the user has made in the detail panel applied on top. */
function tagGroupsFor(reference, overrides) {
  const override = overrides[reference.id] ?? {};
  return FILTERS.map(([label, , field]) => {
    if (override[label]) return { label, tags: override[label] };
    const value = reference[field];
    return { label, tags: Array.isArray(value) ? value : value ? [value] : [] };
  });
}

const searchTextFor = (reference, groups) =>
  [reference.title, reference.note, ...groups.flatMap((group) => group.tags)].join(" ").toLowerCase();

const componentsOf = (reference) => [
  ["카드", "Radius 16 · White", "#ffffff"],
  ["필터 칩", "Radius 100 · Selected", reference.accent],
  ["주요 버튼", "Height 44 · Filled", "#017c6e"],
];

// ---------------------------------------------------------------------------
// Upload analysis, in two stages.
//
// 1. Locally: downscale the screenshot (this is what keeps a few uploads from
//    blowing past the localStorage quota) and measure aspect ratio, brightness,
//    and colour.
// 2. Remotely: POST that image to /api/analyze, which the Vite dev server
//    answers by calling Claude (see vite.config.js — the key lives in .env and
//    never reaches the browser).
//
// If the endpoint isn't there — a static build, no API key, offline — the local
// measurements become the tags on their own. Which path ran is recorded on the
// reference, so the detail panel can say so rather than implying a model call
// that never happened.
// ---------------------------------------------------------------------------
const ANALYSIS_MAX_WIDTH = 960;

const FILENAME_HINTS = [
  [/home|main|홈|메인/i, { screen: "홈" }],
  [/detail|상세/i, { screen: "상세" }],
  [/pay|checkout|order|결제|주문/i, { screen: "결제·주문", service: "핀테크" }],
  [/profile|setting|mypage|프로필|설정|마이/i, { screen: "프로필·설정" }],
  [/dash|board|대시보드/i, { screen: "대시보드" }],
  [/land|hero|랜딩|히어로/i, { screen: "랜딩·히어로" }],
  [/shop|store|commerce|커머스|쇼핑/i, { service: "커머스" }],
  [/bank|finance|금융|핀테크/i, { service: "핀테크" }],
  [/health|fitness|헬스|건강|운동/i, { service: "헬스케어" }],
  [/travel|trip|map|여행|지도/i, { service: "여행·이동" }],
  [/social|feed|chat|소셜|피드|채팅/i, { service: "소셜" }],
  [/media|video|music|콘텐츠|미디어/i, { service: "콘텐츠·미디어" }],
];

const SCREEN_ELEMENTS = {
  "홈": ["헤더", "탭바", "카드"],
  "상세": ["헤더", "카드", "버튼"],
  "랜딩·히어로": ["헤더", "카드", "버튼"],
  "대시보드": ["리스트", "칩", "카드"],
  "결제·주문": ["폼", "버튼", "스텝퍼"],
  "프로필·설정": ["헤더", "리스트", "칩"],
};

const toHex = ([r, g, b]) => `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

/** Average brightness + the most vivid colour, from a sparse sample of the pixels. */
function readTone(context, canvas) {
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let luma = 0;
  let saturation = 0;
  let samples = 0;
  let vividScore = 0;
  let vivid = null;

  // 148 is a multiple of 4, so the stride stays aligned to pixel boundaries.
  for (let i = 0; i < data.length; i += 148) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const pixelSaturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    saturation += pixelSaturation;
    samples += 1;

    const score = pixelSaturation * (max / 255);
    if (score > vividScore) {
      vividScore = score;
      vivid = [r, g, b];
    }
  }

  if (!samples) return { luma: 128, saturation: 0, accent: "#017c6e" };
  return {
    luma: luma / samples,
    saturation: saturation / samples,
    accent: vividScore > 0.12 && vivid ? toHex(vivid) : "#017c6e",
  };
}

function analyzeImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1, ANALYSIS_MAX_WIDTH / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let tone;
      try {
        tone = readTone(context, canvas);
      } catch {
        tone = { luma: 128, saturation: 0.3, accent: "#017c6e" };
      }

      resolve({
        image: canvas.toDataURL("image/jpeg", 0.82),
        ratio: image.width / image.height,
        ...tone,
      });
    });
    image.addEventListener("error", () => resolve(null));
    image.src = dataUrl;
  });
}

function describeUpload(fileName, analysis) {
  const { ratio, luma, saturation, accent } = analysis;

  const platform =
    ratio < 0.62 ? "모바일 앱" : ratio < 1 ? "웹(모바일)" : ratio < 1.45 ? "태블릿" : "웹(데스크톱)";

  const mood =
    luma < 72 ? "다크"
      : saturation > 0.55 ? "비비드"
        : saturation < 0.12 ? "미니멀"
          : luma > 205 ? "라이트"
            : saturation < 0.32 ? "파스텔"
              : "사진 중심";

  const hinted = FILENAME_HINTS.reduce(
    (result, [pattern, values]) => (pattern.test(fileName) ? { ...result, ...values } : result),
    {},
  );
  const screen = hinted.screen ?? (platform === "웹(데스크톱)" ? "랜딩·히어로" : "홈");
  const service = hinted.service ?? "콘텐츠·미디어";

  return {
    platform,
    service,
    screen,
    mood,
    accent,
    elements: SCREEN_ELEMENTS[screen] ?? ["헤더", "카드", "버튼"],
    note: `가로세로 비율(${ratio.toFixed(2)}:1)과 색 분포를 읽어 ${platform} · ${screen} 화면으로 추정했어요. 아래 태그를 고치면 검색과 필터에 바로 반영됩니다.`,
    basis: `비율 ${ratio.toFixed(2)}:1, 평균 밝기 ${Math.round(luma)}/255, 평균 채도 ${Math.round(saturation * 100)}%를 계산했습니다.`,
  };
}

/**
 * Ask the dev-server endpoint to run the image through Claude. On any failure
 * returns `{ ok: false, reason }` — the caller falls back to the local
 * measurements and keeps the reason in the reference's analysis record.
 */
async function requestRemoteAnalysis(dataUrl, fileName) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, reason: "이미지를 전송할 수 없는 형식이었습니다." };

  const [, mediaType, image] = match;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, mediaType, fileName }),
    });

    // A static build has no /api/analyze — the SPA fallback answers with HTML,
    // which fails to parse below and lands in the catch.
    const payload = await response.json();
    if (!response.ok) return { ok: false, reason: payload?.error ?? `AI 분석 요청이 실패했습니다 (${response.status}).` };
    if (!payload?.analysis) return { ok: false, reason: "AI 분석 응답이 비어 있었습니다." };

    return { ok: true, analysis: payload.analysis, model: payload.model };
  } catch {
    return { ok: false, reason: "AI 분석 서버에 연결하지 못했습니다. npm run dev로 실행 중인지 확인해 주세요." };
  }
}

// ---------------------------------------------------------------------------

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

/** Component view. Root has to be a div — a bare span here would pick up the
    bookmark styling that index.css applies to `> div:first-child > span`. */
function ComponentSheet({ reference, compact }) {
  return (
    <div className={`flex h-full flex-col justify-center bg-[#eff1f0] ${compact ? "gap-[8px] p-[16px]" : "gap-[10px] p-[20px]"}`}>
      {componentsOf(reference).map(([name, spec, color]) => (
        <div key={name} className="flex items-center gap-[10px] rounded-[10px] border border-[#e2e6e3] bg-white p-[10px]">
          <span className="size-[26px] shrink-0 rounded-[7px] border border-black/10" style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{name}</span>
          <span className="shrink-0 text-[10px] text-[#7c847f]">{spec}</span>
        </div>
      ))}
    </div>
  );
}

function ReferencePreview({ reference, view, compact }) {
  if (view === "structure") return <Wireframe accent={reference.accent} />;
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

function DetailPanel({ reference, groups, onAddTag, onRemoveTag, onClose, onDelete }) {
  const [tab, setTab] = useState("original");
  const [addingGroup, setAddingGroup] = useState(null);
  const [draftTag, setDraftTag] = useState("");

  const commitTag = () => {
    const value = draftTag.trim();
    if (value) onAddTag(addingGroup, value);
    setAddingGroup(null);
    setDraftTag("");
  };

  return (
    <aside className="absolute bottom-0 right-0 top-0 z-30 flex w-[465px] flex-col border-l border-[#e1e5e2] bg-[#fbfcfa] p-[30px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[1.1px] text-[#017c6e]">REFERENCE DETAIL</p>
          <h3 className="mt-[7px] font-['Plus_Jakarta_Sans'] text-[27px] font-semibold tracking-[-1.2px]">{reference.title}</h3>
        </div>
        <button type="button" onClick={onDelete} className="snapkeep-detail-delete">삭제</button>
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

      {/* index.css sizes this well through `div:nth-of-type(3)[class*="h-[265px]"]`,
          so it has to stay the third div and keep that class. */}
      {tab !== "component" && (
        <div className="mt-[25px] h-[265px] overflow-hidden rounded-[16px] bg-[#edf0ee]">
          <ReferencePreview reference={reference} view={tab === "structure" ? "structure" : "original"} />
        </div>
      )}

      {tab === "component" ? (
        <div className="mt-[18px] space-y-[10px]">
          {componentsOf(reference).map(([name, spec, color]) => (
            <div key={name} className="flex items-center gap-[12px] rounded-[13px] border border-[#e2e6e3] bg-white p-[12px]">
              <span className="size-[35px] rounded-[9px] border border-black/5" style={{ backgroundColor: color }} />
              <div>
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="mt-[2px] text-[11px] text-[#7c847f]">{spec}</p>
              </div>
            </div>
          ))}
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
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const readFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("PNG, JPG, WEBP 이미지만 넣을 수 있어요.");
      return;
    }

    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      // Resolves to a message when the analysis fails; on success this modal is
      // already unmounted by the time the promise settles.
      const failure = await onSubmit({ fileName: file.name, dataUrl: reader.result });
      if (failure) setError(failure);
    });
    reader.addEventListener("error", () => setError("파일을 읽지 못했어요. 다시 시도해 주세요."));
    reader.readAsDataURL(file);
  };

  const selectFile = (event) => {
    readFile(event.target.files?.[0]);
    // Lets the same file be picked twice in a row.
    event.target.value = "";
  };

  const dropFile = (event) => {
    event.preventDefault();
    readFile(event.dataTransfer.files?.[0]);
  };

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
      <button type="button" className="absolute inset-0 z-30 cursor-default bg-[#06252e]/10" onClick={onClose} aria-label="필터 닫기" />
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

    const run = async () => {
      const measured = await analyzeImage(dataUrl);
      if (!measured) return null;
      return { measured, remote: await requestRemoteAnalysis(measured.image, fileName) };
    };

    // The local-only path can finish faster than the "분석 중" state is
    // readable, so hold it for a beat.
    const [outcome] = await Promise.all([run(), new Promise((resolve) => window.setTimeout(resolve, 400))]);

    if (!outcome) {
      setUploading(false);
      return "이미지를 분석하지 못했어요. 다른 파일로 시도해 주세요.";
    }

    const { measured, remote } = outcome;
    const { basis, ...described } = remote.ok ? remote.analysis : describeUpload(fileName, measured);

    const reference = {
      id: `upload-${Date.now()}`,
      title: fileName.replace(/\.[^/.]+$/, "") || "새 레퍼런스",
      image: measured.image,
      ...described,
      // The analysis record: what ran, when, and on what evidence.
      analysis: {
        source: remote.ok ? "claude" : "local",
        model: remote.ok ? remote.model : null,
        analyzedAt: new Date().toISOString(),
        basis,
        fallbackReason: remote.ok ? null : remote.reason,
      },
    };

    setUploadedReferences((current) => [reference, ...current]);
    setScanOpen(false);
    setUploading(false);
    openReference(reference);
    return null;
  };

  return (
    <div className="relative min-h-[1030px] w-[1489px] overflow-hidden rounded-[24px] bg-[#f7f7f5] font-['Pretendard'] text-[#1d1c1c]">
      <header className="flex items-center justify-between px-[62px] pb-[28px] pt-[46px]">
        <div>
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

      <button type="button" onClick={() => setScanOpen(true)} className="absolute bottom-[38px] right-[55px] flex h-[58px] items-center gap-[9px] rounded-full bg-[#017c6e] px-[23px] font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-white">
        <span className="text-[25px] font-normal">+</span>
        {uploading ? "AI 분석 중..." : "스캔/넣기"}
      </button>

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
