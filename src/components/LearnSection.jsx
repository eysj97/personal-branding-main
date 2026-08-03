import { useEffect, useRef } from 'react'
import card1 from '../assets/learn/card-1.png'
import card2 from '../assets/learn/card-2.png'
import card3 from '../assets/learn/card-3.png'
import card4 from '../assets/learn/card-4.png'
import card5 from '../assets/learn/card-5.png'
import card6 from '../assets/learn/card-6.png'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoothstep = (from, to, x) => {
  const t = clamp01((x - from) / (to - from))
  return t * t * (3 - 2 * t)
}

// Back-to-front stacking order — the last one in this list paints on top
// and sits at the front (leftmost) of the stack.
const CARDS = [card1, card2, card3, card4, card5, card6]

const CARD_WIDTH = 'clamp(220px,29vw,554px)'
const CARD_ASPECT = 446.5 / 554
// Gap between each stacked card, as a fraction of the card width: starts
// at the resting/packed amount, widens to double the 12x baseline (24x)
// as you scroll.
const GAP_START_FRAC = 60 / 120
const GAP_END_FRAC = GAP_START_FRAC * 10
// The whole stack slides LEFT together. Has to comfortably outrun the gap
// growth above for every card, so the back cards never net-drift right —
// and large enough that even the frontmost card (which gets no gap
// bonus) clears past the left edge of the screen, leaving it empty. Bumped
// up alongside GAP_END_FRAC so it still dominates (otherwise the back
// cards, whose gap term grew too, would net-drift right instead of left).
const SHIFT_END_FRAC = -29
// "LEARN" holds in place for a beat before it starts exiting left, instead
// of moving the instant you scroll — then fully gone before the cards start.
const TEXT_HOLD_UNTIL = 0.08
const TEXT_EXIT_DONE_AT = 0.3
const TEXT_EXIT_VW = -120
// Cards only start moving once the text has cleared out.
const CARDS_START_AT = 0.3
// Cards grow as they travel, ending up twice their resting size.
const SCALE_END = 2
// Motion stops here instead of running to a full 1 — cards hold at this
// point (still on screen, not fully exited) for the rest of the scroll
// before the next section takes over.
const T_CAP = 0.28

export default function LearnSection() {
  const sectionRef = useRef(null)
  const cardRefs = useRef([])
  const textRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const text = textRef.current
    let ticking = false

    function render() {
      const rect = section.getBoundingClientRect()
      const scrollable = section.offsetHeight - window.innerHeight
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0

      // "LEARN" holds still, then exits left, on its own timeline.
      const textT = smoothstep(TEXT_HOLD_UNTIL, TEXT_EXIT_DONE_AT, raw)
      text.style.transform = `translateX(${textT * TEXT_EXIT_VW}vw)`

      // Cards only start once the text is out of the way, then immediately
      // move, fan out, and grow all together — no separate waiting beat.
      // Plain linear ramp (not smoothstep's eased S-curve) so the motion
      // reads as one steady, gradual pace.
      const t = Math.min(clamp01((raw - CARDS_START_AT) / (1 - CARDS_START_AT)), T_CAP)
      const cardWidthPx = cardRefs.current[0]?.offsetWidth || 0
      const gapFrac = GAP_START_FRAC + (GAP_END_FRAC - GAP_START_FRAC) * t
      const gapPx = cardWidthPx * gapFrac
      const shiftPx = cardWidthPx * SHIFT_END_FRAC * t
      const scale = 1 + (SCALE_END - 1) * t

      // The last card in the array paints on top (normal DOM stacking), so
      // it sits at the front of the stack. Earlier cards, underneath it,
      // get pushed further back as the gap widens. The whole stack also
      // slides left together (shiftPx) and grows (scale) as it goes.
      const lastIndex = cardRefs.current.length - 1
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `translateX(${shiftPx + (lastIndex - i) * gapPx}px) scale(${scale})`
      })

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
    <section ref={sectionRef} className="section-learn relative h-[340vh] bg-[#06252e]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={textRef} className="absolute top-1/2 -translate-y-1/2 left-5 flex flex-col gap-[12px]">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap text-[clamp(40px,6.25vw,120px)] tracking-[clamp(-4px,-0.6vw,-12px)]">
            LEARN
          </p>
          <p className="font-['Pretendard'] text-white text-[clamp(13px,1.15vw,22px)] tracking-[-0.05em] leading-[1.2]">
            새로운 인터랙션과 웹 기술을 직접 구현하며
            <br />
            실험하고 학습한 결과물입니다
          </p>
        </div>

        {/* Positioned at the same left offset ratio as Figma (690/1986 of
            the frame width) so the gap to the title matches the design. */}
        <div className="absolute top-0 h-full left-[34.74%] right-0">
          {CARDS.map((card, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el }}
              className="absolute top-1/2 -translate-y-1/2 left-0 will-change-transform"
              style={{ width: CARD_WIDTH, aspectRatio: `1 / ${CARD_ASPECT}` }}
            >
              <img src={card} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute right-0 top-[2.5%] h-[28.7%] w-[7.2%] translate-x-full rounded-r-[10px] bg-[#0492bd]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
