import { useEffect, useRef } from 'react'
import closedLeft from '../assets/eyes/closed-left.svg'
import closedRight from '../assets/eyes/closed-right.svg'
import halfLeft from '../assets/eyes/half-left.svg'
import halfRight from '../assets/eyes/half-right.svg'
import openLeft from '../assets/eyes/open-left.svg'
import openRight from '../assets/eyes/open-right.svg'

const eyeBoxClass = 'relative w-[clamp(160px,26vw,503px)] h-[clamp(78px,12.6vw,243px)]'
const eyeFrameClass = 'absolute inset-0 w-full h-full object-contain'

// `null` means the very top of the page; the others are the section each label
// should land on. ABOUT is the career section — that is where the "about me"
// story lives.
const NAV = [
  { label: 'HOME', target: null },
  { label: 'PROJECT', target: '.section-project' },
  { label: 'ABOUT', target: '.section-career' },
]

function goTo(selector) {
  if (!selector) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const section = document.querySelector(selector)
  if (!section) return
  // Its own top, not scrollIntoView — every section here is a tall scroll
  // track with a sticky stage inside, and their animations all read from
  // "how far into this section are we", so they have to be entered at 0.
  window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const tent = (x, center, width) => clamp01(1 - Math.abs(x - center) / width)
const smoothstep = (from, to, x) => {
  const t = clamp01((x - from) / (to - from))
  return t * t * (3 - 2 * t)
}

export default function Hero() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const overlayRef = useRef(null)
  const navRef = useRef(null)
  const textEnRef = useRef(null)
  const textKoRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const overlay = overlayRef.current
    const closedFrames = stageRef.current.querySelectorAll('[data-state="closed"]')
    const halfFrames = stageRef.current.querySelectorAll('[data-state="half"]')
    const openFrames = stageRef.current.querySelectorAll('[data-state="open"]')

    // One wheel tick per beat, rather than the animation tracking the
    // scrollbar: eyes shut, then eyes open with the copy in, then the copy in
    // Korean. Values are positions along the same 0-1 timeline the render
    // below already reads, so the keyframes are unchanged — only what drives
    // them is.
    const STEPS = [0, 0.75, 1]
    let stepIndex = 0
    let current = 0
    let busy = false
    let tweenId = null
    let selfScrollUntil = 0

    function render(progress) {
      // Eyes closed -> open and background black -> teal over the first 60% of the scroll.
      const eyeProgress = clamp01(progress / 0.6)
      overlay.style.opacity = Math.pow(1 - eyeProgress, 1.5)

      const closedOp = tent(eyeProgress, 0, 0.5)
      const halfOp = tent(eyeProgress, 0.5, 0.5)
      const openOp = tent(eyeProgress, 1, 0.5)
      closedFrames.forEach((el) => { el.style.opacity = closedOp })
      halfFrames.forEach((el) => { el.style.opacity = halfOp })
      openFrames.forEach((el) => { el.style.opacity = openOp })

      // Nav + copy fade in right after the eyes finish opening, then the copy
      // crossfades from English to Korean for the rest of the scroll.
      const revealT = smoothstep(0.55, 0.7, progress)
      const langT = smoothstep(0.8, 1, progress)

      navRef.current.style.opacity = revealT
      // Fading alone would leave an invisible but still clickable nav sitting
      // over the eyes for the first half of the scroll.
      navRef.current.style.pointerEvents = revealT > 0.5 ? 'auto' : 'none'
      textEnRef.current.style.opacity = revealT * (1 - langT)
      textKoRef.current.style.opacity = revealT * langT

      current = progress
    }

    function tweenTo(target) {
      busy = true
      const from = current
      const startedAt = performance.now()
      function step() {
        const t = clamp01((performance.now() - startedAt) / 700)
        render(from + (target - from) * smoothstep(0, 1, t))
        if (t < 1) {
          tweenId = requestAnimationFrame(step)
        } else {
          busy = false
          tweenId = null
        }
      }
      step()
    }

    function isEngaged() {
      const rect = section.getBoundingClientRect()
      return rect.top <= 1 && rect.bottom >= window.innerHeight - 1
    }

    // Park the page on the scroll position that matches the current beat, so
    // that at either end the page already sits on that edge of the section and
    // handing back to normal scrolling has nothing left to unwind.
    function syncScroll() {
      const scrollable = section.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      selfScrollUntil = performance.now() + 200
      window.scrollTo({
        top: section.offsetTop + (stepIndex / (STEPS.length - 1)) * scrollable,
      })
    }

    function advance(direction) {
      const next = Math.min(STEPS.length - 1, Math.max(0, stepIndex + direction))
      if (next === stepIndex) return
      stepIndex = next
      syncScroll()
      tweenTo(STEPS[stepIndex])
    }

    function onWheel(e) {
      if (!isEngaged()) return
      const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0
      if (direction === 0) return
      if (busy) {
        e.preventDefault()
        return
      }
      // At either end the page is already parked on that edge, so not claiming
      // the event hands the gesture straight to the neighbouring section.
      if (direction > 0 && stepIndex >= STEPS.length - 1) return
      if (direction < 0 && stepIndex <= 0) return
      e.preventDefault()
      advance(direction)
    }

    let touchStartY = null
    function onTouchStart(e) {
      touchStartY = isEngaged() ? e.touches[0].clientY : null
    }
    function onTouchMove(e) {
      if (touchStartY === null) return
      if (busy) {
        e.preventDefault()
        return
      }
      const delta = touchStartY - e.touches[0].clientY
      if (Math.abs(delta) < 40) return
      const direction = delta > 0 ? 1 : -1
      touchStartY = e.touches[0].clientY
      if (direction > 0 && stepIndex >= STEPS.length - 1) return
      if (direction < 0 && stepIndex <= 0) return
      e.preventDefault()
      advance(direction)
    }

    // The wheel owns the beats, but the page can still be moved under us — the
    // nav's HOME, a reload partway down. Re-derive the beat from where the page
    // landed, for moves we did not make ourselves.
    function onScroll() {
      if (busy || performance.now() < selfScrollUntil) return
      const scrollable = section.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      const raw = clamp01((window.scrollY - section.offsetTop) / scrollable)
      let nearest = 0
      STEPS.forEach((_, i) => {
        const at = i / (STEPS.length - 1)
        const best = nearest / (STEPS.length - 1)
        if (Math.abs(at - raw) < Math.abs(best - raw)) nearest = i
      })
      if (nearest !== stepIndex) stepIndex = nearest
      render(STEPS[stepIndex])
    }

    function onResize() {
      render(current)
    }

    onScroll()
    render(STEPS[stepIndex])

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (tweenId !== null) cancelAnimationFrame(tweenId)
    }
  }, [])

  return (
    // 200vh = one screen of sticky stage plus one screen of range to park the
    // three beats in. The beats are driven by the wheel, not by this height, so
    // anything longer is just dead scroll between them.
    <section ref={sectionRef} className="section-hero relative h-[200vh]">
      <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden bg-[#06252e]">
        <div ref={overlayRef} className="absolute inset-0 bg-black opacity-100 pointer-events-none" />

        <div className="absolute top-0 left-0 px-5 flex items-center gap-[12px] font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(48px,8vw,150px)] tracking-[clamp(-8px,-0.8vw,-15px)]">
          <p>YUN</p>
          <p>SU</p>
          <p>JEONG</p>
        </div>

        {/* z-20 because the decorative layers below are `inset-0` and come
            later in the DOM — without it they stack over the nav and eat
            every click on it. */}
        <nav ref={navRef} className="font-['Plus_Jakarta_Sans'] absolute top-0 right-0 z-20 pt-3 pr-7 flex flex-col items-end gap-2 font-bold leading-none text-[22px] opacity-0">
          {NAV.map(({ label, target }) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(target)}
              className="transition-opacity hover:opacity-60"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="absolute inset-0 flex items-center justify-center gap-[clamp(40px,12vw,336px)] pointer-events-none">
          <div className={`${eyeBoxClass} rotate-180 -scale-y-100`}>
            <img className={eyeFrameClass} data-state="closed" src={closedLeft} alt="" />
            <img className={eyeFrameClass} data-state="half" src={halfLeft} alt="" />
            <img className={eyeFrameClass} data-state="open" src={openLeft} alt="" />
          </div>
          <div className={eyeBoxClass}>
            <img className={eyeFrameClass} data-state="closed" src={closedRight} alt="" />
            <img className={eyeFrameClass} data-state="half" src={halfRight} alt="" />
            <img className={eyeFrameClass} data-state="open" src={openRight} alt="" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 p-5 grid">
          <div ref={textEnRef} className="col-start-1 row-start-1 flex flex-col gap-[12px] opacity-0">
            <p className="font-semibold text-[clamp(22px,2.4vw,36px)]">Discover user&apos;s unknown needs and design experiences</p>
            <p className="text-[clamp(14px,1.6vw,24px)]">
              With the sense of reading clients&rsquo; needs in the field of social welfare,<br />
              I&rsquo;m Sujeong Yoon, a UX/UI designer focused on improving user experience.
            </p>
          </div>

          <div ref={textKoRef} className="col-start-1 row-start-1 flex flex-col gap-[12px] opacity-0 font-['Pretendard']">
            <p className="font-semibold text-[clamp(22px,2.4vw,36px)]">사용자의 숨은 니즈를 발견하고 경험을 설계합니다</p>
            <p className="text-[clamp(14px,1.6vw,24px)]">
              사회복지 현장에서 클라이언트의 니즈를 읽던 감각으로,<br />
              사용자 경험을 개선하는 UX/UI 디자이너 윤수정입니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
