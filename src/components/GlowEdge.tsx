// Glowing diagonal edge of the glass panel with drifting light particles.
// The line runs from (top%, 0) to (bottom%, 100%); keep these in sync with --edge-top / --edge-bottom in landing.css.
const TOP = 60
const BOTTOM = 49

// Particles placed along the edge: t = position down the line (0-1), with varied size, drift and timing.
const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const t = (i * 0.618034) % 1
  return {
    t,
    size: 2 + ((i * 7) % 4),
    offset: ((i * 13) % 17) - 8, // px left/right of the line
    delay: (i * 0.73) % 6,
    duration: 5 + ((i * 3) % 5),
    hue: i % 3,
  }
})

const HUES = ['#5ce1ff', '#7aa8ff', '#ffffff']

export default function GlowEdge() {
  return (
    <div className="glow-edge" aria-hidden="true">
      <svg preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="glow-edge-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.45" stopColor="#3ee8ff" stopOpacity="1" />
            <stop offset="1" stopColor="#3b6bff" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* Wide soft glow, then the sharp core line. */}
        <line
          className="glow-edge-halo"
          x1={TOP}
          y1="0"
          x2={BOTTOM}
          y2="100"
          stroke="#3ee8ff"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={TOP}
          y1="0"
          x2={BOTTOM}
          y2="100"
          stroke="url(#glow-edge-line)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="glow-particle"
          style={{
            left: `calc(${TOP + (BOTTOM - TOP) * p.t}% + ${p.offset}px)`,
            top: `${p.t * 100}%`,
            width: p.size,
            height: p.size,
            background: HUES[p.hue],
            boxShadow: `0 0 ${p.size * 3}px ${HUES[p.hue]}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
