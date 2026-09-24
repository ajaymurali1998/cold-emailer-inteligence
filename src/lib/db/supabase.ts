import { createClient } from '@supabase/supabase-js'

// Service-role client for server-side code (Route Handlers, Server Actions,
// pg-boss jobs). Single-user app, no Supabase Auth -- see CONTEXT.md.
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export function createSupabaseServiceClient() {
  return createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )
}
