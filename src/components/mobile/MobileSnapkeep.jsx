import { useEffect, useMemo, useState } from "react";
import { vw } from "./MobileHeader";
import {
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
} from "../detail/snapkeepLibrary";
import { scanReference, useReferenceFile } from "../detail/snapkeepAnalyze";
import { PieceCard, ReferencePreview } from "../detail/SnapkeepSpread";

// The app's own icon set, which the desktop spread already ships. Three of the
// four the design exports are byte-for-byte the files below — same Figma
// components, exported once — so nothing new was added for them. Only
// maximize.svg is new, and bookmark-light.svg, which is the same bookmark at
// the thinner weight the cards draw it at.
import icBookmark from "../../assets/bookmark-unsaved.svg";
import icBookmarkSaved from "../../assets/bookmark-saved.svg";
import icBookmarkLight from "../../assets/bookmark-light.svg";
import icSearch from "../../assets/search-outline.svg";
import icOptions from "../../assets/filter-options.svg";
import icMaximize from "../../assets/maximize.svg";
import icPanels from "../../assets/panels-top-left.svg";
import icClose from "../../assets/close.svg";
import icTagPlus from "../../assets/tag-plus.svg";

/*  SNAPKEEP, on a phone. Figma 1303:48311 ("홈-원본"), drawn at 430 x 932.
 *
 *  Same app, one column narrower. The desktop spread is 1489 wide and lays the
 *  library out in three columns with a 465px detail panel sliding in beside it;
 *  none of that survives a 430 screen, and scaling it down to fit — which is
 *  what ProjectAppWindow was doing here until now — leaves 18px body copy at
 *  five. So the layout is redrawn and nothing else is: the references, the tag
 *  vocabulary, the filters, the saved marks and the upload pipeline are all the
 *  same modules the desktop reads (see detail/snapkeepLibrary and
 *  detail/snapkeepAnalyze), against the same localStorage keys. A reference
 *  saved here is saved there.
 *
 *  What the design changes, beyond the column count:
 *  - the toolbar splits in two. The desktop puts search, filter, view switch
 *    and the saved toggle in one 1365-wide row; here the search takes a row of
 *    its own and the saved toggle moves up beside the wordmark, which is the
 *    only place left with room for it.
 *  - the cards carry four tags rather than the desktop's two. A phone card is
 *    192 wide and shows the screenshot at thumbnail size, so the tags are doing
 *    more of the identifying than the picture is.
 *  - the view switch loses 컴포넌트 and the reference's own page gains it, which
 *    is the design's own call and the right one — see ViewSwitch.
 *  - the register button becomes a floating action button. The desktop's is a
 *    pill reading "+ 등록" docked to the bottom right of the frame; a phone has
 *    no frame to dock to, so it floats over the grid with the scan glyph on it.
 *
 *  Everything is written in the design's own 430-wide px and converted once by
 *  vw(), the same as every other mobile section, so the screen holds its
 *  proportions on any phone.
 */

// The design's grid: a 430 canvas inset 16 either side, two 192 cards with 12
// between them. 16 + 192 + 12 + 192 + 16 is 428 rather than 430 — the design's
// own rounding — so the columns are given the leftover rather than being nailed
// to 192, which would leave a 2px gutter down one side of every phone.
const GRID = { side: 16, gap: 12, top: 14, cardHeight: 298 };
// The header block: 73 down to the wordmark, 22 either side, 17 between rows.
const PAGE = { top: 73, side: 22, gap: 17 };
const FAB = { size: 57, right: 34, bottom: 43 };
// What the grid has to clear at the bottom, so the last row is not sitting
// under the floating button: the button's own box plus the gap it keeps.
const GRID_BOTTOM = FAB.bottom + FAB.size + GRID.side;

// The two views a card is big enough to draw. 컴포넌트 is the third and lives
// on the reference's own page instead — see the note on ViewSwitch.
const GRID_VIEWS = VIEWS.slice(0, 2);

// The app's palette, which is index.css's --snapkeep-* by another name. Written
// out rather than imported because those variables are declared inside the
// desktop spread's own selector (`div:has(> header .font-serif)`) and this
// screen is deliberately outside it — see the note on the wordmark below.
const BORDER = "#e7e6e3";
const INK = "#1d1c1c";
const ACCENT = "#017c6e";

/** One exported icon, at the geometry the design gives it.
 *
 *  Two boxes, not one. Figma draws each of these as a square frame with the
 *  artwork inset inside it — a 32px bookmark is really a 20.67 x 26 drawing
 *  centred in 32 — and the inset is what spaces the icons apart from each
 *  other. Setting the file to `size-full` instead would fill the frame with the
 *  drawing and every icon would come out a different weight, since each one's
 *  inset is different. The leaf sizes below are each file's own intrinsic
 *  width and height, which is exactly what Figma's inset arithmetic comes to.
 */
function Glyph({ src, box, width, height, className = "" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{ width: vw(box), height: vw(box) }}
    >
      <img src={src} alt="" style={{ width: vw(width), height: vw(height) }} className="block max-w-none" />
    </span>
  );
}

