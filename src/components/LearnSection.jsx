import { useEffect, useRef } from "react";
// The deck itself — the six files, their artwork and where each one opens —
// lives in data/learn, because the phone deals the same six a different way
// (see mobile/MobileLearn). Everything below is this layout's business: the
// scroll-driven travel and the sizes it travels at.
import {
  LEARN_CARDS as CARDS,
  LEARN_CARD_ASPECT as CARD_ASPECT,
  LEARN_TAB_ASPECT,
  LEARN_TAB_FRAC as TAB_FRAC,
  learnHref,
  learnTab as tab,
} from "../data/learn";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (from, to, x) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};

// CARDS is back-to-front: the last one in the list paints on top and sits at
// the front (leftmost) of the stack. See data/learn for why it is written that
// way round and for what each entry means.

// 0.8x what it was (29vw -> 23.2vw). Smaller cards also mean the fanned-out
// row takes up less of the screen, which is what stops the far ones running off
// the edges.
const CARD_WIDTH = "clamp(176px,23.2vw,443px)";
// Gap between each stacked card, as a fraction of the card width. One number,
// held for the whole run: the deck keeps the spacing it starts with and simply
// travels.
//
// It used to open from this to 1.13 over the run, which is what made the row
// spread out as it moved — by the end the cards were more than a card width
// apart, with the section's background showing through every gap and only two
// of them left on screen with dead space between. The packed spacing is the
// one worth keeping; the cards read as a deck being dealt past you rather than
// as a row being pulled apart.
const GAP_FRAC = 60 / 120;
// How far the whole stack travels left over the run.
//
// Not a fixed number of card widths any more. The run ends with the deck gone
// — every file out past the left edge, nothing left in frame — and where "gone"
// is depends on the viewport: the stage starts at 34.74% of the width, the
// rearmost card sits five gaps behind the front one, and its tab hangs off the
// right edge. So the distance is measured from the stage's own box each frame
// rather than guessed at in card widths, which also keeps it right at the two
// ends of the card's clamp(), where the card stops growing with the viewport
// and any fixed ratio would come up short.
//
// (It used to be -2.9 card widths, chosen to leave the rearmost card sitting in
// frame on the left. That is the part being changed: the section now hands over
// to SKILLS on an empty stage.)
const EXIT_MARGIN_PX = 24; // a little clear air past the edge
// "LEARN" holds in place for a beat before it starts exiting left, instead
// of moving the instant you scroll — then fully gone before the cards start.
const TEXT_HOLD_UNTIL = 0.08;
const TEXT_EXIT_DONE_AT = 0.3;
const TEXT_EXIT_VW = -120;
// Cards only start moving once the text has cleared out.
const CARDS_START_AT = 0.3;
// Cards keep their size and their spacing the whole way. The travel is the
// only thing that moves — the deck slides, it does not open out.
//
// There is no cap on the travel any more. It used to stop at 0.85 of the run
// and hold, which left the deck parked with one file still on screen for the
// last stretch of the section and then again through the whole handover to
// SKILLS. Running to the end instead means the last file leaves on the frame
// the section unpins, so SKILLS is what comes next with nothing in between.

