import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Native width of the opened spread (Figma frame 154:4041): 1681px of facing
// pages plus the 98px tab hanging off the right edge. The spread's *height* is
// whatever its content comes to, measured at runtime — everything is authored
// at 1:1 Figma pixels and the whole block is scaled to fit as a single unit.
const SPREAD_W = 1779;
const BOOK_W = 1681; // the facing pages alone, without the tab
const PAGE_W = 840; // left page; the right one takes the remaining 841
const TAB = { left: BOOK_W, top: 40, width: 98, height: 283 };
const SIDE_PAD = 40;
// Each spread insets its own content off these pages — the margins differ per
// project — so nothing but the page shapes lives at this level.

// How much of the folder's height the paper takes up while it is still folded.
// The spread is proportionally far taller than the opened folder is, so height
// is what has to bind if none of it is to be cut off — which leaves it narrower
// than the folder, sitting on the folder's pages until the bloom.
const INSIDE_FOLDER = 0.86;

// Resolved form of the clamp() the cube cards use in ProjectSection, so the
// page-turn can be positioned in real numbers.
const cardSize = () => ({
  w: Math.min(343, Math.max(180, window.innerWidth * 0.18)),
  h: Math.min(522, Math.max(260, window.innerWidth * 0.27)),
});

// enter    — the folder is still exactly where the card was on the cube
// center   — it has slid right so its spine sits on the middle of the screen
// open     — the cover is swinging left, uncovering the right-hand page
// facing   — the cover has landed; it dissolves off the left-hand page
// expand   — the spread blooms out of the folder up to full size
// settled  — animation over, the page is just a scrollable document
const PHASES = ["enter", "center", "open", "facing", "expand", "settled"];
const MOVE_MS = 620;
const FLIP_MS = 720;
const UNCOVER_MS = 220;
const BLOOM_MS = 750;
const CLOSE_MS = 300;

// The turn starts just before the slide has fully settled, so the two read as
// one continuous move rather than two beats.
const FLIP_AT = MOVE_MS - 60;
const FACING_AT = FLIP_AT + FLIP_MS;
// A beat with both pages open before it blooms.
const EXPAND_AT = FACING_AT + 260;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_TURN = "cubic-bezier(0.45, 0, 0.25, 1)";
// The pages and the cover are separate layers so the paper can sit between
// them, but they are the same folder and have to travel as one.
const FRAME_MOVE = ["left", "top", "width", "height"]
  .map((property) => `${property} ${MOVE_MS}ms ${EASE_OUT}`)
  .join(", ");

