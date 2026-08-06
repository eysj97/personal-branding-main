import { useEffect, useRef, useState } from "react";
// Six folders, and for each one a face and the cluster that flies out of it on
// hover. Both come straight from the design, rendered in isolation so they
// carry their own transparency — an ordinary export bakes Figma's canvas grey
// in behind them, which on a dark section reads as a grey box rather than a
// drawing.
import faceAquaWeb from "../assets/project/folder6/face-aqua-web.png";
import faceAquaApp from "../assets/project/folder6/face-aqua-app.png";
import faceLayerDark from "../assets/project/folder6/face-layer-dark.png";
import faceLayerLight from "../assets/project/folder6/face-layer-light.png";
import faceReviuApp from "../assets/project/folder6/face-reviu-app.png";
import faceReviuSurvey from "../assets/project/folder6/face-reviu-survey.png";
import clusterAquaWeb from "../assets/project/folder6/cl-aqua-web.png";
import clusterAquaApp from "../assets/project/folder6/cl-aqua-app.png";
import clusterLayerDark from "../assets/project/folder6/cl-layer-dark.png";
import clusterLayerLight from "../assets/project/folder6/cl-layer-light.png";
import clusterReviuApp from "../assets/project/folder6/cl-reviu-app.png";
import clusterReviuSurvey from "../assets/project/folder6/cl-reviu-survey.png";
import ProjectMockup from "./ProjectMockup";
import ProjectHoverComposition from "./ProjectHoverComposition";
import ProjectDetailOverlay from "./ProjectDetailOverlay";
import ProjectAppWindow from "./ProjectAppWindow";
import AquaplanetSpread from "./detail/AquaplanetSpread";
import ReviuSpread from "./detail/ReviuSpread";
import LayerSpread from "./detail/LayerSpread";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (v) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

// How hard the cube chases the angle the scroll asks for, per frame. Scroll
// sets a *target*; the cube follows it with weight, so letting go of the wheel
// lets it coast to a stop instead of freezing mid-turn.
const SPIN_CHASE = 0.09;
// Hovering does not stop the cube, it nearly stops it. A hard stop banks up
// however far the scroll moved meanwhile and snaps through it on release.
const SPIN_CHASE_HELD = 0.012;
// A gentle bias toward whichever card is nearest to facing you, so the cube
// prefers to come to rest showing one rather than an edge. Kept well under 1
// so the angle still tracks the scroll rather than clicking into slots.
const FACING_PULL = 0.4;
// A folder that has turned away does not vanish — it shows its back. Over this
// much of the turn the artwork is covered by the folder's own colour, so what
// you see going round the back is a solid object rather than a hole.
const EDGE_FADE = 0.3;
const OPEN_FADE = 0.12; // per-frame chase for the fade-out when a card opens
// How far a folder tips as it swings round, at its most side-on. Small on
// purpose: it is meant to read as the cards being carried round rather than
// bolted upright, not as a deck of cards thrown down.
const CARD_LEAN = 8;

