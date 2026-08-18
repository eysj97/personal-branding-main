// What is painted behind a point on the screen, as a light-or-dark answer.
//
// Two things on this page float over the whole document and have to stay legible
// against it: the Snapkeep word that parks over the chat character, and the
// chat panel itself, which has no background of its own on the desktop. Both
// cross between the site's two grounds — white, and #336bec — several times on
// the way down the page, and either colour laid on itself is invisible.
//
// Worked out by hit-testing rather than from the scroll position. "Past this
// section, so it must be white" is true for exactly one boundary; the page goes
// back to blue further down, and a section can paint a ground of its own inside
// a differently coloured root (the career section does). The only reliable
// answer to "what is behind this" is to ask what is behind it.

// Rec. 709 luma, over 0.55. The two colours this decides between are white and a
// mid blue, so anything near the middle can go either way without either choice
// being hard to read.
const LIGHT = 0.55;

/**
 * @param x       viewport px
 * @param y       viewport px
 * @param ignore  an element whose subtree is not the ground — the thing being
 *                drawn at that point, which is by definition there
 * @returns       true if what is behind is light
 */
export function isLightUnder(x, y, ignore) {
  // `elementsFromPoint` is a hit test, so anything `pointer-events: none` is
  // already left out. It comes back topmost-first, and most of what is over a
  // section is a transparent wrapper — hence walking down until something is
  // solid enough to count as the ground.
  for (const el of document.elementsFromPoint(x, y)) {
    if (ignore && (el === ignore || ignore.contains(el))) continue;
    const parts = /^rgba?\(([^)]+)\)/
      .exec(getComputedStyle(el).backgroundColor)
      ?.[1].split(",")
      .map(Number);
    if (!parts) continue;
    if ((parts[3] ?? 1) < 0.5) continue;
    return (
      (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255 > LIGHT
    );
  }
  return false;
}
