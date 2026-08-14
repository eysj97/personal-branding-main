import { useRef, useState } from "react";
import logoLayer from "../../assets/mobile/logo-layer.svg";
import logoReviu from "../../assets/mobile/logo-reviu.svg";
import AquaplanetSpread from "../detail/AquaplanetSpread";
import LayerSpread from "../detail/LayerSpread";
import ReviuSpread from "../detail/ReviuSpread";
import MobileCaseStudy from "./MobileCaseStudy";
import { HEADER_H, vw } from "./MobileHeader";

// The project section, on a phone. Figma 349:3201, drawn at 430 x 932.
//
// The desktop version is a WebGL drum: six folders on a ring, turned by the
// scroll, with artwork flying out of whichever one you hover. None of that
// survives here — there is no hover on a phone, and a perspective ring needs
// width the screen does not have. The design replaces it with the same objects
// in the same colours, fanned out as a hand of cards, and this makes that hand
// dealable: swipe and the front card goes under, the next comes up.
//
// The cards are drawn rather than imported. On the desktop each folder face is
// an exported image with its old colour baked in; these carry the case study
// palette (#018cfc / #f26a30 / #ffd527), so an image would have to be
// re-exported every time a colour moved. Text and a rounded rectangle cost
// nothing and stay in step with the rest of the site.
// The fan's own box, off the design (349:3201). The cards are allowed to hang
// past it — the front one's bottom corner does, once it is turned — so this is
// the box the *layout* is measured against rather than the ink's bounding box:
// it is what puts the PROJECT title 66 below the hand.
const FAN = { w: 388.33, h: 375.808 };
// A card, as fractions of that box — so the whole hand scales as one. Every
// card is this size; what differs between them is only where they sit and how
// far they are turned.
const CARD_W = 198.437;
const CARD_H = 301.995;
const CARD = { w: CARD_W / FAN.w, h: CARD_H / FAN.h };

// The three places a card can be, front first. Centres as fractions of the fan
// box, and a turn in degrees.
//
// Positions, not cards: a card is wherever its turn in the order puts it, which
// is what lets the hand be dealt without any of them knowing where they started.
//
// The design gives each card as a rotated bounding box rather than as a centre
// and an angle, so both are recovered from it: a w0 x h0 card turned by θ has a
// box of (w0·cosθ + h0·sinθ) by (w0·sinθ + h0·cosθ), which solves for θ, and the
// centre is then the box's own middle. Worth writing down because the numbers
// below look arbitrary and are not — re-measure them the same way if the design
// moves again.
//
// This hand is a good deal tighter than the one before it: the front card turns
// 10.7deg where it used to turn 20.9, the back one 5.4 where it used to turn
// 14.9, and the whole fan sits 25px shorter. It reads as a hand held together
// rather than three cards thrown down.
const SLOTS = [
  { x: 146.451 / FAN.w, y: 245.942 / FAN.h, rotate: -10.74 },
  { x: 176.727 / FAN.w, y: 169.416 / FAN.h, rotate: 0 },
  { x: 260.431 / FAN.w, y: 159.649 / FAN.h, rotate: 5.39 },
];

// Where the same three slots are before the hand is fanned out (Figma
// 352:3543). Square to the page and almost on top of one another, stepping ten
// across and ten down — a stack of folders on a desk, not a hand of cards.
//
// The section opens on this and spreads to SLOTS above, which is the whole
// point of having both: a fan that is simply there when you scroll to it is a
// picture, and a fan you watch open is the deck being picked up. Slot order is
// the same in both, so a card keeps its place in the hand across the move and
// nothing has to be re-sorted.
//
// Measured off the design's card boxes and converted to centres, so they are
// directly comparable with SLOTS: the design gives top-left corners of a
// 198.437 x 302 card at (74.61, 20), (82.87, 8.71) and (92.72, 0), front first.
// Read straight off the design, with nothing added. Both states put the top of
// the deck in the same place — the stack's rearmost card starts at y 0 and so
// does the fan's — so the hand opens without the deck also climbing the page.
//
// This did briefly carry a downward nudge, on the theory that the two states'
// boxes were different heights and wanted centring against each other. They do
// not: what that actually did was start the deck 27px low and have it rise as
// it opened, which against a title that does not move reads as the title
// sliding up. The design's own numbers already agree at the top edge, which is
// the edge that matters — it is the one the eye is holding on to.
const STACK = [
  { x: 173.83 / FAN.w, y: 171.0 / FAN.h, rotate: 0 },
  { x: 182.09 / FAN.w, y: 159.71 / FAN.h, rotate: 0 },
  { x: 191.94 / FAN.w, y: 151.0 / FAN.h, rotate: 0 },
];