// How far each card sits from the drum's axis, as a multiple of the card's own
// width — the two must agree, since the bend below is computed from the ratio
// rather than measured in px. The cube's width clamp is 120/12vw/229, so this
// is that times RADIUS_RATIO. (It has to be written out as a literal: Tailwind
// reads class names out of the source text, so a built string would generate no
// CSS. This one is only used in inline styles, but keeping the pair adjacent is
// what stops them drifting apart.)
//
// Up from 1.15, sized so the *gap* between neighbouring folders doubles — which
// is not the same as doubling the radius. The folders sit 60deg apart whatever
// the radius, and each one spans an angle set by its own width over that radius,
// so the gap is what is left over after the card: at 1.15 a card covers 48.8 of
// its 60deg and leaves 11.2, worth about 0.22 of a card width. Doubling the
// radius to 2.3 leaves 35.6deg — 1.43 card widths, six times the gap, not twice.
// 1.365 is the ratio that lands the leftover on 0.45 card widths instead.
const RADIUS_RATIO = 1.365;
const CARD_RADIUS = "clamp(163.8px,16.38vw,312.6px)";
// A single DOM element cannot be bent in CSS 3D, so each card is rendered as a
// row of vertical slices standing on the cube's own cylinder — the folder is a
// section of the drum rather than a flat plate stuck to it, which is what makes
// the spin read as rotation instead of as flat rectangles swapping places.
// Every slice shows the *whole* card, clipped to its own band, so the artwork
// (and the live Snapkeep face) needs no slicing of its own.
// 10 rather than a handful: with real perspective each slice projects at its
// own depth, so too few of them show as a stepped outline down the folder's top
// and bottom edges and as a seam where the artwork jumps between bands.
const SLICES = 10;
// The angle one slice subtends: its chord is one slice of the card's width on a
// circle of RADIUS_RATIO times that width. The 0.98 pulls the slices a hair
// closer than they are wide so they overlap instead of leaving hairline seams.
const SLICE_STEP =
  ((2 * Math.asin(1 / (2 * SLICES * RADIUS_RATIO)) * 180) / Math.PI) * 0.98;
const SLICE_ANGLES = Array.from(
  { length: SLICES },
  (_, i) => (i - (SLICES - 1) / 2) * SLICE_STEP,
);
const BEND_DEG = SLICE_STEP * SLICES;
// Percentages, so none of this needs the card measured in px.
const SLICE_BAND = {
  left: "50%",
  width: `${100 / SLICES}%`,
  marginLeft: `${-50 / SLICES}%`,
};
// The folders had real thickness for a while — a back plate set in behind the
// front, side faces closing the gap, and rim strips along the top and bottom.
// It came out: the camera sits level with the drum, so a horizontal top face
// projects to about 3px while the side faces show their full depth, and no
// amount of tuning makes those two read as the same thickness. Only tilting the
// camera down would, and that is a different composition. So the folder is a
// curved surface again, with a coloured back so it still never vanishes as it
// turns away.

/** A hex colour, darkened. The folder's back is the same material as
 *  its tab, just not catching any light. */
function shade(hex, amount) {
  if (typeof hex !== "string" || hex[0] !== "#") return hex;
  const n = parseInt(hex.slice(1), 16);
  const dim = (channel) => Math.round(channel * (1 - amount));
  return `rgb(${dim((n >> 16) & 255)}, ${dim((n >> 8) & 255)}, ${dim(n & 255)})`;
}
// `crop` replicates the exact framing from Figma (custom pan/zoom on the
// source image), not a generic auto-cover fit.
//
// The folders stand on a ring close to its own centre — a small radius, so
// they overlap as they come round — rather than spread out on a wide, flat
// circle. There are six of them now, so the spacing is a sixth of a turn; it
// is derived below rather than written down, and nothing here should assume a
// particular count.
// Four of the six faces are exported 383 wide rather than the card's own 343.
// That is deliberate: in the design the logo and the mascot are laid over the
// card as siblings rather than inside it, so only the whole group carries
// them, and the group is card + tab. The extra 40 is that tab, which the
// folder already draws itself in `tabColor` — so the art is pinned to the left
// edge at 383/343 and the card's own clip cuts the exported tab away. Anchored
// left, not covered: `object-cover` would centre it and shave both sides.
const WITH_TAB = { left: 0, top: 0, width: "111.662%", height: "100%" };

