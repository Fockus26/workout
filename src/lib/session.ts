import { deloadPrescription, estimate1RM, samePrescription } from './progression'
import type { Entry, Prescription, RecordRow, Session, SessionKind, Slot } from './types'

export function prescriptionOf(s: Slot | Prescription): Prescription {
  return {
    load: s.load, loadUnit: s.loadUnit, loadStep: s.loadStep, sets: s.sets, target: s.target,
    targetUnit: s.targetUnit, targetMin: s.targetMin, targetMax: s.targetMax, targetStep: s.targetStep,
    restS: s.restS, restMinS: s.restMinS, restMaxS: s.restMaxS, restStepS: s.restStepS,
    level: s.level, ladder: s.ladder,
  }
}

/** Lo que toca hoy para un slot según el tipo de semana (null = no se hace). */
export function todaysPrescription(slot: Slot, kind: SessionKind): Prescription | null {
  if (kind === 'descarga') return slot.deload === 'skip' ? null : deloadPrescription(prescriptionOf(slot))
  return prescriptionOf(slot)
}

/** Mejor 1RM conocido por básico: PRs registrados + estimado de las series de los últimos 60 días. */
export function estimatedMaxes(records: RecordRow[], entries: Entry[], slots: Slot[], today: string): Record<string, number> {
  const out: Record<string, number> = {}
  const bump = (k: string, v: number) => {
    if (!(k in out) || v > out[k]) out[k] = v
  }
  for (const r of records) {
    if (r.unit === 'kg' || r.unit === '+kg') bump(r.lift, r.reps > 1 ? estimate1RM(r.value, r.reps, 10) : r.value)
  }
  const liftOf = new Map(slots.map((s) => [s.id, s.lift]))
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 60)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  for (const e of entries) {
    const lift = e.slotId ? liftOf.get(e.slotId) : null
    if (!lift || !e.date || e.date < cutoffISO) continue
    if (!e.prescribed.loadUnit || !/kg/.test(e.prescribed.loadUnit)) continue
    for (const s of e.sets) {
      const load = s.load ?? e.prescribed.load
      if (!s.done || load == null || s.value == null || s.value > 12) continue
      bump(lift, estimate1RM(load, s.value, s.rpe))
    }
  }
  return out
}

export interface SlotProgress {
  slot: Slot
  first: Prescription | null
  sessions: number
  /** Sesiones seguidas al final con la misma prescripción. */
  stuck: number
  levelUps: number
}

/** Para la recalibración: cuánto avanzó cada ejercicio en el bloque y si está estancado. */
export function blockProgress(slots: Slot[], entries: Entry[], blockStart: string): SlotProgress[] {
  return slots
    .filter((s) => s.active)
    .map((slot) => {
      const list = entries
        .filter((e) => e.slotId === slot.id && !e.skipped && (e.date ?? '') >= blockStart)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      let stuck = 0
      for (let i = list.length - 1; i >= 0; i--) {
        if (samePrescription(list[i].prescribed, list[list.length - 1].prescribed)) stuck++
        else break
      }
      return {
        slot,
        first: list[0]?.prescribed ?? null,
        sessions: list.length,
        stuck: list.length ? stuck : 0,
        levelUps: list.filter((e) => e.decision === 'subir_nivel').length,
      }
    })
}

/** Dos sesiones terminadas seguidas con "decaído" → bajar 5 % esta semana (§4). */
export function needsAutoregulation(sessions: Session[]): boolean {
  const done = sessions.filter((s) => s.finishedAt).sort((a, b) => b.date.localeCompare(a.date))
  return done.length >= 2 && done[0].feeling === 'decaido' && done[1].feeling === 'decaido'
}
