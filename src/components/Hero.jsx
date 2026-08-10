import { useEffect, useRef } from "react";
import { driveWithScroll } from "../lib/scrollDriver";
import glassesArt from "../assets/hero/glasses.svg?raw";

// The hero's eyes are a pair of glasses, and the eyes are what is behind the
// lenses. The drawing comes in as source rather than as a URL for the same
// reason the old eyes did: the parts that move — each lens's lid, each pupil —
// have to be reachable, and an <img> is a closed box.
//
// It is one drawing holding both eyes, where the old artwork was two files
// mirrored. So there is no `mirrored` prop and no pairing to keep in step; the
// frame is drawn once and the two eyes sit inside it where the artwork puts
// them.
//
// The artwork's own box. Everything below is stated against it so the glasses
// can be sized by width alone and the height follows.
const GLASSES_ART = { width: 768, height: 251 };
// Sized to land on roughly the footprint the old pair had — two eyes of
// 194.81 with a 76 gap came to 465.6 at the 1920 design width, which is
// 24.25vw. The px floor stops it disappearing on a phone and the ceiling is the
// design size, so past 1920 it stops growing rather than overrunning the
// composition.
// `[&>svg]:w-full` is load-bearing. The file carries its own width and height —
// a design tool will not open an SVG without them — and inline that would pin
// the drawing at 768px whatever this box says. The box decides the size here;
// the attributes are there for Figma.
const glassesBoxClass =
  "relative w-[clamp(150px,24.25vw,465.6px)] [&>svg]:h-full [&>svg]:w-full";
