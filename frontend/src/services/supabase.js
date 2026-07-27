import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export null when env vars are absent so callers can guard with `if (supabase)`.
// This prevents the Supabase client from attempting WebSocket/realtime connections
// to a dummy URL when running without Supabase credentials configured.
export const supabase = (url && anon) ? createClient(url, anon) : null
