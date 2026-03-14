const HIGHLIGHT = '#ef4444'
const REST = '#3a3a3a'
const SILHOUETTE = '#2a2a2a'

function fill(muscle, musclesHit) {
  return musclesHit.includes(muscle) ? HIGHLIGHT : REST
}

export default function BodyDiagram({ musclesHit = [] }) {
  const f = (m) => fill(m, musclesHit)

  return (
    <svg
      viewBox="0 0 280 200"
      width="100%"
      style={{ maxWidth: 480, display: 'block', margin: '0 auto' }}
      aria-label="Muscle diagram"
    >
      {/* ── FRONT VIEW (center x=70) ─────────────────────────────── */}
      <text x="70" y="10" textAnchor="middle" fill="#666" fontSize="9">FRONT</text>

      {/* Head */}
      <ellipse cx="70" cy="25" rx="13" ry="15" fill={SILHOUETTE} />

      {/* Neck */}
      <rect x="66" y="38" width="8" height="9" rx="2" fill={SILHOUETTE} />

      {/* Left shoulder (front delt) */}
      <ellipse cx="48" cy="51" rx="12" ry="7" fill={f('Shoulders')} />
      {/* Right shoulder */}
      <ellipse cx="92" cy="51" rx="12" ry="7" fill={f('Shoulders')} />

      {/* Chest */}
      <path d="M 55 46 Q 70 58 85 46 L 87 70 Q 70 80 53 70 Z" fill={f('Chest')} />

      {/* Left bicep */}
      <ellipse cx="41" cy="67" rx="7" ry="14" fill={f('Biceps')} />
      {/* Right bicep */}
      <ellipse cx="99" cy="67" rx="7" ry="14" fill={f('Biceps')} />

      {/* Left forearm */}
      <ellipse cx="39" cy="91" rx="5" ry="12" fill={SILHOUETTE} />
      {/* Right forearm */}
      <ellipse cx="101" cy="91" rx="5" ry="12" fill={SILHOUETTE} />

      {/* Midsection / core */}
      <rect x="55" y="70" width="30" height="20" rx="3" fill={SILHOUETTE} />

      {/* Hip connector */}
      <rect x="55" y="89" width="30" height="8" rx="2" fill={SILHOUETTE} />

      {/* Left quad */}
      <ellipse cx="62" cy="123" rx="13" ry="22" fill={f('Quads')} />
      {/* Right quad */}
      <ellipse cx="78" cy="123" rx="13" ry="22" fill={f('Quads')} />

      {/* Left shin */}
      <ellipse cx="61" cy="162" rx="9" ry="15" fill={SILHOUETTE} />
      {/* Right shin */}
      <ellipse cx="79" cy="162" rx="9" ry="15" fill={SILHOUETTE} />

      {/* Left foot */}
      <ellipse cx="61" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
      {/* Right foot */}
      <ellipse cx="79" cy="181" rx="10" ry="5" fill={SILHOUETTE} />

      {/* ── BACK VIEW (center x=210) ─────────────────────────────── */}
      <text x="210" y="10" textAnchor="middle" fill="#666" fontSize="9">BACK</text>

      {/* Head */}
      <ellipse cx="210" cy="25" rx="13" ry="15" fill={SILHOUETTE} />

      {/* Neck */}
      <rect x="206" y="38" width="8" height="9" rx="2" fill={SILHOUETTE} />

      {/* Left shoulder (rear delt) */}
      <ellipse cx="188" cy="51" rx="12" ry="7" fill={f('Shoulders')} />
      {/* Right shoulder */}
      <ellipse cx="232" cy="51" rx="12" ry="7" fill={f('Shoulders')} />

      {/* Back (lats + traps) */}
      <path d="M 193 46 Q 210 54 227 46 L 229 88 Q 210 96 191 88 Z" fill={f('Back')} />

      {/* Left tricep */}
      <ellipse cx="181" cy="67" rx="7" ry="14" fill={f('Triceps')} />
      {/* Right tricep */}
      <ellipse cx="239" cy="67" rx="7" ry="14" fill={f('Triceps')} />

      {/* Left forearm (back) */}
      <ellipse cx="179" cy="91" rx="5" ry="12" fill={SILHOUETTE} />
      {/* Right forearm (back) */}
      <ellipse cx="241" cy="91" rx="5" ry="12" fill={SILHOUETTE} />

      {/* Glutes */}
      <ellipse cx="200" cy="103" rx="13" ry="11" fill={f('Glutes')} />
      <ellipse cx="220" cy="103" rx="13" ry="11" fill={f('Glutes')} />

      {/* Left hamstring */}
      <ellipse cx="200" cy="133" rx="13" ry="22" fill={f('Hamstrings')} />
      {/* Right hamstring */}
      <ellipse cx="220" cy="133" rx="13" ry="22" fill={f('Hamstrings')} />

      {/* Left calf (back) */}
      <ellipse cx="199" cy="164" rx="9" ry="15" fill={SILHOUETTE} />
      {/* Right calf (back) */}
      <ellipse cx="221" cy="164" rx="9" ry="15" fill={SILHOUETTE} />

      {/* Left foot */}
      <ellipse cx="199" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
      {/* Right foot */}
      <ellipse cx="221" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
    </svg>
  )
}
