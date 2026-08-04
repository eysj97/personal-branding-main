import { useEffect, useMemo, useState } from "react";
import oceanReference from "../../assets/project/card-photo.png";
import santalReference from "../../assets/project/card-santal-hover-body.png";
import viewReference from "../../assets/project/card-view-hover-body.png";
import snapkeepReference from "../../assets/project/card-snapkeep-body.png";
import bookmarkIcon from "../../assets/bookmark.svg";

const REFERENCES = [
  { id: "aqua", title: "Aqua Planet", image: oceanReference, platform: "웹(데스크톱)", service: "여행·이동", screen: "랜딩·히어로", elements: ["헤더", "카드", "버튼"], mood: "사진 중심", accent: "#2686e7", note: "티켓 예매를 위한 메인 히어로. 사진과 카드의 레이어를 분명히 나눈 구성입니다." },
  { id: "santal", title: "Santal 33", image: santalReference, platform: "모바일 앱", service: "커머스", screen: "상세", elements: ["헤더", "카드", "버튼"], mood: "다크", accent: "#ff5b16", note: "제품 사진을 중심에 두고, 구매 행동을 하단으로 모은 상세 화면입니다." },
  { id: "view", title: "VIEW", image: viewReference, platform: "모바일 앱", service: "콘텐츠·미디어", screen: "홈", elements: ["탭바", "카드", "검색바"], mood: "비비드", accent: "#78db44", note: "다양한 콘텐츠를 빠르게 훑을 수 있도록 카드와 탐색 요소를 배치했습니다." },
  { id: "routine", title: "Daily routine", image: snapkeepReference, platform: "태블릿", service: "헬스케어", screen: "대시보드", elements: ["리스트", "칩", "토글"], mood: "미니멀", accent: "#017c6e", note: "상태를 한눈에 보고 다음 행동을 선택하도록 정리한 루틴 대시보드입니다." },
  { id: "payment", title: "Quick pay", image: null, platform: "모바일 앱", service: "핀테크", screen: "결제·주문", elements: ["폼", "버튼", "스텝퍼"], mood: "라이트", accent: "#946ee9", note: "결제 정보를 단계별로 확인하며 진행하는 간결한 입력 플로우입니다." },
  { id: "profile", title: "Creator profile", image: null, platform: "웹(모바일)", service: "소셜", screen: "프로필·설정", elements: ["헤더", "리스트", "칩"], mood: "파스텔", accent: "#eb8fa8", note: "프로필 정보와 소통 카드를 위계로 구분한 설정 화면입니다." },
].map((reference) => ({ ...reference, id: `upload-${reference.id}` }));

const FILTERS = [
  ["플랫폼", ["모바일 앱", "웹(데스크톱)", "웹(모바일)", "태블릿"]],
  ["서비스 유형", ["커머스", "핀테크", "콘텐츠·미디어", "여행·이동", "헬스케어", "소셜"]],
  ["화면 유형", ["홈", "상세", "랜딩·히어로", "대시보드", "결제·주문", "프로필·설정"]],
  ["UI 요소", ["헤더", "탭바", "카드", "리스트", "칩", "검색바", "버튼"]],
  ["무드", ["미니멀", "다크", "라이트", "파스텔", "비비드", "사진 중심"]],
];

const UPLOADED_REFERENCES_STORAGE_KEY = "snapkeep-uploaded-references";
const DELETED_REFERENCES_STORAGE_KEY = "snapkeep-deleted-references";

