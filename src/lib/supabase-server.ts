import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from './env'

const SUPABASE_REST_PATH = '/rest/v1'

interface SupabaseRpcOptions {
  functionName: string
  body: Record<string, unknown>
}

interface SupabaseRestOptions {
  path: string
  init?: RequestInit
}

export async function callSupabaseRpc({
  functionName,
  body,
}: SupabaseRpcOptions): Promise<void> {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const res = await fetch(`${url}${SUPABASE_REST_PATH}/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(`Supabase RPC failed with ${res.status}: ${message}`)
  }
}

export async function fetchSupabaseRest<T>({
  path,
  init,
}: SupabaseRestOptions): Promise<T> {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const res = await fetch(`${url}${SUPABASE_REST_PATH}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(`Supabase REST failed with ${res.status}: ${message}`)
  }

  return res.json() as Promise<T>
}

export function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
