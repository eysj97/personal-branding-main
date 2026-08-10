// How long between one piece of the hover artwork arriving and the next. The
// pieces are meant to read as being dealt out of the folder, so this has to be
// long enough to see them land separately and short enough that the last one is
// not still on its way after the pointer has moved on.
const STEP_MS = 85
// Leaving is not dealt out. On the way in the order is the point; on the way
// out it only delays the folder closing, so everything goes at once.
const OUT_MS = 120

export default function ProjectHoverComposition({ image, layout, open, pieces, assets, origin }) {
  const layers = assets ?? [{ image, layout, pieces }]
  const transformOrigin = origin ?? layout?.origin ?? '50% 50%'

  // Every piece of every layer, flattened, so the stagger runs across the whole
  // composition rather than restarting inside each layer.
  const parts = layers.flatMap(({ image: layerImage, layout: layerLayout, pieces: layerPieces }) => {
    const imageLayout = { ...layerLayout }
    delete imageLayout.origin
    return (layerPieces ?? [null]).map((clipPath) => ({
      key: `${layerImage}-${clipPath ?? 'whole'}`,
      src: layerImage,
      style: clipPath ? { ...imageLayout, clipPath } : imageLayout,
    }))
  })

  return (
    // The whole cluster, brought down to the size the folder actually comes out
    // on screen (--folder-span, written each frame in ProjectSection).
    //
    // Every layout below is a percentage of the card's width, lifted from the
    // design. Left alone they resolve against this flat plate, which is a good
    // deal wider than the bent folder under it — 370px against 218px at 1920 —
    // so the cluster came out about 1.7x the size the design draws it and stood
    // that much further off the folder.
    //
    // One scale on the whole group, not a narrower box: narrowing shrinks the
    // pieces and their horizontal gaps while leaving every vertical offset
    // untouched, and the composition comes apart. The same factor on both axes
    // is what keeps every size and every gap in the proportion the design has.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        transform: "scale(var(--folder-span, 1))",
        transformOrigin: "50% 50%",
      }}
    >
      {parts.map((part, i) => (
        // A wrapper the size of the card per piece, rather than one wrapper
        // around the lot. The scale has to happen about the *folder's* middle
        // or the pieces do not fly out of it — they just swell where they
        // already are — and that only works if the box being scaled is the
        // card's box. One shared wrapper gave that but could only ever move
        // every piece on the same frame; one per piece keeps the origin and
        // buys each piece its own clock.
        <div
          key={part.key}
          className="absolute inset-0"
          style={{
            transformOrigin,
            transform: open ? 'scale(1)' : 'scale(0.45)',
            opacity: open ? 1 : 0,
            transition: open
              ? `transform 700ms cubic-bezier(0.16, 1, 0.3, 1) ${i * STEP_MS}ms, opacity 280ms ease-out ${i * STEP_MS}ms`
              : `transform ${OUT_MS + 60}ms cubic-bezier(0.4, 0, 1, 1), opacity ${OUT_MS}ms ease-in`,
            willChange: 'transform, opacity',
          }}
        >
          <img src={part.src} alt="" className="absolute max-w-none" style={part.style} />
        </div>
      ))}
    </div>
  )
}
