import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_BLOCK_START, SEED_RECORDS, SEED_SLOTS, type SeedSlot } from './seed'
import type { Entry, Profile, RecordRow, Session, Slot } from './types'

/** Todo lo que la app lee y escribe. Dos implementaciones: Supabase y local (navegador). */
export interface Store {
  mode: 'supabase' | 'local'
  getProfile(): Promise<Profile>
  saveProfile(p: Profile): Promise<void>
  listSlots(): Promise<Slot[]>
  insertSlots(rows: SeedSlot[]): Promise<void>
  updateSlot(id: string, patch: Partial<Slot>): Promise<void>
  deleteSlot(id: string): Promise<void>
  replaceAllSlots(rows: SeedSlot[]): Promise<void>
  getSession(id: string): Promise<Session | null>
  findSession(date: string): Promise<Session | null>
  createSession(s: Omit<Session, 'id' | 'startedAt' | 'finishedAt' | 'feeling' | 'notes'>): Promise<Session>
  updateSession(id: string, patch: Partial<Session>): Promise<void>
  deleteSession(id: string): Promise<void>
  listSessions(): Promise<Session[]>
  listEntries(sessionId: string): Promise<Entry[]>
  /** Historial de un ejercicio: por slot y, si no hay slot, por nombre. Más reciente primero. */
  history(slotId: string | null, name: string, limit: number): Promise<Entry[]>
  listAllEntries(): Promise<Entry[]>
  upsertEntry(e: Omit<Entry, 'id'> & { id?: string }): Promise<Entry>
  listRecords(): Promise<RecordRow[]>
  insertRecord(r: Omit<RecordRow, 'id'>): Promise<void>
  deleteRecord(id: string): Promise<void>
}

/* ───────────────────────── mapeo filas ↔ objetos ───────────────────────── */

type Row = Record<string, unknown>

const slotFromRow = (r: Row): Slot => ({
  id: r.id as string,
  day: r.day as number,
  section: r.section as Slot['section'],
  position: r.position as number,
  name: r.name as string,
  lift: (r.lift as string) ?? null,
  load: r.load == null ? null : Number(r.load),
  loadUnit: (r.load_unit as string) ?? null,
  loadStep: r.load_step == null ? null : Number(r.load_step),
  sets: r.sets as number,
  target: Number(r.target),
  targetUnit: r.target_unit as string,
  targetMin: r.target_min == null ? null : Number(r.target_min),
  targetMax: r.target_max == null ? null : Number(r.target_max),
  targetStep: Number(r.target_step),
  restS: (r.rest_s as number) ?? null,
  restMinS: (r.rest_min_s as number) ?? null,
  restMaxS: (r.rest_max_s as number) ?? null,
  restStepS: r.rest_step_s as number,
  level: (r.level as number) ?? null,
  ladder: (r.ladder as string) ?? null,
  rpe: (r.rpe as string) ?? null,
  notes: (r.notes as string) ?? null,
  deload: r.deload as Slot['deload'],
  deloadAlt: (r.deload_alt as string) ?? null,
  optional: r.optional as boolean,
  active: r.active as boolean,
})

const SLOT_COLS: Record<string, string> = {
  day: 'day', section: 'section', position: 'position', name: 'name', lift: 'lift', load: 'load',
  loadUnit: 'load_unit', loadStep: 'load_step', sets: 'sets', target: 'target', targetUnit: 'target_unit',
  targetMin: 'target_min', targetMax: 'target_max', targetStep: 'target_step', restS: 'rest_s',
  restMinS: 'rest_min_s', restMaxS: 'rest_max_s', restStepS: 'rest_step_s', level: 'level', ladder: 'ladder',
  rpe: 'rpe', notes: 'notes', deload: 'deload', deloadAlt: 'deload_alt', optional: 'optional', active: 'active',
}
function slotToRow(s: Partial<Slot>): Row {
  const out: Row = {}
  for (const [k, col] of Object.entries(SLOT_COLS)) if (k in s) out[col] = (s as Row)[k]
  return out
}

const sessionFromRow = (r: Row): Session => ({
  id: r.id as string,
  date: r.date as string,
  day: r.day as number,
  week: (r.week as number) ?? null,
  kind: r.kind as Session['kind'],
  feeling: (r.feeling as Session['feeling']) ?? null,
  notes: (r.notes as string) ?? null,
  startedAt: r.started_at as string,
  finishedAt: (r.finished_at as string) ?? null,
})
function sessionToRow(s: Partial<Session>): Row {
  const map: Record<string, string> = { date: 'date', day: 'day', week: 'week', kind: 'kind', feeling: 'feeling', notes: 'notes', finishedAt: 'finished_at' }
  const out: Row = {}
  for (const [k, col] of Object.entries(map)) if (k in s) out[col] = (s as Row)[k]
  return out
}

