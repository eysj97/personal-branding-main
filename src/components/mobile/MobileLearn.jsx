import { useRef } from "react";
import {
  LEARN_CARDS,
  LEARN_CARD_ASPECT,
  LEARN_TAB_ASPECT,
  LEARN_TAB_FRAC,
  learnHref,
  learnTab,
} from "../../data/learn";
import { HEADER_H, vw } from "./MobileHeader";

// The LEARN section, on a phone. Figma 350:3318, drawn at 430 x 932.
//
// The desktop version is a scroll-driven deal: the deck sits off to the right
// of the heading and the whole stack slides left as you scroll, until the last
// file has left the screen. That works because there is a screen and a half of
// width to travel across. Here there is not, so the same six files are laid out
// as a strip that runs off both edges and is swiped through instead — the
// travel is the reader's finger rather than the page's scroll position.
//
// Which also fixes the thing the desktop version cannot do on a phone: these
// are links, and a deck that deals itself past you gives you a moving target.
// A strip holds still and waits.
//
// Same deck, same order, same artwork — see data/learn. Only the dealing is
// different, and only because the screen is.
// The strip's own geometry, in the design's 430-wide px.
const CARD_W = 236.985;
// How far apart the cards sit. The card is wider than this, which is the whole
// arrangement: each one shows this much of itself and the rest is covered by
// the card in front of it.
const PITCH = 146;
// Where the front card's left edge sits, and the matching air after the last
// one so the far end of the strip is not flush against the screen.
const STRIP_INSET = 42;
const TRACK_W =
  STRIP_INSET * 2 + PITCH * (LEARN_CARDS.length - 1) + CARD_W * (1 + LEARN_TAB_FRAC);

export default function MobileLearn() {
  // Back-to-front, so the last entry paints on top — which is also the leftmost
  // one, since the offsets count down. Nothing needs a z-index: within one
  // stacking context the later element wins, so the running order *is* the
  // depth, exactly as on the desktop.
  const last = LEARN_CARDS.length - 1;
  const stripRef = useRef(null);

  // This section used to hold the page: it would not scroll past LEARN until
  // the strip had been run to its far end, on the reasoning that the page moves
  // down and the strip moves sideways, so nothing otherwise makes the second
  // gesture happen and five of the six files are never seen.
  //
  // That reasoning is sound and the trade is still not worth it. A section that
  // refuses to scroll reads as a stuck page long before it reads as an
  // invitation — there is nothing on screen saying what it wants, and the one
  // gesture that would satisfy it is the one the reader has not thought to try.
  // Being made to look at the work is worth less than being able to leave.
  //
  // EXPERIENCE dropped the same hold for the same reason. See scrollHold, which
  // the hero still uses — that one is a few hundred ms at the top of the page
  // rather than a gate in the middle of it.

  return (
    <section
      data-ground="light"
      className="section-mobile-learn flex min-h-[100svh] flex-col bg-white"
    >
      {/* Clear of the fixed header — see MobileHeader. */}
      <div className="shrink-0" style={{ height: HEADER_H }} />

      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: vw(66), paddingBottom: vw(40) }}
      >
        {/* A real scroll container rather than a drag handler. The project deck
            next door is a hand of three that gets dealt, and dealing is worth
            writing; this is a row of six links, and a row of links wants the
            scrolling the platform already has — momentum, rubber-banding, a
            two-finger trackpad, a keyboard. The bar it would show is hidden
            site-wide (see index.css).
            It also contains the overflow: the strip is two and a half screens
            wide, and without a scroll container that width would be the page's. */}
        <div
          ref={stripRef}
          className="w-full overflow-x-auto overscroll-x-contain"
          style={{ height: vw(CARD_W * LEARN_CARD_ASPECT) }}
        >
          <div className="relative h-full" style={{ width: vw(TRACK_W) }}>
            {LEARN_CARDS.map(({ image, slug, label }, i) => {
              // An anchor only when there is somewhere to go — otherwise the
              // card stays a plain div, with nothing promising a tap that does
              // nothing.
              const Card = slug ? "a" : "div";
              const linkProps = slug
                ? {
                    href: learnHref(slug),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    "aria-label": label ? `${label} — 새 탭에서 열기` : undefined,
                  }
                : {};

              return (
                <Card
                  key={slug ?? i}
                  {...linkProps}
                  className="absolute top-0 block h-full"
                  style={{
                    left: vw(STRIP_INSET + (last - i) * PITCH),
                    width: vw(CARD_W),
                  }}
                >
                  {/* No radius. The captures are drawn in perspective, so the
                      left edge is the short one and its corners sit inset from
                      the card — a radius only ever cut the right-hand pair,
                      which reads as lopsided rather than as rounding. */}
                  <img
                    src={image}
                    alt={label ?? ""}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* The tab hangs off this card's right edge, over the card
                      behind it — so what you see between two cards is the tab
                      of the one in front.

                      The 1px is an overlap, not a nudge: a percentage width of
                      a vw-sized card lands on a fractional pixel, so a flush
                      100% leaves a hairline of background between the tab and
                      the card. The artwork is opaque to its right edge along
                      the tab's whole height, so nothing of the card is lost. */}
                  <img
                    src={learnTab}
                    alt=""
                    className="absolute right-0 top-[5%] max-w-none"
                    style={{
                      width: `${LEARN_TAB_FRAC * 100}%`,
                      aspectRatio: LEARN_TAB_ASPECT,
                      transform: "translateX(calc(100% - 1px))",
                    }}
                  />
                </Card>
              );
            })}
          </div>
        </div>

        {/* Same pair as PROJECT — the name of the section and the one line that
            says what it is — at the same sizes, so the two read as the same
            page. The design sets this one in mixed case. */}
        {/* Black, because this section is on a white ground now. <body> is
            `text-white`, which is right on the page's blue sections and
            invisible here, so this states its own colour rather than
            inheriting one that would leave it off the page. */}
        <div className="flex flex-col items-center gap-[18px] text-black">
          <p
            // The page's blue, which is what a section's name is set in
            // wherever the ground is white — LEARN, SKILLS and the desktop's
            // PROJECT all do it, and the phone's CAREER design draws "Every
            // Role" the same way. Only the line under it is black.
            className="font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-1.2px] text-[#336bec]"
            style={{ fontSize: vw(60) }}
          >
            Learn
          </p>
          <p className="px-[10px] text-center font-['Pretendard'] text-[16px] leading-[1.2] tracking-[-0.32px]">
            새로운 인터랙션과 웹 기술을 직접 구현하며
            <br />
            실험하고 학습한 결과물입니다
          </p>
        </div>
      </div>
    </section>
  );
}
