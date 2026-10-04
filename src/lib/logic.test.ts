import { describe, expect, it } from 'vitest'
import { deloadTemplateDay, phaseOf, weekIndex, weekday } from './calendar'
import { entryAsNote, formatPrescription, formatRest } from './format'
import { applyDecision, deloadPrescription, estimate1RM, suggestDecision } from './progression'
import { prPlan } from './prweek'
import { SEED_SLOTS } from './seed'
import { prescriptionOf } from './session'
import { localStore } from './store'
import type { Prescription, SetLog } from './types'

const squat = prescriptionOf({ ...SEED_SLOTS.find((s) => s.name === 'Sentadilla')!, id: 'x' })
const sets = (n: number, value: number, rpe: number | null = 7): SetLog[] =>
  Array.from({ length: n }, () => ({ value, load: null, rpe, done: true }))

describe('progresión por niveles', () => {
  it('sentadilla arranca como dice el plan', () => {
    expect(formatPrescription(squat)).toBe('100 kg · 4×5 · 3 min')
  })

  it('subir nivel sube el peso y vuelve a lo más fácil', () => {
    const p: Prescription = { ...squat, target: 6, restS: 180 }
    const n = applyDecision(p, 'subir_nivel')
    expect(n.load).toBe(105)
    expect(n.target).toBe(4)
    expect(n.restS).toBe(240)
  })

  it('± reps, ± descanso y ± peso', () => {
    expect(applyDecision(squat, 'mas_reps').target).toBe(6)
    expect(applyDecision(squat, 'menos_descanso').restS).toBe(150)
    expect(applyDecision(squat, 'mas_descanso').restS).toBe(210)
    expect(applyDecision(squat, 'menos_peso').load).toBe(95)
  })

  it('en una escalera subir nivel cambia de nivel y de rango', () => {
    const oap = prescriptionOf({ ...SEED_SLOTS.find((s) => s.ladder === 'oap')!, id: 'x' })
    const n = applyDecision({ ...oap, target: 5 }, 'subir_nivel')
    expect(n.level).toBe(2)
    expect(n.targetMin).toBe(8)
    expect(n.target).toBe(8)
    expect(n.load).toBeNull()
  })

  it('sugiere +reps, luego −descanso, luego subir nivel', () => {
    expect(suggestDecision(squat, sets(4, 5))).toBe('mas_reps')
    const top = { ...squat, target: 6, restS: 240 }
    expect(suggestDecision(top, sets(4, 6))).toBe('menos_descanso')
    expect(suggestDecision({ ...top, restS: 180 }, sets(4, 6))).toBe('subir_nivel')
  })

  it('sugiere mantener si faltan reps o el RPE pasó de 8', () => {
    expect(suggestDecision(squat, [...sets(3, 5), { value: 4, load: null, rpe: 8, done: true }])).toBe('mantener')
    expect(suggestDecision(squat, sets(4, 5, 9))).toBe('mantener')
    expect(suggestDecision(squat, sets(2, 5))).toBe('mantener')
  })

  it('descarga: 2 series al 65 % redondeado abajo', () => {
    const d = deloadPrescription(squat)
    expect(d.sets).toBe(2)
    expect(d.load).toBe(65)
    const run = prescriptionOf({ ...SEED_SLOTS.find((s) => s.loadUnit === 'km/h')!, id: 'x' })
    expect(deloadPrescription(run).load).toBe(run.load)
  })
})

describe('calendario', () => {
  it('5 oct 2026 es la semana 1; 30 nov la 9; 7 dic la 10', () => {
    expect(weekIndex('2026-10-05', '2026-10-05')).toBe(1)
    expect(weekIndex('2026-10-05', '2026-10-10')).toBe(1)
    expect(weekIndex('2026-10-05', '2026-11-30')).toBe(9)
    expect(phaseOf(weekIndex('2026-10-05', '2026-12-07'))).toBe('pr')
    expect(phaseOf(weekIndex('2026-10-05', '2026-10-04'))).toBe('antes')
  })
  it('días y descarga', () => {
    expect(weekday('2026-10-04')).toBe(7)
    expect(weekday('2026-10-05')).toBe(1)
    expect(deloadTemplateDay(4)).toBe(3)
    expect(deloadTemplateDay(3)).toBeNull()
  })
})

describe('formato', () => {
  it('descansos como en tus notas', () => {
    expect(formatRest(90)).toBe('90 s')
    expect(formatRest(60)).toBe('60 s')
    expect(formatRest(150)).toBe('2:30 min')
    expect(formatRest(120)).toBe('2 min')
  })
  it('línea de nota', () => {
    const line = entryAsNote({
      id: '1', sessionId: 's', slotId: null, name: 'Sentadilla', section: 'principal', position: 1,
      prescribed: squat, sets: [8, 7, 6, 6].map((v) => ({ value: v, load: 100, rpe: 7, done: true })),
      decision: 'mantener', next: null, note: 'pesado', skipped: false,
    })
    expect(line).toBe('Sentadilla | 100kg | 4×(8-7-6-6) | 3min | RPE 7-7-7-7 (mantener · pesado)')
  })
})

describe('PRs', () => {
  it('1RM estimado y tabla de intentos', () => {
    expect(estimate1RM(100, 5, 8)).toBeCloseTo(123.3, 1)
    expect(prPlan('sentadilla', 125).attempts[0]).toBe('117.5')
  })
})

describe('store local', () => {
  it('guarda y recupera historial por slot', async () => {
    const mem = new Map<string, string>()
    const store = localStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) })
    await store.insertSlots(SEED_SLOTS.slice(0, 1))
    const [slot] = await store.listSlots()
    const s = await store.createSession({ date: '2026-10-05', day: 1, week: 1, kind: 'normal' })
    const e = await store.upsertEntry({
      sessionId: s.id, slotId: slot.id, name: slot.name, section: slot.section, position: 1,
      prescribed: prescriptionOf(slot), sets: sets(4, 5), decision: 'mas_reps', next: null, note: null, skipped: false,
    })
    await store.upsertEntry({ ...e, id: undefined, note: 'editado' })
    const h = await store.history(slot.id, slot.name, 10)
    expect(h).toHaveLength(1)
    expect(h[0].note).toBe('editado')
    expect(h[0].date).toBe('2026-10-05')
  })
})