// How far apart the three cards are dealt out of the stack. The back of the
// hand goes first — it has the furthest to travel — so the fan opens outwards
// rather than the front card jumping off a pile that is still square.
const SPREAD_STAGGER_MS = 90;

const CARDS = [
  {
    id: "reviu",
    fill: "#ffd527",
    ink: "#000000",
    label: "개인 프로젝트",
    logo: { src: logoReviu, width: 100, height: 29.988, alt: "reviu" },
    lines: ["일정 | 3월26일 ~ 6월 1일", "제작 | 윤수정"],
    detail: ReviuSpread,
    pageColor: "#ffd527",
  },
  {
    id: "layer",
    fill: "#f26a30",
    ink: "#000000",
    label: "향수 팬덤앱 팀 프로젝트",
    logo: { src: logoLayer, width: 126, height: 51.991, alt: "Layer" },
    lines: ["일정 | 7월3일 ~ 8월 7일", "조원 | 윤수정 외 5인"],
    detail: LayerSpread,
    pageColor: "#f26a30",
  },
  {
    id: "aqua",
    fill: "#018cfc",
    ink: "#ffffff",
    // The only wordmark that is type rather than a drawing, which is how the
    // design has it — Poppins Medium, loaded in index.html for these cards.
    wordmark: "aqua planet",
    label: "사이트 리뉴얼 팀 프로젝트",
    lines: ["일정 | 6월4일 ~ 7월 3일", "조원 | 윤수정 외 5인"],
    detail: AquaplanetSpread,
    pageColor: "#018cfc",
  },
];

// How far a finger has to travel before it counts as a deal rather than a tap
// or a stray drag while scrolling the page.
const SWIPE_PX = 40;

