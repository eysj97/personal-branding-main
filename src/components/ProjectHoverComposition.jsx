export default function ProjectHoverComposition({ image, layout, open, pieces, assets, origin }) {
  const layers = assets ?? [{ image, layout, pieces }]
  const transformOrigin = origin ?? layout?.origin ?? '50% 50%'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        transformOrigin,
        transform: open ? 'scale(1)' : 'scale(0.45)',
        opacity: open ? 1 : 0,
        transition: open
          ? 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease-out'
          : 'transform 180ms cubic-bezier(0.4, 0, 1, 1), opacity 120ms ease-in',
        willChange: 'transform, opacity',
      }}
    >
      {layers.flatMap(({ image: layerImage, layout: layerLayout, pieces: layerPieces }) => {
        const imageLayout = { ...layerLayout }
        delete imageLayout.origin

        return layerPieces
          ? layerPieces.map((clipPath) => (
            <img key={`${layerImage}-${clipPath}`} src={layerImage} alt="" className="absolute max-w-none" style={{ ...imageLayout, clipPath }} />
          ))
          : <img key={layerImage} src={layerImage} alt="" className="absolute max-w-none" style={imageLayout} />
      })}
    </div>
  )
}
