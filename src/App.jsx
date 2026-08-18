import Hero from './components/Hero'
import ExperienceSection from './components/ExperienceSection'
import ProjectSection from './components/ProjectSection'
import LearnSection from './components/LearnSection'
import SkillsSection from './components/SkillsSection'
import CareerSection from './components/CareerSection'
import SnapkeepSpread from './components/detail/SnapkeepSpread'
import LayerSpread from './components/detail/LayerSpread'
import ReviuSpread from './components/detail/ReviuSpread'
import AquaplanetSpread from './components/detail/AquaplanetSpread'
import Chatbot from './components/Chatbot'
import MobileNotice from './components/MobileNotice'
import { useIsMobile } from './lib/viewport'

// The three case-study spreads, by the hash that shows one on its own.
// Each spread with the page colour it is drawn to be read on — the same one
// the folder opens onto in ProjectDetailOverlay. Reviu's header is black type
// sitting straight on the page, so the ground is not decoration here.
const SPREADS = {
  layer: { Spread: LayerSpread, page: '#ff742c' },
  reviu: { Spread: ReviuSpread, page: '#c9d722' },
  aquaplanet: { Spread: AquaplanetSpread, page: '#0085ff' },
}

export default function App() {
  // The single place the site chooses a layout. Every section below is built
  // against the desktop composition and none of them branch on width — that is
  // on purpose, so the decision lives here rather than being re-argued in six
  // files. When the mobile designs arrive, the mobile branch grows sections of
  // its own and the desktop branch is untouched.
  const isMobile = useIsMobile()

  // A spread on its own, at #layer / #reviu / #aquaplanet. The case studies are
  // otherwise only reachable by opening a folder on the project drum, which
  // means the only way to look at one — to check a layout, to read the copy
  // back — is to scroll most of the site and hit a moving target. Same idea as
  // the Snapkeep route below, and the same cost: a hash nobody arrives at by
  // accident.
  const spread = SPREADS[window.location.hash.slice(1)]

  const showSnapkeepOnly =
    window.location.pathname === '/snapkeep' || window.location.hash === '#snapkeep'

  if (spread) {
    const { Spread, page } = spread
    return (
      <main
        className="flex min-h-screen min-w-max items-start justify-center"
        style={{ backgroundColor: page }}
      >
        <Spread />
      </main>
    )
  }

  if (showSnapkeepOnly) {
    return (
      <main className="flex min-h-screen min-w-max items-start justify-center bg-[#336bec] p-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => { window.location.href = '/' }}
            className="absolute right-7 top-[17px] z-10 grid size-11 place-items-center text-[38px] font-light leading-none text-[#1d1c1c]"
            aria-label="스냅킵 닫기"
          >
            ×
          </button>
          <SnapkeepSpread />
        </div>
      </main>
    )
  }

  // Before the sections, not inside them: the desktop composition never mounts
  // on a narrow screen, so its scroll drivers and the WebGL card drum are not
  // running behind a notice on someone's phone.
  if (isMobile) return <MobileNotice />

  return (
    <>
      <Hero />
      <ExperienceSection />
      <ProjectSection />
      <LearnSection />
      <SkillsSection />
      <CareerSection />
      {/* Last, and fixed, so it sits over every section without belonging to
          one. It is deliberately absent from the standalone Snapkeep route
          above — that view is the app itself, not the portfolio. */}
      <Chatbot />
    </>
  )
}
