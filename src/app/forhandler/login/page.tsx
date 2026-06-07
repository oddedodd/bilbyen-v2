import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentDealerUser } from '@/lib/dealer-auth'
import { loginDealer } from '../actions'

interface DealerLoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Ugyldig e-post eller passord.',
  missing: 'E-post og passord må fylles ut.',
}

export default function DealerLoginPage({
  searchParams,
}: DealerLoginPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
          >
            Til forsiden
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-950">
            Forhandler
          </h1>
        </div>

        <Suspense fallback={<LoginForm />}>
          <DealerLoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function DealerLoginForm({ searchParams }: DealerLoginPageProps) {
  const user = await getCurrentDealerUser()

  if (user) {
    redirect('/forhandler')
  }

  const error = getSearchParam(await searchParams, 'error')

  return <LoginForm error={error} />
}

function LoginForm({ error }: { error?: string }) {
  return (
    <form
      action={loginDealer}
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        {error && ERROR_MESSAGES[error] && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
          E-post
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
          Passord
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
        >
          Logg inn
        </button>
      </div>
    </form>
  )
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key]

  return typeof value === 'string' ? value : undefined
}
