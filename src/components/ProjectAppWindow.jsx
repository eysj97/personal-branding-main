import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A plain window for the project cards that are working apps rather than
// case-study spreads. No folder, no unfolding — the card is clicked and the
// app is simply there.
//
// The app inside is authored at a fixed size (index.css pins Snapkeep's shell
// to 1440x900), so this measures whatever it actually renders as and scales
// the whole thing down to fit. Measuring rather than hardcoding means the
// window keeps working if that size is ever changed.
const PADDING = 32;

export default function ProjectAppWindow({ card, onClose }) {
  const App = card.detail;
  const appRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  // Where the app's own header sits, in the app's unscaled px, so the close
  // button can line up with the row the app's logo is on instead of floating
  // in the screen corner. Read off the real header rather than hardcoded —
  // the app owns that row's height, and index.css restyles it.
  const [headerRow, setHeaderRow] = useState(null);

  // offsetWidth/offsetHeight are read off the untransformed layout, so this is
  // safe to run while the element is already mid-scale.
  useLayoutEffect(() => {
    const el = appRef.current;
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize({ width, height });

      const header = el.querySelector("header");
      setHeaderRow(
        header
          ? {
              centre: header.offsetTop + header.offsetHeight / 2,
              // Match the header's own side padding so the button lands on
              // the logo's opposite margin, not just near the corner.
              inset: parseFloat(getComputedStyle(header).paddingRight) || 0,
            }
          : null,
      );

      if (!width || !height) return;
      setScale(
        Math.min(
          1,
          (window.innerWidth - PADDING * 2) / width,
          (window.innerHeight - PADDING * 2) / height,
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The page underneath must not scroll while this owns the screen — set on
  // both, since which element is the scroller varies by browser.
  //
  // And put back exactly where it was, on both edges of the lock. Taking the
  // overflow away takes the scrollable range with it, and a scroll offset with
  // nowhere left to go is clamped to the top — so the page underneath quietly
  // jumps to 0 as this opens and is still there when it closes. That did not
  // show while the only way in was the panel that launches it, because that
  // panel is near the top of the page and there was nothing to lose. There is
  // now: the word parks in the corner and the app opens from wherever the
  // reader happens to be, which is usually most of a page down.
  //
  // Read before the lock and re-asserted after it, rather than only restored on
  // the way out — if the jump happens at all it happens the moment the overflow
  // changes, and undoing it a frame later is the difference between the page
  // being where it was and the page having been somewhere else in between.
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    const restoreY = window.scrollY;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (window.scrollY !== restoreY) window.scrollTo(0, restoreY);

    const onKey = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
      if (window.scrollY !== restoreY) window.scrollTo(0, restoreY);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    // `data-interactive` because this is rendered inside whichever section
    // opened it, and those sections claim the wheel to drive themselves — the
    // Experience strip calls preventDefault on every tick it takes. That kills
    // scrolling inside anything here, which is how the reference detail panel
    // ended up unable to scroll. The sections check for this attribute and
    // leave gestures that start inside it alone.
    <div
      data-interactive
      className="fixed inset-0 z-50 flex items-center justify-center"
      // A case study's page has a colour of its own — Reviu's is lime, Layer's
      // orange, Aquaplanet's blue — and the spreads are drawn to be read on it:
      // Reviu's header is black type that sits directly on the page rather than
      // in a panel, so on a dark ground it disappears. Through `tabColor` as
      // well, since that is where a project's one colour lives now — see CARDS
      // in ProjectSection.
      //
      // Anything without a page of its own — which is the Snapkeep app — gets a
      // scrim rather than a colour. It used to get #336bec, and that is the
      // Experience section's own blue: opened from the panel in that section it
      // read as the page carrying on, which is why it was chosen. It is now
      // also opened from the word parked in the corner, from wherever the reader
      // has got to, and there the same blue reads as being sent back up to the
      // Experience section rather than as a window opening where you are.
      //
      // Black at 30%, which is what a dialog does to the page it opens over.
      // The point is that the page stays legible underneath: you can see you
      // have not gone anywhere, only that something has opened on top.
      style={{
        backgroundColor: card.pageColor ?? card.tabColor ?? "rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* The outer box takes the scaled footprint so the app stays centred;
          the inner one is the app at its own size, scaled from its top-left. */}
      <div
        className="relative"
        style={{
          width: size.width * scale || undefined,
          height: size.height * scale || undefined,
        }}
      >
        {/* Inside the footprint box, not the app — so it sits on the app's
            header row without being scaled down along with it. Falls back to
            the box's top corner until the header has been measured. */}
        <button
          type="button"
          onClick={onClose}
          className="absolute z-10 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full text-[18px] leading-none text-[#1d1c1c] transition-colors hover:bg-black/5"
          style={{
            top: headerRow ? headerRow.centre * scale : 28,
            right: headerRow ? headerRow.inset * scale : 24,
          }}
          aria-label="닫기"
        >
          ✕
        </button>

        <div
          ref={appRef}
          className="w-max origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <App />
        </div>
      </div>
    </div>
  );
}
