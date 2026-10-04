import { ladderLevel } from './ladders'
import type { RecordRow, Section, Slot } from './types'

export type SeedSlot = Omit<Slot, 'id'>

type Opt = Partial<Omit<SeedSlot, 'day' | 'section' | 'name' | 'position'>> & {
  /** atajo: [carga, unidad, salto] */
  kg?: [number, string?, number?]
  /** atajo: series × objetivo (mín–máx) */
  vol: [sets: number, target: number, min: number, max: number, unit?: string]
  /** atajo: descanso en s (mín–máx) */
  rest?: [rest: number, min: number, max: number]
}

const out: SeedSlot[] = []
const pos: Record<string, number> = {}

function s(day: number, section: Section, name: string, o: Opt) {
  const key = `${day}`
  pos[key] = (pos[key] ?? 0) + 1
  const [sets, target, tMin, tMax, tUnit] = o.vol
  const [rest, rMin, rMax] = o.rest ?? [null, null, null]
  const level = o.level ?? null
  const def = ladderLevel(o.ladder ?? null, level)
  out.push({
    day,
    section,
    name,
    position: pos[key],
    load: o.kg ? o.kg[0] : null,
    loadUnit: o.kg ? (o.kg[1] ?? 'kg') : null,
    loadStep: o.kg ? (o.kg[2] ?? 2.5) : null,
    sets,
    target,
    targetUnit: def?.targetUnit ?? tUnit ?? 'reps',
    targetMin: tMin,
    targetMax: tMax,
    targetStep: o.targetStep ?? 1,
    restS: rest,
    restMinS: rMin,
    restMaxS: rMax,
    restStepS: o.restStepS ?? (rest != null && rest >= 120 ? 30 : 15),
    level,
    ladder: o.ladder ?? null,
    lift: o.lift ?? null,
    rpe: o.rpe ?? null,
    notes: o.notes ?? null,
    deload: o.deload ?? 'normal',
    deloadAlt: o.deloadAlt ?? null,
    optional: o.optional ?? false,
    active: true,
  })
}

const KG = 'kg'
const CU = 'kg c/u'
const KMH = 'km/h'

// ── Lunes — Inferior A (sentadilla pesada)
s(1, 'principal', 'Sentadilla', { kg: [100, KG, 5], vol: [4, 5, 4, 6], rest: [180, 180, 240], rpe: '8', lift: 'sentadilla' })
s(1, 'principal', 'Hip thrust pesado', { kg: [150, KG, 10], vol: [3, 6, 6, 8], rest: [180, 120, 180], rpe: '8', lift: 'hip_thrust' })
s(1, 'principal', 'Peso muerto rumano', { kg: [100, KG, 5], vol: [3, 8, 8, 10], rest: [150, 120, 180], rpe: '7' })
s(1, 'principal', 'Búlgara', { kg: [17.5, CU, 2.5], vol: [3, 8, 8, 10, 'reps/pierna'], rest: [120, 90, 120], rpe: '7-8' })
s(1, 'principal', 'Pantorrilla', { kg: [50, KG, 5], vol: [3, 12, 12, 15], rest: [60, 60, 60], rpe: '8' })
s(1, 'abdomen', 'Leg raise colgado', { ladder: 'leg_raise', level: 3, vol: [3, 8, 8, 12], rest: [90, 60, 90], rpe: '8' })
s(1, 'antebrazo', 'Farmer carry', { kg: [50, CU, 5], vol: [3, 1.5, 1.5, 2.5, 'vueltas'], targetStep: 0.5, rest: [90, 90, 90] })
s(1, 'cardio', 'Trote suave', { kg: [10, KMH, 0.5], vol: [1, 8, 8, 10, 'min'], optional: true, rpe: '5' })

