import { useState } from 'react'
import { PRODUCT_ILLUSTRATIONS } from '@/components/illustrations/ProductArt'
import { TwineBow } from '@/components/illustrations/Scenes'
import { resolveImage } from '@/lib/images'
import type { ProductImage as ProductImageRow } from '@/types'
import styles from './catalog.module.css'

export interface ProductImageProps {
  image: ProductImageRow | undefined
  /** `card` and `detail` are 4:5. `thumbnail` is 1:1. */
  shape: 'card' | 'detail' | 'thumbnail'
  /** Load at once (first screen). Otherwise the picture loads lazily. */
  eager?: boolean
  /** In a thumbnail next to the product name the picture adds nothing, so it is hidden from assistive tech. */
  decorative?: boolean
}

const SIZES = {
  card: { width: 400, height: 500 },
  detail: { width: 800, height: 1000 },
  thumbnail: { width: 128, height: 128 },
} as const

/**
 * A product picture on a tinted frame. Built-in illustrations are drawn inline;
 * uploaded photos come from the public Storage bucket. A missing or failed
 * picture shows the placeholder drawing, so the layout never breaks.
 */
export function ProductImage({ image, shape, eager = false, decorative = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false)
  const resolved = image ? resolveImage(image.storage_path) : ({ kind: 'missing' } as const)
  const frame = `${styles.image} ${shape === 'thumbnail' ? styles.square : styles.portrait}`
  const alt = decorative ? '' : (image?.alt_text ?? '')

  if (resolved.kind === 'illustration') {
    const entry = PRODUCT_ILLUSTRATIONS[resolved.key]
    if (entry) {
      return (
        <div className={frame}>
          <entry.Art className={styles.art} label={alt || undefined} />
        </div>
      )
    }
  }

  if (resolved.kind === 'url' && !failed) {
    return (
      <div className={frame}>
        <img
          className={styles.photo}
          src={resolved.url}
          alt={alt}
          width={SIZES[shape].width}
          height={SIZES[shape].height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div className={frame}>
      <TwineBow className={styles.placeholder} />
    </div>
  )
}
