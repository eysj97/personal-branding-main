import { useEffect, useRef } from "react";

// The join between two sections, as a water surface the scroll disturbs.
//
// Three things this is not, each of which it was on the way here:
//
//   Not a stroke. The reference this started from bends a 2px line, which reads
//   as a wire stretched across the page. What is here is the edge where one
//   section's colour stops and the next one's begins, so both sides are painted
//   and the curve is only the border between them. That is also what makes the
//   rebound legible in both directions: sag down and the blue reaches into the
//   white, spring past the line and the white reaches back into the blue.
//
//   Not hover-driven. Nothing has to be found and pointed at — scrolling is the
//   disturbance, so it happens on the way past whether or not the reader knows
//   the seam is there. No pointer events anywhere in here, which also means it
//   cannot swallow a click meant for either section.
//
//   Not one curve. A single quadratic can only bulge in one place, and a bulge is
//   not a ripple. The boundary is a row of points, each one sprung to its own
//   rest height *and* coupled to its neighbours. Every so many pixels of scroll
//   drops a narrow dent somewhere along it; the coupling carries that dent
//   outward as rings, the free ends let the whole width move, and successive
//   drops overlap. None of the undulation is authored — it is what a coupled row
//   does when something falls on it.
const VIEW_W = 800;

// How many points the surface is made of. Enough that the wave has somewhere to
// travel and the curve through them is smooth; few enough that a frame is a
// couple of dozen additions.
const POINTS = 28;
// Pull back toward flat. Low, because this is the slow part — it sets how long
// the whole thing takes to give up, and water gives up slowly.
const STIFFNESS = 0.02;
// How hard each point pulls on the two beside it. This is the one that decides
// the *look*: it is the speed the disturbance travels sideways, so at 0 the
// surface would sag as one block and never ripple.
const COUPLING = 0.28;
// Kept just under 1 so several passes are visible before it settles. A single
// drop takes about 150 frames to go quiet, which is two and a half seconds of
// ringing — slow, because water is.
const DAMPING = 0.93;
// A drop is a narrow dent, measured in points. This is the number that decides
// whether the surface ripples at all: pushed with the shape of its own
// fundamental mode, a coupled row just oscillates in place and every part of it
// keeps the same proportion to every other, which is a sag going up and down
// rather than rings going outward. Dented in one place, the row has no choice
// but to pass the disturbance along.
const DROP_SIGMA = 2.5;
// Scroll pixels between drops. The seam is only on screen for a few hundred
// pixels of scroll, so this is about how many plops a reader gets on the way
// past — a handful, overlapping.
const DROP_EVERY = 90;
// Scroll pixels per frame into drop strength, and a ceiling on it. The ceiling
// is not cosmetic: a jump (an anchor, a restored scroll position) arrives as one
// enormous delta and would otherwise fire the surface off the screen.
const DROP_GAIN = 0.12;
const IMPULSE_LIMIT = 7;
// Successive drops land here, each one this far along from the last, wrapping.
// An irrational step never repeats and never clusters, so the drops walk across
// the width instead of pooling in one spot the way a fixed stride would.
const DROP_WALK = 0.6180339887;
// Far enough to be worth watching, near enough to stay inside the box.
const AMPLITUDE_LIMIT = 70;
// Below both of these there is nothing left to see, so the loop stops and the
// surface is snapped flat. Without this it runs forever at a hundredth of a
// pixel.
const REST_EPSILON = 0.05;

