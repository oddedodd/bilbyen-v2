'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/lib/admin-data'
import {
  changeAdminPassword,
  createAdminUser,
  deleteAdminUser,
  resetAdminPassword,
  type AdminActionState,
} from './actions'

interface AdminSettingsViewProps {
  adminUsers: AdminUser[]
  adminUsersError?: string
  currentUserId: string
  protectedAdminUserIds: string[]
}

const initialActionState: AdminActionState = {
  ok: null,
  message: '',
}

export function AdminSettingsView({
  adminUsers,
  adminUsersError,
  currentUserId,
  protectedAdminUserIds,
}: AdminSettingsViewProps) {
  const [notice, setNotice] = useState<AdminActionState>(initialActionState)

  return (
    <section className="flex flex-col gap-6 px-6 py-6 lg:px-8">
      <GlobalNotice notice={notice} />
      <div>
        <h2 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
          Innstillinger
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Endre passord og administrer hvem som har tilgang til adminpanelet.
        </p>
      </div>

      <section className="flex flex-col gap-6">
        <PasswordSettingsCard onNotice={setNotice} />
        <AdminUsersCard
          adminUsers={adminUsers}
          adminUsersError={adminUsersError}
          currentUserId={currentUserId}
          onNotice={setNotice}
          protectedAdminUserIds={protectedAdminUserIds}
        />
      </section>
    </section>
  )
}

function PasswordSettingsCard({
  onNotice,
}: {
  onNotice: (notice: AdminActionState) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    changeAdminPassword,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      formRef.current?.reset()
    }
  }, [onNotice, state])

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-[#0b263f]">Endre passord</h3>
        <p className="mt-1 text-sm text-slate-500">
          Bekreft nåværende passord før nytt passord lagres.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="mt-5 grid gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          Nåværende passord
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          Nytt passord
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          Bekreft nytt passord
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm"
          />
        )}

        <SubmitButton label="Oppdater passord" pendingLabel="Oppdaterer ..." />
      </form>
    </section>
  )
}

function AdminUsersCard({
  adminUsers,
  adminUsersError,
  currentUserId,
  onNotice,
  protectedAdminUserIds,
}: {
  adminUsers: AdminUser[]
  adminUsersError?: string
  currentUserId: string
  onNotice: (notice: AdminActionState) => void
  protectedAdminUserIds: string[]
}) {
  const protectedAdminIds = new Set(protectedAdminUserIds)

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-bold text-[#0b263f]">Administratorer</h3>
        <p className="mt-1 text-sm text-slate-500">
          Legg til eller fjern administratortilgang.
        </p>
      </div>

      {adminUsersError ? (
        <div className="border-t border-slate-200 px-5 py-5">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {adminUsersError}
          </div>
        </div>
      ) : (
        <CreateAdminUserForm onNotice={onNotice} />
      )}

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full min-w-[58rem] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-3">E-post</th>
              <th className="px-5 py-3">Opprettet</th>
              <th className="px-5 py-3">Nytt passord</th>
              <th className="px-5 py-3 text-right">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adminUsersError ? (
              <tr>
                <td
                  className="px-5 py-8 text-center text-slate-500"
                  colSpan={4}
                >
                  Administratorlisten vises når databasen er oppdatert.
                </td>
              </tr>
            ) : (
              adminUsers.map((adminUser) => (
                <AdminUserRow
                  key={adminUser.userId}
                  adminUser={adminUser}
                  currentUserId={currentUserId}
                  isLastAdmin={adminUsers.length <= 1}
                  onNotice={onNotice}
                  protectedByEnv={protectedAdminIds.has(adminUser.userId)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CreateAdminUserForm({
  onNotice,
}: {
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    createAdminUser,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [onNotice, router, state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
        E-post
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
        Midlertidig passord
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </label>

      <div className="self-end">
        <SubmitButton label="Legg til admin" pendingLabel="Legger til ..." />
      </div>

      {state.ok === false && (
        <ActionMessage
          state={state}
          className="rounded-md border px-3 py-2 text-sm lg:col-span-3"
        />
      )}
    </form>
  )
}

function AdminUserRow({
  adminUser,
  currentUserId,
  isLastAdmin,
  onNotice,
  protectedByEnv,
}: {
  adminUser: AdminUser
  currentUserId: string
  isLastAdmin: boolean
  onNotice: (notice: AdminActionState) => void
  protectedByEnv: boolean
}) {
  const router = useRouter()
  const [deleteState, deleteAction] = useActionState(
    deleteAdminUser,
    initialActionState
  )
  const [passwordState, passwordAction] = useActionState(
    resetAdminPassword,
    initialActionState
  )
  const isCurrentUser = adminUser.userId === currentUserId
  const canDelete = !isCurrentUser && !isLastAdmin && !protectedByEnv
  const canResetPassword = !isCurrentUser

  useEffect(() => {
    if (deleteState.ok === null) {
      return
    }

    onNotice(deleteState)

    if (deleteState.ok) {
      router.refresh()
    }
  }, [deleteState, onNotice, router])

  useEffect(() => {
    if (passwordState.ok === null) {
      return
    }

    onNotice(passwordState)
  }, [onNotice, passwordState])

  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-950">{adminUser.email}</span>
          {isCurrentUser && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-[#17486a]">
              Deg
            </span>
          )}
          {protectedByEnv && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              Beskyttet
            </span>
          )}
        </div>
        {deleteState.ok === false && (
          <ActionMessage
            state={deleteState}
            className="mt-2 rounded-md border px-3 py-2 text-sm"
          />
        )}
        {passwordState.ok === false && (
          <ActionMessage
            state={passwordState}
            className="mt-2 rounded-md border px-3 py-2 text-sm"
          />
        )}
      </td>
      <td className="px-5 py-4 text-slate-600">
        {formatDate(adminUser.createdAt)}
      </td>
      <td className="px-5 py-4">
        {canResetPassword ? (
          <form
            action={passwordAction}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input type="hidden" name="userId" value={adminUser.userId} />
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Nytt passord"
              required
              className="min-w-48 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            <SecondarySubmitButton
              label="Sett"
              pendingLabel="Setter ..."
            />
          </form>
        ) : (
          <span className="text-sm text-slate-400">Bruk skjemaet øverst</span>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!canDelete) {
              event.preventDefault()
              return
            }

            if (
              !window.confirm(
                `Fjerne administratortilgang for ${adminUser.email}?`
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="userId" value={adminUser.userId} />
          <DeleteAdminButton
            disabled={!canDelete}
            label={protectedByEnv ? 'Beskyttet' : 'Fjern'}
          />
        </form>
      </td>
    </tr>
  )
}

function GlobalNotice({ notice }: { notice: AdminActionState }) {
  if (notice.ok === null) {
    return null
  }

  return (
    <ActionMessage
      state={notice}
      className="rounded-md border px-4 py-3 text-sm"
    />
  )
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[#0d2d49] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123a5e] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function SecondarySubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function DeleteAdminButton({
  disabled,
  label,
}: {
  disabled: boolean
  label: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="text-xs font-semibold text-red-700 transition hover:text-red-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:no-underline"
    >
      {pending ? 'Fjerner ...' : label}
    </button>
  )
}

function ActionMessage({
  state,
  className,
}: {
  state: AdminActionState
  className: string
}) {
  const toneClassName = state.ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'

  return (
    <p aria-live="polite" className={`${className} ${toneClassName}`}>
      {state.message}
    </p>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}
