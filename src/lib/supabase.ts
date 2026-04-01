import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════
// Lazy-loaded Supabase client (Proxy pattern)
// ══════════════════════════════════════════════════════════════
// Uses a Proxy so the module can be imported at build time
// without NEXT_PUBLIC_SUPABASE_URL being set.
// The actual client is created lazily on first property access.
// ══════════════════════════════════════════════════════════════

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});