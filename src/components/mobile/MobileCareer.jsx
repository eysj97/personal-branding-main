import { useEffect, useRef, useState } from "react";
import { vw } from "./MobileHeader";
import StepDots from "./StepDots";
import { pinPage } from "../../lib/pinPage";
import { ROLES } from "../../data/roles";

/*  CAREER — the "every role" wheel, on a phone.
 *  Figma 1317:730 (the title card), 1317:922 (a role), 1317:1040 (the handoff),
 *  all drawn at 430 x 932.
 *
 *  Same wheel as the desktop's, and that is not a family resemblance: the two
 *  are the same object at two sizes. The desktop hangs a 1293px ring off the
 *  bottom of its canvas with five circles standing a stem clear of it, one at
 *  the top and four queued either side; the phone's design hangs a 593px ring
 *  off the bottom of its canvas, and the numbers come out on the desktop's own
 *  arithmetic — its two visible circles land within a few px of the ±24° slots,
 *  and the yellow one's `top: 575` *is* slotRadius(80) on this ring. So the
 *  model below is the desktop's, restated in this canvas' units, rather than a
 *  second wheel that happens to look similar.
 *
 *  What differs is only the gesture. Up there the wheel is turned by the page's
 *  own scroll; here it turns a role at a time as the screens are swiped
 *  through, because a phone's scroll is short and shared with getting to the
 *  next section.
 *
 *  The last frame has no ring and the circle dead centre. That is the handoff,
 *  and it is why the big circle is the section's rather than a screen's: it has
 *  to travel from the apex to the middle, and a thing that travels cannot be
 *  re-drawn in each place it stops.
 */

// The design's canvas. Everything below is written in its px and converted once
// by vw(), so a coordinate here is the coordinate in Figma.
const CANVAS = { width: 430, height: 932 };

// Two px left of centre, which is where the design stands the wheel's circle.
const DOT_NUDGE = -2;

// The ring: the top of a 593px circle hung off the bottom left, which is where
// the design puts it (-82, 694).
const RING = { cx: -82 + 296.5, cy: 694 + 296.5, r: 296 };

// The desktop's own three numbers, unchanged.
//
// Every circle hangs off the track on a stem: a 40px line running straight out
// from the ring to the circle's edge. So what is held across the five is the
// *clearance* — the stem's length — and not the radius their centres sit on.
// The big one reaches further out because it is bigger, which the stem shows
// you rather than hides.
const SPOKE = 40;
const CIRCLE_BIG = 80;
const CIRCLE_SMALL = 40;
/** How far out the centre of a circle of `size` parks: the far end of its stem,
 *  plus its own radius. */
const slotRadius = (size) => RING.r + SPOKE + size / 2;

// Where the slots are, in the order one circle visits them: CENTER, then down
// the left, across the bottom unseen, and back up the right.
//
// Written unwrapped — +48 and +24 as -312 and -336 — and that is the whole
// point of the list. A circle leaving the far left slot has to reach the far
// right one by going round the bottom, which is off the screen; take the short
// way and it sweeps back across the top, through the very slot the focused
// circle is standing in. Angles that only ever decrease make the wheel turn one
// way by construction.
const SLOT_STEP_DEG = 8;
const SLOT_NEAR_DEG = SLOT_STEP_DEG * 3;
const SLOT_FAR_DEG = SLOT_STEP_DEG * 6;
const SLOT_ANGLES = [
  0,
  -SLOT_NEAR_DEG,
  -SLOT_FAR_DEG,
  -360 + SLOT_FAR_DEG,
  -360 + SLOT_NEAR_DEG,
];

// The graduation along the track. Ticks lie *across* the ring, centred on it —
// the desktop's reading, and the one thing that says the difference between the
// track and what travels on it: a tick is part of the line, a circle stands a
// stem clear of it.
//
// Two lengths, because a graduation with one length is a texture rather than a
// scale — there is nothing in it to count. A long mark every sixteenth position
// and fifteen short between gives the eye something to count by.
//
// The count is derived from the majors rather than chosen, so the pattern
// closes on a major instead of meeting itself mid-step. Twelve of them puts the
// minors at a 9.7 pitch on this ring, which is the 10 the design draws.
const TICK = { minor: 10, major: 24, weight: 1 };
const TICKS_PER_MAJOR = 16;
const MAJOR_COUNT = 12;
const TICK_COUNT = MAJOR_COUNT * TICKS_PER_MAJOR;
const TICK_STEP_RAD = (2 * Math.PI) / TICK_COUNT;
// All the way round, not only across the visible arc: the ring turns, so ticks
// leave through one end and have to come up through the other.
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = i * TICK_STEP_RAD;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const length = i % TICKS_PER_MAJOR === 0 ? TICK.major : TICK.minor;
  const inner = RING.r - length / 2;
  const outer = RING.r + length / 2;
  return {
    x1: RING.cx + inner * sin,
    y1: RING.cy - inner * cos,
    x2: RING.cx + outer * sin,
    y2: RING.cy - outer * cos,
  };
});