export default function SectionSeam({
  // Box height in px. Half above the boundary, half below — the surface's rest
  // line runs across its middle, and the ripple needs room either side of it.
  height = 220,
  // The section above, and the section below. Both are painted: this box owns
  // the whole strip and repaints it, so the boundary can move either way.
  fillAbove = "#336bec",
  fillBelow = "#ffffff",
  className = "",
}) {
  const svgRef = useRef(null);
  const aboveRef = useRef(null);
  const belowRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    const above = aboveRef.current;
    const below = belowRef.current;
    if (!svg || !above || !below) return undefined;

    const rest = height / 2;
    // Displacement from rest, and its velocity, per point. Every point moves,
    // the two on the ends included — see the coupling in tick() for why they
    // used to be pinned there and why that was wrong.
    const y = new Float32Array(POINTS);
    const v = new Float32Array(POINTS);
    const step = VIEW_W / (POINTS - 1);

    let raf = 0;
    let running = false;
    let visible = false;
    let lastScroll = window.scrollY;
    // Distance banked toward the next drop, and where along the width the last
    // one landed.
    let dropAccum = 0;
    let dropAt = 0.5;

    /** A smooth curve through the points: each one is a quadratic control point
     *  and the midpoints between them are where the segments meet. Cheaper than
     *  fitting cubics and, because every join lands on a midpoint, it is smooth
     *  at every one of them without any tangent bookkeeping. */
    function boundary() {
      let d = `M0,${rest + y[0]}`;
      for (let i = 1; i < POINTS - 1; i += 1) {
        const cx = i * step;
        const cy = rest + y[i];
        const mx = (cx + (i + 1) * step) / 2;
        const my = (cy + rest + y[i + 1]) / 2;
        d += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
      }
      d += ` Q${((POINTS - 1) * step).toFixed(2)},${(rest + y[POINTS - 1]).toFixed(2)} ${VIEW_W},${rest + y[POINTS - 1]}`;
      return d;
    }

    function draw() {
      // One edge string, used by both shapes — which is what guarantees they
      // meet. The upper one traces the boundary left to right and then closes
      // around the top of the box; the lower one traces the same boundary and
      // closes around the bottom. Neither reverses it: a quadratic list read
      // backwards is not the same curve, and rebuilding it in reverse is a
      // second place for the two edges to disagree.
      const edge = boundary();
      above.setAttribute("d", `${edge} L${VIEW_W},0 L0,0 Z`);
      below.setAttribute("d", `${edge} L${VIEW_W},${height} L0,${height} Z`);
    }

    function tick() {
      let peak = 0;
      // Every point, ends included, and each end coupled only to the side it
      // has a neighbour on.
      //
      // The ends were pinned at zero at first, on the reasoning that something
      // has to resist for a push to become a wave. It does not: the spring back
      // to rest is that resistance, and pinning meant the two ends could not
      // move *by definition* — the far right of the seam sat dead flat however
      // hard the surface was hit, and the last stretch of the curve, drawn from
      // that pinned point, was a straight line. A water surface across a screen
      // is not nailed down at the window edges.
      //
      // Reading a missing neighbour as "same height as me" is what makes an end
      // free: the coupling term goes to zero there, so the end is carried by
      // the one neighbour it has instead of being held against it.
      for (let i = 0; i < POINTS; i += 1) {
        const left = i > 0 ? y[i - 1] : y[i];
        const right = i < POINTS - 1 ? y[i + 1] : y[i];
        const pull = -STIFFNESS * y[i];
        const drag = COUPLING * (left - y[i] + (right - y[i]));
        v[i] = (v[i] + pull + drag) * DAMPING;
      }
      for (let i = 0; i < POINTS; i += 1) {
        y[i] = Math.max(
          -AMPLITUDE_LIMIT,
          Math.min(AMPLITUDE_LIMIT, y[i] + v[i]),
        );
        peak = Math.max(peak, Math.abs(y[i]), Math.abs(v[i]));
      }
      draw();

      if (peak < REST_EPSILON) {
        y.fill(0);
        v.fill(0);
        draw();
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      raf = requestAnimationFrame(tick);
    }

    /** One drop, centred on `at` (0..1 across the width). A gaussian rather than
     *  a single point: a one-point spike is a step the coupling has to spend its
     *  first frames smoothing out, and those frames look like a glitch. */
    function drop(at, strength) {
      const centre = at * (POINTS - 1);
      for (let i = 0; i < POINTS; i += 1) {
        const d = i - centre;
        v[i] += strength * Math.exp(-(d * d) / (2 * DROP_SIGMA * DROP_SIGMA));
      }
    }

    function onScroll() {
      const now = window.scrollY;
      const delta = now - lastScroll;
      lastScroll = now;
      if (!visible || !delta) return;

      // Scrolling does not push the surface, it drips on it. Distance travelled
      // is what earns a drop, so the cadence is the same whether the reader is
      // dragging a scrollbar or flicking a trackpad — a per-event impulse would
      // give a trackpad ten times as many as a mouse wheel for the same journey.
      dropAccum += Math.abs(delta);
      const strength = Math.max(
        -IMPULSE_LIMIT,
        Math.min(IMPULSE_LIMIT, delta * DROP_GAIN),
      );
      while (dropAccum >= DROP_EVERY) {
        dropAccum -= DROP_EVERY;
        dropAt = (dropAt + DROP_WALK) % 1;
        drop(dropAt, strength);
      }
      start();
    }

    // Nothing runs while the seam is off screen. It sits between two very tall
    // sections, so that is almost all of the time.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        lastScroll = window.scrollY;
        if (!visible && running) {
          cancelAnimationFrame(raf);
          running = false;
          y.fill(0);
          v.fill(0);
          draw();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(svg);

    window.addEventListener("scroll", onScroll, { passive: true });
    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [height]);

  return (
    <svg
      ref={svgRef}
      // Half of it hangs above the section it is mounted in, over the section
      // above. Nothing clips it: that section is `relative` with no overflow of
      // its own, and this one comes later in the markup, so it paints on top.
      // `w-full`, and it is not redundant next to `left-0`.
      //
      // An <svg> carrying a viewBox and no width/height attribute is a replaced
      // element with an intrinsic aspect ratio. For an absolutely positioned
      // replaced element, `width: auto` is resolved from that ratio and the
      // height — not from left and right — and the box is then over-constrained,
      // so `right` is dropped. `inset-x-0` therefore pinned the left edge and
      // left the seam exactly height × (800/220) = 800px wide, whatever the
      // window was: three quarters of a 1078px viewport, two fifths of a 1920
      // one. Everything past that was the sections' own straight edge, which is
      // why the right of the seam sat flat however hard the surface was hit.
      className={`pointer-events-none absolute left-0 w-full ${className}`}
      style={{ top: -height / 2, height }}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      // Stretched to the page's width rather than scaled to it. A seam spans the
      // screen; keeping its aspect would letterbox it, and the ripple is meant
      // to be wider and shallower on a wide window, which is what stretching a
      // fixed viewBox does for free.
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path ref={aboveRef} fill={fillAbove} />
      <path ref={belowRef} fill={fillBelow} />
    </svg>
  );
}
