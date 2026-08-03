import { useEffect, useRef, useState } from 'react'
import role1Img from '../assets/role/1.png'
import role2Img from '../assets/role/2.png'
import role3Img from '../assets/role/3.png'
import role4Img from '../assets/role/4.png'
import role5Img from '../assets/role/5.png'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoothstep = (t) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
const lerp = (a, b, t) => a + (b - a) * t

// One continuous story, driven by one circle, across two acts:
//  Act 1 (steps 0-6): the "every role" wheel — START, then 5 roles
//    orbiting a shared center slot, then converging into a single grown
//    circle.
//  Act 2 (steps 7-10): that exact same circle (role 5's — see the
//    survivor logic below) keeps moving, becoming the "about" section's
//    background blob for three career chapters and a closing contact
//    card.
// Same 1920x1080 design canvas + scale-to-fit approach throughout.
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

const ROLES = [
  { n: 1, title: 'Daughter', desc: '표현이 서툰 부모님을 위해,\n먼저 원하는 걸 제안할 줄 아는 딸', img: role1Img, imgFit: { position: 'center' } },
  { n: 2, title: 'Older sister', desc: '내가 겪은 불편을 동생은 겪지 않도록 살피는 언니이자 누나', img: role2Img, imgFit: { position: 'center' } },
  { n: 3, title: 'Friend', desc: '사소한 말도 기억하고 챙기는 친구', img: role3Img, imgFit: { position: 'center' } },
  { n: 4, title: 'Student', desc: '옳다고 생각한 일은 스스로 해내던 학생', img: role4Img, imgFit: { custom: { width: '100%', height: '138.64%', left: '0%', top: '-11.25%' } } },
  { n: 5, title: 'Employee', desc: '맡은 일은 방법을 찾아내서라도 끝내는 직원', img: role5Img, imgFit: { position: 'center' } },
]

// Fixed screen slots the 5 circles occupy during the wheel (absolute px
// on the design canvas), shifted as a whole group so the composition
// sits centered on the canvas. CENTER holds the currently-focused role,
// and each circle steps CENTER -> A -> C -> D -> B -> CENTER as the
// wheel advances one role at a time.
const CENTER_OFFSET = { x: -50, y: -49 }
const CENTER_POS = { x: 970 + CENTER_OFFSET.x, y: 546 + CENTER_OFFSET.y }
const A_POS = { x: 574.5 + CENTER_OFFSET.x, y: 686 + CENTER_OFFSET.y }
const C_POS = { x: 455.5 + CENTER_OFFSET.x, y: 866 + CENTER_OFFSET.y }
const D_POS = { x: 1484.5 + CENTER_OFFSET.x, y: 866 + CENTER_OFFSET.y }
const B_POS = { x: 1365.5 + CENTER_OFFSET.x, y: 686 + CENTER_OFFSET.y }
const SLOT_SEQUENCE = [CENTER_POS, A_POS, C_POS, D_POS, B_POS]
const CIRCLE_SIZE = 80
const GROWN_SIZE = 878

const IMAGE_BOX = { x: 687 + CENTER_OFFSET.x, y: 232 + CENTER_OFFSET.y, width: 647, height: 350 }
const TEXT_BOX = { x: 719 + CENTER_OFFSET.x, y: 761 + CENTER_OFFSET.y, width: 560 }

// "START" isn't a separate page — it's simply what sits at the CENTER
// slot before role 1 arrives there. There is no 6th slot for it: at
// centerValue 0, role 5 is the one that's naturally sitting at CENTER
// (the wheel is a 5-cycle, so position 0 == position 5), so role 5's
// circle stays hidden there and this title/START content shows in its
// place until the wheel starts turning and role 5 rotates out to reveal
// its own circle underneath.
const START_TITLE_BOX_WIDTH = 560
const START_TITLE_GAP = 66
const START_TITLE_BOX = {
  x: CENTER_POS.x + CIRCLE_SIZE / 2 - START_TITLE_BOX_WIDTH / 2,
  bottom: DESIGN_HEIGHT - CENTER_POS.y + START_TITLE_GAP,
  width: START_TITLE_BOX_WIDTH,
}
const START_FADE_WINDOW = 0.35

// Where role 5's circle goes once it stops being a wheel slot and
// becomes the sole background blob — step 7's position is *derived*
// from CENTER_POS (not read off Figma) so it lands exactly where the
// wheel's own convergence math already puts the circle at step 6, with
// zero jump: same center point (CENTER_POS + half its size), just a
// bigger radius.
const BLOB_CENTER_X = CENTER_POS.x + CIRCLE_SIZE / 2
const BLOB_CENTER_Y = CENTER_POS.y + CIRCLE_SIZE / 2
const BLOB_STEPS = [
  { x: BLOB_CENTER_X - GROWN_SIZE / 2, y: BLOB_CENTER_Y - GROWN_SIZE / 2, size: GROWN_SIZE }, // 7: "Role / Led me to a career"
  { x: -570, y: -86, size: 1252 }, // 8: SOCIALWORKER
  { x: -570, y: -86, size: 1252 }, // 9: CHANGE part 1
  { x: -570, y: -86, size: 1252 }, // 10: CHANGE part 2
  { x: -570, y: -86, size: 1252 }, // 11: UXUI DESIGNER
]
// Steps run 0-11 below (12 positions); the outro/contact card is the
// 12th and reuses the same blob-tween mechanism.
const OUTRO_BLOB = { x: 519, y: 99, size: 882 }