// One move of the wheel, and everything on it moves together: the ring turns by
// exactly what the circles step, so a circle stays put against the ticks it is
// standing between. The apex is the fixed point the beads pass through.
const TURN_MS = 700;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Where a role's circle is, given which role is at the apex.
 *
 *  `-360 * turns` is what keeps a circle that has been round once from jumping
 *  back to where it started: the slot repeats every five, the angle does not. */
const slotAngle = (role, focus) =>
  SLOT_ANGLES[(((focus - role) % 5) + 5) % 5] - 360 * Math.floor((focus - role) / 5);

/** One circle on the wheel, on its stem.
 *
 *  Placed by turning a zero-sized box at the ring's centre and hanging the
 *  circle off the far end of the radius, rather than by working out an x and a
 *  y: a rotation is what the wheel actually does, so a transition on it carries
 *  the circle along the arc instead of across the chord between two slots.
 *
 *  A circle is whatever size its own place on the wheel says, and it changes on
 *  the way rather than at the end of it — the desktop's rule, and the one thing
 *  that was missing here. With a separate yellow circle parked at the apex the
 *  wheel reads as beads sliding along under a marker; with the size and the
 *  fill on the beads themselves, the small circle coming round *becomes* the
 *  yellow one, which is what is actually happening.
 *
 *  Note that the radius changes with the size: every circle stands the same
 *  SPOKE clear of the track, so a bigger one has its centre further out. That
 *  is why `top` and `left` are transitioned along with the width and the
 *  height, and not just the two of them.
 */
