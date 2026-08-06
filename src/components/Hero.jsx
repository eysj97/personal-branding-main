import { useEffect, useRef } from "react";
import closedLeft from "../assets/eyes/closed-left.svg";
import closedRight from "../assets/eyes/closed-right.svg";
import halfLeft from "../assets/eyes/half-left.svg";
import halfRight from "../assets/eyes/half-right.svg";
// The open eyes come in as source rather than as a URL: the iris and its
// highlight are their own <g> inside the drawing, and inlining the markup is
// what makes that group reachable so the gaze can move without the eye moving
// with it.
import openLeft from "../assets/eyes/open-left.svg?raw";
import openRight from "../assets/eyes/open-right.svg?raw";

// The open eye is the biggest of the three drawings, so its box is the box:
// 194.808 x 208, which is also the size the hero frame places them at. The vw
// terms are those numbers over the design's 1920 canvas; the px floor stops
// them disappearing on a phone and the ceiling is the design size, so past
// 1920 they stop growing rather than overrunning the composition.
const EYE_ART = { width: 194.808, height: 208 };
const eyeBoxClass =
  "relative w-[clamp(62px,10.146vw,194.81px)] h-[clamp(66px,10.833vw,208px)]";
const eyeFrameClass = "absolute w-full h-full object-contain";

// The closed drawing is its own size — narrower and much shorter than the open
// one, because a shut eye *is* smaller. It is hung from the top of the box and
// centred across it, so the brow line stays put and only the lid travels.
const CLOSED_ART = { width: 180.131, height: 142.522 };
const closedBoxStyle = {
  width: `${(CLOSED_ART.width / EYE_ART.width) * 100}%`,
  height: `${(CLOSED_ART.height / EYE_ART.height) * 100}%`,
  left: `${((EYE_ART.width - CLOSED_ART.width) / 2 / EYE_ART.width) * 100}%`,
  top: 0,
};

/** One eye: the three drawings stacked, crossfaded by the scroll.
 *
 *  The design draws each state once and mirrors one side of it, and which side
 *  gets mirrored is not the same for every state — the shut eye is mirrored on
 *  the right, the other two on the left. `mirrored` is that side's flip for the
 *  open pair, and the shut drawing takes the opposite. */
function Eye({ closed, half, open, mirrored = false }) {
  const flip = mirrored ? "-scale-x-100" : "";
  const closedFlip = mirrored ? "" : "-scale-x-100";
  return (
    <div className={eyeBoxClass}>
      <img
        className={`absolute object-contain ${closedFlip}`}
        style={closedBoxStyle}
        data-state="closed"
        src={closed}
        alt=""
      />
      <img
        className={`${eyeFrameClass} inset-0 ${flip}`}
        data-state="half"
        src={half}
        alt=""
      />
      {/* Inlined, not an <img>: see the note on the import. `[&>svg]` sizes
          the drawing to the box, since the file carries its own width/height. */}
      <span
        className={`absolute inset-0 block ${flip} [&>svg]:h-full [&>svg]:w-full`}
        data-state="open"
        data-mirrored={mirrored ? "" : undefined}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: open }}
      />
    </div>
  );
}

// The bottom-left copy — see the note on the grid that stacks the two
// languages. Everything except the size is shared; Hangul fills more of its em
// box than Latin does, so matching the px would leave the Korean looking the
// heavier of the two. It is set about 10% smaller so the two read at the same
// weight rather than the same number.
const heroLeadBase = "font-semibold leading-[1.2] tracking-[-0.02em]";
const heroBodyBase = "leading-[1.2]";
const heroLeadEnClass = `${heroLeadBase} text-[clamp(22px,2.4vw,36px)]`;
const heroBodyEnClass = `${heroBodyBase} text-[clamp(14px,1.6vw,16px)]`;
const heroLeadKoClass = `${heroLeadBase} text-[clamp(20px,2.133vw,32px)]`;
const heroBodyKoClass = `${heroBodyBase} text-[clamp(13px,1.5vw,15px)]`;

// `null` means the very top of the page; the others are the section each label
// should land on. ABOUT is the career section — that is where the "about me"
// story lives.
const NAV = [
  { label: "HOME", target: null },
  { label: "PROJECT", target: ".section-project" },
  { label: "ABOUT", target: ".section-career" },
];