function Card({ card, slot, z, drag, spread, onSelect }) {
  const { x, y, rotate } = (spread ? SLOTS : STACK)[slot];
  const front = slot === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      // The front card is the one being read; the two behind it are what you
      // tap to read instead. Saying which is which out loud costs nothing and
      // is the difference between three unlabelled shapes and a deck.
      aria-label={`${card.label} 케이스 스터디 열기`}
      aria-current={front ? "true" : undefined}
      className="absolute block select-none text-left outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        width: `${CARD.w * 100}%`,
        height: `${CARD.h * 100}%`,
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        zIndex: z,
        transform: `translate(calc(-50% + ${drag}px), -50%) rotate(${rotate}deg)`,
        // Nothing while a finger is down — the card should sit under it rather
        // than chase it — and an ease out for the deal once it lifts.
        transition: drag ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
        // Only the opening spread is staggered. A deal is one card moving and
        // two shuffling under it, and delaying those reads as lag rather than
        // as sequence — so the stagger is spent the moment the hand is open.
        transitionDelay: spread ? "0ms" : `${(2 - slot) * SPREAD_STAGGER_MS}ms`,
      }}
    >
      {/* The folder's tab, poking out of the right edge.
          Same fill as the body and drawn *under* it, running a long way back
          inside the card rather than meeting its edge. Two same-coloured boxes
          set flush do not read as one shape: the body's 15px corner radius
          curves away from the tab at the top of the join, so the background
          shows through the notch, and along the rest of the seam two
          antialiased edges composite into a hairline that is plainly visible
          once the card is rotated out into the fan. Both are edges that should
          not exist — the tab and the folder are one piece of card.
          Sliding the tab's left edge back to 80% buries the whole join under an
          opaque body of exactly the same colour. Nothing is left to see but the
          tab's own outline, and the corner it would have notched is filled in
          by the tab itself, which is how a real folder tab looks. Its right
          edge is unchanged, so the silhouette is still the design's. */}
      <div
        className="absolute rounded-r-[10px]"
        style={{
          left: "80%",
          top: "3.41%",
          width: "31.36%",
          height: "24.52%",
          backgroundColor: card.fill,
        }}
      />

      <div
        className="relative flex h-full flex-col justify-between rounded-[15px] p-[20px]"
        style={{ backgroundColor: card.fill, color: card.ink }}
      >
        <div
          className="flex items-center justify-between whitespace-nowrap border-b font-['Poppins'] text-[8px] font-medium leading-[1.4] tracking-[-0.16px]"
          style={{ borderColor: card.ink }}
        >
          <span>2026</span>
          <span>{card.label}</span>
        </div>

        <div className="flex flex-col gap-[12px]">
          {card.logo ? (
            <img
              src={card.logo.src}
              alt={card.logo.alt}
              style={{ width: card.logo.width, height: card.logo.height }}
            />
          ) : (
            <p className="font-['Poppins'] text-[20px] font-medium leading-none tracking-[-0.4px]">
              {card.wordmark}
            </p>
          )}
          <div className="p-[10px] font-['Pretendard'] text-[10px] font-medium leading-[1.4] tracking-[-0.2px]">
            {card.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function MobileProject() {
  // Which card is in which slot. `order[n]` is the card index sitting in slot n,
  // so dealing is a rotation of this array and nothing else moves.
  const [order, setOrder] = useState([2, 1, 0]);
  const [drag, setDrag] = useState(0);
  const [spread, setSpread] = useState(false);
  // The card whose case study is open over the page, if any.
  const [openCard, setOpenCard] = useState(null);
  const startX = useRef(null);
  // Whether the finger that is currently down has travelled far enough to be a
  // swipe. A tap and a swipe both end in a click, so without this every deal
  // would also be read as a tap on whichever card the finger came off.
  const swiped = useRef(false);

  const deal = (backwards) =>
    setOrder((o) => (backwards ? [o[1], o[2], o[0]] : [o[2], o[0], o[1]]));


  // The hand opens because you reached for it, not because you scrolled past
  // it. Scrolling into view used to do it, and that is the wrong verb: the deck
  // deals itself before anyone has touched it, so the one moment worth watching
  // is spent while the reader is still travelling. Held shut until a pointer
  // arrives, the fan is an answer to something they did.
  //
  // Three ways in, because "reaching for it" is three different events: a mouse
  // hovers, a finger presses, a keyboard focuses.
  const open = () => setSpread(true);

  function onPointerEnter(e) {
    // Touch reports `pointerenter` on the way down too, which would open the
    // hand on the same event that starts a swipe — harmless, but the press
    // handler below already covers it and this keeps the two apart.
    if (e.pointerType === "mouse") open();
  }

  function onPointerLeave(e) {
    // Only a mouse closes it again. A finger's `pointerleave` fires the moment
    // it lifts, which would shut the hand on every tap and swipe — the exact
    // opposite of what tapping a card is for.
    if (e.pointerType === "mouse") setSpread(false);
  }

  function onPointerDown(e) {
    open();
    startX.current = e.clientX;
    swiped.current = false;
  }

  function onPointerMove(e) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > SWIPE_PX) swiped.current = true;
    setDrag(dx);
  }

  function onPointerUp() {
    if (startX.current === null) return;
    if (Math.abs(drag) > SWIPE_PX) deal(drag > 0);
    startX.current = null;
    setDrag(0);
  }

  return (
    // `overflow-x-clip`, and it is load-bearing rather than tidiness. The fan is
    // drawn to the design's own numbers, and the design lets the rearmost card
    // and its tab run off the right edge of the 430 frame — so the section is
    // 484px wide on a 430px screen. Body's `overflow-x-hidden` does not contain
    // that: the document still measures 487 wide, and a mobile viewport that
    // wide slides the whole fixed header across until the menu button is off
    // the side of the screen. Clipping it here is what puts the hamburger back.
    //
    // `clip` and not `hidden`: hidden makes this a scroll container, and a
    // scroll container between the page and a sticky element is what stops the
    // sticky working. Nothing here is sticky today; the hero next door is, and
    // this is the kind of thing that is fixed once and broken again later.
    <section className="section-mobile-project flex min-h-[100svh] flex-col overflow-x-clip bg-[#336bec]">
      {/* Clear of the fixed header — see MobileHeader. */}
      <div className="shrink-0" style={{ height: HEADER_H }} />

      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: vw(66), paddingBottom: vw(40) }}
      >
        {/* Arrow-key driven as well as swipeable: a deck you can only reach
            with a finger is one a keyboard cannot see at all. Each card is also
            a button in its own right, so tabbing through them and pressing one
            brings it forward — the keyboard equivalent of tapping it. */}
        <div
          role="group"
          aria-label="프로젝트 카드 — 좌우로 끌어 넘기고, 카드를 눌러 케이스 스터디를 여세요"
          tabIndex={0}
          onFocus={open}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") deal(false);
            if (e.key === "ArrowLeft") deal(true);
          }}
          // z-10 so the hand is always over the PROJECT title below it, not
          // merely usually. The cards carry z-indexes of their own to stack
          // against each other, which already put them above a static heading —
          // but that is an accident of the painting rules rather than a stated
          // intention, and it stops being true the moment anything in the chain
          // above gains a stacking context. The front card is turned and hangs
          // past the bottom of its own box; where it reaches the title, the card
          // is the thing in front.
          className="relative z-10 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[#ffd527]"
          style={{ width: vw(FAN.w), aspectRatio: `${FAN.w} / ${FAN.h}` }}
        >
          {CARDS.map((card, i) => {
            const slot = order.indexOf(i);
            return (
              <Card
                key={card.id}
                card={card}
                slot={slot}
                spread={spread}
                // Front card highest. Set as the deal starts rather than after,
                // so the outgoing card slides *under* the hand instead of
                // sitting on top of it until it arrives.
                z={SLOTS.length - slot}
                drag={slot === 0 ? drag : 0}
                // A swipe ends in a click too, and that click lands on
                // whichever card the finger came off — which would deal the
                // hand and then open the case study of whatever happened to
                // land under the finger. The two gestures are separate: drag
                // moves the hand, a tap opens what you tapped.
                onSelect={() => {
                  if (swiped.current) return;
                  setOpenCard(card);
                }}
              />
            );
          })}
        </div>

        {/* Behind the hand, explicitly.
            The front card is turned and hangs past the bottom of its own box,
            so where it reaches this the card is what should be seen — the title
            belongs under the files, not printed over them. Stated on the title
            rather than left to the painting rules: a static block happens to
            paint below a positioned one today, and that stops being true the
            moment anything in the chain above gains a stacking context. */}
        <div className="relative z-0 flex flex-col items-center gap-[18px] text-white">
          <p
            className="font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-1.2px]"
            style={{ fontSize: vw(60) }}
          >
            PROJECT
          </p>
          <p className="px-[10px] text-center font-['Pretendard'] text-[16px] leading-[1.2] tracking-[-0.32px]">
            발견한 문제를 어떻게 해결했는지 담았습니다.
          </p>
        </div>
      </div>

      {/* The case study, over the whole page — the phone's own layout of it
          (Figma 355:153), not the desktop's folder-opening overlay. That one
          animates out of the card's place on the WebGL drum and is built around
          geometry this deck does not have. */}
      {openCard && (
        <MobileCaseStudy card={openCard} onClose={() => setOpenCard(null)} />
      )}
    </section>
  );
}
