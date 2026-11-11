import type { ComponentType, ReactNode } from 'react'
import c from './illustrations.module.css'
import { Art, Bow, Daisy, Leaf, Pompom, Pot, Tulip, type ArtProps } from './parts'

/* ---------- Bouquets ---------- */

function Wrap() {
  return (
    <g>
      <path className={c.kraft} d="M44 90q56 24 112 0l-37 94q-19 8-38 0L44 90Z" />
      <path className={c.kraftDeep} d="M156 90q-30 13-56 12l19 82 37-94Z" />
      <path className={c.stitch} d="M56 104q44 16 88 0" />
    </g>
  )
}

function Bouquet({ flowers, ...art }: ArtProps & { flowers: ReactNode }) {
  return (
    <Art {...art}>
      <Leaf x={86} y={92} length={62} angle={-152} tone="leafDeep" />
      <Leaf x={114} y={92} length={62} angle={-28} tone="leafDeep" />
      <Leaf x={92} y={84} length={58} angle={-118} />
      <Leaf x={108} y={84} length={58} angle={-62} />
      <Wrap />
      {flowers}
      <path className={c.lineTwine} d="M86 150q14 7 28 0" />
      <Bow x={100} y={154} />
    </Art>
  )
}

function BouquetBlush(art: ArtProps) {
  return (
    <Bouquet
      {...art}
      flowers={
        <>
          <Daisy x={62} y={86} r={15} tone="cream" />
          <Daisy x={138} y={86} r={15} tone="cream" />
          <Pompom x={76} y={62} r={21} tone="petal" heart="petalDeep" />
          <Pompom x={124} y={62} r={21} tone="petal" heart="petalDeep" />
          <Pompom x={100} y={84} r={24} tone="petal" heart="petalDeep" />
          <Pompom x={100} y={42} r={17} tone="petalDeep" heart="petal" />
        </>
      }
    />
  )
}

function BouquetSunny(art: ArtProps) {
  return (
    <Bouquet
      {...art}
      flowers={
        <>
          <Daisy x={100} y={38} r={20} tone="sun" />
          <Daisy x={66} y={64} r={22} tone="sun" />
          <Daisy x={134} y={64} r={22} tone="sun" />
          <Daisy x={84} y={94} r={17} tone="cream" />
          <Daisy x={118} y={92} r={19} tone="sun" />
          <Daisy x={100} y={66} r={16} tone="cream" />
        </>
      }
    />
  )
}

function BouquetLilac(art: ArtProps) {
  return (
    <Bouquet
      {...art}
      flowers={
        <>
          <Tulip x={100} y={36} s={24} tone="lilac" />
          <Tulip x={70} y={56} s={24} tone="lilac" />
          <Tulip x={130} y={56} s={24} tone="lilac" />
          <Tulip x={86} y={80} s={22} tone="petal" />
          <Tulip x={116} y={80} s={22} tone="lilac" />
        </>
      }
    />
  )
}

function BouquetCream(art: ArtProps) {
  return (
    <Bouquet
      {...art}
      flowers={
        <>
          <Leaf x={100} y={70} length={46} angle={-90} tone="leaf" />
          <Leaf x={78} y={90} length={34} angle={-170} tone="leaf" />
          <Leaf x={122} y={90} length={34} angle={-10} tone="leaf" />
          <Pompom x={74} y={64} r={20} tone="cream" heart="sun" />
          <Pompom x={126} y={64} r={20} tone="cream" heart="sun" />
          <Pompom x={100} y={86} r={23} tone="cream" heart="sun" />
        </>
      }
    />
  )
}

function BouquetAutumn(art: ArtProps) {
  return (
    <Bouquet
      {...art}
      flowers={
        <>
          <Daisy x={64} y={84} r={15} tone="sun" />
          <Daisy x={136} y={84} r={15} tone="sun" />
          <Pompom x={76} y={60} r={21} tone="petalDeep" heart="terracotta" />
          <Pompom x={124} y={60} r={21} tone="terracotta" heart="petalDeep" />
          <Pompom x={100} y={84} r={24} tone="petalDeep" heart="terracotta" />
          <Pompom x={100} y={40} r={16} tone="terracotta" heart="sun" />
        </>
      }
    />
  )
}

/* ---------- Plants ---------- */

function MonsteraLeaf({ x, y, angle, scale = 1 }: { x: number; y: number; angle: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path className={c.leafDeep} d="M0 30C-22 26-32 8-28-10-24-26-10-32 0-32s24 6 28 22C32 8 22 26 0 30Z" />
      <path className={c.cut} d="M-29-8l15 4M-27 10l14-4M29-8l-15 4M27 10l-14-4" />
      <path className={`${c.lineCream} ${c.thin}`} d="M0-24V24" />
    </g>
  )
}

function PlantMonstera(art: ArtProps) {
  return (
    <Art {...art}>
      <path className={c.lineLeaf} d="M100 120C98 96 84 84 70 78M100 120c2-24 14-40 30-50M100 120V62" />
      <MonsteraLeaf x={62} y={66} angle={-38} />
      <MonsteraLeaf x={138} y={58} angle={34} />
      <MonsteraLeaf x={100} y={38} angle={0} scale={0.8} />
      <Pot />
    </Art>
  )
}

