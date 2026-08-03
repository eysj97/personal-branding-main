import { useEffect, useRef } from 'react'
import closedLeft from '../assets/eyes/closed-left.svg'
import closedRight from '../assets/eyes/closed-right.svg'
import halfLeft from '../assets/eyes/half-left.svg'
import halfRight from '../assets/eyes/half-right.svg'
import openLeft from '../assets/eyes/open-left.svg'
import openRight from '../assets/eyes/open-right.svg'

const eyeBoxClass = 'relative w-[clamp(160px,26vw,503px)] h-[clamp(78px,12.6vw,243px)]'
const eyeFrameClass = 'absolute inset-0 w-full h-full object-contain'

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

    let ticking = false

    function render() {
      const scrollable = section.offsetHeight - window.innerHeight
      const rect = section.getBoundingClientRect()
      const progress = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0

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
      textEnRef.current.style.opacity = revealT * (1 - langT)
      textKoRef.current.style.opacity = revealT * langT

      ticking = false
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(render)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    render()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section ref={sectionRef} className="section-hero relative h-[450vh]">
      <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden bg-[#06252e]">
        <div ref={overlayRef} className="absolute inset-0 bg-black opacity-100 pointer-events-none" />

        <div className="absolute top-0 left-0 px-5 flex items-center gap-[12px] font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(48px,8vw,150px)] tracking-[clamp(-8px,-0.8vw,-15px)]">
          <p>YUN</p>
          <p>SU</p>
          <p>JEONG</p>
        </div>

        <nav ref={navRef} className="font-['Plus_Jakarta_Sans'] absolute top-0 right-0 pt-3 pr-7 flex flex-col items-end gap-2 font-bold leading-none text-[22px] opacity-0">
          <span>HOME</span>
          <span>PROJECT</span>
          <span>ABOUT</span>
        </nav>

        <div className="absolute inset-0 flex items-center justify-center gap-[clamp(40px,12vw,336px)]">
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
