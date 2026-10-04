import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ensureSeeded, type Store } from './lib/store'
import type { Profile, Slot } from './lib/types'

interface Ctx {
  store: Store
  profile: Profile
  slots: Slot[]
  reloadSlots: () => Promise<void>
  setProfile: (p: Profile) => Promise<void>
  timer: { endsAt: number; total: number } | null
  startTimer: (seconds: number) => void
  stopTimer: () => void
  adjustTimer: (delta: number) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp fuera de AppProvider')
  return c
}

export function AppProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timer, setTimer] = useState<Ctx['timer']>(null)

  const reloadSlots = useCallback(async () => {
    setSlots(await store.listSlots())
  }, [store])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await ensureSeeded(store)
        const [p, s] = await Promise.all([store.getProfile(), store.listSlots()])
        if (!alive) return
        setProfileState(p)
        setSlots(s)
      } catch (e) {
        if (alive) setError((e as Error).message)
      }
    })()
    return () => {
      alive = false
    }
  }, [store])

  const setProfile = useCallback(
    async (p: Profile) => {
      await store.saveProfile(p)
      setProfileState(p)
    },
    [store],
  )

  if (error)
    return (
      <div className="app">
        <div className="topbar">
          <h1>No se pudo cargar</h1>
          <p className="muted">{error}</p>
          <p className="small muted">Revisa que aplicaste el SQL de supabase/migrations en tu proyecto y recarga.</p>
        </div>
      </div>
    )
  if (!profile)
    return (
      <div className="app">
        <p className="muted" role="status" style={{ paddingTop: 40 }}>
          Cargando…
        </p>
      </div>
    )

  return (
    <AppCtx.Provider
      value={{
        store,
        profile,
        slots,
        reloadSlots,
        setProfile,
        timer,
        startTimer: (s) => setTimer({ endsAt: Date.now() + s * 1000, total: s }),
        stopTimer: () => setTimer(null),
        adjustTimer: (d) => setTimer((t) => (t ? { ...t, endsAt: t.endsAt + d * 1000, total: t.total + d } : t)),
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}