function Bead({ angle, size, focused, gone, children }) {
  const move = `${TURN_MS}ms ${EASE}`;
  return (
    <div
      className="absolute size-0"
      style={{
        left: vw(RING.cx),
        top: vw(RING.cy),
        transform: `rotate(${angle}deg)`,
        // `gone` is the handoff: the circle at the apex leaves the wheel for
        // the middle of the page, and the wheel it left goes with the track it
        // was standing on. Four circles and their stems still hanging in the
        // bottom of an otherwise empty screen read as the parts the animation
        // forgot.
        opacity: gone ? 0 : 1,
        transition: `transform ${move}, opacity ${TURN_MS / 2}ms ease-out`,
      }}
    >
      {/* The stem: from the track out to the circle's edge. */}
      <div
        className="absolute bg-black"
        style={{
          left: vw(-1.5),
          top: vw(-(RING.r + SPOKE)),
          width: vw(3),
          height: vw(SPOKE),
        }}
      />
      {/* Outlined at 2 against the track's 1 while it waits, and filled once it
          arrives. The circles are not the track — they are what travels along
          it and what the eye follows — and holding them heavier is what keeps
          the two readable as different things. The desktop's numbers.

          `borderColor` rather than a border that comes and goes: a width
          animating from 2 to 0 moves the circle's own edge, so the fill would
          swell by two px as it landed. */}
      <div
        className="absolute grid place-items-center rounded-full border-solid"
        style={{
          left: vw(-size / 2),
          top: vw(-(RING.r + SPOKE + size)),
          width: vw(size),
          height: vw(size),
          borderWidth: vw(2),
          borderColor: focused ? "transparent" : "black",
          backgroundColor: focused ? "#ffd527" : "transparent",
          transition: `left ${move}, top ${move}, width ${move}, height ${move}, background-color ${move}, border-color ${move}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The track: the ring and its graduation, turning as one. */
function Ring({ turn, shown }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className="pointer-events-none absolute inset-0 size-full transition-opacity duration-500"
      style={{ opacity: shown ? 1 : 0 }}
      fill="none"
    >
      <g
        style={{
          transform: `rotate(${turn}deg)`,
          transformOrigin: `${RING.cx}px ${RING.cy}px`,
          transition: `transform ${TURN_MS}ms ${EASE}`,
        }}
      >
        <circle cx={RING.cx} cy={RING.cy} r={RING.r} stroke="black" strokeWidth={1} />
        {TICKS.map((tick, i) => (
          <line key={i} {...tick} stroke="black" strokeWidth={TICK.weight} />
        ))}
      </g>
    </svg>
  );
}

// The last screen of the wheel's run: Figma 1317:1040, which is the circle on
// its own in the middle of an empty page.
//
// It is where this section hands over. Everything after it — the chapters the
// circle grows into, and the card it ends on — is its own section, scrolled
// down rather than swiped across, because that is the moment the reader is
// meant to feel they have left the wheel behind. See MobileAbout.
const HANDOFF = 6;

/** Where the circle is at a given step. Centres rather than corners: it moves
 *  and it changes size, and a corner would do both at once. */
function blobAt(step) {
  // On the wheel, standing on the apex — the bead's own place, so the circle
  // can fade in exactly where the bead fades out.
  if (step < HANDOFF) {
    return {
      cx: CANVAS.width / 2 + DOT_NUDGE,
      cy: RING.cy - slotRadius(CIRCLE_BIG),
      size: CIRCLE_BIG,
    };
  }
  // Off the wheel and in the middle of the page, still its own size. It grows
  // in the section below, not this one.
  return { cx: CANVAS.width / 2, cy: CANVAS.height / 2, size: CIRCLE_BIG };
}

/** 1 — the title card. Figma 1317:730. */
function Title() {
  return (
    <div
      className="flex flex-col items-center"
      style={{ width: vw(388), gap: vw(12) }}
    >
      <p
        className="whitespace-nowrap font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] text-[#336bec]"
        style={{ fontSize: vw(60), letterSpacing: vw(-1.2) }}
      >
        Every Role
      </p>
      <p className="text-center font-['Pretendard'] text-[16px] leading-[1.2] tracking-[-0.32px] text-black">
        제가 맡고 있는 역할로
        <br />
        저를 소개합니다
      </p>
    </div>
  );
}

/** 2..6 — one role. Figma 1317:922, and the four after it are the same card
 *  with the other four entries in it. */
function Role({ role }) {
  return (
    <>
      {/* The photograph, above the horizon. `object-bottom` is the design's own
          alignment, and role 4's frame needs more than that — it carries its
          own `imgFit`, which is the desktop's and is kept rather than
          re-derived. */}
      <div
        className="absolute overflow-hidden"
        style={{ left: vw(19), top: vw(279), width: vw(385), height: vw(208), borderRadius: vw(20) }}
      >
        <img
          src={role.img}
          alt=""
          className="absolute block max-w-none"
          style={
            role.imgFit?.custom ?? {
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: role.imgFit?.position ?? "bottom",
            }
          }
        />
      </div>

      {/* The name and its line, under the horizon. */}
      <div
        className="absolute flex -translate-x-1/2 flex-col items-center"
        style={{ left: "50%", top: vw(764), gap: vw(12) }}
      >
        <p
          className="whitespace-nowrap font-['Plus_Jakarta_Sans'] font-bold leading-none text-[#336bec]"
          style={{ fontSize: vw(42) }}
        >
          {role.title}
        </p>
        <p className="whitespace-pre-line text-center font-['Pretendard'] text-[16px] font-medium leading-none text-black">
          {role.desc}
        </p>
      </div>
    </>
  );
}

// Title card, five roles, and the screen the circle centres on.
const STEPS = HANDOFF + 1;
const LAST = STEPS - 1;

export default function MobileCareer() {
  const [step, setStep] = useState(0);
  const trackRef = useRef(null);
  // Which screen the strip is on, kept off React so the resize handler can
  // read it without being re-created every time it changes.
  const stepRef = useRef(0);
  const sectionRef = useRef(null);
  // Whether the section below has begun to show. Its circle takes over there —
  // grown straight off the scroll from the size this one hands it over at — so
  // this one has to be gone by then or there are two of them.
  const [handedOver, setHandedOver] = useState(false);
  // Where a press went down, so a drag that ends on the glass is not read as a
  // tap. Same guard, and the same reason, as the EXPERIENCE strip's.
  const press = useRef(null);

  // Which screen is in frame, read off the scroll position rather than held as
  // the truth — a finger can put the track anywhere, and a `step` of its own
  // would be a second answer that disagrees the moment someone swipes.
  // The strip is re-pinned whenever the window changes size, and that is what
  // stops it drifting.
  //
  // A phone's viewport height is not a constant: the URL bar shows and hides as
  // you scroll, and `100svh` sections re-layout when it does. A mandatory snap
  // container that re-lays-out mid-scroll re-snaps, and re-snapping from a
  // scrollLeft that is a fraction of a pixel off a boundary lands it on the
  // *other* boundary — which is the shake. Putting it back on the screen it was
  // already on, exactly, leaves it nothing to re-decide.
  //
  // `scrollLeft` rather than scrollTo: this is a correction, not a move, and it
  // must not animate.
  useEffect(() => {
    const rail = trackRef.current;
    const read = () => {
      const at = Math.round(rail.scrollLeft / rail.clientWidth);
      const next = Math.min(LAST, Math.max(0, at));
      stepRef.current = next;
      setStep(next);
    };
    const repin = () => {
      rail.scrollLeft = stepRef.current * rail.clientWidth;
      read();
    };
    read();
    rail.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", repin);
    return () => {
      rail.removeEventListener("scroll", read);
      window.removeEventListener("resize", repin);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    let ticking = false;
    const read = () => {
      ticking = false;
      // A pixel of slack: the two sections meet exactly, and an exact
      // comparison on a fractional layout flickers.
      // The same tenth of a screen the section below waits for before it draws
      // its own circle — one threshold, so there is no window in which both are
      // on the screen and none in which neither is.
      const vh = window.innerHeight;
      setHandedOver(section.getBoundingClientRect().bottom < vh - vh * 0.1);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Pinned, because a press inside a scroll container makes the browser scroll
  // that container into view on both axes — and the one that actually moves is
  // the page. See lib/pinPage.
  const goTo = (index) => {
    const rail = trackRef.current;
    const at = Math.min(LAST, Math.max(0, index));
    pinPage(() => rail.scrollTo({ left: at * rail.clientWidth, behavior: "smooth" }));
  };

  const onPointerDown = (event) => {
    press.current = { x: event.clientX, y: event.clientY };
  };
  const onClick = (event) => {
    if (event.target.closest("button, a")) return;
    const from = press.current;
    press.current = null;
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 10) return;
    const box = trackRef.current.getBoundingClientRect();
    goTo(step + (event.clientX < box.left + box.width / 2 ? -1 : 1));
  };

  // The wheel's own run. Everything after it is Act 2, where the circle has
  // left the wheel and there is no wheel to leave.
  const onWheel = step < HANDOFF;
  const blob = blobAt(step);
  // Which role is standing at the apex — and on the title card, -1, which is
  // the whole of how START works.
  //
  // The two shared a focus to begin with, on the reading that the design draws
  // the same circle in the same place on both frames and only takes the word
  // out of it. That is what the frames show and it is the wrong thing to build:
  // the word simply faded and the wheel sat still, so START looked like a label
  // being switched off rather than a position being left.
  //
  // At -1 the wheel is one step back, so the apex is held by the *last* role's
  // circle wearing the word. Advancing to the first role turns the wheel like
  // any other step: that circle carries START away down the left while the
  // first role's comes up from the right, growing and filling as it arrives.
  // Nothing on screen names a role on the title card, so which bead is standing
  // there is not something that can be got wrong.
  //
  // No clamp on the low side, and the arithmetic in slotAngle wants none: it
  // already works in whole turns, so a focus of -1 is a wheel that has been
  // round one fewer time rather than a special case.
  const focus = Math.min(ROLES.length - 1, step - 1);

  return (
    <section
      ref={sectionRef}
      data-ground="light"
      // `h-`, not `min-h-`. The canvas inside is 932 design px and can come
      // out taller than the window; with a minimum the section grew to fit it,
      // which put the section’s middle below the window’s and let the section
      // below peek in while the wheel was still being read. A screen tall and
      // clipped: the canvas is centred, the middle is the middle, and nothing
      // shows past the fold that has not been scrolled to.
      className="section-mobile-career relative flex h-[100svh] items-center justify-center overflow-hidden bg-white"
    >
      {/* The design's canvas, fitted to the screen's width. Every coordinate
          inside is the design's own, which is only true if the box they are
          measured against is the design's own — hence a fixed 430 x 932 rather
          than "whatever the phone is". Centred, so a screen with a different
          aspect loses the same amount top and bottom. */}
      <div className="relative w-full shrink-0" style={{ height: vw(CANVAS.height) }}>
        {/* The wheel, drawn once by the section. What changes from screen to
            screen is what passes over it — and which of its circles is at the
            top, which is the wheel turning rather than a new one being drawn.

            It turns by exactly what the circles step, so a circle keeps the
            ticks it was standing between. Gone on the last screen, which is the
            one frame the design draws without it. */}
        <Ring turn={-SLOT_NEAR_DEG * focus} shown={onWheel} />

        {/* The five circles. Every one of them is the same object: it waits on
            the ring at 40 with an outline, grows to 80 and fills yellow as it
            comes round to the apex, and shrinks back out again. Nothing is
            parked at the top. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {ROLES.map((role, i) => {
            const angle = slotAngle(i, focus);
            // Multiples of 360 are the apex: the wheel has been round, and the
            // slot has come back to the top.
            const here = angle % 360 === 0;
            return (
              <Bead
                key={role.n}
                angle={angle}
                size={here ? CIRCLE_BIG : CIRCLE_SMALL}
                focused={here}
                gone={!onWheel}
              >
                {/* Only the title card's circle says START. After that the
                    circle is whichever role has come round to the top, and the
                    word would be a label for something that already happened.

                    It rides the focused bead rather than sitting in a layer of
                    its own, which is only safe because the wheel does not turn
                    between the title card and the first role — the design puts
                    the same circle in the same place on both frames and only
                    takes the word out of it. Were it to turn, this would turn
                    with it. */}
                <p
                  className="font-['JetBrains_Mono'] font-bold leading-none text-black transition-opacity duration-300"
                  style={{ fontSize: vw(24), opacity: here && step === 0 ? 1 : 0 }}
                >
                  START
                </p>
              </Bead>
            );
          })}
        </div>

        {/* The circle, and it is one element for every place it goes: the
            wheel's bead, a face, the ground under three chapter words, and a
            plain disc at the end. Rendered from the first screen so that the
            move off the wheel is a move rather than an appearance — it is
            simply invisible, and exactly under the apex bead, until then. */}
        <div
          aria-hidden
          className="pointer-events-none absolute grid place-items-center rounded-full"
          style={{
            left: vw(blob.cx - blob.size / 2),
            top: vw(blob.cy - blob.size / 2),
            width: vw(blob.size),
            height: vw(blob.size),
            backgroundColor: "#ffd527",
            opacity: onWheel || handedOver ? 0 : 1,
            transition: `left ${TURN_MS}ms ${EASE}, top ${TURN_MS}ms ${EASE}, width ${TURN_MS}ms ${EASE}, height ${TURN_MS}ms ${EASE}, background-color 500ms ease-out, opacity ${TURN_MS / 2}ms ease-out`,
          }}
        >
        </div>

        {/* The screens themselves. A real scroll container for the reason
            LEARN's strip and the EXPERIENCE run are: a row that is swiped
            through wants the scrolling the platform already has. The taps are
            laid over it — left half back, right half on. */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onClick={onClick}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [overflow-anchor:none]"
        >
          <div className="relative w-full shrink-0 snap-center">
            {/* The design centres the title block on the canvas' middle, less
                97 — above the wheel, with the circle standing under it. */}
            <div
              className="absolute flex -translate-x-1/2 -translate-y-1/2 justify-center"
              style={{ left: `calc(50% + ${vw(4)})`, top: `calc(50% - ${vw(97)})` }}
            >
              <Title />
            </div>
          </div>

          {ROLES.map((role) => (
            <div key={role.n} className="relative w-full shrink-0 snap-center">
              <Role role={role} />
            </div>
          ))}

          {/* The handoff: nothing but the circle, which is not in here — it
              belongs to the section, because it arrives from the wheel and
              leaves for the section below. */}
          <div className="relative w-full shrink-0 snap-center" />
        </div>

        {/* Same reasoning as the EXPERIENCE strip's: nothing forces the seven
            screens to be seen, so the only thing saying there are seven is
            this. See StepDots, which both sections share. */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
          style={{ bottom: vw(40) }}
        >
          <StepDots count={STEPS} at={step} tone="light" />
        </div>
      </div>
    </section>
  );
}
