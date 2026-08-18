import { vw } from "./MobileHeader";

// How many screens there are and which one you are on.
//
// One component for both of the sections that are swiped through sideways.
// They had one each and the two had already drifted — different sizes,
// different weights for the ones you are not on — and a reader who has learnt
// what the dots mean under CAREER should not have to learn it again under
// EXPERIENCE.
//
// `tone` is the ground they are drawn on, not the colour they are: dots on
// white are black, dots on the page's blue are white.
//
// The weights are per ground and not one number, which is the thing that was
// wrong. Black at 30% on white is a clearly grey dot; white at 30% on #336bec
// is very nearly the blue itself — so on the blue sections the row read as one
// lit dot and nothing else, which is no count at all. The inactive ones are
// carried much heavier on the dark ground for exactly that reason.
const TONES = {
  light: { ink: "bg-black", rest: 0.35 },
  // Solid white on the blue. 0.45, then 0.6, then 0.85 all went unseen, and at
  // that point the fault is not the number: white on #336bec is a weak pairing
  // at 8px whatever the weight behind it. So the resting dots are white too,
  // full strength, and nothing about which one is current rides on opacity —
  // that is the pill's job below.
  dark: { ink: "bg-white", rest: 1 },
};

// The one you are on is a pill rather than a brighter dot. Opacity alone has to
// do two jobs at once — say which is current, and leave the others countable —
// and on a low-contrast ground it cannot do both. A shape change says "here"
// without needing the rest to fade to say it, which is what lets the resting
// weight above be chosen for legibility alone.
const DOT = 8;
const PILL = 22;

export default function StepDots({ count, at, tone = "light" }) {
  const { ink, rest } = TONES[tone] ?? TONES.light;
  return (
    // A row, and nothing about where it sits. It used to place itself —
    // `absolute inset-x-0 bottom:…` — which works only if the element it lands
    // in is the one it assumed. Dropped into a flex column it was never seen
    // at all. Each section positions it now, in whatever way that section
    // actually lays out.
    <div
      className="pointer-events-none flex items-center justify-center"
      style={{ gap: vw(7) }}
      role="presentation"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${ink}`}
          style={{
            width: vw(i === at ? PILL : DOT),
            height: vw(DOT),
            opacity: i === at ? 1 : rest,
            // A hairline of the ground under each one. On the blue the dots are
            // white on a mid blue and the shadow is what gives them an edge; on
            // the white they are black and it does nothing. Cheaper than a
            // second element and it cannot fall out of step with the dot.
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
      ))}
    </div>
  );
}
