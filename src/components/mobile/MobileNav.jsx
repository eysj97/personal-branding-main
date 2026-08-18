import { releaseScrollHold } from "../../lib/scrollHold";
import StaggeredMenu from "./StaggeredMenu";

// The mobile menu: the button that opens it, and the sheet it opens.
//
// One list, in one file, because the header appears in more than one section —
// the hero draws it with the name beside it, the project section draws it on its
// own (Figma 349:153 and 349:3201). Both hand the same open() up to the page, so
// there is only ever one sheet and only ever one list of places to go.

// Where the menu can send you. `target` is a selector on the mobile page.
//
// MOBILE_TODO — ABOUT points at the contact block at the foot of the page,
// because the career section has no mobile layout yet and that block is the
// nearest thing to one: her email and how to reach her. When the mobile career
// section lands it takes the `.section-mobile-about` class over, and this entry
// keeps working without being touched.
const ITEMS = [
  { label: "HOME", target: null },
  { label: "PROJECT", target: ".section-mobile-project" },
  { label: "ABOUT", target: ".section-mobile-about" },
];

/** The hamburger.
 *
 *  `buttonRef` is how the hero reaches it. The button is on the page's one
 *  fixed header, but *when* it appears belongs to the hero's timeline — it
 *  arrives with the eyes, like the desktop's nav — so the hero writes its
 *  opacity every frame rather than the header owning a piece of state that
 *  would re-render the whole page sixty times a second. Hidden until then, and
 *  not clickable while hidden: an invisible button over the glasses is worse
 *  than no button.
 */
export function MenuButton({ onClick, buttonRef, open, dark }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
      aria-expanded={open}
      aria-controls="mobile-menu-panel"
      // Black once the sheet is up. The sheet is white and this button stays
      // above it (the header outranks the menu's own stacking, see
      // MobileHeader) — a white icon there is a button you cannot see on a
      // panel whose only way out it is.
      //
      // And black over a light section, for the same reason one step out: the
      // page is mostly #336bec but CAREER is white. The header works out which
      // it is over; this only paints what it is told.
      className={`flex items-center px-[20px] py-[40px] transition-colors ${
        open || dark ? "text-black" : "text-white"
      }`}
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
        {/* Two paths rather than one that morphs: the hamburger and the cross
            are not the same drawing, and a crossfade between three lines and
            two reads as a smudge at this size. */}
        <path
          d={open ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export default function MobileNav({ open, onClose }) {
  function go(item) {
    // The hero pins the page until its intro has played (see scrollHold). A
    // menu item asks for a section by name, which is not the same thing as
    // scrolling past the hero, so it lets go rather than being clamped.
    releaseScrollHold();
    onClose();
    // After the sheet has started leaving, so the scroll lands on a page that
    // is actually showing. Without this the jump happens under a panel still
    // covering the screen and the movement is invisible.
    requestAnimationFrame(() => {
      if (!item.target) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.querySelector(item.target)?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Gold then pink — the page's two accents — sweeping in ahead of the white
  // panel, with the page blue left for the numbering and the pressed state. The
  // sheet this replaced was a flat blue rectangle that simply appeared.
  return (
    <StaggeredMenu
      open={open}
      onClose={onClose}
      items={ITEMS}
      onSelect={go}
      colors={["#ffd527", "#f460c0"]}
      accentColor="#336bec"
      position="right"
    />
  );
}
