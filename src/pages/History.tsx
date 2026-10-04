import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { mondayOf } from '../lib/calendar'
import { DAY_TITLES, entryAsNote, formatDate, formatPrescription, monthLabel } from '../lib/format'
import { DECISION_LABEL } from '../lib/progression'
import type { Entry, Session } from '../lib/types'

interface WeekGroup { label: string; sessions: Session[] }
interface MonthGroup { label: string; weeks: WeekGroup[] }

function group(sessions: Session[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const s of sessions) {
    const ml = monthLabel(s.date)
    let m = months.find((x) => x.label === ml)
    if (!m) months.push((m = { label: ml, weeks: [] }))
    const wl = s.week && s.week >= 1 ? `Semana ${s.week}${s.kind === 'descarga' ? ' (descarga)' : s.kind === 'pr' ? ' (PR)' : ''}` : `Semana del ${formatDate(mondayOf(s.date))}`
    let w = m.weeks.find((x) => x.label === wl)
    if (!w) m.weeks.push((w = { label: wl, sessions: [] }))
    w.sessions.push(s)
  }
  return months
}

export function History() {
  const { store } = useApp()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [view, setView] = useState<'dias' | 'ejercicio'>('dias')
  const [exercise, setExercise] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    store.listSessions().then(setSessions)
    store.listAllEntries().then(setEntries)
  }, [store])

  const bySession = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of entries) m.set(e.sessionId, [...(m.get(e.sessionId) ?? []), e])
    for (const list of m.values()) list.sort((a, b) => a.position - b.position)
    return m
  }, [entries])
  const names = useMemo(() => [...new Set(entries.map((e) => e.name))].sort(), [entries])
  const months = useMemo(() => group(sessions ?? []), [sessions])

  const sessionNote = (s: Session) => {
    const head = `${formatDate(s.date)}${s.feeling ? ` · ${s.feeling}` : ''}`
    return [head, ...(bySession.get(s.id) ?? []).map(entryAsNote), s.notes ?? ''].filter(Boolean).join('\n')
  }

  async function copyMonth(m: MonthGroup) {
    const text = [m.label, ...m.weeks.map((w) => [w.label, ...w.sessions.map(sessionNote)].join('\n\n'))].join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(m.label)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Historial</h1>
      </header>
      <div className="chips" role="group" aria-label="Vista">
        <button className="chip" aria-pressed={view === 'dias'} onClick={() => setView('dias')}>Por mes y semana</button>
        <button className="chip" aria-pressed={view === 'ejercicio'} onClick={() => setView('ejercicio')}>Por ejercicio</button>
      </div>

      {sessions == null && <p className="muted" role="status">Cargando…</p>}
      {sessions?.length === 0 && <p className="muted">Aún no hay sesiones. Empieza una desde "Hoy".</p>}

      {view === 'dias' &&
        months.map((m) => (
          <section key={m.label} className="stack">
            <div className="spread">
              <h2>{m.label}</h2>
              <button className="btn ghost small" onClick={() => copyMonth(m)}>{copied === m.label ? 'Copiado ✓' : 'Copiar como nota'}</button>
            </div>
            {m.weeks.map((w) => (
              <div key={w.label} className="stack week" style={{ gap: 8 }}>
                <h3 className="section-title" style={{ margin: '4px 0 0' }}>{w.label}</h3>
                {w.sessions.map((s) => (
                  <details key={s.id} className="card">
                    <summary className="spread">
                      <span>
                        <strong>{formatDate(s.date)}</strong>
                        <span className="small muted"> · {s.kind === 'pr' ? 'PRs' : DAY_TITLES[s.day]}</span>
                      </span>
                      <span className="badge">{s.finishedAt ? (s.feeling ?? 'hecha') : 'en curso'}</span>
                    </summary>
                    <div className="stack" style={{ marginTop: 10, gap: 6 }}>
                      {(bySession.get(s.id) ?? []).map((e) => (
                        <div key={e.id} className="note-line">{entryAsNote(e)}</div>
                      ))}
                      {s.notes && <p className="small muted" style={{ margin: 0 }}>{s.notes}</p>}
                      <a className="small" href={`#/sesion/${s.id}`}>Abrir sesión</a>
                    </div>
                  </details>
                ))}
              </div>
            ))}
          </section>
        ))}

      {view === 'ejercicio' && (
        <div className="stack">
          <label className="field">
            <span className="lbl">Ejercicio</span>
            <select className="input" value={exercise} onChange={(e) => setExercise(e.target.value)}>
              <option value="">Elige uno…</option>
              {names.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {entries
            .filter((e) => e.name === exercise)
            .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
            .map((e) => (
              <div key={e.id} className="card small stack" style={{ gap: 4 }}>
                <div className="spread">
                  <strong>{e.date ? formatDate(e.date) : ''}</strong>
                  <span className="muted">{formatPrescription(e.prescribed)}</span>
                </div>
                {e.skipped ? (
                  <span className="muted">No hecho</span>
                ) : (
                  <div>
                    {e.sets.filter((s) => s.done).map((s, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}R{i + 1}: {s.value}
                        {s.load != null && s.load !== e.prescribed.load ? ` @${s.load}` : ''}
                        {s.rpe != null ? ` RPE ${s.rpe}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {(e.decision || e.note) && (
                  <div className="muted">
                    {e.decision && DECISION_LABEL[e.decision]}
                    {e.decision && e.note && ' · '}
                    {e.note}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
