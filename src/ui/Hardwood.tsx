// Dark matte hardwood, generated in the browser (no texture download): vertical planks, each with
// its own tone, long fibrous grain from stretched noise, fine pores, and a soft vignette.
const PLANKS = [0.0, 0.14, 0.05, 0.2, 0.09, 0.17, 0.02, 0.12]

export function Hardwood() {
  return (
    <svg className="wood-surface" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <filter id="wood-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.16 0.0042" numOctaves="5" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.045  0 0 0 0 0.03  1.7 0 0 0 -0.5" />
        </filter>
        <filter id="wood-rings" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.012 0.0016" numOctaves="2" seed="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.055  0 0 0 0 0.035  1.1 0 0 0 -0.35" />
        </filter>
        <filter id="wood-pores" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.12" numOctaves="2" seed="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.95" />
        </filter>
        <radialGradient id="wood-vignette" cx="50%" cy="45%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="#3d281b" />
      {PLANKS.map((d, i) => (
        <rect key={i} x={`${i * 12.5}%`} width="12.5%" height="100%" fill={i % 2 ? '#2e1d13' : '#45301f'} opacity={0.35 + d * 2} />
      ))}
      <rect width="100%" height="100%" filter="url(#wood-rings)" />
      <rect width="100%" height="100%" filter="url(#wood-grain)" />
      <rect width="100%" height="100%" filter="url(#wood-pores)" opacity="0.6" />
      {PLANKS.slice(1).map((_, i) => (
        <line key={i} x1={`${(i + 1) * 12.5}%`} x2={`${(i + 1) * 12.5}%`} y1="0" y2="100%" stroke="#120a05" strokeOpacity="0.7" strokeWidth="1.5" />
      ))}
      <rect width="100%" height="100%" fill="url(#wood-vignette)" />
    </svg>
  )
}