export default function LearnSection() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const textRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const text = textRef.current;
    let ticking = false;

    function render() {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

      // "LEARN" holds still, then exits left, on its own timeline.
      const textT = smoothstep(TEXT_HOLD_UNTIL, TEXT_EXIT_DONE_AT, raw);
      text.style.transform = `translateX(${textT * TEXT_EXIT_VW}vw)`;

      // Cards only start once the text is out of the way, then immediately
      // move, fan out, and grow all together — no separate waiting beat.
      // Plain linear ramp (not smoothstep's eased S-curve) so the motion
      // reads as one steady, gradual pace.
      const t = clamp01((raw - CARDS_START_AT) / (1 - CARDS_START_AT));
      const cardWidthPx = cardRefs.current[0]?.offsetWidth || 0;
      const gapPx = cardWidthPx * GAP_FRAC;

      // The last card in the array paints on top (normal DOM stacking), so
      // it sits at the front of the stack. Earlier cards, underneath it,
      // get pushed further back as the gap widens. The whole stack also
      // slides left together (shiftPx) as it goes.
      const lastIndex = cardRefs.current.length - 1;

      // The rearmost card is `lastIndex` gaps behind the front one and its tab
      // hangs a further TAB_FRAC of a card past its own right edge — so the
      // deck is clear of the screen once the stage's left edge has been pulled
      // back by all of that. Measured, not assumed: the stage's own box already
      // carries the 34.74% offset and whatever the card's clamp() settled on.
      const stageLeft = stage.getBoundingClientRect().left;
      const exitPx = -(
        stageLeft +
        lastIndex * gapPx +
        cardWidthPx * (1 + TAB_FRAC) +
        EXIT_MARGIN_PX
      );
      const shiftPx = exitPx * t;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translateX(${shiftPx + (lastIndex - i) * gapPx}px)`;
      });

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

  return (
    <section
      ref={sectionRef}
      /* 210vh while the deck only had 2.9 card widths to cover. Clearing the
         screen is closer to 5, so the same height would have made the exit
         half again as fast as the rest of the run — the extra 30vh buys the
         distance back at roughly the pace it had before. */
      className="section-learn relative h-[240vh] bg-white"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div
          ref={textRef}
          className="absolute top-1/2 -translate-y-1/2 left-5 flex flex-col gap-[24px]"
        >
          <p className="font-['Plus_Jakarta_Sans'] font-semibold leading-none text-[#336bec] whitespace-nowrap text-[clamp(40px,6.25vw,120px)] tracking-[clamp(-4px,-0.6vw,-12px)]">
            LEARN
          </p>
          <p className="font-['Pretendard'] text-black text-[clamp(11px,0.833vw,16px)] tracking-[-0.05em] leading-[1.2]">
            이 결과물들이 나오기까지,
            <br />
            계속 배우고 만들어봤습니다
          </p>
        </div>

        {/* Positioned at the same left offset ratio as Figma (690/1986 of
            the frame width) so the gap to the title matches the design. */}
        <div
          ref={stageRef}
          className="absolute top-0 h-full left-[34.74%] right-0"
        >
          {CARDS.map(({ image, slug, label }, i) => {
            // An anchor only when there is somewhere to go — otherwise the card
            // stays the plain div it has always been, with no pointer cursor
            // promising a click that does nothing.
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
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                {...linkProps}
                className={`group absolute top-1/2 -translate-y-1/2 left-0 will-change-transform ${slug ? "cursor-pointer" : ""}`}
                style={{ width: CARD_WIDTH, aspectRatio: `1 / ${CARD_ASPECT}` }}
              >
                {/* Drawn out of the row on hover, a third of the card's width
                    to the right — the direction the stack files backwards in,
                    so the card slides out from under the ones overlapping it.
                    No scale, no turn, and no z-index: it stays in its place in
                    the row and simply protrudes, the way pulling one file out
                    of a drawer looks.

                    It has to be an inner wrapper. The scroll loop writes the
                    outer element's transform every frame, so a hover transform
                    on that same element would be wiped on the next scroll. */}
                <div className="relative h-full w-full transition-transform duration-300 ease-out group-hover:translate-x-1/3">
                  {/* No radius. The captures are drawn in perspective, so the
                      left edge is the short one and its corners sit inset from
                      the card — a radius only ever cut the right-hand pair,
                      which read as lopsided rather than as rounding. */}
                  <img
                    src={image}
                    alt={label ?? ""}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* The tab hangs off the card's right edge; what you see to
                      the left of a card is the tab of the one behind it.

                      Width stays the 7.2% of the card it always was — that is
                      how far it protrudes, and it is what reads against the
                      fanned row. The height then follows from the artwork's own
                      41 x 122.372 rather than being set separately, so the
                      slanted top edge keeps its designed angle at every card
                      size.

                      The 1px is an overlap, not a nudge. A percentage width of
                      a clamp()ed card lands on a fractional pixel, so a flush
                      100% left the tab's left edge and the card's right edge on
                      different device pixels and a hairline of background
                      showed between them. Tucking it under by a whole pixel
                      covers that at any card size; the artwork is opaque to its
                      right edge along the tab's whole height, so nothing of the
                      card is lost. */}
                  <img
                    src={tab}
                    alt=""
                    className="absolute right-0 top-[5%] max-w-none"
                    style={{
                      width: `${TAB_FRAC * 100}%`,
                      aspectRatio: LEARN_TAB_ASPECT,
                      transform: "translateX(calc(100% - 1px))",
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