function PlantSnake(art: ArtProps) {
  return (
    <Art {...art}>
      <path className={c.leaf} d="M72 122C62 96 60 64 66 40c10 20 16 52 18 82Z" />
      <path className={c.leaf} d="M118 122c2-34 10-62 22-80 4 26 0 56-8 80Z" />
      <path className={c.leafDeep} d="M86 122c-6-36-4-74 6-104 10 32 12 68 8 104Z" />
      <path className={c.leafDeep} d="M102 122c0-30 4-58 14-78 6 26 4 54-2 78Z" />
      <path
        className={`${c.lineCream} ${c.thin}`}
        d="M88 52l8 4M86 72l12 5M86 92l13 5M108 74l8 3M106 94l10 4M68 66l6 3M70 88l9 4M132 70l6-2M128 92l8-2"
      />
      <Pot />
    </Art>
  )
}

function PlantSucculent(art: ArtProps) {
  const outer = [-170, -146, -118, -90, -62, -34, -10]
  const inner = [-150, -120, -90, -60, -30]
  return (
    <Art {...art}>
      {outer.map((angle) => (
        <Leaf key={angle} x={100} y={120} length={46} angle={angle} tone="leafDeep" vein={false} />
      ))}
      {inner.map((angle) => (
        <Leaf key={angle} x={100} y={120} length={32} angle={angle} tone="leaf" vein={false} />
      ))}
      <Leaf x={100} y={120} length={20} angle={-105} tone="leafDeep" vein={false} />
      <Leaf x={100} y={120} length={20} angle={-75} tone="leafDeep" vein={false} />
      <circle className={c.petal} cx="100" cy="100" r="5" />
      <Pot />
    </Art>
  )
}

/* ---------- Gifts ---------- */

function GiftBox(art: ArtProps) {
  return (
    <Art {...art}>
      <Leaf x={112} y={78} length={44} angle={-48} tone="leafDeep" />
      <Leaf x={116} y={80} length={36} angle={-12} />
      <Daisy x={144} y={52} r={14} tone="petal" />
      <rect className={c.kraft} x="48" y="96" width="104" height="80" rx="6" />
      <path className={c.shade} d="M48 96h104v10H48z" />
      <rect className={c.kraftDeep} x="42" y="78" width="116" height="24" rx="6" />
      <path className={c.stitch} d="M54 168h92" />
      <path className={c.lineTwine} d="M100 80v96M48 134h104" />
      <Bow x={100} y={80} size={1.15} />
    </Art>
  )
}

function GiftCandle(art: ArtProps) {
  return (
    <Art {...art}>
      <path className={c.sun} d="M100 30c10 12 14 20 14 28a14 14 0 0 1-28 0c0-8 4-16 14-28Z" />
      <path className={c.petalDeep} d="M100 46c5 6 7 10 7 14a7 7 0 0 1-14 0c0-4 2-8 7-14Z" />
      <path className={c.line} d="M100 66v16" />
      <rect className={c.sky} x="58" y="82" width="84" height="98" rx="14" />
      <rect className={c.cream} x="66" y="90" width="68" height="82" rx="8" />
      <rect className={c.shine} x="64" y="88" width="10" height="84" rx="5" />
      <rect className={c.kraft} x="70" y="116" width="60" height="42" rx="4" />
      <path className={c.stitch} d="M76 152h48" />
      <Daisy x={100} y={133} r={12} tone="lilac" />
      <path className={c.lineTwine} d="M58 102h84" />
      <Bow x={100} y={102} size={0.55} />
    </Art>
  )
}

function GiftCard(art: ArtProps) {
  return (
    <Art {...art}>
      <g transform="rotate(9 100 110)">
        <rect className={c.kraftDeep} x="34" y="70" width="132" height="92" rx="6" />
        <path className={c.shade} d="M34 76l66 44 66-44v-2a4 4 0 0 0-4-4H38a4 4 0 0 0-4 4Z" />
      </g>
      <g transform="rotate(-6 100 100)">
        <rect className={c.cream} x="56" y="34" width="88" height="124" rx="6" />
        <rect className={c.stitch} x="63" y="41" width="74" height="110" rx="3" />
        <path className={c.lineLeaf} d="M100 140V86" />
        <Leaf x={100} y={126} length={24} angle={-150} />
        <Leaf x={100} y={114} length={24} angle={-30} />
        <Daisy x={100} y={76} r={17} tone="petalDeep" />
      </g>
    </Art>
  )
}

/* ---------- Workshops ---------- */

