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
  // The app's own wordmark, in the app's unscaled px: its height, its centre
  // line, and how far it is inset from the app's edge. The close button is cut
  // from these rather than given numbers of its own, so it comes out the same
  // size as the logo and floats off its edge by the same margin the logo floats
  // off the opposite one — a matched pair at either end of the header row.
  //
  // Measured, never hardcoded: index.css restyles this header (the wordmark is
  // 28px there, not the 42px the component asks for) and the whole app is
  // scaled to fit besides.
  const [mark, setMark] = useState(null);

  // offsetWidth/offsetHeight are read off the untransformed layout, so this is
  // safe to run while the element is already mid-scale.
  useLayoutEffect(() => {
    const el = appRef.current;
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize({ width, height });

      // getBoundingClientRect, because the logo's box is what has to be
      // matched and offsetTop/offsetLeft only reach as far as the nearest
      // positioned ancestor. The rects come back with whatever scale is
      // currently applied already baked in, so they are divided back out by
      // the scale actually on the element right now (its rendered width over
      // its layout width) and kept in the app's own px. Render multiplies by
      // the scale again — one place, one direction.
      const logo = el.querySelector("header .font-serif") ?? el.querySelector("header");
      const rootRect = el.getBoundingClientRect();
      const applied = width ? rootRect.width / width : 1;
      const logoRect = logo && applied ? logo.getBoundingClientRect() : null;
      setMark(
        logoRect
          ? {
              size: logoRect.height / applied,
              centre: (logoRect.top + logoRect.height / 2 - rootRect.top) / applied,
              inset: (logoRect.left - rootRect.left) / applied,
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

  // The button's box, in screen px. Everything about it comes off the wordmark:
  // the same height, and the same margin off its own edge as the logo has off
  // the opposite one — which is why the inset the logo gives is applied to
  // `right`, not to `left`.
  //
  // Then clamped into the window, which is the whole reason this is worked out
  // here rather than written inline. The button does not scale with the app, so
  // as the window shrinks the header row it is centred on comes up to meet it:
  // below about a 0.6 scale, half a button is taller than the whole header and
  // the top of it crosses the window's top edge. Clamping on both axes keeps
  // the button inside the rounded corners at any size, and at the sizes where
  // nothing is tight it changes nothing.
  const boxWidth = size.width * scale;
  const boxHeight = size.height * scale;
  const clamp = (min, value, max) => Math.min(Math.max(value, min), Math.max(min, max));
  // Not smaller than a finger, whatever the scale says.
  const closeSize = mark ? Math.max(28, mark.size * scale) : 40;
  const closeBtn = {
    size: closeSize,
    top: mark
      ? clamp(0, mark.centre * scale - closeSize / 2, boxHeight - closeSize)
      : 20,
    right: mark
      ? clamp(0, mark.inset * scale, boxWidth - closeSize)
      : 24,
  };

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
        {/* Inside the footprint box, not the app — so it stays a real 40-odd
            px of click target instead of being scaled down along with the
            window. Falls back to a plain corner until the wordmark has been
            measured. */}
        <button
          type="button"
          onClick={onClose}
          className="absolute z-10 flex items-center justify-center rounded-full leading-none text-[#1d1c1c] transition-colors hover:bg-black/5"
          style={{
            width: closeBtn.size,
            height: closeBtn.size,
            // The ✕ is drawn to the button rather than pinned at 18px, so it
            // keeps its weight against the logo at every window size.
            fontSize: closeBtn.size * 0.45,
            top: closeBtn.top,
            right: closeBtn.right,
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
