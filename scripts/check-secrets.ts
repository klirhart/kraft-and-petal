/*
 * Fails when something that looks like a server-side secret is found.
 *
 *   node scripts/check-secrets.ts dist        scan the built site
 *   node scripts/check-secrets.ts --history   scan every commit in Git
 *
 * What counts as a secret:
 *   - a Supabase secret key: "sb_secret_" followed by key material
 *   - a JWT whose payload says role "service_role" (the legacy service key)
 *   - a database connection string that includes a password
 *   - a private key block
 *   - in the built site only: the bare word "service_role"
 *
 * The bare prefix "sb_secret_" is not flagged on its own: the Supabase client
 * library ships that string to recognise key types, so it is always present in
 * the bundle. The bare word "service_role" is not flagged in Git history
 * either, because the migrations, tests and docs name that database role.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface Finding {
  kind: string
  sample: string
}

const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{8,}/g
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g
const CONNECTION_STRING = /postgres(?:ql)?:\/\/[^\s:/@'"`$]+:[^\s@'"`${}]{3,}@[^\s'"`]+/g
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/g

function redact(value: string): string {
  return value.length <= 16 ? `${value.slice(0, 6)}…` : `${value.slice(0, 12)}…${value.slice(-4)}`
}

function jwtRole(payload: string): string | null {
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (json && typeof json === 'object' && 'role' in json && typeof json.role === 'string') return json.role
  } catch {
    // Not a readable JWT payload.
  }
  return null
}

export function findSecrets(text: string, options: { bareServiceRole?: boolean } = {}): Finding[] {
  const findings: Finding[] = []
  for (const match of text.matchAll(SECRET_KEY)) {
    findings.push({ kind: 'Supabase secret key', sample: redact(match[0]) })
  }
  for (const match of text.matchAll(JWT)) {
    if (jwtRole(match[1] ?? '') === 'service_role') {
      findings.push({ kind: 'Supabase service role key', sample: redact(match[0]) })
    }
  }
  for (const match of text.matchAll(CONNECTION_STRING)) {
    findings.push({ kind: 'database connection string with a password', sample: redact(match[0]) })
  }
  for (const match of text.matchAll(PRIVATE_KEY)) {
    findings.push({ kind: 'private key', sample: match[0] })
  }
  if (options.bareServiceRole && text.includes('service_role')) {
    findings.push({ kind: 'the word service_role', sample: 'service_role' })
  }
  return findings
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

export function scanDirectory(dir: string): { path: string; finding: Finding }[] {
  return filesUnder(dir)
    .filter((path) => /\.(js|mjs|css|html|map|json|txt|svg)$/.test(path))
    .flatMap((path) =>
      findSecrets(readFileSync(path, 'utf8'), { bareServiceRole: true }).map((finding) => ({ path, finding })),
    )
}

function scanHistory(): Finding[] {
  const log = execFileSync('git', ['log', '--all', '-p', '--no-color', '--unified=0'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  })
  const added = log
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .join('\n')
  return findSecrets(added)
}

function main(): void {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: node scripts/check-secrets.ts <folder> | --history')
    process.exit(2)
  }
  const problems =
    target === '--history'
      ? scanHistory().map((finding) => `Git history: ${finding.kind} (${finding.sample})`)
      : scanDirectory(target).map(({ path, finding }) => `${path}: ${finding.kind} (${finding.sample})`)
  if (problems.length > 0) {
    console.error(`Found ${problems.length} possible secret(s):\n${problems.map((line) => `  ${line}`).join('\n')}`)
    console.error('Rotate the key first, then remove it. A key that reached Git or a build is no longer secret.')
    process.exit(1)
  }
  console.log(`No secrets found in ${target === '--history' ? 'Git history' : target}.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
