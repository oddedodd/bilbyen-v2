import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getRequiredEnv } from './env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const publishableKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. Server Actions can.
        }
      },
    },
  })
}
