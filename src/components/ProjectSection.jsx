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
// The hover artwork, one file per element rather than one flattened cluster
// per folder. That is what lets the pieces be dealt out one at a time — a
// single composed PNG can only ever arrive all at once, and the devices in it
// overlap, so there was no way to cut it back apart afterwards.
//
// Numbered in the design's own paint order, so the array order below is both
// the stacking order and the order they arrive in.
import aquaWebImac from "../assets/project/hover6/aquaweb-imac.png";
import aquaWebIpad from "../assets/project/hover6/aquaweb-ipad.png";
import aquaApp1 from "../assets/project/hover6/aquaapp-1.png";
import aquaApp2 from "../assets/project/hover6/aquaapp-2.png";
import aquaApp3 from "../assets/project/hover6/aquaapp-3.png";
import aquaApp4 from "../assets/project/hover6/aquaapp-4.png";
import layerDark1 from "../assets/project/hover6/layerdark-1.png";
import layerDark2 from "../assets/project/hover6/layerdark-2.png";
import layerDark3 from "../assets/project/hover6/layerdark-3.png";
import layerLight1 from "../assets/project/hover6/layerlight-1.png";
import layerLight2 from "../assets/project/hover6/layerlight-2.png";
import layerLight3 from "../assets/project/hover6/layerlight-3.png";
import reviuApp1 from "../assets/project/hover6/reviuapp-1.png";
import reviuApp2 from "../assets/project/hover6/reviuapp-2.png";
import reviuApp3 from "../assets/project/hover6/reviuapp-3.png";
import reviuApp4 from "../assets/project/hover6/reviuapp-4.png";
import reviuSurvey1 from "../assets/project/hover6/reviusurvey-1.png";
import reviuSurvey2 from "../assets/project/hover6/reviusurvey-2.png";
import reviuSurvey3 from "../assets/project/hover6/reviusurvey-3.png";
import reviuSurvey4 from "../assets/project/hover6/reviusurvey-4.png";
import ProjectMockup from "./ProjectMockup";
import ProjectHoverComposition from "./ProjectHoverComposition";
import ProjectDetailOverlay from "./ProjectDetailOverlay";
import ProjectAppWindow from "./ProjectAppWindow";
import AquaplanetSpread from "./detail/AquaplanetSpread";
import ReviuSpread from "./detail/ReviuSpread";
import LayerSpread from "./detail/LayerSpread";
import { createCardDrum } from "../lib/cardDrum";

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
// How far in front of the screen the eye sits. A near camera on purpose: the
// front folder projecting much larger than the ones behind it *is* the effect —
// it is what makes the ring read as coming towards you and turning away rather
// than as flat shapes sliding sideways, and it is what puts a folder and the
// one opposite it on the ring at different places on screen instead of exactly
// on top of one another.
//
// The shader reads this too, so the drawn cards and the DOM plates over them
// are projected by the same number.
const CAMERA = 820;
// The cards themselves are drawn in WebGL, on the canvas behind this markup —
// see ../lib/cardDrum. A single DOM element cannot be bent in CSS 3D, so this
// used to cut each card into ten vertical slices and stand each one on the
// drum at its own angle. The bend was right and every cut showed: ten hairline
// seams down every card and a stepped silhouette along its top and bottom.
//
// What is left here is the part that has to stay in the DOM — one flat plate
// per card, at the card's own place on the drum, carrying the pointer target
// and the hover artwork. Both use the same transform chain the shader does, so
// the two line up.
// The folders had real thickness for a while — a back plate set in behind the
// front, side faces closing the gap, and rim strips along the top and bottom.
// It came out: the camera sits level with the drum, so a horizontal top face
// projects to about 3px while the side faces show their full depth, and no
// amount of tuning makes those two read as the same thickness. Only tilting the
// camera down would, and that is a different composition. So the folder is a
// curved surface again, with a coloured back so it still never vanishes as it
// turns away.

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

