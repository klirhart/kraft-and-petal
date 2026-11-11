import { IMAGE_UPLOAD } from './config'
import { supabaseUrl } from './env'

export const PRODUCT_IMAGE_BUCKET = 'product-images'

/** Paths starting with this point at illustrations that ship with the site. */
export const ILLUSTRATION_PREFIX = 'illustrations/'

export type ResolvedImage =
  | { kind: 'illustration'; key: string }
  | { kind: 'url'; url: string }
  | { kind: 'missing' }

/**
 * Turns a `product_images.storage_path` into something that can be drawn.
 * Built-in illustrations need no backend, so the seed catalogue works before
 * anything is uploaded; every other path is a file in the public Storage
 * bucket.
 */
export function resolveImage(storagePath: string): ResolvedImage {
  if (storagePath.startsWith(ILLUSTRATION_PREFIX)) {
    return { kind: 'illustration', key: storagePath.slice(ILLUSTRATION_PREFIX.length) }
  }
  if (!supabaseUrl || !storagePath) return { kind: 'missing' }
  const path = storagePath.split('/').map(encodeURIComponent).join('/')
  return {
    kind: 'url',
    url: `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`,
  }
}

/**
 * Shrinks a photo in the browser before upload: longest edge at most
 * 1600px, WebP, at most 300 KB. Returns the original file when it already
 * fits or when the browser cannot convert it; the backend still checks size.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, IMAGE_UPLOAD.maxEdge / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= IMAGE_UPLOAD.maxBytes) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
      if (blob && blob.type === 'image/webp' && blob.size <= IMAGE_UPLOAD.maxBytes) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
      }
    }
    return file
  } catch {
    return file
  }
}