// The blob sits still at this same spot for all three chapters — so this
// is also the fixed pivot each chapter's word/title/paragraph rotates
// around (see CHAPTERS' transform-origin below), instead of each
// spinning around its own center.
const CHAPTER_BLOB = BLOB_STEPS[1]
const CHAPTER_PIVOT = {
  x: CHAPTER_BLOB.x + CHAPTER_BLOB.size / 2,
  y: CHAPTER_BLOB.y + CHAPTER_BLOB.size / 2,
}

// Each chapter's word + text block sit flat (0deg) at rest — matching
// Figma's node 160:160 exactly — and only rotate as a transition: as the
// chapter arrives or leaves, it swings through this many degrees rather
// than simply crossfading in place.
const ROTATE_SPIN = -360
const CHAPTER_TITLE_POS = { x: 118, y: 217 }
const WORD_RIGHT = 1249
const WORD_TOP = 492

// Each chapter is anchored to the step(s) it owns — a single step for
// SOCIALWORKER/UXUI DESIGNER, and both 8 and 9 for CHANGE, whose
// paragraph is long enough to need two pages of its own.
const CHAPTERS = [
  {
    anchorStart: 7,
    anchorEnd: 7,
    word: 'SOCIALWORKER',
    title: '니즈를 찾고 충족시키는 일',
    box: { x: 774, y: 467, width: 621 },
    dark: true,
    paragraph: [
      '사회복지사는 결국 클라이언트의 니즈를 파악하고',
      '이를 해결하는 사람이라고 생각합니다',
      '여기서 니즈는 클라이언트가 요구하는 것만을',
      '의미하지 않습니다',
      '미처 말하지 못했거나, 생존에 필요한 것 등',
      '삶의 질을 높이는 데 필요한 모든 것을 말합니다.',
      '4년간 정신건강사회복지사로 일하며,',
      '저는 사람들의 말해지지 않은 니즈를 읽고',
      '충족시키는 일에 힘썼습니다.',
    ].join('\n'),
  },
  {
    anchorStart: 8,
    anchorEnd: 9,
    word: 'CHANGE',
    // This chapter's copy is not laid out on the shared design canvas at
    // all. It's rendered twice — once white, once black — inside the two
    // layers that ride the wipe (see ChangeCopy below), so word, title
    // and paragraph are all bolted to the wipe's own edge and travel with
    // it. Nothing here animates its own color: the black/white split
    // simply is wherever that edge currently falls.
    ridesWipe: true,
    title: '개입시점의 고민',
    box: { x: 740, y: 465, width: 722 },
    dark: false,
    paragraph: [
      '보통 클라이언트의 핵심 니즈는 문제해결이었습니다',
      '그러나 그 문제에 대해 사회복지사로서 할 수 있는',
      '저의 역할은 한정적이었습니다.',
      '스스로를 도구 삼아 클라이언트의 생활에 개입하여',
      '수습하는 것이 전부였고,',
      '개입은 늘 문제가 발생한 이후에 이어졌습니다.',
      '문제가 생기기 전에 막을 수는 없을까?',
      '이 고민의 끝에서 디자인을 만났습니다.',
      '저는 무언가를 막아설 때보다 조금씩 나아지게 만들 때',
      '힘을 얻는 사람입니다.',
      '그래서 사용자가 겪을 불편을 미리 읽어',
      '애초에 문제가 되지 않도록 설계하는 일이',
      '제 기질과 맞았습니다.',
      '도망친 것이 아니라, 개입의 시점을 사후에서',
      '사전으로 재정의한 것입니다.',
    ].join('\n'),
  },
  {
    anchorStart: 10,
    anchorEnd: 10,
    word: 'UXUI DESIGNER',
    title: '스스로 답을 찾다',
    box: { x: 753, y: 447, width: 770 },
    dark: false,
    paragraph: [
      '제가 일했던 기관은 규모가 작아 한 직원이',
      '대부분의 업무를 맡았고, 정해진 체계가 없었습니다',
      '그래서 풀어야 할 일이나 정해야 할 방향이 생기면',
      '스스로 답을 찾아야 했습니다',
      '과거 자료를 조사하고 동료와 논의하며 해결책을 찾았고,',
      '그 과정에서 협업을 위한 소통과 필요한 체계를 세우는 법을 익혔습니다.',
      '디자인을 하는 지금도 마찬가지입니다.',
      '막히는 지점이 있으면 방법을 찾아 풀어내고,',
      '그 과정에서 기록과 AI를 도구로 활용합니다.',
      '리서치 정리, 프로토타이핑, 문서화에 AI를 쓰고,',
      '지금 보고 계신 이 사이트도 직접 설계하고 만들었습니다.',
    ].join('\n'),
  },
]

const CHANGE_CHAPTER = CHAPTERS.find((c) => c.ridesWipe)

