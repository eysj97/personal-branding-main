import { useEffect } from "react";
import { releaseScrollHold } from "../../lib/scrollHold";

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
export function MenuButton({ onClick, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label="메뉴 열기"
      className="flex items-center px-[20px] py-[40px] text-white"
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
        <path
          d="M4 6h16M4 12h16M4 18h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export default function MobileNav({ open, onClose }) {
  // Escape closes it, and the page underneath stops scrolling while it is up —
  // a full-screen sheet you can scroll the page behind reads as broken.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function go(target) {
    // The hero pins the page until its intro has played (see scrollHold). A
    // menu item asks for a section by name, which is not the same thing as
    // scrolling past the hero, so it lets go rather than being clamped.
    releaseScrollHold();
    onClose();
    // After the sheet is down, so the scroll lands on a page that is actually
    // showing. Without this the jump happens under an overlay that is still up
    // and the movement is invisible.
    requestAnimationFrame(() => {
      if (!target) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="메뉴"
      className="fixed inset-0 z-[70] flex flex-col bg-[#06252e]"
    >
      <div className="flex shrink-0 justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="flex items-center px-[20px] py-[40px] text-white"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col justify-center gap-8 px-[30px]">
        {ITEMS.map(({ label, target }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(target)}
            className="text-left font-['Plus_Jakarta_Sans'] text-[40px] font-semibold leading-none tracking-[-2px] text-white transition-colors active:text-[#c9e529]"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
