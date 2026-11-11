import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Vitest runs from the repository root. */
export const repoRoot = process.cwd()

export function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

/** Every file under `dir` (relative to the repository root) whose name matches. */
export function listFiles(dir: string, matches: (name: string) => boolean): string[] {
  const found: string[] = []
  if (!existsSync(join(repoRoot, dir))) return found
  const walk = (current: string) => {
    for (const name of readdirSync(join(repoRoot, current))) {
      const path = `${current}/${name}`
      if (statSync(join(repoRoot, path)).isDirectory()) walk(path)
      else if (matches(name)) found.push(path)
    }
  }
  walk(dir)
  return found.sort()
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** The custom properties declared in tokens.css, by name. */
export function readTokens(): Map<string, string> {
  const css = stripCssComments(read('src/styles/tokens.css'))
  const tokens = new Map<string, string>()
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match
    if (!name || value === undefined) continue
    if (tokens.has(name)) throw new Error(`Token ${name} is defined more than once`)
    tokens.set(name, value.trim().replace(/\s+/g, ' '))
  }
  return tokens
}

function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Not a six-digit hex color: ${hex}`)
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => channel(Number.parseInt(part ?? '0', 16)))
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/** WCAG 2.x contrast ratio between two hex colors. */
export function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}
