import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import "./StaggeredMenu.css";

// React Bits' StaggeredMenu, adapted to this page rather than dropped into it.
// Three things changed, and each one is a thing the page already owns:
//
//   Controlled, not self-managing. The original keeps its own `open` state and
//   toggles it from a button of its own. Here the page owns that state
//   (MobileNotice) because the hamburger is on the *hero's* scroll timeline —
//   it fades in with the eyes — so the button cannot belong to a menu that only
//   exists once it is pressed.
//
//   Headerless. The original draws a logo and a toggle. The page has both
//   already (MobileHeader), and drawing a second set would put two names on one
//   screen and a button nobody's timeline reaches.
//
//   Items are actions, not links. The original renders <a href>. Every
//   destination here is a section of one continuous page, reached by releasing
//   the hero's scroll hold and then scrolling — a real href would reload it.
//
// What is kept verbatim is the part that was worth taking: the staggered
// entrance. Coloured layers slide in one after another, the panel follows them,
// and the labels rise out of their own rows once it has landed.
export default function StaggeredMenu({
  open,
  onClose,
  items = [],
  onSelect,
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  position = "right",
  colors = ["#ffd527", "#f460c0"],
  accentColor = "#336bec",
}) {
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  // The first pass has to place the panel without animating it. Without this
  // the open effect below runs on mount and plays the entrance at a menu nobody
  // asked for — and on a page where the hamburger is not even visible yet.
  const readyRef = useRef(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      const preLayers = preContainer
        ? Array.from(preContainer.querySelectorAll(".sm-prelayer"))
        : [];
      preLayerElsRef.current = preLayers;

      // Parked off the edge it will come back from, and only then made opaque:
      // the stylesheet starts both at opacity 0 so the very first paint cannot
      // show a panel sitting across the screen before this has run.
      const offscreen = position === "left" ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });
    });
    return () => ctx.revert();
  }, [position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const itemEls = Array.from(panel.querySelectorAll(".sm-panel-itemLabel"));
    const numberEls = Array.from(
      panel.querySelectorAll(".sm-panel-list[data-numbering] .sm-panel-item"),
    );
    const socialTitle = panel.querySelector(".sm-socials-title");
    const socialLinks = Array.from(panel.querySelectorAll(".sm-socials-link"));

    const offscreen = position === "left" ? -100 : 100;

    // Everything that will be animated in is put back to its start here rather
    // than being left where the last close finished. Reopening otherwise plays
    // from wherever the previous run was interrupted.
    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { "--sm-num-opacity": 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    // The stagger the component is named for: each colour layer starts 0.07
    // after the one before it, so what crosses the screen is a set of edges
    // rather than one.
    layers.forEach((el, i) => {
      tl.fromTo(
        el,
        { xPercent: offscreen },
        { xPercent: 0, duration: 0.5, ease: "power4.out" },
        i * 0.07,
      );
    });

    const lastLayer = layers.length ? (layers.length - 1) * 0.07 : 0;
    const panelInsert = lastLayer + (layers.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: offscreen },
      { xPercent: 0, duration: panelDuration, ease: "power4.out" },
      panelInsert,
    );

    if (itemEls.length) {
      // Started a little way into the panel's own travel, not after it: the
      // labels are meant to be arriving as the panel lands, so the sheet is
      // never on screen empty.
      const itemsStart = panelInsert + panelDuration * 0.15;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: "power4.out",
          stagger: { each: 0.1, from: "start" },
        },
        itemsStart,
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: "power2.out",
            "--sm-num-opacity": 1,
            stagger: { each: 0.08, from: "start" },
          },
          itemsStart + 0.1,
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsert + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(
          socialTitle,
          { opacity: 1, duration: 0.5, ease: "power2.out" },
          socialsStart,
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: { each: 0.08, from: "start" },
          },
          socialsStart + 0.04,
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    if (!panel) return;

    closeTweenRef.current?.kill();
    const offscreen = position === "left" ? -100 : 100;
    // Panel and layers leave together and quickly. The entrance is the gesture;
    // staggering the exit as well only makes the menu slow to get out of the way.
    closeTweenRef.current = gsap.to([...preLayerElsRef.current, panel], {
      xPercent: offscreen,
      duration: 0.32,
      ease: "power3.in",
      overwrite: "auto",
    });
  }, [position]);

  useEffect(() => {
    // Mount is not an open. See readyRef.
    if (!readyRef.current) {
      readyRef.current = true;
      if (!open) return undefined;
    }
    if (open) buildOpenTimeline()?.play(0);
    else playClose();
    return undefined;
  }, [open, buildOpenTimeline, playClose]);

  // Escape closes it, and the page underneath stops scrolling while it is up —
  // a full-screen sheet you can scroll the page behind reads as broken. Carried
  // over from the sheet this replaces; the library component has neither.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // No click-away. The panel is the full width of a phone, so there is no
  // "away" to click — the hamburger sits above it (see MobileHeader's z-index)
  // and is what closes it, which is also the only thing there is to press.
  return (
    <div
      className="staggered-menu-wrapper"
      style={{ "--sm-accent": accentColor }}
      data-position={position}
      data-open={open || undefined}
      // Inert to the pointer when shut, so the sheet parked off the right edge
      // cannot swallow a tap meant for the page.
      aria-hidden={!open}
    >
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {colors.slice(0, 4).map((c, i) => (
          <div key={c + i} className="sm-prelayer" style={{ background: c }} />
        ))}
      </div>

      <aside
        id="mobile-menu-panel"
        ref={panelRef}
        className="staggered-menu-panel"
        aria-label="메뉴"
      >
        <div className="sm-panel-inner">
          <ul
            className="sm-panel-list"
            role="list"
            data-numbering={displayItemNumbering || undefined}
          >
            {items.map((it, idx) => (
              <li className="sm-panel-itemWrap" key={it.label + idx}>
                <button
                  type="button"
                  className="sm-panel-item"
                  aria-label={it.ariaLabel ?? it.label}
                  // Not tabbable while the sheet is parked off screen — a
                  // keyboard would otherwise walk into three buttons nobody can
                  // see, which is the same bug as the invisible hamburger.
                  tabIndex={open ? 0 : -1}
                  onClick={() => onSelect?.(it)}
                >
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {displaySocials && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i}>
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="sm-socials-link"
                      tabIndex={open ? 0 : -1}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
