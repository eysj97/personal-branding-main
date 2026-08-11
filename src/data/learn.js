// The six practice builds the LEARN section deals out, and where each one
// opens. Shared, because there are two of them now: the desktop's scroll-driven
// deck (LearnSection) and the phone's swipeable strip (mobile/MobileLearn). The
// list is the content; how it is dealt is the section's business.
//
// Used exactly as supplied. These are browser mockups drawn in perspective —
// each one is a trapezoid, not a tilted rectangle: on card-6 the left edge is
// 1555px against 1781px on the right. That is the artwork, and no rotation or
// scale turns a trapezoid into a rectangle, so nothing tries. A card simply
// shows the file, and the transparent corners around the mockup are part of how
// it is drawn.
import card1 from "../assets/learn/card-1.avif";
import card2 from "../assets/learn/card-2.avif";
import card3 from "../assets/learn/card-3.avif";
import card4 from "../assets/learn/card-4.avif";
import card5 from "../assets/learn/card-5.avif";
import card6 from "../assets/learn/card-6.avif";
// The tab that hangs off each card's right edge, exported from Figma
// (node 283:206). Not a plain rounded rectangle: its top edge slants up
// slightly to the right, matching the perspective the mockups are drawn in.
export { default as learnTab } from "../assets/learn/tab.svg";

// The artwork's own proportions — the same in both layouts, and the same as the
// design gives on the phone (236.985 x 191).
export const LEARN_CARD_ASPECT = 446.5 / 554;
// How far the tab protrudes past a card's right edge, as a fraction of the
// card's width, and the tab drawing's own aspect. The height follows from the
// artwork rather than being set separately, so the slanted top edge keeps its
// designed angle at every card size.
export const LEARN_TAB_FRAC = 0.072;
export const LEARN_TAB_ASPECT = "41 / 122.372";

// Where a card opens, in a new tab. Two ways to fill one in:
//
//   1. Already hosted somewhere — use the full URL.
//   2. A local build — drop the self-contained folder into
//      public/learn/<slug>/ and point at '/learn/<slug>/index.html'.
//      Vite copies public/ into dist/ *untouched*, so the piece's own CSS and
//      JS keep working as-is. Two things follow from "untouched": it must not
//      live under src/ (the bundler would rewrite it), and Vite will not fix
//      up paths inside it — so keep its assets in the same folder and
//      reference them relatively ('./app.js') or from the root
//      ('/learn/<slug>/app.js').
//
// `slug: null` leaves a card unclickable: visible, but not a link. That is what
// an unfinished one should be, rather than a link that goes nowhere.
export const learnHref = (slug) => `/learn/${encodeURIComponent(slug)}/index.html`;

// Two things decide this list, and they pull in opposite directions:
//
//   - Each image is that site's own screenshot, so image and slug are a fixed
//     pair. card-1 is the chemical site, card-6 is Musign, and so on — the
//     numbering in the image filenames is unrelated to the running order.
//     Verified against each page's <title> and hero copy.
//   - The array is back-to-front, so it reads bottom-up: the LAST entry is the
//     card the viewer meets first, and the one that paints on top.
//
// So this list is the intended running order — 뮤자인, 대방산업, 크루어라모드,
// 와이스튜디오, 한화케미컬, 한국소비자원 — written in reverse. The slug numbers
// run with that order, which is why they count down here.
//
// Labels are each site's own <title>, which is not always the folder name.
export const LEARN_CARDS = [
  { image: card2, slug: "6-kca", label: "한국소비자원 매거진" },
  { image: card1, slug: "5-hanwha-chemical", label: "한화케미컬" },
  { image: card3, slug: "4-y-studio", label: "와이스튜디오" },
  { image: card4, slug: "3-crew-alamode", label: "크루 어 라 모드" },
  { image: card5, slug: "2-daebang", label: "대방산업" },
  { image: card6, slug: "1-mujain", label: "뮤자인" },
];