// How much of its height a lid keeps when the eye is shut. Not zero: a scale of
// zero collapses the group and takes its antialiasing with it, and the white
// vanishes rather than closing. A sliver leaves it showing as the line a shut
// eye actually is — about 6 of the lens's 198 units, which is a hair over 3px
// on screen at the design size.
const LID_SHUT = 0.03;

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
    // The two parts of the drawing that move. Everything else — the frame, the
    // bridge, the arms — is fixed.
    //
    // A lid is the group holding one lens's white and the pupil inside it, and
    // scaling that group vertically about its own middle *is* the eye opening.
    // Each one is clipped to its lens outline, so neither the white nor a pupil
    // that has travelled to the rim can spill past the frame.
    const lids = [...stageRef.current.querySelectorAll("[data-lid]")];
    // Each pupil, and where it is currently looking.
    //
    // Grouped by eye rather than flattened into one list of parts: each eye
    // aims at the pointer from where it actually sits on screen, so it needs
    // its own box and its own eased gaze, and the two of them look slightly
    // different directions at anything nearer than the far side of the room —
    // which is the whole reason this reads as a pair of eyes.
    //
    // The pupils are drawn on their lens centres rather than where the trace
    // had them. The artwork has the eyes converging, and a pupil that starts
    // off-centre has no room to look that way; from the middle it has the same
    // room in every direction, which is what lets the travel below be as large
    // as it is. The drawn position simply becomes one of the places the gaze
    // passes through.
    const eyes = [...stageRef.current.querySelectorAll("[data-pupil]")].map(
      (group) => ({
        group,
        // -1..1 on each axis. Chased toward the target rather than set from it,
        // so the gaze carries a little weight.
        x: 0,
        y: 0,
      }),
    );

    // The timeline below is read straight off the scroll position: the eyes
    // open exactly as far as you have scrolled, and stop where you stop. It
    // used to be three beats handed over one wheel tick at a time, which meant
    // the lids could only ever be shut, half, or open — the drawing in between
    // was there but unreachable.
    let openAmount = 0;

    function render(progress) {
      // Eyes closed -> open and background black -> teal over the first 60% of the scroll.
      const eyeProgress = clamp01(progress / 0.6);
      overlay.style.opacity = Math.pow(1 - eyeProgress, 1.5);

      // One lid, opened continuously, rather than three drawings handed over in
      // turn. The old artwork had a shut eye, a half one and an open one, so
      // everything between two of them was a crossfade between two pictures —
      // which reads as a ghost, and is why those handovers had to be kept
      // short. A lens is a shape, and a shape can simply be opened; there is no
      // in-between state to be missing.
      //
      // Eased, so it comes off its shut hold and settles into open rather than
      // sliding at a flat rate the whole way.
      const lidOpen = smoothstep(0.12, 0.92, eyeProgress);
      const lidScale = LID_SHUT + (1 - LID_SHUT) * lidOpen;
      for (const lid of lids) {
        lid.style.transform = `scaleY(${lidScale.toFixed(4)})`;
      }

      // Nav + copy fade in right after the eyes finish opening, then the copy
      // hands over from English to Korean for the rest of the scroll.
      const revealT = smoothstep(0.55, 0.7, progress);
      // One leaves before the other arrives, rather than the two dissolving
      // through each other. The English and the Korean are the same sentence
      // stacked in the same place, so any moment where both are part-way up is
      // two paragraphs printed on top of one another — and with the timeline
      // tied to the scroll, that moment is somewhere the reader can stop and
      // sit. It used to be crossed at a fixed speed by a tween, which is the
      // only reason a straight crossfade ever worked here.
      const langOut = smoothstep(0.76, 0.87, progress);
      const langIn = smoothstep(0.88, 0.99, progress);

      navRef.current.style.opacity = revealT;
      // Fading alone would leave an invisible but still clickable nav sitting
      // over the eyes for the first half of the scroll.
      navRef.current.style.pointerEvents = revealT > 0.5 ? "auto" : "none";
      // The gaze only happens on an open eye, and fades in with it.
      openAmount = lidOpen;
      textEnRef.current.style.opacity = revealT * (1 - langOut);
      textKoRef.current.style.opacity = revealT * langIn;
    }

    // How far the iris may travel from where the drawing puts it, in the
    // drawing's own units — which is why all of this is set as an attribute and
    // not as a CSS transform, since that would be in screen px.
    //
    // How far a pupil may travel from its lens's middle, in the drawing's own
    // units — which is why this is written into an SVG transform and not a CSS
    // one, since that would be in screen px.
    //
    // A lens is 218 x 198 and a pupil is a 66 disc, so from the centre it has
    // 76 units of room across and 65 up and down before it touches the rim.
    // These are about 60% of each — the same fraction on both axes, which
    // matters: the gaze is clamped to a circle and then scaled by this pair, so
    // an equal fraction leaves the pupil the same distance off the rim
    // whichever way it looks, instead of grazing it on the diagonals.
    const GAZE_TRAVEL_X = 45;
    const GAZE_TRAVEL_Y = 39;
    // How far the pointer has to be from an eye before it is looking as far
    // that way as it can. Off the viewport rather than a fixed number of px, so
    // crossing the screen sweeps the whole range on any display. Nearer than
    // this the eye only turns part way — which is what makes it read as
    // watching something close rather than snapping between extremes.
    //
    // A third of the screen, not half: at half the pointer had to be most of a
    // screen away before the eye committed, so in ordinary use the gaze only
    // ever showed a fraction of the travel it had.
    const GAZE_REACH = 0.34;
    // How hard the gaze chases the pointer, per frame. Low enough to lag it
    // visibly: eyes that track a cursor exactly read as a readout of the mouse
    // position rather than as something looking at you.
    const GAZE_CHASE = 0.12;
    // The catchlight sits inside the pupil group and travels with it. On the
    // old eyes it was swung across the iris instead, so it read as a fixed
    // reflection the eye moved under; behind a lens there is a second surface
    // in the way and the highlight belongs to that, so carrying it along is
    // both simpler and nearer to what the drawing shows.

    // The wander the eyes used to do on their own, kept as the fallback: it is
    // what they do until a mouse has actually moved. A touch device never sends
    // one, and eyes locked dead ahead for the whole visit read as broken.
    const GAZE_PERIOD = 2600;
    // How much of each half-cycle the eye spends travelling. The rest is the
    // dwell at either side — narrowing this is what makes the move itself
    // quick rather than just cycling more often.
    const GAZE_MOVE = 0.44;
    const GAZE_FROM = (1 - GAZE_MOVE) / 2;

    let gazeId = null;
    // Screen px, and null until a pointer has genuinely moved over the page.
    //
    // This used to listen for `mousemove` alone, and that is what made the eyes
    // look like they only tracked a *click*. A pen or a touchscreen sends no
    // hovering mouse event at all — the first `mousemove` such a device emits
    // is the compatibility one the browser synthesises right before `click`. So
    // the gaze sat on its idle wander through every hover and then snapped to
    // wherever the tap landed, which reads exactly as "it only moves when I
    // click".
    //
    // `pointermove` covers the hover the mouse event was missing. Touch is
    // still refused: a finger only reports while it is down, so following it
    // would leave the eyes frozen at the last tap — the very thing being fixed.
    // Both listeners feed the same value, so a plain mouse is unaffected.
    let pointer = null;
    function trackPointer(x, y) {
      pointer = { x, y };
    }
    function onMouseMove(e) {
      trackPointer(e.clientX, e.clientY);
    }
    function onPointerMove(e) {
      if (e.pointerType === "touch") return;
      trackPointer(e.clientX, e.clientY);
    }

    function gaze(now) {
      // Every box is measured before anything is written, so the frame costs one
      // layout rather than one per eye: setting an SVG transform below dirties
      // layout, and a getBoundingClientRect after that forces it to be redone.
      const boxes = eyes.map((eye) => eye.group.getBoundingClientRect());
      const reach =
        Math.min(window.innerWidth, window.innerHeight) * GAZE_REACH;

      // -1 hard left, +1 hard right. Shared by both eyes, since a wandering
      // gaze is the pair looking about together rather than each on its own.
      const phase = (now % GAZE_PERIOD) / GAZE_PERIOD;
      const triangle = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const wander = smoothstep(GAZE_FROM, 1 - GAZE_FROM, triangle) * 2 - 1;

      eyes.forEach((eye, i) => {
        let targetX = wander;
        let targetY = 0;
        if (pointer) {
          const box = boxes[i];
          const dx = pointer.x - (box.left + box.width / 2);
          const dy = pointer.y - (box.top + box.height / 2);
          // Direction and distance kept apart: the direction is where the eye
          // turns, the distance only says how far. Scaling the axes
          // independently instead would have the eye look along the wrong line
          // whenever the pointer is off to a corner.
          const away = Math.hypot(dx, dy) || 1;
          const amount = Math.min(away / reach, 1);
          targetX = (dx / away) * amount;
          targetY = (dy / away) * amount;
        }
        eye.x += (targetX - eye.x) * GAZE_CHASE;
        eye.y += (targetY - eye.y) * GAZE_CHASE;

        // Scaled by how far the eye is open, so a shut one does not slide its
        // pupil about behind the lid.
        const px = eye.x * GAZE_TRAVEL_X * openAmount;
        const py = eye.y * GAZE_TRAVEL_Y * openAmount;
        eye.group.setAttribute(
          "transform",
          `translate(${px.toFixed(2)}, ${py.toFixed(2)})`,
        );
      });
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

    const driver = driveWithScroll(section, render);
    // The copy is the widest thing on the stage and the eyes are SVG, so both
    // settle late enough to move the section's own height on a cold load.
    document.fonts?.ready.then(driver.refresh);
    window.addEventListener("load", driver.refresh);
    // Capture phase: these are read-only observers of where the pointer is, and
    // the capture phase is the one place nothing on the page can stop them
    // being delivered.
    const gazeListener = { passive: true, capture: true };
    window.addEventListener("mousemove", onMouseMove, gazeListener);
    window.addEventListener("pointermove", onPointerMove, gazeListener);

    return () => {
      window.removeEventListener("load", driver.refresh);
      window.removeEventListener("mousemove", onMouseMove, gazeListener);
      window.removeEventListener("pointermove", onPointerMove, gazeListener);
      driver.stop();
      visibility.disconnect();
      if (gazeId !== null) cancelAnimationFrame(gazeId);
    };
  }, []);

  return (
    // One screen of sticky stage plus two screens of scroll for the timeline to
    // be read off. This height *is* the animation's length now — the eyes open
    // over roughly the first screen and change, the copy over the second — so
    // it is the one number that sets how fast the hero plays.
    <section ref={sectionRef} className="section-hero relative h-[300vh]">
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
          {/* One drawing, both eyes. The lids and pupils inside it are reached
              by data attribute from the effect above — see `lids` and `eyes`
              there — which is the whole reason the file is inlined rather than
              pointed at with an <img>. */}
          <div
            className={glassesBoxClass}
            style={{ aspectRatio: `${GLASSES_ART.width} / ${GLASSES_ART.height}` }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: glassesArt }}
          />
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
