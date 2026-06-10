'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { CarGroupSlug } from '@/lib/car-groups'
import type { AdminDealer } from '@/lib/admin-data'
import {
  createDealer,
  createDealerUser,
  deleteDealerUser,
  updateDealerGroup,
  updateDealerUser,
  type AdminActionState,
} from './actions'

interface CarGroupOption {
  slug: CarGroupSlug
  name: string
}

interface AdminControlsProps {
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
}

const initialActionState: AdminActionState = {
  ok: null,
  message: '',
}

export function AdminControls({ dealers, carGroups }: AdminControlsProps) {
  const [notice, setNotice] = useState<AdminActionState>(initialActionState)

  return (
    <>
      <GlobalNotice notice={notice} />

      <section className="grid gap-6 lg:grid-cols-2">
        <CreateDealerCard carGroups={carGroups} onNotice={setNotice} />
        <CreateUserCard dealers={dealers} onNotice={setNotice} />
      </section>

      <DealersSection
        carGroups={carGroups}
        dealers={dealers}
        onNotice={setNotice}
      />
    </>
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

function CreateDealerCard({
  carGroups,
  onNotice,
}: {
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    createDealer,
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
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-950">
          Ny forhandler
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Legg inn FINN orgId og velg hvilken offentlig gruppe forhandleren
          skal vises i.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
          Firma
          <input
            name="dealerName"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
          FINN orgId
          <input
            name="orgId"
            inputMode="numeric"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800 sm:col-span-2">
          Gruppe
          <select
            name="groupSlug"
            defaultValue="bilbyen"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {carGroups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          />
        )}

        <div className="sm:col-span-2">
          <SubmitButton label="Lagre forhandler" pendingLabel="Lagrer ..." />
        </div>
      </form>
    </section>
  )
}

function CreateUserCard({
  dealers,
  onNotice,
}: {
  dealers: AdminDealer[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    createDealerUser,
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
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-950">
          Ny bruker
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Opprett én innlogging og koble brukeren til én forhandler.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800 sm:col-span-2">
          Forhandler
          <select
            name="dealerId"
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Velg forhandler</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </label>

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
          Midlertidig passord
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
          Rolle
          <select
            name="role"
            defaultValue="viewer"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          />
        )}

        <div className="self-end">
          <SubmitButton label="Opprett bruker" pendingLabel="Oppretter ..." />
        </div>
      </form>
    </section>
  )
}

