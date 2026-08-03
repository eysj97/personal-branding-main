import { useEffect, useRef, useState } from 'react'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Figma frame's own pixel dimensions (node 160:502). Everything below is
// laid out in these same literal px, then the whole canvas is scaled down
// (or up) to fit the viewport — so the composition, gaps, and card ratio
// stay pixel-identical to the design at any screen size, instead of each
// piece being independently responsive and drifting out of proportion.
const DESIGN_WIDTH = 1920
// Cropped to the content's own bounding box (cards + heading), not the
// full Figma frame — the frame has ~410px of dead space above the grid,
// and centering the full frame vertically would center that dead space
// too, pushing the actual content (which hugs the frame's bottom edge)
// off-screen at the bottom instead.
const DESIGN_HEIGHT = 747
const GRID_LEFT = 30
const GRID_TOP = 0
const GRID_WIDTH = 1875

// Each card's (row + col) — used to stagger the flip diagonally.
const SKILLS = [
  { title: 'UX Research', desc: '사용자 조사와 경쟁 분석으로 문제를 정의', level: 'Proficient', diag: 0 },
  { title: 'Planning', desc: '서비스 구조와 화면 흐름 설계', level: 'Proficient', diag: 1 },
  { title: 'UI Design', desc: '화면 설계와 비주얼 디자인', level: 'Proficient', diag: 2 },
  { title: 'Interaction Design', desc: '화면의 움직임과 전환 설계', level: 'Proficient', diag: 1 },
  { title: 'AI', list: ['CLAUDE', 'CHAT GPT', 'JEMINI'], level: 'Proficient', diag: 2 },
  { title: 'FIGMA', desc: '디자인 시스템과 프로토타입 제작', level: 'Advanced', diag: 3 },
  { title: 'HTML', desc: '구조에 맞게 마크업', level: 'Advanced', diag: 3 },
  { title: 'CSS', desc: '디자인을 반응형 화면으로 구현', level: 'Proficient', diag: 4 },
]
const MAX_DIAG = 4
// How much of each half of the flip is spent staggering card-to-card,
// rather than all cards turning in lockstep.
const STAGGER = 0.35

// Rows match the Figma layout's staircase: row 1 is left-aligned and full,
// rows 2-3 are right-aligned within the same GRID_WIDTH, so with fewer (or
// differently counted) cards they hug the right edge — leaving a growing
// gap at bottom-left for the "SKILLS" heading to sit in.
const ROWS = [
  { cards: SKILLS.slice(0, 3).map((skill, i) => ({ skill, i })), justify: 'justify-start' },
  { cards: SKILLS.slice(3, 6).map((skill, i) => ({ skill, i: i + 3 })), justify: 'justify-end' },
  { cards: SKILLS.slice(6, 8).map((skill, i) => ({ skill, i: i + 6 })), justify: 'justify-end' },
]

// 0 -> 180 -> 360deg across the whole scroll: flips shut (content -> blank)
// in a diagonal wave from the bottom-right first, then keeps turning the
// same way (not reversing) to flip back open (blank -> content) in a
// diagonal wave from the top-left first.
function rotationFor(progress, diag) {
  const di = diag / MAX_DIAG
  if (progress <= 0.5) {
    const t = progress / 0.5
    const offset = (1 - di) * STAGGER
    const local = clamp01((t - offset) / (1 - STAGGER))
    return local * 180
  }
  const t = (progress - 0.5) / 0.5
  const offset = di * STAGGER
  const local = clamp01((t - offset) / (1 - STAGGER))
  return 180 + local * 180
}

function CardFace({ title, desc, list, level }) {
  return (
    <div className="absolute inset-0 rounded-[8px] overflow-hidden [backface-visibility:hidden] flex flex-col">
      <div className="flex-1 bg-white text-black flex flex-col justify-between gap-[10px] p-[18px]">
        <div className="flex flex-col gap-[5px]">
          <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[28px] tracking-[-0.1em] leading-none">
            {title}
          </p>
          {list ? (
            <div className="flex flex-col items-center gap-[6px] text-[18px] tracking-[-0.1em] leading-none">
              {list.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p className="font-['Pretendard'] text-[18px] tracking-[-0.1em] leading-none">{desc}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 h-[64px] bg-[#0492bd] flex items-center justify-end px-[18px]">
        <p className="font-['JetBrains_Mono'] font-semibold text-white text-[24px] tracking-[-0.1em] leading-none">
          {level}
        </p>
      </div>
    </div>
  )
}

export default function SkillsSection() {
  const sectionRef = useRef(null)
  const cardRefs = useRef([])
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const section = sectionRef.current
    let ticking = false

    function render() {
      const rect = section.getBoundingClientRect()
      const scrollable = section.offsetHeight - window.innerHeight
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0

      cardRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `rotateY(${rotationFor(raw, SKILLS[i].diag)}deg)`
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

  useEffect(() => {
    // Scale to the viewport width (minus a 20px margin each side), not the
    // smaller of width/height — the canvas fills the screen edge-to-edge
    // (aside from that margin) with its ratio intact, rather than being
    // letterboxed to whichever dimension is tighter.
    function updateScale() {
      setScale((window.innerWidth - 40) / DESIGN_WIDTH)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <section ref={sectionRef} className="section-skills relative h-[260vh] bg-[#06252e]">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="relative shrink-0" style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transform: `scale(${scale})` }}>
          <div
            className="absolute flex flex-col gap-[15px]"
            style={{ left: GRID_LEFT, top: GRID_TOP, width: GRID_WIDTH }}
          >
            {ROWS.map((row, r) => (
              <div key={r} className={`flex gap-[16px] ${row.justify}`}>
                {row.cards.map(({ skill, i }) => (
                  <div key={skill.title} className="relative shrink-0 [perspective:1600px]" style={{ width: 457, height: 239 }}>
                    <div
                      ref={(el) => { cardRefs.current[i] = el }}
                      className="absolute inset-0 [transform-style:preserve-3d] will-change-transform"
                    >
                      <CardFace {...skill} />
                      <div className="absolute inset-0 rounded-[8px] bg-[#0492bd] [backface-visibility:hidden] [transform:rotateY(180deg)]" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p
            className="absolute font-['Plus_Jakarta_Sans'] font-semibold leading-none text-white whitespace-nowrap tracking-[-0.1em]"
            style={{ left: 30, top: 288, fontSize: 120 }}
          >
            SKILLS
          </p>
        </div>
      </div>
    </section>
  )
}
