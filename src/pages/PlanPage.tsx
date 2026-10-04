import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../AppContext'
import { DAY_NAMES, DAY_TITLES, formatPrescription, formatRange, levelLabel } from '../lib/format'
import { LADDERS } from '../lib/ladders'
import { blockProgress, prescriptionOf, type SlotProgress } from '../lib/session'
import { SECTIONS, SECTION_LABEL, type Section, type Slot } from '../lib/types'

const SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type Draft = Record<string, string | boolean>

const NUM_FIELDS: [keyof Slot, string][] = [
  ['load', 'Peso / velocidad'], ['loadStep', 'Salto de peso'], ['sets', 'Series'], ['target', 'Objetivo actual'],
  ['targetMin', 'Objetivo mín'], ['targetMax', 'Objetivo máx'], ['targetStep', 'Paso del objetivo'],
  ['restS', 'Descanso actual (s)'], ['restMinS', 'Descanso mín (s)'], ['restMaxS', 'Descanso máx (s)'], ['restStepS', 'Paso descanso (s)'],
  ['level', 'Nivel'],
]
const TEXT_FIELDS: [keyof Slot, string][] = [
  ['name', 'Nombre'], ['loadUnit', 'Unidad de peso (kg, kg c/u, km/h)'], ['targetUnit', 'Unidad del objetivo (reps, s, min…)'],
  ['rpe', 'RPE objetivo'], ['notes', 'Notas'], ['deloadAlt', 'En descarga, en su lugar'],
]

function toDraft(s: Partial<Slot>): Draft {
  const d: Draft = {}
  for (const [k] of [...NUM_FIELDS, ...TEXT_FIELDS]) d[k] = s[k] == null ? '' : String(s[k])
  d.section = s.section ?? 'principal'
  d.ladder = s.ladder ?? ''
  d.optional = !!s.optional
  d.skipDeload = s.deload === 'skip'
  return d
}

function fromDraft(d: Draft): Partial<Slot> {
  const out: Record<string, unknown> = {}
  for (const [k] of NUM_FIELDS) {
    const v = String(d[k]).replace(',', '.').trim()
    out[k] = v === '' ? null : Number(v)
  }
  for (const [k] of TEXT_FIELDS) out[k] = String(d[k]).trim() || null
  out.section = d.section
  out.ladder = d.ladder || null
  out.optional = !!d.optional
  out.deload = d.skipDeload ? 'skip' : 'normal'
  if (out.sets == null) out.sets = 3
  if (out.target == null) out.target = 1
  if (out.targetStep == null) out.targetStep = 1
  if (out.restStepS == null) out.restStepS = 30
  if (!out.targetUnit) out.targetUnit = 'reps'
  return out as Partial<Slot>
}

