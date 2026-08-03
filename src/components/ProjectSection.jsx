import { useEffect, useRef } from 'react'
import cardPhoto from '../assets/project/card-photo.png'
import cardView from '../assets/project/card-view.png'
import cardSantal33 from '../assets/project/card-santal33.png'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
// crop replicates the exact framing from Figma (custom pan/zoom on the
// source image), not a generic auto-cover fit.
// Each card is a face of the same cube — a true 90deg apart, front/right/
// back/left, sitting close to the cube's own center (small radius) instead
// of spread out on a wide, flat-looking circle.
const CARDS = [
  { angle: 0, image: cardPhoto, tabColor: '#2686e7' },
  {
    angle: 90,
    image: cardView,
    tabColor: '#78db44',
    crop: { width: '117.83%', height: '167.82%', left: '-8.84%', top: '-20.03%' },
  },
  {
    angle: 180,
    image: cardSantal33,
    tabColor: '#ff4800',
    crop: { width: '122.09%', height: '100%', left: '0.07%', top: '-0.01%' },
  },
  // Placeholder 4th card — swap `image` for a real one whenever you have it.
  { angle: 270, image: cardPhoto, tabColor: '#9b5de5' },
]
// Not a multiple of 360 on purpose — lands slightly off the baseline
// angles at rest, so the 0deg/180deg cards don't end up perfectly
// eclipsing each other.
const TOTAL_SPIN_DEG = 660

// Scroll-progress (0-1) at which the folder locks into its final,
// permanent resting frame.
const FOLDER_STOP_AT = 0.6
// Section is h-[280vh] below, so 140vh is its vertical midpoint — not just
// the viewport center, but the center of the whole scrollable section.
const SECTION_HEIGHT_VH = 280
const TEXT_FROM_TOP = SECTION_HEIGHT_VH / 2
const START_OFFSET_VH = -12.5 // folder's base starting position, vh from center
const EXTRA_GAP_PX = 75 // additional gap pushed in on top of the base starting position

export default function ProjectSection() {
  const sectionRef = useRef(null)
  const groupRef = useRef(null)
  const spinRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const group = groupRef.current
    const spin = spinRef.current
    let ticking = false

    function render() {
      const rect = section.getBoundingClientRect()
      const scrollable = section.offsetHeight - window.innerHeight
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0

      // Folder is already sitting in view (near the top, waiting) the
      // moment this section begins, then eases down past dead-center and
      // settles exactly as far below as it started above — the end offset
      // mirrors the start offset instead of using its own fixed amount, so
      // the travel above and below "PROJECT" is symmetric. Scrolling back
      // up reverses it, since it's just a direct function of the current
      // scroll position. "PROJECT" isn't part of this at all — see the
      // plain, non-sticky <p> below.
      const startOffsetPx = (START_OFFSET_VH / 100) * window.innerHeight + EXTRA_GAP_PX
      const folderT = clamp01(raw / FOLDER_STOP_AT)
      const folderY = startOffsetPx * (1 - 2 * folderT)

      // Rotation is driven by scroll distance since the folder first peeks
      // into view — including the natural pre-stick entrance, before this
      // section locks in place — so it starts spinning the instant it
      // appears (and un-spins just as readily when you scroll back up).
      // Runs across the section's entire scrollable range rather than
      // stopping at FOLDER_STOP_AT like the position does, so it keeps
      // spinning (even after the folder itself has settled in place) all
      // the way until the section ends.
      const enteredPx = window.innerHeight - rect.top
      const folderRangePx = window.innerHeight + scrollable
      const spinT = clamp01(enteredPx / folderRangePx)
      const totalSpinDeg = spinT * TOTAL_SPIN_DEG
      spin.style.transform = `rotateY(${totalSpinDeg}deg)`

      group.style.transform = `translateY(${folderY}px)`

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
    <section ref={sectionRef} className="section-project relative h-[280vh] bg-[#06252e]">
      {/* Plain, non-sticky — keeps a constant gap below the landing section
          and scrolls away with the page like ordinary content, which is
          what makes it read as "rising up" past the folder. */}
      <p
        className="absolute left-0 z-0 w-full flex items-center justify-center font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(48px,8vw,150px)] tracking-[clamp(-8px,-0.8vw,-15px)] text-white"
        style={{ top: `${TEXT_FROM_TOP}vh` }}
      >
        PROJECT
      </p>

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-10 flex items-center justify-center [perspective:900px]">
          <div ref={groupRef} className="will-change-transform">
            <div ref={spinRef} className="relative w-[clamp(180px,18vw,343px)] h-[clamp(260px,27vw,522px)] [transform-style:preserve-3d] will-change-transform">
              {CARDS.map(({ angle, image, tabColor, crop }) => (
                <div
                  key={angle}
                  className="absolute inset-0 rounded-[15px]"
                  style={{ transform: `rotateY(${angle}deg) translateZ(clamp(270px,27vw,515px))` }}
                >
                  <div className="absolute inset-0 rounded-[15px] overflow-hidden">
                    {crop ? (
                      <img src={image} alt="" className="absolute max-w-none" style={crop} />
                    ) : (
                      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="absolute right-0 top-[3.5%] h-[24%] w-[11%] translate-x-full rounded-r-[10px]" style={{ backgroundColor: tabColor }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
