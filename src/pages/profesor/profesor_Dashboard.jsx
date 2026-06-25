// src/pages/profesor/profesor_Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'


import {
  getProfesorCursos,
  getAlumnosPorCurso,
  getEvaluacionesProfesor,
  getNotasPorEvaluacion,
  getAsistenciaCursoFecha,
  getAnotacionesProfesor,
  getAlertasPorCurso,
  crearEvaluacion,
  guardarNota,
  registrarAsistenciaMasiva,
  crearAnotacion,
  crearRetiro,
  crearObservacion,
  getObservacionesPorAlumno,
  getRetirosPiePorAlumno,
  getHistorialAsistenciaProfesor,
} from '../../services/profesorService'

const hoy = new Date().toISOString().slice(0, 10)

export default function ProfesorDashboard({ profile }) {
  const [tab, setTab] = useState('notas')

  const [historialAsistencia, setHistorialAsistencia] = useState([])
  const [loadingHistorialAsistencia, setLoadingHistorialAsistencia] = useState(false)

  const [cursoAsig, setCursoAsig] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [anotaciones, setAnotaciones] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [cursoId, setCursoId] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')

  const [searchAlumno, setSearchAlumno] = useState('')

  const alumnosFiltrados = useMemo(() => {
    const q = searchAlumno.trim().toLowerCase()
    if (!q) return alumnos
    return alumnos.filter(a => (a?.nombre ?? '').toLowerCase().includes(q))
  }, [alumnos, searchAlumno])

  const alertasAgrupadas = useMemo(() => {
    const map = new Map()

    for (const a of alertas ?? []) {
      const alumnoId = a.alumno_id
      if (!alumnoId) continue

      const existente = map.get(alumnoId)
      if (!existente) {
        map.set(alumnoId, {
          alumno_id: alumnoId,
          alumno: a.alumno ?? '—',

          alerta_promedio: !!a.alerta_promedio,
          alerta_asistencia: !!a.alerta_asistencia,
          alerta_conducta: !!a.alerta_conducta,

          porcentaje_asistencia: a.porcentaje_asistencia ?? null,
          promedio_general: a.promedio_general ?? null,
          anotaciones_negativas: a.anotaciones_negativas ?? 0,
        })
        continue
      }

      existente.alerta_promedio = existente.alerta_promedio || !!a.alerta_promedio
      existente.alerta_asistencia = existente.alerta_asistencia || !!a.alerta_asistencia
      existente.alerta_conducta = existente.alerta_conducta || !!a.alerta_conducta

      // Numéricos:
      // - porcentaje_asistencia: usar MÁS BAJO
      // - promedio_general: usar MÁS BAJO
      // - anotaciones_negativas: usar MÁS ALTO
      const pct = a.porcentaje_asistencia
      if (pct != null) {
        if (existente.porcentaje_asistencia == null) existente.porcentaje_asistencia = pct
        else existente.porcentaje_asistencia = Math.min(Number(existente.porcentaje_asistencia), Number(pct))
      }

      const prom = a.promedio_general
      if (prom != null) {
        if (existente.promedio_general == null) existente.promedio_general = prom
        else existente.promedio_general = Math.min(Number(existente.promedio_general), Number(prom))
      }

      const neg = a.anotaciones_negativas
      if (neg != null) {
        existente.anotaciones_negativas = Math.max(Number(existente.anotaciones_negativas ?? 0), Number(neg))
      }
    }

    return Array.from(map.values())
  }, [alertas])

  const alertasFiltradas = useMemo(() => {
    const q = searchAlumno.trim().toLowerCase()
    const lista = alertasAgrupadas
    if (!q) return lista
    return lista.filter(a => (a?.alumno ?? '').toLowerCase().includes(q))
  }, [alertasAgrupadas, searchAlumno])


  const [evalSelId, setEvalSelId] = useState('')
  const [notasEval, setNotasEval] = useState([])
  const [notasInput, setNotasInput] = useState({})
  const [loadingNotas, setLoadingNotas] = useState(false)

  const [fechaAsist, setFechaAsist] = useState(hoy)
  const [asistencia, setAsistencia] = useState({})
  const [asistenciaGuardada, setAsistenciaGuardada] = useState({})

  const [evalForm, setEvalForm] = useState({ nombre: '', porcentaje: 20, fecha: hoy })
  const [anotForm, setAnotForm] = useState({ alumnoId: '', tipo: 'positiva', descripcion: '' })
  const [retiroForm, setRetiroForm] = useState({ alumnoId: '' })
  const [retirosHist, setRetirosHist] = useState([])
  const [loadingRetirosHist, setLoadingRetirosHist] = useState(false)
  const [obsForm, setObsForm] = useState({ alumnoId: '', contenido: '' })
  const [observacionesHist, setObservacionesHist] = useState([])
  const [loadingObservacionesHist, setLoadingObservacionesHist] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    loadBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    const run = async () => {
      if (!obsForm.alumnoId) {
        setObservacionesHist([])
        return
      }
      setLoadingObservacionesHist(true)
      const { data, error } = await getObservacionesPorAlumno(obsForm.alumnoId)
      if (!error) setObservacionesHist(data ?? [])
      else setObservacionesHist([])
      setLoadingObservacionesHist(false)
    }
    run()
  }, [obsForm.alumnoId])

  useEffect(() => {
    const run = async () => {
      if (tab !== 'historial_asistencia') return
      if (!cursoId) {
        setHistorialAsistencia([])
        return
      }
      setLoadingHistorialAsistencia(true)
      const { data, error } = await getHistorialAsistenciaProfesor({
        profesorId: profile?.id,
        cursoId,
        asignaturaId: asignaturaId || undefined,
      })
      if (!error) setHistorialAsistencia(data ?? [])
      else setHistorialAsistencia([])
      setLoadingHistorialAsistencia(false)
    }
    run()
  }, [tab, cursoId, asignaturaId, profile?.id])

  useEffect(() => {
    const run = async () => {
      if (!retiroForm.alumnoId) {
        setRetirosHist([])
        return
      }
      setLoadingRetirosHist(true)
      const { data, error } = await getRetirosPiePorAlumno({
        alumnoId: retiroForm.alumnoId,
        cursoId: cursoId || undefined,
      })
      if (!error) setRetirosHist(data ?? [])
      else setRetirosHist([])
      setLoadingRetirosHist(false)
    }
    run()
  }, [retiroForm.alumnoId, cursoId])

  const loadBase = async () => {
    setLoading(true)

    const [ca, ev, an] = await Promise.all([
      getProfesorCursos(profile.id),
      getEvaluacionesProfesor(profile.id),
      getAnotacionesProfesor(profile.id),
    ])
    setCursoAsig(ca.data ?? [])
    setEvaluaciones(ev.data ?? [])
    setAnotaciones(an.data ?? [])
    setLoading(false)
  }

  const cursoMap = useMemo(() => {
    const map = {}
    for (const item of cursoAsig) {
      const id = item.cursos.id
      if (!map[id]) map[id] = { ...item.cursos, asignaturas: [] }
      map[id].asignaturas.push(item.asignaturas)
    }
    return map
  }, [cursoAsig])

  const cursoList = Object.values(cursoMap)
  const asignaturasDelCurso = cursoId ? (cursoMap[cursoId]?.asignaturas ?? []) : []

  const handleFechaAsistChange = async fecha => {
    setFechaAsist(fecha)
    if (!cursoId) return
    const { data } = await getAsistenciaCursoFecha(cursoId, fecha)
    const map = {}
    alumnos.forEach(a => {
      map[a.id] = null
    })
    for (const r of data ?? []) map[r.alumno_id] = r.estado
    setAsistencia(map)
    setAsistenciaGuardada({ ...map })
  }

  const handleCursoChange = async id => {
    setCursoId(id)
    setAsignaturaId('')
    setAlumnos([])
    setAlertas([])
    setAsistencia({})
    setAsistenciaGuardada({})
    setNotasEval([])
    setEvalSelId('')
    if (!id) return

    const [al, ale] = await Promise.all([getAlumnosPorCurso(id), getAlertasPorCurso(id)])
    const listaAlumnos = al.data ?? []
    setAlumnos(listaAlumnos)
    setAlertas(ale.data ?? [])

    const { data } = await getAsistenciaCursoFecha(id, fechaAsist)
    const map = {}
    listaAlumnos.forEach(a => {
      map[a.id] = null
    })
    for (const r of data ?? []) map[r.alumno_id] = r.estado
    setAsistencia(map)
    setAsistenciaGuardada({ ...map })
  }

  const handleEvalChange = async id => {
    setEvalSelId(id)
    if (!id) {
      setNotasEval([])
      setNotasInput({})
      return
    }
    setLoadingNotas(true)
    const { data } = await getNotasPorEvaluacion(id)
    const notasMap = {}
    for (const n of data ?? []) notasMap[n.alumno_id] = n.nota

    const merged = alumnos.map(a => ({
      alumno_id: a.id,
      nombre: a.nombre,
      nota: notasMap[a.id] ?? '',
    }))
    setNotasEval(merged)

    const inputInit = {}
    merged.forEach(n => {
      inputInit[n.alumno_id] = n.nota
    })
    setNotasInput(inputInit)
    setLoadingNotas(false)
  }

  const navigate = useNavigate()

  const handleGoAlumno = alumnoId => {
    if (!alumnoId) return
    navigate(`/profesor/alumno/${alumnoId}`)
  }

  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 4000)
  }


  const handleGuardarNotas = async () => {
    const pendientes = notasEval
      .filter(n => notasInput[n.alumno_id] !== '' && notasInput[n.alumno_id] != null)
      .map(n => guardarNota({ evaluacionId: evalSelId, alumnoId: n.alumno_id, nota: notasInput[n.alumno_id] }))

    const resultados = await Promise.all(pendientes)
    const errores = resultados.filter(r => r.error)
    if (errores.length) notify('error', `${errores.length} nota(s) no se pudieron guardar.`)
    else notify('success', 'Notas guardadas correctamente.')
  }

  const handleGuardarAsistencia = async () => {
    if (!cursoId) return notify('error', 'Selecciona un curso primero.')
    if (!asignaturaId) return notify('error', 'Selecciona una asignatura primero.')
    if (!profile?.id) return notify('error', 'Profesor no disponible.')

    const registros = Object.entries(asistencia)
      .filter(([, estado]) => estado !== null)
      .map(([alumnoId, estado]) => ({ alumnoId, estado }))

    const { error } = await registrarAsistenciaMasiva(cursoId, asignaturaId, profile.id, fechaAsist, registros)
    if (error) return notify('error', 'Error al guardar asistencia: ' + error.message)

    setAsistenciaGuardada({ ...asistencia })
    notify('success', 'Asistencia registrada correctamente.')
  }

  const handleCrearEval = async e => {
    e.preventDefault()
    if (!cursoId || !asignaturaId || !evalForm.nombre) return notify('error', 'Selecciona curso, asignatura y nombre.')

    const { error } = await crearEvaluacion({
      nombre: evalForm.nombre,
      asignaturaId,
      profesorId: profile.id,
      cursoId,
      porcentaje: evalForm.porcentaje,
      fecha: evalForm.fecha,
    })

    if (error) return notify('error', 'Error: ' + error.message)

    notify('success', 'Evaluación creada.')
    setEvalForm({ nombre: '', porcentaje: 20, fecha: hoy })
    const { data } = await getEvaluacionesProfesor(profile.id)
    setEvaluaciones(data ?? [])
  }

  const handleCrearAnotacion = async e => {
    e.preventDefault()
    if (!anotForm.alumnoId || !anotForm.descripcion) return notify('error', 'Selecciona alumno y escribe una descripción.')

    const { error } = await crearAnotacion({
      alumnoId: anotForm.alumnoId,
      profesorId: profile.id,
      tipo: anotForm.tipo,
      descripcion: anotForm.descripcion,
    })

    if (error) return notify('error', 'Error: ' + error.message)

    notify('success', 'Anotación guardada.')
    setAnotForm(p => ({ ...p, descripcion: '' }))
    const { data } = await getAnotacionesProfesor(profile.id)
    setAnotaciones(data ?? [])
  }

  // Retiros: ahora solo lectura (gestionados por PIE)

  const handleCrearObservacion = async e => {
    e.preventDefault()
    if (!obsForm.alumnoId || !obsForm.contenido) return notify('error', 'Selecciona alumno y escribe la observación.')

    const { error } = await crearObservacion({
      alumnoId: obsForm.alumnoId,
      profesorId: profile.id,
      contenido: obsForm.contenido,
    })

    if (error) return notify('error', 'Error: ' + error.message)

    notify('success', 'Observación guardada.')
    const alumnoId = obsForm.alumnoId
    setObsForm(p => ({ ...p, contenido: '' }))

    setLoadingObservacionesHist(true)
    const { data, error: errorHist } = await getObservacionesPorAlumno(alumnoId)
    if (!errorHist) setObservacionesHist(data ?? [])
    else setObservacionesHist([])
    setLoadingObservacionesHist(false)
  }

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando panel...
      </div>
    )
  }

  const hoyDate = new Date()
  hoyDate.setHours(0, 0, 0, 0)
  const fechaDate = new Date(fechaAsist + 'T00:00:00')
  const diffDias = Math.floor((hoyDate - fechaDate) / 86400000)
  const asistBloqueada = diffDias > 3

  return (
    <div>
      {/* Stats */}
      <div className="grid-4 section">
        {[
          { icon: '🏫', value: cursoList.length, label: 'Cursos asignados', cls: 'lime' },
          { icon: '📋', value: evaluaciones.length, label: 'Evaluaciones', cls: 'blue' },
          { icon: '👥', value: alumnos.length || '—', label: 'Alumnos en curso', cls: 'green' },
          { icon: '⚠️', value: alertas.length || '—', label: 'Alertas en curso', cls: 'red' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Selector de curso */}
      <div className="card section">
        <div className="card-title" style={{ marginBottom: 12 }}>
          Curso de trabajo
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ minWidth: 180 }} value={cursoId} onChange={e => handleCursoChange(e.target.value)}>
            <option value="">— Elegir curso —</option>
            {cursoList.map(c => (
              <option key={c.id} value={c.id}>
                {c.nivel}°{c.letra}
              </option>
            ))}
          </select>

          {cursoId && (
            <select className="form-select" style={{ minWidth: 180 }} value={asignaturaId} onChange={e => setAsignaturaId(e.target.value)}>
              <option value="">— Elegir asignatura —</option>
              {asignaturasDelCurso.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          )}

          {alumnos.length > 0 && <span className="badge default">{alumnos.length} alumnos</span>}
          {alertas.length > 0 && <span className="badge negativa">⚠️ {alertas.length} alertas</span>}
        </div>
      </div>

      {/* Buscador */}
      {cursoId && (
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <input
            className="form-input"
            placeholder="Buscar alumno..."
            value={searchAlumno}
            onChange={e => setSearchAlumno(e.target.value)}
          />
        </div>
      )}

      {/* Alertas del curso */}
      {alertas.length > 0 && (
        <div className="card section" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Alertas en este curso
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Promedio</th>
                  <th>Asistencia</th>
                  <th>Anot. neg.</th>
                  <th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 14 }}>
                      No hay alertas que coincidan con tu búsqueda.
                    </td>
                  </tr>
                ) : (
                  alertasFiltradas.map(a => (
                    <tr key={a.alumno_id}>
                      <td>
                        <strong
                          onClick={() => handleGoAlumno(a.alumno_id)}
                          style={{ cursor: 'pointer', color: 'var(--blue)', userSelect: 'none' }}
                          title="Ver ficha"
                        >
                          {a.alumno}
                        </strong>
                      </td>
                      <td>
                        {a.promedio_general != null ? (
                          <span className={`nota-pill ${a.promedio_general < 4 ? 'baja' : 'media'}`}>{a.promedio_general}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {a.porcentaje_asistencia != null ? (
                          <span className={`badge ${a.porcentaje_asistencia < 85 ? 'negativa' : 'positiva'}`}>{a.porcentaje_asistencia}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge ${a.anotaciones_negativas >= 3 ? 'negativa' : 'default'}`}>{a.anotaciones_negativas}</span>
                      </td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {a.alerta_promedio && <span className="badge negativa">Promedio</span>}
                        {a.alerta_asistencia && <span className="badge negativa">Asistencia</span>}
                        {a.alerta_conducta && <span className="badge negativa">Conducta</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-strip">
        {[
          { key: 'notas', label: 'Notas' },
          { key: 'asistencia', label: 'Asistencia' },
          { key: 'historial_asistencia', label: 'Historial Asistencia' },
          { key: 'anotaciones', label: 'Anotaciones' },
          { key: 'retiros', label: 'Retiros' },
          { key: 'observacion', label: 'Observaciones' },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {status && (
        <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>
          {status.msg}
        </div>
      )}

      {/* Tab: Notas */}
      {tab === 'notas' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Ingreso de notas</div>
              <div className="card-subtitle">Selecciona una evaluación para ingresar o editar notas</div>
            </div>
          </div>

          {!cursoId ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏫</div>
              <p>Selecciona un curso primero.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Evaluación
                </label>
                <select className="form-select" style={{ maxWidth: 360 }} value={evalSelId} onChange={e => handleEvalChange(e.target.value)}>
                  <option value="">— Elegir evaluación —</option>
                  {evaluaciones
                    .filter(e => {
                      const curs = cursoMap[cursoId]
                      return curs && e.cursos?.nivel === curs.nivel && e.cursos?.letra === curs.letra
                    })
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.asignaturas?.nombre} — {e.nombre} ({e.fecha})
                      </option>
                    ))}
                </select>
              </div>

              {loadingNotas && (
                <div className="loading-wrap">
                  <div className="spinner" />
                </div>
              )}

              {!loadingNotas && evalSelId && notasEval.length > 0 && (
                <>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Alumno</th>
                          <th style={{ width: 160 }}>Nota (1.0 – 7.0)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasEval.map(n => (
                          <tr key={n.alumno_id}>
                            <td>{n.nombre}</td>
                            <td>
                              <input
                                className="form-input"
                                type="number"
                                min="1"
                                max="7"
                                step="0.1"
                                style={{ width: 100 }}
                                value={notasInput[n.alumno_id] ?? ''}
                                onChange={e => setNotasInput(p => ({ ...p, [n.alumno_id]: e.target.value }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="button primary" onClick={handleGuardarNotas}>
                      Guardar notas
                    </button>
                  </div>
                </>
              )}

              {!loadingNotas && evalSelId && notasEval.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <p>No hay alumnos en este curso.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Asistencia */}
      {tab === 'asistencia' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registro de asistencia</div>
            {asistBloqueada && <span className="badge negativa">Solo lectura — más de 3 días</span>}
          </div>

          <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fecha</label>
              <input
                className="form-input"
                type="date"
                style={{ maxWidth: 200 }}
                value={fechaAsist}
                max={hoy}
                onChange={e => handleFechaAsistChange(e.target.value)}
              />
            </div>

            {alumnos.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge presente">{Object.values(asistencia).filter(e => e === 'presente').length} presentes</span>
                <span className="badge ausente">{Object.values(asistencia).filter(e => e === 'ausente').length} ausentes</span>
                <span className="badge justificado">{Object.values(asistencia).filter(e => e === 'justificado').length} justificados</span>
                <span className="badge default">{Object.values(asistencia).filter(e => e === null).length} sin marcar</span>
              </div>
            )}
          </div>

          {asistBloqueada && (
            <div className="alert info" style={{ marginBottom: 16 }}>
              Esta fecha tiene más de 3 días. Solo el administrador puede modificar registros anteriores.
            </div>
          )}

          {!cursoId ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏫</div>
              <p>Selecciona un curso primero.</p>
            </div>
          ) : alumnosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>No hay alumnos en este curso.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Marcar</th>
                      <th style={{ width: 120, textAlign: 'center' }}>Guardado en BD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map(a => {
                      const estadoActual = asistencia[a.id]
                      const estadoGuardado = asistenciaGuardada[a.id]
                      const hayCambio = estadoActual !== estadoGuardado && estadoActual !== null

                      return (
                        <tr key={a.id} style={{ background: hayCambio ? 'rgba(43,108,176,.04)' : undefined }}>
                          <td>
                            <strong
                              onClick={() => handleGoAlumno(a.id)}
                              style={{ cursor: 'pointer', color: 'var(--blue)', userSelect: 'none' }}
                              title="Ver ficha"
                            >
                              {a.nombre}
                            </strong>
                            {hayCambio && (

                              <span style={{ marginLeft: 8, fontSize: '.7rem', color: 'var(--blue)', fontWeight: 600 }}>modificado</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['presente', 'ausente', 'justificado'].map(est => {
                                const activo = estadoActual === est
                                const colores = {
                                  presente: { activo: 'var(--success)', borde: '#276749' },
                                  ausente: { activo: 'var(--danger)', borde: '#c53030' },
                                  justificado: { activo: 'var(--warning)', borde: '#975a16' },
                                }

                                return (
                                  <button
                                    key={est}
                                    disabled={asistBloqueada}
                                    onClick={() => !asistBloqueada && setAsistencia(p => ({ ...p, [a.id]: est }))}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: `1.5px solid ${colores[est].borde}`,
                                      cursor: asistBloqueada ? 'not-allowed' : 'pointer',
                                      fontSize: '.76rem',
                                      fontWeight: 600,
                                      background: activo ? colores[est].activo : 'transparent',
                                      color: activo ? '#fff' : colores[est].borde,
                                      opacity: asistBloqueada && !activo ? 0.4 : 1,
                                      transition: 'all .12s',
                                    }}
                                  >
                                    {est === 'presente' ? 'Presente' : est === 'ausente' ? 'Ausente' : 'Justificado'}
                                  </button>
                                )
                              })}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {estadoGuardado === null || estadoGuardado === undefined ? (
                              <span className="badge default">Sin registro</span>
                            ) : (
                              <span className={`badge ${estadoGuardado}`}>{estadoGuardado}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!asistBloqueada && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    className="button ghost"
                    onClick={() => {
                      const todos = {}
                      alumnos.forEach(a => {
                        todos[a.id] = 'presente'
                      })
                      setAsistencia(todos)
                    }}
                  >
                    Marcar todos presentes
                  </button>
                  <button className="button primary" onClick={handleGuardarAsistencia}>
                    Guardar asistencia
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Historial Asistencia (solo lectura) */}
      {tab === 'historial_asistencia' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Historial Asistencia</div>
              <div className="card-subtitle">Historial del profesor autenticado</div>
            </div>
          </div>

          {!cursoId ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏫</div>
              <p>Selecciona un curso primero.</p>
            </div>
          ) : loadingHistorialAsistencia ? (
            <div className="loading-wrap">
              <div className="spinner" />
            </div>
          ) : historialAsistencia.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No hay registros de asistencia para este curso.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Fecha</th>
                    <th>Alumno</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialAsistencia.map(r => (
                    <tr key={`${r.fecha}_${r.alumno_id}_${r.estado}`}>
                      <td>{r.fecha}</td>
                      <td>{r.usuarios?.nombre ?? '—'}</td>
                      <td>
                        {r.estado === 'presente' && <span className="badge presente">presente</span>}
                        {r.estado === 'ausente' && <span className="badge ausente">ausente</span>}
                        {r.estado === 'justificado' && <span className="badge justificado">justificado</span>}
                        {r.estado !== 'presente' && r.estado !== 'ausente' && r.estado !== 'justificado' && (
                          <span className="badge default">{r.estado ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Anotaciones */}
      {tab === 'anotaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Nueva anotación</div>
            </div>
            <form className="form-grid" onSubmit={handleCrearAnotacion}>
              <div className="form-group">
                <label className="form-label">Alumno</label>
                <select
                  className="form-select"
                  value={anotForm.alumnoId}
                  onChange={e => setAnotForm(p => ({ ...p, alumnoId: e.target.value }))}
                  required
                >
                  <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                  {alumnosFiltrados.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={anotForm.tipo} onChange={e => setAnotForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="positiva">Positiva</option>
                  <option value="negativa">Negativa</option>
                </select>
              </div>

              <div className="form-group full">
                <label className="form-label">Descripción</label>
                <input
                  className="form-input"
                  placeholder="Describe la situación…"
                  value={anotForm.descripcion}
                  onChange={e => setAnotForm(p => ({ ...p, descripcion: e.target.value }))}
                  required
                />
              </div>

              <div className="form-actions">
                <button className="button primary" type="submit">
                  Guardar anotación
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Mis anotaciones recientes</div>
              <div className="card-subtitle">{anotaciones.length} registradas</div>
            </div>

            {anotaciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <p>Sin anotaciones.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anotaciones.map(a => (
                      <tr key={a.id}>
                        <td>{a.usuarios?.nombre ?? '—'}</td>
                        <td>
                          <span className={`badge ${a.tipo}`}>{a.tipo}</span>
                        </td>
                        <td>{a.descripcion}</td>
                        <td>{a.fecha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Retiros */}
      {tab === 'retiros' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Retiros</div>
            <div className="card-subtitle">Solo lectura — gestionados por PIE</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Alumno</label>
              <select
                className="form-select"
                value={retiroForm.alumnoId}
                onChange={e => setRetiroForm({ alumnoId: e.target.value })}
                required={false}
                disabled={!cursoId}
              >
                <option value="">
                  {cursoId ? (alumnos.length ? 'Elegir alumno' : 'No hay alumnos en este curso') : 'Selecciona un curso primero'}
                </option>
                {alumnosFiltrados.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingRetirosHist && (
            <div className="loading-wrap">
              <div className="spinner" />
            </div>
          )}

          {!loadingRetirosHist && !retiroForm.alumnoId && (
            <div className="empty-state" style={{ marginTop: 10 }}>
              <div className="empty-state-icon">🗂️</div>
              <p>Selecciona un alumno para ver su historial de retiros.</p>
            </div>
          )}

          {!loadingRetirosHist && retiroForm.alumnoId && (
            <>
              {retirosHist.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 10 }}>
                  <div className="empty-state-icon">✅</div>
                  <p>No hay retiros registrados para este alumno.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Tipo</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th style={{ width: 140 }}>Fecha registro</th>
                        <th style={{ width: 140 }}>Fecha retorno</th>
                        <th style={{ width: 120 }}>Hora retorno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retirosHist.map(r => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.alumno_id}</strong>
                          </td>
                          <td>
                            <span className="badge default">{r.tipo}</span>
                          </td>
                          <td>{r.motivo}</td>
                          <td>
                            <span className={`badge ${r.estado === 'retornado' ? 'positiva' : 'negativa'}`}>{r.estado}</span>
                          </td>
                          <td>{r.created_at ? String(r.created_at).slice(0, 10) : '—'}</td>
                          <td>{r.fecha_retorno ? String(r.fecha_retorno).slice(0, 10) : '—'}</td>
                          <td>{r.hora_retorno ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Observaciones */}
      {tab === 'observacion' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Agregar observación</div>
            <div className="card-subtitle">Queda registrada en la hoja de vida del alumno</div>
          </div>

          <form className="form-grid" onSubmit={handleCrearObservacion}>
            <div className="form-group">
              <label className="form-label">Alumno</label>
              <select className="form-select" value={obsForm.alumnoId} onChange={e => setObsForm(p => ({ ...p, alumnoId: e.target.value }))} required>
                <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                {alumnosFiltrados.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label className="form-label">Observación</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ resize: 'vertical' }}
                placeholder="Escribe la observación para la hoja de vida…"
                value={obsForm.contenido}
                onChange={e => setObsForm(p => ({ ...p, contenido: e.target.value }))}
                required
              />
            </div>

            <div className="form-actions">
              <button className="button primary" type="submit">
                Guardar observación
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>
              Historial de observaciones
            </div>

            {!obsForm.alumnoId ? (
              <div className="empty-state" style={{ margin: 0 }}>
                <div className="empty-state-icon">🗂️</div>
                <p>Selecciona un alumno para ver su historial.</p>
              </div>
            ) : loadingObservacionesHist ? (
              <div className="loading-wrap">
                <div className="spinner" />
              </div>
            ) : observacionesHist.length === 0 ? (
              <div className="empty-state" style={{ margin: 0 }}>
                <div className="empty-state-icon">💬</div>
                <p>Aún no hay observaciones para este alumno.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Fecha</th>
                      <th>Contenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observacionesHist.map(o => (
                      <tr key={o.id}>
                        <td>{o.fecha}</td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{o.contenido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

