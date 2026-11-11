// @vitest-environment node
/*
 * Only the public Supabase URL and anon key may reach the browser. Anything
 * prefixed VITE_ is copied into the bundle, so these checks fail when a new
 * variable or a secret-looking string shows up.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findSecrets, scanDirectory } from '../../scripts/check-secrets.ts'
import { listFiles, read, repoRoot } from '../helpers/css'

const PUBLIC_VARIABLES = ['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL']
const SECRET_MARKERS = [/service_role/i, /sb_secret_/i, /SUPABASE_DB_URL/, /BACKUP_PASSPHRASE/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/]

const sourceFiles = listFiles('src', (name) => /\.(ts|tsx|css|html)$/.test(name))

describe('environment variables', () => {
  it('.env.example lists the two public names, with no values', () => {
    const lines = read('.env.example')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    expect(lines.sort()).toEqual(PUBLIC_VARIABLES.map((name) => `${name}=`))
  })

  it('the app reads only those two variables, and only in src/lib/env.ts', () => {
    const used = new Set<string>()
    for (const path of sourceFiles) {
      const text = read(path)
      for (const match of text.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)) {
        const name = match[1] ?? ''
        // MODE, DEV and PROD are built into Vite and hold no configuration.
        if (['MODE', 'DEV', 'PROD', 'BASE_URL', 'SSR'].includes(name)) continue
        used.add(name)
        expect(path, `${name} is read outside src/lib/env.ts`).toBe('src/lib/env.ts')
      }
      expect(text, `${path} reads process.env`).not.toMatch(/process\.env/)
    }
    expect([...used].sort()).toEqual(PUBLIC_VARIABLES)
  })

  it('declares no other VITE_ variable anywhere in the repository', () => {
    const places = [
      ...sourceFiles,
      ...listFiles('.github', (name) => /\.ya?ml$/.test(name)),
      ...listFiles('scripts', () => true),
      'vite.config.ts',
      'index.html',
      'README.md',
    ]
    for (const path of places) {
      for (const match of read(path).matchAll(/\bVITE_[A-Z0-9_]+/g)) {
        expect(PUBLIC_VARIABLES, `${path} mentions ${match[0]}`).toContain(match[0])
      }
    }
  })

  it('keeps .env files out of Git', () => {
    const ignore = read('.gitignore')
    expect(ignore).toMatch(/^\.env$/m)
    expect(ignore).toMatch(/^\.env\.\*$/m)
    const tracked = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' }).split('\n')
    expect(tracked.filter((path) => /(^|\/)\.env(\.|$)/.test(path) && !path.endsWith('.env.example'))).toEqual([])
    expect(tracked.filter((path) => /\.(dump|gpg|pem|key)$|\.sql\.gz$/.test(path))).toEqual([])
  })
})

describe('secrets', () => {
  it('no source file names a server-side secret', () => {
    for (const path of sourceFiles) {
      const text = read(path)
      for (const marker of SECRET_MARKERS) expect(text, `${path} matches ${marker}`).not.toMatch(marker)
    }
  })

  it('only src/lib imports the Supabase client', () => {
    const offenders = sourceFiles
      .filter((path) => !path.startsWith('src/lib/'))
      .filter((path) => /@supabase\/supabase-js|@\/lib\/supabase['"]/.test(read(path)))
    expect(offenders).toEqual([])
  })

  it('the built bundle, when present, holds no secret', () => {
    if (!existsSync(join(repoRoot, 'dist'))) return
    expect(scanDirectory(join(repoRoot, 'dist'))).toEqual([])
  })

  it('the scanner recognises each kind of secret', () => {
    const jwt = (role: string) =>
      ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url'), 'c2lnbmF0dXJlLXBhcnQ'].join('.')
    expect(findSecrets(`key="${['sb', 'secret', 'abcdefgh12345678'].join('_')}"`).map((finding) => finding.kind)).toEqual(['Supabase secret key'])
    expect(findSecrets(jwt('service_role')).map((finding) => finding.kind)).toEqual(['Supabase service role key'])
    expect(findSecrets(['postgresql://postgres', 'hunter2-hunter2@db.example.supabase.co:5432/postgres'].join(':'))).toHaveLength(1)
    // Public by design, or not a secret at all:
    expect(findSecrets(jwt('anon'))).toEqual([])
    expect(findSecrets('e.startsWith(`sb_publishable_`)||e.startsWith(`sb_secret_`)')).toEqual([])
    expect(findSecrets('postgresql://postgres:${{ secrets.DB }}@host/db')).toEqual([])
    expect(findSecrets('create role service_role nologin')).toEqual([])
    expect(findSecrets('create role service_role nologin', { bareServiceRole: true })).toHaveLength(1)
  })

  it('workflows take secrets from GitHub Actions secrets, never inline', () => {
    for (const path of listFiles('.github', (name) => /\.ya?ml$/.test(name))) {
      const text = read(path)
      expect(text, path).not.toMatch(/postgres(ql)?:\/\/[^\s$]+:[^\s$]+@/)
      for (const match of text.matchAll(/^\s*(SUPABASE_DB_URL|BACKUP_PASSPHRASE|[A-Z_]*(SECRET|PASSWORD|TOKEN)[A-Z_]*):\s*(.+)$/gm)) {
        expect(match[3], `${path}: ${match[1]}`).toMatch(/^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/)
      }
    }
  })
})
