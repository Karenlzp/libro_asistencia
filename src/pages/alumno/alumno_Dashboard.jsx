    // src/pages/alumno/Dashboard.jsx
    import { useEffect, useState } from 'react'
    import {
    getPerfilAlumno,
    getNotasAlumno,
    getAsistenciaAlumno,
    getAnotacionesAlumno,
    getRetirosAlumno,
    getObservacionesAlumno,
    } from '../../services/alumnoService'

    // ── Helpers ───────────────────────────────────────────────────────────────────
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

    // Agrupa notas por asignatura
    function agruparPorAsignatura(notas) {
    const map = {}
    for (const n of notas) {
        const asig = n.evaluaciones?.asignaturas?.nombre ?? 'Sin asignatura'
        if (!map[asig]) map[asig] = []
        map[asig].push(n)
    }
    return map
    }

    // ── Componente principal ──────────────────────────────────────────────────────
    export default function AlumnoDashboard({ profile }) {
    const [tab, setTab] = useState('resumen')

    const [perfil,       setPerfil]       = useState(null)
    const [notas,        setNotas]        = useState([])
    const [asistencia,   setAsistencia]   = useState([])
    const [anotaciones,  setAnotaciones]  = useState([])
    const [retiros,      setRetiros]      = useState([])
    const [observaciones,setObservaciones]= useState([])
    const [loading,      setLoading]      = useState(true)
    const [error,        setError]        = useState(null)

    useEffect(() => {
        if (!profile?.id) return
        loadData()
    }, [profile])

    const loadData = async () => {
        setLoading(true)
        const [per, not, asi, ano, ret, obs] = await Promise.all([
        getPerfilAlumno(profile.id),
        getNotasAlumno(profile.id),
        getAsistenciaAlumno(profile.id),
        getAnotacionesAlumno(profile.id),
        getRetirosAlumno(profile.id),
        getObservacionesAlumno(profile.id),
        ])

        if (per.error) { setError('No se pudo cargar tu perfil.'); setLoading(false); return }

        setPerfil(per.data)
        setNotas(not.data ?? [])
        setAsistencia(asi.data ?? [])
        setAnotaciones(ano.data ?? [])
        setRetiros(ret.data ?? [])
        setObservaciones(obs.data ?? [])
        setLoading(false)
    }

    // ── Cálculos ──────────────────────────────────────────────────────────────
    const promedio      = calcPromedio(notas)
    const pctAsistencia = calcAsistencia(asistencia)
    const positivas     = anotaciones.filter(a => a.tipo === 'positiva').length
    const negativas     = anotaciones.filter(a => a.tipo === 'negativa').length
    const notasPorAsig  = agruparPorAsignatura(notas)

    // ── Alertas propias ───────────────────────────────────────────────────────
    const alertas = []
    if (promedio !== null && Number(promedio) < 4.0)
        alertas.push('Tu promedio general está bajo 4.0.')
    if (pctAsistencia !== null && pctAsistencia < 85)
        alertas.push(`Tu asistencia es ${pctAsistencia}%, está bajo el mínimo requerido (85%).`)
    if (negativas >= 3)
        alertas.push(`Tienes ${negativas} anotaciones negativas.`)

    if (loading) {
        return <div className="loading-wrap"><div className="spinner" /> Cargando tu información...</div>
    }

    if (error) {
        return <div className="alert error" style={{ marginTop: 24 }}>{error}</div>
    }

    return (
        <div>
        {/* ── Header alumno ── */}
        <div className="card section" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
            width: 60, height: 60, borderRadius: '50%',
background: 'var(--blue-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', flexShrink: 0,
            }}>
            🎒
            </div>
            <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>
                {perfil?.nombre}
            </div>
<div style={{ color: 'var(--gray-500)', fontSize: '.82rem', marginTop: 3 }}>
                {perfil?.cursos
                ? `Curso ${perfil.cursos.nivel}°${perfil.cursos.letra}`
                : 'Sin curso asignado'}
            </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                fontSize: '1.6rem', fontWeight: 700,
                color: promedio && Number(promedio) < 4 ? 'var(--danger)' : 'var(--navy)'
                }}>
                {promedio ?? '—'}
                </div>
<div style={{ fontSize: '.72rem', color: 'var(--gray-500)' }}>Promedio</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                fontSize: '1.6rem', fontWeight: 700,
                color: pctAsistencia && pctAsistencia < 85 ? 'var(--danger)' : 'var(--navy)'
                }}>
                {pctAsistencia !== null ? pctAsistencia + '%' : '—'}
                </div>
