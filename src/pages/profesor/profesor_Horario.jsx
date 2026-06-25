import { useEffect, useMemo, useState } from 'react'
import { getHorariosProfesor } from '../../services/horarioService'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

function toMinutes(timeValue) {
  if (!timeValue) return null
  const raw = String(timeValue)
  const parts = raw.split(':').map((v) => Number(v))
  const hh = parts[0]
  const mm = parts[1] ?? 0
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return hh * 60 + mm
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeDay(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  const map = {
    lunes: 'Lunes',
    martes: 'Martes',
    'miercoles': 'Miércoles',
    'miércoles': 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
  }
  return map[raw] ?? value
}

function buildScheduleGrid(bloques = []) {
  if (!Array.isArray(bloques) || bloques.length === 0) return { horas: [], mapa: new Map() }

  const minutesStartList = bloques.map((b) => toMinutes(b.hora_inicio)).filter((v) => v != null)
  const minutesEndList = bloques.map((b) => toMinutes(b.hora_fin)).filter((v) => v != null)
  const minStart = minutesStartList.length ? Math.min(...minutesStartList) : 8 * 60
  const maxEnd = minutesEndList.length ? Math.max(...minutesEndList) : (minStart + 60)

  const start = Math.floor(minStart / 60) * 60
  const end = Math.ceil(maxEnd / 60) * 60

  const horas = []
  for (let t = start; t <= end; t += 60) {
    horas.push(formatMinutes(t))
  }

  const mapa = new Map()
  for (const b of bloques) {
    const dia = normalizeDay(b.dia)
    const startMin = toMinutes(b.hora_inicio)
    const slotMin = startMin == null ? null : Math.floor(startMin / 60) * 60
    const horaKey = slotMin == null ? null : formatMinutes(slotMin)
    if (!horaKey || !DIAS.includes(dia)) continue

    const key = `${horaKey}__${dia}`
    const curso = b.cursos ? `${b.cursos.nivel}°${b.cursos.letra}` : '—'
    const asignatura = b.asignaturas?.nombre ?? '—'
    const sala = b.sala ?? null
    const label = `${curso} • ${asignatura}`
    const timeLabel = b.hora_inicio && b.hora_fin ? `${String(b.hora_inicio).slice(0, 5)} - ${String(b.hora_fin).slice(0, 5)}` : null

    const existing = mapa.get(key) ?? []
    existing.push({ label, sala, timeLabel })
    mapa.set(key, existing)
  }

  return { horas, mapa }
}

export default function ProfesorHorario({ profile }) {
  const [bloques, setBloques] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile?.id) return

    const cargar = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await getHorariosProfesor({ profesorId: profile.id })
      if (error) {
        setError('No se pudo cargar tu horario. Intenta recargar la página.')
        setBloques([])
      } else {
        setBloques(data ?? [])
      }
      setLoading(false)
    }

    cargar()
  }, [profile?.id])

  const grid = useMemo(() => buildScheduleGrid(bloques), [bloques])

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando horario...
      </div>
    )
  }

  if (error) {
    return <div className="alert error" style={{ marginTop: 24 }}>{error}</div>
  }

  return (
    <div>
      <div className="card section">
        <div className="card-header">
          <div>
            <div className="card-title">Horario semanal</div>
            <div className="card-subtitle">Horario de clases del profesor {profile?.nombre}</div>
          </div>
        </div>

        {bloques.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No tienes bloques asignados todavía.</p>
          </div>
        ) : (
          <div className="schedule-grid">
            <div className="schedule-cell schedule-header">Hora</div>
            {DIAS.map((dia) => (
              <div key={dia} className="schedule-cell schedule-header">{dia}</div>
            ))}

            {grid.horas.map((hora) => (
              <>
                <div key={`time-${hora}`} className="schedule-cell schedule-time">
                  {hora}
                </div>
                {DIAS.map((dia) => {
                  const key = `${hora}__${dia}`
                  const items = grid.mapa.get(key) ?? []
                  return (
                    <div key={`${hora}-${dia}`} className="schedule-cell schedule-block">
                      {items.length === 0 ? null : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                          {items.map((it, idx) => (
                            <div key={`${key}-${idx}`} className="schedule-subject">
                              <div>{it.label}</div>
                              {(it.timeLabel || it.sala) && (
                                <div style={{ fontSize: '.75rem', fontWeight: 500, opacity: .8, marginTop: 4 }}>
                                  {it.timeLabel ? it.timeLabel : null}
                                  {it.timeLabel && it.sala ? ' · ' : null}
                                  {it.sala ? it.sala : null}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
