import { ladderLevel, ladderMax } from './ladders'
import { floorLoad, nextLoad } from './weights'
import type { Decision, Prescription, SetLog } from './types'

export const DECISION_LABEL: Record<Decision, string> = {
  mantener: 'Mantener',
  mas_reps: '+ reps',
  menos_reps: '− reps',
  menos_descanso: '− descanso',
  mas_descanso: '+ descanso',
  mas_peso: '+ peso',
  menos_peso: '− peso',
  subir_nivel: 'Subir nivel',
  bajar_nivel: 'Bajar nivel',
  personalizado: 'Personalizar',
}

const round = (n: number, step = 0.25) => Math.round(n / step) * step
const isLadder = (p: Prescription) => p.ladder != null && p.level != null

/** Vuelve a lo más fácil del nivel: reps al mínimo, descanso al máximo. */
function resetToEasiest(p: Prescription): Prescription {
  return {
    ...p,
    target: p.targetMin ?? p.target,
    restS: p.restMaxS ?? p.restS,
  }
}

function withLadderLevel(p: Prescription, level: number): Prescription {
  const def = ladderLevel(p.ladder, level)
  return {
    ...p,
    level,
    targetUnit: def?.targetUnit ?? p.targetUnit,
    targetMin: def?.targetMin ?? p.targetMin,
    targetMax: def?.targetMax ?? p.targetMax,
  }
}

/** Siguiente prescripción según la decisión. Siempre se calcula desde lo prescrito (idempotente). */
export function applyDecision(p: Prescription, d: Decision): Prescription {
  const step = p.targetStep || 1
  const restStep = p.restStepS || 15
  const loadStep = p.loadStep ?? 2.5
  switch (d) {
    case 'mantener':
    case 'personalizado':
      return { ...p }
    case 'mas_reps':
      return { ...p, target: round(p.target + step) }
    case 'menos_reps':
      return { ...p, target: Math.max(step, round(p.target - step)) }
    case 'menos_descanso':
      return p.restS == null ? { ...p } : { ...p, restS: Math.max(15, p.restS - restStep) }
    case 'mas_descanso':
      return p.restS == null ? { ...p } : { ...p, restS: p.restS + restStep }
    case 'mas_peso':
      return p.load == null ? { ...p } : { ...p, load: nextLoad(p.load, p.loadUnit, loadStep, 1) }
    case 'menos_peso':
      return p.load == null ? { ...p } : { ...p, load: nextLoad(p.load, p.loadUnit, loadStep, -1) }
    case 'subir_nivel':
      if (isLadder(p)) {
        const lvl = Math.min(ladderMax(p.ladder), (p.level ?? 1) + 1)
        return resetToEasiest(withLadderLevel(p, lvl))
      }
      return resetToEasiest(p.load == null ? { ...p } : { ...p, load: nextLoad(p.load, p.loadUnit, loadStep, 1) })
    case 'bajar_nivel':
      if (isLadder(p)) {
        const lvl = Math.max(1, (p.level ?? 1) - 1)
        return resetToEasiest(withLadderLevel(p, lvl))
      }
      return resetToEasiest(p.load == null ? { ...p } : { ...p, load: nextLoad(p.load, p.loadUnit, loadStep, -1) })
  }
}

/** Decisiones que tienen sentido para este ejercicio (sin peso no hay ±peso, etc.). */
export function availableDecisions(p: Prescription): Decision[] {
  const out: Decision[] = ['mantener', 'mas_reps', 'menos_reps']
  if (p.restS != null) out.push('menos_descanso', 'mas_descanso')
  if (p.load != null) out.push('mas_peso', 'menos_peso')
  out.push('subir_nivel')
  if (isLadder(p)) out.push('bajar_nivel')
  out.push('personalizado')
  return out
}

/**
 * Sugerencia del plan (§4): si todas las series salieron y ninguna pasó de RPE 8 →
 * primero + reps hasta el tope, luego − descanso hasta el mínimo, luego subir nivel.
 * Si faltaron reps o alguna serie pasó de RPE 8 → mantener.
 */
export function suggestDecision(p: Prescription, sets: SetLog[]): Decision {
  const done = sets.filter((s) => s.done)
  if (done.length < p.sets) return 'mantener'
  const missed = done.some((s) => s.value != null && s.value < p.target)
  const rpes = done.map((s) => s.rpe).filter((r): r is number => r != null)
  const maxRpe = rpes.length ? Math.max(...rpes) : null
  if (missed || (maxRpe != null && maxRpe > 8)) return 'mantener'
  if (p.targetMax != null && p.target < p.targetMax) return 'mas_reps'
  if (p.restS != null && p.restMinS != null && p.restS > p.restMinS) return 'menos_descanso'
  if (isLadder(p) && (p.level ?? 1) >= ladderMax(p.ladder)) return 'mas_reps'
  return 'subir_nivel'
}

/** Descarga (§9): 2 series, ~65 % del peso (redondeado abajo a un peso que exista), reps al mínimo. */
export function deloadPrescription(p: Prescription): Prescription {
  const scalesLoad = p.load != null && p.loadUnit != null && /kg|lb/.test(p.loadUnit)
  return {
    ...p,
    sets: Math.min(2, p.sets),
    load: scalesLoad ? floorLoad(p.load! * 0.65, p.loadUnit, p.loadStep ?? 5) : p.load,
    target: p.targetMin ?? p.target,
  }
}

/** 1RM estimado (Epley con reps en reserva): carga × (1 + (reps + (10 − RPE)) / 30). */
export function estimate1RM(load: number, reps: number, rpe: number | null): number {
  const rir = rpe == null ? 0 : Math.max(0, 10 - rpe)
  const total = reps + rir
  if (total <= 1) return load
  return load * (1 + total / 30)
}

export const samePrescription = (a: Prescription, b: Prescription) =>
  a.load === b.load && a.sets === b.sets && a.target === b.target && a.restS === b.restS && a.level === b.level
