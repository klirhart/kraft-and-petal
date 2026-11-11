import c from './illustrations.module.css'
import { Art, Bow, Daisy, Leaf, Pompom, Sparkle, Tulip, type ArtProps } from './parts'
import { PRODUCT_ILLUSTRATIONS } from './ProductArt'

function productArt(key: string) {
  const entry = PRODUCT_ILLUSTRATIONS[key]
  if (!entry) throw new Error(`Unknown illustration: ${key}`)
  return entry.Art
}

const SunnyBouquet = productArt('bouquet-sunny')

/*
 * The shop's shelf: a terracotta pot tied with twine, a vase of tulips and a
 * paper-wrapped pot of daisies in front of an arched window. Drawn in a
 * 520 x 360 box so it can sit inside the arched headline or stand alone.
 */
function ShelfScene() {
  return (
    <g>
      <path className={c.sky} d="M120 332V196a140 140 0 0 1 280 0v136Z" />
      <ellipse className={c.shade} cx="260" cy="334" rx="216" ry="9" />

      <Sparkle x={66} y={96} size={9} tone="sun" />
      <Sparkle x={452} y={84} size={11} tone="petalDeep" />
      <Sparkle x={474} y={204} size={7} tone="sun" />
      <Sparkle x={40} y={232} size={7} tone="petal" />
      <circle className={c.petal} cx="92" cy="52" r="4" />
      <circle className={c.lilac} cx="436" cy="150" r="4" />
      <circle className={c.leaf} cx="486" cy="120" r="3.5" />
      <circle className={c.petalDeep} cx="30" cy="150" r="3.5" />

      {/* Vase of tulips */}
      <path className={c.lineLeaf} d="M124 236V150M118 236c-4-34-18-48-26-62M130 236c4-34 16-50 28-62" />
      <Leaf x={124} y={236} length={50} angle={-112} />
      <Leaf x={124} y={236} length={46} angle={-66} tone="leafDeep" />
      <Tulip x={124} y={136} s={19} tone="petalDeep" />
      <Tulip x={90} y={160} s={16} tone="sun" />
      <Tulip x={160} y={160} s={16} tone="petal" />
      <rect className={c.lilac} x="110" y="230" width="28" height="22" rx="5" />
      <path className={c.lilac} d="M110 248h28c22 16 26 52 13 82H97c-13-30-9-66 13-82Z" />
      <path className={c.shine} d="M108 266c-9 15-11 36-5 54h9c-6-18-5-38 4-54Z" />

      {/* Terracotta pot */}
      <path
        className={c.lineLeaf}
        d="M260 230V100M238 230c-4-48-22-78-38-100M284 230c6-48 26-70 42-92M272 230c4-30 24-36 36-44M250 230c0-34-10-50-20-60"
      />
      <Leaf x={258} y={230} length={78} angle={-152} tone="leafDeep" />
      <Leaf x={262} y={230} length={78} angle={-28} tone="leafDeep" />
      <Leaf x={256} y={230} length={64} angle={-122} />
      <Leaf x={264} y={230} length={64} angle={-58} />
      <Daisy x={260} y={84} r={36} tone="cream" petals={10} />
      <Pompom x={196} y={120} r={27} tone="petalDeep" heart="sun" />
      <Daisy x={330} y={130} r={29} tone="sun" petals={12} />
      <Tulip x={314} y={176} s={17} tone="petal" />
      <Daisy x={228} y={164} r={17} tone="petal" petals={7} />
      <path className={c.terracotta} d="M200 244h120l-12 78c-1 5-5 8-10 8h-76c-5 0-9-3-10-8l-12-78Z" />
      <path className={c.shade} d="M296 248h24l-12 74c-1 5-5 8-10 8h-14l12-82Z" />
      <rect className={c.terracotta} x="190" y="226" width="140" height="24" rx="10" />
      <rect className={c.shine} x="200" y="231" width="62" height="5" rx="2.5" />
      <path className={c.lineTwine} d="M209 284q51 12 102 0" />
      <Bow x={260} y={290} size={0.9} />

      {/* Paper-wrapped pot of daisies */}
      <circle className={c.leafDeep} cx="384" cy="270" r="24" />
      <circle className={c.leafDeep} cx="434" cy="270" r="24" />
      <circle className={c.leaf} cx="408" cy="254" r="31" />
      <Daisy x={392} y={250} r={11} tone="cream" />
      <Daisy x={422} y={242} r={12} tone="petal" />
      <Daisy x={408} y={270} r={10} tone="sun" />
      <Daisy x={438} y={264} r={10} tone="cream" />
      <Daisy x={378} y={272} r={9} tone="petalDeep" />
      <path className={c.kraft} d="M364 284h88l-9 40c-1 4-4 6-8 6h-54c-4 0-7-2-8-6l-9-40Z" />
      <path className={c.kraftDeep} d="M432 284h20l-9 40c-1 4-4 6-8 6h-13l10-46Z" />
      <path className={c.lineTwine} d="M369 300q39 8 78 0" />
      <Bow x={408} y={304} size={0.6} />
    </g>
  )
}