// ── Martes — Superior A (banca pesada)
s(2, 'principal', 'Press banca', { kg: [87.5, KG, 2.5], vol: [4, 4, 4, 6], rest: [240, 180, 240], rpe: '8', lift: 'banca' })
s(2, 'principal', 'Press militar mancuernas', { kg: [20, CU, 2.5], vol: [3, 8, 8, 10], rest: [120, 90, 120], rpe: '7-8' })
s(2, 'principal', 'Remo con barra', { kg: [50, KG, 5], vol: [4, 8, 8, 10], rest: [120, 90, 120], rpe: '7-8' })
s(2, 'principal', 'Fondos lastrados', { kg: [32.5, KG, 2.5], vol: [3, 6, 6, 8], rest: [150, 120, 150], rpe: '8' })
s(2, 'principal', 'Curl martillo', { kg: [12, CU, 2], vol: [3, 9, 8, 10], rest: [90, 90, 90], rpe: '7-8' })
s(2, 'abdomen', 'Dragon flag', { ladder: 'dragon_flag', level: 1, vol: [3, 3, 3, 5], rest: [120, 90, 120], rpe: '8', deload: 'skip', deloadAlt: 'Hollow body 2×20 s', lift: 'dragon_flag' })
s(2, 'antebrazo', 'Gripper 200 lb — intentos de cierre', { vol: [5, 1, 1, 3, 'reps/mano'], rest: [120, 120, 120], notes: 'Progresión: 5×1 → 4×2 → 3×3 → 3×4 → 3×5 (ajusta las series con Personalizar).', deload: 'skip', deloadAlt: 'Sin gripper pesado esta semana', lift: 'gripper' })
s(2, 'antebrazo', 'Gripper 200 lb — holds', { vol: [3, 10, 10, 20, 's/mano'], targetStep: 5, rest: [90, 90, 90], notes: 'Cierra con las dos manos y sostén cerrado con una. Al llegar a 20 s añade 3 negativas lentas (5 s) por mano.', deload: 'skip', deloadAlt: 'Sin gripper pesado esta semana' })
s(2, 'cardio', 'Intervalos cortos', { kg: [17, KMH, 0.5], vol: [1, 6, 6, 10, 'intervalos de 1 min'], rest: [60, 60, 60], rpe: '8', notes: 'Recuperación caminando.', deload: 'skip', deloadAlt: 'Trote suave 10 min' })

// ── Miércoles — Inferior B (peso muerto pesado)
s(3, 'principal', 'Peso muerto', { kg: [120, KG, 5], vol: [4, 4, 3, 5], rest: [180, 180, 240], rpe: '8-9', lift: 'peso_muerto' })
s(3, 'principal', 'Hip thrust moderado', { kg: [130, KG, 10], vol: [3, 8, 8, 10], rest: [180, 120, 180], rpe: '7', lift: 'hip_thrust' })
s(3, 'principal', 'Sentadilla frontal', { kg: [80, KG, 5], vol: [3, 8, 6, 8], rest: [180, 120, 180], rpe: '7' })
s(3, 'principal', 'Aductores', { kg: [50, KG, 5], vol: [3, 8, 8, 12], rest: [60, 60, 60], rpe: '7' })
s(3, 'abdomen', 'Hip flexor raise con banda', { vol: [3, 12, 12, 15, 'reps/lado'], rest: [60, 60, 60], rpe: '7', notes: 'Banda negra ligera. Al hacer 3×15 → banda más gruesa.' })
s(3, 'abdomen', 'Hold semi leg raise', { vol: [3, 30, 25, 40, 's'], targetStep: 5, rest: [60, 60, 60] })
s(3, 'antebrazo', 'Suitcase carry', { kg: [25, KG, 5], vol: [3, 1, 1, 2, 'idas/lado'], targetStep: 0.25, rest: [90, 90, 90] })
s(3, 'cardio', 'Trote suave', { kg: [10, KMH, 0.5], vol: [1, 8, 8, 10, 'min'], optional: true, rpe: '5' })

