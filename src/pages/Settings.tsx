import { useState } from 'react'
import { useApp } from '../AppContext'
import { mondayOf } from '../lib/calendar'
import { SEED_SLOTS } from '../lib/seed'
import { supabase } from '../lib/store'

export function Settings() {
  const { store, profile, setProfile, reloadSlots } = useApp()
  const [start, setStart] = useState(profile.blockStart)
  const [bw, setBw] = useState(profile.bodyweight?.toString() ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    await setProfile({ blockStart: mondayOf(start), bodyweight: bw ? Number(bw.replace(',', '.')) : null })
    setStart(mondayOf(start))
    setMsg('Guardado.')
  }

  async function exportJson() {
    const [slots, sessions, entries, records] = await Promise.all([store.listSlots(), store.listSessions(), store.listAllEntries(), store.listRecords()])
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, slots, sessions, entries, records }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `entreno-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function resetPlan() {
    if (!confirm('¿Cargar de nuevo el plan v4 desde cero? Tus prescripciones actuales se archivan (el historial se conserva).')) return
    await store.replaceAllSlots(SEED_SLOTS)
    await reloadSlots()
    setMsg('Plan v4 cargado.')
  }

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Ajustes</h1>
        <p className="small muted" style={{ margin: 0 }}>
          {store.mode === 'local' ? 'Modo local: los datos se guardan solo en este navegador.' : 'Datos guardados en Supabase.'}
        </p>
      </header>

      <section className="card stack">
        <h2>Bloque</h2>
        <label className="field">
          <span className="lbl">Lunes de la semana 1</span>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>Semanas 1–8 bloque · 9 descarga · 10 PR. Si eliges otro día, se usa el lunes de esa semana.</p>
        <label className="field">
          <span className="lbl">Peso corporal (kg)</span>
          <input className="input" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} />
        </label>
        <button className="btn primary" onClick={save}>Guardar</button>
        {msg && <p role="status" className="small">{msg}</p>}
      </section>

      <section className="card stack">
        <h2>Datos</h2>
        <button className="btn" onClick={exportJson}>Descargar copia (JSON)</button>
        <button className="btn danger" onClick={resetPlan}>Volver a cargar el plan v4</button>
        {supabase && (
          <button className="btn ghost" onClick={() => supabase!.auth.signOut()}>Cerrar sesión</button>
        )}
      </section>
    </div>
  )
}
