import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { formatRecord } from '../lib/format'
import { PR_DAYS, liftByKey, prPlan } from '../lib/prweek'
import { estimatedMaxes } from '../lib/session'
import type { RecordRow, Session } from '../lib/types'

const r25 = (n: number) => Math.round(n / 2.5) * 2.5

export function PrSession({ session }: { session: Session }) {
  const { store, slots } = useApp()
  const [records, setRecords] = useState<RecordRow[]>([])
  const [maxes, setMaxes] = useState<Record<string, number>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const plan = PR_DAYS[session.day]

  async function refresh() {
    const [recs, entries] = await Promise.all([store.listRecords(), store.listAllEntries()])
    setRecords(recs)
    setMaxes(estimatedMaxes(recs.filter((r) => r.date < session.date), entries, slots, session.date))
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  async function save(lift: string) {
    const v = Number((values[lift] ?? '').replace(',', '.'))
    if (!v) return
    await store.insertRecord({ date: session.date, lift, value: v, unit: liftByKey(lift)!.unit, reps: 1, notes: notes[lift]?.trim() || null })
    setValues({ ...values, [lift]: '' })
    setNotes({ ...notes, [lift]: '' })
    refresh()
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h2>{plan.title}</h2>
        <details>
          <summary className="small"><strong>Semáforo y protocolo de 1RM</strong> (toca para ver)</summary>
          <div className="small stack" style={{ gap: 6, marginTop: 8 }}>
            <p style={{ margin: 0 }}><strong>Verde</strong>: dormiste bien y los calentamientos van rápido → test. <strong>Amarillo</strong>: el 85 % se siente pesado → single a RPE 8–9 y para. <strong>Rojo</strong>: dolor articular o agotado → no testees.</p>
            <p style={{ margin: 0 }}>Calentamiento general 5–10 min → aproximaciones (2 min entre ellas) → intento 1 a RPE ~8 → intento 2: +5–7.5 kg si subió rápido, +2.5 si lento → intento 3 solo si el 2 fue RPE ≤ 9. 3–5 min entre intentos, máximo 1 fallo. Técnica rota = no cuenta. Safeties, spotter y video lateral.</p>
          </div>
        </details>
        <p className="small muted" style={{ margin: 0 }}>{plan.note}</p>
      </div>

      {plan.lifts.map((key) => {
        const lift = liftByKey(key)!
        const est = maxes[key]
        const pp = lift.oneRM && est ? prPlan(key, est) : null
        const today = records.filter((r) => r.lift === key && r.date === session.date)
        const best = records.filter((r) => r.lift === key && r.date < session.date).sort((a, b) => b.value - a.value)[0]
        return (
          <article key={key} className="card stack">
            <div className="spread">
              <h3>{lift.label}</h3>
              {best && <span className="badge">PR {formatRecord(best.value, best.unit)}</span>}
            </div>
            {pp && (
              <table className="simple">
                <tbody>
                  <tr><th scope="row">1RM estimado</th><td>{r25(est)} {lift.unit}</td></tr>
                  <tr><th scope="row">Calentamiento</th><td>{pp.warmup}</td></tr>
                  <tr><th scope="row">Intentos</th><td>{pp.attempts.join(' → ')}</td></tr>
                </tbody>
              </table>
            )}
            {today.map((r) => (
              <div key={r.id} className="spread small">
                <span>Registrado: <strong>{formatRecord(r.value, r.unit)}</strong>{r.notes ? ` · ${r.notes}` : ''}</span>
                <button className="btn ghost small danger" onClick={() => store.deleteRecord(r.id).then(refresh)}>Quitar</button>
              </div>
            ))}
            <div className="grid2">
              <div className="field">
                <label htmlFor={`v-${key}`}>Resultado ({lift.unit})</label>
                <input id={`v-${key}`} className="input" inputMode="decimal" value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`n-${key}`}>RPE / técnica</label>
                <input id={`n-${key}`} className="input" value={notes[key] ?? ''} onChange={(e) => setNotes({ ...notes, [key]: e.target.value })} placeholder="RPE 9, limpia" />
              </div>
            </div>
            <button className="btn primary" onClick={() => save(key)} disabled={!values[key]}>Guardar resultado</button>
          </article>
        )
      })}
    </div>
  )
}
