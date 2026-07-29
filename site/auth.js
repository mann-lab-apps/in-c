import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const naverProviderId =
  import.meta.env.VITE_SUPABASE_NAVER_PROVIDER_ID || 'custom:naver'

const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : undefined

const authProviderIds = {
  google: 'google',
  kakao: 'kakao',
  naver: naverProviderId
}

export {
  authProviderIds,
  isSupabaseConfigured,
  supabase
}
