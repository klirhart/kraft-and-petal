// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { contrast, listFiles, read, readTokens, stripCssComments } from '../helpers/css'

const tokens = readTokens()
const value = (name: string) => {
  const found = tokens.get(name)
  if (found === undefined) throw new Error(`Missing token ${name}`)
  return found
}

/**
 * The brief's token names (design guidelines 2.2). The restyle keeps every
 * name; colour, font, radius and shadow values are the restyled ones.
 */
const BRIEF_TOKENS: Record<string, string> = {
  '--font-family-primary': 'Figtree',
  '--font-family-stack': 'Figtree, -apple-system, Helvetica Neue, Droid Sans, Arial, sans-serif',
  '--font-size-base': '14px',
  '--font-weight-base': '400',
  '--font-line-height-base': '16px',
  '--font-size-xs': '12px',
  '--font-size-sm': '13.33px',
  '--font-size-md': '14px',
  '--font-size-lg': '16px',
  '--font-size-xl': '20px',
  '--font-size-2xl': '24px',
  '--font-size-3xl': '32px',
  '--font-size-4xl': '40px',
  '--color-text-primary': '#1c4532',
  '--color-text-secondary': '#4a5f50',
  '--color-text-tertiary': '#566b5b',
  '--color-text-inverse': '#256a3d',
  '--color-surface-base': '#fffaeb',
  '--color-surface-muted': '#fff3d1',
  '--space-1': '1px',
  '--space-2': '2px',
  '--space-3': '3px',
  '--space-4': '4px',
  '--space-5': '6px',
  '--space-6': '8px',
  '--space-7': '9px',
  '--space-8': '12px',
  '--radius-xs': '8px',
  '--radius-sm': '20px',
  '--radius-md': '999999px',
  '--shadow-1': 'rgba(92, 64, 8, 0.05) 0px 1px 3px 0px, rgba(92, 64, 8, 0.09) 0px 10px 24px -6px',
  '--shadow-2': 'rgba(92, 64, 8, 0.2) 0px 16px 48px 0px',
  '--motion-duration-instant': '200ms',
}

/** Design guidelines 2.3: the 51 token names added on top of the brief, with restyled colours. */
const GUIDELINE_TOKENS: Record<string, string> = {
  '--color-surface-subtle': '#fbe8b6',
  '--color-surface-kraft': '#f6dc9c',
  '--color-surface-overlay': 'rgba(28, 69, 50, 0.48)',
  '--color-surface-error': '#fde3d6',
  '--color-surface-success': '#e3f0c4',
  '--color-surface-warning': '#ffe5a3',
  '--color-border-subtle': '#ecd9a4',
  '--color-border-strong': '#557a5f',
  '--color-focus-ring': '#3b4cc0',
  '--color-action-primary': '#c9e26c',
  '--color-action-primary-hover': '#bbd856',
  '--color-action-primary-active': '#aacb40',
  '--color-action-danger': '#b3361f',
  '--color-action-danger-hover': '#992c18',
  '--color-action-danger-active': '#7e2312',
  '--color-text-on-action': '#1c4532',
  '--color-text-disabled': '#8a8f7c',
  '--color-status-error': '#a8321d',
  '--color-status-success': '#256a3d',
  '--color-status-warning': '#7a4f00',
  '--font-weight-medium': '500',
  '--font-weight-semibold': '600',
  '--font-line-height-lg': '24px',
  '--font-line-height-xl': '28px',
  '--font-line-height-2xl': '32px',
  '--font-line-height-3xl': '40px',
  '--font-line-height-4xl': '48px',
  '--space-9': '16px',
  '--space-10': '24px',
  '--space-11': '32px',
  '--space-12': '48px',
  '--space-13': '64px',
  '--size-control-sm': '32px',
  '--size-control-md': '44px',
  '--size-icon-sm': '16px',
  '--size-icon-md': '20px',
  '--size-thumbnail': '64px',
  '--size-card-min': '160px',
  '--size-panel-sm': '400px',
  '--size-panel-md': '560px',
  '--size-sidebar-width': '240px',
  '--size-container-max': '1120px',
  '--size-container-narrow': '640px',
  '--motion-easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  '--motion-duration-loop': '1000ms',
  '--z-header': '100',
  '--z-overlay': '200',
  '--z-toast': '300',
  '--breakpoint-sm': '480px',
  '--breakpoint-md': '768px',
  '--breakpoint-lg': '1024px',
}

/** Added by the restyle: display face, one larger size, the dark band, text on danger, the coral accent. */
const RESTYLE_TOKENS: Record<string, string> = {
  '--font-family-display': 'Fraunces, Georgia, Times New Roman, serif',
  '--font-size-5xl': '56px',
  '--font-line-height-5xl': '60px',
  '--color-surface-inverse': '#1e4d36',
  '--color-text-on-inverse': '#fff6dc',
  '--color-text-on-danger': '#fffaeb',
  '--color-accent': '#d6431c',
}

