#!/usr/bin/env node
/**
 * Rebuild the hero's glasses from the traced original.
 *
 *   node scripts/build-glasses.cjs
 *
 * Reads  src/assets/hero/glasses-raw.svg   (the machine trace, as supplied)
 * Writes src/assets/hero/glasses.svg       (what Hero.jsx imports)
 *
 * Always run this from the raw file. Re-running it over its own output smooths
 * an already-smoothed outline and the shape creeps a little further from the
 * artwork every time.
 *
 * ---------------------------------------------------------------------------
 * Why any of this is needed
 *
 * The trace puts every point on a whole pixel, 1-2px apart, so what should read
 * as a curve is a staircase. Two passes fix it:
 *
 *   1. Ramer-Douglas-Peucker throws away the points that are only there to
 *      describe the stair. Run per ring, starting from the sharpest corner —
 *      otherwise wherever the ring happens to start becomes a permanent kink.
 *   2. Catmull-Rom runs a curve through the points that survive, written out as
 *      the cubic Beziers SVG actually speaks.
 *
 * Nothing is redrawn by hand. Every kept point is one the tracer put there, so
 * the silhouette stays the artwork's own — and the check at the end says by how
 * much, rather than leaving it to the eye.
 *
 * Then the single evenodd path is taken apart into something that can be
 * animated. The lids have to move independently of the frame and a pupil has to
 * travel inside its lens without escaping it, so each lens ring becomes both a
 * white fill (the eye's own white, which the frame's hole was showing the page
 * through) and a clip path, the frame is drawn over the top, and the traced
 * pupils are replaced with ellipses on the lens centres.
 *
 * That last one is a real change to the drawing, and deliberate: the trace has
 * the eyes converging, and a pupil that starts off-centre has no room left to
 * look that way. From the middle it has the same room in every direction, which
 * is what lets the gaze travel in Hero.jsx be as large as it is.
 *
 * ---------------------------------------------------------------------------
 * Knobs
 *
 * EPS      how hard to simplify. Higher throws away more points and rounds the
 *          shape further; the check at the end is how you tell if you have gone
 *          too far. 1.0 lands inside the trace's own +-0.5px coordinate noise;
 *          2.4 starts visibly cutting corners off the frame.
 * TENSION  Catmull-Rom tension. 1 is the standard curve through the points.
 * PUPIL    pupil diameter as a fraction of its lens width, read off the trace
 *          (66 across in a lens of 218).
 */

const fs = require("fs");
const path = require("path");

const EPS = 1.0;
const TENSION = 1;
const PUPIL = 66 / 218;

const root = path.join(__dirname, "..");
const IN = path.join(root, "src/assets/hero/glasses-raw.svg");
const OUT = path.join(root, "src/assets/hero/glasses.svg");

// --- geometry ---------------------------------------------------------------

/** The trace's rings, as point lists. Closing duplicates dropped. */
function parse(d) {
  const subs = [];
  let cur = null;
  const re = /([MLZ])\s*(-?[\d.]+)?\s*(-?[\d.]+)?/gi;
  let m;
  while ((m = re.exec(d))) {
    const [, c, a, b] = m;
    if (c === "M") { cur = [[+a, +b]]; subs.push(cur); }
    else if (c === "L") cur.push([+a, +b]);
  }
  return subs.map((p) => {
    const q = p.slice();
    const f = q[0], l = q[q.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-6) q.pop();
    return q;
  });
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  let t = len ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

/** RDP on a closed ring, rotated to start at its sharpest corner. */
function simplify(pts, eps) {
  let best = 0, straightest = Math.PI;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[(i - 1 + pts.length) % pts.length];
    const c = pts[i];
    const n = pts[(i + 1) % pts.length];
    let da = Math.abs(
      Math.atan2(n[1] - c[1], n[0] - c[0]) - Math.atan2(c[1] - p[1], c[0] - p[0]),
    );
    if (da > Math.PI) da = 2 * Math.PI - da;
    if (Math.PI - da < straightest) { straightest = Math.PI - da; best = i; }
  }
  const rot = [...pts.slice(best), ...pts.slice(0, best)];
  const open = rdp([...rot, rot[0]], eps);
  open.pop();
  return open;
}

const r2 = (v) => Math.round(v * 100) / 100;
const fmt = (p) => `${r2(p[0])},${r2(p[1])}`;

