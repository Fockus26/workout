import { useEffect, useRef, useState } from 'react'
import { useApp } from '../AppContext'

/** Barra fija con la cuenta atrás del descanso. Vibra al terminar. */
export function RestTimer() {
  const { timer, stopTimer, adjustTimer } = useApp()
  const [now, setNow] = useState(Date.now())
  const buzzed = useRef(false)

  useEffect(() => {
    if (!timer) return
    buzzed.current = false
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [timer])

  if (!timer) return null
  const left = Math.round((timer.endsAt - now) / 1000)
  const over = left <= 0
  if (over && !buzzed.current) {
    buzzed.current = true
    try {
      navigator.vibrate?.([300, 150, 300])
    } catch {
      /* sin vibración */
    }
  }
  const abs = Math.abs(left)
  const text = `${over ? '+' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`

  return (
    <div className={`timer${over ? ' over' : ''}`} role="timer" aria-live="off">
      <span className="t">{text}</span>
      <span className="sr-only" aria-live="polite">{over ? 'Descanso terminado' : ''}</span>
      <button type="button" onClick={() => adjustTimer(-15)} aria-label="Quitar 15 segundos">−15</button>
      <button type="button" onClick={() => adjustTimer(15)} aria-label="Añadir 15 segundos">+15</button>
      <button type="button" onClick={stopTimer}>{over ? 'Listo' : 'Saltar'}</button>
    </div>
  )
}
