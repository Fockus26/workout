import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { entryAsNote, formatDate, formatPrescription, formatRange, formatRest, levelLabel } from '../lib/format'
import { DECISION_LABEL, applyDecision, availableDecisions, suggestDecision } from '../lib/progression'
import type { Decision, Entry, Prescription, SessionKind, SetLog, Slot } from '../lib/types'

interface Props {
  sessionId: string
  kind: SessionKind
  slot: Slot | null
  name: string
  prescription: Prescription
  entry: Entry | null
  onSaved: (e: Entry) => void
  defaultOpen?: boolean
}

const RPES = [6, 7, 8, 9, 10]
const draftKey = (sessionId: string, name: string) => `entreno:draft:${sessionId}:${name}`

function initialSets(p: Prescription, entry: Entry | null, key: string): SetLog[] {
  if (entry && entry.sets.length) return entry.sets
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as SetLog[]
  } catch {
    /* sin borrador */
  }
  return Array.from({ length: p.sets }, () => ({ value: p.target, load: p.load, rpe: null, done: false }))
}

function Stepper({ label, value, step, onChange }: { label: string; value: number | null; step: number; onChange: (v: number | null) => void }) {
  const v = value ?? 0
  const fix = (n: number) => Math.round(n * 100) / 100
  return (
    <div className="stepper">
      <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(0, fix(v - step)))}>−</button>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.')
          onChange(t === '' ? null : Number.isNaN(Number(t)) ? value : Number(t))
        }}
      />
      <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(fix(v + step))}>+</button>
    </div>
  )
}

