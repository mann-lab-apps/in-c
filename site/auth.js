import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true
      }
    })
  : undefined

const authProviderIds = Object.freeze({
  google: 'google'
})

export {
  authProviderIds,
  isSupabaseConfigured,
  supabase
}