function toBezier(pts, tension) {
  const n = pts.length;
  const at = (i) => pts[((i % n) + n) % n];
  let d = `M${fmt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d + "Z";
}

const box = (r) => {
  const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

// --- build ------------------------------------------------------------------

const raw = fs.readFileSync(IN, "utf8").match(/ d="([^"]+)"/)[1];
const traced = parse(raw);
const [frame, lensL, lensR] = traced.map((r) => simplify(r, EPS));

const bL = box(lensL), bR = box(lensR);
const cL = [(bL.x0 + bL.x1) / 2, (bL.y0 + bL.y1) / 2];
const cR = [(bR.x0 + bR.x1) / 2, (bR.y0 + bR.y1) / 2];
const rL = ((bL.x1 - bL.x0) * PUPIL) / 2;
const rR = ((bR.x1 - bR.x0) * PUPIL) / 2;
const d = (r) => toBezier(r, TENSION);

// data-lid and data-pupil are what Hero.jsx reaches for. Renaming them here
// silently stops the eyes opening and the gaze tracking.
const eye = (side, c, r, clip, ring) => `
  <g clip-path="url(#${clip})">
    <g data-lid="${side}" style="transform-box:fill-box;transform-origin:center">
      <path d="${d(ring)}" fill="#ffffff"/>
      <g data-pupil="${side}">
        <ellipse cx="${r2(c[0])}" cy="${r2(c[1])}" rx="${r2(r)}" ry="${r2(r * 1.04)}" fill="#0492bd"/>
        <ellipse data-glint cx="${r2(c[0] - r * 0.34)}" cy="${r2(c[1] - r * 0.36)}" rx="${r2(r * 0.26)}" ry="${r2(r * 0.26)}" fill="#ffffff"/>
      </g>
    </g>
  </g>`;

const svg = `<!--
  Built by scripts/build-glasses.cjs from glasses-raw.svg.

  You can edit this file by hand and the site will pick it up — colours, sizes,
  the pupils, all of it. Two things to know before you do:

  1. Running the build script again overwrites whatever is here. If a change is
     meant to last, either stop running the script or make the change there.
  2. Hero.jsx finds the moving parts by attribute: data-lid on each lens group
     (scaled vertically to open the eye) and data-pupil inside it (moved to
     follow the pointer). Round-tripping this file through a design tool will
     drop those attributes and the id-s the clip paths hang off, and the eyes
     will sit there shut and staring. To change the *shape*, edit
     glasses-raw.svg and re-run the script — that is what it is for.

  Safe to change by hand: any fill, the ellipse cx/cy/rx/ry, the viewBox.
-->
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="251" viewBox="0 0 768 251" fill="none">
  <defs>
    <clipPath id="hero-lens-l"><path d="${d(lensL)}"/></clipPath>
    <clipPath id="hero-lens-r"><path d="${d(lensR)}"/></clipPath>
  </defs>
${eye("left", cL, rL, "hero-lens-l", lensL)}
${eye("right", cR, rR, "hero-lens-r", lensR)}
  <path d="${d(frame)}${d(lensL)}${d(lensR)}" fill="#0492bd" fill-rule="evenodd" clip-rule="evenodd"/>
</svg>
`;

fs.writeFileSync(OUT, svg);

// --- check ------------------------------------------------------------------
//
// How far the smoothed outline strays from the traced one. Sample every curve
// densely and, for each original point, take the distance to the nearest
// sample. Silence here would be worse than useless: the whole claim of this
// script is that it only removes noise, and this is what tests it.

function sample(ring) {
  const pts = [];
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[(i - 1 + ring.length) % ring.length];
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    const p3 = ring[(i + 2) % ring.length];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, u = 1 - t;
      pts.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  return pts;
}

const names = ["프레임", "왼쪽 렌즈", "오른쪽 렌즈", "왼쪽 동공", "오른쪽 동공"];
const kept = [frame, lensL, lensR];
let worst = 0;
console.log("링           점 개수        최대오차   평균오차");
for (let i = 0; i < kept.length; i++) {
  const curve = sample(kept[i]);
  let max = 0, sum = 0;
  for (const p of traced[i]) {
    let best = Infinity;
    for (const q of curve) {
      const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (dd < best) best = dd;
    }
    const dist = Math.sqrt(best);
    sum += dist;
    if (dist > max) max = dist;
  }
  if (max > worst) worst = max;
  console.log(
    "  " + names[i].padEnd(11) +
    String(traced[i].length).padStart(4) + " -> " + String(kept[i].length).padStart(3) +
    max.toFixed(2).padStart(11) + "px" + (sum / traced[i].length).toFixed(2).padStart(9) + "px",
  );
}
console.log("  " + names[3] + " / " + names[4] + "   타원으로 교체 (렌즈 중심, 반지름 " + r2(rL) + " / " + r2(rR) + ")");
console.log("");
console.log("최대 오차 " + worst.toFixed(2) + "px — 그림 폭 768px의 " + ((worst / 768) * 100).toFixed(2) + "%");
console.log("→ " + path.relative(root, OUT));