describe('design tokens', () => {
  it('carries every token from the brief with its exact value', () => {
    for (const [name, expected] of Object.entries(BRIEF_TOKENS)) {
      expect(value(name), name).toBe(expected)
    }
  })

  it('carries the 51 tokens added by the design guidelines with their exact values', () => {
    expect(Object.keys(GUIDELINE_TOKENS)).toHaveLength(51)
    for (const [name, expected] of Object.entries(GUIDELINE_TOKENS)) {
      expect(value(name), name).toBe(expected)
    }
  })

  it('carries the tokens added by the restyle with their exact values', () => {
    for (const [name, expected] of Object.entries(RESTYLE_TOKENS)) {
      expect(value(name), name).toBe(expected)
    }
  })

  it('adds nothing else except the illustration palette', () => {
    const known = new Set([
      ...Object.keys(BRIEF_TOKENS),
      ...Object.keys(GUIDELINE_TOKENS),
      ...Object.keys(RESTYLE_TOKENS),
    ])
    const extra = [...tokens.keys()].filter((name) => !known.has(name))
    expect(extra.every((name) => name.startsWith('--color-illustration-')), extra.join(', ')).toBe(true)
  })

  it('declares a light color scheme on :root', () => {
    expect(read('src/styles/tokens.css')).toMatch(/color-scheme:\s*light/)
  })
})

