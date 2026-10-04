/** Ciclo de 10 semanas (plan v4 §1): 1–8 bloque, 9 descarga, 10 PR. */
export type Phase = 'antes' | 'bloque' | 'descarga' | 'pr' | 'terminado'

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Lunes de la semana de esa fecha. */
export function mondayOf(iso: string): string {
  const d = parseISO(iso)
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  return addDays(iso, 1 - dow)
}

export function weekIndex(blockStart: string, date: string): number {
  const days = Math.round((parseISO(date).getTime() - parseISO(blockStart).getTime()) / 86400000)
  return Math.floor(days / 7) + 1
}

export function phaseOf(week: number): Phase {
  if (week < 1) return 'antes'
  if (week <= 8) return 'bloque'
  if (week === 9) return 'descarga'
  if (week === 10) return 'pr'
  return 'terminado'
}

export function weekLabel(week: number): string {
  const p = phaseOf(week)
  if (p === 'bloque') return `Semana ${week} de 10 · Mes ${week <= 4 ? 1 : 2}`
  if (p === 'descarga') return 'Semana 9 de 10 · Descarga'
  if (p === 'pr') return 'Semana 10 de 10 · PRs'
  if (p === 'antes') return 'El bloque aún no empieza'
  return 'Bloque terminado'
}

/** Día de la semana de la fecha: 1 = lunes … 7 = domingo. */
export function weekday(iso: string): number {
  const d = parseISO(iso).getDay()
  return d === 0 ? 7 : d
}

/** En descarga se entrena Lun/Mar/Jue/Vie con las plantillas de Lun/Mar/Mié/Jue. */
export function deloadTemplateDay(dow: number): number | null {
  return ({ 1: 1, 2: 2, 4: 3, 5: 4 } as Record<number, number>)[dow] ?? null
}

/** Recalibración al empezar la semana 5 (fin del mes 1) y la 9 (fin del mes 2). */
export const isRecalibrationWeek = (week: number) => week === 5 || week === 9