/** The shelf scene on its own: about page, sign-in pages, narrow home page. */
export function HeroArt(props: ArtProps) {
  return (
    <Art viewBox="0 0 520 360" {...props}>
      <ShelfScene />
    </Art>
  )
}

/**
 * Home page hero on wide screens: the headline set on an arch over the shelf
 * scene. The lettering is real text, but an arch cannot wrap or reflow, so
 * the page keeps the same words in its `h1` and hides this drawing from
 * assistive technology.
 */
export function ArchedHeroArt({ headline, className }: { headline: string; className?: string }) {
  return (
    <svg viewBox="-30 0 1060 600" className={className} aria-hidden="true" focusable="false">
      <path id="hero-arch" fill="none" d="M-2 465A520 520 0 0 1 1002 465" />
      <text className={c.lettering} fontSize="58">
        <textPath href="#hero-arch" startOffset="50%" textAnchor="middle" textLength="1230" lengthAdjust="spacing">
          {headline}
        </textPath>
      </text>
      <svg viewBox="0 0 520 360" x="150" y="112" width="700" height="485">
        <ShelfScene />
      </svg>
    </svg>
  )
}

/** Not-found page: the number in the accent colour under a tipped-over pot. */
export function NotFoundArt(props: ArtProps) {
  return (
    <Art viewBox="0 0 320 220" {...props}>
      <g transform="rotate(-24 160 52)">
        <path className={c.lineLeaf} d="M160 44V14" />
        <Leaf x={160} y={40} length={22} angle={-150} />
        <Leaf x={160} y={36} length={20} angle={-36} tone="leafDeep" />
        <Daisy x={160} y={10} r={12} tone="sun" />
        <path className={c.terracotta} d="M142 50h36l-4 26c-1 3-3 4-6 4h-16c-3 0-5-1-6-4l-4-26Z" />
        <rect className={c.terracotta} x="138" y="42" width="44" height="11" rx="5" />
        <rect className={c.shine} x="143" y="44.5" width="18" height="3" rx="1.5" />
      </g>
      <circle className={c.kraftDeep} cx="204" cy="78" r="3" />
      <circle className={c.kraftDeep} cx="214" cy="70" r="2" />
      <circle className={c.kraftDeep} cx="196" cy="68" r="2" />
      <text className={c.letteringAccent} x="160" y="196" fontSize="132" textAnchor="middle">
        404
      </text>
    </Art>
  )
}

/** Brand mark: one tulip on its stem. */
export function LogoMark(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 40" {...props}>
      <path className={c.lineLeaf} d="M20 38V22" />
      <Leaf x={20} y={35} length={14} angle={-38} />
      <Leaf x={20} y={36} length={12} angle={-146} tone="leafDeep" vein={false} />
      <Tulip x={20} y={12} s={12} tone="petalDeep" />
    </Art>
  )
}

/** A twine bow for dividers. */
export function TwineBow(props: ArtProps) {
  return (
    <Art viewBox="0 0 60 40" {...props}>
      <Bow x={30} y={14} />
    </Art>
  )
}

