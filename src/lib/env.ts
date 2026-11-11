/*
 * The only place that reads build-time environment values.
 *
 * Exactly two values may reach the browser: the public Supabase URL and the
 * anon key. Both are safe to publish because Row Level Security protects the
 * data. Never read a service role key or payment secret here;
 * tests/unit/secrets.test.ts fails the build if another variable is used.
 */

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

export const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL)
export const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** With either value missing the app runs on local sample data. */
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== ''

/** Sample-data latency so loading states are visible. Zero in tests. */
export const sampleLatencyMs = import.meta.env.MODE === 'test' ? 0 : 250
