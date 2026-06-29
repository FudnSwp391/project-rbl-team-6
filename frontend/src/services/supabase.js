import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://dummy.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key'

if (SUPABASE_URL === 'https://dummy.supabase.co') {
  console.warn('[Supabase] VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY chưa được cấu hình. (Chạy với mock url)')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
