import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { addDays, deloadTemplateDay, isRecalibrationWeek, mondayOf, phaseOf, weekIndex, weekLabel, weekday } from '../lib/calendar'
import { DAY_NAMES, DAY_TITLES, formatDate, formatPrescription } from '../lib/format'
import { go, todayISO } from '../lib/nav'
import { PR_DAYS } from '../lib/prweek'
import { needsAutoregulation, todaysPrescription } from '../lib/session'
import type { Session, SessionKind } from '../lib/types'

const SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function Today() {
  const { store, profile, slots, setProfile } = useApp()
  const today = todayISO()
  const week = weekIndex(profile.blockStart, today)
  const phase = phaseOf(week)
  const dow = weekday(today)
  const defaultKind: SessionKind = phase === 'descarga' ? 'descarga' : phase === 'pr' ? 'pr' : 'normal'
  const defaultDay = dow === 7 ? null : phase === 'descarga' ? deloadTemplateDay(dow) : dow

  const [existing, setExisting] = useState<Session | null | undefined>(undefined)
  const [autoreg, setAutoreg] = useState(false)
  const [day, setDay] = useState<number | null>(defaultDay)
  const [kind, setKind] = useState<SessionKind>(defaultKind)
  const [busy, setBusy] = useState(false)
  const [another, setAnother] = useState(false)

  useEffect(() => {
    store.findSession(today).then(setExisting)
    store.listSessions().then((s) => setAutoreg(needsAutoregulation(s)))
  }, [store, today])

  async function start() {
    if (day == null) return
    setBusy(true)
    const s = await store.createSession({ date: today, day, week: week >= 1 ? week : null, kind })
    go(`/sesion/${s.id}`)
  }

  async function newBlock() {
    const start = dow === 7 ? addDays(today, 1) : mondayOf(today)
    if (!confirm(`¿Empezar un bloque nuevo el ${formatDate(start)}? La semana 1 empieza ese lunes.`)) return
    await setProfile({ ...profile, blockStart: start })
  }

  const daySlots = day == null ? [] : slots.filter((s) => s.active && s.day === day)

  return (
    <div className="stack">
      <header className="topbar">
        <span className="eyebrow">{weekLabel(week)}</span>
        <h1>{formatDate(today)}</h1>
        {phase === 'antes' && <p className="muted small">La semana 1 empieza el {formatDate(profile.blockStart)}.</p>}
      </header>

      {existing && (
        <div className="card spread">
          <div className="grow">
            <strong>{existing.finishedAt ? 'Sesión de hoy terminada' : 'Tienes una sesión en curso'}</strong>
            <div className="small muted">{DAY_TITLES[existing.day] ?? ''}</div>
          </div>
          <div className="row">
            {!another && (
              <button className="btn ghost small" onClick={() => setAnother(true)}>
                Otra
              </button>
            )}
            <button className="btn primary" onClick={() => go(`/sesion/${existing.id}`)}>
              {existing.finishedAt ? 'Ver' : 'Continuar'}
            </button>
          </div>
        </div>
      )}

      {autoreg && (
        <div className="banner warn">
          <strong>2 sesiones seguidas "decaído".</strong> El plan dice: baja un 5 % los pesos esta semana. Si sigue igual, adelanta la descarga.
        </div>
      )}
      {isRecalibrationWeek(week) && (
        <div className="banner">
          <strong>Toca recalibrar.</strong> Terminó el mes {week === 5 ? 1 : 2}: revisa qué ejercicios están estancados.{' '}
          <a href="#/plan">Ver recalibración</a>
        </div>
      )}
      {phase === 'terminado' && (
        <div className="banner">
          <strong>Terminaste el ciclo de 10 semanas.</strong> Registra tus PRs y empieza el siguiente bloque.
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={newBlock}>Empezar bloque nuevo</button>
          </div>
        </div>
      )}
      {phase === 'descarga' && (dow === 3 || dow === 6) && (
        <div className="banner">Descanso activo: caminata de 20–30 min y movilidad. Si quieres, puedes registrar otro día.</div>
      )}

      {(existing === null || another) && (
        <section className="stack" aria-labelledby="start-h">
          <div className="spread">
            <h2 id="start-h">{dow === 7 && day == null ? 'Domingo: descanso' : 'Sesión de hoy'}</h2>
          </div>
          <div className="tabs" role="group" aria-label="Plantilla del día">
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <button key={d} className="chip" aria-pressed={day === d} onClick={() => setDay(d)}>
                {SHORT[d]}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Tipo de sesión">
            {(['normal', 'descarga', 'pr'] as SessionKind[]).map((k) => (
              <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === 'normal' ? 'Normal' : k === 'descarga' ? 'Descarga' : 'Semana de PR'}
              </button>
            ))}
          </div>

          {day != null && (
            <div className="card stack">
              <div>
                <div className="eyebrow">{DAY_NAMES[day]}{day !== dow && dow !== 7 ? ' (plantilla)' : ''}</div>
                <h3>{kind === 'pr' ? PR_DAYS[day].title : DAY_TITLES[day]}</h3>
              </div>
              {kind === 'pr' ? (
                <p className="small muted">{PR_DAYS[day].note}</p>
              ) : (
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 6 }}>
                  {daySlots.map((s) => {
                    const p = todaysPrescription(s, kind)
                    return (
                      <li key={s.id} className="spread small">
                        <span className="grow">{s.name}</span>
                        <span className="muted" style={{ textAlign: 'right' }}>
                          {p ? formatPrescription(p) : s.deloadAlt ?? 'no toca'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button className="btn primary big block" onClick={start} disabled={busy || existing === undefined}>
                Iniciar sesión
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
