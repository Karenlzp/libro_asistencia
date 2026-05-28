// src/pages/profesor/profesor_Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'


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
    } from '../../services/profesorService'



    const hoy = new Date().toISOString().slice(0, 10)

    export default function ProfesorDashboard({ profile }) {
    const [tab, setTab] = useState('notas')

    const [cursoAsig, setCursoAsig]       = useState([])
    const [alumnos, setAlumnos]           = useState([])
    const [evaluaciones, setEvaluaciones] = useState([])
    const [anotaciones, setAnotaciones]   = useState([])
    const [alertas, setAlertas]           = useState([])
    const [loading, setLoading]           = useState(true)
    const [status, setStatus]             = useState(null)

    const [cursoId, setCursoId]           = useState('')
    const [asignaturaId, setAsignaturaId] = useState('')

    const [evalSelId, setEvalSelId]       = useState('')
    const [notasEval, setNotasEval]       = useState([])
    const [notasInput, setNotasInput]     = useState({})
    const [loadingNotas, setLoadingNotas] = useState(false)

    const [fechaAsist, setFechaAsist]           = useState(hoy)
    const [asistencia, setAsistencia]           = useState({})
    const [asistenciaGuardada, setAsistenciaGuardada] = useState({})

    const [evalForm, setEvalForm] = useState({ nombre: '', porcentaje: 20, fecha: hoy })
    const [anotForm, setAnotForm] = useState({ alumnoId: '', tipo: 'positiva', descripcion: '' })
    const [retiroForm, setRetiroForm] = useState({ alumnoId: '', tipo: 'conducta', motivo: '' })
    const [obsForm, setObsForm] = useState({ alumnoId: '', contenido: '' })

    useEffect(() => {
        if (!profile?.id) return
        loadBase()
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

    const handleFechaAsistChange = async (fecha) => {
        setFechaAsist(fecha)
        if (!cursoId) return
        const { data } = await getAsistenciaCursoFecha(cursoId, fecha)
        const map = {}
        alumnos.forEach(a => { map[a.id] = null })
        for (const r of (data ?? [])) map[r.alumno_id] = r.estado
        setAsistencia(map)
        setAsistenciaGuardada({ ...map })
    }

    const handleCursoChange = async (id) => {
        setCursoId(id)
        setAsignaturaId('')
        setAlumnos([])
        setAlertas([])
        setAsistencia({})
        setAsistenciaGuardada({})
        setNotasEval([])
        setEvalSelId('')
        if (!id) return

        const [al, ale] = await Promise.all([
        getAlumnosPorCurso(id),
        getAlertasPorCurso(id),
        ])
        const listaAlumnos = al.data ?? []
        setAlumnos(listaAlumnos)
        setAlertas(ale.data ?? [])

        const { data } = await getAsistenciaCursoFecha(id, fechaAsist)
        const map = {}
        listaAlumnos.forEach(a => { map[a.id] = null })
        for (const r of (data ?? [])) map[r.alumno_id] = r.estado
        setAsistencia(map)
        setAsistenciaGuardada({ ...map })
    }

    const handleEvalChange = async (id) => {
        setEvalSelId(id)
        if (!id) { setNotasEval([]); setNotasInput({}); return }
        setLoadingNotas(true)
        const { data } = await getNotasPorEvaluacion(id)
        const notasMap = {}
        for (const n of (data ?? [])) notasMap[n.alumno_id] = n.nota
        const merged = alumnos.map(a => ({
        alumno_id: a.id,
        nombre:    a.nombre,
        nota:      notasMap[a.id] ?? '',
        }))
        setNotasEval(merged)
        const inputInit = {}
        merged.forEach(n => { inputInit[n.alumno_id] = n.nota })
        setNotasInput(inputInit)
        setLoadingNotas(false)
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
        const registros = Object.entries(asistencia)
        .filter(([, estado]) => estado !== null)
        .map(([alumnoId, estado]) => ({ alumnoId, estado }))
        const { error } = await registrarAsistenciaMasiva(cursoId, fechaAsist, registros)
        if (error) return notify('error', 'Error al guardar asistencia: ' + error.message)
        setAsistenciaGuardada({ ...asistencia })
        notify('success', 'Asistencia registrada correctamente.')
    }

    const handleCrearEval = async (e) => {
        e.preventDefault()
        if (!cursoId || !asignaturaId || !evalForm.nombre)
        return notify('error', 'Selecciona curso, asignatura y nombre.')
        const { error } = await crearEvaluacion({
        nombre: evalForm.nombre, asignaturaId, profesorId: profile.id,
        cursoId, porcentaje: evalForm.porcentaje, fecha: evalForm.fecha,
        })
        if (error) return notify('error', 'Error: ' + error.message)
        notify('success', 'Evaluación creada.')
        setEvalForm({ nombre: '', porcentaje: 20, fecha: hoy })
        const { data } = await getEvaluacionesProfesor(profile.id)
        setEvaluaciones(data ?? [])
    }

    const handleCrearAnotacion = async (e) => {
        e.preventDefault()
        if (!anotForm.alumnoId || !anotForm.descripcion)
        return notify('error', 'Selecciona alumno y escribe una descripción.')
        const { error } = await crearAnotacion({
        alumnoId: anotForm.alumnoId, profesorId: profile.id,
        tipo: anotForm.tipo, descripcion: anotForm.descripcion,
        })
        if (error) return notify('error', 'Error: ' + error.message)
        notify('success', 'Anotación guardada.')
        setAnotForm(p => ({ ...p, descripcion: '' }))
        const { data } = await getAnotacionesProfesor(profile.id)
        setAnotaciones(data ?? [])
    }

    const handleCrearRetiro = async (e) => {
        e.preventDefault()
        if (!retiroForm.alumnoId || !retiroForm.motivo)
        return notify('error', 'Selecciona alumno y escribe el motivo.')
        const { error } = await crearRetiro({
        alumnoId: retiroForm.alumnoId, profesorId: profile.id,
        motivo: retiroForm.motivo, tipo: retiroForm.tipo,
        })
        if (error) return notify('error', 'Error: ' + error.message)
        notify('success', 'Retiro registrado.')
        setRetiroForm(p => ({ ...p, motivo: '' }))
    }

    const handleCrearObservacion = async (e) => {
        e.preventDefault()
        if (!obsForm.alumnoId || !obsForm.contenido)
        return notify('error', 'Selecciona alumno y escribe la observación.')
        const { error } = await crearObservacion({
        alumnoId: obsForm.alumnoId, profesorId: profile.id, contenido: obsForm.contenido,
        })
        if (error) return notify('error', 'Error: ' + error.message)
        notify('success', 'Observación guardada.')
        setObsForm(p => ({ ...p, contenido: '' }))
    }

    if (loading) return <div className="loading-wrap"><div className="spinner" /> Cargando panel...</div>

    const hoyDate   = new Date(); hoyDate.setHours(0,0,0,0)
    const fechaDate = new Date(fechaAsist + 'T00:00:00')
    const diffDias  = Math.floor((hoyDate - fechaDate) / 86400000)
    const asistBloqueada = diffDias > 3

    return (
        <div>
        {/* Stats */}
        <div className="grid-4 section">
            {[
            { icon: '🏫', value: cursoList.length,      label: 'Cursos asignados', cls: 'lime'  },
            { icon: '📋', value: evaluaciones.length,   label: 'Evaluaciones',     cls: 'blue'  },
            { icon: '👥', value: alumnos.length || '—', label: 'Alumnos en curso', cls: 'green' },
            { icon: '⚠️', value: alertas.length || '—', label: 'Alertas en curso', cls: 'red'   },
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
            <div className="card-title" style={{ marginBottom: 12 }}>Curso de trabajo</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-select" style={{ minWidth: 180 }} value={cursoId}
                onChange={e => handleCursoChange(e.target.value)}>
                <option value="">— Elegir curso —</option>
                {cursoList.map(c => <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>)}
            </select>
            {cursoId && (
                <select className="form-select" style={{ minWidth: 180 }} value={asignaturaId}
                onChange={e => setAsignaturaId(e.target.value)}>
                <option value="">— Elegir asignatura —</option>
                {asignaturasDelCurso.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
            )}
            {alumnos.length > 0 && <span className="badge default">{alumnos.length} alumnos</span>}
            {alertas.length > 0 && <span className="badge negativa">⚠️ {alertas.length} alertas</span>}
            </div>
        </div>

        {/* Alertas del curso */}
        {alertas.length > 0 && (
            <div className="card section" style={{ borderLeft: '3px solid var(--danger)' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Alertas en este curso</div>
            <div className="table-wrap">
                <table>
                <thead>
                    <tr><th>Alumno</th><th>Promedio</th><th>Asistencia</th><th>Anot. neg.</th><th>Alertas</th></tr>
                </thead>
                <tbody>
                    {alertas.map(a => (
                    <tr key={a.alumno_id}>
                        <td><strong>{a.alumno}</strong></td>
                        <td>{a.promedio_general != null
                        ? <span className={`nota-pill ${a.promedio_general < 4 ? 'baja' : 'media'}`}>{a.promedio_general}</span>
                        : '—'}</td>
                        <td>{a.porcentaje_asistencia != null
                        ? <span className={`badge ${a.porcentaje_asistencia < 85 ? 'negativa' : 'positiva'}`}>{a.porcentaje_asistencia}%</span>
                        : '—'}</td>
                        <td><span className={`badge ${a.anotaciones_negativas >= 3 ? 'negativa' : 'default'}`}>{a.anotaciones_negativas}</span></td>
                        <td style={{ display: 'flex', gap: 4 }}>
                        {a.alerta_promedio   && <span className="badge negativa">Promedio</span>}
                        {a.alerta_asistencia && <span className="badge negativa">Asistencia</span>}
                        {a.alerta_conducta   && <span className="badge negativa">Conducta</span>}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        )}

        {/* Tabs */}
        <div className="tab-strip">
            {[
            { key: 'notas',       label: 'Notas' },
            { key: 'asistencia',  label: 'Asistencia' },
            { key: 'evaluacion',  label: 'Nueva evaluación' },
            { key: 'anotaciones', label: 'Anotaciones' },
            { key: 'retiros',     label: 'Retiros' },
            { key: 'observacion', label: 'Observaciones' },
            ].map(({ key, label }) => (
            <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {label}
            </button>
            ))}
        </div>

        {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

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
                <div className="empty-state"><div className="empty-state-icon">🏫</div><p>Selecciona un curso primero.</p></div>
            ) : (
                <>
                <div style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Evaluación</label>
                    <select className="form-select" style={{ maxWidth: 360 }} value={evalSelId}
                    onChange={e => handleEvalChange(e.target.value)}>
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
                {loadingNotas && <div className="loading-wrap"><div className="spinner" /></div>}
                {!loadingNotas && evalSelId && notasEval.length > 0 && (
                    <>
                    <div className="table-wrap">
                        <table>
                        <thead><tr><th>Alumno</th><th style={{ width: 160 }}>Nota (1.0 – 7.0)</th></tr></thead>
                        <tbody>
                            {notasEval.map(n => (
                            <tr key={n.alumno_id}>
                                <td>{n.nombre}</td>
                                <td>
                                <input className="form-input" type="number" min="1" max="7" step="0.1"
                                    style={{ width: 100 }} value={notasInput[n.alumno_id] ?? ''}
                                    onChange={e => setNotasInput(p => ({ ...p, [n.alumno_id]: e.target.value }))} />
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="button primary" onClick={handleGuardarNotas}>Guardar notas</button>
                    </div>
                    </>
                )}
                {!loadingNotas && evalSelId && notasEval.length === 0 && (
                    <div className="empty-state"><div className="empty-state-icon">👥</div><p>No hay alumnos en este curso.</p></div>
                )}
                </>
            )}
            </div>
        )}

        {/* Tab: Asistencia — BUG CORREGIDO */}
        {tab === 'asistencia' && (
            <div className="card">
            <div className="card-header">
                <div className="card-title">Registro de asistencia</div>
                {asistBloqueada && <span className="badge negativa">Solo lectura — más de 3 días</span>}
            </div>

            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" style={{ maxWidth: 200 }}
                    value={fechaAsist} max={hoy}
                    onChange={e => handleFechaAsistChange(e.target.value)} />
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
                <div className="empty-state"><div className="empty-state-icon">🏫</div><p>Selecciona un curso primero.</p></div>
            ) : alumnos.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">👥</div><p>No hay alumnos en este curso.</p></div>
            ) : (
                <>
                <div className="table-wrap">
                    <table>
                    <thead>
                        <tr><th>Alumno</th><th>Marcar</th><th style={{ width: 120, textAlign: 'center' }}>Guardado en BD</th></tr>
                    </thead>
                    <tbody>
                        {alumnos.map(a => {
                        const estadoActual   = asistencia[a.id]
                        const estadoGuardado = asistenciaGuardada[a.id]
                        const hayCambio      = estadoActual !== estadoGuardado && estadoActual !== null

                        const colores = {
                            presente:    { activo: 'var(--success)', borde: '#276749' },
                            ausente:     { activo: 'var(--danger)',  borde: '#c53030' },
                            justificado: { activo: 'var(--warning)', borde: '#975a16' },
                        }

                        return (
                            <tr key={a.id} style={{ background: hayCambio ? 'rgba(43,108,176,.04)' : undefined }}>
                            <td>
                                <strong>{a.nombre}</strong>
                                {hayCambio && (
                                <span style={{ marginLeft: 8, fontSize: '.7rem', color: 'var(--blue)', fontWeight: 600 }}>
                                    modificado
                                </span>
                                )}
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                {['presente', 'ausente', 'justificado'].map(est => {
                                    const activo = estadoActual === est
                                    return (
                                    <button key={est} disabled={asistBloqueada}
                                        onClick={() => !asistBloqueada && setAsistencia(p => ({ ...p, [a.id]: est }))}
                                        style={{
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1.5px solid ${colores[est].borde}`,
                                        cursor: asistBloqueada ? 'not-allowed' : 'pointer',
                                        fontSize: '.76rem', fontWeight: 600,
                                        background: activo ? colores[est].activo : 'transparent',
                                        color: activo ? '#fff' : colores[est].borde,
                                        opacity: asistBloqueada && !activo ? 0.4 : 1,
                                        transition: 'all .12s',
                                        }}>
                                        {est === 'presente' ? 'Presente' : est === 'ausente' ? 'Ausente' : 'Justificado'}
                                    </button>
                                    )
                                })}
                                </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {estadoGuardado === null || estadoGuardado === undefined
                                ? <span className="badge default">Sin registro</span>
                                : <span className={`badge ${estadoGuardado}`}>{estadoGuardado}</span>}
                            </td>
                            </tr>
                        )
                        })}
                    </tbody>
                    </table>
                </div>

                {!asistBloqueada && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <button className="button ghost"
                        onClick={() => {
                        const todos = {}
                        alumnos.forEach(a => { todos[a.id] = 'presente' })
                        setAsistencia(todos)
                        }}>
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

        {/* Tab: Nueva evaluación */}
        {tab === 'evaluacion' && (
            <div className="card">
            <div className="card-header"><div className="card-title">Crear evaluación</div></div>
            <form className="form-grid" onSubmit={handleCrearEval}>
                <div className="form-group">
                <label className="form-label">Curso</label>
                <select className="form-select" value={cursoId}
                    onChange={e => handleCursoChange(e.target.value)} required>
                    <option value="">Elegir curso</option>
                    {cursoList.map(c => <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>)}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Asignatura</label>
                <select className="form-select" value={asignaturaId}
                    onChange={e => setAsignaturaId(e.target.value)} disabled={!cursoId} required>
                    <option value="">Elegir asignatura</option>
                    {asignaturasDelCurso.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" placeholder="Ej: Prueba 1 — Unidad 2"
                    value={evalForm.nombre} onChange={e => setEvalForm(p => ({ ...p, nombre: e.target.value }))} required />
                </div>
                <div className="form-group">
                <label className="form-label">Porcentaje (%)</label>
                <input className="form-input" type="number" min="1" max="100"
                    value={evalForm.porcentaje} onChange={e => setEvalForm(p => ({ ...p, porcentaje: e.target.value }))} required />
                </div>
                <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date"
                    value={evalForm.fecha} onChange={e => setEvalForm(p => ({ ...p, fecha: e.target.value }))} required />
                </div>
                <div className="form-actions">
                <button className="button primary" type="submit">Crear evaluación</button>
                </div>
            </form>
            </div>
        )}

        {/* Tab: Anotaciones */}
        {tab === 'anotaciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
                <div className="card-header"><div className="card-title">Nueva anotación</div></div>
                <form className="form-grid" onSubmit={handleCrearAnotacion}>
                <div className="form-group">
                    <label className="form-label">Alumno</label>
                    <select className="form-select" value={anotForm.alumnoId}
                    onChange={e => setAnotForm(p => ({ ...p, alumnoId: e.target.value }))} required>
                    <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                    {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={anotForm.tipo}
                    onChange={e => setAnotForm(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="positiva">Positiva</option>
                    <option value="negativa">Negativa</option>
                    </select>
                </div>
                <div className="form-group full">
                    <label className="form-label">Descripción</label>
                    <input className="form-input" placeholder="Describe la situación…"
                    value={anotForm.descripcion} onChange={e => setAnotForm(p => ({ ...p, descripcion: e.target.value }))} required />
                </div>
                <div className="form-actions">
                    <button className="button primary" type="submit">Guardar anotación</button>
                </div>
                </form>
            </div>

            <div className="card">
                <div className="card-header">
                <div className="card-title">Mis anotaciones recientes</div>
                <div className="card-subtitle">{anotaciones.length} registradas</div>
                </div>
                {anotaciones.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">💬</div><p>Sin anotaciones.</p></div>
                ) : (
                <div className="table-wrap">
                    <table>
                    <thead><tr><th>Alumno</th><th>Tipo</th><th>Descripción</th><th>Fecha</th></tr></thead>
                    <tbody>
                        {anotaciones.map(a => (
                        <tr key={a.id}>
                            <td>{a.usuarios?.nombre ?? '—'}</td>
                            <td><span className={`badge ${a.tipo}`}>{a.tipo}</span></td>
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
            <div className="card-header"><div className="card-title">Registrar retiro de clase</div></div>
            <form className="form-grid" onSubmit={handleCrearRetiro}>
                <div className="form-group">
                <label className="form-label">Alumno</label>
                <select className="form-select" value={retiroForm.alumnoId}
                    onChange={e => setRetiroForm(p => ({ ...p, alumnoId: e.target.value }))} required>
                    <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                    {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={retiroForm.tipo}
                    onChange={e => setRetiroForm(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="conducta">Conducta</option>
                    <option value="refuerzo">Refuerzo</option>
                </select>
                </div>
                <div className="form-group full">
                <label className="form-label">Motivo</label>
                <input className="form-input" placeholder="Describe el motivo del retiro…"
                    value={retiroForm.motivo} onChange={e => setRetiroForm(p => ({ ...p, motivo: e.target.value }))} required />
                </div>
                <div className="form-actions">
                <button className="button primary" type="submit">Registrar retiro</button>
                </div>
            </form>
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
                <select className="form-select" value={obsForm.alumnoId}
                    onChange={e => setObsForm(p => ({ ...p, alumnoId: e.target.value }))} required>
                    <option value="">{alumnos.length ? 'Elegir alumno' : 'Selecciona un curso primero'}</option>
                    {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                </div>
                <div className="form-group full">
                <label className="form-label">Observación</label>
                <textarea className="form-input" rows={4} style={{ resize: 'vertical' }}
                    placeholder="Escribe la observación para la hoja de vida…"
                    value={obsForm.contenido} onChange={e => setObsForm(p => ({ ...p, contenido: e.target.value }))} required />
                </div>
                <div className="form-actions">
                <button className="button primary" type="submit">Guardar observación</button>
                </div>
            </form>
            </div>
        )}
        </div>
    )
    }
