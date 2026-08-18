import { useRef } from "react";
import { MenuButton } from "./MobileNav";
import { useGroundUnder } from "../../lib/useGround";

// The mobile page's one header: the name and the menu, fixed, always there.
//
// It used to be drawn per section — the hero had one with the name in it, the
// project section had one with just the button — which meant two of them on a
// page that scrolls continuously, each scrolling away with its own section. One
// fixed bar instead: the name stays put while the sections move under it, and
// there is only ever one menu button, in one place.
//
// Transparent on purpose. Every section behind it is the same #336bec, and the
// hero's black wash fading into it is meant to happen *behind* the name — a
// solid bar here would cut a rectangle out of that.
export const DESIGN_W = 430;

// A design px, as a share of the window.
//
// `calc`, and not a vw figure worked out here and rounded. Three decimal places
// sounds like plenty and is not: 60 design px came out as 13.953vw, which on a
// 430-wide screen is 59.9979px — near enough to look right and not the number,
// and the sizes on this page are quoted and compared against the design in
// whole px. Handing CSS the division instead means every measurement is exact
// at 430 and exact at every other width too, which is the whole point of
// writing them in design px in the first place.
export const vw = (px) => `calc(${px} / ${DESIGN_W} * 100vw)`;

// What the header occupies, so sections can hold their composition clear of it:
// 40px of padding top and bottom off the design, plus the name's own line.
// Written as one expression because the name scales with the viewport and the
// padding does not, so the height is neither pure px nor pure vw.
export const HEADER_H = `calc(80px + ${vw(48)})`;

// `menuRef` is handed straight through to the hamburger and on to the hero,
// which fades it in on its own timeline — see MenuButton. The name is not on
// that timeline: it is on the screen from the first frame, because the black
// wash the hero opens on is meant to have her name on it.
export default function MobileHeader({ onMenu, menuRef, menuOpen }) {
  const nameRef = useRef(null);
  const barRef = useRef(null);
  // What is behind the bar, and whether the section under it is the one that
  // writes her name backwards. Shared with the Snapkeep word that parks over
  // the chat character — see lib/useGround, which is where the reasoning is.
  const { light: onLight, name } = useGroundUnder(nameRef, barRef);
  const reversed = name === "reverse";

  // The sheet wins over the ground: it covers the section entirely, so what the
  // section is painted makes no difference while it is up.
  const dark = menuOpen || onLight;

  return (
    // z-75 so it outranks the menu's own stacking (z-70). The hamburger *is* the
    // menu's close button — the panel fills a phone, so there is no outside to
    // tap — and a header that the sheet covers is a menu with no way out.
    <header
      ref={barRef}
      className="fixed inset-x-0 top-0 z-[75] flex items-start justify-between"
    >
      {/* Black while the menu is up, for the same reason the hamburger is: this
          bar sits above a white panel and the name would otherwise vanish into
          it. */}
      <div
        ref={nameRef}
        className={`flex items-center whitespace-nowrap px-[5px] py-[40px] font-['Plus_Jakarta_Sans'] font-semibold leading-none transition-colors ${
          dark ? "text-black" : "text-white"
        }`}
        style={{ fontSize: vw(48), letterSpacing: vw(-4.8), gap: vw(10) }}
      >
        {(reversed ? ["JEONG", "SU", "YUN"] : ["YUN", "SU", "JEONG"]).map((part) => (
          <p key={part}>{part}</p>
        ))}
      </div>
      <MenuButton onClick={onMenu} buttonRef={menuRef} open={menuOpen} dark={dark} />
    </header>
  );
}
