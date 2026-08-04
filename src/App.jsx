import Hero from './components/Hero'
import ProjectSection from './components/ProjectSection'
import LearnSection from './components/LearnSection'
import SkillsSection from './components/SkillsSection'
import CareerSection from './components/CareerSection'
import SnapkeepSpread from './components/detail/SnapkeepSpread'

export default function App() {
  const showSnapkeepOnly =
    window.location.pathname === '/snapkeep' || window.location.hash === '#snapkeep'

  if (showSnapkeepOnly) {
    return (
      <main className="flex min-h-screen min-w-max items-start justify-center bg-[#06252e] p-8">
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

  return (
    <>
      <Hero />
      <ProjectSection />
      <LearnSection />
      <SkillsSection />
      <CareerSection />
    </>
  )
}
