// @vitest-environment node
/*
 * The backup script, run against a stand-in for pg_dump. This proves the parts
 * that protect customers: nothing is written without a passphrase, the file
 * that leaves the job is encrypted, and it opens again with the passphrase.
 * The real export needs a Supabase project (README.md, "Backups").
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { repoRoot } from '../helpers/css'

const PASSPHRASE = 'a long passphrase made only for this test'
const CUSTOMER_ADDRESS = '12 Garden Lane, Brooklyn'

let dir = ''

function fakePgDump(body: string): string {
  const path = join(dir, 'pg_dump')
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
  return path
}

const WORKING_PG_DUMP = `
if [ "$1" = "--version" ]; then echo "pg_dump (stand-in) 17.0"; exit 0; fi
for arg in "$@"; do
  case "$arg" in
    --file=*) file="\${arg#--file=}" ;;
    --schema-only) schema=1 ;;
  esac
done
if [ -n "\${schema:-}" ]; then
  echo "CREATE TABLE public.orders (id uuid);" >"$file"
else
  printf 'COPY public.products (id) FROM stdin;\\n1\\n\\\\.\\nCOPY public.orders (delivery_address) FROM stdin;\\n${CUSTOMER_ADDRESS}\\n\\\\.\\n' >"$file"
fi`

function run(env: Record<string, string>, args: string[] = ['weekly', join(dir, 'out')]) {
  return spawnSync('bash', [join(repoRoot, 'scripts/backup.sh'), ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: dir, ...env },
  })
}

function outputFiles(): string[] {
  try {
    return readdirSync(join(dir, 'out'))
  } catch {
    return []
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'kp-backup-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('scripts/backup.sh', () => {
  it('writes one encrypted file that opens again with the passphrase', () => {
    const result = run({
      PG_DUMP: fakePgDump(WORKING_PG_DUMP),
      SUPABASE_DB_URL: 'stand-in',
      BACKUP_PASSPHRASE: PASSPHRASE,
    })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)

    const files = outputFiles()
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^kraft-petal-weekly-\d{4}-\d{2}-\d{2}T\d{6}Z\.tar\.gz\.gpg$/)

    const file = join(dir, 'out', files[0] ?? '')
    const stored = readFileSync(file)
    expect(stored.includes(CUSTOMER_ADDRESS)).toBe(false)
    expect(stored.includes('public.orders')).toBe(false)

    const restored = join(dir, 'restored')
    execFileSync('bash', [
      '-c',
      'mkdir -p "$2" && GNUPGHOME="$(mktemp -d)" gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$1" 3<<<"$3" | tar -xzf - -C "$2"',
      'restore',
      file,
      restored,
      PASSPHRASE,
    ])
    expect(readdirSync(restored).sort()).toEqual(['data.sql', 'manifest.txt', 'schema.sql'])
    expect(readFileSync(join(restored, 'data.sql'), 'utf8')).toContain(CUSTOMER_ADDRESS)
    expect(readFileSync(join(restored, 'manifest.txt'), 'utf8')).toMatch(/kind: weekly[\s\S]*[0-9a-f]{64} {2}schema\.sql/)

    const wrong = spawnSync(
      'bash',
      ['-c', 'GNUPGHOME="$(mktemp -d)" gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$1" 3<<<"not the passphrase" >/dev/null', 'check', file],
      { encoding: 'utf8' },
    )
    expect(wrong.status).not.toBe(0)
  })

  it.each([
    ['no passphrase', { SUPABASE_DB_URL: 'stand-in' }, /BACKUP_PASSPHRASE is not set/],
    ['a short passphrase', { SUPABASE_DB_URL: 'stand-in', BACKUP_PASSPHRASE: 'too short' }, /shorter than 20/],
    ['no connection string', { BACKUP_PASSPHRASE: PASSPHRASE }, /SUPABASE_DB_URL is not set/],
  ])('exports nothing with %s', (_label, env, message) => {
    const result = run({ PG_DUMP: fakePgDump(WORKING_PG_DUMP), ...env })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(message)
    expect(outputFiles()).toEqual([])
  })

  it('fails, and leaves no file, when the export fails or is empty', () => {
    const failed = run({
      PG_DUMP: fakePgDump('if [ "$1" = "--version" ]; then echo stand-in; exit 0; fi\necho "connection refused" >&2; exit 1'),
      SUPABASE_DB_URL: 'stand-in',
      BACKUP_PASSPHRASE: PASSPHRASE,
    })
    expect(failed.status).not.toBe(0)
    expect(outputFiles()).toEqual([])

    const empty = run({
      PG_DUMP: fakePgDump('for arg in "$@"; do case "$arg" in --file=*) : >"${arg#--file=}" ;; esac; done'),
      SUPABASE_DB_URL: 'stand-in',
      BACKUP_PASSPHRASE: PASSPHRASE,
    })
    expect(empty.status).not.toBe(0)
    expect(empty.stderr).toMatch(/Is this the right database/)
    expect(outputFiles()).toEqual([])
  })

  it('refuses an unknown kind', () => {
    const result = run(
      { PG_DUMP: fakePgDump(WORKING_PG_DUMP), SUPABASE_DB_URL: 'stand-in', BACKUP_PASSPHRASE: PASSPHRASE },
      ['hourly', join(dir, 'out')],
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/weekly, monthly or manual/)
  })
})
