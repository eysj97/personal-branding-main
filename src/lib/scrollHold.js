// Keep the page inside a section until that section has finished saying what it
// has to say.
//
// The hero is the only thing on the site that needs this, and it needs it for a
// specific reason: its timeline is read off the scroll, so the eyes opening and
// the copy handing over from English to Korean happen *because* you scrolled,
// not on a clock. Anything that moves the scroll position in one go — the menu,
// a keyboard End, dragging a scrollbar, an anchor, a browser restoring where you
// were — skips straight past all of it, and the first thing a visitor sees is
// whatever section happens to be under the landing point. The one animation the
// site opens with is the one most easily missed.
//
// So: while the hero's own timeline has not played through, the page cannot be
// scrolled past the end of the hero's track. Ordinary scrolling never notices —
// the timeline finishes before the track does (see TIMELINE_END in the two
// heroes) — and a jump is caught and parked at the hero's last frame instead of
// landing three sections down.
//
// It lets go the first time the timeline completes, and never takes hold again.
// Being made to sit through the intro once is the point; being made to sit
// through it every time you scroll back up is a trap.

// Every hold currently in force. There is more than one: the hero holds until
// its intro has played, and on a phone LEARN holds until its six files have
// been swiped through. They never overlap in practice — you cannot be inside
// two sections at once — but they are both armed for the whole visit, so a
// deliberate jump has to let go of all of them and not just the nearest.
const holds = new Set();

/**
 * Clamp the page to `section`'s pinned range until `isDone()` first returns
 * true. Returns the release function, which is also what `releaseScrollHold`
 * calls; running it twice is harmless.
 */
export function holdInside(section, isDone) {
  function release() {
    window.removeEventListener("scroll", clamp);
    holds.delete(release);
  }

  function clamp() {
    if (isDone()) {
      release();
      return;
    }
    // The last scroll position at which the section is still pinned — its own
    // bottom edge reaching the bottom of the screen. Measured per event rather
    // than cached: the hero is sized in viewport units, so this moves whenever
    // the window does (and on a phone, whenever the address bar hides).
    const end = section.offsetTop + section.offsetHeight - window.innerHeight;
    if (window.scrollY > end) window.scrollTo(0, end);
  }

  window.addEventListener("scroll", clamp, { passive: true });
  holds.add(release);
  return release;
}

/**
 * Let go early.
 *
 * A menu item is not someone scrolling past the hero by accident — it is
 * someone asking for a particular section by name, and answering that with "no,
 * watch this first" is the site arguing with its own navigation. Every jump the
 * page makes on purpose calls this before it moves.
 */
export function releaseScrollHold() {
  // Copied first: each release removes itself from the set.
  for (const release of [...holds]) release();
}