// Six folders, 60deg apart — three projects, each seen twice. The two halves
// of a project sit opposite each other on the drum, so they are never both in
// view, and any half turn shows all three projects rather than one twice.
//
// Every `layout` below is the design's own geometry restated as a fraction of
// the card: the cluster's offset from the card's top-left over 343 x 522. That
// is what keeps a cluster hanging off the right corner at one size and every
// other size too.
const CARDS = [
  {
    angle: 0,
    image: faceAquaWeb,
    tabColor: "#2686e7",
    detail: AquaplanetSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterAquaWeb,
          layout: { width: "150.68%", left: "-71.72%", top: "70.79%" },
        },
      ],
    },
  },
  {
    angle: 60,
    image: faceLayerDark,
    crop: WITH_TAB,
    tabColor: "#ff4800",
    detail: LayerSpread,
    // Layer's opened pages carry a 20% black wash over the tab colour.
    pageColor: "#cc3a00",
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterLayerDark,
          layout: { width: "107.17%", left: "27.11%", top: "82.76%" },
        },
      ],
    },
  },
  {
    angle: 120,
    image: faceReviuApp,
    crop: WITH_TAB,
    tabColor: "#78db44",
    detail: ReviuSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterReviuApp,
          layout: { width: "96.08%", left: "-20.40%", top: "-24.90%" },
        },
      ],
    },
  },
  {
    angle: 180,
    image: faceAquaApp,
    tabColor: "#2686e7",
    detail: AquaplanetSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterAquaApp,
          layout: { width: "100.32%", left: "-50.15%", top: "70.51%" },
        },
      ],
    },
  },
  {
    angle: 240,
    image: faceLayerLight,
    crop: WITH_TAB,
    tabColor: "#ff4800",
    detail: LayerSpread,
    pageColor: "#cc3a00",
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterLayerLight,
          layout: { width: "89.36%", left: "-45.21%", top: "-18.51%" },
        },
      ],
    },
  },
  {
    angle: 300,
    image: faceReviuSurvey,
    crop: WITH_TAB,
    tabColor: "#78db44",
    detail: ReviuSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: clusterReviuSurvey,
          layout: { width: "52.01%", left: "-26.34%", top: "4.22%" },
        },
      ],
    },
  },
].map((card) => ({
  ...card,
  // The device cluster is gone. Every folder now carries its own hover art
  // straight from the design, with the devices already composed into it, and
  // `hover` wins over `mockup` where both are set — so a fallback here would
  // only ever be dead weight in the bundle.
  mockup: card.mockup ?? null,
}));
// How far apart the folders stand on the drum. Derived, so that adding or
// removing one moves the resting angles with it rather than leaving the spin
// settling on gaps.
const CARD_STEP_DEG = 360 / CARDS.length;
// How far the drum turns over the whole section. The scroll it happens across
// is fixed, so this alone sets how fast it turns. It has come down from 1500 in
// two steps; 840 is a little over two turns, which is still enough for every
// folder to come round twice and is as gentle as it can get before the movement
// stops reading as rotation — 660 was already past that line.
//
// Not a multiple of 360 on purpose — it lands slightly off the baseline angles
// at rest, so the 0deg/180deg cards do not end up perfectly eclipsing each
// other.
const TOTAL_SPIN_DEG = 840;

// Scroll-progress (0-1) at which the folder locks into its final,
// permanent resting frame.
const FOLDER_STOP_AT = 0.6;
// Section is h-[280vh] below, so 140vh is its vertical midpoint — not just
// the viewport center, but the center of the whole scrollable section.
const SECTION_HEIGHT_VH = 280;
const TEXT_FROM_TOP = SECTION_HEIGHT_VH / 2;
const START_OFFSET_VH = -12.5; // folder's base starting position, vh from center
const EXTRA_GAP_PX = 75; // additional gap pushed in on top of the base starting position

// Signed distance from `deg` to a head-on 0deg, folded into [-180, 180].
const angleFromFront = (deg) => {
  const wrapped = (((deg % 360) + 540) % 360) - 180;
  return Math.abs(wrapped);
};

