/** Semana de PR (plan v4 §10) y metas (§3). */

export interface Lift {
  key: string
  label: string
  unit: string // 'kg', '+kg', 's', 'reps', 'nivel', 'km/h'
  oneRM: boolean // test de 1RM con calentamiento calculado
}

export const LIFTS: Lift[] = [
  { key: 'sentadilla', label: 'Sentadilla', unit: 'kg', oneRM: true },
  { key: 'hip_thrust', label: 'Hip thrust', unit: 'kg', oneRM: true },
  { key: 'banca', label: 'Press banca', unit: 'kg', oneRM: true },
  { key: 'dominada_lastrada', label: 'Dominada lastrada', unit: '+kg', oneRM: true },
  { key: 'peso_muerto', label: 'Peso muerto', unit: 'kg', oneRM: true },
  { key: 'militar', label: 'Press militar', unit: 'kg', oneRM: true },
  { key: 'dominadas_max', label: 'Dominadas máx', unit: 'reps', oneRM: false },
  { key: 'oap_negativa', label: 'Negativa a 1 brazo', unit: 's', oneRM: false },
  { key: 'archer', label: 'Archer pull-ups', unit: 'reps/lado', oneRM: false },
  { key: 'gripper', label: 'Gripper 200 lb', unit: 'reps', oneRM: false },
  { key: 'dragon_flag', label: 'Dragon flag', unit: 'nivel', oneRM: false },
  { key: 'carrera', label: 'Carrera 10 min', unit: 'km/h', oneRM: false },
  { key: 'curl', label: 'Curl mancuerna 20 kg', unit: 'reps', oneRM: false },
]
export const liftByKey = (k: string) => LIFTS.find((l) => l.key === k)

/** Qué se testea cada día de la semana de PR (1 = lunes). */
export const PR_DAYS: Record<number, { title: string; lifts: string[]; note: string }> = {
  1: { title: 'Sentadilla + Hip thrust', lifts: ['sentadilla', 'hip_thrust'], note: 'Opcional: pantorrilla 2×12 · leg raise 2×10' },
  2: { title: 'Banca + Dominada lastrada', lifts: ['banca', 'dominada_lastrada'], note: 'Opcional: curl martillo 2×10 · hollow 2×30 s' },
  3: { title: 'Descanso activo', lifts: [], note: 'Caminata de 20–30 min y movilidad de cadera y hombro.' },
  4: { title: 'Peso muerto', lifts: ['peso_muerto'], note: 'Magnesio y tu agarre habitual. Opcional: aductores 2×10' },
  5: { title: 'Press militar + Dominadas máx', lifts: ['militar', 'dominadas_max'], note: 'Dominadas: 1 serie estricta, brazos extendidos → barbilla sobre la barra.' },
  6: {
    title: 'Tests de habilidad (en este orden)',
    lifts: ['oap_negativa', 'archer', 'gripper', 'dragon_flag', 'carrera'],
    note: 'Negativa: 1 intento por brazo · Gripper: 3 intentos, 3 min de descanso, solo cierres completos · Carrera: 10 min a la velocidad más alta que sostengas.',
  },
}

const r25 = (n: number) => Math.round(n / 2.5) * 2.5

export interface PrPlan {
  warmup: string
  attempts: [string, string, string]
}

/** Calentamiento e intentos a partir del 1RM estimado. */
export function prPlan(liftKey: string, est: number): PrPlan {
  if (liftKey === 'dominada_lastrada') {
    return {
      warmup: `sin peso×5 · +${r25(est * 0.3)}×3 · +${r25(est * 0.6)}×1 · +${r25(est * 0.8)}×1`,
      attempts: [`+${r25(est * 0.93)}`, `+${r25(est * 1.07)}`, `+${r25(est * 1.14)}`],
    }
  }
  if (liftKey === 'hip_thrust') {
    return {
      warmup: `${r25(est * 0.3)}×8 · ${r25(est * 0.5)}×5 · ${r25(est * 0.7)}×3 · ${r25(est * 0.85)}×1`,
      attempts: [`${r25(est * 0.925)}`, `${r25(est * 1.01)}–${r25(est * 1.025)}`, `${r25(est * 1.05)}–${r25(est * 1.075)}`],
    }
  }
  return {
    warmup: `barra×10 · ${r25(est * 0.5)}×5 · ${r25(est * 0.65)}×3 · ${r25(est * 0.8)}×2 · ${r25(est * 0.88)}×1`,
    attempts: [`${r25(est * 0.94)}`, `${r25(est * 1.01)}–${r25(est * 1.03)}`, `${r25(est * 1.05)}–${r25(est * 1.08)}`],
  }
}

export interface Goal {
  label: string
  lift: string
  weight?: number
  reps: number
  /** 1RM que pide la meta (para la barra de progreso). */
  needed?: number
  milestones: string
  horizon: string
}

export const GOALS: Goal[] = [
  { label: 'One arm pull-up ×1', lift: 'oap_negativa', reps: 1, milestones: 'negativa 5 s → 10 s → asistida con toalla ×3', horizon: '6–12 meses' },
  { label: 'Dragon flag', lift: 'dragon_flag', reps: 1, milestones: 'nivel 5 = el primero · ×5 · ×20 dominado', horizon: '3–6 meses' },
  { label: 'Gripper 200 lb ×20', lift: 'gripper', reps: 20, milestones: '×3 → ×5 → ×10 → ×20', horizon: '1.5–3 años' },
  { label: 'Press militar 70 ×5', lift: 'militar', weight: 70, reps: 5, needed: 80, milestones: '60×5 → 65×5', horizon: '9–18 meses' },
  { label: 'Hip thrust 200 ×10', lift: 'hip_thrust', weight: 200, reps: 10, needed: 265, milestones: '160×10 → 180×10', horizon: '1.5–2.5 años' },
  { label: 'Press banca 100 ×10', lift: 'banca', weight: 100, reps: 10, needed: 130, milestones: '80×10 → 90×10', horizon: '2–3 años' },
  { label: 'Peso muerto 150 ×10', lift: 'peso_muerto', weight: 150, reps: 10, needed: 195, milestones: '120×10 → 135×10', horizon: '2–3 años' },
  { label: 'Sentadilla 120 ×20', lift: 'sentadilla', weight: 120, reps: 20, needed: 185, milestones: '100×10 → 100×20 → 120×10', horizon: '2–4 años' },
  { label: 'Correr 20 km/h ×10 min', lift: 'carrera', reps: 1, milestones: '15 → 16 → 17 → 18 km/h ×10 min', horizon: '2+ años' },
]
