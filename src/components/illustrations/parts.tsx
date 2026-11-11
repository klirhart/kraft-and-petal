import type { ReactNode } from 'react'
import c from './illustrations.module.css'

export type FlowerTone = 'petal' | 'petalDeep' | 'sun' | 'lilac' | 'cream' | 'terracotta'
export type LeafTone = 'leaf' | 'leafDeep'

export interface ArtProps {
  className?: string
  /** Text alternative. Without it the drawing is decorative and hidden from assistive tech. */
  label?: string
  /** Places the drawing inside a larger one (nested SVG), in the parent's units. */
  frame?: { x: number; y: number; size: number }
}

/** Rounds to one decimal so generated coordinates stay short. */
function r1(value: number): number {
  return Math.round(value * 10) / 10
}

export function Art({
  viewBox = '0 0 200 200',
  label,
  className,
  frame,
  children,
}: ArtProps & { viewBox?: string; children: ReactNode }) {
  if (frame) {
    return (
      <svg viewBox={viewBox} x={frame.x} y={frame.y} width={frame.size} height={frame.size}>
        {children}
      </svg>
    )
  }
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function Leaf({
  x,
  y,
  length,
  angle,
  tone = 'leaf',
  vein = true,
}: {
  x: number
  y: number
  length: number
  angle: number
  tone?: LeafTone
  vein?: boolean
}) {
  const l = length
  const w = r1(l * 0.36)
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path
        className={c[tone]}
        d={`M0 0C${r1(l * 0.25)} ${-w} ${r1(l * 0.75)} ${-w} ${l} 0C${r1(l * 0.75)} ${w} ${r1(l * 0.25)} ${w} 0 0Z`}
      />
      {vein ? <path className={c.vein} d={`M${r1(l * 0.12)} 0H${r1(l * 0.82)}`} /> : null}
    </g>
  )
}

/** Open-faced flower with separate petals. */
export function Daisy({
  x,
  y,
  r,
  tone,
  petals = 8,
}: {
  x: number
  y: number
  r: number
  tone: FlowerTone
  petals?: number
}) {
  const centre = tone === 'sun' ? c.terracotta : c.sun
  return (
    <g>
      {Array.from({ length: petals }, (_, index) => (
        <ellipse
          key={index}
          className={c[tone]}
          cx={x}
          cy={r1(y - r * 0.6)}
          rx={r1(r * 0.27)}
          ry={r1(r * 0.42)}
          transform={`rotate(${r1((index * 360) / petals)} ${x} ${y})`}
        />
      ))}
      <circle className={centre} cx={x} cy={y} r={r1(r * 0.3)} />
    </g>
  )
}

/** Round, ruffled flower: peony, rose or dahlia depending on the tones. */
export function Pompom({
  x,
  y,
  r,
  tone,
  heart,
}: {
  x: number
  y: number
  r: number
  tone: FlowerTone
  heart: FlowerTone
}) {
  const ruffles = 7
  return (
    <g>
      {Array.from({ length: ruffles }, (_, index) => {
        const angle = (index * 2 * Math.PI) / ruffles
        return (
          <circle
            key={index}
            className={c[tone]}
            cx={r1(x + Math.cos(angle) * r * 0.55)}
            cy={r1(y + Math.sin(angle) * r * 0.55)}
            r={r1(r * 0.5)}
          />
        )
      })}
      <circle className={c[heart]} cx={x} cy={y} r={r1(r * 0.55)} />
      <circle className={c[tone]} cx={r1(x - r * 0.08)} cy={r1(y - r * 0.08)} r={r1(r * 0.3)} />
      <circle className={c[heart]} cx={r1(x - r * 0.1)} cy={r1(y - r * 0.1)} r={r1(r * 0.1)} />
    </g>
  )
}

/** Upright cup-shaped flower. */
export function Tulip({ x, y, s, tone }: { x: number; y: number; s: number; tone: FlowerTone }) {
  const pivot = `${x} ${r1(y + s * 0.6)}`
  return (
    <g>
      <ellipse
        className={c[tone]}
        cx={r1(x - s * 0.26)}
        cy={y}
        rx={r1(s * 0.34)}
        ry={r1(s * 0.62)}
        transform={`rotate(-16 ${pivot})`}
      />
      <ellipse
        className={c[tone]}
        cx={r1(x + s * 0.26)}
        cy={y}
        rx={r1(s * 0.34)}
        ry={r1(s * 0.62)}
        transform={`rotate(16 ${pivot})`}
      />
      <ellipse className={c[tone]} cx={x} cy={r1(y + s * 0.08)} rx={r1(s * 0.36)} ry={r1(s * 0.6)} />
      <ellipse className={c.shade} cx={x} cy={r1(y + s * 0.08)} rx={r1(s * 0.36)} ry={r1(s * 0.6)} />
    </g>
  )
}

/** Four-point sparkle centred on (x, y). */
export function Sparkle({ x, y, size, tone }: { x: number; y: number; size: number; tone: FlowerTone }) {
  const s = size
  return (
    <path
      className={c[tone]}
      d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
    />
  )
}

/** Twine bow with two loops and two tails, knotted at (x, y). */
export function Bow({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const s = size
  return (
    <g>
      <path
        className={c.lineTwine}
        d={`M${x} ${y}c${r1(-16 * s)} ${r1(-14 * s)} ${r1(-26 * s)} ${r1(4 * s)} 0 0c${r1(16 * s)} ${r1(-14 * s)} ${r1(26 * s)} ${r1(4 * s)} 0 0`}
      />
      <path
        className={c.lineTwine}
        d={`M${x} ${y}l${r1(-9 * s)} ${r1(17 * s)}M${x} ${y}l${r1(8 * s)} ${r1(18 * s)}`}
      />
      <circle className={c.twine} cx={x} cy={y} r={r1(3.2 * s)} />
    </g>
  )
}

/** Terracotta pot with a twine tie. The rim top sits at y = 118. */
export function Pot() {
  return (
    <g>
      <path className={c.terracotta} d="M68 132h64l-8 50c-1 4-4 6-8 6H84c-4 0-7-2-8-6l-8-50Z" />
      <path className={c.shade} d="M116 132h16l-8 50c-1 4-4 6-8 6h-8l8-56Z" />
      <rect className={c.terracotta} x="60" y="118" width="80" height="17" rx="7" />
      <rect className={c.shine} x="66" y="121" width="38" height="4" rx="2" />
      <path className={c.lineTwine} d="M72 154q28 8 56 0" />
      <Bow x={100} y={158} size={0.6} />
    </g>
  )
}
