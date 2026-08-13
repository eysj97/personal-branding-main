/**
 * Reads type metrics off a screenshot.
 *
 * The model says *where* the text is; this says *how big*. Those are different
 * kinds of question and only one of them is a judgement — a size read off an
 * image is a measurement, and asking a model to estimate one when the pixels
 * are right there gets an estimate when it could have had a fact.
 *
 * It runs on whatever holds the pixels: the browser gets them from the canvas
 * an upload is already drawn into, so an uploaded screenshot is measured by
 * exactly the code that measured the built-in ones. That is the point. A
 * measurement pass that only ever ran on the eight references shipped with the
 * app would leave every uploaded screenshot guessing, and the guessing is what
 * this replaces.
 *
 * Returns, per text block: the ink height one line covers as a fraction of the
 * image's height, whether the original drops below its baseline, and a weight
 * read from how densely the ink sits.
 */

/** Is this pixel ink? Light type on a dark ground is ink too, so which way to
 *  look comes from the tone the analysis gave the element. */
const isInk = (value, light) => (light ? value > 190 : value < 120);

/**
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} image
 *   RGBA pixels, as ImageData gives them.
 * @param {Array} blocks Layout blocks; only 텍스트 ones are measured.
 * @returns {Record<number, { ink: number, descends: boolean, weight: number }>}
 *   Keyed by the block's index, so callers merge rather than rebuild.
 */
export function measureType(image, blocks) {
  const { data, width, height } = image;
  const out = {};

  blocks.forEach((block, index) => {
    if (block.role !== "텍스트") return;
    const left = Math.max(0, Math.round(block.x * width));
    const top = Math.max(0, Math.round(block.y * height));
    const w = Math.min(width - left, Math.round(block.w * width));
    const h = Math.min(height - top, Math.round(block.h * height));
    if (w < 4 || h < 4) return;

    const light = block.tone > 0.6;
    // How much ink each row of the block carries.
    const rows = [];
    for (let y = 0; y < h; y += 1) {
      let ink = 0;
      for (let x = 0; x < w; x += 1) {
        const p = ((top + y) * width + (left + x)) * 4;
        // Rec. 709 luma, the same weighting the wireframe's tones use.
        const value = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
        if (isInk(value, light)) ink += 1;
      }
      rows.push(ink);
    }

    // Split the inked rows into bands. A band is one line of type, so its
    // height is that line's ink — dividing the whole block by its line count
    // would fold in the leading between the lines.
    const inked = rows.map((n) => n > w * 0.015);
    const bands = [];
    let start = -1;
    for (let y = 0; y <= h; y += 1) {
      if (y < h && inked[y]) {
        if (start < 0) start = y;
      } else if (start >= 0) {
        bands.push([start, y - 1]);
        start = -1;
      }
    }
    const solid = bands.filter(([a, b]) => b - a + 1 >= 3);
    const declared = Math.max(1, Number(block.lines) || 1);
    // Fewer bands than lines means the split failed — lines set tight enough
    // to touch come back as one band the height of the paragraph. Report
    // nothing rather than a line four times its real size.
    if (solid.length < declared) return;

    const heights = solid.map(([a, b]) => b - a + 1).sort((a, b) => a - b);
    const line = heights[Math.floor(heights.length / 2)];

    // Does the original drop below its baseline? A descender is a few glyphs
    // deep, so its rows carry far less ink than the body above them. It
    // decides the case the stand-in is drawn in: all-caps Latin and Hangul
    // both stop at the baseline, and drawn in lowercase against the same ink
    // their own tails would eat a quarter of it.
    const band = rows.filter((_, y) => inked[y]);
    const sorted = [...band].sort((a, b) => b - a);
    const peak = sorted[Math.floor(sorted.length * 0.2)] || 1;
    const tail = band.slice(Math.ceil(band.length * 0.8));
    const descends = tail.length > 0 && tail.every((n) => n < peak * 0.3);

    const total = band.reduce((sum, n) => sum + n, 0);
    const density = total / (band.length * w || 1);

    out[index] = {
      ink: Number((line / height).toFixed(5)),
      descends,
      weight: density > 0.34 ? 700 : density > 0.2 ? 500 : 400,
    };
  });

  return out;
}

/** Folds measured metrics onto the blocks they belong to. Blocks that came
 *  from a component keep their own — a component is measured once, not once
 *  per instance. */
export const withMeasuredType = (blocks, metrics) =>
  blocks.map((block, index) => {
    if (block.of) return block;
    const type = metrics[index];
    return type ? { ...block, ...type } : block;
  });
