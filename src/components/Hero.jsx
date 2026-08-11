import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { driveWithScroll } from "../lib/scrollDriver";
import { holdInside, releaseScrollHold } from "../lib/scrollHold";
import glassesImg from "../assets/hero/glasses.avif";
import heroEyes from "../assets/hero/hero-eyes.svg?raw";

// The hero's eyes are a pair of glasses, and the eyes are what shows through
// the lenses. Two files: the glasses itself, and an overlay carrying the eyes.
//
// The glasses is a picture rather than a drawing. The design paints a flat
// #0492bd through a bitmap alpha mask, and one image with the colour already in
// it is the same result with nothing left to reproduce. It never moves and
// never changes, so it has no reason to be anything more.
//
// The overlay is inlined source, because its parts do have to be reachable:
// three eye states to hand over between, and two pupils to move once they are
// open.
const HERO_ART = { width: 512.91, height: 498 };
// Sized to land on roughly the footprint the old pair of eyes had - two of
// 194.81 with a 76 gap came to 465.6 at the 1920 design width, or 24.25vw. The
// px floor stops it disappearing on a phone; the ceiling is the design size, so
// past 1920 it stops growing rather than overrunning the composition.
//
// The child rule puts the overlay exactly on top of the glasses: both fill the
// box, so the eyes land in their lenses at every size.
//
// A descendant selector, not a child one. The overlay is injected into a span,
// so the svg is a grandchild — `[&>svg]` matched nothing, the svg kept its own
// 512.91 x 498, and that pushed the box to 498 tall. The glasses image is
// absolute and stretched to the taller box while the eyes stayed at their own
// scale, which is what put the pupils outside the frame.
//
// No `position` in here on purpose. This is combined with `fixed` at the point
// of use, and Tailwind resolves two position utilities by their order in the
// generated stylesheet rather than by the order they are written in the class
// attribute — `relative` is defined after `fixed` and quietly wins. The glasses
// then rides inside the hero's stage instead of the viewport and leaves upward
// with the section, which is not a bug you find by reading the class list.
const heroBoxClass =
  "w-[clamp(150px,24.25vw,465.6px)] [&_svg]:absolute [&_svg]:inset-0 [&_svg]:h-full [&_svg]:w-full";


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
  // Before the scroll, not after: the hold clamps the page to the hero's last
  // frame until the intro has played, and a menu item is a deliberate request
  // for a section rather than someone scrolling past the hero by accident. See
  // scrollHold.
  releaseScrollHold();
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

// How far through the section's scroll the timeline finishes, leaving the rest
// of the track as a run-out.
//
// It used to end at the very end — the Korean copy landed at 0.99 — and the
// last tenth of the animation was therefore playing on the same frames the hero
// starts to scroll away, which the smoothing in driveWithScroll makes worse:
// the render trails the scrollbar by about a tenth of a second, so on a quick
// flick the eyes are still opening while the Experience panel is coming up
// underneath. Finishing early means the intro is always over, and visibly over,
// before anything else is on screen — and it gives the hold below something to
// hold *to*, since by the time the page reaches the end of the track there is
// nothing left unplayed.
//
// Every beat below is written against this rather than against the raw scroll,
// so the numbers keep their relationship to one another and this is the one
// place the whole timeline's length is set.
const TIMELINE_END = 0.9;

