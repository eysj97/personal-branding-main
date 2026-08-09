import { useEffect, useRef } from "react";
// Used exactly as supplied. These are browser mockups drawn in perspective —
// each one is a trapezoid, not a tilted rectangle: on card-6 the left edge is
// 1555px against 1781px on the right. That is the artwork, and no rotation or
// scale turns a trapezoid into a rectangle, so nothing here tries. The card
// simply shows the file, and the transparent corners around the mockup are part
// of how it is drawn.
import card1 from "../assets/learn/card-1.avif";
import card2 from "../assets/learn/card-2.avif";
import card3 from "../assets/learn/card-3.avif";
import card4 from "../assets/learn/card-4.avif";
import card5 from "../assets/learn/card-5.avif";
import card6 from "../assets/learn/card-6.avif";
// The tab that hangs off each card's right edge, exported from Figma
// (node 283:206). Not a plain rounded rectangle: its top edge slants up
// slightly to the right, matching the perspective the mockups are drawn in.
import tab from "../assets/learn/tab.svg";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (from, to, x) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};

// Back-to-front stacking order — the last one in this list paints on top
// and sits at the front (leftmost) of the stack.
//
// `href` is where the card opens, in a new tab. Two ways to fill it in:
//
//   1. Already hosted somewhere — use the full URL.
//   2. A local build — drop the self-contained folder into
//      public/learn/<slug>/ and point at '/learn/<slug>/index.html'.
//      Vite copies public/ into dist/ *untouched*, so the piece's own CSS and
//      JS keep working as-is. Two things follow from "untouched": it must not
//      live under src/ (the bundler would rewrite it), and Vite will not fix
//      up paths inside it — so keep its assets in the same folder and
//      reference them relatively ('./app.js') or from the root
//      ('/learn/<slug>/app.js').
//
// `slug: null` leaves a card as a plain div: visible, not clickable. That is
// what an unfinished one should be, rather than a link that goes nowhere.
//
// The slugs are the folder names exactly as they sit on disk. They still carry
// their original numbering, which runs opposite to the card order and is why
// the two columns below disagree — renaming them is pending (see the note in
// the commit/notes), and when it happens only these strings change.
const learnHref = (slug) => `/learn/${encodeURIComponent(slug)}/index.html`;

// Two things decide this list, and they pull in opposite directions:
//
//   - Each image is that site's own screenshot, so image and slug are a fixed
//     pair. card-1 is the chemical site, card-6 is Musign, and so on — the
//     numbering in the image filenames is unrelated to the running order.
//     Verified against each page's <title> and hero copy.
//   - The array is back-to-front (see above), so it reads bottom-up: the LAST
//     entry is the card the viewer meets first.
//
// So this list is the intended running order — 뮤자인, 대방산업, 크루어라모드,
// 와이스튜디오, 한화케미컬, 한국소비자원 — written in reverse. The slug numbers
// run with that order, which is why they count down here.
//
// Labels are each site's own <title>, which is not always the folder name.
const CARDS = [
  { image: card2, slug: "6-kca", label: "한국소비자원 매거진" },
  { image: card1, slug: "5-hanwha-chemical", label: "한화케미컬" },
  { image: card3, slug: "4-y-studio", label: "와이스튜디오" },
  { image: card4, slug: "3-crew-alamode", label: "크루 어 라 모드" },
  { image: card5, slug: "2-daebang", label: "대방산업" },
  { image: card6, slug: "1-mujain", label: "뮤자인" },
];

// 0.8x what it was (29vw -> 23.2vw). Smaller cards also mean the fanned-out
// row takes up less of the screen, which is what stops the far ones running off
// the edges.
const CARD_WIDTH = "clamp(176px,23.2vw,443px)";
const CARD_ASPECT = 446.5 / 554;
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
// How far the whole stack travels left over the run, in card widths.
//
// Down from -6, and it had to come down: the deck is only 5 x GAP_FRAC = 2.5
// card widths from end to end now, where the fan used to stretch it to 5.65.
// At the old travel the whole thing cleared the screen well before the run
// finished and the section ended on nothing. This lands the rearmost card
// about where the fan used to leave it — in frame, on the left — so the run
// still ends with something to look at:
//
//     start (~1.5) + SHIFT + 5 x GAP_FRAC  ~=  1.1
const SHIFT_TOTAL = -2.9;
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
// How much of the run the motion uses before the cards settle and hold for the
// rest of the section. This was 0.28, which meant two thirds of the section's
// scroll was spent going nowhere — and since the travel has to fit inside it,
// that forced the movement to be fast to cover any distance at all. Using most
// of the run instead is what buys the same distance at a much lower speed.
const T_CAP = 0.85;
// A per-unit-of-t rate, derived from the total above so that changing how long
// the run is does not silently change where the deck ends up.
const SHIFT_END_FRAC = SHIFT_TOTAL / T_CAP;

export default function LearnSection() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const textRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
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
      const t = Math.min(
        clamp01((raw - CARDS_START_AT) / (1 - CARDS_START_AT)),
        T_CAP,
      );
      const cardWidthPx = cardRefs.current[0]?.offsetWidth || 0;
      const gapPx = cardWidthPx * GAP_FRAC;
      const shiftPx = cardWidthPx * SHIFT_END_FRAC * t;

      // The last card in the array paints on top (normal DOM stacking), so
      // it sits at the front of the stack. Earlier cards, underneath it,
      // get pushed further back as the gap widens. The whole stack also
      // slides left together (shiftPx) as it goes.
      const lastIndex = cardRefs.current.length - 1;
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
      className="section-learn relative h-[210vh] bg-[#06252e]"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div
          ref={textRef}
          className="absolute top-1/2 -translate-y-1/2 left-5 flex flex-col gap-[24px]"
        >
          <p className="font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap text-[clamp(40px,6.25vw,120px)] tracking-[clamp(-4px,-0.6vw,-12px)]">
            LEARN
          </p>
          <p className="font-['Pretendard'] text-white text-[clamp(11px,0.833vw,16px)] tracking-[-0.05em] leading-[1.2]">
            이 결과물들이 나오기까지,
            <br />
            계속 배우고 만들어봤습니다
          </p>
        </div>

        {/* Positioned at the same left offset ratio as Figma (690/1986 of
            the frame width) so the gap to the title matches the design. */}
        <div className="absolute top-0 h-full left-[34.74%] right-0">
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
                    className="absolute right-0 top-[5%] w-[7.2%] max-w-none"
                    style={{
                      aspectRatio: "41 / 122.372",
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
