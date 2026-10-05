/** Escaleras de habilidad (plan v4 §7). Cada nivel puede traer su propio rango. */
export interface LadderLevel {
  name: string
  targetUnit?: string
  targetMin?: number
  targetMax?: number
}

export const LADDERS: Record<string, { label: string; levels: LadderLevel[] }> = {
  oap: {
    label: 'One arm pull-up',
    levels: [
      { name: 'Negativas a 1 brazo con banda (bajar 3–6 s)', targetUnit: 's por negativa', targetMin: 3, targetMax: 6 },
      { name: 'Negativas a 1 brazo sin banda (bajar 2–5 s)', targetUnit: 's por negativa', targetMin: 2, targetMax: 5 },
      { name: 'Negativas a 1 brazo sin banda (8–10 s)', targetUnit: 's por negativa', targetMin: 8, targetMax: 10 },
      { name: 'Asistida con banda o toalla + lock-off 5 s', targetUnit: 'reps/brazo', targetMin: 2, targetMax: 3 },
      { name: 'Intentos de one arm pull-up', targetUnit: 'reps/brazo', targetMin: 1, targetMax: 3 },
    ],
  },
  archer: {
    label: 'Archer pull-ups',
    levels: [
      { name: 'Archer', targetUnit: 'reps/lado', targetMin: 6, targetMax: 8 },
      { name: 'Archer + pausa 2 s arriba', targetUnit: 'reps/lado', targetMin: 6, targetMax: 8 },
      { name: 'Archer + pausa 3 s arriba', targetUnit: 'reps/lado', targetMin: 6, targetMax: 8 },
    ],
  },
  dragon_flag: {
    label: 'Dragon flag',
    levels: [
      { name: 'Negativas con rodillas (bajar 5 s)', targetUnit: 'reps', targetMin: 3, targetMax: 5 },
      { name: 'Tuck dragon flag completo', targetUnit: 'reps', targetMin: 3, targetMax: 5 },
      { name: 'Negativas con una pierna extendida (5 s)', targetUnit: 'reps', targetMin: 3, targetMax: 5 },
      { name: 'Negativas piernas rectas (5 s)', targetUnit: 'reps', targetMin: 3, targetMax: 5 },
      { name: 'Dragon flag completo', targetUnit: 'reps', targetMin: 1, targetMax: 3 },
      { name: 'Dragon flag (series largas → ×20)', targetUnit: 'reps', targetMin: 5, targetMax: 20 },
    ],
  },
  leg_raise: {
    label: 'Leg raise colgado',
    levels: [
      { name: 'Rodillas al pecho tumbado', targetMin: 8, targetMax: 12 },
      { name: 'Rodillas al pecho colgado', targetMin: 8, targetMax: 12 },
      { name: 'Rodillas al pecho + pausa 1–2 s', targetMin: 8, targetMax: 12 },
      { name: 'Piernas semi-extendidas', targetMin: 8, targetMax: 12 },
      { name: 'Piernas extendidas, rango completo', targetMin: 8, targetMax: 12 },
      { name: 'Piernas extendidas + peso', targetMin: 8, targetMax: 12 },
    ],
  },
  ab_wheel: {
    label: 'Ab wheel',
    levels: [
      { name: 'Arrodillado, rango parcial', targetMin: 8, targetMax: 10 },
      { name: 'Arrodillado, rango completo', targetMin: 8, targetMax: 10 },
      { name: 'Arrodillado + pausa al fondo', targetMin: 6, targetMax: 10 },
      { name: 'De pie', targetMin: 3, targetMax: 10 },
    ],
  },
}

export function ladderLevel(ladder: string | null, level: number | null): LadderLevel | null {
  if (!ladder || level == null) return null
  return LADDERS[ladder]?.levels[level - 1] ?? null
}

export function ladderMax(ladder: string | null): number {
  return ladder ? (LADDERS[ladder]?.levels.length ?? 1) : 1
}
