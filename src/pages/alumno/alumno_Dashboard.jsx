// src/pages/alumno/Dashboard.jsx
import { useEffect, useState } from 'react'

import {
  getPerfilAlumno,
  getNotasAlumno,
  getAsistenciaAlumnoPorAsignatura,
  getAnotacionesAlumno,
  getRetirosAlumno,
  getObservacionesAlumno,
} from '../../services/alumnoService'

// ── Helpers
function getNotaClass(nota) {
  if (nota >= 5.5) return 'alta'
  if (nota >= 4.0) return 'media'
  return 'baja'
}

function calcPromedio(notas) {
  if (!notas.length) return null
  const suma = notas.reduce((s, n) => s + n.nota, 0)
  return (suma / notas.length).toFixed(1)
}

function calcAsistencia(registros) {
  if (!registros.length) return null
  const validos = registros.filter(r => ['presente', 'justificado'].includes(r.estado)).length
  return Math.round((validos / registros.length) * 100)
}

// Agrupa notas por asignatura (ID)
function agruparPorAsignatura(notas) {
  const map = {}
  for (const n of notas) {
    const asigId = n.evaluaciones?.asignaturas?.id ?? 'sin-id'
    const asigNombre = n.evaluaciones?.asignaturas?.nombre ?? 'Sin asignatura'
    if (!map[asigId]) map[asigId] = { nombre: asigNombre, notas: [] }
    map[asigId].notas.push(n)
  }
  return map
}

