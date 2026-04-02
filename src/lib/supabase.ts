// Lazy Supabase client — avoids build crash when env vars are missing
// (e.g. during Vercel PR previews or CI builds without secrets).
// Typed as `any` to prevent strict TS errors on the Proxy shape.

export const supabase = new Proxy({} as any, {
  get(_, prop) {
    if (!(globalThis as any)._supabase) {
      const { createClient } = require('@supabase/supabase-js');
      (globalThis as any)._supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    return ((globalThis as any)._supabase as any)[prop];
  },
});