const entryFromRow = (r: Row): Entry => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  slotId: (r.slot_id as string) ?? null,
  name: r.name as string,
  section: r.section as Entry['section'],
  position: r.position as number,
  prescribed: r.prescribed as Entry['prescribed'],
  sets: (r.sets as Entry['sets']) ?? [],
  decision: (r.decision as Entry['decision']) ?? null,
  next: (r.next as Entry['next']) ?? null,
  note: (r.note as string) ?? null,
  skipped: r.skipped as boolean,
  date: ((r.sessions as Row | undefined)?.date as string) ?? undefined,
})
const entryToRow = (e: Omit<Entry, 'id'>): Row => ({
  session_id: e.sessionId, slot_id: e.slotId, name: e.name, section: e.section, position: e.position,
  prescribed: e.prescribed, sets: e.sets, decision: e.decision, next: e.next, note: e.note, skipped: e.skipped,
})

const recordFromRow = (r: Row): RecordRow => ({
  id: r.id as string, date: r.date as string, lift: r.lift as string, value: Number(r.value),
  unit: r.unit as string, reps: r.reps as number, notes: (r.notes as string) ?? null,
})

/* ───────────────────────────── Supabase ───────────────────────────── */

export function supabaseStore(sb: SupabaseClient): Store {
  const ok = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  }
  return {
    mode: 'supabase',
    async getProfile() {
      const data = ok(await sb.from('profiles').select('*').maybeSingle()) as Row | null
      if (!data) {
        ok(await sb.from('profiles').insert({ block_start: DEFAULT_BLOCK_START }))
        return { blockStart: DEFAULT_BLOCK_START, bodyweight: null }
      }
      return { blockStart: data.block_start as string, bodyweight: data.bodyweight == null ? null : Number(data.bodyweight) }
    },
    async saveProfile(p) {
      ok(await sb.from('profiles').upsert({ block_start: p.blockStart, bodyweight: p.bodyweight }))
    },
    async listSlots() {
      return (ok(await sb.from('slots').select('*').order('day').order('position')) as Row[]).map(slotFromRow)
    },
    async insertSlots(rows) {
      ok(await sb.from('slots').insert(rows.map(slotToRow)))
    },
    async updateSlot(id, patch) {
      ok(await sb.from('slots').update(slotToRow(patch)).eq('id', id))
    },
    async deleteSlot(id) {
      ok(await sb.from('slots').delete().eq('id', id))
    },
    async replaceAllSlots(rows) {
      // Los registros viejos conservan su foto; solo pierden el enlace al slot.
      ok(await sb.from('slots').update({ active: false }).eq('active', true))
      ok(await sb.from('slots').insert(rows.map(slotToRow)))
    },
    async getSession(id) {
      const d = ok(await sb.from('sessions').select('*').eq('id', id).maybeSingle()) as Row | null
      return d ? sessionFromRow(d) : null
    },
    async findSession(date) {
      const d = ok(await sb.from('sessions').select('*').eq('date', date).order('started_at', { ascending: false }).limit(1)) as Row[]
      return d[0] ? sessionFromRow(d[0]) : null
    },
    async createSession(s) {
      return sessionFromRow(ok(await sb.from('sessions').insert(sessionToRow(s)).select().single()) as Row)
    },
    async updateSession(id, patch) {
      ok(await sb.from('sessions').update(sessionToRow(patch)).eq('id', id))
    },
    async deleteSession(id) {
      ok(await sb.from('sessions').delete().eq('id', id))
    },
    async listSessions() {
      return (ok(await sb.from('sessions').select('*').order('date', { ascending: false })) as Row[]).map(sessionFromRow)
    },
    async listEntries(sessionId) {
      return (ok(await sb.from('entries').select('*').eq('session_id', sessionId).order('position')) as Row[]).map(entryFromRow)
    },
    async history(slotId, name, limit) {
      let q = sb.from('entries').select('*, sessions!inner(date)')
      q = slotId ? q.or(`slot_id.eq.${slotId},and(slot_id.is.null,name.eq."${name.replace(/"/g, '')}")`) : q.eq('name', name)
      const rows = ok(await q.order('created_at', { ascending: false }).limit(limit)) as Row[]
      return rows.map(entryFromRow)
    },
    async listAllEntries() {
      return (ok(await sb.from('entries').select('*, sessions!inner(date)').order('created_at')) as Row[]).map(entryFromRow)
    },
    async upsertEntry(e) {
      const row = entryToRow(e)
      const res = e.id
        ? await sb.from('entries').update(row).eq('id', e.id).select('*, sessions!inner(date)').single()
        : await sb.from('entries').upsert(row, { onConflict: 'session_id,slot_id' }).select('*, sessions!inner(date)').single()
      return entryFromRow(ok(res) as Row)
    },
    async listRecords() {
      return (ok(await sb.from('records').select('*').order('date', { ascending: false })) as Row[]).map(recordFromRow)
    },
    async insertRecord(r) {
      ok(await sb.from('records').insert(r))
    },
    async deleteRecord(id) {
      ok(await sb.from('records').delete().eq('id', id))
    },
  }
}