// CHANGE's paragraph is the one piece of copy too long to sit on screen
// whole, so it reads through a fixed window instead — exactly a scrollbox,
// minus the bar. The text stays one uninterrupted block; the window shows
// 8 of its 15 lines and simply cuts the rest off at its own edge, and
// paging scrolls that block up by one full window (see applyRaw). Nothing
// fades: a line leaves by being sliced away at the top edge, the way it
// would in any scrolling text box.
const CHANGE_PARA_LINE_HEIGHT = 24 * 1.3
const CHANGE_PARA_WINDOW_HEIGHT = CHANGE_PARA_LINE_HEIGHT * 8

// CHANGE's copy, at its plain design-canvas coordinates — identical
// markup to what every other chapter puts on the canvas, except the color
// is left to the caller. Rendered twice, into the two layers that ride
// the wipe: white into the one clipped to the uncovered side, black into
// the one clipped to the covered side. Neither copy ever changes color;
// each is simply cut off at the wipe's edge, and the two cuts are the
// same line, so the two halves always meet exactly.
function ChangeCopy({ tone, paraRef }) {
  return (
    <>
      <p
        className={`absolute font-['Plus_Jakarta_Sans'] font-bold text-[70px] tracking-[-0.02em] leading-[1.2] text-right whitespace-nowrap ${tone}`}
        style={{ right: WORD_RIGHT, top: WORD_TOP }}
      >
        {CHANGE_CHAPTER.word}
      </p>
      <div
        className="absolute flex flex-col gap-[42px] items-start"
        style={{ left: CHANGE_CHAPTER.box.x, top: CHANGE_CHAPTER.box.y, width: CHANGE_CHAPTER.box.width }}
      >
        <p className={`font-['Pretendard'] font-bold text-[50px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap ${tone}`}>
          {CHANGE_CHAPTER.title}
        </p>
        <div className="w-full overflow-hidden" style={{ height: CHANGE_PARA_WINDOW_HEIGHT }}>
          <p
            ref={paraRef}
            className={`font-['Pretendard'] text-[24px] tracking-[-0.02em] leading-[1.3] whitespace-pre-line [word-break:keep-all] ${tone}`}
          >
            {CHANGE_CHAPTER.paragraph}
          </p>
        </div>
      </div>
    </>
  )
}

const CONTACT_BOX = { x: 1066, y: 740 }

const REVEAL_WINDOW = 0.2
// Chapters use a much wider window than the role wheel's quick fades:
// the outgoing chapter should still be visible (mid-spin) handing off to
// the incoming one, not fade to a blank gap before it rotates in — so
// this spans the full half-step to the neighboring chapter, crossfading
// exactly at the midpoint.
const CHAPTER_REVEAL_WINDOW = 0.5
// 12 steps (0-11): 0 START, 1-5 roles, 6 grown handoff title, 7
// SOCIALWORKER, 8-9 CHANGE (8 arrives with its paragraph's first page, 9
// pages down to the rest), 10 UXUI DESIGNER, 11 outro contact.
const STEP_COUNT = 11
const STEP_RAW = Array.from({ length: STEP_COUNT + 1 }, (_, i) => i / STEP_COUNT)
const TWEEN_DURATION_MS = 600
const SWIPE_THRESHOLD = 40

// C -> D is the one leg that would run straight across the bottom of the
// canvas, and the role's description sits right in its path — same
// height, and spanning most of the width the circle would cross. So this
// leg is never travelled: the circle fades out standing still at C, is
// moved over to D while nobody can see it, and fades back in there. The
// crossing has no on-screen motion of any kind.
//
// C itself is never left empty by this — one circle fading out of C and
// the next arriving into it from A are two different circles, and the
// arrival is a normal leg. Only the departing one is cut.
const HIDDEN_LEG = 2
const HIDDEN_FADE = 0.35

// Continuous position for role number `r` when the wheel's focus sits at
// `centerValue` (a real number, e.g. 2.4 = 40% of the way from role 2 to
// role 3). Matches the Figma keyframes exactly at integer centerValues —
// every leg lands on its slot fully visible, so no circle is ever hidden
// at rest, only mid-turn.
function slotFor(r, centerValue) {
  const e = ((centerValue - r) % 5 + 5) % 5
  const i = Math.floor(e)
  const frac = smoothstep(e - i)
  const from = SLOT_SEQUENCE[i]
  const to = SLOT_SEQUENCE[(i + 1) % 5]
  if (i !== HIDDEN_LEG) {
    return { x: lerp(from.x, to.x, frac), y: lerp(from.y, to.y, frac), visible: 1 }
  }
  // The jump from one end to the other happens at the halfway point,
  // where both fades have already bottomed out at zero — so the circle
  // is never once drawn anywhere between C and D.
  const landed = frac >= 0.5
  const slot = landed ? to : from
  return {
    x: slot.x,
    y: slot.y,
    visible: landed
      ? smoothstep(clamp01((frac - (1 - HIDDEN_FADE)) / HIDDEN_FADE))
      : 1 - smoothstep(clamp01(frac / HIDDEN_FADE)),
  }
}