export default function ProjectDetailOverlay({ card, originRect, onClose }) {
  const Spread = card.detail;
  // The opened pages are usually the tab's own colour, but a project can
  // darken or shift it — Layer's pages carry a 20% black wash over the tab.
  const pageColor = card.pageColor ?? card.tabColor;
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [phase, setPhase] = useState("enter");
  const [closing, setClosing] = useState(false);
  const [fit, setFit] = useState(0);
  const [spreadH, setSpreadH] = useState(0);
  const [card3d, setCard3d] = useState(cardSize);
  const [folded, setFolded] = useState(null);

  const at = PHASES.indexOf(phase);
  const opened = at >= PHASES.indexOf("open");
  const facing = at >= PHASES.indexOf("facing");
  const expanded = at >= PHASES.indexOf("expand");
  const settled = at >= PHASES.indexOf("settled");

  // Scale-to-fit factor plus the spread's own natural height. offsetHeight is
  // read off the *untransformed* layout, so measuring it here is safe even
  // while the element is mid-scale.
  useLayoutEffect(() => {
    const el = innerRef.current;
    const measure = () => {
      setFit(Math.min(1, (window.innerWidth - SIDE_PAD * 2) / SPREAD_W));
      setSpreadH(el.offsetHeight);
      setCard3d(cardSize());
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

  // Where the spread sits while it is still tucked inside the folder. Solved
  // rather than eyeballed: with transform-origin at 0 0, a local point p lands
  // at layoutTopLeft + translate + p * scale, so pinning the spread's centre to
  // the folder's centre is a straight subtraction.
  useLayoutEffect(() => {
    if (!fit || !spreadH || !outerRef.current) return;
    // Sized off the folder's *height*, so none of the spread is ever cut off.
    // It ends up narrower than the folder is wide — that gap is the folder's
    // own pages showing through, and the bloom closes it.
    const scale = (card3d.h / spreadH) * INSIDE_FOLDER;
    const box = outerRef.current.getBoundingClientRect();
    const left0 = box.left + box.width / 2 - (SPREAD_W * fit) / 2;
    // Anchored on the middle of the *book* rather than the middle of the whole
    // spread — the tab hangs off the right, and the folder's spine is what sits
    // on the centre of the screen.
    const half = (BOOK_W / 2) * scale;
    const x = window.innerWidth / 2 - left0 - (BOOK_W / 2) * scale;
    const y = window.innerHeight / 2 - box.top - (spreadH / 2) * scale;
    setFolded({
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      // Insets are in the spread's own unscaled pixels — the space clip-path
      // works in. Until the cover lands, everything left of the spine belongs
      // to the turning page, not to this copy.
      turning: `inset(0px 0px 0px ${BOOK_W / 2}px)`,
      facing: "inset(0px 0px 0px 0px)",
      // The turning page carries the other half of the content on its back, so
      // the left-hand page is already written by the time it lands. Its box is
      // the cover's, whose right edge is the spine, and it is not mirrored —
      // the cover's -180deg and the back face's +180deg cancel out.
      back: {
        left: card3d.w - half,
        top: (card3d.h - spreadH * scale) / 2,
        width: SPREAD_W,
        transform: `scale(${scale})`,
        clipPath: `inset(0px ${SPREAD_W - BOOK_W / 2}px 0px 0px)`,
      },
    });
  }, [fit, spreadH, card3d]);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("center")),
    );
    const timers = [
      setTimeout(() => setPhase("open"), FLIP_AT),
      setTimeout(() => setPhase("facing"), FACING_AT),
      setTimeout(() => setPhase("expand"), EXPAND_AT),
      setTimeout(() => setPhase("settled"), EXPAND_AT + BLOOM_MS),
    ];
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  // Only ever closes through here, so the fade-out always gets to finish before
  // the parent unmounts us.
  const close = () => {
    setClosing(true);
    setTimeout(() => onCloseRef.current(), CLOSE_MS);
  };

  // The page underneath must not scroll while the overlay owns the screen —
  // set on both, since which element is the scroller varies by browser.
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
      window.removeEventListener("keydown", onKey);
    };
    // `close` only touches setState and a ref, so the first render's copy of it
    // stays correct for the life of the overlay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The folder tracks the card's on-screen box until it is told to centre, at
  // which point its *left* edge — the spine the cover turns on — lands on the
  // middle of the screen, exactly as in the design.
  const folderFrame =
    at === 0
      ? {
          left: originRect.left,
          top: originRect.top,
          width: originRect.width,
          height: originRect.height,
        }
      : {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - card3d.h / 2,
          width: card3d.w,
          height: card3d.h,
        };

  return (
    <div
      className="fixed inset-0 z-50 overflow-x-hidden"
      style={{
        // The spread's layout box is a full 1779px wide whatever the scale, so
        // x has to be clipped. y stays locked until the bloom has landed —
        // scrolling mid-flight would slide the spread out from under the folder
        // it is supposed to be growing out of. `stable` keeps the gutter
        // reserved through the swap so nothing shifts sideways at the handover.
        overflowY: settled ? "auto" : "hidden",
        scrollbarGutter: "stable",
        overscrollBehavior: "contain",
        opacity: closing ? 0 : 1,
        transition: `opacity ${CLOSE_MS}ms ease-in`,
      }}
    >
      {/* Fades in rather than appearing outright, so the cube's other three
          cards are still visible for a beat as they drop away behind it. */}
      <div
        className="pointer-events-none fixed inset-0 bg-[#06252e]"
        style={{ opacity: at > 0 ? 1 : 0, transition: "opacity 420ms ease-out" }}
      />

      <button
        type="button"
        onClick={close}
        className="fixed right-[40px] top-[32px] z-40 flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/25 font-['Plus_Jakarta_Sans'] text-[20px] leading-none text-white transition-colors hover:bg-white/10"
        style={{
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? "auto" : "none",
          transition: "opacity 400ms ease-out, background-color 200ms",
        }}
        aria-label="닫기"
      >
        ✕
      </button>

      {/* The folder's own pages, under the paper. The folded spread is narrower
          than the folder is wide, so these are what fills the rest — and once
          the bloom starts they are gone. */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{ opacity: expanded ? 0 : 1, transition: "opacity 320ms ease-out" }}
      >
        <div className="absolute" style={{ ...folderFrame, transition: FRAME_MOVE }}>
          <div
            className="absolute inset-0 rounded-r-[15px]"
            style={{ backgroundColor: pageColor }}
          />
          {/* There is no left-hand page until the cover swings over to become
              one, so this only exists from the moment the cover hides it. */}
          <div
            className="absolute inset-y-0 rounded-l-[15px]"
            style={{
              left: "-100%",
              width: "100%",
              backgroundColor: pageColor,
              opacity: opened ? 1 : 0,
              transition: `opacity 1ms linear ${FLIP_MS * 0.45}ms`,
            }}
          />
          {/* The tab belongs to the folder, not the cover, so it stays put
              through the whole turn. It takes the opened pages' colour on the
              way, since that is what it is attached to once the folder is
              open — the spread brings its own tab in at the bloom. */}
          <div
            className="absolute right-0 top-[3.5%] h-[24%] w-[11%] translate-x-full rounded-r-[10px]"
            style={{
              backgroundColor: opened ? pageColor : card.tabColor,
              transition: `background-color ${FLIP_MS}ms ease-out`,
            }}
          />
        </div>
      </div>

      <div className="relative z-20 pb-[120px] pt-[110px]">
        <p className="flex w-full items-center justify-center whitespace-nowrap font-['Plus_Jakarta_Sans'] text-[clamp(48px,8vw,150px)] font-semibold leading-none tracking-[clamp(-8px,-0.8vw,-15px)] text-white">
          PROJECT
        </p>

        {/* Height is the scaled spread's, so the document scrolls correctly the
            moment the bloom lands — no reflow between animating and settled. */}
        <div
          ref={outerRef}
          className="relative mt-[52px] w-full"
          style={{ height: spreadH * fit || 0 }}
        >
          <div
            ref={innerRef}
            className="absolute left-1/2 top-0"
            style={{
              width: SPREAD_W,
              marginLeft: -(SPREAD_W * fit) / 2,
              transformOrigin: "0 0",
              transform: expanded ? `scale(${fit})` : folded?.transform,
              // No fade: until the cover swings off it, the visible part of the
              // spread is exactly the area the cover is sitting on, so there is
              // nothing to see anyway.
              opacity: opened && folded ? 1 : 0,
              clipPath: expanded
                ? "inset(0px 0px 0px 0px)"
                : facing
                  ? folded?.facing
                  : folded?.turning,
              // The clip only animates on the bloom — the left-hand page is
              // uncovered by the cover dissolving off it, not by a wipe.
              transition: `transform ${BLOOM_MS}ms ${EASE_OUT}${expanded ? `, clip-path ${BLOOM_MS}ms ${EASE_OUT}` : ""}`,
              willChange: settled ? "auto" : "transform, clip-path",
            }}
          >
            <div
              className="absolute bottom-0 left-0 top-0 rounded-l-[15px]"
              style={{ width: PAGE_W, backgroundColor: pageColor }}
            />
            <div
              className="absolute bottom-0 top-0 rounded-r-[15px]"
              style={{
                left: PAGE_W,
                width: TAB.left - PAGE_W,
                backgroundColor: pageColor,
              }}
            />
            <div
              className="absolute rounded-r-[10px]"
              style={{ ...TAB, backgroundColor: pageColor }}
            />
            <div className="relative">
              <Spread />
            </div>
          </div>
        </div>
      </div>

      {/* The turning cover, above the paper — so the page it is lying on stays
          hidden until it swings away. */}
      <div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          perspective: "1600px",
          opacity: expanded ? 0 : 1,
          transition: "opacity 320ms ease-out",
        }}
      >
        <div
          className="absolute"
          style={{
            ...folderFrame,
            transformStyle: "preserve-3d",
            transition: FRAME_MOVE,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              transform: `rotateY(${opened ? -180 : 0}deg)`,
              // Once it has landed it is the same picture as the page it came
              // to rest on, so it can simply stop being there.
              opacity: facing ? 0 : 1,
              transition: `transform ${FLIP_MS}ms ${EASE_TURN}, opacity ${UNCOVER_MS}ms ease-out`,
            }}
          >
            {/* Closed, this is a card and is rounded all the way round. The
                moment it starts to turn its left edge becomes the fold that
                runs against the other page, so that side squares off. */}
            <img
              src={card.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                borderRadius: opened ? "0 15px 15px 0" : "15px",
                transition: "border-radius 200ms ease-out",
                backfaceVisibility: "hidden",
              }}
            />
            {/* The cover's own back is the left-hand page — once it has swung
                past 90deg it lands exactly where that page belongs. Its own
                180deg cancels the cover's, so it is NOT mirrored: its left edge
                really is the outer one and its right edge is the fold. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: pageColor,
                borderRadius: "15px 0 0 15px",
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
