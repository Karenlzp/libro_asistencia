import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCursos, getAlumnosPie } from '../../services/pieService'

function formatCurso(u) {
  const c = u?.cursos
  if (!c) return '—'
  return `${c.nivel}°${c.letra}`
}

export default function PieDashboard({ profile }) {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [cursos, setCursos] = useState([])
  const [cursoId, setCursoId] = useState('')
  const [search, setSearch] = useState('')

  const [alumnos, setAlumnos] = useState([])

  const pieActivosCount = alumnos.length

  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      setLoading(true)
      setStatus(null)

      const [cur, al] = await Promise.all([
        getCursos(),
        getAlumnosPie({ cursoId: '', search: '' }),
      ])

      if (cur.error) {
        setStatus({ type: 'error', msg: cur.error.message })
      }
      if (al.error) {
        setStatus({ type: 'error', msg: al.error.message })
      }

      setCursos(cur.data ?? [])
      setAlumnos(al.data ?? [])
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const applyFilters = async () => {
    const { data, error } = await getAlumnosPie({ cursoId, search })
    if (error) {
      setStatus({ type: 'error', msg: error.message })
      return
    }
    setAlumnos(data ?? [])
  }

  useEffect(() => {
    if (!profile?.id) return
    const t = setTimeout(() => {
      applyFilters()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId, search])

  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 4500)
  }

  useEffect(() => {
    if (status?.type === 'error') notify('error', status.msg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const headerTitle = `PIE — ${pieActivosCount} alumno(s)`

  const resumen = useMemo(() => {
    return {
      total: alumnos.length,
    }
  }, [alumnos.length])

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando módulo PIE...
      </div>
    )
  }

  return (
    <div>
      <div className="grid-4 section">
        <div className="stat-card">
          <div className="stat-icon green">🧩</div>
          <div>
            <div className="stat-value">{resumen.total}</div>
            <div className="stat-label">PIE activo</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🏫</div>
          <div>
            <div className="stat-value">{cursos.length}</div>
            <div className="stat-label">Cursos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon lime">🔎</div>
          <div>
            <div className="stat-value">{search.trim() ? 'Filtrando' : '—'}</div>
            <div className="stat-label">Búsqueda</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📋</div>
          <div>
            <div className="stat-value">{cursoId ? 'Curso' : 'Todos'}</div>
            <div className="stat-label">Ámbito</div>
          </div>
        </div>
      </div>

      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      <div className="card section">
        <div className="card-title" style={{ marginBottom: 10 }}>{headerTitle}</div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Curso</label>
            <select className="form-select" style={{ minWidth: 240 }} value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}>
              <option value="">Todos los cursos</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Buscar alumno</label>
            <input
              className="form-input"
              placeholder="Nombre del alumno..."
              style={{ minWidth: 260 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span className="badge blue">{alumnos.length} resultado(s)</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Alumnos PIE</div>
            <div className="card-subtitle">Selecciona un alumno para ver historial PIE</div>
          </div>
        </div>

        {alumnos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧩</div>
            <p>No hay alumnos PIE con los filtros actuales.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Curso</th>
                  <th style={{ width: 160 }}>Estado</th>
                  <th style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {alumnos.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{formatCurso(u)}</td>
                    <td>
                      {u.pie ? <span className="badge positiva">PIE activo</span> : <span className="badge negativa">Inactivo</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="button primary"
                        style={{ padding: '6px 12px', fontSize: '.78rem' }}
                        onClick={() => navigate(`/pie/alumno/${u.id}`)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

