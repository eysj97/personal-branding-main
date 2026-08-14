import { useCallback, useRef, useState } from "react";
import { EMAIL } from "../data/chatbot";
import Chatbot from "./Chatbot";
import ExperienceSection from "./ExperienceSection";
import MobileHero from "./mobile/MobileHero";
import MobileProject from "./mobile/MobileProject";
import MobileLearn from "./mobile/MobileLearn";
import MobileSkills from "./mobile/MobileSkills";
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
    <main className="bg-[#336bec]">
      <MobileHeader onMenu={toggleNav} menuRef={menuRef} menuOpen={navOpen} />

      <MobileHero menuRef={menuRef} />
      {/* The desktop strip, at phone size, and deliberately not a mobile layout
          of its own — there isn't one designed, and this section is a single
          composition whose whole point is that it is one continuous strip. It
          is fitted to the screen's width rather than its height down here (see
          fitStrip), so a stop frames a whole panel the way it does on a laptop.
          Small, but all of it, and it behaves exactly as it does up there. */}
      <ExperienceSection />
      <MobileProject />
      <MobileLearn />
      <MobileSkills />

      {/* Carries `.section-mobile-about` so the menu's ABOUT has somewhere real
          to land — see MobileNav. The class moves onto the mobile career section
          the day it exists, and the menu entry does not change. */}
      <div className="section-mobile-about flex flex-col items-center gap-5 px-8 py-16 text-center">
        <div className="flex flex-col gap-2 font-['Pretendard'] text-[15px] leading-[1.6] text-white/70">
          <p>
            ABOUT은 아직 데스크톱 화면에 맞춰져 있어요.
            <br />
            노트북이나 데스크톱에서 열어 주시면 전체를 보실 수 있습니다.
          </p>
          <p className="text-white/45">모바일 화면은 준비 중입니다.</p>
        </div>

        <a
          href={`mailto:${EMAIL}`}
          className="rounded-full border border-[#ffd527] px-5 py-2 font-['Pretendard'] text-[14px] text-[#ffd527] transition-colors hover:bg-[#ffd527] hover:text-[#06252e]"
        >
          {EMAIL}
        </a>
      </div>

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
