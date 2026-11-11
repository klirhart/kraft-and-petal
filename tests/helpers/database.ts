/*
 * A real PostgreSQL (PGlite, PostgreSQL compiled to WebAssembly) loaded with
 * the project's migrations and seed, so the access rules can be tested for
 * every role without Docker or a hosted project.
 *
 * Supabase provides the `auth` and `storage` schemas and the `anon` and
 * `authenticated` roles. The few parts the migrations rely on are recreated
 * below. This is a stand-in, not Supabase itself: repeat the checks against a
 * scratch Supabase project before launch (see the README).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const SUPABASE_STAND_IN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;

  -- Supabase has given the app roles every right on new public tables by default.
  -- Keep that here, so the tests prove the migrations do not depend on it.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

const supabaseDir = `${join(process.cwd(), 'supabase')}/`

export type AppRole = 'anon' | 'authenticated'

export interface TestDatabase {
  pg: PGlite
  /** Runs SQL as the database owner (what the Supabase SQL editor does). */
  owner<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  /** Runs `work` the way a request from the browser would run: as `role`, signed in as `userId`. */
  as<T>(role: AppRole, userId: string | null, work: (run: Runner) => Promise<T>): Promise<T>
  /** Creates an auth user the way sign-up does; the profile comes from the trigger. */
  signUp(email: string, metadata?: Record<string, unknown>): Promise<string>
  close(): Promise<void>
}

export type Runner = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>

export function migrationFiles(): string[] {
  return readdirSync(`${supabaseDir}migrations`)
    .filter((name) => name.endsWith('.sql'))
    .sort()
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = new PGlite()
  await pg.exec(SUPABASE_STAND_IN)
  for (const file of migrationFiles()) {
    await pg.exec(readFileSync(`${supabaseDir}migrations/${file}`, 'utf8'))
  }
  await pg.exec(readFileSync(`${supabaseDir}seed.sql`, 'utf8'))

  const run: Runner = async <T>(sql: string, params: unknown[] = []) => {
    const result = await pg.query<T>(sql, params)
    return result.rows
  }

  return {
    pg,
    owner: run,
    async as(role, userId, work) {
      await pg.exec(`set role ${role}`)
      await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ''])
      try {
        return await work(run)
      } finally {
        await pg.exec(`reset role`)
        await pg.query(`select set_config('request.jwt.claim.sub', '', false)`)
      }
    },
    async signUp(email, metadata = {}) {
      const rows = await run<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
        [email, JSON.stringify(metadata)],
      )
      const id = rows[0]?.id
      if (!id) throw new Error('Sign-up did not return a user id')
      return id
    },
    close: () => pg.close(),
  }
}

/** Resolves to the database error, or fails the test when the statement succeeds. */
export async function rejection(work: Promise<unknown>): Promise<{ code?: string; message: string; detail?: string }> {
  try {
    await work
  } catch (error) {
    return error as { code?: string; message: string; detail?: string }
  }
  throw new Error('Expected the database to reject this, but it succeeded')
}
