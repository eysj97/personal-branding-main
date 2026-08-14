import { useEffect, useRef } from "react";
import { holdInside } from "../../lib/scrollHold";
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

// How near the far end of the strip counts as having reached it. A scroll
// container's own maths rarely lands on the exact number — fractional device
// pixels, a rounded track width — so requiring the last pixel is requiring
// something that may never arrive.
const STRIP_END_SLACK = 8;

export default function MobileLearn() {
  // Back-to-front, so the last entry paints on top — which is also the leftmost
  // one, since the offsets count down. Nothing needs a z-index: within one
  // stacking context the later element wins, so the running order *is* the
  // depth, exactly as on the desktop.
  const last = LEARN_CARDS.length - 1;
  const sectionRef = useRef(null);
  const stripRef = useRef(null);
  // Whether the strip has been taken to its far end at least once.
  const seenAll = useRef(false);

  // The page does not go past LEARN until all six files have been seen.
  //
  // The desktop cannot have this problem: its deck is driven by the page's own
  // scroll, so getting past the section *is* dealing the deck. Here the two are
  // different gestures — the page scrolls down, the strip swipes sideways — and
  // nothing makes the second one happen. Scroll straight through and five of
  // the six files were never on screen.
  //
  // So the section holds the page until the strip has been run to its end, and
  // then lets go for good. Same mechanism as the hero's intro (see scrollHold),
  // and the same one-way release: being made to look at the work once is the
  // point, being made to swipe through it again on the way back is a trap.
  useEffect(() => {
    const strip = stripRef.current;
    const check = () => {
      if (strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - STRIP_END_SLACK) {
        seenAll.current = true;
      }
    };
    // Run once up front: on a wide enough window the strip does not overflow at
    // all, so there is nothing to swipe and nothing to wait for.
    check();
    strip.addEventListener("scroll", check, { passive: true });
    const release = holdInside(sectionRef.current, () => seenAll.current);
    return () => {
      strip.removeEventListener("scroll", check);
      release();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-mobile-learn flex min-h-[100svh] flex-col bg-[#336bec]"
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
        <div className="flex flex-col items-center gap-[18px] text-white">
          <p
            className="font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-1.2px]"
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
