import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // PKCE returns from email links with `?code=…` in the query string. The
    // default (implicit) flow puts the tokens in the URL *hash* — which is where
    // the hash router keeps its route, so the two fought over the same fragment.
    flowType: 'pkce',
  },
})
