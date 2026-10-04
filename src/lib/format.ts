import { ladderLevel } from './ladders'
import { DECISION_LABEL } from './progression'
import type { Entry, Prescription } from './types'

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))

export function formatRest(s: number | null): string {
  if (s == null) return ''
  if (s <= 90) return `${s} s`
  if (s % 60 === 0) return `${s / 60} min`
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')} min`
}

export function formatLoad(p: Pick<Prescription, 'load' | 'loadUnit'>): string {
  if (p.load == null) return ''
  return `${num(p.load)} ${p.loadUnit ?? 'kg'}`
}

/** "4×5", "3×30 s/brazo", "6 min", "3×8/pierna". */
export function formatVolume(p: Pick<Prescription, 'sets' | 'target' | 'targetUnit'>): string {
  const t = num(p.target)
  const unit = p.targetUnit
  if (unit.startsWith('reps')) {
    const suffix = unit.slice(4).trim()
    return p.sets > 1 ? `${p.sets}×${t}${suffix}` : `${t} ${unit}`
  }
  return p.sets > 1 ? `${p.sets}×${t} ${unit}` : `${t} ${unit}`
}

export function formatPrescription(p: Prescription): string {
  return [formatLoad(p), formatVolume(p), formatRest(p.restS)].filter(Boolean).join(' · ')
}

export function formatRange(p: Prescription): string {
  const parts: string[] = []
  if (p.targetMin != null && p.targetMax != null) parts.push(`${num(p.targetMin)}–${num(p.targetMax)} ${p.targetUnit.split(' ')[0]}`)
  if (p.restMinS != null && p.restMaxS != null && p.restMinS !== p.restMaxS)
    parts.push(`desc. ${formatRest(p.restMinS)}–${formatRest(p.restMaxS)}`)
  return parts.join(' · ')
}

export function levelLabel(p: Prescription): string | null {
  const def = ladderLevel(p.ladder, p.level)
  return def ? `Nivel ${p.level}: ${def.name}` : null
}

/** Línea al estilo de tus notas: "Sentadilla | 100kg | 4×5 | 3min (subir nivel)". */
export function entryAsNote(e: Entry): string {
  const p = e.prescribed
  const parts = [e.name]
  if (p.load != null) parts.push(`${num(p.load)}${(p.loadUnit ?? 'kg').replace(' ', '')}`)
  const done = e.sets.filter((s) => s.done && s.value != null)
  const values = done.map((s) => s.value as number)
  const allSame = values.length > 0 && values.every((v) => v === values[0])
  if (values.length && !allSame) parts.push(`${values.length}×(${values.map(num).join('-')})`)
  else parts.push(formatVolume(p).replace(/ /g, ''))
  if (p.restS != null) parts.push(formatRest(p.restS).replace(' ', ''))
  let line = parts.join(' | ')
  const rpes = done.map((s) => s.rpe).filter((r) => r != null)
  if (rpes.length) line += ` | RPE ${rpes.join('-')}`
  const tail = [e.decision ? DECISION_LABEL[e.decision].toLowerCase() : null, e.note].filter(Boolean).join(' · ')
  if (e.skipped) line += ' (no hecho)'
  else if (tail) line += ` (${tail})`
  return line
}

export const formatRecord = (value: number, unit: string) => (unit === 'nivel' ? `nivel ${value}` : `${value} ${unit}`)

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAY_TITLES: Record<number, string> = {
  1: 'Inferior A · sentadilla pesada',
  2: 'Superior A · banca pesada',
  3: 'Inferior B · peso muerto pesado',
  4: 'Superior B · militar pesado + one arm',
  5: 'Inferior C · volumen',
  6: 'Superior C · volumen + one arm',
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAY_NAMES[dt.getDay()]} ${d} ${MONTHS[m - 1]}`
}
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const full = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${full[m - 1]} ${y}`
}
