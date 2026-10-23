// Small line icons for the landing page. Stroke uses currentColor so CSS sets the color and glow.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function MapPinIcon() {
  return (
    <svg {...base}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function ShieldCheckIcon() {
  return (
    <svg {...base}>
      <path d="M12 3l7 3v5.5c0 4.4-3 8.1-7 9.5-4-1.4-7-5.1-7-9.5V6l7-3z" />
      <path d="M8.8 12.2l2.2 2.2 4.4-4.6" />
    </svg>
  )
}

// Shield with a peso sign, for the fair pay check.
export function PesoShieldIcon() {
  return (
    <svg {...base}>
      <path d="M12 3l7 3v5.5c0 4.4-3 8.1-7 9.5-4-1.4-7-5.1-7-9.5V6l7-3z" />
      <path d="M10 16.5V8h2.4a2.3 2.3 0 0 1 0 4.6H10" />
      <path d="M8.5 10h7M8.5 11.8h7" />
    </svg>
  )
}

export function EnvelopeIcon() {
  return (
    <svg {...base} width={18} height={18}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  )
}

export function KeyIcon() {
  return (
    <svg {...base} width={18} height={18}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" />
    </svg>
  )
}

export function PersonIcon() {
  return (
    <svg {...base} width={18} height={18}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
    </svg>
  )
}
