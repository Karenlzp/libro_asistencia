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
  eliminarNota,
  getPromediosAsignaturasProfesor,
  editarAnotacion,
  registrarAsistenciaMasiva,
  crearAnotacion,
  crearRetiro,
  getProfesorAlumnoPieObservaciones,
  getRetirosPiePorAlumno,
  getHistorialAsistenciaProfesor,
} from '../../services/profesorService'
import { getHorariosProfesor } from '../../services/horarioService'

const hoy = new Date().toISOString().slice(0, 10)

export default function ProfesorDashboard({ profile }) {
  const [tab, setTab] = useState('notas')

  const [historialAsistencia, setHistorialAsistencia] = useState([])
  const [loadingHistorialAsistencia, setLoadingHistorialAsistencia] = useState(false)

  const [horariosProfesor, setHorariosProfesor] = useState([])
  const [loadingHorariosProfesor, setLoadingHorariosProfesor] = useState(false)

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
  const [alertasOpen, setAlertasOpen] = useState(true)
  const [expandedAlertRows, setExpandedAlertRows] = useState([])

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
  const [promediosAsignaturas, setPromediosAsignaturas] = useState([])
  const [loadingPromedios, setLoadingPromedios] = useState(false)
  const [editingNotaAlumnoId, setEditingNotaAlumnoId] = useState(null)

  const [editarAnotacionId, setEditarAnotacionId] = useState(null)
  const [anotEditForm, setAnotEditForm] = useState({ tipo: 'positiva', descripcion: '' })

  const [fechaAsist, setFechaAsist] = useState(hoy)
  const [asistencia, setAsistencia] = useState({})
  const [asistenciaGuardada, setAsistenciaGuardada] = useState({})

  const [evalForm, setEvalForm] = useState({ nombre: '', porcentaje: 20, fecha: hoy })
  const [anotForm, setAnotForm] = useState({ alumnoId: '', tipo: 'positiva', descripcion: '' })
  const [retiroForm, setRetiroForm] = useState({ alumnoId: '' })
  const [retirosHist, setRetirosHist] = useState([])
  const [loadingRetirosHist, setLoadingRetirosHist] = useState(false)
  const [obsForm, setObsForm] = useState({ alumnoId: '' })
  const [observacionesPie, setObservacionesPie] = useState([])
  const [loadingObservacionesPie, setLoadingObservacionesPie] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    loadBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    const run = async () => {
      if (!obsForm.alumnoId) {
        setObservacionesPie([])
        return
      }
      setLoadingObservacionesPie(true)
      const { data, error } = await getProfesorAlumnoPieObservaciones({ alumnoId: obsForm.alumnoId })
      if (!error) setObservacionesPie(data ?? [])
      else setObservacionesPie([])
      setLoadingObservacionesPie(false)
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
        fecha: fechaAsist || undefined,
      })
      if (!error) setHistorialAsistencia(data ?? [])
      else setHistorialAsistencia([])
      setLoadingHistorialAsistencia(false)
    }
    run()
  }, [tab, cursoId, asignaturaId, profile?.id, fechaAsist])

  useEffect(() => {
    const run = async () => {
      if (tab !== 'horarios') return
      if (!profile?.id) return
      setLoadingHorariosProfesor(true)
      const { data, error } = await getHorariosProfesor({ profesorId: profile.id })
      if (!error) setHorariosProfesor(data ?? [])
      else setHorariosProfesor([])
      setLoadingHorariosProfesor(false)
    }
    run()
  }, [tab, profile?.id])

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

  useEffect(() => {
    const run = async () => {
      setLoadingPromedios(true)
      const { data, error } = await getPromediosAsignaturasProfesor(profile.id)
      if (!error) setPromediosAsignaturas(data ?? [])
      else setPromediosAsignaturas([])
      setLoadingPromedios(false)
    }
    if (profile?.id) run()
  }, [profile?.id])

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
    for (const n of data ?? []) notasMap[n.alumno_id] = n

    const merged = alumnos.map(a => ({
      alumno_id: a.id,
      nombre: a.nombre,
      nota: notasMap[a.id]?.nota ?? '',
      detalleId: notasMap[a.id]?.id ?? null,
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
    if (!evalSelId) return notify('error', 'Selecciona una evaluación primero.')

    const pendientes = notasEval
      .filter(n => notasInput[n.alumno_id] !== '' && notasInput[n.alumno_id] != null)
      .map(n =>
        guardarNota({
          evaluacionId: evalSelId,
          alumnoId: n.alumno_id,
          nota: notasInput[n.alumno_id],
          actor: profile,
        })
      )

    const resultados = await Promise.all(pendientes)
    const errores = resultados.filter(r => r.error)
    if (errores.length) {
      notify('error', `${errores.length} nota(s) no se pudieron guardar.`)
      return
    }

    notify('success', 'Notas guardadas correctamente.')
    setEditingNotaAlumnoId(null)
    await handleEvalChange(evalSelId)
  }

  const handleEliminarNota = async (detalleId, alumnoId) => {
    if (!detalleId) return notify('error', 'No se puede eliminar una nota sin registro.')
    const { error } = await eliminarNota(detalleId, profile)
    if (error) {
      notify('error', 'No se pudo eliminar la nota: ' + error.message)
      return
    }
    setNotasInput(prev => ({ ...prev, [alumnoId]: '' }))
    setNotasEval(prev => prev.map(n => n.alumno_id === alumnoId ? { ...n, nota: '', detalleId: null } : n))
    notify('success', 'Nota eliminada correctamente.')
  }

  const handleGuardarAsistencia = async () => {
    if (!cursoId) return notify('error', 'Selecciona un curso primero.')
    if (!asignaturaId) return notify('error', 'Selecciona una asignatura primero.')
    if (!profile?.id) return notify('error', 'Profesor no disponible.')

    const registros = Object.entries(asistencia)
      .filter(([, estado]) => estado !== null)
      .map(([alumnoId, estado]) => ({ alumnoId, estado }))

    const { error } = await registrarAsistenciaMasiva(
      cursoId,
      asignaturaId,
      profile.id,
      fechaAsist,
      registros,
      profile,
    )
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
      actor: profile,
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
      actor: profile,
    })

    if (error) return notify('error', 'Error: ' + error.message)

    notify('success', 'Anotación guardada.')
    setAnotForm(p => ({ ...p, descripcion: '' }))
    const { data } = await getAnotacionesProfesor(profile.id)
    setAnotaciones(data ?? [])
  }

  const handleEditarAnotacionClick = anot => {
    setEditarAnotacionId(anot.id)
    setAnotEditForm({ tipo: anot.tipo, descripcion: anot.descripcion ?? '' })
  }

  const handleCancelarEdicion = () => {
    setEditarAnotacionId(null)
    setAnotEditForm({ tipo: 'positiva', descripcion: '' })
  }

  const handleGuardarAnotacionEditada = async e => {
    e.preventDefault()
    if (!editarAnotacionId) return
    if (!anotEditForm.descripcion) return notify('error', 'Escribe la descripción de la anotación.')

    const { data, error } = await editarAnotacion({
      anotacionId: editarAnotacionId,
      tipo: anotEditForm.tipo,
      descripcion: anotEditForm.descripcion,
      actor: profile,
    })

    if (error) return notify('error', 'No se pudo actualizar la anotación: ' + error.message)

    notify('success', 'Anotación actualizada.')
    setEditarAnotacionId(null)
    setAnotEditForm({ tipo: 'positiva', descripcion: '' })
    const { data: nuevaLista } = await getAnotacionesProfesor(profile.id)
    setAnotaciones(nuevaLista ?? [])
  }

  // Retiros: ahora solo lectura (gestionados por PIE)

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

      {/* Lista de alumnos del curso */}
      {cursoId && (
        <div className="card section">
          <div className="card-header">
            <div>
              <div className="card-title">Alumnos del curso</div>
              <div className="card-subtitle">Lista de los alumnos del curso seleccionado</div>
            </div>
          </div>

          {alumnosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>No hay alumnos en este curso.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosFiltrados.map(a => (
                    <tr key={a.id}>
                      <td>{a.nombre}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="button"
                          style={{
                            padding: '6px 12px',
                            fontSize: '.78rem',
                            background: 'var(--blue-accent)',
                            color: '#ffffff',
                            borderColor: 'transparent',
                            boxShadow: '0 2px 8px rgba(49, 130, 206, 0.18)',
                          }}
                          onClick={() => handleGoAlumno(a.id)}
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
      )}

      {/* Alertas del curso */}
      {alertas.length > 0 && (
        <div className="card section" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div className="card-title">Alertas en este curso</div>
              <div className="card-subtitle">Haz clic para ver los detalles de las alertas</div>
            </div>
            <button
              className="button secondary"
              style={{ fontSize: '.82rem', minWidth: 120 }}
              onClick={() => setAlertasOpen(p => !p)}
            >
              {alertasOpen ? 'Ocultar alertas' : 'Mostrar alertas'}
            </button>
          </div>
          {alertasOpen && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: 14 }}>
                        No hay alertas que coincidan con tu búsqueda.
                      </td>
                    </tr>
                  ) : (
                    alertasFiltradas.flatMap(a => {
                      const expanded = expandedAlertRows.includes(a.alumno_id)

                      return [
                        <tr key={`${a.alumno_id}-main`}>
                          <td>
                            <strong
                              onClick={() => handleGoAlumno(a.alumno_id)}
                              style={{ cursor: 'pointer', color: 'var(--blue)', userSelect: 'none' }}
                              title="Ver ficha"
                            >
                              {a.alumno}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="button ghost"
                              style={{ padding: '6px 10px', fontSize: '.78rem' }}
                              onClick={() => {
                                setExpandedAlertRows(prev =>
                                  prev.includes(a.alumno_id)
                                    ? prev.filter(id => id !== a.alumno_id)
                                    : [...prev, a.alumno_id]
                                )
                              }}
                            >
                              {expanded ? 'Ocultar' : 'Ver alerta'}
                            </button>
                          </td>
                        </tr>,
                        expanded && (
                          <tr key={`${a.alumno_id}-expanded`}>
                            <td colSpan={2} style={{ padding: '14px 16px', background: 'rgba(255, 245, 245, 0.85)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                                <div style={{ padding: 12, background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid #f2d7d5' }}>
                                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Promedio general</div>
                                  <div style={{ fontWeight: 700, marginTop: 4 }}>{a.promedio_general ?? '—'}</div>
                                </div>
                                <div style={{ padding: 12, background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid #f2d7d5' }}>
                                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>% Asistencia</div>
                                  <div style={{ fontWeight: 700, marginTop: 4 }}>{a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : '—'}</div>
                                </div>
                                <div style={{ padding: 12, background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid #f2d7d5' }}>
                                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Anotaciones negativas</div>
                                  <div style={{ fontWeight: 700, marginTop: 4 }}>{a.anotaciones_negativas ?? '—'}</div>
                                </div>
                              </div>
                              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {a.alerta_promedio && <span className="badge negativa">Alerta Promedio</span>}
                                {a.alerta_asistencia && <span className="badge negativa">Alerta Asistencia</span>}
                                {a.alerta_conducta && <span className="badge negativa">Alerta Conducta</span>}
                              </div>
                            </td>
                          </tr>
                        ),
                      ]
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-strip">
        {[
          { key: 'notas', label: 'Notas' },
          { key: 'asistencia', label: 'Asistencia' },
          { key: 'historial_asistencia', label: 'Historial Asistencia' },
          { key: 'horarios', label: 'Horarios' },
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
              <div className="card-subtitle">Selecciona una evaluación para ingresar, editar o eliminar notas antes del cierre</div>
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
                          <th style={{ width: 220 }}>Nota (1.0 – 7.0)</th>
                          <th style={{ width: 120 }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasEval.map(n => (
                          <tr
                            key={n.alumno_id}
                            style={editingNotaAlumnoId === n.alumno_id ? { background: 'rgba(43, 108, 176, 0.05)' } : undefined}
                          >
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
                                disabled={editingNotaAlumnoId !== n.alumno_id}
                              />
                            </td>
                            <td>
                              <button
                                className="button ghost"
                                style={{ padding: '6px 10px', fontSize: '.78rem' }}
                                type="button"
                                onClick={() => setEditingNotaAlumnoId(editingNotaAlumnoId === n.alumno_id ? null : n.alumno_id)}
                              >
                                {editingNotaAlumnoId === n.alumno_id ? 'Cancelar' : 'Editar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                  {loadingPromedios ? (
                    <div className="stat-card" style={{ padding: '14px' }}>
                      <div style={{ color: 'var(--muted)' }}>Cargando promedios por asignatura…</div>
                    </div>
                  ) : promediosAsignaturas.length > 0 ? (
                    promediosAsignaturas.map((p) => (
                      <div key={p.asignatura} className="stat-card" style={{ padding: '14px' }}>
                        <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 8 }}>{p.asignatura}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{p.promedio}</div>
                          <span className="badge default">{p.notas} nota{p.notas === 1 ? '' : 's'}</span>
                        </div>
                        <div style={{ marginTop: 8, color: 'var(--gray-600)', fontSize: '.82rem' }}>
                          Promedio para esta asignatura
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="stat-card" style={{ padding: '14px' }}>
                      <div style={{ color: 'var(--muted)' }}>No hay notas registradas aún para calcular promedios.</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="button primary" onClick={handleGuardarNotas}>
                    Guardar notas
                  </button>
                </div>
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

          <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fecha</label>
              <input
                className="form-input"
                type="date"
                style={{ maxWidth: 200 }}
                value={fechaAsist}
                max={hoy}
                onChange={e => setFechaAsist(e.target.value)}
              />
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

      {tab === 'horarios' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Horario</div>
              <div className="card-subtitle">Bloques asignados a tu usuario</div>
            </div>
          </div>

          {loadingHorariosProfesor ? (
            <div className="loading-wrap"><div className="spinner" /> Cargando horario...</div>
          ) : horariosProfesor.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p>No hay bloques asignados.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Día</th><th>Horario</th><th>Curso</th><th>Asignatura</th><th>Sala</th></tr>
                </thead>
                <tbody>
                  {horariosProfesor.map((h) => (
                    <tr key={h.id}>
                      <td>{h.dia ?? '—'}</td>
                      <td>{h.hora_inicio ?? '—'} - {h.hora_fin ?? '—'}</td>
                      <td>{h.cursos ? `${h.cursos.nivel}°${h.cursos.letra}` : '—'}</td>
                      <td>{h.asignaturas?.nombre ?? '—'}</td>
                      <td>{h.sala ?? '—'}</td>
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

            {editarAnotacionId && (
              <div className="card" style={{ marginBottom: 20, padding: '18px 22px' }}>
                <div className="card-title">Editar anotación</div>
                <form className="form-grid" onSubmit={handleGuardarAnotacionEditada}>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={anotEditForm.tipo}
                      onChange={e => setAnotEditForm(p => ({ ...p, tipo: e.target.value }))}
                    >
                      <option value="positiva">Positiva</option>
                      <option value="negativa">Negativa</option>
                    </select>
                  </div>

                  <div className="form-group full">
                    <label className="form-label">Descripción</label>
                    <input
                      className="form-input"
                      value={anotEditForm.descripcion}
                      onChange={e => setAnotEditForm(p => ({ ...p, descripcion: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-actions" style={{ gap: 10 }}>
                    <button className="button primary" type="submit">Guardar cambios</button>
                    <button className="button secondary" type="button" onClick={handleCancelarEdicion}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

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
                      <th style={{ width: 120 }}>Acción</th>
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
                        <td>
                          <button
                            className="button ghost"
                            style={{ padding: '6px 10px', fontSize: '.78rem' }}
                            onClick={() => handleEditarAnotacionClick(a)}
                          >
                            Editar
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
            <div>
              <div className="card-title">Historial de observaciones PIE</div>
              <div className="card-subtitle">Selecciona un alumno para ver las observaciones registradas por PIE.</div>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 260 }}>
              <label className="form-label">Alumno</label>
              <select
                className="form-select"
                value={obsForm.alumnoId}
                onChange={e => setObsForm(p => ({ ...p, alumnoId: e.target.value }))}
              >
                <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                {alumnosFiltrados.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {!obsForm.alumnoId ? (
              <div className="empty-state" style={{ margin: 0 }}>
                <div className="empty-state-icon">🗂️</div>
                <p>Selecciona un alumno para ver las observaciones registradas por PIE.</p>
              </div>
            ) : loadingObservacionesPie ? (
              <div className="loading-wrap">
                <div className="spinner" />
              </div>
            ) : observacionesPie.length === 0 ? (
              <div className="empty-state" style={{ margin: 0 }}>
                <div className="empty-state-icon">💬</div>
                <p>No hay observaciones PIE registradas para este alumno.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Fecha</th>
                      <th>Intervención</th>
                      <th>Observación</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observacionesPie.map(o => (
                      <tr key={o.id}>
                        <td>{o.created_at ? String(o.created_at).slice(0, 10) : '—'}</td>
                        <td>{o.tipo_intervencion ?? '—'}</td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{o.observacion ?? '—'}</td>
                        <td>{o.resultado ?? '—'}</td>
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

