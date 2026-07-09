import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  createObservacionPie,
  createRetiroPie,
  getAlumnoPieDetail,
  getAnotacionesAlumno,
  getAsistenciaAlumnoPie,
  getObservacionesPie,
  getRetirosPie,
  getResumenPieAlumno,
  getNotasAlumnoPie,
  getAlertasAlumnoPie,
  registrarRetornoPie,
} from '../../services/pieService'
import { getAsistenciaCursoFecha } from '../../services/profesorService'

import {
  createInformePie,
  getInformesPie,
  getInformeUrl,
  uploadInformePie,
} from '../../services/pieInformeService'



function formatCurso(c) {
  if (!c) return '—'
  return `${c.nivel}°${c.letra}`
}

function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CL')
  } catch {
    return iso
  }
}

function toLocalIsoDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function PieAlumnoDetalle({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const alumnoId = id

  


  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [alumno, setAlumno] = useState(null)
  const [observaciones, setObservaciones] = useState([])
  const [anotaciones, setAnotaciones] = useState([])
  const [resumen, setResumen] = useState(null)
  const [asistencias, setAsistencias] = useState([])
  const [fechaAsist, setFechaAsist] = useState(new Date().toISOString().slice(0, 10))
  const [asistenciaMap, setAsistenciaMap] = useState({})
  const [fechaAsistRows, setFechaAsistRows] = useState([])
  const [showAllAsistencia, setShowAllAsistencia] = useState(false)
  const [retiros, setRetiros] = useState([])
  const [informes, setInformes] = useState([])
  const [notas, setNotas] = useState([])
  const [alertas, setAlertas] = useState(null)
  const [debugLoads, setDebugLoads] = useState(null)

  const [informeForm, setInformeForm] = useState({
    titulo: '',
    descripcion: '',
    archivo: null,
  })


  // UI state
  const [tab, setTab] = useState('observaciones')

  const [obsForm, setObsForm] = useState({
    tipo_intervencion: 'Observación general',
    observacion: '',
    resultado: '',
  })

  const [retiroOpen, setRetiroOpen] = useState(false)
  const [retiroForm, setRetiroForm] = useState({ motivo: '', tipo: 'retiro' })

  const pieEstado = useMemo(() => {
    const act = alumno?.pie === true
    return act ? { label: 'PIE activo', cls: 'positiva' } : { label: 'PIE inactivo', cls: 'negativa' }
  }, [alumno?.pie])

  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    setStatus(null)
    // Hacemos las consultas en paralelo pero no devolvemos inmediatamente
    // si alguna de las consultas auxiliares falla: mostramos lo que haya.
    try {
      const [det, obs, anot, res, asi, ret, inf, notasData, alertasData] = await Promise.all([
        getAlumnoPieDetail(alumnoId),
        getObservacionesPie(alumnoId),
        getAnotacionesAlumno(alumnoId),
        getResumenPieAlumno(alumnoId),
        getAsistenciaAlumnoPie(alumnoId),
        getRetirosPie(alumnoId),
        getInformesPie(alumnoId),
        getNotasAlumnoPie(alumnoId),
        getAlertasAlumnoPie(alumnoId),
      ])

      // Log para diagnóstico en consola del navegador
      // eslint-disable-next-line no-console
      console.debug('PIE detail loads:', { det, obs, anot, res, asi, ret, inf, notasData, alertasData })
      setDebugLoads({ det, obs, anot, res, asi, ret, inf, notasData, alertasData })

      if (det?.error) {
        notify('error', det.error.message || 'Error al cargar alumno')
        setLoading(false)
        return
      }

      // Asignamos datos aunque algunas llamadas auxiliares hayan fallado.
      setAlumno(det?.data ?? null)

      setObservaciones(obs?.error ? [] : (obs.data ?? []))
      setAnotaciones(anot?.error ? [] : (anot.data ?? []))

      if (res?.error && res.error.message) {
        setResumen(null)
      } else {
        setResumen(res?.data ?? null)
      }

      const asistData = asi?.error ? [] : (asi.data ?? [])
      setAsistencias(asistData)
      // Inicializar mapa de asistencia y filas filtradas por la fecha seleccionada
      const map = {}
      for (const r of asistData) map[r.alumno_id] = r.estado
      setAsistenciaMap(map)
      const rows = asistData.filter((r) => toLocalIsoDate(r.fecha) === fechaAsist)
      setFechaAsistRows(rows)
      setRetiros(ret?.error ? [] : (ret.data ?? []))
      setInformes(inf?.error ? [] : (inf.data ?? []))
      setNotas(notasData?.error ? [] : (notasData.data ?? []))
      setAlertas(alertasData?.error ? null : (alertasData.data ?? null))

      // Si hubo errores en consultas auxiliares, notificamos cuáles fueron
      const mapping = {
        obs: 'observaciones',
        anot: 'anotaciones',
        asi: 'asistencia',
        ret: 'retiros',
        inf: 'informes',
        notasData: 'notas',
        alertasData: 'alertas',
      }

      const responses = { obs, anot, asi, ret, inf, notasData, alertasData }
      const failedKeys = Object.keys(responses).filter((k) => responses[k] && responses[k].error)
      if (failedKeys.length > 0) {
        const labels = failedKeys.map((k) => mapping[k] ?? k)
        const message = `Secciones con error: ${labels.join(', ')}`
        notify('error', message)
        setStatus({ type: 'error', msg: message })
      }

      setLoading(false)
    } catch (e) {
      notify('error', e?.message || 'Error inesperado al cargar detalle.')
      setLoading(false)
    }
  }

  const handleFechaAsistChange = async (fecha) => {
    setFechaAsist(fecha)
    // Filtrar las asistencias ya cargadas para el alumno según la fecha seleccionada
    try {
      const rows = (asistencias ?? []).filter((r) => toLocalIsoDate(r.fecha) === fecha)
      setFechaAsistRows(rows)
      // También actualizar el mapa simple por alumno si la información está disponible
      const map = {}
      for (const r of (asistencias ?? [])) map[r.alumno_id] = r.estado
      setAsistenciaMap(map)
    } catch (e) {
      setFechaAsistRows([])
      setAsistenciaMap({})
    }
  }


  useEffect(() => {
    if (!profile?.id) return
    if (!alumnoId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, alumnoId])

  const handleGuardarObservacion = async (e) => {
    e.preventDefault()
    if (!obsForm.tipo_intervencion || !String(obsForm.tipo_intervencion).trim()) {
      return notify('error', 'Selecciona el tipo de intervención.')
    }
    if (!obsForm.observacion.trim()) return notify('error', 'Escribe una observación.')
    if (!obsForm.resultado.trim()) return notify('error', 'Escribe el resultado.')
    if (!alumno) return

    const { error } = await createObservacionPie({
      alumnoId: alumno.id,
      pieId: profile.id,
      tipoIntervencion: obsForm.tipo_intervencion,
      observacion: obsForm.observacion.trim(),
      resultado: obsForm.resultado.trim(),
      actor: profile,
    })

    if (error) return notify('error', error.message)

    setObsForm({ tipo_intervencion: 'Observación general', observacion: '', resultado: '' })
    await load()
    notify('success', 'Observación guardada correctamente.')
  }


  const handleCrearRetiro = async (e) => {
    e.preventDefault()
    if (!retiroForm.motivo.trim()) return notify('error', 'Escribe el motivo.')
    if (!alumno) return

    const tieneRetiroActivo = retiros.some((r) => String(r.estado) === 'activo')
    if (tieneRetiroActivo) {
      return notify(
        'error',
        'El alumno ya posee un retiro activo. Debe registrar el retorno antes de crear un nuevo retiro.',
      )
    }

    const cursoId = alumno.curso_id

    const { error } = await createRetiroPie({
      alumnoId: alumno.id,
      cursoId,
      pieId: profile.id,
      motivo: retiroForm.motivo.trim(),
      tipo: retiroForm.tipo,
      actor: profile,
    })

    if (error) {
      // Mensaje amigable si la restricción única bloquea (por activación concurrente)
      const msg = error.message || ''
      if (msg.includes('unique constraint') || msg.includes('idx_pie_retiro_activo_unico') || msg.includes('duplicate key')) {
        return notify(
          'error',
          'El alumno ya posee un retiro activo. Debe registrar el retorno antes de crear un nuevo retiro.',
        )
      }
      return notify('error', error.message)
    }

    setRetiroOpen(false)
    setRetiroForm({ motivo: '', tipo: 'retiro' })
    await load()
    notify('success', 'Retiro registrado.')
  }

  const handleRegistrarRetorno = async (retiroId) => {
    const { error } = await registrarRetornoPie(retiroId, profile)

    if (error) {
      notify('error', error.message)
      return
    }

    await load()
    notify('success', 'Retorno registrado correctamente.')
  }





  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando detalle PIE...
      </div>
    )
  }

  if (!alumno) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🧩</div>
        <p>No se pudo cargar el alumno PIE.</p>
        {debugLoads && (
          <details style={{ marginTop: 12 }}>
            <summary>Ver diagnóstico de carga (solo para depuración)</summary>
            <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(debugLoads, null, 2)}
            </pre>
          </details>
        )}
        <button className="button ghost" onClick={() => navigate('/pie/dashboard')}>← Volver</button>
      </div>
    )
  }

  // Mostrar diagnóstico también cuando alumno se carga (útil para identificar secciones con error)
  const diagPanel = debugLoads ? (
    <details style={{ marginTop: 12 }}>
      <summary>Ver diagnóstico de carga (solo para depuración)</summary>
      <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(debugLoads, null, 2)}
      </pre>
    </details>
  ) : null

  return (
    <div>
      <div className="card section" style={{ paddingBottom: 18 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="card-title">{alumno.nombre}</div>
            <div className="card-subtitle">Curso: {formatCurso(alumno.cursos)} · Historial PIE</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`badge ${pieEstado.cls}`}>{pieEstado.label}</span>
            <button className="button ghost" onClick={() => navigate('/pie/dashboard')}>← Volver</button>
          </div>
        </div>
      </div>

      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Resumen Académico</div>
              <div className="card-subtitle">Indicadores académicos y asistencia</div>
            </div>
          </div>

          {resumen == null ? (
            <div className="empty-state" style={{ paddingTop: 4 }}>
              <div className="empty-state-icon">📊</div>
              <p>No existe resumen académico disponible para este alumno.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>Promedio académico</div>
                  <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginTop: 4 }}>
                    {resumen.promedio_notas ?? '—'}
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>% Asistencia</div>
                  <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginTop: 4 }}>
                    {resumen.porcentaje_asistencia ?? '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span
                  className="badge"
                  style={{
                    background: resumen.riesgo_academico === true ? 'var(--red)' : 'var(--green)',
                    color: 'white',
                  }}
                >
                  Riesgo académico: {resumen.riesgo_academico === true ? 'Alto' : 'Bajo'}
                </span>

                <span
                  className="badge"
                  style={{
                    background: resumen.riesgo_asistencia === true ? 'var(--red)' : 'var(--green)',
                    color: 'white',
                  }}
                >
                  Riesgo asistencia: {resumen.riesgo_asistencia === true ? 'Alto' : 'Bajo'}
                </span>
              </div>

              <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                Nivel: {resumen.nivel ?? '—'} · Letra: {resumen.letra ?? '—'}
              </div>
            </div>
          )}
        </div>

        <div className="tab-strip">
          {[
            { key: 'observaciones', label: `Observaciones (${observaciones.length})` },
            { key: 'anotaciones', label: `Anotaciones (${anotaciones.length})` },
            { key: 'asistencia', label: `Asistencia (${asistencias.length})` },
            { key: 'retiros', label: `Retiros (${retiros.length})` },
            { key: 'informes', label: `Informes (${informes.length})` },
            { key: 'notas', label: `Notas (${notas.length})` },
            { key: 'alertas', label: `Alertas` },
          ].map(({ key, label }) => (
            <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>


      {tab === 'observaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">A) Observaciones PIE</div>
                <div className="card-subtitle">Historial con fecha y contenido</div>
              </div>
            </div>

            {observaciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No hay observaciones registradas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {observaciones.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--blue)',
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span className="badge" style={{ background: 'var(--blue)', color: 'white' }}>
                          {o.tipo_intervencion ?? '—'}
                        </span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--gray-900)', marginBottom: 6 }}>
                        <strong>Observación:</strong>{' '}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{o.observacion ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--gray-900)' }}>
                        <strong>Resultado:</strong>{' '}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{o.resultado ?? '—'}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                      {formatFecha(o.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Agregar observación</div>
                <div className="card-subtitle">Se registra en pie_observaciones</div>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleGuardarObservacion}>
              <div className="form-group full">
                <label className="form-label">Tipo de intervención</label>
                <select
                  className="form-select"
                  value={obsForm.tipo_intervencion}
                  onChange={(e) => setObsForm((p) => ({ ...p, tipo_intervencion: e.target.value }))}
                  required
                >
                  <option value="Observación general">Observación general</option>
                  <option value="Intervención">Intervención</option>
                  <option value="Control rápido">Control rápido</option>
                  <option value="Seguimiento emocional">Seguimiento emocional</option>
                  <option value="Seguimiento conductual">Seguimiento conductual</option>
                  <option value="Apoyo pedagógico">Apoyo pedagógico</option>
                </select>
              </div>

              <div className="form-group full">
                <label className="form-label">Resultado</label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Describe el resultado de la intervención..."
                  value={obsForm.resultado}
                  onChange={(e) => setObsForm((p) => ({ ...p, resultado: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label">Observación</label>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ resize: 'vertical' }}
                  placeholder="Escribe la observación..."
                  value={obsForm.observacion}
                  onChange={(e) => setObsForm((p) => ({ ...p, observacion: e.target.value }))}
                  required
                />
              </div>
              <div className="form-actions">
                <button className="button primary" type="submit">Guardar</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {tab === 'asistencia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Asistencia PIE</div>
                <div className="card-subtitle">Selecciona fecha del calendario para ver resumen de asistencia</div>
              </div>
            </div>

            {!alumno?.curso_id ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p>No está disponible el curso del alumno para consultar asistencia.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaAsist}
                    onChange={(e) => { setShowAllAsistencia(false); void handleFechaAsistChange(e.target.value) }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  <button
                    type="button"
                    className="button"
                    onClick={() => setShowAllAsistencia((s) => !s)}
                  >
                    {showAllAsistencia ? 'Ocultar todo' : 'Mostrar todo'}
                  </button>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className="badge">Curso: {alumno.cursos ? `${alumno.cursos.nivel}°${alumno.cursos.letra}` : '—'}</span>
                </div>
              </div>
            )}
            {showAllAsistencia ? (
              asistencias.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <p>No hay registros de asistencia para este alumno.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Asignatura</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistencias.map((a, idx) => {
                        const estadoRaw = a.estado ?? ''
                        const estado = String(estadoRaw).trim().toLowerCase()
                        const isPresente = estado === 'presente'
                        const isAusente = estado === 'ausente'
                        const badgeBg = isPresente ? 'var(--green)' : isAusente ? 'var(--red)' : 'var(--gray-300)'
                        const badgeColor = 'black'
                        return (
                          <tr key={String(a.asistencia_id ?? a.id ?? idx)}>
                            <td style={{ color: 'var(--muted)' }}>{formatFecha(a.fecha)}</td>
                            <td>{a.asignatura ?? '—'}</td>
                            <td>
                              <span className="badge" style={{ background: badgeBg, color: badgeColor }}>
                                {a.estado ?? '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : fechaAsistRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p>No hay registros de asistencia para la fecha seleccionada.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Asignatura</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechaAsistRows.map((a, idx) => {
                      const estadoRaw = a.estado ?? ''
                      const estado = String(estadoRaw).trim().toLowerCase()
                      const isPresente = estado === 'presente'
                      const isAusente = estado === 'ausente'
                      const badgeBg = isPresente ? 'var(--green)' : isAusente ? 'var(--red)' : 'var(--gray-300)'
                      const badgeColor = 'black'
                      return (
                        <tr key={String(a.asistencia_id ?? a.id ?? idx)}>
                          <td style={{ color: 'var(--muted)' }}>{formatFecha(a.fecha)}</td>
                          <td>{a.asignatura ?? '—'}</td>
                          <td>
                            <span className="badge" style={{ background: badgeBg, color: badgeColor }}>
                              {a.estado ?? '—'}
                            </span>
                          </td>
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

      {tab === 'anotaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Anotaciones PIE</div>
                <div className="card-subtitle">Positivas y negativas con fecha y descripción</div>
              </div>
            </div>

            {anotaciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No hay anotaciones registradas para este alumno.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {anotaciones.map((a) => {
                  const tipo = a.tipo ?? '—'
                  const isPos = String(tipo) === 'positiva'
                  const badgeBg = isPos ? 'var(--green)' : 'var(--red)'
                  const badgeColor = 'black'

                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--gray-50)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${isPos ? 'var(--green)' : 'var(--red)'}`,
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <span
                          className="badge"
                          style={{
                            background: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          {tipo}
                        </span>
                      </div>

                      <div style={{ fontSize: '.78rem', color: 'var(--gray-900)', marginBottom: 6 }}>
                        <strong>Descripción:</strong>{' '}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{a.descripcion ?? '—'}</span>
                      </div>

                      <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatFecha(a.fecha)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'informes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">C) Informes internos PIE</div>
                <div className="card-subtitle">Adjunta y revisa documentos del alumno</div>
              </div>
            </div>

            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault()

                if (!informeForm.titulo.trim()) {
                  return notify('error', 'Debe ingresar un título.')
                }

                if (!informeForm.archivo) {
                  return notify('error', 'Debe seleccionar un archivo.')
                }

                if (!alumno || !profile?.id) return

                const file = informeForm.archivo

                const uploadRes = await uploadInformePie(file, alumno.id)
                if (uploadRes.error) return notify('error', uploadRes.error.message)
                if (!uploadRes.data?.path) return notify('error', 'No se pudo obtener la ruta del archivo.')

                const { error } = await createInformePie({
                  alumnoId: alumno.id,
                  pieId: profile.id,
                  titulo: informeForm.titulo.trim(),
                  descripcion: informeForm.descripcion.trim(),
                  archivo_url: uploadRes.data.path,
                  nombre_archivo: file.name,
                })

                if (error) return notify('error', error.message)

                setInformeForm({ titulo: '', descripcion: '', archivo: null })
                await load()
                notify('success', 'Informe subido correctamente.')
              }}
            >
              <div className="form-group full">
                <label className="form-label">Título</label>
                <input
                  className="form-input"
                  placeholder="Ej: Informe conductual mayo"
                  value={informeForm.titulo}
                  onChange={(e) => setInformeForm((p) => ({ ...p, titulo: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Opcional: agrega una breve descripción del informe..."
                  value={informeForm.descripcion}
                  onChange={(e) => setInformeForm((p) => ({ ...p, descripcion: e.target.value }))}
                />
              </div>

              <div className="form-group full">
                <label className="form-label">Archivo</label>
                <input
                  className="form-input"
                  type="file"
                  accept=".pdf,.docx,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setInformeForm((p) => ({ ...p, archivo: f }))
                  }}
                  required
                />
              </div>

              <div className="form-actions">
                <button className="button primary" type="submit">Subir informe</button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Listado de informes</div>
                <div className="card-subtitle">Ordenado por fecha descendente</div>
              </div>
            </div>

            {informes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <p>No hay informes registrados.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {informes.map((inf) => (
                  <div
                    key={inf.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--blue)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{inf.titulo ?? '—'}</div>
                      <div style={{ color: 'var(--gray-900)' }}>
                        <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>Descripción:</span>{' '}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{inf.descripcion ?? '—'}</span>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '.74rem' }}>{formatFecha(inf.created_at)}</div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                        <span className="badge default">{inf.nombre_archivo ?? 'archivo'}</span>

                        <button
                          className="button primary"
                          style={{ padding: '6px 12px', fontSize: '.78rem' }}
                          type="button"
                          onClick={async () => {
                            const urlRes = await getInformeUrl(inf.archivo_url)
                            if (urlRes.error) return notify('error', urlRes.error.message)
                            if (!urlRes.data.url) return notify('error', 'No se pudo generar la URL del informe.')
                            window.open(urlRes.data.url, '_blank', 'noopener,noreferrer')
                          }}
                        >
                          Ver informe
                        </button>

                        <button
                          className="button ghost"
                          style={{ padding: '6px 12px', fontSize: '.78rem' }}
                          type="button"
                          onClick={async () => {
                            const urlRes = await getInformeUrl(inf.archivo_url)
                            if (urlRes.error) return notify('error', urlRes.error.message)
                            if (!urlRes.data.url) return notify('error', 'No se pudo generar la URL del informe.')

                            const a = document.createElement('a')
                            a.href = urlRes.data.url
                            a.target = '_blank'
                            a.rel = 'noopener'
                            if (inf.nombre_archivo) a.download = inf.nombre_archivo
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                          }}
                        >
                          Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'notas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Notas</div>
                <div className="card-subtitle">Fechas, asignatura, evaluación y nota</div>
              </div>
            </div>

            {notas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No hay notas registradas para este alumno.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Asignatura</th>
                      <th>Evaluación</th>
                      <th>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map((n, idx) => {
                      const notaNum = typeof n.nota === 'number' ? n.nota : Number(n.nota)
                      const esNumero = !Number.isNaN(notaNum)

                      const badgeBg = esNumero && notaNum < 4.0 ? 'var(--red)' : 'var(--green)'
                      const badgeColor = 'black'

                      return (
                        <tr key={String(n.nota_id ?? n.id ?? idx)}>
                          <td style={{ color: 'var(--muted)' }}>{formatFecha(n.fecha)}</td>
                          <td>{n.asignatura ?? '—'}</td>
                          <td>{n.evaluacion ?? '—'}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {esNumero ? notaNum.toFixed(1) : '—'}
                            </span>
                          </td>
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

      {tab === 'alertas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Alertas PIE</div>
                <div className="card-subtitle">Indicadores de riesgo académico, asistencia y conducta</div>
              </div>
            </div>

            {alertas == null ? (
              <div className="empty-state" style={{ paddingTop: 4 }}>
                <div className="empty-state-icon">✅</div>
                <p>No existen alertas para este alumno.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>Promedio general</div>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginTop: 4 }}>
                      {alertas.promedio_general ?? '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>% Asistencia</div>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginTop: 4 }}>
                      {alertas.porcentaje_asistencia ?? '—'}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>Anotaciones negativas</div>
                  <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginTop: 4 }}>
                    {alertas.anotaciones_negativas ?? '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{
                      background: alertas.alerta_promedio === true ? 'var(--red)' : 'var(--green)',
                      color: 'white',
                    }}
                  >
                    {alertas.alerta_promedio === true ? 'Riesgo académico detectado' : 'Sin riesgo académico'}
                  </span>

                  <span
                    className="badge"
                    style={{
                      background: alertas.alerta_asistencia === true ? 'var(--red)' : 'var(--green)',
                      color: 'white',
                    }}
                  >
                    {alertas.alerta_asistencia === true ? 'Riesgo de asistencia detectado' : 'Asistencia sin riesgos'}
                  </span>

                  <span
                    className="badge"
                    style={{
                      background: alertas.alerta_conducta === true ? 'var(--red)' : 'var(--green)',
                      color: 'white',
                    }}
                  >
                    {alertas.alerta_conducta === true ? 'Riesgo conductual detectado' : 'Conducta sin riesgos'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'retiros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>


          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">B) Retiros de clase</div>
                <div className="card-subtitle">Motivo, estado y fecha</div>
              </div>
              <div>
                {retiros.some((r) => String(r.estado) === 'activo') ? (
                  <>
                    <div className="badge" style={{ background: 'var(--blue)', color: 'white' }}>
                      Alumno actualmente retirado de clases
                    </div>
                  </>
                ) : (
                  <button className="button primary" onClick={() => setRetiroOpen(true)}>
                    Retirar de clase
                  </button>
                )}
              </div>

            </div>

            {retiros.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚪</div>
                <p>No hay retiros registrados.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Fecha Retorno</th>
                      <th>Hora Retorno</th>

                    </tr>
                  </thead>
                  <tbody>
                    {retiros.map((r) => (
                      <tr key={r.id}>
                        <td><span className="badge default">{r.tipo}</span></td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{r.motivo}</td>
                      <td>
                          {String(r.estado) === 'activo' ? (
                            <button
                              className="button primary"
                              style={{ padding: '6px 12px', fontSize: '.78rem' }}
                              onClick={() => handleRegistrarRetorno(r.id)}
                            >
                              Registrar retorno
                            </button>
                          ) : (
                            <span className="badge" style={{ background: 'var(--blue)', color: 'white' }}>
                              Retornado
                            </span>
                          )}

                        </td>

                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.created_at)}</td>
                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.fecha_retorno)}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.hora_retorno ?? '—'}</td>
                      </tr>

                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {retiroOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 1200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 560,
                  background: 'white',
                  borderRadius: '18px',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                  overflow: 'hidden',
                }}
              >
                <div className="card-header" style={{ marginBottom: 0, padding: '24px 24px 16px' }}>
                  <div>
                    <div className="card-title">Registrar retiro</div>
                    <div className="card-subtitle">Crea un registro en pie_retiros</div>
                  </div>
                  <button className="button ghost" onClick={() => setRetiroOpen(false)}>✕ Cerrar</button>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                  <form className="form-grid" onSubmit={handleCrearRetiro}>
                    <div className="form-group full">
                      <label className="form-label">Motivo</label>
                      <input
                        className="form-input"
                        placeholder="Describe el motivo del retiro..."
                        value={retiroForm.motivo}
                        onChange={(e) => setRetiroForm((p) => ({ ...p, motivo: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select
                        className="form-select"
                        value={retiroForm.tipo}
                        onChange={(e) => setRetiroForm((p) => ({ ...p, tipo: e.target.value }))}
                      >
                        <option value="retiro">retiro</option>
                        <option value="apoyo">apoyo</option>
                      </select>
                    </div>

                    <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="button primary" type="submit">Guardar</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

