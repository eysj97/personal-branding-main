import { useSyncExternalStore } from "react";

/**
 * Where the page is, as something React re-renders on.
 *
 * App has always read `window.location` straight, which works while the only
 * way to change it is a full load — a typed URL, a link, `location.href = '/'`.
 * It stops working the moment anything navigates without reloading, because
 * nothing tells React the answer has changed and the page carries on rendering
 * the route it first saw.
 *
 * That matters now because Snapkeep opens as a page on a phone rather than as
 * an overlay, and a page you can go *back* from is the whole reason for it: the
 * hardware back button is how a phone closes things, and a component holding
 * `open` in state has nothing for it to act on. So the route becomes the state,
 * history becomes the undo, and back works without anything being written to
 * make it work.
 */

// `popstate` covers the back and forward buttons and nothing else — pushing a
// state does not fire it, by design, since the code that pushed already knows.
// Here it does not: the push happens in a section and the read happens in App.
// So `navigate` announces itself, and both events feed the same subscription.
const CHANGED = "route:changed";

function subscribe(onChange) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

// A string rather than an object, because useSyncExternalStore compares
// snapshots by identity: a fresh `{pathname, hash}` every call is a new object
// every call, which is an infinite re-render rather than a route.
const getSnapshot = () => window.location.pathname + window.location.hash;
const getServerSnapshot = () => "/";

/** The current path and hash, re-read whenever either changes. */
export function useRoute() {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const at = key.indexOf("#");
  return at === -1
    ? { pathname: key, hash: "" }
    : { pathname: key.slice(0, at), hash: key.slice(at) };
}

/** Go to `to` without reloading, leaving an entry for the back button.
 *
 *  And start the new page at its top. Nothing resets the scroll on its own here
 *  — a pushState is not a load, so the window stays exactly where the last page
 *  left it, and Snapkeep opened from the middle of a 12,000px portfolio came up
 *  scrolled to the middle of itself. Every way into it is a link from somewhere
 *  further down the page, so it was never opening at its top.
 *
 *  After the push, so the entry being left keeps the scroll it was read at and
 *  the entry being made starts at zero — which is what lets the back button
 *  return to the section the link was pressed in. `behavior: "instant"` because
 *  this is not a movement anyone should watch: the page underneath has already
 *  been replaced. */
export function navigate(to) {
  if (window.location.pathname + window.location.hash === to) return;
  window.history.pushState({ pushedByUs: true }, "", to);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * Undo the last `navigate`.
 *
 * `history.back()` rather than a push to "/", so that closing a page and
 * pressing back are the same movement rather than two entries piling up — press
 * back after a close that pushed and you would land back on the thing you just
 * closed.
 *
 * With nothing to go back to — someone opened /snapkeep directly, or shared the
 * link — there is no entry to pop, so this replaces the route instead. Checking
 * `history.length` is not reliable across browsers; what is reliable is whether
 * this document put the entry there, so `navigate` marks its own.
 */
export function goBack() {
  if (window.history.state?.pushedByUs) window.history.back();
  else {
    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new Event(CHANGED));
  }
}