/** The bookmark, in whichever of its two weights this spot asks for.
 *
 *  `light` is the 1px-stroke export the cards use; the header's is the 2px one.
 *  Saved is the filled teal fill in both places, and it is a different drawing
 *  rather than the same one recoloured — a filled path has no stroke to outset,
 *  so its box is the un-outset 18.67 x 24 while the outlines' is bigger. Same
 *  bookmark on the screen either way. */
function Bookmark({ saved, light, box = 32 }) {
  if (saved) return <Glyph src={icBookmarkSaved} box={box} width={18.6667} height={24} />;
  if (light) return <Glyph src={icBookmarkLight} box={box} width={19.6667} height={25} />;
  return <Glyph src={icBookmark} box={box} width={20.6667} height={26} />;
}

/** A tag on a card in the grid: white pill, hairline border, 10px type.
 *
 *  The sheet's tags are a different pill and deliberately so — see META, which
 *  is the desktop panel's, copied across on purpose. */
function Tag({ children }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap bg-white font-medium"
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: vw(50),
        padding: `${vw(6)} ${vw(12)}`,
        fontSize: vw(10),
        letterSpacing: vw(-0.2),
        color: INK,
      }}
    >
      {children}
    </span>
  );
}

/*  The tag rows in a reference's sheet, at the desktop panel's own measurements.
 *
 *  Figma draws these smaller and looser on the phone — a 12px label, a 10px
 *  pill, a circle-x to take one off — and they are set here the way index.css
 *  sets them in the desktop detail panel instead: a 76px label column so the
 *  pills line up down the page, 16px labels, 14px pills, a plain × to remove
 *  and a 24px round + to add.
 *
 *  It is the same panel doing the same job and there is no reason for it to be
 *  a different control on a phone. The width is there for it: the desktop panel
 *  gives these rows 385px and this sheet gives them 374, so nothing has to be
 *  shrunk to fit — the phone version was smaller by choice, not by constraint.
 *
 *  Kept as literal numbers rather than read out of index.css because those
 *  rules live inside `div:has(> header .font-serif)`, which this screen is
 *  deliberately outside of. If the desktop's change, these have to be changed
 *  with them. */
const META = {
  // grid-template-columns: 76px minmax(0, 1fr), gap 14 — the aligned column.
  label: 76,
  gap: 14,
  row: 8,
};

/** One reference in the grid.
 *
 *  The screenshot is the card rather than sitting in a well inside it — the
 *  design bleeds it to all four edges and floats the tags and the bookmark on
 *  top. That is the one real difference from the desktop card, and it is the
 *  reason the tags are opaque white with a border: they are over artwork here,
 *  not over a grey placeholder.
 */
function Card({ reference, groups, view, saved, onOpen, onToggleSaved }) {
  // Every tag the reference carries, in filter-group order, capped at four.
  //
  // The design draws between four and six per card and its own chips are short
  // — 웹, 다크, 칩. The library's are not: 웹(데스크톱) and 랜딩·히어로 are
  // twice the width, and six of those is three rows of pills over a third of
  // the artwork. Four is the design's own typical count and holds the two rows
  // it draws.
  const tags = groups.flatMap((group) => group.tags).slice(0, 4);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="relative flex w-full flex-col justify-end overflow-hidden text-left"
        style={{
          height: vw(GRID.cardHeight),
          border: `1px solid ${BORDER}`,
          borderRadius: vw(14),
          padding: vw(10),
        }}
      >
        <span className="absolute inset-0 overflow-hidden" style={{ borderRadius: vw(14) }}>
          <ReferencePreview reference={reference} view={view} compact fill />
        </span>
        <span className="relative flex w-full flex-wrap items-center" style={{ gap: vw(6) }}>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      </button>

      {/* A sibling of the card button rather than a child of it: nesting one
          button inside another is invalid, and the desktop's workaround — a
          span with role="button" — is a keyboard trap waiting to happen on a
          screen where this is the only way to save anything. */}
      <button
        type="button"
        onClick={onToggleSaved}
        aria-pressed={saved}
        aria-label={saved ? `${reference.title} 저장 해제` : `${reference.title} 저장`}
        className="absolute"
        style={{ right: vw(9), top: vw(6) }}
      >
        <Bookmark saved={saved} light />
      </button>
    </div>
  );
}

/** Nothing to show, and what to do about it. Figma 1303:48584.
 *
 *  Two different nothings share this composition, and only one of them gets the
 *  buttons. An empty *library* is a dead end — there is no filter to widen and
 *  no search to clear, so the design hands over two ways out of it. A filter
 *  that happens to match nothing is not a dead end at all; the way out is the
 *  filter you just set, and offering to register a screenshot instead would be
 *  answering a question nobody asked.
 *
 *  `onRestore` is the second of those ways out and is new: the desktop notes
 *  that deleting the built-in references is permanent and that "there is no way
 *  back to them from inside the app". This is the way back.
 */