export function ExerciseCard({ sessionId, kind, slot, name, prescription: p, entry, onSaved, defaultOpen }: Props) {
  const { store, startTimer, reloadSlots } = useApp()
  const key = draftKey(sessionId, name)
  const [open, setOpen] = useState(!!defaultOpen)
  const [sets, setSets] = useState<SetLog[]>(() => initialSets(p, entry, key))
  const [decision, setDecision] = useState<Decision | null>(entry?.decision ?? null)
  const [custom, setCustom] = useState<Prescription>(entry?.next ?? p)
  const [note, setNote] = useState(entry?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHist, setShowHist] = useState(false)
  const [hist, setHist] = useState<Entry[] | null>(null)

  const progresses = kind === 'normal' && slot != null
  const suggestion = useMemo(() => suggestDecision(p, sets), [p, sets])
  const chosen = decision ?? suggestion
  const next = chosen === 'personalizado' ? custom : applyDecision(p, chosen)
  const doneCount = sets.filter((s) => s.done).length
  const saved = entry != null && !entry.skipped
  const level = levelLabel(p)

  useEffect(() => {
    if (entry) return
    try {
      localStorage.setItem(key, JSON.stringify(sets))
    } catch {
      /* sin almacenamiento */
    }
  }, [sets, key, entry])

  useEffect(() => {
    if (!showHist || hist) return
    store.history(slot?.id ?? null, name, 12).then((h) => setHist(h.filter((e) => e.sessionId !== sessionId).slice(0, 8)))
  }, [showHist, hist, store, slot, name, sessionId])

  const patchSet = (i: number, patch: Partial<SetLog>) => setSets((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  function toggleDone(i: number) {
    const wasDone = sets[i].done
    patchSet(i, { done: !wasDone })
    if (!wasDone && p.restS && i < sets.length - 1) startTimer(p.restS)
  }

  async function save(skipped = false) {
    setSaving(true)
    setError(null)
    try {
      const nextRx = skipped || !progresses ? null : next
      const e = await store.upsertEntry({
        id: entry?.id,
        sessionId,
        slotId: slot?.id ?? null,
        name,
        section: slot?.section ?? entry?.section ?? 'principal',
        position: slot?.position ?? entry?.position ?? 0,
        prescribed: p,
        sets: skipped ? [] : sets,
        decision: skipped || !progresses ? null : chosen,
        next: nextRx,
        note: note.trim() || null,
        skipped,
      })
      if (slot && progresses) {
        // Siempre desde lo prescrito: guardar dos veces no aplica la decisión dos veces.
        const target = nextRx ?? p
        await store.updateSlot(slot.id, {
          load: target.load, sets: target.sets, target: target.target, targetUnit: target.targetUnit,
          targetMin: target.targetMin, targetMax: target.targetMax, restS: target.restS, level: target.level,
        })
        await reloadSlots()
      }
      try {
        localStorage.removeItem(key)
      } catch {
        /* nada */
      }
      onSaved(e)
      setOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const status = entry?.skipped ? 'No hecho' : saved ? 'Guardado' : doneCount ? `${doneCount}/${sets.length}` : null

  return (
    <article className={`card${saved ? ' done' : ''}${entry?.skipped ? ' skipped' : ''}`}>
      <button className="ex-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="grow">
          <div className="ex-name">{name}</div>
          <div className="rx">{formatPrescription(p)}</div>
          {level && <div className="small muted">{level}</div>}
        </div>
        <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
          {status && <span className={`badge${saved ? ' good' : ''}`}>{status}</span>}
          {slot?.optional && <span className="badge">opcional</span>}
          {slot?.rpe && <span className="badge">RPE {slot.rpe}</span>}
        </div>
      </button>

      {open && (
        <div className="stack" style={{ marginTop: 10 }}>
          {(formatRange(p) || slot?.notes) && (
            <p className="small muted" style={{ margin: 0 }}>
              {formatRange(p) && <>Rango: {formatRange(p)}. </>}
              {slot?.notes}
            </p>
          )}

          <div className="sets">
            {sets.map((s, i) => (
              <div key={i} className={`set${s.done ? ' done' : ''}`}>
                <span className="n" aria-hidden="true">{i + 1}</span>
                <Stepper label={`${p.targetUnit.split(' ')[0]} serie ${i + 1}`} value={s.value} step={p.targetStep || 1} onChange={(v) => patchSet(i, { value: v })} />
                {p.load != null ? (
                  <Stepper label={`${p.loadUnit ?? 'kg'} serie ${i + 1}`} value={s.load} step={p.loadStep ?? 2.5} onChange={(v) => patchSet(i, { load: v })} />
                ) : (
                  <span className="small muted">{p.targetUnit}</span>
                )}
                <button className="check" aria-pressed={s.done} aria-label={`Serie ${i + 1} hecha`} onClick={() => toggleDone(i)}>
                  ✓
                </button>
                <span aria-hidden="true" />
                <div className="rpe" role="group" aria-label={`RPE serie ${i + 1}`}>
                  {RPES.map((r) => (
                    <button key={r} aria-pressed={s.rpe === r} onClick={() => patchSet(i, { rpe: s.rpe === r ? null : r })}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn ghost small" onClick={() => setSets([...sets, { ...sets[sets.length - 1], done: false, rpe: null }])}>+ serie</button>
            {sets.length > 1 && (
              <button className="btn ghost small" onClick={() => setSets(sets.slice(0, -1))}>− serie</button>
            )}
            {p.restS != null && (
              <button className="btn ghost small" onClick={() => startTimer(p.restS!)}>Descanso {formatRest(p.restS)}</button>
            )}
          </div>

          {progresses ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="lbl">¿Qué hago la próxima vez?</div>
              <div className="chips" role="group" aria-label="Decisión para la próxima sesión">
                {availableDecisions(p).map((d) => (
                  <button
                    key={d}
                    className={`chip${d === suggestion ? ' suggested' : ''}`}
                    aria-pressed={chosen === d}
                    onClick={() => {
                      setDecision(d)
                      if (d === 'personalizado') setCustom(applyDecision(p, decision ?? suggestion))
                    }}
                  >
                    {DECISION_LABEL[d]}
                    {d === suggestion && decision == null ? ' · sugerido' : ''}
                  </button>
                ))}
              </div>
              {chosen === 'personalizado' && (
                <div className="grid2">
                  {p.load != null && (
                    <div className="field">
                      <span className="lbl">Peso ({p.loadUnit})</span>
                      <Stepper label="peso siguiente" value={custom.load} step={p.loadStep ?? 2.5} onChange={(v) => setCustom({ ...custom, load: v })} />
                    </div>
                  )}
                  <div className="field">
                    <span className="lbl">Series</span>
                    <Stepper label="series siguientes" value={custom.sets} step={1} onChange={(v) => setCustom({ ...custom, sets: Math.max(1, v ?? 1) })} />
                  </div>
                  <div className="field">
                    <span className="lbl">Objetivo ({p.targetUnit.split(' ')[0]})</span>
                    <Stepper label="objetivo siguiente" value={custom.target} step={p.targetStep || 1} onChange={(v) => setCustom({ ...custom, target: v ?? 1 })} />
                  </div>
                  {p.restS != null && (
                    <div className="field">
                      <span className="lbl">Descanso (s)</span>
                      <Stepper label="descanso siguiente" value={custom.restS} step={p.restStepS || 15} onChange={(v) => setCustom({ ...custom, restS: v })} />
                    </div>
                  )}
                </div>
              )}
              <div className="next">
                <span className="lbl">Próxima vez: </span>
                <strong>{formatPrescription(next)}</strong>
                {levelLabel(next) && next.level !== p.level && <div className="small">{levelLabel(next)}</div>}
              </div>
            </div>
          ) : (
            kind === 'descarga' && <p className="small muted" style={{ margin: 0 }}>Semana de descarga: RPE ≤ 6. No cambia tu plan.</p>
          )}

          <div className="field">
            <label htmlFor={`note-${key}`}>Nota</label>
            <textarea id={`note-${key}`} className="input" placeholder="Cómo lo sentiste, técnica, molestias…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p role="alert" className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <div className="row">
            <button className="btn primary grow" disabled={saving} onClick={() => save(false)}>
              {saving ? 'Guardando…' : saved ? 'Actualizar' : 'Guardar ejercicio'}
            </button>
            <button className="btn ghost" disabled={saving} onClick={() => save(true)}>No lo hice</button>
          </div>

          <button className="btn ghost small" aria-expanded={showHist} onClick={() => setShowHist(!showHist)}>
            {showHist ? 'Ocultar historial' : 'Ver cómo me fue antes'}
          </button>
          {showHist && (
            <div className="hist" aria-live="polite">
              {hist == null && <span className="small muted">Cargando…</span>}
              {hist?.length === 0 && <span className="small muted">Aún no hay registros de este ejercicio.</span>}
              {hist?.map((h) => (
                <div key={h.id} className="hist-item">
                  <div className="spread">
                    <strong className="small">{h.date ? formatDate(h.date) : ''}</strong>
                    <span className="small muted">{formatPrescription(h.prescribed)}</span>
                  </div>
                  {h.skipped ? (
                    <div className="small muted">No hecho</div>
                  ) : (
                    <div className="small">
                      {h.sets.filter((s) => s.done).map((s, i) => (
                        <span key={i}>
                          {i > 0 && ' · '}R{i + 1}: {s.value}
                          {s.load != null && s.load !== h.prescribed.load ? ` @${s.load}` : ''}
                          {s.rpe != null ? ` RPE ${s.rpe}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {(h.decision || h.note) && (
                    <div className="small muted">
                      {h.decision && DECISION_LABEL[h.decision]}
                      {h.decision && h.note && ' · '}
                      {h.note}
                    </div>
                  )}
                </div>
              ))}
              {hist && hist.length > 0 && (
                <details>
                  <summary className="small muted">Como nota</summary>
                  <pre className="note-line">{hist.map((h) => `${h.date ?? ''}  ${entryAsNote(h)}`).join('\n')}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
