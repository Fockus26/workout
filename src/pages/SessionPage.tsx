import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { ExerciseCard } from '../components/ExerciseCard'
import { PrSession } from '../components/PrSession'
import { weekLabel } from '../lib/calendar'
import { DAY_TITLES, entryAsNote, formatDate } from '../lib/format'
import { go } from '../lib/nav'
import { todaysPrescription } from '../lib/session'
import { SECTIONS, SECTION_LABEL, type Entry, type Feeling, type Session } from '../lib/types'

const FEELINGS: { v: Feeling; label: string }[] = [
  { v: 'bien', label: 'Bien' },
  { v: 'normal', label: 'Normal' },
  { v: 'decaido', label: 'Decaído' },
]

export function SessionPage({ id }: { id: string }) {
  const { store, slots } = useApp()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [entries, setEntries] = useState<Entry[]>([])
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    store.getSession(id).then((s) => {
      setSession(s)
      setFeeling(s?.feeling ?? null)
      setNotes(s?.notes ?? '')
    })
    store.listEntries(id).then(setEntries)
  }, [store, id])

  if (session === undefined) return <p className="muted" role="status" style={{ paddingTop: 40 }}>Cargando…</p>
  if (session === null)
    return (
      <div className="topbar">
        <h1>Sesión no encontrada</h1>
        <a href="#/">Volver</a>
      </div>
    )

  const onSaved = (e: Entry) => setEntries((all) => [...all.filter((x) => x.id !== e.id), e])
  const daySlots = slots.filter((s) => s.active && s.day === session.day)
  const orphan = entries.filter((e) => !daySlots.some((s) => s.id === e.slotId))
  const firstPending = daySlots.find((s) => !entries.some((e) => e.slotId === s.id) && todaysPrescription(s, session.kind))

  async function finish() {
    const patch = { feeling, notes: notes.trim() || null, finishedAt: new Date().toISOString() }
    await store.updateSession(id, patch)
    setSession({ ...session!, ...patch })
    go('/')
  }

  async function remove() {
    if (!confirm('¿Borrar esta sesión y sus registros? Las prescripciones que ya avanzaste en el plan se quedan como están.')) return
    await store.deleteSession(id)
    go('/')
  }

  async function copy() {
    const lines = entries.sort((a, b) => a.position - b.position).map(entryAsNote)
    const text = `${formatDate(session!.date)}\n\n${lines.join('\n')}${notes ? `\n\n${notes}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="stack">
      <header className="topbar">
        <span className="eyebrow">
          {session.week ? weekLabel(session.week) : ''}
          {session.kind === 'descarga' ? ' · Descarga' : ''}
        </span>
        <h1>{formatDate(session.date)}</h1>
        <p className="muted small" style={{ margin: 0 }}>{session.kind === 'pr' ? 'Semana de PR' : DAY_TITLES[session.day]}</p>
      </header>

      {session.kind === 'pr' ? (
        <PrSession session={session} />
      ) : (
        SECTIONS.map((sec) => {
          const list = daySlots.filter((s) => s.section === sec)
          if (!list.length) return null
          return (
            <section key={sec} aria-labelledby={`sec-${sec}`} className="stack">
              <h2 id={`sec-${sec}`} className="section-title">{SECTION_LABEL[sec]}</h2>
              {list.map((slot) => {
                const entry = entries.find((e) => e.slotId === slot.id) ?? null
                const p = entry?.prescribed ?? todaysPrescription(slot, session.kind)
                if (!p)
                  return (
                    <div key={slot.id} className="card skipped small">
                      <strong>{slot.name}</strong> — esta semana no. {slot.deloadAlt}
                    </div>
                  )
                return (
                  <ExerciseCard
                    key={slot.id}
                    sessionId={id}
                    kind={session.kind}
                    slot={slot}
                    name={slot.name}
                    prescription={p}
                    entry={entry}
                    onSaved={onSaved}
                    defaultOpen={firstPending?.id === slot.id && !session.finishedAt}
                  />
                )
              })}
            </section>
          )
        })
      )}

      {orphan.length > 0 && (
        <section className="stack">
          <h2 className="section-title">Otros registros</h2>
          {orphan.map((e) => (
            <ExerciseCard key={e.id} sessionId={id} kind={session.kind} slot={null} name={e.name} prescription={e.prescribed} entry={e} onSaved={onSaved} />
          ))}
        </section>
      )}

      <section className="card stack" aria-labelledby="fin-h">
        <h2 id="fin-h">{session.finishedAt ? 'Sesión terminada' : 'Terminar sesión'}</h2>
        <div className="chips" role="group" aria-label="Cómo te sentiste">
          {FEELINGS.map((f) => (
            <button key={f.v} className="chip" aria-pressed={feeling === f.v} onClick={() => setFeeling(f.v)}>
              {f.label}
            </button>
          ))}
        </div>
        <textarea className="input" aria-label="Notas de la sesión" placeholder="Notas del día (sueño, energía, tiempo total…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn primary big" onClick={finish}>
          {session.finishedAt ? 'Guardar cambios' : 'Terminar sesión'}
        </button>
        <div className="row">
          <button className="btn ghost small" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar como nota'}</button>
          <button className="btn ghost small danger" onClick={remove}>Borrar sesión</button>
        </div>
      </section>
    </div>
  )
}