function EmptyLibrary({ title, hint, onRegister, onRestore, restoreCount }) {
  return (
    <div
      className="mx-auto flex flex-col items-center"
      style={{ width: vw(308), gap: vw(25), marginTop: vw(119), paddingBottom: vw(GRID_BOTTOM) }}
    >
      <div className="flex flex-col items-center" style={{ width: vw(265), gap: vw(16) }}>
        {/* Full-bleed, unlike every other icon on this screen: the design gives
            this one no inset — the 68px drawing is the 68px box. Its stroke is
            painted in the page colour rather than in white, which is what cuts
            the panels apart without a second fill. */}
        <img src={icPanels} alt="" className="block max-w-none" style={{ width: vw(68), height: vw(68) }} />
        <div className="flex w-full flex-col items-center text-center" style={{ gap: vw(8) }}>
          <p className="w-full font-medium leading-none" style={{ fontSize: vw(22), letterSpacing: vw(-1.1) }}>{title}</p>
          <p className="w-full leading-none" style={{ fontSize: vw(18), letterSpacing: vw(-0.9) }}>{hint}</p>
        </div>
      </div>

      {onRegister && (
        <div className="flex w-full flex-col" style={{ gap: vw(7) }}>
          <button
            type="button"
            onClick={onRegister}
            className="flex w-full items-center justify-center font-medium text-white"
            style={{ height: vw(40), borderRadius: vw(50), backgroundColor: ACCENT, fontSize: vw(16) }}
          >
            첫 레퍼런스 등록하기
          </button>
          {restoreCount > 0 && (
            // The design's label reads "샘플 8장으로 시작하기". The number is
            // counted rather than written down: the library ships nine, and a
            // button that promises eight and hands back nine is a bug that only
            // shows up after the button has done its job.
            <button
              type="button"
              onClick={onRestore}
              className="flex w-full items-center justify-center overflow-hidden bg-white font-medium"
              style={{ height: vw(40), borderRadius: vw(50), border: `1px solid ${BORDER}`, fontSize: vw(16), color: INK }}
            >
              샘플 {restoreCount}장으로 시작하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Registering a reference. Figma 1303:48567 ("업로드시트").
 *
 *  A sheet hinged to the bottom edge, where the desktop has a modal floating in
 *  the middle of a 1489-wide frame. That is the whole change: the dropzone
 *  behaves identically — same file check, same reader, same analysis — because
 *  it is literally the same hook (see useReferenceFile).
 *
 *  The sheet hugs its content rather than taking the design's flat 241px
 *  height. The design draws it at the one height its three states happen to
 *  share; the error line is a fourth, and pinning the height would either clip
 *  it or leave a gap under the other three.
 */
function ScanSheet({ onClose, onSubmit, isAnalyzing }) {
  const { fileName, error, selectFile, dropFile } = useReferenceFile(onSubmit);

  const headline = isAnalyzing
    ? "AI가 레퍼런스를 분석하고 있어요"
    : (!error && fileName) || "레퍼런스 선택 또는 드래그";
  const hint = error
    || (isAnalyzing ? "화면 유형, UI 요소, 분위기를 정리하고 있어요" : "레퍼런스만 넣어주시면 분석 저장 검색이 가능해요");
  const selected = Boolean(fileName) && !error;

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={isAnalyzing ? undefined : onClose}
        aria-label="등록 시트 닫기"
        disabled={isAnalyzing}
      />
      <section
        className="relative flex w-full flex-col bg-white"
        style={{
          gap: vw(10),
          padding: `${vw(8)} ${vw(18)} calc(${vw(24)} + env(safe-area-inset-bottom, 0px))`,
          borderTopLeftRadius: vw(20),
          borderTopRightRadius: vw(20),
        }}
        role="dialog"
        aria-modal="true"
        aria-busy={isAnalyzing}
        aria-label="레퍼런스 등록하기"
      >
        {/* The grab handle. It is a button rather than a bar, because on a phone
            it is the thing you reach for to dismiss a sheet and a drawing that
            does not respond to that reads as broken. */}
        <button
          type="button"
          onClick={isAnalyzing ? undefined : onClose}
          disabled={isAnalyzing}
          aria-label="닫기"
          className="flex w-full items-start justify-center"
          style={{ height: vw(26), paddingTop: vw(4), paddingBottom: vw(14) }}
        >
          <span className="block" style={{ width: vw(38), height: vw(4), borderRadius: vw(2), backgroundColor: "#dfe2dc" }} />
        </button>

        <div className="flex w-full flex-col" style={{ gap: vw(10) }}>
          <p className="font-bold" style={{ fontSize: vw(15), color: "#1b1e22" }}>레퍼런스 등록하기</p>

          <label
            htmlFor="snapkeep-mobile-file"
            onDragOver={(event) => event.preventDefault()}
            onDrop={dropFile}
            className="flex w-full flex-col items-center justify-center overflow-hidden text-center"
            style={{
              height: vw(127),
              gap: vw(4),
              padding: `${vw(30)} ${vw(16)}`,
              borderRadius: vw(8),
              // Solid, not the dashed edge the desktop modal draws — the
              // design keeps this one a plain hairline and lets the two lines
              // of copy inside say what the box is for.
              border: `1px solid ${selected ? ACCENT : BORDER}`,
              backgroundColor: selected ? "#fff" : "#f7f7f5",
            }}
          >
            <input
              id="snapkeep-mobile-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectFile}
              disabled={isAnalyzing}
              className="sr-only"
            />
            <span className="font-semibold" style={{ fontSize: vw(14), color: INK }}>{headline}</span>
            <span style={{ fontSize: vw(11.5), color: error ? "#b0524c" : "#474646" }}>{hint}</span>
          </label>
        </div>
      </section>
    </div>
  );
}

/** The filters. Figma 1303:48778 ("필터바텀시트").
 *
 *  The same sheet the detail opens in, with every group laid out at once
 *  instead of one at a time. What it replaces was a drawer of the desktop's
 *  shape folded down: a row of group chips that scrolled sideways, one group's
 *  values showing at a time, and a footer to apply them. Three controls to see
 *  five lists. The design drops all three — the lists are short enough to stack
 *  and the sheet scrolls — and it is right: choosing a filter is comparing
 *  across groups, and a control that shows you one group at a time is the one
 *  thing that stops you doing that.
 *
 *  Nothing to apply, either. The grid behind is already filtered as each chip
 *  is pressed, so the sheet is closed by the handle or by the ground around it,
 *  the way any sheet is.
 */
function FilterSheet({ selectedFilters, onToggle, onClear, onClose, view, onViewChange }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="필터 닫기" />
      <section
        className="relative flex w-full flex-col bg-white"
        style={{
          gap: vw(28),
          maxHeight: `calc(100dvh - ${vw(60)})`,
          padding: `${vw(8)} ${vw(18)} calc(${vw(24)} + env(safe-area-inset-bottom, 0px))`,
          borderTopLeftRadius: vw(20),
          borderTopRightRadius: vw(20),
        }}
        role="dialog"
        aria-modal="true"
        aria-label="필터"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="필터 닫기"
          className="flex w-full shrink-0 items-start justify-center"
          style={{ height: vw(26), paddingTop: vw(4), paddingBottom: vw(14) }}
        >
          <span className="block" style={{ width: vw(38), height: vw(4), borderRadius: vw(2), backgroundColor: "#dfe2dc" }} />
        </button>

        <div className="flex w-full shrink-0 items-center justify-between">
          {/* The grid's own view switch, repeated. The sheet covers the toolbar
              it normally lives in, and the design puts it back rather than
              leaving the setting unreachable while the filters are open. Two
              segments, not the three drawn: it drives the same grid as the
              toolbar's does, and 컴포넌트 is not a view a 192-wide card can
              carry — see ViewSwitch. */}
          <ViewSwitch views={GRID_VIEWS} value={view} onChange={onViewChange} compact />
          {/* The design leaves this half of the row empty. What goes there is
              the way to take every chosen filter back off — not a way out of
              the sheet, which the handle and the ground around it already are.
              Ten selections would otherwise be ten taps to undo. */}
          <button type="button" onClick={onClear} aria-label="선택한 필터 모두 해제">
            <Glyph src={icClose} box={34} width={14} height={14} />
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          style={{ gap: vw(24), paddingLeft: vw(10), paddingRight: vw(10) }}
        >
          {FILTERS.map(([label, values]) => (
            <div key={label} className="flex w-full shrink-0 flex-col justify-center" style={{ gap: vw(14) }}>
              <p
                className="font-semibold"
                style={{ fontSize: vw(12), letterSpacing: vw(-0.24), lineHeight: 1.2, color: INK }}
              >
                {label}
              </p>
              <div className="flex w-full flex-wrap items-center" style={{ gap: vw(6) }}>
                {values.map((value) => {
                  const selected = selectedFilters.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onToggle(value)}
                      aria-pressed={selected}
                      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap ${selected ? "font-semibold" : "font-medium"}`}
                      style={{
                        // The card's tag pill exactly, which is the same Figma
                        // component (154:4417) — a chip that is a filter and a
                        // chip that is a tag are the same thing said twice.
                        // Chosen is the app's one accent state, the tint the
                        // desktop drawer and the tag picker both use.
                        border: `1px solid ${selected ? ACCENT : BORDER}`,
                        borderRadius: vw(50),
                        padding: `${vw(6)} ${vw(12)}`,
                        fontSize: vw(10),
                        letterSpacing: vw(-0.2),
                        backgroundColor: selected ? "#e1f2ec" : "#fff",
                        color: selected ? ACCENT : INK,
                      }}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** The 컴포넌트 tab. Figma 1303:49068 ("업로드시트-컴포넌트").
 *
 *  The one tab that is not a picture of the screen but a list of the parts it
 *  was assembled from, and the design gives the whole sheet body over to it:
 *  no image well, no tag rows, no note. Two cards to a row at 192 apiece —
 *  which is the home grid's column, so a phone is looking at the same width in
 *  both places.
 *
 *  The card is PieceCard, unchanged. Its docstring cites Figma 211:3476 and
 *  this design places two of exactly that node, so there was nothing to draw
 *  here: only the three slots it leaves to CSS had to be restated, since
 *  index.css sets those inside the desktop spread's own selector and this
 *  screen is outside it. See `.snapkeep-phone` there.
 *
 *  Two columns rather than the desktop sheet's three. A component drawn 118
 *  wide — which is what a third of this sheet comes to — is a diagram of
 *  something rather than the thing, and the design is right to spend the width
 *  on two. A piece wider than 6:1 still takes the whole row; PieceCard decides
 *  that for itself and the grid honours it.
 */
function ComponentTab({ reference }) {
  if (reference.pieces?.length) {
    return (
      <div className="grid w-full shrink-0 grid-cols-2 items-start" style={{ gap: vw(12) }}>
        {reference.pieces.map((piece) => (
          <PieceCard key={piece.name} piece={piece} />
        ))}
      </div>
    );
  }

  // The three cases that are not a grid of cards — a reference with real
  // component artwork, an analysed upload's crops of its own screenshot, and a
  // reference with neither. The desktop already renders all three and none of
  // them is what this design draws, so they keep the well the other tabs use.
  return (
    <div
      className="w-full shrink-0 overflow-hidden bg-[#edf0ee]"
      style={{ height: vw(310), border: `1px solid ${BORDER}`, borderRadius: vw(12) }}
    >
      <ReferencePreview reference={reference} view="component" />
    </div>
  );
}

/** One reference, opened. Figma 1303:48606 ("업로드시트-원본").
 *
 *  A sheet hinged to the bottom, where the desktop slides a 465-wide aside in
 *  beside its grid. It carries no title and no bookmark, which is the design's
 *  call and a defensible one on both counts: the screenshot filling the top
 *  half identifies the reference better than its file name would, and saving
 *  belongs on the card in the grid, next to the thing being decided about. The
 *  desktop panel has no bookmark either, for that second reason.
 *
 *  The sheet hugs its content up to nearly the full screen rather than taking
 *  the design's flat 714px height. At 430 that content comes to about 750,
 *  which puts the top edge within twenty px of where the design draws it — and
 *  a reference with one tag per group does not then leave 200px of white under
 *  its note.
 */
function DetailSheet({ reference, groups, initialTab, onAddTag, onRemoveTag, onDelete, onClose }) {
  const [tab, setTab] = useState(initialTab ?? "original");
  const [addingGroup, setAddingGroup] = useState(null);

  // The file this tab has to show, if it has one. 원본 always does; 구조 does
  // only where the wireframe was drawn by hand rather than derived from the
  // screenshot; 컴포넌트 never does.
  const artwork = tab === "structure" ? reference.structure : tab === "original" ? reference.image : null;
  // 구조 without that file falls back to a wireframe drawn from this
  // screenshot's own analysed layout — which is real content rather than a
  // placeholder, and carries the screenshot's proportions in its viewBox. So it
  // sizes itself off the width exactly as the artwork does, and only the two
  // things that have no proportions of their own — the generic stand-in and the
  // component sheet — are left needing a height to be given to them.
  const drawnToScale = tab === "structure" && !reference.structure && reference.layout?.length > 0;
  const fitsWidth = Boolean(artwork) || drawnToScale;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="상세 닫기" />
      <section
        className="relative flex w-full flex-col bg-white"
        style={{
          gap: vw(14),
          maxHeight: `calc(100dvh - ${vw(60)})`,
          padding: `${vw(8)} ${vw(18)} calc(${vw(24)} + env(safe-area-inset-bottom, 0px))`,
          borderTopLeftRadius: vw(20),
          borderTopRightRadius: vw(20),
        }}
        role="dialog"
        aria-modal="true"
        aria-label={reference.title}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex w-full shrink-0 items-start justify-center"
          style={{ height: vw(26), paddingTop: vw(4), paddingBottom: vw(14) }}
        >
          <span className="block" style={{ width: vw(38), height: vw(4), borderRadius: vw(2), backgroundColor: "#dfe2dc" }} />
        </button>

        {/* Handle and toolbar stay put while the rest scrolls: the close button
            is the only way out of this in a browser with no back gesture, and
            scrolling it off the top would take that away. */}
        <div className="flex w-full shrink-0 items-center justify-between">
          <ViewSwitch views={VIEWS} value={tab} onChange={setTab} compact />
          {/* The desktop's close, not the design's: a bare 14px × rather
              than a 24px circle-x. index.css strips the circle off this button
              in the desktop panel, and the two panels should not disagree about
              what closing looks like. */}
          <button type="button" onClick={onClose} aria-label="상세 닫기">
            <Glyph src={icClose} box={34} width={14} height={14} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ gap: vw(14) }}>
          {tab === "component" ? (
            <ComponentTab reference={reference} />
          ) : (
            <>
          <div
            className="relative w-full shrink-0 overflow-hidden bg-[#edf0ee]"
            style={{ height: fitsWidth ? undefined : vw(310), border: `1px solid ${BORDER}`, borderRadius: vw(12) }}
          >
            {artwork ? (
              /* Whole, at the sheet's width, with the height following the
                 file's own proportions. The design draws a flat 310 well and a
                 screenshot cover-cropped into it, which is right for a card in
                 the grid and wrong here: this is the view you opened to read
                 the screen, and a phone capture cropped to 310 is its middle
                 third. The desktop panel shows them whole for that reason and
                 this now does too. The sheet scrolls; a tall capture is a long
                 scroll rather than a cropped one. */
              <img src={artwork} alt="" className="block h-auto w-full" />
            ) : (
              /* Either the wireframe, which brings its own height and gets the
                 width the same way the artwork does, or something drawn with no
                 proportions of its own — the generic stand-in, the component
                 sheet — which fills the design's well and scrolls in it. */
              <div className={fitsWidth ? "w-full" : `size-full ${tab === "component" ? "overflow-y-auto" : ""}`}>
                <ReferencePreview reference={reference} view={tab} />
              </div>
            )}

            {/* Not in the design — asked for, and the desktop's
                .snapkeep-image-delete down to the corner it sits in. On the
                picture rather than under it, which is what the 92% white is
                for: it has to stay legible over whatever the screenshot
                happens to be there.

                A sibling of the scroller above rather than a child of it, so it
                holds that corner while the 컴포넌트 list runs past underneath
                instead of scrolling away with it. */}
            <button
              type="button"
              onClick={onDelete}
              className="absolute inline-flex items-center font-semibold"
              style={{
                right: vw(12),
                bottom: vw(12),
                zIndex: 1,
                border: `1px solid ${BORDER}`,
                borderRadius: vw(50),
                backgroundColor: "rgb(255 255 255 / 92%)",
                padding: `${vw(6)} ${vw(12)}`,
                fontSize: vw(14),
                lineHeight: 1.2,
                color: INK,
              }}
            >
              삭제
            </button>
          </div>

          <div
            className="grid w-full shrink-0"
            style={{ gap: vw(META.row), paddingLeft: vw(10), paddingRight: vw(10) }}
          >
            {groups.map((group) => {
              const remaining = (OPTIONS_BY_GROUP[group.label] ?? []).filter((option) => !group.tags.includes(option));
              const adding = addingGroup === group.label;
              return (
                <div
                  key={group.label}
                  className="grid w-full items-center"
                  style={{ gridTemplateColumns: `${vw(META.label)} minmax(0, 1fr)`, gap: vw(META.gap) }}
                >
                  <span
                    className="font-semibold"
                    style={{ fontSize: vw(16), lineHeight: 1.2, letterSpacing: vw(-0.24), color: INK }}
                  >
                    {group.label}
                  </span>
                  <div className="flex flex-wrap items-center" style={{ gap: vw(6) }}>
                    {group.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex shrink-0 items-center whitespace-nowrap bg-white"
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderRadius: vw(50),
                          padding: `${vw(6)} ${vw(10)}`,
                          fontSize: vw(14),
                          color: INK,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => onRemoveTag(group.label, tag)}
                          aria-label={`${tag} 태그 삭제`}
                          style={{ marginLeft: vw(6), color: "#969d99" }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {remaining.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddingGroup(adding ? null : group.label)}
                        aria-expanded={adding}
                        aria-label={`${group.label} 태그 추가`}
                        className="grid shrink-0 place-items-center bg-white"
                        style={{
                          width: vw(24),
                          height: vw(24),
                          border: `1px solid ${BORDER}`,
                          borderRadius: vw(50),
                        }}
                      >
                        <img src={icTagPlus} alt="" className="block max-w-none" style={{ width: vw(12), height: vw(12) }} />
                      </button>
                    )}
                    {/* The desktop opens an input with the group's own values
                        listed under it. The input is dropped here and the values
                        are not: a phone raises the keyboard over the sheet the
                        moment one is focused, and a tag that is not already in
                        the taxonomy is not something anyone types on a phone. */}
                    {adding &&
                      remaining.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            onAddTag(group.label, option);
                            setAddingGroup(null);
                          }}
                          className="inline-flex shrink-0 items-center whitespace-nowrap bg-white"
                          style={{
                            border: `1px solid #dfe5e1`,
                            borderRadius: vw(50),
                            padding: `${vw(6)} ${vw(10)}`,
                            fontSize: vw(13),
                            lineHeight: 1.2,
                            color: "#536059",
                          }}
                        >
                          {option}
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          {reference.note && (
            <div
              className="w-full shrink-0 overflow-hidden"
              style={{
                backgroundColor: "#f7f7f5",
                border: `1px solid ${BORDER}`,
                borderRadius: vw(10),
                padding: `${vw(16)} ${vw(14)}`,
              }}
            >
              <p style={{ fontSize: vw(14), lineHeight: 1.45, color: "#1b1e22" }}>{reference.note}</p>
            </div>
          )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/** The view pill: 원본 / 구조, and 컴포넌트 where there is room for it.
 *
 *  The design draws two segments on the home screen where the desktop has
 *  three, and it is right to. 컴포넌트 puts each analysed part of a screen in
 *  its own labelled box with its measured size under it; the desktop card is
 *  275 wide and that is already tight, and a phone card is 192, at which "아이콘
 *  67 X 20" wraps to four lines and the sheet stops being readable at all. So
 *  the third view moves rather than going away — it is on every reference's own
 *  page (see DetailSheet), which has the whole width to give it.
 *
 *  `compact` is the sheet's own version of the pill: 34 tall against 44, 12px
 *  type against 14, and upright rather than italic. The italic on the home
 *  screen's is the wordmark's — the two sit in the same block and are read as
 *  one voice. Inside a sheet there is no wordmark to answer to, and the design
 *  sets it as plain bold Pretendard along with everything else in there. */
function ViewSwitch({ views, value, onChange, full, compact }) {
  return (
    <div
      className={`flex shrink-0 ${full ? "w-full" : ""}`}
      style={{ height: vw(compact ? 34 : 44), backgroundColor: BORDER, borderRadius: vw(50), padding: vw(3) }}
    >
      {views.map(([option, label]) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`flex items-center justify-center ${compact ? "" : "italic"} ${full ? "flex-1" : ""}`}
            style={{
              padding: `0 ${vw(compact ? 6 : 10)}`,
              borderRadius: vw(100),
              fontWeight: 700,
              fontSize: vw(compact ? 12 : 14),
              letterSpacing: vw(compact ? -0.24 : -0.28),
              lineHeight: 1.2,
              color: active ? INK : "#474646",
              backgroundColor: active ? "#fff" : "transparent",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** The way back — out of a reference, and out of the app.
 *
 *  Drawn rather than exported: the design leaves a lucide/arrow-left in the
 *  frame but never places it (1303:48384 sits in the middle of the grid at
 *  24x24 with nothing in it), so there is no artwork to export. The phone's own
 *  back gesture does the same job — that is what /snapkeep being a route is for
 *  — but a gesture is not an affordance, and this is the only way off the page
 *  for anyone reading it in a desktop browser's device mode. */
function ArrowLeft() {
  return (
    <span className="grid place-items-center" style={{ width: vw(28), height: vw(28) }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: vw(24), height: vw(24) }}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
    </span>
  );
}

export default function MobileSnapkeep({ onClose }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("original");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  // The same six keys the desktop spread writes, read through the same helpers.
  const [uploadedReferences, setUploadedReferences] = useState(() => readJSON(STORAGE.uploads, []));
  const [deletedIds, setDeletedIds] = usePersisted(STORAGE.deleted, []);
  const [savedIds, setSavedIds] = usePersisted(STORAGE.saved, []);
  const [tagOverrides, setTagOverrides] = usePersisted(STORAGE.tags, {});
  const [recentIds, setRecentIds] = usePersisted(STORAGE.recents, []);

  // Uploads carry base64 images, so they are the one thing that can overflow
  // the 5MB quota. Persist as many as fit, oldest dropped first — the in-memory
  // list is left alone so nothing disappears from the screen mid-session.
  useEffect(() => {
    let persistable = uploadedReferences;
    while (persistable.length > 0 && !writeJSON(STORAGE.uploads, persistable)) {
      persistable = persistable.slice(0, -1);
    }
    if (persistable.length === 0) writeJSON(STORAGE.uploads, []);
  }, [uploadedReferences]);

  // The page under a sheet must not scroll while the sheet owns the screen —
  // set on both elements, since which one is the scroller varies by browser.
  const sheetOpen = filterOpen || scanOpen || selectedId !== null;
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
    };
  }, [sheetOpen]);

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

  // Nothing in the library at all, as opposed to nothing matching. The two look
  // the same on screen and are not the same problem — see EmptyLibrary.
  const emptyLibrary = references.length === 0;

  /** Put the built-in references back. Figma's "샘플 8장으로 시작하기".
   *
   *  Deleting one writes its id to STORAGE.deleted and the app then filters it
   *  out for ever; delete all of them and the library a visitor opens is empty
   *  with no way to refill it. Clearing the list is that way. Uploads are not
   *  touched — they were never in it. */
  const restoreSamples = () => setDeletedIds([]);

  const openReference = (reference) => {
    setSelectedId(reference.id);
    setRecentIds((current) => [reference.id, ...current.filter((id) => id !== reference.id)].slice(0, 8));
  };

  const toggleSaved = (id) =>
    setSavedIds((current) => (current.includes(id) ? current.filter((saved) => saved !== id) : [id, ...current]));

  const toggleFilter = (value) =>
    setSelectedFilters((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  /** Back to the default view — what the wordmark does, the same as it does on
      the desktop. Saved references, tags and uploads are the user's data and
      are deliberately left alone; this only clears what is narrowing the view. */
  const goHome = () => {
    setQuery("");
    setSelectedFilters([]);
    setSavedOnly(false);
    setView("original");
    setSelectedId(null);
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
    <div className="snapkeep-phone relative min-h-screen w-full overflow-x-hidden bg-[#f7f7f5] font-['Pretendard']" style={{ color: INK }}>
      {/* Not a <header> carrying a .font-serif wordmark, which is what index.css
          matches the desktop spread on (`div:has(> header .font-serif)`) and
          then repaints from top to bottom with !important. This screen is
          styled here, in full, and stays out of the way of that. */}
      <div
        className="flex flex-col"
        style={{ paddingTop: vw(PAGE.top), paddingLeft: vw(PAGE.side), paddingRight: vw(PAGE.side), gap: vw(PAGE.gap) }}
      >
        <div className="flex items-end justify-between">
          <div className="flex items-center" style={{ gap: vw(10) }}>
            <button type="button" onClick={onClose} aria-label="포트폴리오로 돌아가기">
              <ArrowLeft />
            </button>
            <button
              type="button"
              onClick={goHome}
              aria-label="snapkeep 홈으로"
              className="font-['Inter'] font-bold italic leading-none"
              style={{ fontSize: vw(28) }}
            >
              snapkeep
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSavedOnly((only) => !only)}
            aria-pressed={savedOnly}
            aria-label={savedOnly ? "저장한 레퍼런스만 보기 해제" : "저장한 레퍼런스만 보기"}
          >
            <Bookmark saved={savedOnly} />
          </button>
        </div>

        {/* 16px flat, not vw(16). Mobile Safari zooms the whole page in when a
            focused input's type is under 16px, and vw(16) is 14.5 on a 390
            phone — so the one control on this screen you actually type into
            would take the layout with it. */}
        <label
          className="flex w-full items-center bg-white"
          style={{ height: vw(55), borderRadius: vw(50), paddingLeft: vw(23), paddingRight: vw(21), gap: vw(12) }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="키워드 또는 질문으로 검색"
            aria-label="레퍼런스 검색"
            className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-[#1d1c1c]"
            style={{ fontSize: "16px", letterSpacing: vw(-0.32), lineHeight: 1.2 }}
          />
          <Glyph src={icSearch} box={32} width={26} height={26} />
        </label>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="필터 열기"
            className="grid place-items-center"
            style={{
              padding: vw(10),
              borderRadius: vw(100),
              border: `1px solid ${selectedFilters.length > 0 ? ACCENT : BORDER}`,
              backgroundColor: selectedFilters.length > 0 ? "#e1f2ec" : "#fff",
            }}
          >
            <Glyph src={icOptions} box={24} width={19.5} height={16.5} />
          </button>
          <ViewSwitch views={GRID_VIEWS} value={view} onChange={setView} />
        </div>
      </div>

      {/* The grid. Two columns rather than the desktop's three, and the cards
          take the leftover width instead of the design's flat 192 — see GRID. */}
      {visibleReferences.length > 0 && (
      <div
        className="grid grid-cols-2"
        style={{
          gap: vw(GRID.gap),
          paddingLeft: vw(GRID.side),
          paddingRight: vw(GRID.side),
          paddingTop: vw(GRID.top),
          // Past the floating button, which would otherwise sit on the last row.
          paddingBottom: `calc(${vw(GRID_BOTTOM)} + env(safe-area-inset-bottom, 20px))`,
        }}
      >
        {visibleReferences.map((reference) => (
          <Card
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
      )}

      {visibleReferences.length === 0 && (
        <EmptyLibrary
          title={emptyLibrary ? "저장된 레퍼런스가 없어요" : savedOnly ? "저장한 레퍼런스가 없어요" : "찾는 레퍼런스가 없어요"}
          hint={
            emptyLibrary
              ? "레퍼런스를 등록하면, 태그를 달아드려요"
              : savedOnly
                ? "카드의 북마크를 눌러 저장해 보세요"
                : "검색어나 필터를 바꿔 보세요"
          }
          onRegister={emptyLibrary ? () => setScanOpen(true) : null}
          onRestore={restoreSamples}
          restoreCount={deletedIds.length}
        />
      )}

      {/* The register button. The desktop's is a "+ 등록" pill docked to the
          bottom of the frame; the design replaces it with this, and the glyph
          on it is feathericons' maximize — four corner brackets, which is the
          same mark every phone camera puts around what it is about to scan. */}
      {!emptyLibrary && (
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        aria-label={uploading ? "AI 분석 중" : "레퍼런스 등록"}
        className="fixed grid place-items-center"
        style={{
          width: vw(FAB.size),
          height: vw(FAB.size),
          right: vw(FAB.right),
          bottom: `calc(${vw(FAB.bottom)} + env(safe-area-inset-bottom, 0px))`,
          borderRadius: vw(50),
          backgroundColor: ACCENT,
        }}
      >
        <Glyph src={icMaximize} box={33} width={26.75} height={26.75} />
      </button>
      )}

      {filterOpen && (
        <FilterSheet
          selectedFilters={selectedFilters}
          onToggle={toggleFilter}
          onClear={() => setSelectedFilters([])}
          onClose={() => setFilterOpen(false)}
          view={view}
          onViewChange={setView}
        />
      )}

      {selectedReference && (
        <DetailSheet
          key={selectedReference.id}
          reference={selectedReference}
          groups={tagGroupsFor(selectedReference, tagOverrides)}
          initialTab={view}
          onAddTag={(label, value) => updateTags(selectedReference, label, (tags) => (tags.includes(value) ? tags : [...tags, value]))}
          onRemoveTag={(label, value) => updateTags(selectedReference, label, (tags) => tags.filter((tag) => tag !== value))}
          onDelete={() => deleteReference(selectedReference)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {scanOpen && (
        <ScanSheet onClose={() => setScanOpen(false)} onSubmit={submitScan} isAnalyzing={uploading} />
      )}
    </div>
  );
}