/* ─────────────────────────── local (navegador) ─────────────────────────── */

interface LocalDB {
  profile: Profile
  slots: Slot[]
  sessions: Session[]
  entries: Entry[]
  records: RecordRow[]
}

const KEY = 'entreno:db:v1'
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

export function localStore(storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage): Store {
  const load = (): LocalDB => {
    try {
      const raw = storage.getItem(KEY)
      if (raw) return JSON.parse(raw) as LocalDB
    } catch {
      /* almacenamiento no disponible: empezamos vacío */
    }
    return { profile: { blockStart: DEFAULT_BLOCK_START, bodyweight: null }, slots: [], sessions: [], entries: [], records: [] }
  }
  let db = load()
  const save = () => {
    try {
      storage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* sin almacenamiento: queda en memoria */
    }
  }
  const withDate = (e: Entry): Entry => ({ ...e, date: db.sessions.find((s) => s.id === e.sessionId)?.date })
  const byNewest = (a: Entry, b: Entry) => (withDate(b).date ?? '').localeCompare(withDate(a).date ?? '')

  return {
    mode: 'local',
    async getProfile() {
      return db.profile
    },
    async saveProfile(p) {
      db.profile = p
      save()
    },
    async listSlots() {
      return [...db.slots].sort((a, b) => a.day - b.day || a.position - b.position)
    },
    async insertSlots(rows) {
      db.slots.push(...rows.map((r) => ({ ...r, id: uid() })))
      save()
    },
    async updateSlot(id, patch) {
      db.slots = db.slots.map((s) => (s.id === id ? { ...s, ...patch } : s))
      save()
    },
    async deleteSlot(id) {
      db.slots = db.slots.filter((s) => s.id !== id)
      db.entries = db.entries.map((e) => (e.slotId === id ? { ...e, slotId: null } : e))
      save()
    },
    async replaceAllSlots(rows) {
      db.slots = db.slots.map((s) => ({ ...s, active: false }))
      db.slots.push(...rows.map((r) => ({ ...r, id: uid() })))
      save()
    },
    async getSession(id) {
      return db.sessions.find((s) => s.id === id) ?? null
    },
    async findSession(date) {
      return db.sessions.filter((s) => s.date === date).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
    },
    async createSession(s) {
      const row: Session = { ...s, id: uid(), startedAt: new Date().toISOString(), finishedAt: null, feeling: null, notes: null }
      db.sessions.push(row)
      save()
      return row
    },
    async updateSession(id, patch) {
      db.sessions = db.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s))
      save()
    },
    async deleteSession(id) {
      db.sessions = db.sessions.filter((s) => s.id !== id)
      db.entries = db.entries.filter((e) => e.sessionId !== id)
      save()
    },
    async listSessions() {
      return [...db.sessions].sort((a, b) => b.date.localeCompare(a.date))
    },
    async listEntries(sessionId) {
      return db.entries.filter((e) => e.sessionId === sessionId).sort((a, b) => a.position - b.position).map(withDate)
    },
    async history(slotId, name, limit) {
      return db.entries
        .filter((e) => (slotId && e.slotId === slotId) || (e.name === name && (!slotId || e.slotId == null)))
        .sort(byNewest)
        .slice(0, limit)
        .map(withDate)
    },
    async listAllEntries() {
      return db.entries.map(withDate)
    },
    async upsertEntry(e) {
      const existing = e.id
        ? db.entries.find((x) => x.id === e.id)
        : db.entries.find((x) => x.sessionId === e.sessionId && x.slotId != null && x.slotId === e.slotId)
      const row: Entry = { ...e, id: existing?.id ?? uid() }
      db.entries = existing ? db.entries.map((x) => (x.id === row.id ? row : x)) : [...db.entries, row]
      save()
      return withDate(row)
    },
    async listRecords() {
      return [...db.records].sort((a, b) => b.date.localeCompare(a.date))
    },
    async insertRecord(r) {
      db.records.push({ ...r, id: uid() })
      save()
    },
    async deleteRecord(id) {
      db.records = db.records.filter((r) => r.id !== id)
      save()
    },
  }
}

/* ─────────────────────────────── arranque ─────────────────────────────── */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/** Primera vez: carga el plan v4 y los PRs conocidos. */
export async function ensureSeeded(store: Store): Promise<void> {
  const slots = await store.listSlots()
  if (slots.length > 0) return
  await store.insertSlots(SEED_SLOTS)
  const records = await store.listRecords()
  if (records.length === 0) for (const r of SEED_RECORDS) await store.insertRecord(r)
  await store.getProfile()
}
