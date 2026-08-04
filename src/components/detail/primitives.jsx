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

/** A content block: panel, image well on top, then heading and body. */
export function Block({ gap = 12, children }) {
  const { panel } = useContext(Palette);
  return (
    <div
      className="flex flex-col rounded-[8px] p-[16px]"
      style={{ gap, backgroundColor: panel }}
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
 * The page block itself: Figma's content frame inset from the 1779px spread.
 * The insets differ per project, so each spread passes its own.
 */
export function SpreadFrame({ pad, gap, children }) {
  return (
    <div
      style={{
        paddingTop: pad.top,
        paddingBottom: pad.bottom,
        paddingLeft: pad.left,
        paddingRight: pad.right,
      }}
    >
      <div className="flex items-end justify-center" style={{ gap }}>
        {children}
      </div>
    </div>
  );
}
