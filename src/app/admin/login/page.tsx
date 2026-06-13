import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentAdminUser } from '@/lib/admin-auth'
import { loginAdmin } from '../actions'

interface AdminLoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Ugyldig e-post eller passord.',
  missing: 'E-post og passord må fylles ut.',
  unauthorized: 'Denne brukeren har ikke admin-tilgang.',
}

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-[#0d2d49] hover:text-[#123a5e] hover:underline"
          >
            Til forsiden
          </Link>
          <h1 className="mt-6 font-serif text-2xl font-bold leading-none text-[#0b263f]">
            Admin
          </h1>
        </div>

        <Suspense fallback={<LoginForm />}>
          <AdminLoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function AdminLoginForm({ searchParams }: AdminLoginPageProps) {
  const adminUser = await getCurrentAdminUser()

  if (adminUser) {
    redirect('/admin')
  }

  const error = getSearchParam(await searchParams, 'error')

  return <LoginForm error={error} />
}

function LoginForm({ error }: { error?: string }) {
  return (
    <form
      action={loginAdmin}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        {error && ERROR_MESSAGES[error] && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <label className="flex flex-col gap-1.5 font-serif text-sm font-bold text-[#0b263f]">
          E-post
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-2 font-sans text-sm font-normal text-slate-950 shadow-sm focus:border-[#0d2d49] focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 font-serif text-sm font-bold text-[#0b263f]">
          Passord
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-2 font-sans text-sm font-normal text-slate-950 shadow-sm focus:border-[#0d2d49] focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-[#0d2d49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#123a5e]"
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
