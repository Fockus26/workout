export type Section = 'principal' | 'abdomen' | 'antebrazo' | 'cardio'
export const SECTIONS: Section[] = ['principal', 'abdomen', 'antebrazo', 'cardio']
export const SECTION_LABEL: Record<Section, string> = {
  principal: 'Principal',
  abdomen: 'Abdomen',
  antebrazo: 'Antebrazo',
  cardio: 'Cardio',
}

/** Lo que hay que hacer en un ejercicio. Vive en el slot y se copia en cada registro. */
export interface Prescription {
  load: number | null
  loadUnit: string | null // 'kg', 'kg c/u', 'km/h', 'lb'
  loadStep: number | null
  sets: number
  target: number // reps, segundos, vueltas, minutos, intervalos…
  targetUnit: string // 'reps', 'reps/pierna', 's', 's/brazo', 'vueltas', 'min', 'intervalos de 1 min'
  targetMin: number | null
  targetMax: number | null
  targetStep: number
  restS: number | null
  restMinS: number | null
  restMaxS: number | null
  restStepS: number
  level: number | null
  ladder: string | null
}

/** 'skip' = no se hace en descarga (se muestra deloadAlt); 'normal' = 2 series al 65 %. */
export type DeloadMode = 'normal' | 'skip'

export interface Slot extends Prescription {
  id: string
  day: number // 1 = lunes … 6 = sábado
  section: Section
  position: number
  name: string
  lift: string | null // clave del básico para PRs y 1RM estimado
  rpe: string | null
  notes: string | null
  deload: DeloadMode
  deloadAlt: string | null
  optional: boolean
  active: boolean
}

export type SessionKind = 'normal' | 'descarga' | 'pr'
export type Feeling = 'bien' | 'normal' | 'decaido'

export interface Session {
  id: string
  date: string // YYYY-MM-DD
  day: number
  week: number | null
  kind: SessionKind
  feeling: Feeling | null
  notes: string | null
  startedAt: string
  finishedAt: string | null
}

export interface SetLog {
  value: number | null // reps, segundos, vueltas o minutos hechos
  load: number | null
  rpe: number | null
  done: boolean
}

export type Decision =
  | 'mantener'
  | 'mas_reps'
  | 'menos_reps'
  | 'menos_descanso'
  | 'mas_descanso'
  | 'mas_peso'
  | 'menos_peso'
  | 'subir_nivel'
  | 'bajar_nivel'
  | 'personalizado'

export interface Entry {
  id: string
  sessionId: string
  slotId: string | null
  name: string
  section: Section
  position: number
  prescribed: Prescription
  sets: SetLog[]
  decision: Decision | null
  next: Prescription | null
  note: string | null
  skipped: boolean
  /** Fecha de la sesión (la rellena la capa de datos al leer historial). */
  date?: string
}

export interface RecordRow {
  id: string
  date: string
  lift: string
  value: number
  unit: string
  reps: number
  notes: string | null
}

export interface Profile {
  blockStart: string // lunes de la semana 1
  bodyweight: number | null
}
