import { useEffect, useMemo, useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { AppProvider } from './AppContext'
import { RestTimer } from './components/RestTimer'
import { localStore, supabase, supabaseStore } from './lib/store'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { PlanPage } from './pages/PlanPage'
import { Records } from './pages/Records'
import { SessionPage } from './pages/SessionPage'
import { Settings } from './pages/Settings'
import { Today } from './pages/Today'

/** Rutas por hash (#/sesion/<id>) para que funcione en cualquier hosting estático. */
function useHashRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [parts, setParts] = useState(read)
  useEffect(() => {
    const on = () => {
      setParts(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}

const NAV = [
  { href: '', label: 'Hoy', icon: 'M4 12l8-8 8 8M6 10v10h12V10' },
  { href: 'historial', label: 'Historial', icon: 'M4 5h16M4 12h16M4 19h10' },
  { href: 'plan', label: 'Plan', icon: 'M4 4h16v16H4zM4 9h16M9 9v11' },
  { href: 'prs', label: 'PRs', icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4' },
  { href: 'ajustes', label: 'Ajustes', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z' },
]

function Shell() {
  const [page, arg] = useHashRoute()
  const current = page ?? ''
  let body
  if (current === 'sesion' && arg) body = <SessionPage id={arg} />
  else if (current === 'historial') body = <History />
  else if (current === 'plan') body = <PlanPage />
  else if (current === 'prs') body = <Records />
  else if (current === 'ajustes') body = <Settings />
  else body = <Today />
  const active = current === 'sesion' ? '' : current
  return (
    <>
      <main className="app">{body}</main>
      <RestTimer />
      <nav className="nav" aria-label="Secciones">
        <div className="nav-inner">
          {NAV.map((n) => (
            <a key={n.href} href={`#/${n.href}`} aria-current={active === n.href ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={n.icon} />
              </svg>
              {n.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  )
}

export default function App() {
  const [auth, setAuth] = useState<AuthSession | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAuth(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = auth?.user.id
  const store = useMemo(() => (supabase ? (userId ? supabaseStore(supabase) : null) : localStore()), [userId])

  if (supabase && auth === undefined) return <p className="app muted" style={{ paddingTop: 40 }} role="status">Cargando…</p>
  if (supabase && !auth) return <Login />
  if (!store) return null
  return (
    <AppProvider key={userId ?? 'local'} store={store}>
      <Shell />
    </AppProvider>
  )
}
