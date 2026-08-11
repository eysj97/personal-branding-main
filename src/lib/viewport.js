import { useSyncExternalStore } from "react";

/**
 * The one place the site decides it is on a phone.
 *
 * 768px, and it is not an arbitrary round number: it is where this particular
 * design stops fitting. Every section is laid out fluidly in vw down to a floor,
 * and those floors land together — LEARN's cards stop shrinking at 758px, the
 * hero's title at 600, the project drum at 1000. Above 768 the whole page scales
 * with the window and nothing is clamped that matters. Below it the floors take
 * over, elements stop getting smaller while the window keeps going, and the
 * layout runs off the side of the screen rather than adapting.
 *
 * So this is not "phone vs tablet". It is the width at which the desktop
 * composition stops being a composition, and below which a different layout has
 * to take over. Move it and check the floors again.
 */
export const MOBILE_MAX = 767;

const query = () => window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);

function subscribe(onChange) {
  const mq = query();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// matchMedia rather than an innerWidth listener: it fires only when the answer
// actually changes, so resizing a window does not re-render the page on every
// pixel, and it agrees with CSS about what the viewport width is — innerWidth
// includes the scrollbar and media queries do not.
const getSnapshot = () => query().matches;

// Nothing renders on a server here, but the store contract wants a third
// argument and guessing "mobile" would flash the wrong layout on first paint.
const getServerSnapshot = () => false;

/** True while the viewport is too narrow for the desktop composition. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
