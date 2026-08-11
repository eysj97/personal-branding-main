import { createContext, useContext } from "react";

// Every spread is authored at its native Figma size and scaled to fit the
// viewport as one unit by ProjectDetailOverlay, so every number a spread passes
// down here is a literal Figma pixel and must stay that way.

// The columns are bottom-aligned (`items-end`) exactly like the designs, so
// each one's natural height produces the staggered top edges by itself.
export const COLUMN = "flex flex-col shrink-0";

// Panel fill and text colour are the only things that differ between the
// spreads — Aquaplanet sits on a dark page, Reviu and Layer on bright ones.
const Palette = createContext({ panel: "rgba(255,255,255,0.1)", ink: "#ffffff" });

export function SpreadPalette({ panel, ink, children }) {
  return <Palette.Provider value={{ panel, ink }}>{children}</Palette.Provider>;
}

/**
 * A content block: panel, image well on top, then heading and body.
 *
 * `minHeight` is for the handful of blocks the design draws taller than their
 * own content (Figma gives them a fixed height and centres what is inside).
 * It is a *minimum* rather than the design's literal height because the browser
 * wraps Korean text at slightly different points than Figma does — a hard
 * height would clip the block the first time a line ran long.
 */
export function Block({ gap = 12, minHeight, children }) {
  const { panel } = useContext(Palette);
  return (
    <div
      className="flex flex-col rounded-[8px] p-[16px]"
      style={{
        gap,
        backgroundColor: panel,
        minHeight,
        justifyContent: minHeight ? "center" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * An image well. Each `source` carries the exact framing from Figma — often a
 * hand-set pan/zoom rather than a generic fit — so its `style` is applied
 * verbatim instead of being second-guessed here.
 */
export function Shot({ height, border, sources }) {
  return (
    <div
      className="relative w-full shrink-0 overflow-hidden rounded-[8px]"
      style={{ height, border: border ? `1px solid ${border}` : undefined }}
    >
      {sources.map(({ src, style }) => (
        <img key={src} src={src} alt="" className="absolute max-w-none" style={style} />
      ))}
    </div>
  );
}

export function Heading({ size, children }) {
  const { ink } = useContext(Palette);
  return (
    <p
      className="w-full font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2]"
      style={{ fontSize: size, letterSpacing: size * -0.02, color: ink }}
    >
      {children}
    </p>
  );
}

export function Body({ size, tracking, children }) {
  const { ink } = useContext(Palette);
  return (
    <div
      className="flex w-full flex-col gap-[0.4em] font-['Pretendard'] leading-[1.2]"
      style={{ fontSize: size, letterSpacing: tracking, color: ink }}
    >
      {children.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

/**
 * "직접 살펴보기 →" at the foot of a case study's header.
 *
 * Takes no colour of its own: every header it sits in is white type, and
 * inheriting means it cannot drift from the three lines above it.
 *
 * With no `href` it still draws, and draws identically — the line belongs to the
 * design whether or not there is anywhere to send someone yet. It is plain text
 * in that state rather than an anchor, so it is not clickable and does not turn
 * up in a screen reader's list of links: nothing pretends to work.
 *
 * Fill in links.js and each one becomes real. Do that before this ships — on
 * screen the two states are indistinguishable, which is the point while the
 * addresses are being decided and the problem once it is public.
 */
const VISIT_TEXT = "font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-0.44px]";
// Underlined, which is the only thing on these pages that says "this is a
// link". The header sits on the page rather than in a panel and has no other
// affordance — no colour of its own, no button, no hover on a phone at all —
// so without the rule it is a line of type that happens to end in an arrow.
// The offset keeps the rule clear of the Hangul descenders.
const VISIT_RULE = "underline decoration-1 underline-offset-4";

export function VisitLink({ href, label = "직접 살펴보기" }) {
  if (!href) {
    return (
      <span className={`${VISIT_TEXT} inline-flex items-center gap-[2px]`}>
        {label}
        <span aria-hidden="true">→</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${VISIT_TEXT} ${VISIT_RULE} inline-flex items-center gap-[2px] transition-opacity hover:opacity-70`}
    >
      {label}
      <span aria-hidden="true">→</span>
    </a>
  );
}

/**
 * The first column — the one that carries the project header above its blocks.
 *
 * In all three designs the header is not part of that column's flow: it is
 * pinned over the row at its own coordinates (154:4077, 204:2185, 205:2624)
 * while the blocks underneath hang off the row's shared bottom edge exactly
 * like the other two columns do. Pinning it is what keeps the header level with
 * the top of the middle column no matter how tall this column's own blocks come
 * out — the previous arrangement grew this column from the top instead, so any
 * difference in how the browser wrapped the copy moved the header with it.
 *
 * `at` is the header's position in the row's own pixels: `{left, top}`, plus
 * `width` where the design gives the header one (Layer's is hug-width).
 *
 * Stacked, none of it applies — the header is simply the first thing in the
 * single column, which is what the phone design does.
 */
export function HeaderColumn({ at, gap, header, stacked, children }) {
  if (stacked) {
    return (
      <div className={`${COLUMN} w-[475px]`}>
        {header}
        {children}
      </div>
    );
  }
  return (
    <div className="relative w-[475px] shrink-0 self-stretch">
      <div className="absolute" style={{ left: at.left, top: at.top, width: at.width }}>
        {header}
      </div>
      {/* h-full against the stretched wrapper, so `justify-end` bottom-aligns
          these with the row the way `items-end` does for the other columns. */}
      <div className="flex h-full flex-col justify-end" style={{ gap }}>
        {children}
      </div>
    </div>
  );
}

/**
 * The page block itself: Figma's content frame inset from the 1779px spread.
 * The insets differ per project, so each spread passes its own.
 *
 * `stacked` folds the three columns into one, which is the whole of what a
 * phone needs (Figma 355:153). The spreads are three columns of blocks read
 * left to right, and the mobile design is those same blocks in one column in
 * the same order — so nothing about their content has to change, only whether
 * the columns sit beside each other or under each other.
 *
 * The columns keep their authored 475px width when stacked. That is deliberate:
 * the whole spread is scaled to fit as one unit by whatever opens it, so
 * shrinking the column here would shrink the type twice. See MobileCaseStudy,
 * which measures this frame and scales it to the phone's own content width.
 *
 * The `spread-stacked` class is what evens out the gaps — each column carries
 * its own hand-tuned spacing, chosen to make three columns of different heights
 * line up, and stacked those become an arbitrary rhythm of 40 to 107px between
 * blocks. See index.css.
 */
export function SpreadFrame({ pad, gap, stacked, children }) {
  return (
    <div
      style={
        stacked
          ? // The page's own margins come from the folder the phone draws
            // around this, so the frame adds none of its own.
            { padding: 0 }
          : {
              paddingTop: pad.top,
              paddingBottom: pad.bottom,
              paddingLeft: pad.left,
              paddingRight: pad.right,
            }
      }
    >
      <div
        className={
          stacked
            ? "spread-stacked flex flex-col items-stretch"
            : "flex items-end justify-center"
        }
        style={{ gap: stacked ? STACKED_GAP : gap }}
      >
        {children}
      </div>
    </div>
  );
}

// Between one stacked column and the next — the same gap the design puts
// between two blocks, so a column boundary is invisible once they are in a
// single file.
const STACKED_GAP = 22;
