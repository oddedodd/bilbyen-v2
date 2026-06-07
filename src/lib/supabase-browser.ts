'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set in environment')
  }

  if (!publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in environment'
    )
  }

  return createBrowserClient(
    url,
    publishableKey
  )
}
