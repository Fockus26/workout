/**
 * Pesos que existen en el gym: discos de 2.5 kg como mínimo y, en barra, siempre
 * por pares (saltos de 5 kg). Mancuernas: 2–12 kg sueltas y desde 15 kg de 5 en 5.
 */
export const DUMBBELLS = [2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

const isDumbbell = (unit: string | null) => unit === 'kg c/u'
const snap = (n: number, step: number) => Math.round(n / step) * step

/** Siguiente peso disponible hacia arriba (dir 1) o hacia abajo (dir −1). */
export function nextLoad(load: number, unit: string | null, step: number, dir: 1 | -1): number {
  if (isDumbbell(unit)) {
    const list = dir === 1 ? DUMBBELLS : [...DUMBBELLS].reverse()
    return list.find((w) => (dir === 1 ? w > load : w < load)) ?? load
  }
  return Math.max(0, snap(load + dir * step, step >= 1 ? Math.min(step, 2.5) : step))
}

/** Redondea hacia abajo a un peso que se pueda armar (para la descarga). */
export function floorLoad(load: number, unit: string | null, step: number): number {
  if (isDumbbell(unit)) return [...DUMBBELLS].reverse().find((w) => w <= load) ?? DUMBBELLS[0]
  const g = Math.min(step, 5)
  return Math.floor(load / g) * g
}