export default function CareerSection() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasLayerRef = useRef(null)
  const circlesLayerRef = useRef(null)
  const startPanelRef = useRef(null)
  const startCircleRef = useRef(null)
  const roleRefs = useRef([])
  const circleRefs = useRef([])
  const numberRefs = useRef([])
  const changeWipeRef = useRef(null)
  const changeWhiteLayerRef = useRef(null)
  const changeWhiteCanvasRef = useRef(null)
  const changeBlackLayerRef = useRef(null)
  const changeBlackCanvasRef = useRef(null)
  const changeWhiteParaRef = useRef(null)
  const changeBlackParaRef = useRef(null)
  const chapterTitleRef = useRef(null)
  const chapterRefs = useRef([])
  const contactRef = useRef(null)
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)

  useEffect(() => {
    function updateScale() {
      const next = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
      scaleRef.current = next
      setScale(next)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    const section = sectionRef.current

    function applyRaw(raw) {
      const stepPos = raw * STEP_COUNT

      // Act 1, phase A: the wheel — 0 (START at center) to 5 (role 5).
      const wheelPos = Math.min(5, stepPos)
      const wheelIdx = Math.min(4, Math.floor(wheelPos))
      const wheelLocal = wheelPos - wheelIdx
      const centerValue = wheelIdx + smoothstep(wheelLocal)

      const startT = smoothstep(clamp01(centerValue / START_FADE_WINDOW))
      startPanelRef.current.style.opacity = String(1 - startT)

      // Act 1, phase B: 5 -> 6, converge + grow into one blob.
      const collapsePos = clamp01(stepPos - 5)
      const convergeT = smoothstep(clamp01(collapsePos / 0.6))
      const growT = smoothstep(clamp01((collapsePos - 0.3) / 0.7))
      const numberT = smoothstep(clamp01(collapsePos / 0.15))
      const circleScale = lerp(1, GROWN_SIZE / CIRCLE_SIZE, growT)
      const circleOpacity = lerp(1, 0.5, growT)

      const s = scaleRef.current
      const canvasOffsetX = (window.innerWidth - DESIGN_WIDTH * s) / 2
      const canvasOffsetY = (window.innerHeight - DESIGN_HEIGHT * s) / 2
      const baseSize = CIRCLE_SIZE * s
      const grownSize = baseSize * circleScale

      startCircleRef.current.style.left = `${canvasOffsetX + CENTER_POS.x * s}px`
      startCircleRef.current.style.top = `${canvasOffsetY + CENTER_POS.y * s}px`
      startCircleRef.current.style.width = `${baseSize}px`
      startCircleRef.current.style.height = `${baseSize}px`
      startCircleRef.current.style.opacity = String(1 - startT)

      for (let r = 1; r <= 5; r++) {
        const el = circleRefs.current[r - 1]
        if (!el) continue
        const base = slotFor(r, centerValue)
        const dx = lerp(base.x, CENTER_POS.x, convergeT)
        const dy = lerp(base.y, CENTER_POS.y, convergeT)
        const centerX = canvasOffsetX + dx * s + baseSize / 2
        const centerY = canvasOffsetY + dy * s + baseSize / 2
        el.style.left = `${centerX - grownSize / 2}px`
        el.style.top = `${centerY - grownSize / 2}px`
        el.style.width = `${grownSize}px`
        el.style.height = `${grownSize}px`
        // Role 5 is the one hiding behind the START circle near
        // centerValue 0, and the one that survives the convergence to
        // become the sole blob for the rest of the story — the other 4
        // fade out as they arrive so 5 stacked translucent layers don't
        // compound into something far more opaque than the single blob.
        const survivorFade = r === 5 ? 1 : 1 - convergeT
        el.style.opacity = String(circleOpacity * (r === 5 ? startT : 1) * survivorFade * base.visible)
        const numberEl = numberRefs.current[r - 1]
        if (numberEl) {
          numberEl.style.opacity = String(1 - numberT)
          numberEl.style.fontSize = `${48 * s}px`
        }
      }

      // Circles paint above the role photos during the wheel (so the one
      // sitting right below a photo is never clipped by it), then below
      // the canvas once past the handoff, since the survivor becomes a
      // background blob that chapter text needs to sit on top of.
      // Strictly < 6, not <=: at step 6 itself the "Role / Led me to a
      // career" title needs to sit in front of the now-grown blob, not
      // behind it.
      circlesLayerRef.current.style.zIndex = stepPos < 6 ? '2' : '0'
      canvasLayerRef.current.style.zIndex = '1'

      // Act 2: past step 6, role 5's circle (still the very same element)
      // keeps moving through the chapter/outro blob positions instead of
      // the wheel's — picking up exactly where the convergence left it.
      if (stepPos > 6) {
        const blobPos = Math.min(5, stepPos - 6)
        const blobIdx = Math.min(4, Math.floor(blobPos))
        const blobLocal = blobPos - blobIdx
        const bt = smoothstep(blobLocal)
        const steps = [...BLOB_STEPS, OUTRO_BLOB]
        const bFrom = steps[blobIdx]
        const bTo = steps[blobIdx + 1]
        const bx = lerp(bFrom.x, bTo.x, bt)
        const by = lerp(bFrom.y, bTo.y, bt)
        const bsize = lerp(bFrom.size, bTo.size, bt)
        const survivor = circleRefs.current[4]
        if (survivor) {
          survivor.style.left = `${canvasOffsetX + bx * s}px`
          survivor.style.top = `${canvasOffsetY + by * s}px`
          survivor.style.width = `${bsize * s}px`
          survivor.style.height = `${bsize * s}px`
          survivor.style.opacity = '0.5'
        }
      }

      // The section only flips fully white once the wipe has actually
      // finished covering everything, on its way OUT to UXUI DESIGNER
      // (step 10) — not partway through CHANGE. During CHANGE itself the
      // background stays this dark navy as the base color, with the wipe
      // rectangle painting white on top of whatever it currently covers.
      section.style.backgroundColor = stepPos >= 10 ? '#ffffff' : '#06252e'

      // CHANGE is a rectangle three times the viewport's size (300vw x
      // 300vh), pinned by the midpoint of its own long (top) edge to a
      // fixed point at the vertical center of the screen's left edge,
      // rotating counter-clockwise around that point. It turns in from
      // fully off-screen to exactly flat (0deg) as CHANGE arrives — flat
      // is the half-covering pose, boundary running straight across the
      // screen — and HOLDS there through both of CHANGE's own steps
      // (word/title/paragraph all read their black-vs-white off this
      // same still boundary the whole time). Only once CHANGE is leaving
      // for UXUI DESIGNER (steps 9->10) does it keep turning the rest of
      // the way to fully cover everything.
      const wipeW = window.innerWidth * 3
      const wipeH = window.innerHeight * 3
      const entryT = smoothstep(clamp01(stepPos - 7))
      let wipeAngle
      if (stepPos <= 8) {
        wipeAngle = 90 * (1 - entryT)
      } else if (stepPos <= 9) {
        wipeAngle = 0
      } else {
        const exitT = smoothstep(clamp01(stepPos - 9))
        wipeAngle = -90 * exitT
      }
      const wipeLeft = -wipeW / 2
      const wipeTop = window.innerHeight / 2
      const wipeOriginX = wipeW / 2
      const wipeOriginY = 0
      changeWipeRef.current.style.width = `${wipeW}px`
      changeWipeRef.current.style.height = `${wipeH}px`
      changeWipeRef.current.style.left = `${wipeLeft}px`
      changeWipeRef.current.style.top = `${wipeTop}px`
      changeWipeRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeOriginY}px`
      changeWipeRef.current.style.transform = `rotate(${wipeAngle}deg)`

      // CHANGE's whole text block is bolted to the wipe and travels with
      // it, so its black/white split is never animated — the split simply
      // IS the wipe's own edge, at whatever angle that edge happens to be
      // in right now. Two layers carry it, both turning around the exact
      // same pivot by the exact same wipeAngle:
      //
      //   BLACK is the wipe's own box, so its overflow:hidden clips the
      //         copy to precisely the covered side.
      //   WHITE is the mirror box sitting directly above that same edge
      //         (top shifted up by one full height, origin moved to its
      //         bottom edge), so it clips to precisely the uncovered side.
      //
      // The two clip edges are therefore the same screen line by
      // construction, not two things kept in sync: at any angle the
      // halves meet exactly, with no seam and no overlap. Each layer holds
      // a plain copy of the design canvas (see ChangeCopy), so word,
      // title and paragraph all ride together as one printed board — they
      // tilt on the way in, land flat when the wipe stops, and tilt away
      // again on the way out.
      const rideX = wipeOriginX + canvasOffsetX
      const rideY = canvasOffsetY - wipeTop
      changeBlackLayerRef.current.style.width = `${wipeW}px`
      changeBlackLayerRef.current.style.height = `${wipeH}px`
      changeBlackLayerRef.current.style.left = `${wipeLeft}px`
      changeBlackLayerRef.current.style.top = `${wipeTop}px`
      changeBlackLayerRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeOriginY}px`
      changeBlackLayerRef.current.style.transform = `rotate(${wipeAngle}deg)`
      changeBlackCanvasRef.current.style.left = `${rideX}px`
      changeBlackCanvasRef.current.style.top = `${rideY}px`
      changeBlackCanvasRef.current.style.transform = `scale(${s})`

      changeWhiteLayerRef.current.style.width = `${wipeW}px`
      changeWhiteLayerRef.current.style.height = `${wipeH}px`
      changeWhiteLayerRef.current.style.left = `${wipeLeft}px`
      changeWhiteLayerRef.current.style.top = `${wipeTop - wipeH}px`
      changeWhiteLayerRef.current.style.transformOrigin = `${wipeOriginX}px ${wipeH}px`
      changeWhiteLayerRef.current.style.transform = `rotate(${wipeAngle}deg)`
      changeWhiteCanvasRef.current.style.left = `${rideX}px`
      changeWhiteCanvasRef.current.style.top = `${rideY + wipeH}px`
      changeWhiteCanvasRef.current.style.transform = `scale(${s})`

      // At the extreme angles the board is swung almost entirely off
      // screen, but a sliver of the word can still clip the pivot corner —
      // so both layers fade in together at the very start of the swing in
      // and out together at the very end of the swing out. One shared
      // value for both, so a fade can never break the half-and-half.
      const rideOpacity =
        smoothstep(clamp01((stepPos - 7) / 0.35)) *
        (1 - smoothstep(clamp01((stepPos - 9.65) / 0.35)))
      changeBlackLayerRef.current.style.opacity = String(rideOpacity)
      changeWhiteLayerRef.current.style.opacity = String(rideOpacity)

      // Steps 8 and 9 both belong to CHANGE, with the wipe held perfectly
      // still between them — so step 9, which until now changed nothing on
      // screen at all, is where the paragraph pages. It scrolls by exactly
      // one window height, so the line that ended page one lands right
      // above the window and the next line lands at its top: a plain page
      // down, no fade, each line leaving by being sliced off at the edge.
      // Both copies take the identical offset, so the black/white split
      // can't drift apart mid-scroll.
      const paraScroll = -CHANGE_PARA_WINDOW_HEIGHT * smoothstep(clamp01(stepPos - 8))
      const paraTransform = `translateY(${paraScroll}px)`
      if (changeWhiteParaRef.current) changeWhiteParaRef.current.style.transform = paraTransform
      if (changeBlackParaRef.current) changeBlackParaRef.current.style.transform = paraTransform

      roleRefs.current.forEach((el, i) => {
        if (!el) return
        const dist = Math.abs(centerValue - (i + 1))
        const visible = 1 - smoothstep(clamp01(dist / REVEAL_WINDOW))
        el.style.opacity = String(visible * (1 - convergeT))
      })

      const titleDist = Math.abs(stepPos - 6)
      chapterTitleRef.current.style.opacity = String(1 - smoothstep(clamp01(titleDist / REVEAL_WINDOW)))

      chapterRefs.current.forEach((el, i) => {
        if (!el) return
        const chapter = CHAPTERS[i]
        // Below its start step or above its end step, distance is to
        // whichever edge is nearer; inside its own range (CHANGE spans
        // two steps) it's the focused chapter throughout, distance 0.
        const signedDist =
          stepPos < chapter.anchorStart ? stepPos - chapter.anchorStart
          : stepPos > chapter.anchorEnd ? stepPos - chapter.anchorEnd
          : 0
        const dist = Math.abs(signedDist)
        // The circle "turns" as each chapter's text arrives/leaves: 0deg
        // exactly when it's the focused chapter, swinging away in the
        // direction of travel as it fades. Rotating this whole wrapper
        // (word + title + paragraph together) around the circle's own
        // center — not each element's own center — is what makes the
        // text read as riding on the turning circle, rather than each
        // block spinning in place like its own little pinwheel.
        const clampedDist = Math.min(1, Math.max(-1, signedDist))
        const spin = clampedDist * ROTATE_SPIN
        el.style.opacity = String(1 - smoothstep(clamp01(dist / CHAPTER_REVEAL_WINDOW)))
        el.style.transform = `rotate(${spin}deg)`
      })

      const contactDist = Math.abs(stepPos - 11)
      contactRef.current.style.opacity = String(1 - smoothstep(clamp01(contactDist / REVEAL_WINDOW)))
    }

    // One wheel tick / swipe = one step. Scroll is owned entirely while
    // inside the section's pinned range; at either end it's handed back
    // to normal page scroll.
    let currentRaw = 0
    let stepIndex = 0
    let busy = false
    let rafId = null

    const rect0 = section.getBoundingClientRect()
    const scrollable0 = section.offsetHeight - window.innerHeight
    const initialRaw = scrollable0 > 0 ? clamp01(-rect0.top / scrollable0) : 0
    STEP_RAW.forEach((v, idx) => {
      if (Math.abs(v - initialRaw) < Math.abs(STEP_RAW[stepIndex] - initialRaw)) stepIndex = idx
    })
    currentRaw = STEP_RAW[stepIndex]
    applyRaw(currentRaw)

    function isEngaged() {
      const rect = section.getBoundingClientRect()
      return rect.top <= 1 && rect.bottom >= window.innerHeight - 1
    }

    function tweenTo(target) {
      busy = true
      const start = currentRaw
      const startTime = performance.now()
      function step() {
        const t = clamp01((performance.now() - startTime) / TWEEN_DURATION_MS)
        currentRaw = lerp(start, target, smoothstep(t))
        applyRaw(currentRaw)
        if (t < 1) {
          rafId = requestAnimationFrame(step)
        } else {
          busy = false
        }
      }
      step()
    }

    // The page scroll never drives the steps — the wheel does, and the
    // visuals run entirely off currentRaw — but the page is parked at
    // whichever step is showing anyway, so the section's own scroll range
    // always says how far through it we are. That's what makes leaving
    // work in both directions: at step 0 the page already sits at the
    // section's top edge and at the last step at its bottom edge, so
    // handing back to normal scrolling is a plain hand-off with nothing
    // left to unwind. Without this the page stays wherever it entered,
    // and stepping back to the start leaves the whole scroll range still
    // below you to climb before the previous section comes back.
    function syncScroll() {
      const scrollable = section.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      window.scrollTo({ top: section.offsetTop + STEP_RAW[stepIndex] * scrollable })
    }

    function advance(direction) {
      const next = Math.min(STEP_RAW.length - 1, Math.max(0, stepIndex + direction))
      if (next === stepIndex) return
      stepIndex = next
      syncScroll()
      tweenTo(STEP_RAW[stepIndex])
    }

    function onWheel(e) {
      if (!isEngaged()) return
      const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0
      if (direction === 0) return
      if (busy) {
        e.preventDefault()
        return
      }
      // At either end the page is already parked on that end of the
      // section, so simply not claiming the event hands the gesture
      // straight to the neighbouring section.
      if (direction > 0 && stepIndex >= STEP_RAW.length - 1) return
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
      const y = e.touches[0].clientY
      const delta = touchStartY - y
      if (Math.abs(delta) < SWIPE_THRESHOLD) return
      const direction = delta > 0 ? 1 : -1
      touchStartY = y
      if (direction > 0 && stepIndex >= STEP_RAW.length - 1) return
      if (direction < 0 && stepIndex <= 0) return
      e.preventDefault()
      advance(direction)
    }

    function onResize() {
      applyRaw(currentRaw)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('resize', onResize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    // 200vh = one screen of sticky content plus one screen of scroll range
    // to pin it through. The steps don't read that range — they're driven
    // by the wheel and spaced evenly across it by syncScroll — so its only
    // job is to give the section somewhere to be scrolled, and one screen
    // is enough. Anything longer is dead distance that has to be crossed
    // by hand whenever the step machine and the page scroll disagree.
    <section ref={sectionRef} className="section-career relative h-[200vh] bg-[#06252e]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* CHANGE's white reveal — a viewport-sized rectangle pinned by its
            left-edge-center to that same point on the screen, rotating
            counter-clockwise to cover the whole background white (see
            applyRaw). */}
        <div ref={changeWipeRef} className="absolute bg-white" style={{ width: 0, height: 0 }} />

        {/* CHANGE's copy, riding the wipe. Two layers, both moving and
            turning exactly like the wipe above (all kept identical in
            applyRaw), each holding its own full-color copy of the same
            design canvas and each clipped by its own overflow:hidden.

            The white one's box sits directly above the wipe's edge, the
            black one's box IS the wipe, so between them they cut the copy
            along that one edge and nothing else — the halves can't drift
            apart, because there is only ever one line. Neither copy ever
            recolors or fades on its own; the board just swings in, stops,
            and swings out, and the edge decides what's what. */}
        <div ref={changeWhiteLayerRef} className="absolute overflow-hidden pointer-events-none" style={{ width: 0, height: 0, opacity: 0, zIndex: 3 }}>
          <div ref={changeWhiteCanvasRef} className="absolute" style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transformOrigin: '0 0' }}>
            <ChangeCopy tone="text-white" paraRef={changeWhiteParaRef} />
          </div>
        </div>
        <div ref={changeBlackLayerRef} className="absolute overflow-hidden pointer-events-none" style={{ width: 0, height: 0, opacity: 0, zIndex: 4 }}>
          <div ref={changeBlackCanvasRef} className="absolute" style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transformOrigin: '0 0' }}>
            <ChangeCopy tone="text-black" paraRef={changeBlackParaRef} />
          </div>
        </div>

        {/* START + the 5 role circles — one of which (role 5) becomes the
            sole "about" blob later. Sized/positioned directly in real
            screen px, not via the canvas's transform: scale. Stacking
            flips between the two acts (see circlesLayerRef in applyRaw):
            on top of the canvas during the wheel, so a circle never gets
            clipped by the role photo above it, then behind it once the
            survivor becomes the blob, so it sits under the chapter text. */}
        <div ref={circlesLayerRef} className="absolute inset-0">
          <div
            ref={startCircleRef}
            className="absolute bg-[#0492bd] rounded-full flex items-center justify-center"
            style={{ left: 0, top: 0, width: CIRCLE_SIZE * scale, height: CIRCLE_SIZE * scale }}
          >
            <p className="font-['Plus_Jakarta_Sans'] font-bold text-[#06252e] tracking-[-0.02em] leading-[1.2]" style={{ fontSize: 24 * scale }}>
              START
            </p>
          </div>

          {[1, 2, 3, 4, 5].map((r) => (
            <div
              key={r}
              ref={(el) => { circleRefs.current[r - 1] = el }}
              className="absolute bg-[#0492bd] rounded-full flex items-center justify-center"
              style={{ left: 0, top: 0, width: CIRCLE_SIZE * scale, height: CIRCLE_SIZE * scale }}
            >
              <p
                ref={(el) => { numberRefs.current[r - 1] = el }}
                className="font-['Plus_Jakarta_Sans'] font-bold text-[#06252e] tracking-[-0.02em] leading-[1.2]"
                style={{ fontSize: 48 * scale }}
              >
                {r}
              </p>
            </div>
          ))}
        </div>

        <div ref={canvasLayerRef} className="absolute inset-0 flex items-center justify-center">
          <div ref={canvasRef} className="relative shrink-0" style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transform: `scale(${scale})` }}>
            <div
              ref={startPanelRef}
              className="absolute flex flex-col items-center gap-[37px]"
              style={{ left: START_TITLE_BOX.x, bottom: START_TITLE_BOX.bottom, width: START_TITLE_BOX.width }}
            >
              <div className="flex items-start gap-[20px] font-['Plus_Jakarta_Sans'] font-bold text-[#0492bd] text-[84px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap">
                <p>EVERY</p>
                <p className="text-right">ROLE</p>
              </div>
              <p className="font-['Pretendard'] font-medium text-white text-[24px] tracking-[-0.02em] leading-[1.2] text-center">
                제가 맡고 있는 역할로 저를 소개합니다
              </p>
            </div>

            {ROLES.map((role, i) => (
              <div
                key={role.n}
                ref={(el) => { roleRefs.current[i] = el }}
                className="absolute inset-0"
                style={{ opacity: 0 }}
              >
                <div
                  className="absolute overflow-hidden rounded-[8px]"
                  style={{ left: IMAGE_BOX.x, top: IMAGE_BOX.y, width: IMAGE_BOX.width, height: IMAGE_BOX.height }}
                >
                  {role.imgFit.custom ? (
                    <img
                      src={role.img}
                      alt={role.title}
                      className="absolute max-w-none"
                      style={{
                        width: role.imgFit.custom.width,
                        height: role.imgFit.custom.height,
                        left: role.imgFit.custom.left,
                        top: role.imgFit.custom.top,
                      }}
                    />
                  ) : (
                    <img
                      src={role.img}
                      alt={role.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: role.imgFit.position }}
                    />
                  )}
                </div>
                <div
                  className="absolute flex flex-col items-center gap-[29px]"
                  style={{ left: TEXT_BOX.x, top: TEXT_BOX.y, width: TEXT_BOX.width }}
                >
                  <p className="font-['Plus_Jakarta_Sans'] font-bold text-[#0492bd] text-[58px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap">
                    {role.title}
                  </p>
                  <p className="font-['Pretendard'] font-medium text-white text-[24px] tracking-[-0.02em] leading-[1.2] text-center whitespace-pre-line">
                    {role.desc}
                  </p>
                </div>
              </div>
            ))}

            <div
              ref={chapterTitleRef}
              className="absolute flex flex-col font-['Plus_Jakarta_Sans'] font-bold text-white text-[70px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap"
              style={{ left: CHAPTER_TITLE_POS.x, top: CHAPTER_TITLE_POS.y, opacity: 0 }}
            >
              <p>Role</p>
              <p>Led me to a career</p>
            </div>

            {/* CHANGE is absent here on purpose — it lives entirely in the
                two wipe-riding layers above, so it never sits on this
                canvas and never takes this canvas's spin-out exit. */}
            {CHAPTERS.map((chapter, i) => chapter.ridesWipe ? null : (
              <div
                key={i}
                ref={(el) => { chapterRefs.current[i] = el }}
                className="absolute inset-0"
                style={{ opacity: 0, transformOrigin: `${CHAPTER_PIVOT.x}px ${CHAPTER_PIVOT.y}px` }}
              >
                <p
                  className={`absolute font-['Plus_Jakarta_Sans'] font-bold text-[70px] tracking-[-0.02em] leading-[1.2] text-right whitespace-nowrap ${chapter.dark ? 'text-white' : 'text-black'}`}
                  style={{ right: WORD_RIGHT, top: WORD_TOP }}
                >
                  {chapter.word}
                </p>
                <div
                  className="absolute flex flex-col gap-[42px] items-start"
                  style={{ left: chapter.box.x, top: chapter.box.y, width: chapter.box.width }}
                >
                  <p className={`font-['Pretendard'] font-bold text-[50px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap ${chapter.dark ? 'text-white' : 'text-black'}`}>
                    {chapter.title}
                  </p>
                  <p className={`font-['Pretendard'] text-[24px] tracking-[-0.02em] leading-[1.3] whitespace-pre-line [word-break:keep-all] ${chapter.dark ? 'text-white' : 'text-black'}`}>
                    {chapter.paragraph}
                  </p>
                </div>
              </div>
            ))}

            <div
              ref={contactRef}
              className="absolute flex flex-col gap-[42px] items-start text-black"
              style={{ left: CONTACT_BOX.x, top: CONTACT_BOX.y, opacity: 0 }}
            >
              <p className="font-['Pretendard'] font-semibold text-[48px] tracking-[-0.02em] leading-[1.2] whitespace-nowrap">
                더 나은 사용자 경험, 함께 고민하겠습니다
              </p>
              <div className="flex flex-col gap-[10px] items-start font-['Pretendard'] font-medium text-[28px] tracking-[-0.02em] leading-[1.2]">
                <div className="flex items-center justify-between w-[379px]">
                  <p>email</p>
                  <p>| eysj1620@gmail.com</p>
                </div>
                <div className="flex items-center justify-between w-[379px]">
                  <p>이력서</p>
                  <p>| eysj1620@gmail.com</p>
                </div>
                <p>이 사이트는 Claude Code로 직접 만들었습니다</p>
                <p>©2026yunsujeong</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
