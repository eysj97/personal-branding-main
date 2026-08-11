import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { vw } from "./MobileHeader";

// A case study, on a phone. Figma 355:153, drawn at 430 x 932.
//
// The same spread the desktop opens, folded into one column. Not a rewrite of
// it: the three columns are the same blocks in the same order read left to
// right, and this design is those blocks in one file in that same order — so
// the spread is handed `stacked` (see SpreadFrame) and everything inside it is
// untouched. What is here is only what surrounds it: the section's own title,
// the folder the page sits in, and the arithmetic that fits a 475-wide column
// onto a 430-wide screen.
//
// Why it is not ProjectAppWindow, which is what this used to open in: that one
// centres a fixed block and scales it to fit *both* dimensions, which is right
// for an app screen and wrong for a document. A case study is 1000px of reading
// and shrinking it until its height fits the phone leaves it unreadable. This
// fits the width and scrolls.

// Everything below is the design's own px on its 430 canvas, rendered through
// `vw` so the whole page holds its proportions on any phone.
//
// The folder: a body from x=18 and a tab hanging off its right edge, past the
// screen. Same object as the cards on the project deck, at page size.
const FOLDER = { left: 18, width: 397.61 };
const TAB = { top: 35, width: 46.39, height: 121 };
// Where the spread sits inside the folder — 49 from the page's left edge and
// 381 to its right, so 31 and 34.61 in from the folder's own edges.
const CONTENT = { left: 31, right: 34.61 };
// The title block above the folder: 296 wide, centred, its top 104 down.
const TITLE = { top: 104, width: 296 };
const FOLDER_TOP = 227;

export default function MobileCaseStudy({ card, onClose }) {
  const Spread = card.detail;
  const holderRef = useRef(null);
  const spreadRef = useRef(null);
  // The scale that fits the spread's authored width into the folder, and the
  // height it comes to once scaled — which the holder has to be given, because
  // a transform does not change layout and the page would otherwise scroll to
  // the unscaled height.
  const [fit, setFit] = useState({ scale: 0, height: 0 });

  useLayoutEffect(() => {
    const holder = holderRef.current;
    const spread = spreadRef.current;
    const measure = () => {
      // offsetWidth/Height are read off the untransformed layout, so this is
      // safe to run while the element is already mid-scale.
      const natural = spread.offsetWidth;
      if (!natural) return;
      const scale = holder.clientWidth / natural;
      setFit({ scale, height: spread.offsetHeight * scale });
    };
    measure();
    // The spread's height depends on how its copy wraps, which depends on the
    // fonts — and on any image that has not decoded yet.
    const observer = new ResizeObserver(measure);
    observer.observe(spread);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The page underneath must not scroll while this owns the screen — set on
  // both, since which element is the scroller varies by browser.
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      // `data-interactive` because the sections this is opened from claim
      // gestures to drive themselves; they leave anything that starts inside
      // one of these alone.
      data-interactive
      role="dialog"
      aria-modal="true"
      aria-label={`${card.label} 케이스 스터디`}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[#06252e]"
    >
      {/* Where the page's hamburger sits, and for the same reason: it is the
          one control in the corner. Here it closes rather than opens — this is
          a page over the page, and the way out of it is the thing you reach
          for in that corner. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="케이스 스터디 닫기"
        className="fixed right-0 top-0 z-10 flex items-center px-[20px] py-[40px] text-white"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* The section's own name and line, at the sizes every mobile section
          uses — this is the PROJECT section still, seen from the inside. */}
      <div
        className="mx-auto flex flex-col items-center gap-[12px] text-white"
        style={{ paddingTop: vw(TITLE.top), width: vw(TITLE.width) }}
      >
        <p
          className="font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-1.2px]"
          style={{ fontSize: vw(60) }}
        >
          PROJECT
        </p>
        <p className="text-center font-['Pretendard'] text-[16px] leading-[1.2] tracking-[-0.32px]">
          발견한 문제를 어떻게 해결했는지 담았습니다.
        </p>
      </div>

      {/* The folder. Its body is the case study's page colour — the same one
          the desktop opens the covers onto — and the spread is drawn to be read
          on it, which is why Reviu's header is black type. */}
      <div
        className="relative"
        style={{
          marginTop: vw(FOLDER_TOP - TITLE.top - 103),
          marginLeft: vw(FOLDER.left),
          width: vw(FOLDER.width),
          marginBottom: vw(60),
        }}
      >
        {/* The tab, drawn under the body and running a long way back inside it.
            Two same-coloured boxes set flush do not read as one shape — the
            body's radius curves away at the join and the seam shows. Same
            arrangement, and the same reason, as the cards on the deck. */}
        <div
          className="absolute rounded-r-[10px]"
          style={{
            left: "70%",
            top: vw(TAB.top),
            width: `calc(30% + ${vw(TAB.width)})`,
            height: vw(TAB.height),
            backgroundColor: card.pageColor,
          }}
        />

        <div
          className="relative rounded-[20px]"
          style={{
            backgroundColor: card.pageColor,
            paddingLeft: vw(CONTENT.left),
            paddingRight: vw(CONTENT.right),
            paddingTop: vw(40),
            paddingBottom: vw(40),
          }}
        >
          {/* The holder is the box the spread has to fit; the spread inside it
              keeps its authored size and is scaled down to match. Hidden until
              the first measurement so the full-size version is never painted. */}
          <div ref={holderRef} style={{ height: fit.height || undefined }}>
            <div
              ref={spreadRef}
              className="w-max origin-top-left"
              style={{
                transform: `scale(${fit.scale || 1})`,
                visibility: fit.scale ? "visible" : "hidden",
              }}
            >
              <Spread stacked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
