import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../AppContext'
import { formatDate, formatRecord } from '../lib/format'
import { todayISO } from '../lib/nav'
import { GOALS, LIFTS, liftByKey } from '../lib/prweek'
import { estimatedMaxes } from '../lib/session'
import type { RecordRow } from '../lib/types'

export function Records() {
  const { store, slots } = useApp()
  const [records, setRecords] = useState<RecordRow[] | null>(null)
  const [maxes, setMaxes] = useState<Record<string, number>>({})
  const [form, setForm] = useState({ lift: 'sentadilla', value: '', date: todayISO(), notes: '' })

  async function refresh() {
    const [recs, entries] = await Promise.all([store.listRecords(), store.listAllEntries()])
    setRecords(recs)
    setMaxes(estimatedMaxes(recs, entries, slots, todayISO()))
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  async function add(e: FormEvent) {
    e.preventDefault()
    const v = Number(form.value.replace(',', '.'))
    if (!v) return
    await store.insertRecord({ date: form.date, lift: form.lift, value: v, unit: liftByKey(form.lift)!.unit, reps: 1, notes: form.notes.trim() || null })
    setForm({ ...form, value: '', notes: '' })
    refresh()
  }

  const latest = (lift: string) => records?.filter((r) => r.lift === lift).sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Metas y PRs</h1>
      </header>

      <section className="stack" aria-labelledby="goals-h">
        <h2 id="goals-h">Metas</h2>
        {GOALS.map((g) => {
          const est = maxes[g.lift]
          const pct = g.needed && est ? Math.min(100, Math.round((est / g.needed) * 100)) : null
          const repsNow = g.weight && est && est > g.weight ? Math.floor(30 * (est / g.weight - 1)) : null
          const last = latest(g.lift)
          return (
            <div key={g.label} className="card stack" style={{ gap: 6 }}>
              <strong>{g.label}</strong>
              {pct != null && (
                <>
                  <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso hacia ${g.label}`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="small muted">
                    1RM estimado {Math.round(est!)} de ~{g.needed} kg ({pct} %)
                    {repsNow != null && g.weight ? ` · hoy ≈ ${repsNow} reps con ${g.weight} kg` : ''}
                  </div>
                </>
              )}
              {pct == null && last && (
                <div className="small muted">Último: {formatRecord(last.value, last.unit)}{last.notes ? ` · ${last.notes}` : ''} ({formatDate(last.date)})</div>
              )}
              <div className="small muted">Hitos: {g.milestones}</div>
            </div>
          )
        })}
      </section>

      <section className="stack" aria-labelledby="add-h">
        <h2 id="add-h">Añadir PR o test</h2>
        <form className="card stack" onSubmit={add}>
          <div className="grid2">
            <label className="field">
              <span className="lbl">Ejercicio</span>
              <select className="input" value={form.lift} onChange={(e) => setForm({ ...form, lift: e.target.value })}>
                {LIFTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="lbl">Valor ({liftByKey(form.lift)?.unit})</span>
              <input className="input" inputMode="decimal" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </label>
            <label className="field">
              <span className="lbl">Fecha</span>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="field">
              <span className="lbl">Nota</span>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <button className="btn primary">Guardar</button>
        </form>
      </section>

      <section className="stack" aria-labelledby="hist-h">
        <h2 id="hist-h">Registro de PRs</h2>
        {records == null && <p className="muted" role="status">Cargando…</p>}
        {LIFTS.map((l) => {
          const list = (records ?? []).filter((r) => r.lift === l.key)
          if (!list.length) return null
          return (
            <details key={l.key} className="card">
              <summary className="spread">
                <strong>{l.label}</strong>
                <span className="small">{formatRecord(list[0].value, list[0].unit)}</span>
              </summary>
              <table className="simple" style={{ marginTop: 8 }}>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td>{formatRecord(r.value, r.unit)}{r.reps > 1 ? ` ×${r.reps}` : ''}</td>
                      <td className="muted">{r.notes}</td>
                      <td>
                        <button className="btn ghost small danger" aria-label={`Borrar PR del ${r.date}`} onClick={() => confirm('¿Borrar este registro?') && store.deleteRecord(r.id).then(refresh)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )
        })}
      </section>
    </div>
  )
}
