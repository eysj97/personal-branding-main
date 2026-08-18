import { useEffect, useState } from "react";
import { isLightUnder } from "./ground";

/**
 * What the page is painted, behind a given element.
 *
 * Two things float over the whole document and have to answer this: the fixed
 * header, and the Snapkeep word that parks over the chat character once its
 * section has gone by. Both cross between the site's two grounds several times
 * on the way down, and either colour laid on itself is invisible.
 *
 * Found rather than sampled. Reading the colour actually painted behind a point
 * (lib/ground's isLightUnder, still the fallback) is the right answer to "what
 * is behind this" and a fragile way to ask it: it depends on what the hit test
 * returns first, on every wrapper in between being transparent, and on the
 * computed background serialising as something the parser recognises. A section
 * knows what it is painted. It says so, in `data-ground`, and this only looks.
 *
 * `data-name` comes back with it because it is the same fact about the same
 * element — the one CAREER chapter that turns the page over also writes her
 * name backwards, and the header needs both.
 *
 * @param ref     the element to look behind
 * @param ignore  an element whose subtree is not the ground — normally the
 *                thing being painted, which is by definition there
 */
export function useGroundUnder(ref, ignore) {
  const [ground, setGround] = useState({ light: false, name: null });

  useEffect(() => {
    let ticking = false;
    const read = () => {
      ticking = false;
      const el = ref.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const skip = ignore?.current ?? el;
      const under = document
        .elementsFromPoint(x, y)
        .find((node) => !skip?.contains(node) && node.dataset?.ground);
      setGround({
        light: under ? under.dataset.ground === "light" : isLightUnder(x, y, skip),
        name: under?.dataset.name ?? null,
      });
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
  }, [ref, ignore]);

  return ground;
}