export default function Hero() {
  const sectionRef = useRef(null);
  const overlayRef = useRef(null);
  const navRef = useRef(null);
  const textEnRef = useRef(null);
  const textKoRef = useRef(null);
  // The glasses. It travels out of the hero to the corner and parks on the chat
  // button — which is the pink circle in Chatbot, not anything here.
  const dockRef = useRef(null);
  const idleRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const overlay = overlayRef.current;
    // What the scroll hands over between, and what the pointer moves.
    //
    // Three states rather than one shape being opened: the design draws a shut
    // eye, a half one and an open one, and they are not the same drawing at
    // three sizes — the shut one is a wider line than the open one is a circle,
    // and the lens tint over them belongs only to the first two. So they are
    // cross-faded, and the tint lightens on its own as the eye opens.
    //
    // Scoped to the dock rather than to the stage: the glasses is portalled out
    // to the end of `body` (see the return), so it is no longer inside the
    // stage's subtree and a query rooted there would come back empty.
    const q = (sel) => [...dockRef.current.querySelectorAll(sel)];
    const closedEye = q('[data-eye="closed"]');
    const halfEye = q('[data-eye="half"]');
    const openEye = q('[data-eye="open"]');
    // The lens tints, one per eye state. The tint is not a fixed property of
    // the glasses — the design lightens it as the eye comes up, from black at
    // 50% shut to 10% half open to nothing at all once open — so each tint
    // rides the same cross-fade as the eye it belongs to.
    const closedLens = q('[data-lens="closed"]');
    const halfLens = q('[data-lens="half"]');
    // Each pupil, and where it is currently looking.
    //
    // Grouped by eye rather than flattened into one list of parts: each eye
    // aims at the pointer from where it actually sits on screen, so it needs
    // its own box and its own eased gaze, and the two of them look slightly
    // different directions at anything nearer than the far side of the room —
    // which is the whole reason this reads as a pair of eyes.
    //
    // The pupils sit where the design puts them, which is not the middle of
    // their lens: measured off the glasses mask, the left lens opening runs
    // 51..218 and its pupil is at 161 — 27 units inboard. The eyes are drawn
    // converging, and that is the drawing, not something to correct.
    //
    // It does cost travel. See the numbers on GAZE_TRAVEL below.
    const eyes = [...dockRef.current.querySelectorAll("[data-pupil]")].map(
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
    // Set once the timeline has actually been rendered to its end — which is
    // what the scroll hold below waits for. Read, not assumed: the render lags
    // the scroll slightly, so "we are past TIMELINE_END" and "the last frame
    // has been painted" are not the same moment.
    let timelineDone = false;

    function render(raw) {
      // The whole timeline is read against TIMELINE_END rather than against the
      // section's full track, so it is finished with a run-out of scroll to
      // spare. Every number below is a fraction of the animation, not of the
      // section.
      const progress = clamp01(raw / TIMELINE_END);
      if (progress >= 1) timelineDone = true;
      // Eyes closed -> open and background black -> teal over the first 60% of the scroll.
      const eyeProgress = clamp01(progress / 0.6);
      overlay.style.opacity = Math.pow(1 - eyeProgress, 1.5);

      // Shut, half, open — handed over one pair at a time rather than all
      // three dissolving across the whole scroll. Each drawing holds, then
      // gives way over a short band: an eyelid travels, it does not fade, and a
      // long cross-fade between two drawings of an eye just reads as a ghost.
      // The bands are eased, so the lid comes off its hold and settles into the
      // next one instead of sliding at a constant rate.
      const toHalf = smoothstep(0.3, 0.52, eyeProgress);
      const toOpen = smoothstep(0.76, 1, eyeProgress);
      const openOp = toOpen;
      const halfOp = toHalf * (1 - toOpen);
      const closedOp = 1 - toHalf;
      for (const el of closedEye) el.style.opacity = closedOp;
      for (const el of halfEye) el.style.opacity = halfOp;
      for (const el of openEye) el.style.opacity = openOp;
      // Each tint on its own eye's fade, so the lens lightens as the eye comes
      // up instead of holding at one value and then vanishing.
      for (const el of closedLens) el.style.opacity = closedOp;
      for (const el of halfLens) el.style.opacity = halfOp;

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
      openAmount = openOp;
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
    // Measured off the glasses mask rather than guessed. A lens opening comes
    // to about 167 x 147 and a pupil is a 50 disc, and because the eyes are
    // drawn converging the room is lopsided: the left pupil has 85 units to its
    // left but only 32 to its right, and the right one is the mirror of that.
    //
    // The tight side is what sets these. A pupil that slid out through the
    // frame would be far worse than one that does not travel quite as far as it
    // could — and nothing clips it, since the glasses is a picture and has no
    // lens shape to clip against.
    const GAZE_TRAVEL_X = 28;
    const GAZE_TRAVEL_Y = 38;
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

    // How long a still pointer is followed before the wander takes back over —
    // once the glasses is the chat character, and only then.
    //
    // In the hero the glasses is the thing you are looking at, and having it
    // hold your cursor is the effect. In the corner it is a small character
    // minding its own business, and a pair of pupils pinned to a mouse that
    // stopped moving a minute ago is the stillest thing on the page. So down
    // there a pointer that has gone quiet is treated as no pointer at all, and
    // it goes back to looking around.
    const GAZE_POINTER_IDLE = 1400;

    let gazeId = null;
    // Set from the dock loop below: the travel finished, so this is the chat
    // character now rather than the hero's.
    let landed = false;
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
    // When it last actually moved, on the same clock rAF hands the loop.
    let pointerAt = 0;
    function trackPointer(x, y) {
      pointer = { x, y };
      pointerAt = performance.now();
    }
    function onMouseMove(e) {
      trackPointer(e.clientX, e.clientY);
    }
    function onPointerMove(e) {
      if (e.pointerType === "touch") return;
      trackPointer(e.clientX, e.clientY);
    }

    function gaze(now) {
      // First, because the circle it follows can move without the page
      // scrolling — opening the chat walks it up beside the conversation. Scroll
      // alone would only catch that on the next wheel tick, by which time the
      // glasses has spent the whole move sitting in the corner on its own.
      //
      // Placing it before the measurements below is deliberate too: the eyes are
      // measured after the move, so a pupil aims from where its eye actually is
      // this frame rather than from where it was last one.
      dock();

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

      const following =
        pointer && !(landed && now - pointerAt > GAZE_POINTER_IDLE);

      eyes.forEach((eye, i) => {
        let targetX = wander;
        let targetY = 0;
        if (following) {
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

    // The glasses leaving the hero for the corner.
    //
    // Driven by the section's own bottom edge rather than by its scroll
    // progress: progress is spent by the time the copy has finished arriving,
    // and the travel should start after all of that, on the screen where the
    // hero is scrolling away. bottom goes from a full viewport down to zero
    // over exactly that screen, which is the whole journey.
    // How wide the glasses is against the circle it lands on.
    //
    // The design's own 64 on a 56 circle. The artwork carries its own margin — the
    // frame sits inside about three quarters of the file's width — so this lands
    // the lenses across the circle with the temple tips just inside its edge,
    // which is a face wearing glasses. Pushed past this the temples hang off both
    // sides and it stops being worn and starts being held.
    const DOCK_OVERHANG = 64 / 56;
    const DOCK_SIZE = 126; // the fallback, for a page with no chat on it
    // Where it parks, as the distance from the viewport's corner to the
    // glasses' middle. It has to be the middle of the pink circle in Chatbot,
    // which is 56px across and sits `right-11` / `bottom-5` — so 44 + 28 across
    // and 20 + 28 up. The two are different sizes and only their centres can be
    // made to agree; change either of these and the matching inset on the
    // button has to move with it, or the glasses parks beside its own circle.
    const DOCK_INSET_X = 44 + 90 / 2;
    const DOCK_INSET_Y = 20 + 90 / 2;
    // Where it rests during the hero, as an offset from the middle of the
    // viewport in vw. Both travel with the composition rather than being fixed
    // pixel nudges.
    //
    // The design puts the group's middle at (990.8, 645) on the 1920x1080
    // canvas — right of centre and well below it, or 0.01604 / 0.05469 vw. The
    // vertical is the design's; the horizontal is not. It has been pulled left
    // past centre on purpose, so leave it be rather than "correcting" it back
    // to the Figma number.
    const HERO_X_VW = -0.004;
    const HERO_Y_VW = 0.05469;

    // Where the glasses is headed, as an offset from the middle of the
    // viewport — because that is what the transform below is written against.
    //
    // Read off the pink circle itself rather than computed from the insets
    // above. The circle does not stay in the corner any more: opening the chat
    // sends it up beside the conversation (see Chatbot), and the glasses has to
    // be wherever it is, not wherever it started. Measuring it every frame is
    // the only version of this that cannot drift — there is no second copy of
    // the position to keep in step, and it does not matter how the circle got
    // there or how long it took.
    //
    // The insets stay as the fallback for a page with no chat on it at all.
    function dockTarget(vw, vh) {
      const circle = document.getElementById("chatbot-launcher");
      if (!circle) {
        return { x: vw / 2 - DOCK_INSET_X, y: vh / 2 - DOCK_INSET_Y };
      }
      const r = circle.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - vw / 2,
        y: r.top + r.height / 2 - vh / 2,
      };
    }

    function dock() {
      const el = dockRef.current;
      if (!el) return;
      const rect = section.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const t = clamp01((vh - rect.bottom) / vh);
      // Eased, so it does not set off the instant the hero starts to leave and
      // does not slam into the corner either.
      const e = t * t * (3 - 2 * t);

      const from = { x: HERO_X_VW * vw, y: HERO_Y_VW * vw };
      const to = dockTarget(vw, vh);
      const circle = document.getElementById("chatbot-launcher");
      const endSize = circle
        ? circle.getBoundingClientRect().width * DOCK_OVERHANG
        : DOCK_SIZE;
      const scale = 1 + (endSize / (el.offsetWidth || endSize) - 1) * e;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      // translate first, scale second: written this way the scale happens about
      // the element's middle and the travel is *not* multiplied by it, so the
      // corner it arrives at is the corner asked for.
      el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${scale.toFixed(4)})`;

      // Once it has arrived, the character breathes. The same flag goes on the
      // pink circle in Chatbot, off the same `t`, so both start the animation in
      // the same frame and stay in step — see the `chatbot-idle` note in
      // index.css for why that is the whole trick.
      landed = t >= 1;
      idleRef.current?.toggleAttribute("data-chat-idle", landed);
    }

    window.addEventListener("scroll", dock, { passive: true });
    window.addEventListener("resize", dock);
    dock();

    // Always running, for as long as the page is open.
    //
    // This used to be gated on the hero being on screen, which was right when
    // the glasses belonged to the hero. It does not any more: it is fixed, and
    // once the hero has gone it is still there in the corner as the chat
    // character. The gate switched the gaze off at exactly the moment the
    // character arrived, so its eyes were frozen for the whole rest of the page
    // — the one place a still pupil reads as broken rather than as calm.
    //
    // Nothing is saved by putting it back. The eyes are never off screen, so
    // there is no state in which the work is wasted, and a background tab stops
    // rAF on its own.
    gazeId = requestAnimationFrame(gaze);

    const driver = driveWithScroll(section, render);
    // The copy is the widest thing on the stage and the eyes are SVG, so both
    // settle late enough to move the section's own height on a cold load.
    document.fonts?.ready.then(driver.refresh);
    window.addEventListener("load", driver.refresh);
    // Nothing gets past the hero until the hero has finished. After the driver,
    // so `render` has already run once and `timelineDone` is right for wherever
    // the page happens to have been restored to.
    const releaseHold = holdInside(section, () => timelineDone);
    // Capture phase: these are read-only observers of where the pointer is, and
    // the capture phase is the one place nothing on the page can stop them
    // being delivered.
    const gazeListener = { passive: true, capture: true };
    window.addEventListener("mousemove", onMouseMove, gazeListener);
    window.addEventListener("pointermove", onPointerMove, gazeListener);

    return () => {
      window.removeEventListener("scroll", dock);
      window.removeEventListener("resize", dock);
      window.removeEventListener("load", driver.refresh);
      window.removeEventListener("mousemove", onMouseMove, gazeListener);
      window.removeEventListener("pointermove", onPointerMove, gazeListener);
      releaseHold();
      driver.stop();
      if (gazeId !== null) cancelAnimationFrame(gazeId);
    };
  }, []);

  const stage = (
    // One screen of sticky stage plus two screens of scroll for the timeline to
    // be read off. This height *is* the animation's length now — the eyes open
    // over roughly the first screen and change, the copy over the second — so
    // it is the one number that sets how fast the hero plays.
    <section ref={sectionRef} className="section-hero relative h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#06252e]">
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
        {/* The glasses is not here — it is portalled to the end of `body`. See
            the return below for why it cannot live in this stage. */}

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

  return (
    <>
      {stage}

      {/* The glasses, at the end of `body` rather than inside the hero.

          It has to be `fixed`: it outlives the section, carrying on down to the
          corner after the hero has scrolled away. But it cannot be fixed *and*
          live in the stage — `position: sticky` makes the stage a stacking
          context, which boxes this in at the stage's own place in the paint
          order no matter how high its z-index is, so every section after the
          hero draws straight over it. That is why it vanished.

          Out here it has no ancestor to be boxed in by, and z-59 puts it over
          the pink chat button at z-58 — which is the one thing it must land on
          top of.

          While the hero is pinned the stage *is* the viewport, so being fixed
          and centred with the same offsets lands it in exactly the same place:
          the composition is unchanged.

          Decoration all the way down, never a control. It lands on the chat
          button rather than becoming one — the button is the pink circle
          already sitting in the corner (see Chatbot), and this stays
          pointer-transparent so the clicks it looks like it should take go
          straight through to it. One thing to click, and the glasses does not
          have to know the chat exists. */}
      {createPortal(
        <div
          ref={dockRef}
          aria-hidden="true"
          className={`${heroBoxClass} fixed left-1/2 top-1/2 z-[59] will-change-transform`}
          style={{
            aspectRatio: `${HERO_ART.width} / ${HERO_ART.height}`,
            pointerEvents: "none",
          }}
        >
          {/* A layer of its own for the idle, because the travel above already
              owns this element's transform. Nested, the two compose instead of
              overwriting each other: the parent puts the character in the
              corner, this one moves it about once it is there.

              It also has to be the inner one. Rotation about a box's own middle
              never moves that middle, so it survives being wrapped in the
              travel — and the travel's own middle is the landing point. Put the
              idle outside instead and it would swing the character around a
              point back in the middle of the screen. */}
          <div ref={idleRef} className="absolute inset-0">
            {/* Back to front: eye, then the tinted lens over it, then the frame
                over both. The overlay carries the first two in that order; the
                frame is this image, and it comes last because it is the thing
                in front — an eye painted over its own glasses is the one
                arrangement that reads as wrong immediately.

                Absolute so neither wrapper contributes height of its own: the
                box is sized by its width and aspectRatio, and any in-flow
                content here would override that. */}
            <span
              className="absolute inset-0 block"
              dangerouslySetInnerHTML={{ __html: heroEyes }}
            />
            <img src={glassesImg} alt="" className="absolute inset-0 h-full w-full" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
