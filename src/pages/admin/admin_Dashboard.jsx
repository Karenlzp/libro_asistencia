    // src/pages/admin/Dashboard.jsx
    import { useEffect, useState } from 'react'
    import {
    getAlertas,
    getResumen,
    getUsuarios,
    getCursos,
    getAsignaturas,
    getHojaVidaAlumno,
    crearCurso,
    crearAsignatura,
    asignarProfesor,
    } from '../../services/adminService'

    // ── Helpers ───────────────────────────────────────────────────────────────────
    function getNotaClass(nota) {
    if (nota >= 5.5) return 'alta'
    if (nota >= 4.0) return 'media'
    return 'baja'
    }

    function calcPromedio(notas) {
    if (!notas.length) return null
    return (notas.reduce((s, n) => s + n.nota, 0) / notas.length).toFixed(1)
    }

    function calcAsistencia(asistencia) {
    if (!asistencia.length) return null
    const presentes = asistencia.filter(a => ['presente', 'justificado'].includes(a.estado)).length
    return Math.round((presentes / asistencia.length) * 100)
    }

    // ── Componente principal ──────────────────────────────────────────────────────
    export default function AdminDashboard() {
    const [tab, setTab]               = useState('alertas')
    const [resumen, setResumen]       = useState(null)
    const [alertas, setAlertas]       = useState([])
    const [usuarios, setUsuarios]     = useState([])
    const [cursos, setCursos]         = useState([])
    const [asignaturas, setAsignaturas] = useState([])
    const [loading, setLoading]       = useState(true)
    const [status, setStatus]         = useState(null)

    // Hoja de vida
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
    const [hojaVida, setHojaVida]     = useState(null)
    const [loadingHoja, setLoadingHoja] = useState(false)
    const [tabHoja, setTabHoja]       = useState('notas')

    // Forms
    const [cursoForm, setCursoForm]   = useState({ nivel: '', letra: '' })
    const [asigForm, setAsigForm]     = useState({ nombre: '' })
    const [asignForm, setAsignForm]   = useState({ profesorId: '', asignaturaId: '', cursoId: '' })

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        const [res, ale, usu, cur, asi] = await Promise.all([
        getResumen(),
        getAlertas(),
        getUsuarios(),
        getCursos(),
        getAsignaturas(),
        ])
        setResumen(res)
        setAlertas(ale.data ?? [])
        setUsuarios(usu.data ?? [])
        setCursos(cur.data ?? [])
        setAsignaturas(asi.data ?? [])
        setLoading(false)
    }

    const notify = (type, msg) => {
        setStatus({ type, msg })
        setTimeout(() => setStatus(null), 4000)
    }

    const handleVerHojaVida = async (alumno) => {
        setAlumnoSeleccionado(alumno)
        setLoadingHoja(true)
        setTabHoja('notas')
        const data = await getHojaVidaAlumno(alumno.id)
        setHojaVida(data)
        setLoadingHoja(false)
        setTab('hoja')
    }

    const handleCrearCurso = async (e) => {
        e.preventDefault()
        if (!cursoForm.nivel || !cursoForm.letra) return notify('error', 'Completa nivel y letra.')
        const { error } = await crearCurso(cursoForm)
        if (error) return notify('error', 'Error: ' + (error.message ?? 'ya existe ese curso'))
        notify('success', `Curso ${cursoForm.nivel}°${cursoForm.letra.toUpperCase()} creado.`)
        setCursoForm({ nivel: '', letra: '' })
        const { data } = await getCursos()
        setCursos(data ?? [])
    }

    const handleCrearAsignatura = async (e) => {
        e.preventDefault()
        if (!asigForm.nombre.trim()) return notify('error', 'Escribe el nombre.')
        const { error } = await crearAsignatura(asigForm)
        if (error) return notify('error', 'Error: ' + (error.message ?? 'ya existe esa asignatura'))
        notify('success', `Asignatura "${asigForm.nombre}" creada.`)
        setAsigForm({ nombre: '' })
        const { data } = await getAsignaturas()
        setAsignaturas(data ?? [])
    }

    const handleAsignarProfesor = async (e) => {
        e.preventDefault()
        const { profesorId, asignaturaId, cursoId } = asignForm
        if (!profesorId || !asignaturaId || !cursoId) return notify('error', 'Completa todos los campos.')
        const { error } = await asignarProfesor({ profesorId, asignaturaId, cursoId })
        if (error) return notify('error', 'Error: ' + (error.message ?? 'ya existe esa asignación'))
        notify('success', 'Profesor asignado correctamente.')
        setAsignForm({ profesorId: '', asignaturaId: '', cursoId: '' })
    }

    const profesores = usuarios.filter(u => u.rol === 'profesor')
    const alumnos    = usuarios.filter(u => u.rol === 'alumno')

    if (loading) {
        return <div className="loading-wrap"><div className="spinner" /> Cargando panel...</div>
    }

    return (
        <div>
        {/* ── Stats ── */}
        <div className="grid-4 section">
            <div className="stat-card">
            <div className="stat-icon lime">👥</div>
            <div>
                <div className="stat-value">{resumen?.alumnos ?? 0}</div>
                <div className="stat-label">Alumnos</div>
            </div>
            </div>
            <div className="stat-card">
            <div className="stat-icon blue">👨‍🏫</div>
            <div>
                <div className="stat-value">{resumen?.profesores ?? 0}</div>
                <div className="stat-label">Profesores</div>
            </div>
            </div>
            <div className="stat-card">
            <div className="stat-icon green">🏫</div>
            <div>
                <div className="stat-value">{resumen?.cursos ?? 0}</div>
                <div className="stat-label">Cursos</div>
            </div>
            </div>
            <div className="stat-card">
            <div className="stat-icon red">⚠️</div>
            <div>
                <div className="stat-value">{alertas.length}</div>
                <div className="stat-label">Alertas activas</div>
            </div>
            </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tab-strip">
            {[
            { key: 'alertas',   label: `⚠️ Alertas (${alertas.length})` },
            { key: 'usuarios',  label: '👥 Usuarios' },
            { key: 'cursos',    label: '🏫 Cursos y asignaturas' },
            { key: 'asignar',   label: '📋 Asignar profesor' },
            { key: 'hoja',      label: '📄 Hoja de vida' },
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

        {/* Feedback */}
        {status && (
            <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>
            {status.msg}
            </div>
        )}

        {/* ── Tab: Alertas ── */}
        {tab === 'alertas' && (
            <div className="card">
            <div className="card-header">
                <div>
                <div className="card-title">Alertas activas</div>
                <div className="card-subtitle">
                    Alumnos con promedio &lt; 4.0, asistencia &lt; 85% o 3+ anotaciones negativas
                </div>
                </div>
            </div>

            {alertas.length === 0 ? (
                <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <p>No hay alertas activas. ¡Todo en orden!</p>
                </div>
            ) : (
                <div className="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Alumno</th>
                        <th>Curso</th>
                        <th>Promedio</th>
                        <th>Asistencia</th>
                        <th>Anot. negativas</th>
                        <th>Alertas</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {alertas.map((a) => (
                        <tr key={a.alumno_id}>
                        <td><strong>{a.alumno}</strong></td>
                        <td>{a.curso}</td>
                        <td>
                            {a.promedio_general != null
                            ? <span className={`nota-pill ${getNotaClass(a.promedio_general)}`}>{a.promedio_general}</span>
                            : <span className="badge default">Sin notas</span>}
                        </td>
                        <td>
                            {a.porcentaje_asistencia != null
                            ? <span className={`badge ${a.porcentaje_asistencia < 85 ? 'negativa' : 'positiva'}`}>
                                {a.porcentaje_asistencia}%
                                </span>
                            : <span className="badge default">—</span>}
                        </td>
                        <td>
                            <span className={`badge ${a.anotaciones_negativas >= 3 ? 'negativa' : 'default'}`}>
                            {a.anotaciones_negativas}
                            </span>
                        </td>
                        <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {a.alerta_promedio    && <span className="badge negativa">Promedio</span>}
                            {a.alerta_asistencia  && <span className="badge negativa">Asistencia</span>}
                            {a.alerta_conducta    && <span className="badge negativa">Conducta</span>}
                        </td>
                        <td>
                            <button
                            className="button ghost"
                            style={{ padding: '5px 12px', fontSize: '.78rem' }}
                            onClick={() => handleVerHojaVida(
                                usuarios.find(u => u.id === a.alumno_id) ?? { id: a.alumno_id, nombre: a.alumno }
                            )}
                            >
                            Ver hoja
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

        {/* ── Tab: Usuarios ── */}
        {tab === 'usuarios' && (
            <div className="card">
            <div className="card-header">
                <div className="card-title">Usuarios del sistema</div>
                <div className="card-subtitle">{usuarios.length} usuarios registrados</div>
            </div>
            <div className="table-wrap">
                <table>
                <thead>
                    <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Curso</th>
                    <th>Registrado</th>
                    <th></th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((u) => (
                    <tr key={u.id}>
                        <td><strong>{u.nombre}</strong></td>
                        <td><span className="badge default">{u.rol}</span></td>
                        <td>
                        {u.cursos
                            ? `${u.cursos.nivel}°${u.cursos.letra}`
                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '.8rem' }}>
                        {new Date(u.created_at).toLocaleDateString('es-CL')}
                        </td>
                        <td>
                        {u.rol === 'alumno' && (
                            <button
                            className="button ghost"
                            style={{ padding: '5px 12px', fontSize: '.78rem' }}
                            onClick={() => handleVerHojaVida(u)}
                            >
                            Ver hoja
                            </button>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        )}

        {/* ── Tab: Cursos y asignaturas ── */}
        {tab === 'cursos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Crear curso */}
            <div className="card">
                <div className="card-header">
                <div className="card-title">Crear curso</div>
                </div>
                <form className="form-grid" onSubmit={handleCrearCurso}>
                <div className="form-group">
                    <label className="form-label">Nivel</label>
                    <input
                    className="form-input"
                    type="number" min="1" max="12"
                    placeholder="Ej: 4"
                    value={cursoForm.nivel}
                    onChange={e => setCursoForm(p => ({ ...p, nivel: e.target.value }))}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Letra</label>
                    <input
                    className="form-input"
                    placeholder="Ej: A"
                    maxLength={1}
                    value={cursoForm.letra}
                    onChange={e => setCursoForm(p => ({ ...p, letra: e.target.value }))}
                    />
                </div>
                <div className="form-actions">
                    <button className="button primary" type="submit">Crear curso</button>
                </div>
                </form>

                {/* Lista cursos */}
                <div style={{ marginTop: 20 }}>
                <div className="section-title">Cursos existentes</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cursos.map(c => (
                    <span key={c.id} className="badge default" style={{ fontSize: '.85rem', padding: '6px 14px' }}>
                        {c.nivel}°{c.letra}
                    </span>
                    ))}
                </div>
                </div>
            </div>

            {/* Crear asignatura */}
            <div className="card">
                <div className="card-header">
                <div className="card-title">Crear asignatura</div>
                </div>
                <form className="form-grid" onSubmit={handleCrearAsignatura}>
                <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input
                    className="form-input"
                    placeholder="Ej: Matemáticas"
                    value={asigForm.nombre}
                    onChange={e => setAsigForm({ nombre: e.target.value })}
                    />
                </div>
                <div className="form-actions">
                    <button className="button primary" type="submit">Crear asignatura</button>
                </div>
                </form>

                {/* Lista asignaturas */}
                <div style={{ marginTop: 20 }}>
                <div className="section-title">Asignaturas existentes</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {asignaturas.map(a => (
                    <span key={a.id} className="badge default" style={{ fontSize: '.85rem', padding: '6px 14px' }}>
                        {a.nombre}
                    </span>
                    ))}
                </div>
                </div>
            </div>
            </div>
        )}

        {/* ── Tab: Asignar profesor ── */}
        {tab === 'asignar' && (
            <div className="card">
            <div className="card-header">
                <div>
                <div className="card-title">Asignar profesor a curso y asignatura</div>
                <div className="card-subtitle">Define qué profesor enseña qué asignatura en qué curso</div>
                </div>
            </div>
            <form className="form-grid" onSubmit={handleAsignarProfesor}>
                <div className="form-group">
                <label className="form-label">Profesor</label>
                <select
                    className="form-select"
                    value={asignForm.profesorId}
                    onChange={e => setAsignForm(p => ({ ...p, profesorId: e.target.value }))}
                    required
                >
                    <option value="">Elegir profesor</option>
                    {profesores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Asignatura</label>
                <select
                    className="form-select"
                    value={asignForm.asignaturaId}
                    onChange={e => setAsignForm(p => ({ ...p, asignaturaId: e.target.value }))}
                    required
                >
                    <option value="">Elegir asignatura</option>
                    {asignaturas.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Curso</label>
                <select
                    className="form-select"
                    value={asignForm.cursoId}
                    onChange={e => setAsignForm(p => ({ ...p, cursoId: e.target.value }))}
                    required
                >
                    <option value="">Elegir curso</option>
                    {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>
                    ))}
                </select>
                </div>
                <div className="form-actions">
                <button className="button primary" type="submit">Asignar</button>
                </div>
            </form>
            </div>
        )}

        {/* ── Tab: Hoja de vida ── */}
        {tab === 'hoja' && (
            <div>
            {/* Selector de alumno */}
            <div className="card section">
                <div className="card-title" style={{ marginBottom: 12 }}>Seleccionar alumno</div>
                <select
                className="form-select"
                style={{ maxWidth: 300 }}
                value={alumnoSeleccionado?.id ?? ''}
                onChange={e => {
                    const a = alumnos.find(u => u.id === e.target.value)
                    if (a) handleVerHojaVida(a)
                }}
                >
                <option value="">— Elegir alumno —</option>
                {alumnos.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
                </select>
            </div>

            {loadingHoja && (
                <div className="loading-wrap"><div className="spinner" /> Cargando hoja de vida...</div>
            )}

            {!loadingHoja && hojaVida && alumnoSeleccionado && (
                <div>
                {/* Header alumno */}
                <div className="card section" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'var(--lime)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', flexShrink: 0
                    }}>
                    🎒
                    </div>
                    <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{alumnoSeleccionado.nombre}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '.82rem', marginTop: 2 }}>
                        {alumnoSeleccionado.cursos
                        ? `Curso ${alumnoSeleccionado.cursos.nivel}°${alumnoSeleccionado.cursos.letra}`
                        : 'Sin curso asignado'}
                    </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                        {calcPromedio(hojaVida.notas) ?? '—'}
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Promedio</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                        {calcAsistencia(hojaVida.asistencia) != null
                            ? calcAsistencia(hojaVida.asistencia) + '%'
                            : '—'}
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Asistencia</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                        {hojaVida.anotaciones.filter(a => a.tipo === 'negativa').length}
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Anot. neg.</div>
                    </div>
                    </div>
                </div>

                {/* Tabs hoja */}
                <div className="tab-strip">
                    {[
                    { key: 'notas',        label: `Notas (${hojaVida.notas.length})` },
                    { key: 'asistencia',   label: `Asistencia (${hojaVida.asistencia.length})` },
                    { key: 'anotaciones',  label: `Anotaciones (${hojaVida.anotaciones.length})` },
                    { key: 'retiros',      label: `Retiros (${hojaVida.retiros.length})` },
                    { key: 'observaciones',label: `Observaciones (${hojaVida.observaciones.length})` },
                    ].map(({ key, label }) => (
                    <button
                        key={key}
                        className={`tab-btn ${tabHoja === key ? 'active' : ''}`}
                        onClick={() => setTabHoja(key)}
                    >
                        {label}
                    </button>
                    ))}
                </div>

                {/* Notas */}
                {tabHoja === 'notas' && (
                    <div className="card">
                    {hojaVida.notas.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon">📝</div><p>Sin notas registradas.</p></div>
                        : <div className="table-wrap">
                            <table>
                            <thead><tr><th>Asignatura</th><th>Evaluación</th><th>%</th><th>Nota</th><th>Fecha</th></tr></thead>
                            <tbody>
                                {hojaVida.notas.map((n, i) => (
                                <tr key={i}>
                                    <td>{n.evaluaciones?.asignaturas?.nombre ?? '—'}</td>
                                    <td>{n.evaluaciones?.nombre ?? '—'}</td>
                                    <td>{n.evaluaciones?.porcentaje ?? '—'}</td>
                                    <td><span className={`nota-pill ${getNotaClass(n.nota)}`}>{n.nota.toFixed(1)}</span></td>
                                    <td>{n.evaluaciones?.fecha ?? '—'}</td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    }
                    </div>
                )}

                {/* Asistencia */}
                {tabHoja === 'asistencia' && (
                    <div className="card">
                    {hojaVida.asistencia.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon">📅</div><p>Sin registros de asistencia.</p></div>
                        : <div className="table-wrap">
                            <table>
                            <thead><tr><th>Fecha</th><th>Estado</th></tr></thead>
                            <tbody>
                                {hojaVida.asistencia.map((a, i) => (
                                <tr key={i}>
                                    <td>{a.fecha}</td>
                                    <td><span className={`badge ${a.estado}`}>{a.estado}</span></td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    }
                    </div>
                )}

                {/* Anotaciones */}
                {tabHoja === 'anotaciones' && (
                    <div className="card">
                    {hojaVida.anotaciones.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon">💬</div><p>Sin anotaciones.</p></div>
                        : <div className="table-wrap">
                            <table>
                            <thead><tr><th>Tipo</th><th>Descripción</th><th>Profesor</th><th>Fecha</th></tr></thead>
                            <tbody>
                                {hojaVida.anotaciones.map((a, i) => (
                                <tr key={i}>
                                    <td><span className={`badge ${a.tipo}`}>{a.tipo}</span></td>
                                    <td>{a.descripcion}</td>
                                    <td>{a.usuarios?.nombre ?? '—'}</td>
                                    <td>{a.fecha}</td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    }
                    </div>
                )}

                {/* Retiros */}
                {tabHoja === 'retiros' && (
                    <div className="card">
                    {hojaVida.retiros.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon">🚪</div><p>Sin retiros de clase.</p></div>
                        : <div className="table-wrap">
                            <table>
                            <thead><tr><th>Tipo</th><th>Motivo</th><th>Profesor</th><th>Fecha</th></tr></thead>
                            <tbody>
                                {hojaVida.retiros.map((r, i) => (
                                <tr key={i}>
                                    <td><span className="badge default">{r.tipo}</span></td>
                                    <td>{r.motivo}</td>
                                    <td>{r.usuarios?.nombre ?? '—'}</td>
                                    <td>{r.fecha}</td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    }
                    </div>
                )}

                {/* Observaciones */}
                {tabHoja === 'observaciones' && (
                    <div className="card">
                    {hojaVida.observaciones.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon">📋</div><p>Sin observaciones.</p></div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {hojaVida.observaciones.map((o, i) => (
                            <div key={i} style={{
                                padding: '14px 16px',
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: '3px solid var(--navy-light)'
                            }}>
                                <div style={{ fontSize: '.85rem', color: 'var(--navy)', marginBottom: 6 }}>
                                {o.contenido}
                                </div>
                                <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                                {o.usuarios?.nombre ?? '—'} · {o.fecha}
                                </div>
                            </div>
                            ))}
                        </div>
                    }
                    </div>
                )}
                </div>
            )}

            {!loadingHoja && !hojaVida && (
                <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <p>Selecciona un alumno para ver su hoja de vida.</p>
                </div>
            )}
            </div>
        )}
        </div>
    )
    }
