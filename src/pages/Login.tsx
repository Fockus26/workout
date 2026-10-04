import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/store'

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    const { error, data } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
  }

  return (
    <main className="app">
      <div className="topbar">
        <span className="eyebrow">Registro de entreno</span>
        <h1>{mode === 'in' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
      </div>
      <form className="card stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Contraseña</label>
          <input id="pw" className="input" type="password" minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p role="alert" className="small">{msg}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'No tengo cuenta: crear una' : 'Ya tengo cuenta: entrar'}
        </button>
      </form>
    </main>
  )
}