describe('contrast (WCAG 2.2 AA)', () => {
  const surfaces = ['--color-surface-base', '--color-surface-muted', '--color-surface-subtle', '--color-surface-kraft']
  const tints = ['--color-surface-error', '--color-surface-success', '--color-surface-warning']
  const everywhere = [
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-inverse',
    '--color-status-error',
    '--color-status-success',
    '--color-status-warning',
  ]

  it.each(everywhere)('%s reaches 4.5:1 on the base, page, subtle and kraft surfaces', (text) => {
    for (const surface of surfaces) {
      expect(contrast(value(text), value(surface)), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('tertiary text reaches 4.5:1 on every surface and tint except kraft', () => {
    for (const surface of [...surfaces.filter((name) => name !== '--color-surface-kraft'), ...tints]) {
      expect(contrast(value('--color-text-tertiary'), value(surface)), surface).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(value('--color-text-tertiary'), value('--color-surface-kraft'))).toBeLessThan(4.5)
  })

  it('status text reaches 4.5:1 on its own tint, as do primary and secondary text', () => {
    for (const status of ['error', 'success', 'warning']) {
      const tint = value(`--color-surface-${status}`)
      expect(contrast(value(`--color-status-${status}`), tint), status).toBeGreaterThanOrEqual(4.5)
      expect(contrast(value('--color-text-primary'), tint), status).toBeGreaterThanOrEqual(4.5)
      expect(contrast(value('--color-text-secondary'), tint), status).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('text on every action fill reaches 4.5:1', () => {
    for (const fill of ['primary', 'primary-hover', 'primary-active']) {
      expect(contrast(value('--color-text-on-action'), value(`--color-action-${fill}`)), fill).toBeGreaterThanOrEqual(4.5)
    }
    for (const fill of ['danger', 'danger-hover', 'danger-active']) {
      expect(contrast(value('--color-text-on-danger'), value(`--color-action-${fill}`)), fill).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('text on the dark band reaches 4.5:1, and the lime count badge on it 3:1', () => {
    const band = value('--color-surface-inverse')
    expect(contrast(value('--color-text-on-inverse'), band)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(value('--color-action-primary'), band)).toBeGreaterThanOrEqual(3)
    // Chosen chips and checked boxes use the same pairing on text.primary and text.inverse fills.
    expect(contrast(value('--color-text-on-inverse'), value('--color-text-primary'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(value('--color-text-on-inverse'), value('--color-text-inverse'))).toBeGreaterThanOrEqual(4.5)
  })

  it('control boundaries and the focus ring reach 3:1 on every surface they sit on', () => {
    for (const surface of [...surfaces, ...tints]) {
      expect(contrast(value('--color-focus-ring'), value(surface)), `focus on ${surface}`).toBeGreaterThanOrEqual(3)
    }
    // The ring is drawn outside the control, but an inset ring may touch a lime fill.
    for (const fill of ['primary', 'primary-hover', 'primary-active']) {
      expect(contrast(value('--color-focus-ring'), value(`--color-action-${fill}`)), fill).toBeGreaterThanOrEqual(3)
    }
    for (const surface of surfaces) {
      for (const boundary of ['--color-border-strong', '--color-surface-inverse', '--color-action-danger']) {
        expect(contrast(value(boundary), value(surface)), `${boundary} on ${surface}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('keeps lime away from boundaries: a lime fill is never the only cue', () => {
    // Lime against the page is far under 3:1, so no component may use it as
    // text, as a border, or as the fill of a checked box or chosen chip.
    expect(contrast(value('--color-action-primary'), value('--color-surface-muted'))).toBeLessThan(3)
    const misuse: string[] = []
    for (const path of listFiles('src', (name) => name.endsWith('.css'))) {
      if (path === 'src/styles/tokens.css') continue
      for (const declaration of stripCssComments(read(path)).match(/[a-z-]+\s*:[^;{}]*--color-action-primary[^;{}]*;/g) ?? []) {
        if (!/^(background-color|fill)\s*:/.test(declaration)) misuse.push(`${path}: ${declaration}`)
      }
    }
    expect(misuse).toEqual([])
  })

  it('the coral accent reaches 3:1 for large text on the base and page surfaces', () => {
    expect(contrast(value('--color-accent'), value('--color-surface-muted'))).toBeGreaterThanOrEqual(3)
    expect(contrast(value('--color-accent'), value('--color-surface-base'))).toBeGreaterThanOrEqual(3)
  })

  it('matches the ratios published in the restyle report (rounded down)', () => {
    const floor2 = (ratio: number) => Math.floor(ratio * 100) / 100
    expect(floor2(contrast(value('--color-text-primary'), value('--color-surface-muted')))).toBe(9.75)
    expect(floor2(contrast(value('--color-text-tertiary'), value('--color-surface-muted')))).toBe(5.2)
    expect(floor2(contrast(value('--color-border-strong'), value('--color-surface-kraft')))).toBe(3.6)
    expect(floor2(contrast(value('--color-focus-ring'), value('--color-surface-muted')))).toBe(6.37)
    expect(floor2(contrast(value('--color-text-on-action'), value('--color-action-primary')))).toBe(7.48)
  })
})

describe('component styles use tokens only', () => {
  const styleFiles = listFiles('src', (name) => name.endsWith('.css')).filter((path) => path !== 'src/styles/tokens.css')
  const sourceFiles = listFiles('src', (name) => /\.(ts|tsx)$/.test(name))

  it('finds the style files', () => {
    expect(styleFiles.length).toBeGreaterThan(20)
  })

  it('has no color literal outside tokens.css', () => {
    const offenders: string[] = []
    for (const path of [...styleFiles, ...sourceFiles]) {
      const text = path.endsWith('.css') ? stripCssComments(read(path)) : read(path)
      const matches = text.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])|\brgba?\(|\bhsla?\(/g) ?? []
      // In TypeScript a "#" also starts ids and URL fragments; only color-shaped hex counts.
      const colors = matches.filter((match) => !match.startsWith('#') || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(match))
      if (colors.length > 0) offenders.push(`${path}: ${colors.join(' ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('has no px, rem or em length outside tokens.css, except breakpoints in media queries', () => {
    const offenders: string[] = []
    for (const path of styleFiles) {
      const css = stripCssComments(read(path)).replace(/@media[^{]+\{/g, '')
      const matches = css.match(/(?<![\w-])\d*\.?\d+(px|rem|em)\b/g) ?? []
      if (matches.length > 0) offenders.push(`${path}: ${matches.join(' ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('uses only the three breakpoint widths in media queries', () => {
    const allowed = new Set(['480px', '768px', '1024px'])
    for (const path of styleFiles) {
      for (const query of stripCssComments(read(path)).match(/@media[^{]+\{/g) ?? []) {
        for (const width of query.match(/\d+px/g) ?? []) {
          expect(allowed.has(width), `${path}: ${query}`).toBe(true)
        }
      }
    }
  })

  it('never removes the focus outline', () => {
    for (const path of styleFiles) {
      expect(stripCssComments(read(path)), path).not.toMatch(/outline\s*:\s*(none|0)\b/)
    }
  })

  it('keeps hover styles inside a hover media query', () => {
    const offenders: string[] = []
    for (const path of styleFiles) {
      const css = stripCssComments(read(path))
      // Remove every "@media (hover: hover) { ... }" block, then look for leftover :hover rules.
      let outside = ''
      let index = 0
      while (index < css.length) {
        const start = css.indexOf('@media (hover: hover)', index)
        if (start === -1) {
          outside += css.slice(index)
          break
        }
        outside += css.slice(index, start)
        let depth = 0
        let cursor = css.indexOf('{', start)
        do {
          if (css[cursor] === '{') depth += 1
          if (css[cursor] === '}') depth -= 1
          cursor += 1
        } while (depth > 0 && cursor < css.length)
        index = cursor
      }
      if (outside.includes(':hover')) offenders.push(path)
    }
    expect(offenders).toEqual([])
  })

  it('self-hosts both typefaces and loads no font from another site', () => {
    const css = read('src/styles/global.css')
    expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]?Figtree['"]?[^}]*\/fonts\/figtree-latin-wght-normal\.woff2/)
    expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]?Fraunces['"]?[^}]*\/fonts\/fraunces-latin-soft-normal\.woff2/)
    for (const file of ['figtree-latin-wght-normal.woff2', 'fraunces-latin-soft-normal.woff2', 'LICENSE-Figtree.txt', 'LICENSE-Fraunces.txt']) {
      expect(listFiles('public/fonts', (name) => name === file), file).toHaveLength(1)
    }
    expect(css).not.toMatch(/url\(\s*["']?https?:/)
    expect(read('index.html')).not.toMatch(/fonts\.(googleapis|gstatic)/)
    expect(value('--font-family-stack').startsWith(value('--font-family-primary'))).toBe(true)
    expect(value('--font-family-display')).toMatch(/^Fraunces,/)
  })
})