function goTo(selector) {
  if (!selector) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const section = document.querySelector(selector);
  if (!section) return;
  // Its own top, not scrollIntoView — every section here is a tall scroll
  // track with a sticky stage inside, and their animations all read from
  // "how far into this section are we", so they have to be entered at 0.
  window.scrollTo({
    top: section.getBoundingClientRect().top + window.scrollY,
    behavior: "smooth",
  });
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (from, to, x) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export default function Hero() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const overlayRef = useRef(null);
  const navRef = useRef(null);
  const textEnRef = useRef(null);
  const textKoRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const overlay = overlayRef.current;
    const closedFrames = stageRef.current.querySelectorAll(
      '[data-state="closed"]',
    );
    const halfFrames = stageRef.current.querySelectorAll('[data-state="half"]');
    const openFrames = stageRef.current.querySelectorAll('[data-state="open"]');
    // The iris and its highlight — the only parts of an open eye allowed to
    // move. Picked by id rather than by position: one of the two drawings
    // groups them and the other does not, so anything structural misses an eye.
    // The highlight already carries a transform in one of them, so each one's
    // own is kept and the travel is prepended to it. The mirrored eye needs the
    // sign flipped, or the two look in opposite directions.
    //
    const pupils = [...openFrames].flatMap((frame) => {
      const sign = frame.hasAttribute("data-mirrored") ? -1 : 1;
      return [
        ...frame.querySelectorAll('[id="Ellipse 2"], [id="Ellipse 3"]'),
      ].map((el) => ({
        el,
        sign,
        glint: el.getAttribute("id") === "Ellipse 3",
        base: el.getAttribute("transform") ?? "",
      }));
    });

    // One wheel tick per beat, rather than the animation tracking the
    // scrollbar: eyes shut, then eyes open with the copy in, then the copy in
    // Korean. Values are positions along the same 0-1 timeline the render
    // below already reads, so the keyframes are unchanged — only what drives
    // them is.
    const STEPS = [0, 0.75, 1];
    let stepIndex = 0;
    let current = 0;
    let busy = false;
    let tweenId = null;
    let selfScrollUntil = 0;
    let openAmount = 0;

    function render(progress) {
      // Eyes closed -> open and background black -> teal over the first 60% of the scroll.
      const eyeProgress = clamp01(progress / 0.6);
      overlay.style.opacity = Math.pow(1 - eyeProgress, 1.5);

      // Shut, half, open — handed over one pair at a time rather than all three
      // dissolving across the whole scroll. Each drawing holds, then gives way
      // over a short band: a lid travels, it does not fade, and a long
      // crossfade between two drawings of an eye just reads as a ghost. The
      // bands are eased, so the lid accelerates off its hold and settles into
      // the next one instead of sliding at a constant rate.
      const toHalf = smoothstep(0.3, 0.52, eyeProgress);
      const toOpen = smoothstep(0.76, 1, eyeProgress);
      const openOp = toOpen;
      const halfOp = toHalf * (1 - toOpen);
      const closedOp = 1 - toHalf;
      closedFrames.forEach((el) => {
        el.style.opacity = closedOp;
      });
      halfFrames.forEach((el) => {
        el.style.opacity = halfOp;
      });
      openFrames.forEach((el) => {
        el.style.opacity = openOp;
      });

      // Nav + copy fade in right after the eyes finish opening, then the copy
      // crossfades from English to Korean for the rest of the scroll.
      const revealT = smoothstep(0.55, 0.7, progress);
      const langT = smoothstep(0.8, 1, progress);

      navRef.current.style.opacity = revealT;
      // Fading alone would leave an invisible but still clickable nav sitting
      // over the eyes for the first half of the scroll.
      navRef.current.style.pointerEvents = revealT > 0.5 ? "auto" : "none";
      // The gaze only happens on an open eye, and fades in with it.
      openAmount = openOp;
      textEnRef.current.style.opacity = revealT * (1 - langT);
      textKoRef.current.style.opacity = revealT * langT;

      current = progress;
    }

    function tweenTo(target) {
      busy = true;
      const from = current;
      const startedAt = performance.now();
      function step() {
        const t = clamp01((performance.now() - startedAt) / 700);
        render(from + (target - from) * smoothstep(0, 1, t));
        if (t < 1) {
          tweenId = requestAnimationFrame(step);
        } else {
          busy = false;
          tweenId = null;
        }
      }
      step();
    }

    // Once the eyes are open they look about. A triangle wave eased hard at
    // both ends, so the gaze travels and then dwells at each side rather than
    // sliding back and forth at a constant rate, which reads as a mechanism.
    // In the drawing's own units, which is why it is set as an attribute and
    // not as a CSS transform — those would be in screen px.
    const GAZE_TRAVEL = 13;
    const GAZE_PERIOD = 2600;
    // How much of each half-cycle the eye spends travelling. The rest is the
    // dwell at either side — narrowing this is what makes the move itself
    // quick rather than just cycling more often.
    const GAZE_MOVE = 0.44;
    const GAZE_FROM = (1 - GAZE_MOVE) / 2;
    // How far off the iris's middle the catchlight sits, measured off the
    // drawing: its ellipse is 18 units to one side of the iris's. That drawn
    // position is the eye looking all the way *left*, so the highlight has to
    // cross the iris — from -18 to +18 — as the gaze goes left to right. Moving
    // it with the iris instead would leave it stuck on the same side forever,
    // which is what a sticker does rather than a reflection.
    const GLINT_SWING = 18;
    let gazeId = null;

    function gaze(now) {
      const phase = (now % GAZE_PERIOD) / GAZE_PERIOD;
      const triangle = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      // -1 hard left, +1 hard right.
      const look = smoothstep(GAZE_FROM, 1 - GAZE_FROM, triangle) * 2 - 1;
      const iris = look * GAZE_TRAVEL * openAmount;
      // `look + 1` rather than `look`: at hard left this is zero, which leaves
      // the highlight exactly where the artwork draws it, and it works its way
      // across from there.
      const glint = iris + GLINT_SWING * (look + 1) * openAmount;
      for (const { el, sign, glint: isGlint, base } of pupils) {
        const travel = (isGlint ? glint : iris) * sign;
        el.setAttribute(
          "transform",
          `translate(${travel.toFixed(2)}, 0) ${base}`,
        );
      }
      gazeId = requestAnimationFrame(gaze);
    }

    // Only while the hero is actually on screen.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && gazeId === null) {
          gazeId = requestAnimationFrame(gaze);
        } else if (!entry.isIntersecting && gazeId !== null) {
          cancelAnimationFrame(gazeId);
          gazeId = null;
        }
      },
      { threshold: 0 },
    );
    visibility.observe(section);

    function isEngaged() {
      const rect = section.getBoundingClientRect();
      return rect.top <= 1 && rect.bottom >= window.innerHeight - 1;
    }

    // Park the page on the scroll position that matches the current beat, so
    // that at either end the page already sits on that edge of the section and
    // handing back to normal scrolling has nothing left to unwind.
    function syncScroll() {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      selfScrollUntil = performance.now() + 200;
      window.scrollTo({
        top: section.offsetTop + (stepIndex / (STEPS.length - 1)) * scrollable,
      });
    }

    function advance(direction) {
      const next = Math.min(
        STEPS.length - 1,
        Math.max(0, stepIndex + direction),
      );
      if (next === stepIndex) return;
      stepIndex = next;
      syncScroll();
      tweenTo(STEPS[stepIndex]);
    }

    function onWheel(e) {
      if (!isEngaged()) return;
      const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (direction === 0) return;
      if (busy) {
        e.preventDefault();
        return;
      }
      // At either end the page is already parked on that edge, so not claiming
      // the event hands the gesture straight to the neighbouring section.
      if (direction > 0 && stepIndex >= STEPS.length - 1) return;
      if (direction < 0 && stepIndex <= 0) return;
      e.preventDefault();
      advance(direction);
    }

    let touchStartY = null;
    function onTouchStart(e) {
      touchStartY = isEngaged() ? e.touches[0].clientY : null;
    }
    function onTouchMove(e) {
      if (touchStartY === null) return;
      if (busy) {
        e.preventDefault();
        return;
      }
      const delta = touchStartY - e.touches[0].clientY;
      if (Math.abs(delta) < 40) return;
      const direction = delta > 0 ? 1 : -1;
      touchStartY = e.touches[0].clientY;
      if (direction > 0 && stepIndex >= STEPS.length - 1) return;
      if (direction < 0 && stepIndex <= 0) return;
      e.preventDefault();
      advance(direction);
    }

    // The wheel owns the beats, but the page can still be moved under us — the
    // nav's HOME, a reload partway down. Re-derive the beat from where the page
    // landed, for moves we did not make ourselves.
    function onScroll() {
      if (busy || performance.now() < selfScrollUntil) return;
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const raw = clamp01((window.scrollY - section.offsetTop) / scrollable);
      let nearest = 0;
      STEPS.forEach((_, i) => {
        const at = i / (STEPS.length - 1);
        const best = nearest / (STEPS.length - 1);
        if (Math.abs(at - raw) < Math.abs(best - raw)) nearest = i;
      });
      if (nearest !== stepIndex) stepIndex = nearest;
      render(STEPS[stepIndex]);
    }

    function onResize() {
      render(current);
    }

    onScroll();
    render(STEPS[stepIndex]);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      visibility.disconnect();
      if (gazeId !== null) cancelAnimationFrame(gazeId);
      if (tweenId !== null) cancelAnimationFrame(tweenId);
    };
  }, []);

  return (
    // 200vh = one screen of sticky stage plus one screen of range to park the
    // three beats in. The beats are driven by the wheel, not by this height, so
    // anything longer is just dead scroll between them.
    <section ref={sectionRef} className="section-hero relative h-[200vh]">
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-[#06252e]"
      >
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-black opacity-100 pointer-events-none"
        />

        <div className="absolute top-0 left-0 px-5 flex items-center gap-[12px] font-['Plus_Jakarta_Sans'] font-semibold leading-none whitespace-nowrap text-[clamp(48px,8vw,150px)] tracking-[clamp(-8px,-0.8vw,-15px)]">
          <p>YUN</p>
          <p>SU</p>
          <p>JEONG</p>
        </div>

        {/* z-20 because the decorative layers below are `inset-0` and come
            later in the DOM — without it they stack over the nav and eat
            every click on it. */}
        <nav
          ref={navRef}
          className="font-['Plus_Jakarta_Sans'] absolute top-0 right-0 z-20 pt-3 pr-7 flex flex-col items-end gap-2 font-normal leading-none text-[16px] opacity-0"
        >
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

        {/* The design does not sit the pair dead centre — the group's middle is
            at (990.8, 645) on the 1920x1080 canvas, so it is nudged right and
            well below centre. Both offsets are in vw so they travel with the
            rest of the composition. */}
        <div className="absolute inset-0 flex items-center justify-center gap-[clamp(14px,3.958vw,76px)] translate-x-[1.604vw] translate-y-[5.469vw] pointer-events-none">
          <Eye closed={closedLeft} half={halfLeft} open={openLeft} mirrored />
          <Eye closed={closedRight} half={halfRight} open={openRight} />
        </div>

        {/* The two languages are stacked in one grid cell and crossfaded, so
            anything that measures differently between them reads as the copy
            jumping at the switch. They are given the same sizes, the same
            explicit leading (the two fonts' own line heights differ) and the
            same gap, so only the words change.

            `items-end` is what actually holds them still. The lead is two lines
            in English and one in Korean, and stretched children both start at
            the cell's top — which pushed the Korean paragraph a whole lead-line
            up. Aligned to the bottom instead, the paragraph and the last line of
            the lead land on the same baselines in both, and the extra English
            line grows upward into empty space. */}
        <div className="absolute bottom-0 left-0 p-5 grid items-end">
          <div
            ref={textEnRef}
            className="col-start-1 row-start-1 flex flex-col gap-[12px] opacity-0"
          >
            <p className={heroLeadEnClass}>
              Discover user&apos;s unknown needs <br />
              and design experiences
            </p>
            <p className={heroBodyEnClass}>
              With the sense of reading clients&rsquo; needs in the field of
              social welfare,
              <br />
              I&rsquo;m Sujeong Yoon, a UX/UI designer focused on improving user
              experience.
            </p>
          </div>

          <div
            ref={textKoRef}
            className="col-start-1 row-start-1 flex flex-col gap-[12px] opacity-0 font-['Pretendard']"
          >
            <p className={heroLeadKoClass}>
              사용자의 숨은 니즈를 발견하고 <br />
              경험을 설계합니다
            </p>
            {/* Two lines, like the English, so the block ends at the same
                height as well as starting at it. */}
            <p className={heroBodyKoClass}>
              사회복지 현장에서 클라이언트의 니즈를 읽던 감각으로,
              <br />
              사용자 경험을 개선하는 UX/UI 디자이너 윤수정입니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