// Six folders, 60deg apart — three projects, each seen twice.
//
// The running order is Layer, Reviu, Aquaplanet, twice round. Two things set
// which folder gets which angle, and they are easy to get backwards:
//
//   - The drum turns so that the angle *facing you* counts DOWN as you scroll
//     (the spin grows, and a folder is head-on when spin + angle is a whole
//     turn). So they arrive 300, 240, 180, 120, 60, 0 and round again — the
//     reverse of the order they are listed in below. Reading this list top to
//     bottom gives Aqua, Reviu, Layer; a visitor meets Layer, Reviu, Aqua.
//   - The two halves of a project sit opposite each other, so they are never
//     both in view at once: Aquaplanet at 0 and 180, Reviu at 60 and 240,
//     Layer at 120 and 300.
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
          image: aquaWebImac,
          layout: { width: "107.96%", left: "-87.76%", top: "76.73%" },
        },
        {
          image: aquaWebIpad,
          layout: { width: "66.92%", left: "-10.64%", top: "89.71%" },
        },
      ],
    },
  },
  {
    angle: 120,
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
          image: layerDark1,
          layout: { width: "35.27%", left: "86.31%", top: "86.93%" },
        },
        {
          image: layerDark2,
          layout: { width: "43.35%", left: "29.68%", top: "97.14%" },
        },
        {
          image: layerDark3,
          layout: { width: "41.70%", left: "58.25%", top: "77.49%" },
        },
      ],
    },
  },
  {
    angle: 60,
    image: faceReviuApp,
    crop: WITH_TAB,
    tabColor: "#78db44",
    detail: ReviuSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: reviuApp4,
          layout: { width: "30.84%", left: "-22.93%", top: "-1.66%" },
        },
        {
          image: reviuApp2,
          layout: { width: "35.66%", left: "30.51%", top: "-12.50%" },
        },
        {
          image: reviuApp3,
          layout: { width: "38.44%", left: "-8.76%", top: "-8.91%" },
        },
        {
          image: reviuApp1,
          layout: { width: "25.59%", left: "14.97%", top: "-21.27%" },
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
          image: aquaApp1,
          layout: { width: "33.04%", left: "94.41%", top: "6.96%" },
        },
        {
          image: aquaApp2,
          layout: { width: "31.33%", left: "61.66%", top: "17.14%" },
        },
        {
          image: aquaApp3,
          layout: { width: "28.76%", left: "123.17%", top: "15.10%" },
        },
        {
          image: aquaApp4,
          layout: { width: "43.67%", left: "80.93%", top: "33.54%" },
        },
      ],
    },
  },
  {
    angle: 300,
    image: faceLayerLight,
    crop: WITH_TAB,
    tabColor: "#ff4800",
    detail: LayerSpread,
    pageColor: "#cc3a00",
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: layerLight3,
          layout: { width: "27.91%", left: "-1.61%", top: "22.80%" },
        },
        {
          image: layerLight2,
          layout: { width: "29.74%", left: "-59.91%", top: "18.22%" },
        },
        {
          image: layerLight1,
          layout: { width: "52.54%", left: "-22.18%", top: "7.10%" },
        },
      ],
    },
  },
  {
    angle: 240,
    image: faceReviuSurvey,
    crop: WITH_TAB,
    tabColor: "#78db44",
    detail: ReviuSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: reviuSurvey1,
          layout: { width: "43.57%", left: "96.23%", top: "15.71%" },
        },
        {
          image: reviuSurvey2,
          layout: { width: "29.70%", left: "92.40%", top: "37.99%" },
        },
        {
          image: reviuSurvey3,
          layout: { width: "35.55%", left: "81.69%", top: "58.12%" },
        },
        {
          image: reviuSurvey4,
          layout: { width: "41.10%", left: "85.54%", top: "84.51%" },
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
  const canvasRef = useRef(null);
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
    const canvas = canvasRef.current;

    // The cards. Everything below still drives the drum's state; the renderer
    // only ever reads it, so the scroll, the chase and the lean are unchanged
    // from when this was a fan of DOM slices.
    const drum = createCardDrum(
      canvas,
      CARDS.map((card) => ({
        angle: card.angle,
        image: card.image,
        tabColor: card.tabColor,
        // The un-cropped faces are framed like `object-fit: cover`; the cropped
        // ones carry the tab in the export and are pinned to the left edge, so
        // the card shows the first 1/1.11662 of them.
        cover: !card.crop,
        texScale: card.crop ? 1 / 1.11662 : 1,
      })),
      { radiusRatio: RADIUS_RATIO },
    );
    // No WebGL is not a crash — the plates, the hover art and every link still
    // work, there is just nothing drawn behind them.
    const leans = new Array(CARDS.length).fill(0);

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
        // The lean. sin, so the folder is upright when it is facing you and
        // tips hardest when it is side-on — and tips the *opposite* way on the
        // opposite side of the ring, which is what reads as the whole drum
        // turning rather than as every card sharing one slant.
        const turned = ((currentDeg + CARDS[i].angle) * Math.PI) / 180;
        leans[i] = CARD_LEAN * Math.sin(turned);
        if (!el) continue;
        // Only what the plate needs. How much of the back is showing, how lit
        // the card is and where the tab has got to are all decided per fragment
        // in the shader now — they are properties of how far a given bit of the
        // sheet has turned, and a bent card is turned by a different amount all
        // the way across it.
        el.style.setProperty("--card-lean", `${leans[i].toFixed(2)}deg`);
        el.style.setProperty("--card-op", openMix.toFixed(3));
      }

      if (drum) {
        const stageW = canvas.clientWidth;
        const stageH = canvas.clientHeight;
        drum.resize(stageW, stageH, window.devicePixelRatio || 1);
        drum.draw({
          // offsetWidth, not a bounding rect: the element carries the spin's
          // rotateY, so its *rendered* box is the turned one. This is the card
          // size the clamp resolved to, read off the same element the plates
          // are laid out in — so the drawn cards and the plates over them
          // cannot disagree about how big a card is at this viewport.
          cardWidth: spin.offsetWidth,
          cardHeight: spin.offsetHeight,
          // The drum's axis. Its holder is centred in a box that covers the
          // same stage as the canvas, and the group's only transform is the
          // vertical travel — so this is the middle, moved by that.
          centre: [stageW / 2, stageH / 2 + folderY],
          spin: currentDeg,
          camera: CAMERA,
          leans,
          alpha: openMix,
        });
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
      drum?.dispose();
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
        {/* The cards. Everything the drum is made of is drawn here in one pass,
            depth-sorted against itself, so a folder that has swung behind
            another is occluded by real depth rather than by DOM order. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />
        {/* The same camera the shader uses, so the plates land on the cards. */}
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ perspective: `${CAMERA}px` }}
        >
          {/* preserve-3d, or this element's own transform flattens everything
              under it: the plates would be laid out by their 3D positions but
              drawn flat, and every one of them would land in the middle. */}
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
                const { angle, hover, mockup } = card;
                const isFront = i === frontIndex;
                const isOpen = isFront && hovered;

                return (
                  <div
                    key={angle}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    className="absolute inset-0 [transform-style:preserve-3d]"
                  >
                    {/* One flat plate where the card's middle is. Under an
                        orthographic projection `rotateY(a) translateZ(R)` still
                        carries it out to R·sin(a) and foreshortens it by cos(a)
                        — the z is dropped, not the transform — so this lands on
                        the drawn card without any of the maths being repeated
                        here. The lean turns about this point, which is the
                        card's own centre, so no round trip out and back.

                        It is the pointer target, the anchor the hover artwork
                        flies out of, and the rect the detail overlay unfolds
                        from. */}
                    <div
                      ref={(el) => {
                        plateRefs.current[i] = el;
                      }}
                      className={`absolute inset-0 ${card.detail && isFront ? "cursor-pointer" : ""}`}
                      style={{
                        transform: `rotateY(${angle}deg) translateZ(${CARD_RADIUS}) rotateZ(var(--card-lean, 0deg))`,
                        opacity: "var(--card-op, 1)",
                        // Cards behind the front one are still on screen, so
                        // they have to be muted at the pointer level.
                        pointerEvents: isFront && !opened ? "auto" : "none",
                      }}
                      onMouseEnter={() => setHover(true)}
                      onMouseLeave={() => setHover(false)}
                      onClick={(event) => open(card, event)}
                    >
                      {/* Mounted only for the card in front, so the hover art of
                        five unreachable cards never gets downloaded.

                        It sits above the canvas rather than inside the drum, so
                        a neighbouring folder can no longer cut across it — the
                        artwork flies well outside the card's own box, and at
                        the card's depth the folder next along was drawing
                        straight over the parts that overhung. */}
                      {isFront &&
                        (hover ? (
                          <ProjectHoverComposition {...hover} open={isOpen} />
                        ) : mockup ? (
                          <ProjectMockup screens={mockup} open={isOpen} />
                        ) : null)}
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
