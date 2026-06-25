import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import {
  getProfesorAlumnoFichaResumen,
  getProfesorAlumnoNotas,
  getProfesorAlumnoAsistenciaHistorial,
  getProfesorAlumnoConducta,
  getProfesorAlumnoPieObservaciones,
  getProfesorAlumnoPieRetiros,
  getProfesorAlumnoPieInformes,
} from '../../services/profesorService'

import { getInformeUrl } from '../../services/pieInformeService'


function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CL')
  } catch {
    return iso
  }
}

function getBadgeByPorcentaje(pct) {
  if (pct == null) return '—'
  const cls = Number(pct) < 85 ? 'negativa' : 'positiva'
  return <span className={`badge ${cls}`}>{pct}%</span>
}

function getNotaClass(nota) {
  if (nota == null || Number.isNaN(Number(nota))) return 'baja'
  const n = Number(nota)
  if (n >= 5.5) return 'alta'
  if (n >= 4.0) return 'media'
  return 'baja'
}

export default function ProfesorAlumnoFichaIntegral({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const alumnoId = id

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [alumno, setAlumno] = useState(null)
  const [alumnoError, setAlumnoError] = useState(false)
  const [tab, setTab] = useState('resumen')

  // Resumen
  const [resumen, setResumen] = useState({
    promedio_general: null,
    porcentaje_asistencia: null,
    anotaciones_positivas: 0,
    anotaciones_negativas: 0,
    cantidad_alertas: 0,
  })

  // Notas
  const [notas, setNotas] = useState([])

  // Asistencia
  const [asistencia, setAsistencia] = useState([])

  // Conducta
  const [anotaciones, setAnotaciones] = useState([])

  const positivas = useMemo(() => anotaciones.filter(a => a.tipo === 'positiva'), [anotaciones])
  const negativas = useMemo(() => anotaciones.filter(a => a.tipo === 'negativa'), [anotaciones])

  // PIE
  const [pieObservaciones, setPieObservaciones] = useState([])
  const [pieRetiros, setPieRetiros] = useState([])
  const [pieInformes, setPieInformes] = useState([])

  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    setStatus(null)

    console.log('ProfesorAlumnoFichaIntegral - alumnoId:', alumnoId)

    try {
      const resultados = await Promise.allSettled([
        getProfesorAlumnoFichaResumen({ alumnoId }),
        getProfesorAlumnoNotas({ alumnoId }),
        getProfesorAlumnoAsistenciaHistorial({ alumnoId }),
        getProfesorAlumnoConducta({ alumnoId }),
        getProfesorAlumnoPieObservaciones({ alumnoId }),
        getProfesorAlumnoPieRetiros({ alumnoId }),
        getProfesorAlumnoPieInformes({ alumnoId }),
      ])

      console.log('ProfesorAlumnoFichaIntegral - resultados load:', resultados)

      const safeGet = (idx) => {
        const res = resultados[idx]
        if (!res) return { data: null, error: null }
        if (res.status === 'rejected') return { data: null, error: res.reason }
        return res.value || { data: null, error: null }
      }

      const r = safeGet(0)
      const n = safeGet(1)
      const asi = safeGet(2)
      const cond = safeGet(3)
      const po = safeGet(4)
      const pr = safeGet(5)
      const pi = safeGet(6)

      // Debug obligatorio
      console.log('alumnoId:', alumnoId)
      console.log('resumen result:', r)
      console.log('alumno final:', r?.data?.alumno)

      // Separar error SOLO del alumno-resumen
      const alumnoResumenFalló = Boolean(r?.error)
      setAlumnoError(alumnoResumenFalló)
      console.log('alumnoError (solo resumen):', alumnoResumenFalló)

      if (r?.error) {
        console.warn('Resumen fallo:', r.error)
        notify('error', r.error?.message ?? 'Error cargando resumen del alumno')
      }
      if (n?.error) {
        console.warn('Notas fallo:', n.error)
        notify('error', n.error?.message ?? 'Error cargando notas del alumno')
      }
      if (asi?.error) {
        console.warn('Asistencia fallo:', asi.error)
      }
      if (cond?.error) {
        console.warn('Conducta fallo:', cond.error)
      }
      if (po?.error) {
        console.warn('PIE Observaciones fallo:', po.error)
      }
      if (pr?.error) {
        console.warn('PIE Retiros fallo:', pr.error)
      }
      if (pi?.error) {
        console.warn('PIE Informes fallo:', pi.error)
      }

      const alumnoFromResumen = r?.data?.alumno ?? null
      setAlumno(alumnoFromResumen ?? { nombre: 'Alumno no disponible', cursos: null })
      setResumen(r?.data?.resumen ?? resumen)
      setNotas(n?.data ?? [])
      setAsistencia(asi?.data ?? [])
      setAnotaciones(cond?.data ?? [])
      setPieObservaciones(po?.data ?? [])
      setPieRetiros(pr?.data ?? [])
      setPieInformes(pi?.data ?? [])
    } catch (err) {
      console.error('Error cargando ficha alumno (load outer)', { alumnoId, err })
      notify('error', err?.message ?? 'Error inesperado cargando la ficha')
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    if (!profile?.id) return
    if (!alumnoId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, alumnoId])

  const resumenAlerts = useMemo(() => {
    const { cantidad_alertas } = resumen
    return cantidad_alertas || 0
  }, [resumen])

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando ficha del alumno...
      </div>
    )
  }

  // Mantener un “fallback UI” pero NUNCA bloquear la vista completa.
  // (Importante: por diseño, el componente ya renderiza el layout aunque el alumno sea null.)
  const alumnoNombre = alumno?.nombre ?? 'Alumno no disponible'
  const alumnoCurso =
    alumno?.cursos ? `Curso ${alumno.cursos.nivel}°${alumno.cursos.letra}` : '—'

  return (
    <div>
      <div className="card section" style={{ paddingBottom: 18 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="card-title">{alumnoNombre}</div>
            <div className="card-subtitle">{alumnoCurso}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="button ghost" onClick={() => navigate('/profesor')}>
              ← Volver
            </button>
          </div>
        </div>

        {alumnoError === true && (
          <div style={{ marginTop: 12 }}>
            <div className="empty-state" style={{ margin: 0 }}>
              <div className="empty-state-icon">🧩</div>
              <p>Alumno no disponible: se cargaron el resto de datos de forma parcial.</p>
            </div>
          </div>
        )}
      </div>

      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      <div className="tab-strip">
        {[
          { key: 'resumen', label: '📊 Resumen' },
          { key: 'notas', label: `📝 Notas (${notas.length})` },
          { key: 'asistencia', label: `📅 Asistencia (${asistencia.length})` },
          { key: 'conducta', label: `🧭 Conducta (${anotaciones.length})` },
          { key: 'pie', label: '🧩 PIE' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid-4">
            <div className="stat-card">
              <div className="stat-icon blue">📊</div>
              <div>
                <div className="stat-value">{resumen.promedio_general ?? '—'}</div>
                <div className="stat-label">Promedio general</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div>
                <div className="stat-value">{resumen.porcentaje_asistencia ?? '—'}%</div>
                <div className="stat-label">Porcentaje asistencia</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon lime">👍</div>
              <div>
                <div className="stat-value">{resumen.anotaciones_positivas ?? 0}</div>
                <div className="stat-label">Anotaciones positivas</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">👎</div>
              <div>
                <div className="stat-value">{resumen.anotaciones_negativas ?? 0}</div>
                <div className="stat-label">Anotaciones negativas</div>
              </div>
            </div>

            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div className="stat-icon red">⚠️</div>
              <div>
                <div className="stat-value">{resumenAlerts}</div>
                <div className="stat-label">Cantidad de alertas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'notas' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📝 Notas</div>
              <div className="card-subtitle">Ordenadas por fecha descendente</div>
            </div>
          </div>

          {notas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>No hay evaluaciones registradas para este alumno.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Evaluación</th>
                    <th>Asignatura</th>
                    <th>Fecha</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map(n => (
                    <tr key={`${n.evaluacion_id}-${n.alumno_id}-${n.created_at ?? ''}`.replace(/undefined/g, '')}>
                      <td>{n.evaluaciones?.nombre ?? '—'}</td>
                      <td>{n.evaluaciones?.asignaturas?.nombre ?? '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{n.evaluaciones?.fecha ?? n.created_at ?? '—'}</td>

                      <td>
                        <span className={`nota-pill ${getNotaClass(n.nota)}`}>{n.nota ?? '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'asistencia' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📅 Asistencia</div>
              <div className="card-subtitle">Historial completo</div>
            </div>
          </div>

          {asistencia.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p>No hay registros de asistencia.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencia.map(a => (
                    <tr key={a.id ?? `${a.fecha}-${a.estado}`}> 
                      <td style={{ color: 'var(--muted)' }}>{formatFecha(a.fecha)}</td>
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

      {tab === 'conducta' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🧭 Conducta</div>
              <div className="card-subtitle">Anotaciones positivas y negativas</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">🟢 Positivas ({positivas.length})</div>
                  </div>
                </div>
                {positivas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👍</div>
                    <p>Sin anotaciones positivas.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
                    {positivas.map(o => (
                      <div key={o.id} style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatFecha(o.fecha)}</div>
                        <div style={{ fontWeight: 700, marginTop: 6 }}>{o.tipo}</div>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{o.descripcion}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">🔴 Negativas ({negativas.length})</div>
                  </div>
                </div>
                {negativas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👎</div>
                    <p>Sin anotaciones negativas.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
                    {negativas.map(o => (
                      <div key={o.id} style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatFecha(o.fecha)}</div>
                        <div style={{ fontWeight: 700, marginTop: 6 }}>{o.tipo}</div>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{o.descripcion}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* PIE Observaciones */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Observaciones PIE</div>
                <div className="card-subtitle">pie_observaciones</div>
              </div>
            </div>

            {pieObservaciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No hay observaciones PIE.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pieObservaciones.map(o => (
                  <div key={o.id} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--blue)' }}>
                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatFecha(o.created_at)}</div>
                    <div style={{ fontWeight: 700 }}>{o.tipo_intervencion ?? 'Observación'}</div>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{o.observacion ?? '—'}</div>
                    <div style={{ marginTop: 6, color: 'var(--muted)' }}><strong>Resultado:</strong> {o.resultado ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIE Retiros */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Retiros PIE</div>
                <div className="card-subtitle">pie_retiros</div>
              </div>
            </div>

            {pieRetiros.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚪</div>
                <p>No hay retiros PIE.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Fecha retorno</th>
                      <th>Hora retorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pieRetiros.map(r => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.created_at)}</td>
                        <td>{r.motivo ?? '—'}</td>
                        <td>
                          <span className={`badge ${r.estado === 'retornado' ? 'positiva' : 'negativa'}`}>
                            {r.estado ?? '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.fecha_retorno)}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.hora_retorno ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PIE Informes */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Informes PIE</div>
                <div className="card-subtitle">pie_informes</div>
              </div>
            </div>

            {pieInformes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <p>No hay informes PIE registrados.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pieInformes.map(inf => (
                  <PieInformeItem key={inf.id} informe={inf} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  function PieInformeItem({ informe }) {
    const [url, setUrl] = useState(null)
    const [loadingUrl, setLoadingUrl] = useState(false)

    const filePath = informe.archivo_url || informe.path || null

    const handleGetUrl = async () => {
      if (url) return url
      setLoadingUrl(true)
      const { data, error } = await getInformeUrl(filePath)
      if (error) throw error
      setUrl(data)
      setLoadingUrl(false)
      return data
    }

    const handleVer = async () => {
      const u = await handleGetUrl()
      if (!u) return
      window.open(u, '_blank', 'noopener,noreferrer')
    }

    const handleDescargar = async () => {
      const u = await handleGetUrl()
      if (!u) return
      const a = document.createElement('a')
      a.href = u
      a.download = informe.nombre_archivo || informe.titulo || 'informe'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }

    return (
      <div style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--blue)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{informe.titulo ?? '—'}</div>
            {informe.descripcion && (
              <div style={{ fontSize: '.88rem', color: 'var(--gray-900)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                {informe.descripcion}
              </div>
            )}
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {formatFecha(informe.created_at)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="button primary" type="button" style={{ padding: '6px 12px', fontSize: '.78rem' }} onClick={handleVer} disabled={loadingUrl}>
            Ver informe
          </button>
          <button className="button ghost" type="button" style={{ padding: '6px 12px', fontSize: '.78rem' }} onClick={handleDescargar} disabled={loadingUrl}>
            Descargar
          </button>
        </div>
      </div>
    )
  }
}

