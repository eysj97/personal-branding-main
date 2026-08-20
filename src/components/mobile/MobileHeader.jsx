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
/** The name's size, and the one thing on this page that is not in design px.
 *
 *  It runs 80px at 811 down to 48px at 430 — the line calc(11.88px + 8.399vw) —
 *  because the desktop hero above 767 runs the same line, and the two have to
 *  meet where one layout hands over to the other. `vw(48)` did not: it is 48 at
 *  430 as designed, but 85.6 by 767, so the name grew as the window shrank and
 *  then dropped 26px the moment the desktop hero took over at 768.
 *
 *  At 430 it is still exactly 48, so the design's own size is untouched. */
export const NAME_SIZE = "calc(11.88px + 8.399vw)";

/** A section's own name — "Experience it", "Learn", "PROJECT", "Every Role".
 *
 *  60px at 430, as the design draws it, growing to 90 by 660 and holding there.
 *
 *  `vw(60)` grew with no ceiling: 92px by 660, and 107 by the 767 where the
 *  phone layout hands over to the desktop — a section name taking a quarter of
 *  a tablet's width. The cap is the whole change; below 430 this stays within a
 *  pixel of what vw(60) gave, so a narrow phone is untouched.
 *
 *  Same shape as NAME_SIZE above and solved the same way: two points, (430, 60)
 *  and (660, 90), and `min` stops it at the second. Written as one division for
 *  the reason vw() is — 3/23 rounded to three places is 59.998px at 430, near
 *  enough to look right and not the number the design says.
 */
export const SECTION_TITLE = "min(90px, calc((90px + 300vw) / 23))";

export const HEADER_H = `calc(80px + ${NAME_SIZE})`;

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
    <>
      {/* The name is its own element, outside the bar, because past 510 it stops
          being fixed.

          On a narrow phone a pinned name costs little and earns its keep — it is
          the only piece of identity on a page with no other chrome. Wider, the
          bar is 156px of a viewport that has not grown any taller (a 766-wide
          screen is usually a phone turned on its side), and that much of the
          window spent permanently on a name already read is a poor trade. So it
          scrolls away with the page, and the hamburger — the only way to
          navigate — stays where it is.

          Absolute rather than static: in flow it would push every section down
          by its own height, and each of them already holds itself clear of
          HEADER_H. Positioned against the initial containing block it sits at
          the document's top and scrolls with it, which is the fixed behaviour
          minus the pinning.

          No upper bound on the query. This layout is the whole page below 767
          and the desktop takes over above that, so min-width on its own is the
          510-to-766 band. */}
      <div
        ref={nameRef}
        className={`fixed left-0 top-0 z-[75] flex items-center whitespace-nowrap px-[5px] py-[40px] font-['Plus_Jakarta_Sans'] font-semibold leading-none transition-colors [@media(min-width:510px)]:absolute ${
          dark ? "text-black" : "text-white"
        }`}
        style={{ fontSize: NAME_SIZE, letterSpacing: "-0.1em", gap: vw(10) }}
      >
        {(reversed ? ["JEONG", "SU", "YUN"] : ["YUN", "SU", "JEONG"]).map((part) => (
          <p key={part}>{part}</p>
        ))}
      </div>
      {/* Black while the menu is up, for the same reason the hamburger is: this
          bar sits above a white panel and the button would otherwise vanish
          into it. */}
      <header
        ref={barRef}
        className="fixed inset-x-0 top-0 z-[75] flex items-start justify-end"
      >
        <MenuButton onClick={onMenu} buttonRef={menuRef} open={menuOpen} dark={dark} />
      </header>
    </>
  );
}