// ── Jueves — Superior B (militar pesado + one arm)
s(4, 'principal', 'One arm pull-up', { ladder: 'oap', level: 1, vol: [3, 2, 2, 5], rest: [120, 120, 120], notes: '2 negativas por brazo en cada serie. Al inicio, fresco. Dolor en el codo interno → bajar nivel 1 semana.', deload: 'skip', deloadAlt: 'Sin negativas esta semana', lift: 'oap_negativa' })
s(4, 'principal', 'Press militar', { kg: [57.5, KG, 2.5], vol: [4, 5, 4, 6], rest: [180, 180, 240], rpe: '8', lift: 'militar' })
s(4, 'principal', 'Dominada lastrada', { kg: [22.5, KG, 2.5], vol: [4, 4, 4, 6], rest: [180, 120, 180], rpe: '8', lift: 'dominada_lastrada' })
s(4, 'principal', 'Press banca cerrado', { kg: [72.5, KG, 2.5], vol: [3, 6, 6, 8], rest: [180, 120, 180], rpe: '7-8' })
s(4, 'principal', 'Face pulls', { kg: [30, KG, 2.5], vol: [3, 15, 12, 15], rest: [60, 60, 60], rpe: '7' })
s(4, 'principal', 'Bíceps + tríceps polea', { kg: [40, KG, 5], vol: [3, 10, 8, 10], rest: [90, 90, 90], rpe: '8', notes: 'Superserie. Tríceps 45 kg.' })
s(4, 'abdomen', 'Crunch en polea', { kg: [55, KG, 5], vol: [4, 10, 8, 10], rest: [120, 90, 120], rpe: '8' })
s(4, 'antebrazo', 'One arm dead hang', { kg: [10, KG, 2.5], vol: [3, 30, 20, 40, 's/brazo'], targetStep: 5, rest: [90, 90, 90] })
s(4, 'cardio', 'Tempo continuo', { kg: [15, KMH, 0.5], vol: [1, 6, 6, 10, 'min'], rpe: '8', deload: 'skip', deloadAlt: 'Trote suave 10 min' })

// ── Viernes — Inferior C (volumen)
s(5, 'principal', 'Sentadilla volumen', { kg: [95, KG, 5], vol: [3, 8, 8, 12], rest: [180, 120, 180], rpe: '7', lift: 'sentadilla' })
s(5, 'principal', 'Hip thrust volumen', { kg: [130, KG, 10], vol: [3, 10, 10, 15], rest: [180, 120, 180], rpe: '7', lift: 'hip_thrust' })
s(5, 'principal', 'Peso muerto volumen', { kg: [85, KG, 5], vol: [3, 8, 8, 10], rest: [180, 120, 180], rpe: '6-7', lift: 'peso_muerto' })
s(5, 'abdomen', 'Leg raise colgado', { ladder: 'leg_raise', level: 3, vol: [3, 10, 8, 12], rest: [90, 60, 90], rpe: '8' })
s(5, 'antebrazo', 'Wrist curl / reverse', { kg: [10, KG, 2.5], vol: [3, 15, 15, 20], rest: [60, 60, 60], rpe: '8', notes: 'Reverse con 5 kg.' })
s(5, 'antebrazo', 'Gripper 200 lb — cierres asistidos', { vol: [3, 3, 3, 6, 'reps/mano'], rest: [90, 90, 90], notes: 'Pre-cierra con la otra mano hasta ~1 cm y termina con una. Al hacer 3×6, pre-cierra menos.', deload: 'skip', deloadAlt: 'Sin gripper esta semana' })
s(5, 'antebrazo', 'Extensión de dedos con banda', { vol: [2, 20, 20, 30], rest: [30, 30, 30] })
s(5, 'cardio', 'Trote suave', { kg: [10, KMH, 0.5], vol: [1, 10, 10, 12, 'min'], rpe: '5' })