function DealersSection({
  dealers,
  carGroups,
  onNotice,
}: {
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const [openDealerIds, setOpenDealerIds] = useState<Set<string>>(new Set())

  function toggleDealer(dealerId: string) {
    setOpenDealerIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(dealerId)) {
        nextIds.delete(dealerId)
      } else {
        nextIds.add(dealerId)
      }

      return nextIds
    })
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            Forhandlere
          </h2>
          <p className="text-sm text-gray-500">
            Åpne en forhandler for å redigere gruppe og brukertilganger.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-500">
          {dealers.length} forhandler{dealers.length === 1 ? '' : 'e'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[48rem]">
          <div className="grid grid-cols-[minmax(14rem,1.4fr)_9rem_minmax(12rem,1fr)_6rem] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Firma</span>
            <span>OrgId</span>
            <span>Gruppe</span>
            <span className="text-right">Brukere</span>
          </div>
          <div className="divide-y divide-gray-100">
            {dealers.map((dealer) => (
              <DealerRow
                key={dealer.id}
                carGroups={carGroups}
                dealer={dealer}
                dealers={dealers}
                isOpen={openDealerIds.has(dealer.id)}
                onNotice={onNotice}
                onToggle={() => toggleDealer(dealer.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DealerRow({
  dealer,
  dealers,
  carGroups,
  isOpen,
  onNotice,
  onToggle,
}: {
  dealer: AdminDealer
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
  isOpen: boolean
  onNotice: (notice: AdminActionState) => void
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(14rem,1.4fr)_9rem_minmax(12rem,1fr)_6rem] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon isOpen={isOpen} />
          <div>
            <p className="font-medium text-gray-950">{dealer.name}</p>
            <p className="mt-1 text-xs text-gray-500">{dealer.slug}</p>
          </div>
        </div>
        <span className="font-mono text-xs text-gray-700">
          {dealer.orgId}
        </span>
        <span className="text-gray-700">
          {getCarGroupName(carGroups, dealer.groupSlug)}
        </span>
        <span className="text-right text-gray-700">
          {dealer.users.length}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
          <div className="grid gap-5 xl:grid-cols-[20rem_1fr]">
            <DealerGroupForm
              carGroups={carGroups}
              dealer={dealer}
              onNotice={onNotice}
            />

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-950">
                  Tilknyttede brukere
                </h3>
                <span className="text-xs font-medium text-gray-500">
                  {dealer.users.length} bruker
                  {dealer.users.length === 1 ? '' : 'e'}
                </span>
              </div>

              {dealer.users.length === 0 ? (
                <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Ingen brukere er koblet til denne forhandleren.
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {dealer.users.map((user) => (
                    <UserEditor
                      key={user.userId}
                      dealers={dealers}
                      onNotice={onNotice}
                      user={user}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function DealerGroupForm({
  dealer,
  carGroups,
  onNotice,
}: {
  dealer: AdminDealer
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    updateDealerGroup,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      router.refresh()
    }
  }, [onNotice, router, state])

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-950">
        Forhandleroppsett
      </h3>
      <form
        action={formAction}
        className="mt-3 flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="dealerId" value={dealer.id} />
        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Gruppe
          <select
            name="groupSlug"
            defaultValue={dealer.groupSlug}
            aria-label={`Gruppe for ${dealer.name}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {carGroups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm"
          />
        )}
        <SubmitButton
          label="Lagre gruppe"
          pendingLabel="Lagrer ..."
          variant="secondary"
        />
      </form>
    </section>
  )
}

function UserEditor({
  dealers,
  user,
  onNotice,
}: {
  dealers: AdminDealer[]
  user: AdminDealer['users'][number]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const [updateState, updateAction] = useActionState(
    updateDealerUser,
    initialActionState
  )
  const [deleteState, deleteAction] = useActionState(
    deleteDealerUser,
    initialActionState
  )

  useEffect(() => {
    if (updateState.ok === null) {
      return
    }

    onNotice(updateState)

    if (updateState.ok) {
      router.refresh()
    }
  }, [onNotice, router, updateState])

  useEffect(() => {
    if (deleteState.ok === null) {
      return
    }

    onNotice(deleteState)

    if (deleteState.ok) {
      router.refresh()
    }
  }, [deleteState, onNotice, router])

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <form
        id={`update-user-${user.userId}`}
        action={updateAction}
        className="grid gap-3 lg:grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1fr)_8rem_minmax(9rem,0.8fr)_auto]"
      >
        <input type="hidden" name="userId" value={user.userId} />

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          E-post
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Forhandler
          <select
            name="dealerId"
            defaultValue={user.dealerId}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Rolle
          <select
            name="role"
            defaultValue={user.role}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Nytt passord
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="Uendret"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="flex gap-2 lg:self-end lg:justify-end">
          <SubmitButton label="Lagre" pendingLabel="Lagrer ..." />
        </div>

        {updateState.ok === false && (
          <ActionMessage
            state={updateState}
            className="rounded-md border px-3 py-2 text-sm lg:col-span-5"
          />
        )}
      </form>

      <form
        action={deleteAction}
        className="mt-2"
        onSubmit={(event) => {
          if (!window.confirm(`Slette ${user.email}?`)) {
            event.preventDefault()
          }
        }}
      >
        <input type="hidden" name="userId" value={user.userId} />
        <DeleteButton />
        {deleteState.ok === false && (
          <ActionMessage
            state={deleteState}
            className="mt-2 rounded-md border px-3 py-2 text-sm"
          />
        )}
      </form>
    </div>
  )
}

function SubmitButton({
  label,
  pendingLabel,
  variant = 'primary',
}: {
  label: string
  pendingLabel: string
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()
  const className =
    variant === 'primary'
      ? 'rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
      : 'self-start rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-red-700 transition hover:text-red-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Sletter ...' : 'Slett bruker'}
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

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
        isOpen ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function getCarGroupName(
  carGroups: CarGroupOption[],
  groupSlug: CarGroupSlug
): string {
  return carGroups.find((group) => group.slug === groupSlug)?.name ?? groupSlug
}