// ── Componente principal
export default function AlumnoDashboard({ profile }) {
  const [tab, setTab] = useState('resumen')

  const [perfil, setPerfil] = useState(null)
  const [notas, setNotas] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [anotaciones, setAnotaciones] = useState([])
  const [retiros, setRetiros] = useState([])
  const [observaciones, setObservaciones] = useState([])

  // filtro por asignatura (notas + asistencia)
  const [asignaturaSel, setAsignaturaSel] = useState('todas')

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const notasPorAsig = agruparPorAsignatura(notas)

  // Listado de asignaturas según las evaluaciones del alumno
  const asignaturasDisponibles = Object.entries(notasPorAsig).map(([id, v]) => ({
    id,
    nombre: v.nombre,
  }))

  const notasFiltradas = asignaturaSel === 'todas'
    ? notas
    : notas.filter(n => String(n.evaluaciones?.asignaturas?.id) === String(asignaturaSel))

  const asistenciaFiltrada = asignaturaSel === 'todas'
    ? asistencia
    : asistencia.filter(a => String(a.asignatura_id) === String(asignaturaSel))

  // Recalcular métricas con el filtro
  const promedioFiltrado = calcPromedio(notasFiltradas)
  const pctAsistenciaFiltrada = calcAsistencia(asistenciaFiltrada)

  const positivasFiltradas = anotaciones.filter(a => a.tipo === 'positiva').length
  const negativasFiltradas = anotaciones.filter(a => a.tipo === 'negativa').length

  const alertas = []
  if (promedioFiltrado !== null && Number(promedioFiltrado) < 4.0) alertas.push('Tu promedio (seleccionado) está bajo 4.0.')
  if (pctAsistenciaFiltrada !== null && pctAsistenciaFiltrada < 85) {
    alertas.push(`Tu asistencia (seleccionada) es ${pctAsistenciaFiltrada}%, está bajo el mínimo requerido (85%).`)
  }
  if (negativasFiltradas >= 3) alertas.push(`Tienes ${negativasFiltradas} anotaciones negativas.`)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    loadData()
  }, [profile?.id])

  const loadData = async () => {
    setLoading(true)

    const [per, not, asi, ano, ret, obs] = await Promise.all([
      getPerfilAlumno(profile.id),
      getNotasAlumno(profile.id),
      getAsistenciaAlumnoPorAsignatura(profile.id),
      getAnotacionesAlumno(profile.id),
      getRetirosAlumno(profile.id),
      getObservacionesAlumno(profile.id),
    ])

    if (per.error) {
      setError('No se pudo cargar tu perfil.')
      setLoading(false)
      return
    }

    setPerfil(per.data)
    setNotas(not.data ?? [])
    setAsistencia(asi.data ?? [])
    setAnotaciones(ano.data ?? [])
    setRetiros(ret.data ?? [])
    setObservaciones(obs.data ?? [])
    setLoading(false)
  }

  // Cálculos globales (solo para el header; el filtro afecta pestañas + alertas)
  const promedio = calcPromedio(notas)
  const pctAsistencia = calcAsistencia(asistencia)
  const positivas = anotaciones.filter(a => a.tipo === 'positiva').length
  const negativas = anotaciones.filter(a => a.tipo === 'negativa').length

  if (loading) {
    return <div className="loading-wrap"><div className="spinner" /> Cargando tu información...</div>
  }

  if (error) {
    return <div className="alert error" style={{ marginTop: 24 }}>{error}</div>
  }

  // Resumen de asignatura (cuando aplica)
  const filasPromedioPorAsignatura = Object.entries(notasPorAsig).map(([id, v]) => ({
    id,
    nombre: v.nombre,
    notas: v.notas,
  }))

  const filasPromedioFiltradas = asignaturaSel === 'todas'
    ? filasPromedioPorAsignatura
    : filasPromedioPorAsignatura.filter(f => String(f.id) === String(asignaturaSel))

  return (
    <div>
      {/* ── Header alumno ── */}
      <div className="card section" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--lime)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            flexShrink: 0,
          }}
        >
          🎒
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>{perfil?.nombre}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.82rem', marginTop: 3 }}>
            {perfil?.cursos ? `Curso ${perfil.cursos.nivel}°${perfil.cursos.letra}` : 'Sin curso asignado'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: promedio && Number(promedio) < 4 ? 'var(--danger)' : 'var(--navy)',
              }}
            >
              {promedio ?? '—'}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Promedio</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: pctAsistencia && pctAsistencia < 85 ? 'var(--danger)' : 'var(--navy)',
              }}
            >
              {pctAsistencia !== null ? pctAsistencia + '%' : '—'}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Asistencia</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--navy)' }}>{notas.length}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Evaluaciones</div>
          </div>
        </div>
      </div>

      {/* ── Alertas propias ── */}
      {alertas.length > 0 && (
        <div
          style={{
            background: 'rgba(224,82,82,.08)',
            border: '1px solid rgba(224,82,82,.25)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8, fontSize: '.88rem' }}>⚠️ Atención</div>
          {alertas.map((a, i) => (
            <div key={i} style={{ fontSize: '.83rem', color: '#c03a3a', marginTop: 4 }}>
              • {a}
            </div>
          ))}
        </div>
      )}

      {/* ── Filtro por asignatura (solo notas + asistencia) ── */}
      <div className="card section" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="card-title" style={{ margin: 0 }}>Asignatura:</div>
        <select
          className="form-select"
          style={{ minWidth: 240 }}
          value={asignaturaSel}
          onChange={e => {
            setAsignaturaSel(e.target.value)
            setTab('resumen')
          }}
        >
          <option value="todas">Todas</option>
          {asignaturasDisponibles.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <span className="badge default">
          {asignaturaSel === 'todas'
            ? 'Viendo todo'
            : `Viendo: ${asignaturasDisponibles.find(a => String(a.id) === String(asignaturaSel))?.nombre ?? '—'}`}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-strip">
        {[
          { key: 'resumen', label: '📊 Resumen' },
          { key: 'notas', label: `📝 Notas (${notasFiltradas.length})` },
          { key: 'asistencia', label: `📅 Asistencia (${asistenciaFiltrada.length})` },
          { key: 'anotaciones', label: `💬 Anotaciones (${anotaciones.length})` },
          { key: 'retiros', label: `🚪 Retiros (${retiros.length})` },
          { key: 'observaciones', label: `📋 Observaciones (${observaciones.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen ── */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div className="grid-4">
            <div className="stat-card">
              <div className="stat-icon lime">📝</div>
              <div>
                <div className="stat-value">{notas.length}</div>
                <div className="stat-label">Evaluaciones</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">📊</div>
              <div>
                <div className="stat-value" style={{ color: promedio && Number(promedio) < 4 ? 'var(--danger)' : 'inherit' }}>
                  {promedio ?? '—'}
                </div>
                <div className="stat-label">Promedio general</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div>
                <div className="stat-value" style={{ color: pctAsistencia && pctAsistencia < 85 ? 'var(--danger)' : 'inherit' }}>
                  {pctAsistencia !== null ? pctAsistencia + '%' : '—'}
                </div>
                <div className="stat-label">Asistencia</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">💬</div>
              <div>
                <div className="stat-value">{positivas} / {negativas}</div>
                <div className="stat-label">Anot. pos. / neg.</div>
              </div>
            </div>
          </div>

          {/* Promedio por asignatura (respetando selector) */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Promedio por asignatura</div>
            </div>

            {filasPromedioPorAsignatura.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>Sin notas registradas aún.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th>Evaluaciones</th>
                      <th>Promedio</th>
                      <th>Mejor nota</th>
                      <th>Menor nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasPromedioFiltradas.map(({ id, nombre, notas: ns }) => {
                      const prom = (ns.reduce((s, n) => s + n.nota, 0) / ns.length).toFixed(1)
                      const mejor = Math.max(...ns.map(n => n.nota)).toFixed(1)
                      const menor = Math.min(...ns.map(n => n.nota)).toFixed(1)
                      return (
                        <tr key={id}>
                          <td><strong>{nombre}</strong></td>
                          <td>{ns.length}</td>
                          <td><span className={`nota-pill ${getNotaClass(Number(prom))}`}>{prom}</span></td>
                          <td><span className="nota-pill alta">{mejor}</span></td>
                          <td><span className={`nota-pill ${getNotaClass(Number(menor))}`}>{menor}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Notas ── */}
      {tab === 'notas' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📘 Notas</div>
            <div className="card-subtitle">{notasFiltradas.length} evaluaciones</div>
          </div>

          {notasFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>No tienes notas registradas para esta asignatura.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asignatura</th>
                    <th>Evaluación</th>
                    <th>%</th>
                    <th>Nota</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {notasFiltradas.map((n, i) => (
                    <tr key={i}>
                      <td>{n.evaluaciones?.asignaturas?.nombre ?? '—'}</td>
                      <td>{n.evaluaciones?.nombre ?? '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{n.evaluaciones?.porcentaje ?? '—'}%</td>
                      <td>
                        <span className={`nota-pill ${getNotaClass(n.nota)}`}>{n.nota.toFixed(1)}</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{n.evaluaciones?.fecha ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Asistencia ── */}
      {tab === 'asistencia' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📅 Asistencia</div>
              <div className="card-subtitle">
                {asistenciaFiltrada.filter(a => a.estado === 'presente').length} presentes ·{' '}
                {asistenciaFiltrada.filter(a => a.estado === 'justificado').length} justificados ·{' '}
                {asistenciaFiltrada.filter(a => a.estado === 'ausente').length} ausentes
              </div>
            </div>
            {pctAsistenciaFiltrada !== null && (
              <span className={`badge ${pctAsistenciaFiltrada < 85 ? 'negativa' : 'positiva'}`} style={{ fontSize: '.88rem', padding: '6px 14px' }}>
                {pctAsistenciaFiltrada}% asistencia
              </span>
            )}
          </div>

          {asistenciaFiltrada.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p>No hay registros de asistencia para esta asignatura.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {asistenciaFiltrada.map(a => (
                    <tr key={a.id}>
                      <td>{a.fecha}</td>
                      <td>
                        <span className={`badge ${a.estado}`}>
                          {a.estado === 'presente' ? '✅ Presente' : a.estado === 'ausente' ? '❌ Ausente' : '📄 Justificado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Anotaciones (globales) ── */}
      {tab === 'anotaciones' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mis anotaciones</div>
            <div className="card-subtitle">{positivas} positivas · {negativas} negativas</div>
          </div>

          {anotaciones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p>No tienes anotaciones registradas.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Descripción</th><th>Profesor</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {anotaciones.map(a => (
                    <tr key={a.id}>
                      <td>
                        <span className={`badge ${a.tipo}`}>{a.tipo === 'positiva' ? '👍 Positiva' : '👎 Negativa'}</span>
                      </td>
                      <td>{a.descripcion}</td>
                      <td style={{ color: 'var(--muted)' }}>{a.usuarios?.nombre ?? '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{a.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Retiros ── */}
      {tab === 'retiros' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mis retiros de clase</div>
          </div>

          {retiros.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚪</div>
              <p>No tienes retiros de clase registrados.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Motivo</th><th>Profesor</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {retiros.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge default">{r.tipo}</span></td>
                      <td>{r.motivo}</td>
                      <td style={{ color: 'var(--muted)' }}>{r.usuarios?.nombre ?? '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{r.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Observaciones ── */}
      {tab === 'observaciones' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Observaciones del profesor</div>
          </div>

          {observaciones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No hay observaciones registradas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {observaciones.map(o => (
                <div
                  key={o.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--navy-light)',
                  }}
                >
                  <div style={{ fontSize: '.85rem', color: 'var(--navy)', marginBottom: 6 }}>{o.contenido}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{o.usuarios?.nombre ?? '—'} · {o.fecha}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

