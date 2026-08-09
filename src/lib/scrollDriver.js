// How far the page has scrolled through a section, handed to a render function
// every frame the number changes.
//
// This is what the three pinned sections are built on, and it replaces what
// they used to do: claim the wheel, count ticks, and play a fixed-length tween
// per tick while forcing the page scroll to keep up. That made the animation a
// slideshow — how far you scrolled said nothing about how far the story got,
// only how many ticks you had spent. Half a wheel turn and three of them landed
// on the same frame; a trackpad flick skipped beats outright; and nothing could
// be held halfway, which is the one thing a reader actually wants from a scroll
// animation.
//
// Here the scroll position *is* the timeline. Nothing is claimed, nothing is
// snapped, and the page scrolls normally the whole way through — the sticky
// stage inside the section is what makes the range feel pinned.

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 0 when the section's top edge reaches the top of the viewport, 1 when its
 *  bottom edge does — i.e. how far through its own pinned range we are. */
export function sectionProgress(section) {
  const scrollable = section.offsetHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return clamp01((window.scrollY - section.offsetTop) / scrollable);
}

/**
 * Drive `render(progress)` from the page scroll.
 *
 * `follow` is a time constant in ms, not a per-frame fraction: the gap to the
 * scroll's own position closes by the same proportion per *millisecond*, so the
 * feel is identical at 60Hz and 120Hz. It is deliberately short. The point is
 * not to add weight — that would put the animation behind the scrollbar again,
 * which is the thing being fixed — it is that a mouse wheel arrives as a burst
 * of large discrete jumps, and rendering those raw makes a strip travelling
 * sideways look like it is stuttering. ~90ms is under a tenth of a second: it
 * reads as 1:1 while still smearing the steps into a slide. Pass 0 to render
 * the raw position with no smoothing at all.
 *
 * Returns `{ refresh, stop }`. Call `refresh()` after anything that changes how
 * tall the section is or where it sits, since both are measured and cached
 * rather than read on every scroll event.
 */
export function driveWithScroll(section, render, { follow = 90 } = {}) {
  let top = 0;
  let scrollable = 0;

  function measure() {
    top = section.offsetTop;
    scrollable = Math.max(0, section.offsetHeight - window.innerHeight);
  }

  function positionNow() {
    return scrollable > 0 ? clamp01((window.scrollY - top) / scrollable) : 0;
  }

  measure();
  let current = positionNow();
  let target = current;
  let rafId = null;
  let lastFrame = 0;

  render(current);

  function frame(now) {
    // Clamped: a backgrounded tab hands back a gap of seconds, and an
    // unclamped one of those would land the whole approach in a single frame —
    // undoing the smoothing exactly where it is most visible, on the frame the
    // tab comes back.
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
    lastFrame = now;

    const k = follow > 0 ? 1 - Math.exp(-dt / follow) : 1;
    current += (target - current) * k;
    // Exponential approach never actually arrives. Snap the last sliver so the
    // loop can stop, rather than repainting forever over a difference no one
    // can see.
    if (Math.abs(target - current) < 0.0002) current = target;

    render(current);

    if (current === target) {
      rafId = null;
      lastFrame = 0;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function onScroll() {
    target = positionNow();
    if (rafId === null && current !== target) {
      rafId = requestAnimationFrame(frame);
    }
  }

  // A resize moves both ends of the range under us, so there is no continuous
  // path from the old position to the new one — jump, and repaint at whatever
  // the new geometry says we are looking at.
  function onResize() {
    measure();
    target = positionNow();
    current = target;
    render(current);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  return {
    /** Re-measure the section and repaint where we now are. */
    refresh() {
      measure();
      target = positionNow();
      current = target;
      render(current);
    },
    stop() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}
