import { useEffect, useRef, useState } from "react";
import cardPhoto from "../assets/project/card-photo.png";
import cardViewBody from "../assets/project/card-view-hover-body.png";
import cardSantalBody from "../assets/project/card-santal-hover-body.png";
import cardSnapkeepBody from "../assets/project/card-snapkeep-body.png";
import screenImac from "../assets/project/mockup/screen-imac.png";
import screenIpad from "../assets/project/mockup/screen-ipad.png";
import screenPhone1 from "../assets/project/mockup/screen-phone-1.png";
import screenPhone2 from "../assets/project/mockup/screen-phone-2.png";
import screenPhone3 from "../assets/project/mockup/screen-phone-3.png";
import screenPhone4 from "../assets/project/mockup/screen-phone-4.png";
import santalHover from "../assets/project/hover/layer-hover.png";
import viewHoverCards from "../assets/project/hover/view-hover1.png";
import viewHoverPhones from "../assets/project/hover/view-hover2.png";
import snapkeepHover from "../assets/project/hover/snapkeep-hover.png";
import ProjectMockup from "./ProjectMockup";
import ProjectHoverComposition from "./ProjectHoverComposition";
import ProjectDetailOverlay from "./ProjectDetailOverlay";
import AquaplanetSpread from "./detail/AquaplanetSpread";
import SnapkeepSpread from "./detail/SnapkeepSpread";
import ReviuSpread from "./detail/ReviuSpread";
import LayerSpread from "./detail/LayerSpread";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
// Until a project has its own device screenshots, the hover cluster just shows
// the card's own artwork on every screen. Drop a `mockup` on the card below to
// replace it: { imac, ipad, phones: [1, 2, 3, 4] }.
const fallbackMockup = (image) => ({
  imac: image,
  ipad: image,
  phones: [image, image, image, image],
});
// crop replicates the exact framing from Figma (custom pan/zoom on the
// source image), not a generic auto-cover fit.
// Each card is a face of the same cube — a true 90deg apart, front/right/
// back/left, sitting close to the cube's own center (small radius) instead
// of spread out on a wide, flat-looking circle.
const CARDS = [
  {
    angle: 0,
    image: cardPhoto,
    tabColor: "#2686e7",
    // Clicking a card only does something once it has a `detail` spread to
    // open into; the other three stay hover-only until theirs are drawn.
    detail: AquaplanetSpread,
    mockup: {
      imac: screenImac,
      ipad: screenIpad,
      phones: [screenPhone1, screenPhone2, screenPhone3, screenPhone4],
    },
  },
  {
    angle: 90,
    image: cardViewBody,
    tabColor: "#78db44",
    detail: ReviuSpread,
    hover: {
      origin: "50% 50%",
      assets: [
        {
          image: viewHoverCards,
          layout: { width: "52%", left: "-27%", top: "4%" },
        },
        {
          image: viewHoverPhones,
          layout: { width: "85%", left: "55%", top: "66%" },
        },
      ],
    },
  },
  {
    angle: 180,
    image: cardSantalBody,
    tabColor: "#ff4800",
    detail: LayerSpread,
    // Layer's opened pages carry a 20% black wash over the tab colour.
    pageColor: "#cc3a00",
    hover: {
      origin: "50% 65%",
      assets: [
        {
          image: santalHover,
          layout: { width: "91.5%", left: "60%", top: "63%" },
        },
      ],
    },
  },
  // Placeholder 4th card — swap `image` for a real one whenever you have it.
  {
    angle: 270,
    image: cardSnapkeepBody,
    tabColor: "#017c6e",
    detail: SnapkeepSpread,
    hover: {
      origin: "35% 25%",
      assets: [
        {
          image: snapkeepHover,
          layout: { width: "101.92%", left: "-62%", top: "-27.99%" },
        },
      ],
    },
  },
].map((card) => ({
  ...card,
  mockup: card.mockup ?? fallbackMockup(card.image),
}));
// Not a multiple of 360 on purpose — lands slightly off the baseline
// angles at rest, so the 0deg/180deg cards don't end up perfectly
// eclipsing each other.
const TOTAL_SPIN_DEG = 660;

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
  // Read inside the scroll loop, so hovering can freeze the spin without the
  // loop having to be torn down and rebuilt on every hover.
  const hoveredRef = useRef(false);
  const openedRef = useRef(false);
  const [frontIndex, setFrontIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  // { card, rect } — rect is where the card sat on screen when it was clicked,
  // which is the frame the folder animation starts from.
  const [opened, setOpened] = useState(null);

  useEffect(() => {
    const section = sectionRef.current;
    const group = groupRef.current;
    const spin = spinRef.current;
    let ticking = false;

    function render() {
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
      const folderY = startOffsetPx * (1 - 2 * folderT);

      // Rotation is driven by scroll distance since the folder first peeks
      // into view — including the natural pre-stick entrance, before this
      // section locks in place — so it starts spinning the instant it
      // appears (and un-spins just as readily when you scroll back up).
      // Runs across the section's entire scrollable range rather than
      // stopping at FOLDER_STOP_AT like the position does, so it keeps
      // spinning (even after the folder itself has settled in place) all
      // the way until the section ends.
      const enteredPx = window.innerHeight - rect.top;
      const folderRangePx = window.innerHeight + scrollable;
      const spinT = clamp01(enteredPx / folderRangePx);
      const totalSpinDeg = spinT * TOTAL_SPIN_DEG;
      // While a card is being inspected the cube holds still — otherwise the
      // card would keep turning out from under the cursor mid-hover, or out
      // from under the folder that is opening on top of it.
      if (!hoveredRef.current && !openedRef.current) {
        spin.style.transform = `rotateY(${totalSpinDeg}deg)`;

        // Only the card currently facing the viewer is hoverable; the rest
        // would otherwise still catch the pointer from behind.
        let next = 0;
        for (let i = 1; i < CARDS.length; i += 1) {
          if (
            angleFromFront(totalSpinDeg + CARDS[i].angle) <
            angleFromFront(totalSpinDeg + CARDS[next].angle)
          ) {
            next = i;
          }
        }
        setFrontIndex(next);
      }

      group.style.transform = `translateY(${folderY}px)`;

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(render);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    render();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const setHover = (value) => {
    hoveredRef.current = value;
    setHovered(value);
  };

  const open = (card, event) => {
    if (!card.detail) return;
    openedRef.current = true;
    setHover(false);
    setOpened({ card, rect: event.currentTarget.getBoundingClientRect() });
  };

  const closeDetail = () => {
    openedRef.current = false;
    setOpened(null);
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
        <p className="font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(48px,8vw,150px)] tracking-[clamp(-8px,-0.8vw,-15px)] text-white">
          PROJECT
        </p>
        <p className="font-['Pretendard'] leading-[1.2] whitespace-nowrap text-[clamp(14px,1.15vw,22px)] tracking-[-0.44px] text-white">
          발견한 문제를 어떻게 해결했는지 담았습니다.
        </p>
      </div>

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-10 flex items-center justify-center [perspective:900px]">
          <div
            ref={groupRef}
            className="will-change-transform"
          >
            <div
              ref={spinRef}
              className="relative w-[clamp(180px,18vw,343px)] h-[clamp(260px,27vw,522px)] [transform-style:preserve-3d] will-change-transform"
            >
              {CARDS.map((card, i) => {
                const { angle, image, tabColor, crop, hover, mockup } = card;
                const isFront = i === frontIndex;
                const isOpen = isFront && hovered;
                const baseTransform = `rotateY(${angle}deg) translateZ(clamp(270px,27vw,515px))`;

                return (
                  <div
                    key={angle}
                    className="absolute inset-0 rounded-[15px]"
                    style={{
                      transform: baseTransform,
                      // Cards behind the front one are still on screen, so they
                      // have to be muted at the pointer level, not visually.
                      pointerEvents: isFront && !opened ? "auto" : "none",
                      // Once a card has been picked the whole cube clears out
                      // from under the folder that is opening over it.
                      opacity: opened ? 0 : 1,
                      transition: "opacity 300ms ease-out",
                    }}
                  >
                    <div
                      className={`absolute inset-0 rounded-[15px] overflow-hidden ${card.detail ? "cursor-pointer" : ""}`}
                      onMouseEnter={() => setHover(true)}
                      onMouseLeave={() => setHover(false)}
                      onClick={(event) => open(card, event)}
                    >
                      {crop ? (
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
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-[3.5%] h-[24%] w-[11%] translate-x-full rounded-r-[10px]"
                      style={{ backgroundColor: tabColor }}
                    />
                    {/* Mounted only for the card in front, so the hover art of
                      three unreachable cards never gets downloaded. */}
                    {isFront &&
                      (hover ? (
                        <ProjectHoverComposition {...hover} open={isOpen} />
                      ) : (
                        <ProjectMockup screens={mockup} open={isOpen} />
                      ))}
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
    </section>
  );
}
