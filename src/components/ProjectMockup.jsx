import imacFrame from '../assets/project/mockup/imac.png'
import ipadFrame from '../assets/project/mockup/ipad.png'
import phoneFrame from '../assets/project/mockup/iphone.png'

// Every number below is a percentage of the card box the cluster sits on
// (343x522 in Figma), so the whole rig scales with the card's clamp() size.
// Rotated pieces are placed by their *center* — Figma reports the rotated
// bounding box, and centering is the only placement that survives rotation.
const DEVICES = [
  { kind: 'imac', cx: 88.31, cy: 6.88, w: 90.82, h: 50.32, rot: 17.96, delay: 0 },
  { kind: 'ipad', cx: 128.19, cy: 34.7, w: 62.33, h: 29, rot: 26.95, delay: 60 },
  // Phone frames are all the same size; only the screen height varies,
  // because each screenshot was fitted to its own aspect ratio in Figma.
  { kind: 'phone', cx: -3.36, cy: 76.79, w: 23.36, h: 30.07, rot: -12.97, screenH: 92.57, delay: 120 },
  { kind: 'phone', cx: -36.96, cy: 87.42, w: 23.36, h: 30.07, rot: -10.53, screenH: 96.02, delay: 180 },
  { kind: 'phone', cx: 17.69, cy: 87.86, w: 23.36, h: 30.07, rot: 6.99, screenH: 93.72, delay: 150 },
  { kind: 'phone', cx: -11.52, cy: 99.34, w: 23.36, h: 30.07, rot: -31.15, screenH: 92.68, delay: 210 },
]

// Screen apertures, as insets on each device's own frame image.
const IMAC_SCREEN = { left: '3.85%', right: '4.02%', top: '6.47%', height: '62.43%' }
const IPAD_SCREEN = { left: '9.5%', right: '9.5%', top: '6.92%', bottom: '6.85%' }
const PHONE_SCREEN_W = 88.12 // % of the phone frame's width
const PHONE_SCREEN_RADIUS = '14.2% / 6.8%' // Figma's 10px, kept proportional

function ImacDevice({ screen }) {
  return (
    <div className="relative h-full w-full">
      <img src={imacFrame} alt="" className="absolute inset-0 h-full w-full" />
      {/* Screen sits *over* the iMac frame — its glass area is opaque black. */}
      <div className="absolute overflow-hidden" style={IMAC_SCREEN}>
        <img
          src={screen}
          alt=""
          className="absolute max-w-none"
          // Custom pan/zoom from Figma, not an auto-cover fit.
          style={{ width: '167.25%', height: '175.32%', left: '-3.61%', top: '-28.25%' }}
        />
      </div>
    </div>
  )
}

function IpadDevice({ screen }) {
  return (
    <div className="relative h-full w-full">
      {/* Source PNG is portrait; the design uses it landscape, home button on
          the right — so it's turned a quarter turn counter-clockwise. Sizing
          it at the container's inverted proportions makes the rotated result
          land exactly on the box. */}
      <img
        src={ipadFrame}
        alt=""
        className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90"
        style={{ width: '70.81%', height: '141.21%' }}
      />
      <div className="absolute overflow-hidden" style={IPAD_SCREEN}>
        <img src={screen} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  )
}

function PhoneDevice({ screen, screenH }) {
  return (
    <div className="relative h-full w-full">
      {/* Screen goes under the frame — the frame's display area is transparent. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        style={{ width: `${PHONE_SCREEN_W}%`, height: `${screenH}%`, borderRadius: PHONE_SCREEN_RADIUS }}
      >
        <img src={screen} alt="" className="h-full w-full object-cover" />
      </div>
      <img src={phoneFrame} alt="" className="absolute inset-0 h-full w-full" />
    </div>
  )
}

/**
 * The device cluster that fans out of a project card on hover.
 *
 * Renders into a box that exactly overlays the card (`absolute inset-0`), and
 * deliberately overflows it — the iPad hangs off the right edge, the phones off
 * the bottom-left, same as the Figma frame.
 *
 * `screens` is the per-project artwork: { imac, ipad, phones: [4 images] }.
 */
export default function ProjectMockup({ screens, open }) {
  const { imac, ipad, phones } = screens
  let phoneIndex = -1

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        // Collapses into the middle of the card when closed, so opening reads
        // as the devices springing out of the folder rather than fading in.
        transformOrigin: '50% 55%',
        transform: open ? 'scale(1)' : 'scale(0.4)',
        transition: open
          ? 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 180ms cubic-bezier(0.4, 0, 1, 1)',
        willChange: 'transform',
      }}
    >
      {DEVICES.map((device, i) => {
        const { kind, cx, cy, w, h, rot, screenH, delay } = device
        if (kind === 'phone') phoneIndex += 1

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${cx}%`,
              top: `${cy}%`,
              width: `${w}%`,
              height: `${h}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              opacity: open ? 1 : 0,
              transition: open
                ? `opacity 450ms ease-out ${delay}ms`
                : 'opacity 120ms ease-in',
            }}
          >
            {kind === 'imac' && <ImacDevice screen={imac} />}
            {kind === 'ipad' && <IpadDevice screen={ipad} />}
            {kind === 'phone' && <PhoneDevice screen={phones[phoneIndex]} screenH={screenH} />}
          </div>
        )
      })}
    </div>
  )
}