<div style={{ fontSize: '.72rem', color: 'var(--gray-500)' }}>Asistencia</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--navy)' }}>
                {notas.length}
                </div>
<div style={{ fontSize: '.72rem', color: 'var(--gray-500)' }}>Evaluaciones</div>
            </div>
            </div>
        </div>

        {/* ── Alertas propias ── */}
        {alertas.length > 0 && (
            <div style={{
            background: 'rgba(224,82,82,.08)',
            border: '1px solid rgba(224,82,82,.25)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            marginBottom: 24,
            }}>
            <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8, fontSize: '.88rem' }}>
                ⚠️ Atención
            </div>
            {alertas.map((a, i) => (
                <div key={i} style={{ fontSize: '.83rem', color: '#c03a3a', marginTop: 4 }}>
                • {a}
                </div>
            ))}
            </div>
        )}

        {/* ── Tabs ── */}
        <div className="tab-strip">
            {[
            { key: 'resumen',      label: '📊 Resumen' },
            { key: 'notas',        label: `📝 Notas (${notas.length})` },
            { key: 'asistencia',   label: `📅 Asistencia (${asistencia.length})` },
            { key: 'anotaciones',  label: `💬 Anotaciones (${anotaciones.length})` },
            { key: 'retiros',      label: `🚪 Retiros (${retiros.length})` },
            { key: 'observaciones',label: `📋 Observaciones (${observaciones.length})` },
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

            {/* Notas por asignatura */}
            <div className="card">
                <div className="card-header">
                <div className="card-title">Promedio por asignatura</div>
                </div>
                {Object.keys(notasPorAsig).length === 0 ? (
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
                        {Object.entries(notasPorAsig).map(([asig, ns]) => {
                        const prom = (ns.reduce((s, n) => s + n.nota, 0) / ns.length).toFixed(1)
                        const mejor  = Math.max(...ns.map(n => n.nota)).toFixed(1)
                        const menor  = Math.min(...ns.map(n => n.nota)).toFixed(1)
                        return (
                            <tr key={asig}>
                            <td><strong>{asig}</strong></td>
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
                <div className="card-title">Mis notas</div>
                <div className="card-subtitle">{notas.length} evaluaciones</div>
            </div>
            {notas.length === 0 ? (
                <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No tienes notas registradas aún.</p>
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
                    {notas.map((n, i) => (
                        <tr key={i}>
                        <td>{n.evaluaciones?.asignaturas?.nombre ?? '—'}</td>
                        <td>{n.evaluaciones?.nombre ?? '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>
                            {n.evaluaciones?.porcentaje ?? '—'}%
                        </td>
                        <td>
                            <span className={`nota-pill ${getNotaClass(n.nota)}`}>
                            {n.nota.toFixed(1)}
                            </span>
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
                <div className="card-title">Mi asistencia</div>
                <div className="card-subtitle">
                    {asistencia.filter(a => a.estado === 'presente').length} presentes ·{' '}
                    {asistencia.filter(a => a.estado === 'justificado').length} justificados ·{' '}
                    {asistencia.filter(a => a.estado === 'ausente').length} ausentes
                </div>
                </div>
                {pctAsistencia !== null && (
                <span className={`badge ${pctAsistencia < 85 ? 'negativa' : 'positiva'}`} style={{ fontSize: '.88rem', padding: '6px 14px' }}>
                    {pctAsistencia}% asistencia
                </span>
                )}
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
                    <tr><th>Fecha</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                    {asistencia.map(a => (
                        <tr key={a.id}>
                        <td>{a.fecha}</td>
                        <td>
                            <span className={`badge ${a.estado}`}>
                            {a.estado === 'presente' ? '✅ Presente'
                                : a.estado === 'ausente' ? '❌ Ausente'
                                : '📄 Justificado'}
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

        {/* ── Tab: Anotaciones ── */}
        {tab === 'anotaciones' && (
            <div className="card">
            <div className="card-header">
                <div className="card-title">Mis anotaciones</div>
                <div className="card-subtitle">
                {positivas} positivas · {negativas} negativas
                </div>
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
                            <span className={`badge ${a.tipo}`}>
                            {a.tipo === 'positiva' ? '👍 Positiva' : '👎 Negativa'}
                            </span>
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
                    <div key={o.id} style={{
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--navy-light)',
                    }}>
                    <div style={{ fontSize: '.85rem', color: 'var(--navy)', marginBottom: 6 }}>
                        {o.contenido}
                    </div>
<div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>
                        {o.usuarios?.nombre ?? '—'} · {o.fecha}
                    </div>
                    </div>
                ))}
                </div>
            )}
            </div>
        )}
        </div>
    )
    }
