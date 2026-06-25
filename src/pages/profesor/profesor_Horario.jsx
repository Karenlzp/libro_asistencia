import { useEffect, useMemo, useState } from 'react'
import { getProfesorCursos } from '../../services/profesorService'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const HORAS = ['08:00', '09:00', '10:00', '11:00', '12:00']

function generarHorario(cursoAsig) {
  if (!cursoAsig.length) return []

  const bloques = cursoAsig.map((item) => {
    const curso = item.cursos
    const asignatura = item.asignaturas
    return `${curso.nivel}°${curso.letra} • ${asignatura.nombre}`
  })

  const horario = []
  let index = 0

  for (const hora of HORAS) {
    const fila = { hora, celdas: [] }
    for (let i = 0; i < DIAS.length; i += 1) {
      fila.celdas.push(bloques[index % bloques.length])
      index += 1
    }
    horario.push(fila)
  }

  return horario
}

export default function ProfesorHorario({ profile }) {
  const [cursoAsig, setCursoAsig] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile?.id) return

    const cargar = async () => {
      setLoading(true)
      const { data, error } = await getProfesorCursos(profile.id)
      if (error) {
        setError('No se pudo cargar tu horario. Intenta recargar la página.')
      } else {
        setCursoAsig(data ?? [])
      }
      setLoading(false)
    }

    cargar()
  }, [profile?.id])

  const horario = useMemo(() => generarHorario(cursoAsig), [cursoAsig])

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

        {cursoAsig.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No tienes asignaturas asignadas todavía.</p>
          </div>
        ) : (
          <div className="schedule-grid">
            <div className="schedule-cell schedule-header">Hora</div>
            {DIAS.map((dia) => (
              <div key={dia} className="schedule-cell schedule-header">{dia}</div>
            ))}

            {horario.map((fila) => (
              <>
                <div key={`time-${fila.hora}`} className="schedule-cell schedule-time">
                  {fila.hora}
                </div>
                {fila.celdas.map((clase, index) => (
                  <div key={`${fila.hora}-${index}`} className="schedule-cell schedule-block">
                    <div className="schedule-subject">{clase}</div>
                  </div>
                ))}
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