export function StepPickArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path className={c.lineLeaf} d="M100 184V96M70 184c4-34 6-56-6-84M132 184c-4-30-8-48 8-72" />
      <Leaf x={100} y={150} length={40} angle={-30} />
      <Leaf x={100} y={136} length={40} angle={-150} tone="leafDeep" />
      <Daisy x={100} y={70} r={36} tone="petal" petals={9} />
      <Daisy x={60} y={88} r={22} tone="sun" />
      <Daisy x={142} y={100} r={22} tone="lilac" />
    </Art>
  )
}

export function StepWrapArt(props: ArtProps) {
  return (
    <Art {...props}>
      <SunnyBouquet frame={{ x: 0, y: 0, size: 200 }} />
    </Art>
  )
}

export function StepDeliverArt(props: ArtProps) {
  return (
    <Art {...props}>
      <rect className={c.kraft} x="50" y="96" width="100" height="84" rx="4" />
      <path className={c.terracotta} d="M36 104l64-58 64 58Z" />
      <path className={c.shade} d="M100 46l64 58h-22l-42-38Z" />
      <path className={c.leafDeep} d="M86 180v-38a14 14 0 0 1 28 0v38Z" />
      <circle className={c.sun} cx="108" cy="160" r="2.5" />
      <rect className={c.cream} x="120" y="116" width="20" height="22" rx="3" />
      <rect className={c.cream} x="60" y="116" width="20" height="22" rx="3" />
      <path className={c.stitch} d="M22 184h156" />
      <Leaf x={66} y={182} length={18} angle={-110} />
      <Leaf x={66} y={182} length={18} angle={-60} tone="leafDeep" />
      <Daisy x={66} y={158} r={11} tone="petal" />
      <path className={c.lineLeaf} d="M66 182v-18" />
    </Art>
  )
}

/** Empty state: a vase waiting for flowers. */
export function EmptyVaseArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path className={c.lineLeaf} d="M100 96C98 70 104 52 116 38" />
      <Leaf x={103} y={66} length={26} angle={-160} />
      <path className={c.sky} d="M80 98h40c-2 12 12 22 12 46 0 22-12 36-32 36s-32-14-32-36c0-24 14-34 12-46Z" />
      <path className={c.shine} d="M82 128c2-10 6-14 8-22h6c-2 10-8 14-8 30 0 10 2 18 8 26-10-4-16-18-14-34Z" />
      <rect className={c.sky} x="74" y="88" width="52" height="12" rx="6" />
      <rect className={c.shade} x="74" y="88" width="52" height="12" rx="6" />
      <path className={c.stitch} d="M36 182h128" />
    </Art>
  )
}

/** Empty state: an empty basket. */
export function EmptyBasketArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path className={`${c.lineTwine} ${c.thick}`} d="M62 100c0-60 76-60 76 0" />
      <path className={c.kraft} d="M52 106h96l-10 60c-1 6-6 10-12 10H74c-6 0-11-4-12-10l-10-60Z" />
      <path className={c.stitch} d="M62 128h76M65 148h70" />
      <rect className={c.kraftDeep} x="46" y="96" width="108" height="15" rx="7" />
      <Leaf x={150} y={180} length={26} angle={-20} />
      <path className={c.stitch} d="M30 184h140" />
    </Art>
  )
}

/** Error state: a flower that needs a drink. */
export function WiltedFlowerArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path className={c.lineLeaf} d="M96 182c2-46-6-80 14-98 14-12 32-2 30 20" />
      <Leaf x={99} y={146} length={30} angle={152} />
      <Daisy x={140} y={118} r={20} tone="petal" petals={6} />
      <ellipse className={c.petal} cx="68" cy="178" rx="9" ry="5" transform="rotate(-14 68 178)" />
      <ellipse className={c.petal} cx="130" cy="180" rx="9" ry="5" transform="rotate(10 130 180)" />
      <path className={c.stitch} d="M40 186h120" />
    </Art>
  )
}