// ── Sábado — Superior C (volumen + one arm)
s(6, 'principal', 'Archer pull-ups', { ladder: 'archer', level: 1, vol: [3, 6, 6, 8], rest: [120, 120, 180], rpe: '7', lift: 'archer' })
s(6, 'principal', 'Press banca volumen', { kg: [80, KG, 2.5], vol: [3, 8, 8, 12], rest: [120, 120, 180], rpe: '7', lift: 'banca' })
s(6, 'principal', 'Press militar volumen', { kg: [45, KG, 2.5], vol: [3, 8, 8, 12], rest: [120, 120, 180], rpe: '7', lift: 'militar' })
s(6, 'principal', 'Zottman curl', { kg: [8, CU, 2], vol: [3, 12, 10, 15], rest: [90, 90, 90], rpe: '7' })
s(6, 'abdomen', 'Ab wheel', { ladder: 'ab_wheel', level: 1, vol: [3, 8, 8, 10], rest: [120, 120, 120], rpe: '8', notes: '3 casillas. Añade casillas solo si la espalda baja no se arquea.' })
s(6, 'abdomen', 'Dragon flag — hold tuck arriba', { vol: [3, 10, 10, 20, 's'], targetStep: 5, rest: [90, 90, 90], deload: 'skip', deloadAlt: 'Hollow body 2×20 s' })
s(6, 'antebrazo', 'Pinza', { kg: [15, KG, 5], vol: [3, 20, 20, 30, 's'], targetStep: 5, rest: [60, 60, 60], notes: 'Al pasar de 30 s, disco más pesado.' })
s(6, 'cardio', 'Intervalos largos', { kg: [16, KMH, 0.5], vol: [1, 3, 3, 5, 'intervalos de 3 min'], rest: [120, 120, 120], rpe: '8', notes: 'Recuperación: trote suave.', deload: 'skip', deloadAlt: 'Trote suave 10 min' })

export const SEED_SLOTS: SeedSlot[] = out

/** PRs conocidos (plan v3 y semana de PR del 28 sep – 3 oct 2026). */
export const SEED_RECORDS: Omit<RecordRow, 'id'>[] = [
  { date: '2026-09-21', lift: 'sentadilla', value: 110, unit: 'kg', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'hip_thrust', value: 160, unit: 'kg', reps: 3, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'banca', value: 90, unit: 'kg', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'peso_muerto', value: 115, unit: 'kg', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'militar', value: 60, unit: 'kg', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'dominada_lastrada', value: 35, unit: '+kg', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-21', lift: 'dominadas_max', value: 25, unit: 'reps', reps: 1, notes: 'PR anterior' },
  { date: '2026-09-28', lift: 'sentadilla', value: 125, unit: 'kg', reps: 1, notes: null },
  { date: '2026-09-28', lift: 'hip_thrust', value: 200, unit: 'kg', reps: 1, notes: null },
  { date: '2026-09-29', lift: 'banca', value: 100, unit: 'kg', reps: 1, notes: null },
  { date: '2026-10-01', lift: 'oap_negativa', value: 1, unit: 's', reps: 1, notes: null },
  { date: '2026-10-01', lift: 'archer', value: 8, unit: 'reps/lado', reps: 1, notes: 'barbilla hasta la muñeca' },
  { date: '2026-10-01', lift: 'curl', value: 1, unit: 'reps', reps: 1, notes: '20 kg ×1 · 15 kg ×8' },
  { date: '2026-10-01', lift: 'carrera', value: 15, unit: 'km/h', reps: 1, notes: '5 min a 15 km/h + 2 min a 17 km/h · antes 14 km/h ×10 min' },
  { date: '2026-10-02', lift: 'peso_muerto', value: 140, unit: 'kg', reps: 1, notes: null },
  { date: '2026-10-03', lift: 'militar', value: 65, unit: 'kg', reps: 1, notes: null },
  { date: '2026-10-03', lift: 'dominadas_max', value: 20, unit: 'reps', reps: 1, notes: 'tras la semana de tests' },
  { date: '2026-10-03', lift: 'gripper', value: 1, unit: 'reps', reps: 1, notes: null },
  { date: '2026-10-03', lift: 'dragon_flag', value: 1, unit: 'nivel', reps: 1, notes: 'negativas con rodillas' },
]

export const DEFAULT_BLOCK_START = '2026-10-05'
