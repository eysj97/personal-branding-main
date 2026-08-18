/**
 * Hold the page where it is while something inside it is pressed.
 *
 * Every section on the phone that is swiped through sideways has the same
 * problem, and it is the browser's rather than the page's: pressing anything
 * inside a scroll container gives that element focus, and the browser answers
 * focus by scrolling the element into view — on *both* axes. The horizontal
 * container is already where it should be, so what actually moves is the page,
 * a few dozen px up or down. Press twice and it moves twice, which is the shake.
 *
 * Programmatic scrolling on the strip does it too: `scrollTo` on a snap
 * container can nudge the nearest scrollable ancestor along with it.
 *
 * So the vertical position is read before and put back after — for two frames,
 * because the browser's own scroll-into-view lands on the frame after the
 * press, and a smooth scroll on the strip can carry into the one after that.
 *
 * The same idea as the overflow lock in ProjectAppWindow, which restores
 * `scrollY` on both edges for the same reason: anything that moves the page
 * without being asked has to be undone in the frame it happens, not later.
 */
export function pinPage(run) {
  const y = window.scrollY;
  run();
  const restore = () => {
    if (window.scrollY !== y) window.scrollTo(0, y);
  };
  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}