function WorkshopWreath(art: ArtProps) {
  const leaves = Array.from({ length: 16 }, (_, index) => {
    const turn = (index / 16) * 360
    const radians = (turn * Math.PI) / 180
    return {
      turn,
      x: Math.round((100 + Math.cos(radians) * 56) * 10) / 10,
      y: Math.round((106 + Math.sin(radians) * 56) * 10) / 10,
    }
  })
  return (
    <Art {...art}>
      <path className={c.lineTwine} d="M100 50V22" />
      <Bow x={100} y={26} size={0.8} />
      <circle className={`${c.lineTwine} ${c.thick}`} cx="100" cy="106" r="56" />
      {leaves.map(({ turn, x, y }, index) => (
        <Leaf
          key={turn}
          x={x}
          y={y}
          length={30}
          angle={turn + (index % 2 === 0 ? 62 : 118)}
          tone={index % 2 === 0 ? 'leafDeep' : 'leaf'}
        />
      ))}
      <Pompom x={62} y={146} r={15} tone="petal" heart="petalDeep" />
      <Pompom x={88} y={162} r={12} tone="petalDeep" heart="petal" />
      <Daisy x={44} y={122} r={11} tone="cream" />
    </Art>
  )
}

function WorkshopBouquet(art: ArtProps) {
  return (
    <Art {...art}>
      <path className={c.lineLeaf} d="M30 118l66-62M52 136l70-52" />
      <Leaf x={58} y={92} length={26} angle={-112} />
      <Leaf x={82} y={114} length={26} angle={18} />
      <Daisy x={100} y={52} r={18} tone="sun" />
      <Tulip x={130} y={72} s={20} tone="petal" />
      <circle className={c.twine} cx="58" cy="156" r="26" />
      <path
        className={`${c.lineCream} ${c.thin}`}
        d="M36 148q22-14 44 2M34 160q24-10 48 2M40 172q18-8 38 0M48 134q14 20 8 46M66 131q12 22 2 50"
      />
      <path className={c.lineTwine} d="M82 166c14 10 24-4 34 6s20 2 24 8" />
      <path className={c.sky} d="M138 150l10-66 10 6-12 62Z" />
      <path className={c.sky} d="M152 150l-18-64-9 7 19 60Z" />
      <path className={c.shade} d="M152 150l-18-64-9 7 19 60Z" />
      <circle className={c.ink} cx="145" cy="130" r="3" />
      <circle className={c.lineTerracotta} cx="132" cy="166" r="11" />
      <circle className={c.lineTerracotta} cx="160" cy="166" r="11" />
    </Art>
  )
}

/* ---------- Registry ---------- */

export interface ProductIllustration {
  /** Shown to operators when choosing a picture. */
  label: string
  /** Suggested text alternative, which operators can edit. */
  defaultAlt: string
  Art: ComponentType<ArtProps>
}

/**
 * Illustrations that ship with the site, keyed by the part of
 * `product_images.storage_path` after `illustrations/`.
 */
export const PRODUCT_ILLUSTRATIONS: Record<string, ProductIllustration> = {
  'bouquet-blush': {
    label: 'Bouquet, pink peonies',
    defaultAlt: 'Pink peonies wrapped in kraft paper and tied with a twine bow',
    Art: BouquetBlush,
  },
  'bouquet-sunny': {
    label: 'Bouquet, yellow daisies',
    defaultAlt: 'Yellow daisies wrapped in kraft paper and tied with a twine bow',
    Art: BouquetSunny,
  },
  'bouquet-lilac': {
    label: 'Bouquet, lilac tulips',
    defaultAlt: 'Lilac tulips wrapped in kraft paper and tied with a twine bow',
    Art: BouquetLilac,
  },
  'bouquet-cream': {
    label: 'Bouquet, cream roses',
    defaultAlt: 'Cream roses and green leaves wrapped in kraft paper with a twine bow',
    Art: BouquetCream,
  },
  'bouquet-autumn': {
    label: 'Bouquet, coral dahlias',
    defaultAlt: 'Coral dahlias wrapped in kraft paper and tied with a twine bow',
    Art: BouquetAutumn,
  },
  'plant-monstera': {
    label: 'Plant, monstera',
    defaultAlt: 'Small monstera plant with split leaves in a terracotta pot',
    Art: PlantMonstera,
  },
  'plant-snake': {
    label: 'Plant, snake plant',
    defaultAlt: 'Snake plant with tall pointed leaves in a terracotta pot',
    Art: PlantSnake,
  },
  'plant-succulent': {
    label: 'Plant, succulent',
    defaultAlt: 'Small rosette succulent in a terracotta pot',
    Art: PlantSucculent,
  },
  'gift-box': {
    label: 'Gift, kraft box',
    defaultAlt: 'Kraft paper gift box tied with twine, with a leafy sprig tucked in',
    Art: GiftBox,
  },
  'gift-candle': {
    label: 'Gift, candle',
    defaultAlt: 'Lit candle in a glass jar with a small flower on its label',
    Art: GiftCandle,
  },
  'gift-card': {
    label: 'Gift, greeting card',
    defaultAlt: 'Folded greeting card with a pressed flower on the front',
    Art: GiftCard,
  },
  'workshop-wreath': {
    label: 'Workshop, wreath',
    defaultAlt: 'Round wreath of green leaves with small pink flowers',
    Art: WorkshopWreath,
  },
  'workshop-bouquet': {
    label: 'Workshop, scissors and twine',
    defaultAlt: 'Florist scissors, a ball of twine and cut flower stems',
    Art: WorkshopBouquet,
  },
}
