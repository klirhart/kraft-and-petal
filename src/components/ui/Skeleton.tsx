import styles from './Skeleton.module.css'

export interface SkeletonProps {
  /** The shape of the content it stands for. */
  shape?: 'text' | 'title' | 'button' | 'image' | 'thumbnail' | 'chip' | 'row'
  /** Text width, so lines do not all end together. */
  width?: 'full' | 'long' | 'medium' | 'short'
  className?: string
}

/** A kraft block in the shape of content that is loading. Always hidden from assistive tech. */
export function Skeleton({ shape = 'text', width = 'full', className }: SkeletonProps) {
  return (
    <span
      className={[styles.skeleton, styles[shape], styles[width], className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
