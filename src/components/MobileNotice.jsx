import { useCallback, useRef, useState } from "react";
import Chatbot from "./Chatbot";
import MobileHero from "./mobile/MobileHero";
import MobileExperience from "./mobile/MobileExperience";
import MobileProject from "./mobile/MobileProject";
import MobileLearn from "./mobile/MobileLearn";
import MobileSkills from "./mobile/MobileSkills";
import MobileCareer from "./mobile/MobileCareer";
import MobileAbout from "./mobile/MobileAbout";
import MobileNav from "./mobile/MobileNav";
import MobileHeader from "./mobile/MobileHeader";

// The mobile page: the sections that have been designed, and a short note
// standing in for the ones that have not.
//
// The note is temporary and shrinks as sections arrive — it is here because the
// alternative is worse. Below 768px the desktop composition does not shrink, it
// overflows, and a visitor meets a page running off the side of their screen
// with 5px type. Between "not built yet" and "built badly", the first is the
// honest one and the only one that does not cost her the impression.
//
// It also means the desktop sections never mount down here, which is not just
// tidiness: they run scroll-driven animation loops and a WebGL drum, and none of
// that should be spinning behind a phone's screen.
//
// The menu lives here rather than in either section, because both draw a header
// and there must only ever be one sheet. Each section is handed the opener and
// knows nothing else about it.
//
// MOBILE_TODO — CAREER, and a case study spread laid out for a phone rather
// than the desktop one scaled down. As each lands it goes in below, gets an
// entry in MobileNav's ITEMS, and the note gets shorter. When the last one
// arrives the note goes entirely.
export default function MobileNotice() {
  const [navOpen, setNavOpen] = useState(false);
  // One button, both directions. It is the only control the sheet has — the
  // panel is the full width of a phone, so there is nothing beside it to tap.
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  // The hamburger belongs to the header but is timed by the hero — it fades in
  // with the eyes. The page owns the ref because it is the only thing that can
  // see both; neither component needs to know the other exists.
  const menuRef = useRef(null);

  return (
    // White, and it used to be the page's blue.
    //
    // Nothing is meant to show through here: every section paints its own
    // ground edge to edge. But section heights are viewport units, they land on
    // fractional device pixels, and a hairline of whatever is behind them shows
    // at the joins — which was a blue line across a run of white sections. The
    // sections that are still blue paint themselves; this only has to be the
    // colour that does not show up when it leaks.
    <main className="bg-white">
      <MobileHeader onMenu={toggleNav} menuRef={menuRef} menuOpen={navOpen} />

      <MobileHero menuRef={menuRef} />
      {/* There is a mobile layout for this one now (Figma 1317:114 and the
          seven frames after it), so the desktop strip is no longer squeezed
          down here. It never really fitted: fitted to the screen's *width*, a
          composition drawn on a 1920 canvas came out at about a quarter size,
          and its heading landed at 27px where every other section on this page
          sets one at 60. Same eight beats, laid out for the screen they are on,
          and tapped through rather than scrolled. */}
      <MobileExperience />
      <MobileProject />
      <MobileLearn />
      <MobileSkills />
      {/* The roles half of CAREER — Figma 1317:730 and the two after it. The
          chapters that follow them on the desktop are still desktop-only, which
          is what the note below is about. */}
      <MobileCareer />

      {/* And what the roles led to — Figma 1317:1149 and the four after it.
          Scrolled down rather than swiped across, which is the point of it
          being its own section: the wheel above is one object being turned, and
          this is the page moving on from it.

          It carries `.section-mobile-about`, which is where the menu's ABOUT
          entry lands. That class used to sit on a note saying this part was
          desktop-only; the note is gone because the part is here. */}
      <MobileAbout />

      {/* The same chat as the desktop's, unchanged. Its panel is already
          `min(300px, 100vw - 5.5rem)` and its launcher is a fixed corner
          circle, so there was nothing to adapt — it was simply never mounted
          down here. It waits on the hero's own bottom edge to appear, and
          Chatbot looks for either hero's class. */}
      <Chatbot />

      <MobileNav open={navOpen} onClose={closeNav} />
    </main>
  );
}