export default function ProjectSection() {
  const sectionRef = useRef(null);
  const groupRef = useRef(null);
  const spinRef = useRef(null);
  // The spin loop writes opacity and brightness straight onto each card, so it
  // needs the elements rather than going back through React on every frame.
  const cardRefs = useRef([]);
  // The flat plate inside each card — the card's real on-screen footprint, now
  // that the card itself is a fan of slices.
  const plateRefs = useRef([]);
  // Read inside the scroll loop, so hovering can freeze the spin without the
  // loop having to be torn down and rebuilt on every hover.
  const hoveredRef = useRef(false);
  const openedRef = useRef(false);
  const [frontIndex, setFrontIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  // { card, rect } — rect is where the card sat on screen when it was clicked,
  // which is the frame the folder animation starts from.
  const [opened, setOpened] = useState(null);
  // Cards that open as a plain window rather than a folder spread.
  const [standalone, setStandalone] = useState(null);

  useEffect(() => {
    const section = sectionRef.current;
    const group = groupRef.current;
    const spin = spinRef.current;

    // Scroll sets where the cube *should* be; the frame loop below is what
    // actually moves it. Reading the scroll position straight into the
    // transform is what made this feel like dragging a slider — the cube
    // froze the instant the wheel stopped and jumped when it was spun fast.
    let targetDeg = 0;
    let currentDeg = 0;
    let folderY = 0;
    let openMix = 1;
    let frameId = null;
    let running = false;
    let front = 0;

    function readScroll() {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

      // Folder is already sitting in view (near the top, waiting) the
      // moment this section begins, then eases down past dead-center and
      // settles exactly as far below as it started above — the end offset
      // mirrors the start offset instead of using its own fixed amount, so
      // the travel above and below "PROJECT" is symmetric. Scrolling back
      // up reverses it, since it's just a direct function of the current
      // scroll position. "PROJECT" isn't part of this at all — see the
      // plain, non-sticky <p> below.
      const startOffsetPx =
        (START_OFFSET_VH / 100) * window.innerHeight + EXTRA_GAP_PX;
      const folderT = clamp01(raw / FOLDER_STOP_AT);
      folderY = startOffsetPx * (1 - 2 * folderT);

      // Rotation is driven by scroll distance since the folder first peeks
      // into view — including the natural pre-stick entrance, before this
      // section locks in place — so it starts spinning the instant it
      // appears (and un-spins just as readily when you scroll back up).
      // Runs across the section's entire scrollable range rather than
      // stopping at FOLDER_STOP_AT like the position does, so it keeps
      // spinning (even after the folder itself has settled in place) all
      // the way until the section ends. Eased rather than linear, so it
      // gathers pace and lets go instead of turning at one flat rate.
      const enteredPx = window.innerHeight - rect.top;
      const folderRangePx = window.innerHeight + scrollable;
      const spinT = clamp01(enteredPx / folderRangePx);
      targetDeg = smoothstep(spinT) * TOTAL_SPIN_DEG;
    }

    function frame() {
      // Hovering or opening a card slows the cube almost to a halt rather
      // than stopping it dead — a hard stop banks up whatever the scroll did
      // meanwhile and snaps through it the moment the pointer leaves.
      const held = hoveredRef.current || openedRef.current;
      const chase = held ? SPIN_CHASE_HELD : SPIN_CHASE;

      // Bias the goal toward the nearest card facing the viewer, so the drum
      // prefers to rest showing a card rather than an edge. At 0.4 the pull
      // can only bend the angle by a fraction of a step, which reads as weight
      // rather than as snapping into slots.
      //
      // Off the card spacing, not a fixed 90: with six folders the slots are
      // 60deg apart, and rounding to 90 would have pulled the drum toward
      // angles no card actually sits at — settling it on an edge, which is the
      // exact thing this is here to avoid.
      const facingDeg = Math.round(targetDeg / CARD_STEP_DEG) * CARD_STEP_DEG;
      const goal = held
        ? targetDeg
        : targetDeg + (facingDeg - targetDeg) * FACING_PULL;

      currentDeg += (goal - currentDeg) * chase;
      spin.style.transform = `rotateY(${currentDeg.toFixed(3)}deg)`;
      group.style.transform = `translateY(${folderY.toFixed(2)}px)`;

      openMix += ((openedRef.current ? 0 : 1) - openMix) * OPEN_FADE;

      let nearest = 0;
      for (let i = 0; i < CARDS.length; i += 1) {
        const el = cardRefs.current[i];
        if (
          angleFromFront(currentDeg + CARDS[i].angle) <
          angleFromFront(currentDeg + CARDS[nearest].angle)
        ) {
          nearest = i;
        }
        if (!el) continue;
        const turned = ((currentDeg + CARDS[i].angle) * Math.PI) / 180;
        // 1 head-on, 0 edge-on, negative once it has turned away.
        const facing = Math.cos(turned);
        // The lean. sin, so the folder is upright when it is facing you and
        // tips hardest when it is side-on — and tips the *opposite* way on the
        // opposite side of the ring, which is what reads as the whole drum
        // turning rather than as every card sharing one slant.
        el.style.setProperty(
          "--card-lean",
          `${(CARD_LEAN * Math.sin(turned)).toFixed(2)}deg`,
        );
        // Handed to the slices rather than set here: opacity or filter on this
        // element would group it and collapse the bend back into a flat plate.
        // Nothing fades with the turn any more — only opening a card fades the
        // rest out — so the drum stays whole the whole way round.
        el.style.setProperty("--card-op", openMix.toFixed(3));
        // How much of the folder's back is showing. Full once it has passed
        // edge-on, which is what covers the mirrored artwork behind it.
        el.style.setProperty(
          "--card-back",
          clamp01((EDGE_FADE - facing) / EDGE_FADE).toFixed(3),
        );
        // The tab is welded to the folder's right edge, so once the folder has
        // turned past edge-on that edge is round the back and the tab with it.
        // Left visible it comes round the other side and draws a coloured bar
        // straight across the front of the card — measured at up to 159px in.
        el.style.setProperty("--card-tab", clamp01(facing / EDGE_FADE).toFixed(3));
        // Cards further from head-on sit back in the light, which is what
        // makes four curved panels read as one solid object.
        el.style.setProperty(
          "--card-br",
          (0.78 + 0.22 * clamp01(facing)).toFixed(3),
        );
      }

      // Only the card currently facing the viewer is hoverable; the rest
      // would otherwise still catch the pointer from behind.
      if (nearest !== front) {
        front = nearest;
        setFrontIndex(nearest);
      }

      frameId = requestAnimationFrame(frame);
    }

    function start() {
      if (!running) {
        running = true;
        frameId = requestAnimationFrame(frame);
      }
    }

    function stop() {
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    }

    // Nothing to animate while the section is off screen.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    visibility.observe(section);

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);
    readScroll();
    // Start settled rather than easing in from zero on first paint.
    currentDeg = targetDeg;

    return () => {
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      visibility.disconnect();
      stop();
    };
  }, []);

  const setHover = (value) => {
    hoveredRef.current = value;
    setHovered(value);
  };

  const open = (card, event) => {
    if (!card.detail) return;
    const index = CARDS.indexOf(card);
    openedRef.current = true;
    setHover(false);
    // A standalone card skips the folder entirely — there is no spread to
    // unfold into, just the app itself, so it needs no origin rect either.
    if (card.standalone) {
      setStandalone(card);
      return;
    }
    // The plate, not the clicked slice — the overlay unfolds from the whole
    // card, and a slice's rect is only a sixth of it.
    const from = plateRefs.current[index] ?? event.currentTarget;
    setOpened({ card, rect: from.getBoundingClientRect() });
  };

  const closeDetail = () => {
    openedRef.current = false;
    setOpened(null);
    setStandalone(null);
    // The spin only recomputes on scroll, so without a nudge the cube would sit
    // frozen at whatever angle it was abandoned on until the page next moves.
    window.dispatchEvent(new Event("scroll"));
  };

  return (
    <section
      ref={sectionRef}
      className="section-project relative h-[280vh] bg-[#06252e]"
    >
      {/* Plain, non-sticky — keeps a constant gap below the landing section
          and scrolls away with the page like ordinary content, which is
          what makes it read as "rising up" past the folder. */}
      <div
        className="absolute left-0 z-0 flex w-full flex-col items-center gap-[24px]"
        style={{ top: `${TEXT_FROM_TOP}vh` }}
      >
        {/* 120 at 1920, like every other section heading — 120/1920 = 6.25vw,
            and the tracking follows it at the same -0.1em the design uses. */}
        <p className="font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(40px,6.25vw,120px)] tracking-[clamp(-4px,-0.625vw,-12px)] text-white">
          PROJECT
        </p>
        {/* text-center, not just the parent's items-center — that only
            centers the block, which with two lines of different lengths
            still leaves them ragged against a shared left edge. */}
        {/* 16px at the 1920 design width, and the vw term is scaled by the same
            22->16 ratio so it keeps shrinking with the heading rather than
            standing still while everything around it gets smaller. */}
        <p className="font-['Pretendard'] leading-[1.2] whitespace-nowrap text-center text-[clamp(11px,0.833vw,16px)] tracking-[-0.44px] text-white">
          경험해 보신 것 처럼, 저는 이런 방식으로 만들어 갑니다
          <br />
          다른 프로젝트들도 보여드릴게요
        </p>
      </div>

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* A near camera on purpose. The front folder projecting much larger
            than the ones behind it *is* the effect — it is what makes the ring
            read as coming towards you and turning away, rather than as flat
            shapes sliding sideways. At 1600 the depth was there but too even to
            notice; this is close enough that the card in front dominates. */}
        <div className="absolute inset-0 z-10 flex items-center justify-center [perspective:820px]">
          {/* preserve-3d, or this element's own transform flattens everything
              under it: the folders would be laid out by their 3D positions but
              drawn with no perspective, so the bend, the thickness and the rim
              faces would all collapse into the flat plane. */}
          <div
            ref={groupRef}
            className="[transform-style:preserve-3d] will-change-transform"
          >
            <div
              ref={spinRef}
              // Two thirds of the size it was (18vw/27vw -> 12vw/18vw). The
              // radius below has to come down with it or the cards fly apart:
              // it is stated as a multiple of the width for exactly that
              // reason, and the bend is derived from the same ratio.
              className="relative w-[clamp(120px,12vw,229px)] h-[clamp(173px,18vw,348px)] [transform-style:preserve-3d] will-change-transform"
            >
              {CARDS.map((card, i) => {
                const { angle, image, tabColor, crop, hover, mockup, face: Face } = card;
                const isFront = i === frontIndex;
                const isOpen = isFront && hovered;
                // The folder's back: the same material as its tab, in shadow.
                const backColor = shade(tabColor, 0.5);
                // One descriptor, rendered once per slice. Each copy is laid
                // out at full card width inside its slice and then shifted, so
                // every slice paints its own band of the same card.
                const art = Face ? (
                  <Face />
                ) : crop ? (
                  <img
                    src={image}
                    alt=""
                    className="absolute max-w-none"
                    style={crop}
                  />
                ) : (
                  <img
                    src={image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                );

                return (
                  <div
                    key={angle}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    className="absolute inset-0 [transform-style:preserve-3d]"
                    style={{
                      // Cards behind the front one are still on screen, so they
                      // have to be muted at the pointer level, not visually.
                      pointerEvents: isFront && !opened ? "auto" : "none",
                      // Opacity and brightness are driven per frame by the spin
                      // loop, but they are handed down as custom properties and
                      // applied on the slices: setting either one *here* would
                      // group this element and flatten the curve away.
                    }}
                  >
                    {/* The lean, and nothing else. A folder tips as it swings
                        round, and it has to tip about *its own* middle — a
                        rotateZ on the element above would swing the whole card
                        around the drum's axis instead, which is an orbit, not a
                        lean. So this goes out to the card's centre, turns there,
                        and comes back; everything inside then rides along
                        unchanged, still on the same cylinder. */}
                    <div
                      className="absolute inset-0 [transform-style:preserve-3d]"
                      style={{
                        transform: `rotateY(${angle}deg) translateZ(${CARD_RADIUS}) rotateZ(var(--card-lean, 0deg)) translateZ(calc(-1 * ${CARD_RADIUS})) rotateY(${-angle}deg)`,
                      }}
                    >
                    {SLICE_ANGLES.map((slice, s) => (
                      <div
                        key={slice}
                        className={`absolute top-0 h-full overflow-hidden ${card.detail ? "cursor-pointer" : ""}`}
                        style={{
                          ...SLICE_BAND,
                          transform: `rotateY(${angle + slice}deg) translateZ(${CARD_RADIUS})`,
                          // Deliberately *not* backface-hidden: a folder that
                          // has turned away has to keep occupying its place in
                          // the drum. The back plate below is what covers the
                          // mirrored artwork.
                          opacity: "var(--card-op, 1)",
                          filter: "brightness(var(--card-br, 1))",
                        }}
                        onMouseEnter={() => setHover(true)}
                        onMouseLeave={() => setHover(false)}
                        onClick={(event) => open(card, event)}
                      >
                        {/* 5px, and the tab below carries the same — the two
                            are one object, so they round together. */}
                        <div
                          className="absolute top-0 h-full rounded-[5px] overflow-hidden"
                          style={{
                            width: `${SLICES * 100}%`,
                            left: `${-s * 100}%`,
                          }}
                        >
                          {art}
                          {/* The folder's back. The card is one curved surface, so
                              this is what is on the other side of it — faded in
                              as it turns away so the artwork is never seen
                              mirrored through itself. */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: backColor,
                              opacity: "var(--card-back, 0)",
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* The tab rides the far end of the arc, so it stays welded
                        to the folder's right edge as that edge curves back. */}
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        ...SLICE_BAND,
                        transform: `rotateY(${angle + SLICE_ANGLES[SLICES - 1]}deg) translateZ(${CARD_RADIUS})`,
                        opacity: "calc(var(--card-op, 1) * var(--card-tab, 1))",
                        filter: "brightness(var(--card-br, 1))",
                      }}
                    >
                      {/* Right corners only, at the folder body's 5px — the
                          left side is where it meets the folder. */}
                      <div
                        className="absolute right-0 top-[3.5%] h-[24%] translate-x-full rounded-r-[5px]"
                        style={{
                          width: `${11 * SLICES}%`,
                          backgroundColor: tabColor,
                        }}
                      />
                    </div>

                    {/* The hover cluster flies out of the card rather than
                        sitting on it, so it stays a flat plate at the card's
                        own depth. Also the rect the detail overlay unfolds
                        from — a slice's rect would only be a sixth of it. */}
                    <div
                      ref={(el) => {
                        plateRefs.current[i] = el;
                      }}
                      className="absolute inset-0"
                      style={{
                        transform: `rotateY(${angle}deg) translateZ(${CARD_RADIUS})`,
                        opacity: "var(--card-op, 1)",
                        pointerEvents: "none",
                      }}
                    >
                      {/* Mounted only for the card in front, so the hover art of
                        three unreachable cards never gets downloaded. */}
                      {isFront &&
                        (hover ? (
                          <ProjectHoverComposition {...hover} open={isOpen} />
                        ) : mockup ? (
                          <ProjectMockup screens={mockup} open={isOpen} />
                        ) : null)}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {opened && (
        <ProjectDetailOverlay
          card={opened.card}
          originRect={opened.rect}
          onClose={closeDetail}
        />
      )}

      {standalone && (
        <ProjectAppWindow card={standalone} onClose={closeDetail} />
      )}
    </section>
  );
}