function SlotEditor({ initial, onSave, onCancel }: { initial: Partial<Slot>; onSave: (s: Partial<Slot>) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(initial))
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string | boolean) => setD({ ...d, [k]: v })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!String(d.name).trim()) return
    setBusy(true)
    await onSave(fromDraft(d))
    setBusy(false)
  }
  return (
    <form className="stack" onSubmit={submit} style={{ marginTop: 10 }}>
      <div className="grid2">
        {TEXT_FIELDS.slice(0, 3).map(([k, label]) => (
          <label key={k} className="field" style={k === 'name' ? { gridColumn: '1 / -1' } : undefined}>
            <span className="lbl">{label}</span>
            <input className="input" value={String(d[k])} onChange={(e) => set(k, e.target.value)} required={k === 'name'} />
          </label>
        ))}
        <label className="field">
          <span className="lbl">Bloque</span>
          <select className="input" value={String(d.section)} onChange={(e) => set('section', e.target.value)}>
            {SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="lbl">Escalera</span>
          <select className="input" value={String(d.ladder)} onChange={(e) => set('ladder', e.target.value)}>
            <option value="">Ninguna</option>
            {Object.entries(LADDERS).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
          </select>
        </label>
        {NUM_FIELDS.map(([k, label]) => (
          <label key={k} className="field">
            <span className="lbl">{label}</span>
            <input className="input" inputMode="decimal" value={String(d[k])} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        {TEXT_FIELDS.slice(3).map(([k, label]) => (
          <label key={k} className="field" style={{ gridColumn: k === 'rpe' ? undefined : '1 / -1' }}>
            <span className="lbl">{label}</span>
            <input className="input" value={String(d[k])} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </div>
      <label className="row small"><input type="checkbox" checked={!!d.optional} onChange={(e) => set('optional', e.target.checked)} /> Opcional</label>
      <label className="row small"><input type="checkbox" checked={!!d.skipDeload} onChange={(e) => set('skipDeload', e.target.checked)} /> No se hace en la semana de descarga</label>
      <div className="row">
        <button className="btn primary grow" disabled={busy}>Guardar</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

function Recalibration() {
  const { store, slots, profile } = useApp()
  const [rows, setRows] = useState<SlotProgress[] | null>(null)
  useEffect(() => {
    store.listAllEntries().then((e) => setRows(blockProgress(slots, e, profile.blockStart)))
  }, [store, slots, profile.blockStart])
  if (!rows) return <p className="muted" role="status">Cargando…</p>
  const stuck = rows.filter((r) => r.stuck >= 3)
  return (
    <div className="stack">
      <div className="banner small">
        Al terminar cada mes (semanas 4 y 8): <strong>estancado</strong> = 3 sesiones con la misma prescripción → baja 5–10 % y reconstruye, o cambia el rango.
        Si subiste de nivel cada sesión, el salto puede ser mayor. Los básicos pesados deben quedar entre 75 % y 87 % de tu 1RM.
      </div>
      <p className="small">{stuck.length ? `${stuck.length} ejercicio(s) estancado(s).` : 'Nada estancado por ahora.'}</p>
      {[1, 2, 3, 4, 5, 6].map((day) => (
        <div key={day} className="stack" style={{ gap: 6 }}>
          <h3 className="section-title" style={{ margin: '8px 0 0' }}>{DAY_NAMES[day]}</h3>
          {rows.filter((r) => r.slot.day === day).map((r) => (
            <div key={r.slot.id} className="card small spread" style={{ padding: 10 }}>
              <div className="grow">
                <strong>{r.slot.name}</strong>
                <div className="muted">
                  {r.first ? `${formatPrescription(r.first)} → ` : ''}
                  {formatPrescription(prescriptionOf(r.slot))}
                </div>
              </div>
              <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                <span className="badge">{r.sessions} ses.</span>
                {r.levelUps > 0 && <span className="badge good">+{r.levelUps} nivel</span>}
                {r.stuck >= 3 && <span className="badge" style={{ color: 'var(--warn)', borderColor: 'currentColor' }}>estancado</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function PlanPage() {
  const { store, slots, reloadSlots } = useApp()
  const [tab, setTab] = useState<number | 'recal'>(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState<Section | null>(null)

  const day = typeof tab === 'number' ? tab : 1
  const daySlots = slots.filter((s) => s.active && s.day === day)

  async function move(slot: Slot, dir: -1 | 1) {
    const list = daySlots.filter((s) => s.section === slot.section)
    const i = list.findIndex((s) => s.id === slot.id)
    const other = list[i + dir]
    if (!other) return
    await store.updateSlot(slot.id, { position: other.position })
    await store.updateSlot(other.id, { position: slot.position })
    await reloadSlots()
  }

  async function remove(slot: Slot) {
    if (!confirm(`¿Quitar "${slot.name}" del plan? Su historial se conserva.`)) return
    await store.updateSlot(slot.id, { active: false })
    await reloadSlots()
  }

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Plan</h1>
        <p className="muted small" style={{ margin: 0 }}>Lo que te toca ahora en cada día. Cambia solo cuando guardas un ejercicio, o si lo editas aquí.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="Día">
        {[1, 2, 3, 4, 5, 6].map((d) => (
          <button key={d} role="tab" className="chip" aria-selected={tab === d} aria-pressed={tab === d} onClick={() => setTab(d)}>{SHORT[d]}</button>
        ))}
        <button role="tab" className="chip" aria-selected={tab === 'recal'} aria-pressed={tab === 'recal'} onClick={() => setTab('recal')}>Recalibración</button>
      </div>

      {tab === 'recal' ? (
        <Recalibration />
      ) : (
        <>
          <h2>{DAY_NAMES[day]} · <span className="muted">{DAY_TITLES[day]}</span></h2>
          {SECTIONS.map((sec) => (
            <section key={sec} className="stack" style={{ gap: 8 }}>
              <div className="spread">
                <h3 className="section-title" style={{ margin: '8px 0 0' }}>{SECTION_LABEL[sec]}</h3>
                <button className="btn ghost small" onClick={() => setAdding(sec)}>+ Añadir</button>
              </div>
              {adding === sec && (
                <div className="card">
                  <SlotEditor
                    initial={{ section: sec, sets: 3, target: 8, targetMin: 8, targetMax: 12, targetStep: 1, targetUnit: 'reps', loadUnit: 'kg', loadStep: 2.5, restS: 90, restMinS: 60, restMaxS: 120, restStepS: 15 }}
                    onCancel={() => setAdding(null)}
                    onSave={async (s) => {
                      const pos = Math.max(0, ...daySlots.map((x) => x.position)) + 1
                      await store.insertSlots([{ ...(s as Slot), day, position: pos, lift: null, active: true }])
                      await reloadSlots()
                      setAdding(null)
                    }}
                  />
                </div>
              )}
              {daySlots.filter((s) => s.section === sec).map((slot, i, list) => (
                <div key={slot.id} className="card">
                  <div className="spread">
                    <div className="grow">
                      <strong>{slot.name}</strong>
                      <div className="rx">{formatPrescription(prescriptionOf(slot))}</div>
                      <div className="small muted">
                        {[levelLabel(slot), formatRange(slot), slot.rpe ? `RPE ${slot.rpe}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <button className="btn ghost small" aria-label={`Subir ${slot.name}`} disabled={i === 0} onClick={() => move(slot, -1)}>↑</button>
                      <button className="btn ghost small" aria-label={`Bajar ${slot.name}`} disabled={i === list.length - 1} onClick={() => move(slot, 1)}>↓</button>
                    </div>
                  </div>
                  {editing === slot.id ? (
                    <SlotEditor
                      initial={slot}
                      onCancel={() => setEditing(null)}
                      onSave={async (s) => {
                        await store.updateSlot(slot.id, s)
                        await reloadSlots()
                        setEditing(null)
                      }}
                    />
                  ) : (
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn ghost small" onClick={() => setEditing(slot.id)}>Editar</button>
                      <button className="btn ghost small danger" onClick={() => remove(slot)}>Quitar</button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