function loadUploadedReferences() {
  try {
    return JSON.parse(window.localStorage.getItem(UPLOADED_REFERENCES_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function loadDeletedReferenceIds() {
  try {
    return JSON.parse(window.localStorage.getItem(DELETED_REFERENCES_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function Icon({ children }) {
  return <span className="grid size-[22px] place-items-center text-[22px] leading-none">{children}</span>;
}

function Wireframe({ accent }) {
  return <div className="flex h-full flex-col gap-[12px] bg-[#eff1f0] p-[18px]"><div className="flex items-center justify-between"><span className="h-[9px] w-[72px] rounded-full bg-[#aeb7b3]" /><span className="size-[20px] rounded-full border-2 border-[#aeb7b3]" /></div><div className="h-[54px] rounded-[10px] border border-[#b9c1bd] bg-white p-[13px]"><span className="block h-[8px] w-[52%] rounded-full bg-[#cbd1ce]" /></div><div className="flex-1 rounded-[12px] border border-[#b9c1bd] bg-white p-[14px]"><span className="mb-[13px] block h-[9px] w-[38%] rounded-full bg-[#9fa9a4]" /><span className="mb-[8px] block h-[7px] w-full rounded-full bg-[#d6dcda]" /><span className="block h-[7px] w-[72%] rounded-full bg-[#d6dcda]" /></div><span className="h-[36px] rounded-[10px]" style={{ backgroundColor: accent }} /></div>;
}

function ReferenceCard({ reference, view, onClick }) {
  return <button type="button" onClick={onClick} className="group relative aspect-[1.43/1] w-full overflow-hidden rounded-[14px] border border-[#e7e6e3] bg-white p-[10px] text-left transition-transform hover:-translate-y-[3px]"><div className="relative size-full overflow-hidden rounded-[10px] bg-[#edf0ee]">{view === "structure" ? <Wireframe accent={reference.accent} /> : reference.image ? <img src={reference.image} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full flex-col justify-between p-[18px]" style={{ backgroundColor: `${reference.accent}22` }}><div className="flex gap-[6px]"><span className="h-[8px] w-[45px] rounded-full bg-black/25" /><span className="h-[8px] w-[32px] rounded-full bg-black/10" /></div><div className="rounded-[13px] bg-white p-[14px]"><span className="mb-[10px] block h-[8px] w-[62%] rounded-full bg-black/20" /><span className="block h-[7px] w-full rounded-full bg-black/10" /></div></div>}<span className="absolute right-[6px] top-[6px] grid size-[32px] place-items-center rounded-full bg-white/90 p-[4px]"><img src={bookmarkIcon} alt="" className="size-[20px]" /></span><div className="absolute inset-x-[10px] bottom-[10px] flex flex-wrap gap-[6px]"><span className="inline-flex items-center rounded-[50px] border border-[#e7e6e3] bg-white px-[12px] py-[6px] text-[10px] font-medium tracking-[-0.2px] text-[#1d1c1c]">{reference.platform}</span><span className="inline-flex items-center rounded-[50px] border border-[#e7e6e3] bg-white px-[12px] py-[6px] text-[10px] font-medium tracking-[-0.2px] text-[#1d1c1c]">{reference.screen}</span></div></div></button>;
}

function DetailPanel({ reference, onClose, onDelete }) {
  const [tab, setTab] = useState("원본");
  const [tagGroups, setTagGroups] = useState(() => [
    { label: "플랫폼", tags: [reference.platform] },
    { label: "서비스 유형", tags: [reference.service] },
    { label: "화면 유형", tags: [reference.screen] },
    { label: "UI 요소", tags: reference.elements },
    { label: "무드", tags: [reference.mood] },
  ]);
  const components = [["카드", "Radius 16 · White", "#fff"], ["필터 칩", "Radius 100 · Selected", reference.accent], ["주요 버튼", "Height 44 · Filled", "#017c6e"]];
  const addTag = (label) => {
    const value = window.prompt("태그 이름을 입력하세요.")?.trim();
    if (!value) return;
    setTagGroups((groups) => groups.map((group) => group.label === label ? { ...group, tags: [...group.tags, value] } : group));
  };

  return <aside className="absolute bottom-0 right-0 top-0 z-30 flex w-[465px] flex-col border-l border-[#e1e5e2] bg-[#fbfcfa] p-[30px]">
    <div className="flex items-start justify-between">
      <div><p className="text-[10px] font-bold tracking-[1.1px] text-[#017c6e]">REFERENCE DETAIL</p><h3 className="mt-[7px] font-['Plus_Jakarta_Sans'] text-[27px] font-semibold tracking-[-1.2px]">{reference.title}</h3></div>
      {onDelete && <button type="button" onClick={onDelete} className="snapkeep-detail-delete">삭제</button>}
      <button type="button" onClick={onClose} className="snapkeep-detail-close grid size-[34px] place-items-center rounded-full bg-[#edf0ee] text-[20px] text-[#4d5751]">×</button>
    </div>
    <div className="mt-[27px] flex rounded-full bg-[#e7e6e3] p-[3px]">
      {["원본", "구조", "컴포넌트"].map((label) => <button key={label} type="button" onClick={() => setTab(label)} className={`flex-1 rounded-full py-[9px] text-[12px] font-semibold ${tab === label ? "bg-white text-[#1d1c1c]" : "text-[#6b716e]"}`}>{label}</button>)}
    </div>
    {tab !== "컴포넌트" && <div className="mt-[25px] h-[265px] overflow-hidden rounded-[16px] bg-[#edf0ee]">{tab === "구조" ? <Wireframe accent={reference.accent} /> : reference.image ? <img src={reference.image} alt="" className="h-full w-full object-cover object-top" /> : <Wireframe accent={reference.accent} />}</div>}
    {tab === "컴포넌트" ? <div className="mt-[18px] space-y-[10px]">{components.map(([name, spec, color]) => <div key={name} className="flex items-center gap-[12px] rounded-[13px] border border-[#e2e6e3] bg-white p-[12px]"><span className="size-[35px] rounded-[9px] border border-black/5" style={{ backgroundColor: color }} /><div><p className="text-[13px] font-semibold">{name}</p><p className="mt-[2px] text-[11px] text-[#7c847f]">{spec}</p></div></div>)}</div> : <><div className="snapkeep-detail-meta">{tagGroups.map((group) => <div key={group.label} className="snapkeep-detail-meta-row"><span className="snapkeep-detail-meta-label">{group.label}</span><div className="snapkeep-detail-meta-tags">{group.tags.map((tag, index) => <span key={`${group.label}-${tag}-${index}`} className="rounded-full border border-[#dfe5e1] bg-white px-[10px] py-[6px] text-[11px] text-[#536059]">{tag} ×</span>)}<button type="button" className="snapkeep-detail-tag-add" onClick={() => addTag(group.label)} aria-label={`${group.label} 태그 추가`} /></div></div>)}</div><div className="mt-auto rounded-[15px] bg-[#e1f2ec] p-[15px]"><p className="text-[10px] font-bold tracking-[1px] text-[#017c6e]">AI DESCRIPTION</p><p className="mt-[6px] text-[13px] leading-[1.5] tracking-[-0.35px] text-[#356057]">{reference.note}</p></div></>}</aside>;
}

function ScanModal({ onClose, onSubmit, isAnalyzing }) {
  const [fileName, setFileName] = useState("");
  const readFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.addEventListener("load", () => onSubmit({ fileName: file.name, image: reader.result }));
    reader.readAsDataURL(file);
  };
  const selectFile = (event) => {
    readFile(event.target.files?.[0]);
  };
  const dropFile = (event) => { event.preventDefault(); readFile(event.dataTransfer.files?.[0]); };

  return <><button type="button" className="snapkeep-scan-backdrop" onClick={onClose} aria-label="스캔 팝업 닫기" /><section className="snapkeep-scan-modal" aria-modal="true" aria-busy={isAnalyzing} role="dialog" aria-labelledby="snapkeep-scan-title"><header className="snapkeep-scan-header"><h2 id="snapkeep-scan-title">레퍼런스 등록하기</h2><button type="button" className="snapkeep-scan-close" onClick={onClose} aria-label="스캔 팝업 닫기" /></header><label className={`snapkeep-scan-dropzone ${fileName ? "is-selected" : ""} ${isAnalyzing ? "is-analyzing" : ""}`} htmlFor="snapkeep-file-input" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}><input id="snapkeep-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} disabled={isAnalyzing} /><strong>{isAnalyzing ? "AI가 레퍼런스를 분석하고 있어요" : fileName || "레퍼런스 선택 또는 드래그"}</strong><span>{isAnalyzing ? "화면 유형, UI 요소, 분위기를 정리하고 있어요" : "PNG, JPG, WEBP 이미지를 넣어주세요"}</span></label></section></>;
}

function FilterDrawer({ activeGroup, onActiveGroupChange, selectedFilters, onToggle, onClear, onClose, resultCount }) {
  const [filterQuery, setFilterQuery] = useState("");
  const [, values] = FILTERS.find(([group]) => group === activeGroup) ?? FILTERS[0];
  const visibleValues = values.filter((value) => value.toLowerCase().includes(filterQuery.toLowerCase()));

  return <><button type="button" className="absolute inset-0 z-30 cursor-default bg-[#06252e]/10" onClick={onClose} aria-label="필터 닫기" /><aside className="absolute bottom-0 right-0 top-0 z-40 flex w-[650px] flex-col border-l border-[#e0e4e1] bg-white animate-[snapkeep-filter-in_240ms_ease-out]"><header className="flex h-[76px] items-center justify-between border-b border-[#e1e4e1] px-[28px]"><h2 className="text-[20px] font-semibold tracking-[-0.7px]">Data Filters</h2><button type="button" onClick={onClose} className="grid size-[34px] place-items-center rounded-full text-[23px] text-[#68716c] hover:bg-[#f1f3f1]" aria-label="필터 닫기">×</button></header><div className="border-b border-[#e1e4e1] px-[28px] py-[12px]"><div className="flex h-[40px] items-center gap-[9px] rounded-full border border-[#e1e4e1] bg-[#f7f8f7] px-[13px]"><span className="text-[18px] text-[#8a928d]">⌕</span><input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#939995]" placeholder="필터 검색" /></div></div><div className="flex min-h-0 flex-1"><nav className="w-[178px] shrink-0 overflow-y-auto border-r border-[#e1e4e1] bg-[#f8f9f8] py-[14px]">{FILTERS.map(([group]) => <button key={group} type="button" onClick={() => { onActiveGroupChange(group); setFilterQuery(""); }} className={`w-full px-[28px] py-[10px] text-left text-[14px] transition-colors ${activeGroup === group ? "bg-[#e1f2ec] font-semibold text-[#017c6e]" : "text-[#555e58] hover:bg-[#f0f2f0]"}`}>{group}</button>)}</nav><section className="min-w-0 flex-1 overflow-y-auto px-[26px] py-[25px]"><h3 className="text-[17px] font-semibold tracking-[-0.5px]">{activeGroup}</h3><p className="mt-[5px] text-[12px] text-[#7d8580]">원하는 항목을 여러 개 선택할 수 있어요.</p><div className="mt-[21px] flex flex-wrap gap-[9px]">{visibleValues.map((value) => { const selected = selectedFilters.includes(value); return <button key={value} type="button" onClick={() => onToggle(value)} className={`flex items-center gap-[7px] rounded-full border px-[12px] py-[8px] text-[12px] transition-colors ${selected ? "border-[#017c6e] bg-[#e1f2ec] font-semibold text-[#017c6e]" : "border-[#dfe4e1] bg-white text-[#58615b] hover:border-[#9dc8bb]"}`}><span className={`grid size-[15px] place-items-center rounded-full border text-[11px] ${selected ? "border-[#017c6e] bg-[#017c6e] text-white" : "border-[#cdd3cf] text-transparent"}`}>✓</span>{value}</button>; })}</div>{visibleValues.length === 0 && <p className="mt-[30px] text-[13px] text-[#858c87]">일치하는 필터가 없습니다.</p>}</section></div><footer className="flex h-[76px] items-center justify-between border-t border-[#e1e4e1] px-[28px]"><button type="button" onClick={onClear} className="rounded-full border border-[#dde2df] px-[14px] py-[9px] text-[12px] font-medium text-[#636b66]">모두 지우기</button><p className="text-[12px] text-[#747d77]">{resultCount}개 결과</p><button type="button" onClick={onClose} className="rounded-full bg-[#017c6e] px-[18px] py-[10px] text-[12px] font-semibold text-white">필터 적용</button></footer></aside></>;
}

export default function SnapkeepSpread() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("all");
  const [view, setView] = useState("original");
  const [uploadedReferences, setUploadedReferences] = useState(loadUploadedReferences);
  const [deletedReferenceIds, setDeletedReferenceIds] = useState(loadDeletedReferenceIds);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(FILTERS[0][0]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedReference, setSelectedReference] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const references = useMemo(() => [...uploadedReferences, ...REFERENCES.filter((reference) => !deletedReferenceIds.includes(reference.id))], [deletedReferenceIds, uploadedReferences]);
  const setReferences = (updater) => {
    const nextReferences = updater(references);
    setUploadedReferences(nextReferences.filter((reference) => !REFERENCES.some((baseReference) => baseReference.id === reference.id)));
    setDeletedReferenceIds(REFERENCES.filter((baseReference) => !nextReferences.some((reference) => reference.id === baseReference.id)).map((reference) => reference.id));
  };
  const filterActive = selectedFilters.length > 0;
  useEffect(() => {
    try {
      window.localStorage.setItem(UPLOADED_REFERENCES_STORAGE_KEY, JSON.stringify(uploadedReferences));
    } catch {}
  }, [uploadedReferences]);
  useEffect(() => {
    window.localStorage.setItem(DELETED_REFERENCES_STORAGE_KEY, JSON.stringify(deletedReferenceIds));
  }, [deletedReferenceIds]);
  useEffect(() => {
    const closeSearch = (event) => {
      const target = event.target;
      const isSearchInput = target.closest('[aria-label="레퍼런스 검색"]');
      const isSearchButton = target.closest('[aria-label="검색"]');
      const isSearchHistory = target.closest('[class*="top-[61px]"]');

      if (!isSearchInput && !isSearchButton && !isSearchHistory) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);
  const visibleReferences = useMemo(() => references.filter((reference) => {
    const values = [reference.title, reference.note, reference.platform, reference.service, reference.screen, reference.mood, ...reference.elements].join(" ").toLowerCase();
    const matchesSearch = !query.trim() || values.includes(query.toLowerCase());
    const matchesFilters = FILTERS.every(([, groupValues]) => {
      const selectedInGroup = groupValues.filter((value) => selectedFilters.includes(value));
      return selectedInGroup.length === 0 || selectedInGroup.some((value) => values.includes(value.toLowerCase()));
    });
    return matchesSearch && matchesFilters;
  }), [query, references, selectedFilters]);
  useEffect(() => {
    document.querySelectorAll('[aria-label="필터 열기"]').forEach((button) => {
      button.parentElement?.setAttribute("data-reference-count", `References ${visibleReferences.length}`);
    });
  }, [visibleReferences.length]);
  useEffect(() => {
    const toolbar = document.querySelector("main > div.mt-\\[21px\\]");
    if (!toolbar) return undefined;

    let saveButton = toolbar.querySelector("[data-snapkeep-save]");
    if (!saveButton) {
      saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.setAttribute("data-snapkeep-save", "true");
      saveButton.setAttribute("aria-label", "저장");
      toolbar.append(saveButton);
    }

    const referenceGrid = document.querySelector('main > div[class*="grid-cols-3"]');
    const toggleSavedOnly = () => {
      const showSavedOnly = saveButton.getAttribute("data-saved") !== "true";
      saveButton.setAttribute("aria-pressed", String(showSavedOnly));
      saveButton.setAttribute("data-saved", String(showSavedOnly));
      referenceGrid?.setAttribute("data-saved-only", String(showSavedOnly));
    };

    saveButton.setAttribute("aria-pressed", "false");
    saveButton.setAttribute("data-saved", "false");
    referenceGrid?.setAttribute("data-saved-only", "false");
    saveButton.addEventListener("click", toggleSavedOnly);

    return () => saveButton.removeEventListener("click", toggleSavedOnly);
  }, []);
  useEffect(() => {
    document.querySelector('[data-snapkeep-filter-view-toggle]')?.remove();

    const toolbar = document.querySelector("main > div.mt-\\[21px\\]");
    const viewToggle = toolbar?.children[1];
    if (!viewToggle) return undefined;

    let componentButton = viewToggle.querySelector("[data-snapkeep-component-view]");
    if (!componentButton) {
      componentButton = document.createElement("button");
      componentButton.type = "button";
      componentButton.textContent = "컴포넌트";
      componentButton.setAttribute("data-snapkeep-component-view", "true");
      viewToggle.append(componentButton);
    }

    const selectComponentView = () => setView("component");
    componentButton.setAttribute("data-active", String(view === "component"));
    componentButton.addEventListener("click", selectComponentView);

    return () => componentButton.removeEventListener("click", selectComponentView);
  }, [view]);
  useEffect(() => {
    const cardSaveButtons = document.querySelectorAll('main > div[class*="grid-cols-3"] > button > div:first-child > span');
    const cleanups = Array.from(cardSaveButtons).map((saveButton) => {
      const toggleSaved = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextSaved = saveButton.getAttribute("data-saved") !== "true";
        saveButton.setAttribute("data-saved", String(nextSaved));
        saveButton.setAttribute("aria-pressed", String(nextSaved));
      };
      const toggleSavedWithKeyboard = (event) => {
        if (event.key === "Enter" || event.key === " ") toggleSaved(event);
      };

      saveButton.setAttribute("data-saved", "false");
      saveButton.setAttribute("role", "button");
      saveButton.setAttribute("tabindex", "0");
      saveButton.setAttribute("aria-label", "레퍼런스 저장");
      saveButton.setAttribute("aria-pressed", "false");
      saveButton.addEventListener("click", toggleSaved);
      saveButton.addEventListener("keydown", toggleSavedWithKeyboard);

      return () => {
        saveButton.removeEventListener("click", toggleSaved);
        saveButton.removeEventListener("keydown", toggleSavedWithKeyboard);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [visibleReferences.length]);
  useEffect(() => {
    if (!selectedReference) return undefined;

    const detailPanel = document.querySelector('aside:not([class*="snapkeep-filter-in"])');
    const root = detailPanel?.parentElement;
    if (!root) return undefined;

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "snapkeep-detail-backdrop";
    backdrop.setAttribute("aria-label", "상세 패널 닫기");
    backdrop.addEventListener("click", () => setSelectedReference(null));
    root.insertBefore(backdrop, detailPanel);

    return () => backdrop.remove();
  }, [selectedReference]);
  const recentReferences = references.slice(0, 3);

  const startScan = () => setScanOpen(true);
  const submitScan = ({ fileName, image }) => {
    setUploading(true);
    window.setTimeout(() => {
      const reference = {
        id: `upload-${Date.now()}`,
        title: fileName.replace(/\.[^/.]+$/, "") || "새 레퍼런스",
        image,
        platform: "모바일 앱",
        service: "커머스",
        screen: "상세",
        elements: ["헤더", "카드", "버튼"],
        mood: "미니멀",
        accent: "#017c6e",
        note: "AI가 업로드한 레퍼런스를 분석해 화면 유형과 주요 UI 요소를 정리했어요. 필요한 태그를 수정한 뒤 레퍼런스로 활용할 수 있어요.",
      };
      setUploadedReferences((current) => [reference, ...current]);
      setScanOpen(false);
      setSelectedReference(reference);
      setUploading(false);
    }, 650);
  };
  const selectRecent = (reference) => { setQuery(reference.title); setSearchOpen(false); setSelectedReference(reference); };
  const toggleFilter = (value) => setSelectedFilters((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return <div className="relative min-h-[1030px] w-[1489px] overflow-hidden rounded-[24px] bg-[#f7f7f5] font-['Pretendard'] text-[#1d1c1c]"><header className="flex items-center justify-between px-[62px] pb-[28px] pt-[46px]"><div><p className="font-serif text-[42px] font-bold italic tracking-[-3.1px]">snapkeep</p><p className="mt-[7px] text-[13px] tracking-[-0.3px] text-[#777d79]">스크린샷을 넣고, AI가 정리한 레퍼런스를 다시 찾으세요.</p></div></header><main className="px-[62px] pb-[86px]"><div className="relative z-10"><div className="flex h-[70px] items-center gap-[17px] rounded-[14px] bg-[#f0f1f0] px-[22px]"><svg aria-hidden="true" className="size-[28px] shrink-0 text-[#999f9c]" fill="none" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="7.1" stroke="currentColor" strokeWidth="1.6" /><path d="m16.1 16.1 4.1 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg><input value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} className="min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-[#9a9e9d]" placeholder="키워드 또는 질문으로 검색" aria-label="레퍼런스 검색" /><button type="button" onClick={() => setSearchOpen((open) => !open)} className="grid size-[35px] place-items-center rounded-[7px] text-[#1d1c1c]" aria-label="검색"><svg aria-hidden="true" className="size-[25px]" fill="none" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="7.1" stroke="currentColor" strokeWidth="1.6" /><path d="m16.1 16.1 4.1 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg></button></div>{searchOpen && <div className="absolute left-0 right-0 top-[61px] overflow-hidden rounded-[16px] border border-[#e4e5e3] bg-white p-[16px]" onMouseDown={(event) => event.preventDefault()}><div className="flex items-center gap-[8px]">{[["all", "All"], ["assets", "Assets"], ["plugins", "Plugins & widgets"]].map(([value, label]) => <button key={value} type="button" onClick={() => setSearchTab(value)} className={`rounded-[10px] px-[14px] py-[10px] text-[14px] font-medium transition-colors ${searchTab === value ? "bg-[#f0f1f0] text-[#1d1c1c]" : "text-[#7e8380] hover:bg-[#f7f7f5]"}`}>{label}</button>)}</div><p className="mt-[20px] px-[3px] text-[14px] font-medium text-[#7e8380]">Recents</p><div className="mt-[8px] space-y-[3px]">{recentReferences.map((reference) => <button key={reference.id} type="button" onClick={() => selectRecent(reference)} className="flex w-full items-center gap-[12px] rounded-[10px] px-[10px] py-[10px] text-left transition-colors hover:bg-[#f4f5f3]"><span className="grid size-[32px] place-items-center overflow-hidden rounded-[8px] bg-[#edf0ee] text-[14px] text-[#68716c]">{reference.image ? <img src={reference.image} alt="" className="h-full w-full object-cover" /> : "▧"}</span><span className="font-['Plus_Jakarta_Sans'] text-[15px] font-medium tracking-[-0.4px] text-[#1d1c1c]">{reference.title}</span><span className="rounded-[6px] border border-[#e2e4e1] px-[7px] py-[3px] text-[10px] text-[#858a87]">{reference.service}</span></button>)}</div></div>}</div><div className="mt-[21px] flex items-center justify-between"><button type="button" onClick={() => setFilterOpen(true)} className={`grid size-[46px] place-items-center rounded-full border transition-colors ${filterActive ? "border-[#017c6e] bg-[#017c6e] text-white" : "border-[#e3e4e1] bg-white text-[#1d1c1c]"}`} aria-label="필터 열기"><Icon>☷</Icon></button><div className="flex h-[44px] rounded-full bg-[#e7e6e3] p-[3px]">{[["original", "원본"], ["structure", "구조"]].map(([value, label]) => <button key={value} type="button" onClick={() => setView(value)} className={`rounded-full px-[18px] text-[14px] font-bold italic ${view === value ? "bg-white text-[#1d1c1c]" : "text-[#474646]"}`}>{label}</button>)}</div></div>{filterActive && <div className="mt-[18px] flex flex-wrap gap-[6px]">{selectedFilters.map((value) => <button key={value} type="button" onClick={() => toggleFilter(value)} className="rounded-full bg-[#e1f2ec] px-[12px] py-[7px] text-[11px] font-semibold text-[#017c6e]">{value} ×</button>)}</div>}<div className="mt-[26px] grid grid-cols-3 gap-[18px]">{visibleReferences.map((reference) => <ReferenceCard key={reference.id} reference={reference} view={view} onClick={() => setSelectedReference(reference)} />)}</div>{visibleReferences.length === 0 && <div className="mt-[26px] grid h-[370px] place-items-center rounded-[22px] border border-dashed border-[#ced6d1] bg-white"><div className="text-center"><p className="text-[21px] font-medium tracking-[-0.8px]">저장된 레퍼런스가 없어요</p><p className="mt-[8px] text-[14px] text-[#777f7a]">검색어나 필터를 바꿔 보세요.</p></div></div>}</main><button type="button" onClick={startScan} className="absolute bottom-[38px] right-[55px] flex h-[58px] items-center gap-[9px] rounded-full bg-[#017c6e] px-[23px] font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-white"><span className="text-[25px] font-normal">+</span>{uploading ? "AI 분석 중..." : "스캔/넣기"}</button>{filterOpen && <FilterDrawer activeGroup={activeGroup} onActiveGroupChange={setActiveGroup} selectedFilters={selectedFilters} onToggle={toggleFilter} onClear={() => setSelectedFilters([])} onClose={() => setFilterOpen(false)} resultCount={visibleReferences.length} />}{selectedReference && <DetailPanel reference={selectedReference} onClose={() => setSelectedReference(null)} onDelete={selectedReference.id.startsWith("upload-") ? () => { setReferences((current) => current.filter((reference) => reference.id !== selectedReference.id)); setSelectedReference(null); } : undefined} />}{scanOpen && <ScanModal onClose={() => setScanOpen(false)} onSubmit={submitScan} isAnalyzing={uploading} />}</div>;
}
