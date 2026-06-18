// src/pages/admin/admin_Dashboard.jsx
import { useEffect, useState } from 'react'


import {
  getAlertas, getResumen, getUsuarios, getCursos,
  getAsignaturas, getAsignaciones, getHojaVidaAlumno,
  crearCurso, eliminarCurso, crearAsignatura,
  asignarProfesor, eliminarAsignacion,
  desactivarUsuario, getUsuariosInactivos, reactivarUsuario, modificarNota,
  crearAnotacionAdmin, cambiarCursoAlumno,
} from '../../services/adminService'
import { downloadAuditExcel, getAuditLogs } from '../../services/auditService'
import { exportAdminReportsToExcel, getAdminReports, printAdminReport } from '../../services/reportService'

function StudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 3 8.5 12 13l7-3.5V15h2V8.5L12 4Zm-5 8.63V16c0 1.66 2.24 3 5 3s5-1.34 5-3v-3.37l-5 2.5-5-2.5Z" fill="currentColor" />
    </svg>
  )
}

function TeacherIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.75A1.75 1.75 0 0 1 6.75 4h10.5A1.75 1.75 0 0 1 19 5.75v8.5A1.75 1.75 0 0 1 17.25 16h-4.36l-2.67 2.29A.75.75 0 0 1 9 17.72V16H6.75A1.75 1.75 0 0 1 5 14.25v-8.5Zm3.25 2a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5H13a.75.75 0 0 0 0-1.5H8.25Z" fill="currentColor" />
    </svg>
  )
}

function CourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 5A1.75 1.75 0 0 0 3 6.75v10.5C3 18.22 3.78 19 4.75 19h14.5c.97 0 1.75-.78 1.75-1.75V6.75C21 5.78 20.22 5 19.25 5H4.75Zm.75 2h13v10h-13V7Zm2.25 2.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" fill="currentColor" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.75a1 1 0 0 1 .9.56l7 14A1 1 0 0 1 19 19.75H5a1 1 0 0 1-.9-1.44l7-14a1 1 0 0 1 .9-.56Zm0 5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0V9.5a.75.75 0 0 0-.75-.75Zm0 8.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c4.85 0 8.63 2.88 10.5 7-1.87 4.12-5.65 7-10.5 7S3.37 16.12 1.5 12C3.37 7.88 7.15 5 12 5Zm0 2C8.18 7 5.14 9.13 3.58 12 5.14 14.87 8.18 17 12 17s6.86-2.13 8.42-5C18.86 9.13 15.82 7 12 7Zm0 1.75A3.25 3.25 0 1 1 8.75 12 3.25 3.25 0 0 1 12 8.75Zm0 1.5A1.75 1.75 0 1 0 13.75 12 1.75 1.75 0 0 0 12 10.25Z" fill="currentColor" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNotaClass(n) {
  if (n >= 5.5) return 'alta'
  if (n >= 4.0) return 'media'
  return 'baja'
}
function calcPromedio(notas) {
  if (!notas.length) return null
  return (notas.reduce((s, n) => s + n.nota, 0) / notas.length).toFixed(1)
}
function calcAsistencia(lista) {
  if (!lista.length) return null
  return Math.round(lista.filter(a => ['presente', 'justificado'].includes(a.estado)).length / lista.length * 100)
}

function getAlertValueClass(type, value) {
  if (value == null) return 'muted'
  if (type === 'promedio') return Number(value) < 4 ? 'critical' : 'normal'
  if (type === 'asistencia') return Number(value) < 85 ? 'critical' : 'normal'
  if (type === 'conducta') return Number(value) >= 3 ? 'critical' : 'normal'
  return 'normal'
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAuditValue(value) {
  if (!value) return '—'

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(parsed)) return `${parsed.length} registro(s)`
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, item]) => `${key}: ${item ?? '—'}`)
        .join(' · ')
    }
    return String(parsed)
  } catch {
    return String(value)
  }
}

export default function AdminDashboard({ profile }) {
  const [tab, setTab]                   = useState('alertas')
  const [resumen, setResumen]           = useState(null)
  const [alertas, setAlertas]           = useState([])
  const [usuarios, setUsuarios]         = useState([])
  const [cursos, setCursos]             = useState([])
  const [asignaturas, setAsignaturas]   = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [status, setStatus]             = useState(null)
  const [usuariosInactivos, setUsuariosInactivos] = useState([])
  const [reportes, setReportes]         = useState(null)
  const [loadingReportes, setLoadingReportes] = useState(false)
  const [auditoria, setAuditoria]       = useState([])
  const [loadingAuditoria, setLoadingAuditoria] = useState(false)
  const [auditStorage, setAuditStorage] = useState('supabase')
  const [auditWarning, setAuditWarning] = useState(null)
  const [auditFilters, setAuditFilters] = useState({ search: '', action: '', entity: '' })

  // Hoja de vida

  const [alumnoSel, setAlumnoSel]       = useState(null)
  const [hojaVida, setHojaVida]         = useState(null)
  const [loadingHoja, setLoadingHoja]   = useState(false)
  const [tabHoja, setTabHoja]           = useState('notas')

  // Búsqueda de alumnos
  const [busqueda, setBusqueda]         = useState('')

  // Forms cursos/asignaturas
  const [cursoForm, setCursoForm]       = useState({ nivel: '', letra: '' })
  const [asigForm, setAsigForm]         = useState({ nombre: '' })

  // Form asignar profesor
  const [asignForm, setAsignForm]       = useState({ profesorId: '', asignaturaId: '', cursoId: '' })

  // Form anotación admin
  const [anotForm, setAnotForm]         = useState({ tipo: 'positiva', descripcion: '' })

  // Nota editando
  const [notaEditando, setNotaEditando] = useState(null)  // { id, valor }

  // Cambio de curso
  const [cursoCambio, setCursoCambio]   = useState('')

  useEffect(() => {
    if (!profile?.id) return
    loadData()
    void loadReportes()
    void loadAuditoria()
  }, [profile?.id])

  const loadData = async () => {

    setLoading(true)
    const [res, ale, usu, cur, asi, asgn, usuInactivos] = await Promise.all([
      getResumen(), getAlertas(), getUsuarios(),
      getCursos(), getAsignaturas(), getAsignaciones(),
      getUsuariosInactivos(),
    ])
    setResumen(res)
    setAlertas(ale.data ?? [])
    setUsuarios(usu.data ?? [])
    setUsuariosInactivos(usuInactivos.data ?? [])
    setCursos(cur.data ?? [])

    setAsignaturas(asi.data ?? [])
    setAsignaciones(asgn.data ?? [])
    setLoading(false)
  }

  const loadReportes = async () => {
    setLoadingReportes(true)
    const { data, error } = await getAdminReports()
    if (error) {
      notify('error', error.message)
    } else {
      setReportes(data)
    }
    setLoadingReportes(false)
  }

  const loadAuditoria = async () => {
    setLoadingAuditoria(true)
    const { data, storage, warning } = await getAuditLogs({ limit: 250 })
    setAuditoria(data ?? [])
    setAuditStorage(storage)
    setAuditWarning(warning)
    setLoadingAuditoria(false)
  }


  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 5000)
  }

  const refreshInsights = () => {
    void loadReportes()
    void loadAuditoria()
  }

  // ── Hoja de vida ──────────────────────────────────────────────────────────
  const handleVerHoja = async (alumno) => {
    setAlumnoSel(alumno)
    setLoadingHoja(true)
    setTabHoja('notas')
    setTab('hoja')
    setNotaEditando(null)
    setAnotForm({ tipo: 'positiva', descripcion: '' })
    setCursoCambio(alumno.curso_id ?? '')
    const data = await getHojaVidaAlumno(alumno.id)
    setHojaVida(data)
    setLoadingHoja(false)
  }

  const recargarHoja = async () => {
    if (!alumnoSel) return
    const data = await getHojaVidaAlumno(alumnoSel.id)
    setHojaVida(data)
  }

  // ── Crear curso ───────────────────────────────────────────────────────────
  const handleCrearCurso = async (e) => {
    e.preventDefault()
    if (!cursoForm.nivel || !cursoForm.letra) return notify('error', 'Completa nivel y letra.')
    if (!/^[A-Za-z]+$/.test(cursoForm.letra)) return notify('error', 'La letra solo puede contener letras (A, B, C...).')
    const { error } = await crearCurso({ ...cursoForm, actor: profile })
    if (error) return notify('error', error.message.includes('unique') ? 'Ese curso ya existe.' : error.message)
    notify('success', `Curso ${cursoForm.nivel}°${cursoForm.letra.toUpperCase()} creado.`)
    setCursoForm({ nivel: '', letra: '' })
    const { data } = await getCursos(); setCursos(data ?? [])
    const res = await getResumen(); setResumen(res)
    refreshInsights()
  }

  // ── Eliminar curso ────────────────────────────────────────────────────────
  const handleEliminarCurso = async (curso) => {
    const alumnosEnCurso = usuarios.filter(u => u.cursos?.nivel === curso.nivel && u.cursos?.letra === curso.letra)
    const msg = alumnosEnCurso.length > 0
      ? `¿Eliminar el curso ${curso.nivel}°${curso.letra}? ${alumnosEnCurso.length} alumno(s) quedarán sin curso asignado.`
      : `¿Eliminar el curso ${curso.nivel}°${curso.letra}?`
    if (!confirm(msg)) return
    const { error } = await eliminarCurso(curso.id, profile)
    if (error) return notify('error', error.message)
    notify('success', `Curso ${curso.nivel}°${curso.letra} eliminado.`)
    const { data } = await getCursos(); setCursos(data ?? [])
    const res = await getResumen(); setResumen(res)
    refreshInsights()
  }

  // ── Crear asignatura ──────────────────────────────────────────────────────
  const handleCrearAsig = async (e) => {
    e.preventDefault()
    if (!asigForm.nombre.trim()) return notify('error', 'Escribe el nombre.')
    const yaExiste = asignaturas.some(a => a.nombre.toLowerCase() === asigForm.nombre.trim().toLowerCase())
    if (yaExiste) return notify('error', `La asignatura "${asigForm.nombre}" ya existe.`)
    const { error } = await crearAsignatura({ ...asigForm, actor: profile })
    if (error) return notify('error', error.message)
    notify('success', `Asignatura "${asigForm.nombre}" creada.`)
    setAsigForm({ nombre: '' })
    const { data } = await getAsignaturas(); setAsignaturas(data ?? [])
    refreshInsights()
  }

  // ── Asignar profesor ──────────────────────────────────────────────────────
  const yaExisteAsignacion = asignaciones.some(a =>
    a.profesor_id   === asignForm.profesorId &&
    a.asignatura_id === asignForm.asignaturaId &&
    a.curso_id      === asignForm.cursoId
  )

  const handleAsignar = async (e) => {
    e.preventDefault()
    const { profesorId, asignaturaId, cursoId } = asignForm
    if (!profesorId || !asignaturaId || !cursoId) return notify('error', 'Completa todos los campos.')
    if (yaExisteAsignacion) return notify('error', 'Esta asignación ya existe.')
    const { error } = await asignarProfesor({ profesorId, asignaturaId, cursoId, actor: profile })
    if (error) return notify('error', error.message)
    notify('success', 'Profesor asignado correctamente.')
    setAsignForm({ profesorId: '', asignaturaId: '', cursoId: '' })
    const { data } = await getAsignaciones(); setAsignaciones(data ?? [])
    refreshInsights()
  }

  const handleEliminarAsig = async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return
    const { error } = await eliminarAsignacion(id, profile)
    if (error) return notify('error', error.message)
    notify('success', 'Asignación eliminada.')
    const { data } = await getAsignaciones(); setAsignaciones(data ?? [])
    refreshInsights()
  }

  // ── Desactivar usuario ────────────────────────────────────────────────────
  const handleDesactivar = async (u) => {
    if (!confirm(`¿Deshabilitar a ${u.nombre}? No se puede deshacer.`)) return
    const { error } = await desactivarUsuario(u.id, profile)
    if (error) return notify('error', error.message)
    notify('success', 'Usuario deshabilitado correctamente.')
    await loadData()
    refreshInsights()
  }

  // ── Modificar nota ────────────────────────────────────────────────────────
  const handleModificarNota = async (detalleNotaId, valorActual) => {
    const nuevaNota = notaEditando?.id === detalleNotaId ? notaEditando.valor : valorActual
    if (!nuevaNota || isNaN(nuevaNota) || nuevaNota < 1 || nuevaNota > 7)
      return notify('error', 'La nota debe estar entre 1.0 y 7.0.')
    const { error } = await modificarNota({ detalleNotaId, nota: nuevaNota, actor: profile })
    if (error) return notify('error', error.message)
    notify('success', 'Nota modificada correctamente.')
    setNotaEditando(null)
    await recargarHoja()
    refreshInsights()
  }

  // ── Agregar anotación (admin) ─────────────────────────────────────────────
  const handleCrearAnotacion = async (e) => {
    e.preventDefault()
    if (!anotForm.descripcion.trim()) return notify('error', 'Escribe una descripción.')
    const { error } = await crearAnotacionAdmin({
      alumnoId:    alumnoSel.id,
      adminId:     profile.id,
      tipo:        anotForm.tipo,
      descripcion: anotForm.descripcion,
      actor:       profile,
    })
    if (error) return notify('error', error.message)
    notify('success', 'Anotación agregada.')
    setAnotForm({ tipo: 'positiva', descripcion: '' })
    await recargarHoja()
    refreshInsights()
  }

  // ── Cambiar curso alumno ──────────────────────────────────────────────────
  const handleCambiarCurso = async () => {
    if (!cursoCambio) return notify('error', 'Selecciona un curso.')
    if (cursoCambio === alumnoSel.curso_id) return notify('error', 'El alumno ya está en ese curso.')
    const { error } = await cambiarCursoAlumno({ alumnoId: alumnoSel.id, cursoId: cursoCambio, actor: profile })
    if (error) return notify('error', error.message)
    notify('success', 'Curso actualizado correctamente.')
    await loadData()
    const alumnoActualizado = { ...alumnoSel, curso_id: cursoCambio }
    setAlumnoSel(alumnoActualizado)
    refreshInsights()
  }

  const profesores = usuarios.filter(u => u.rol === 'profesor')
  const alumnos    = usuarios.filter(u => u.rol === 'alumno')

  // Búsqueda filtrada
  const alumnosFiltrados = alumnos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )
  const auditoriaFiltrada = auditoria.filter((log) => {
    const search = auditFilters.search.trim().toLowerCase()
    const matchesSearch = !search || [
      log.actor_name,
      log.action,
      log.entity,
      log.field_name,
    ].some((value) => String(value ?? '').toLowerCase().includes(search))

    const matchesAction = !auditFilters.action || log.action === auditFilters.action
    const matchesEntity = !auditFilters.entity || log.entity === auditFilters.entity

    return matchesSearch && matchesAction && matchesEntity
  })
  const auditActions = [...new Set(auditoria.map((log) => log.action).filter(Boolean))]
  const auditEntities = [...new Set(auditoria.map((log) => log.entity).filter(Boolean))]

  if (loading) return <div className="loading-wrap"><div className="spinner" /> Cargando panel...</div>

  return (

    <div className="admin-dashboard">
      {/* Stats */}
      <div className="admin-kpi-grid section">
        {[
          { icon: '👥',         value: resumen?.alumnos ?? 0,    label: 'Alumnos',        cls: 'blue', emoji: true  },
          { icon: '👨‍🏫',       value: resumen?.profesores ?? 0, label: 'Profesores',      cls: 'lime', emoji: true  },
          { icon: '🏫',         value: resumen?.cursos ?? 0,     label: 'Cursos',          cls: 'green', emoji: true },
          { icon: AlertIcon,    value: alertas.length,           label: 'Alertas activas', cls: 'red', urgent: true },
        ].map((s, i) => (
          <div key={i} className={`admin-kpi-card ${s.urgent ? 'urgent' : ''}`}>
            <div className={`admin-kpi-icon ${s.cls} ${s.emoji ? 'emoji' : ''}`}>
              {s.emoji ? s.icon : <s.icon />}
            </div>
            <div className="admin-kpi-copy">
              <div className="admin-kpi-value">{s.value}</div>
              <div className="admin-kpi-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-strip admin-tab-strip">
        {[
          { key: 'alertas',  label: `Alertas (${alertas.length})` },
          { key: 'reportes', label: 'Reportes' },
          { key: 'auditoria', label: `Auditoría (${auditoria.length})` },
          { key: 'usuarios', label: 'Usuarios' },
          { key: 'usuarios_inactivos', label: 'Usuarios deshabilitados' },

          { key: 'cursos',   label: 'Cursos y asignaturas' },
          { key: 'asignar',  label: 'Asignar profesor' },
          { key: 'hoja',     label: 'Hoja de vida' },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn admin-tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      {/* ── Tab: Alertas ── */}
      {tab === 'alertas' && (
        <div className="admin-alert-card">
          <div className="card-header admin-alert-header">
            <div>
              <div className="card-title">Alertas activas</div>
              <div className="card-subtitle">Promedio &lt; 4.0 · Asistencia &lt; 85% · 3+ anotaciones negativas</div>
            </div>
          </div>
          {alertas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p>Sin alertas activas. Todo en orden.</p>
            </div>
          ) : (
            <div className="table-wrap admin-alert-table-wrap">
              <table>
                <thead>
                  <tr><th>Alumno</th><th>Curso</th><th>Promedio</th><th>Asistencia</th><th>Anot. neg.</th><th>Alertas</th><th></th></tr>
                </thead>
                <tbody>
                  {alertas.map(a => (
                    <tr key={a.alumno_id}>
                      <td className="admin-cell-strong"><strong>{a.alumno}</strong></td>
                      <td className="admin-cell-muted">{a.curso}</td>
                      <td>
                        {a.promedio_general != null
                          ? <span className={`admin-alert-value ${getAlertValueClass('promedio', a.promedio_general)}`}>{a.promedio_general}</span>
                          : <span className="admin-alert-value muted">Sin notas</span>}
                      </td>
                      <td>
                        <span className={`admin-alert-value ${getAlertValueClass('asistencia', a.porcentaje_asistencia)}`}>
                          {a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-alert-value ${getAlertValueClass('conducta', a.anotaciones_negativas)}`}>
                          {a.anotaciones_negativas}
                        </span>
                      </td>
                      <td>
                        <div className="admin-alert-badges">
                          {a.alerta_promedio   && <span className="badge admin-badge-red">Promedio</span>}
                          {a.alerta_asistencia && <span className="badge admin-badge-amber">Asistencia</span>}
                          {a.alerta_conducta   && <span className="badge admin-badge-slate">Conducta</span>}
                        </div>
                      </td>
                      <td>
                        <button className="admin-link-button"
                          onClick={() => handleVerHoja(usuarios.find(u => u.id === a.alumno_id) ?? { id: a.alumno_id, nombre: a.alumno })}>
                          <EyeIcon />
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

      {/* ── Tab: Reportes ── */}
      {tab === 'reportes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reportes generales</div>
                <div className="card-subtitle">Resumen institucional, rendimiento por curso y exportación compatible con Excel/PDF.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="button ghost" onClick={loadReportes}>Actualizar</button>
                <button className="button ghost" onClick={() => { void exportAdminReportsToExcel(reportes) }} disabled={!reportes}>
                  Exportar Excel
                </button>
                <button className="button primary" onClick={() => printAdminReport(reportes)} disabled={!reportes}>
                  Imprimir / PDF
                </button>
              </div>
            </div>

            {loadingReportes && !reportes ? (
              <div className="loading-wrap"><div className="spinner" /> Cargando reportes...</div>
            ) : !reportes ? (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <p>No se pudo cargar el resumen de reportes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="admin-report-grid">
                  {[
                    { label: 'Promedio general', value: reportes.resumen.promedioGeneral ?? '—', hint: 'Todas las notas registradas' },
                    { label: 'Asistencia general', value: reportes.resumen.asistenciaGeneral ? `${reportes.resumen.asistenciaGeneral}%` : '—', hint: 'Presentes y justificados' },
                    { label: 'Evaluaciones del mes', value: reportes.resumen.evaluacionesMesActual ?? 0, hint: 'Mes calendario actual' },
                    { label: 'Cobertura docente', value: reportes.resumen.coberturaDocente ? `${reportes.resumen.coberturaDocente}%` : '—', hint: 'Profesores con asignaciones' },
                  ].map((item) => (
                    <div key={item.label} className="admin-report-card">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.hint}</small>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: 0, boxShadow: 'none' }}>
                  <div className="card-header" style={{ padding: '22px 24px 0', borderBottom: 'none', marginBottom: 10 }}>
                    <div>
                      <div className="card-title">Rendimiento por curso</div>
                      <div className="card-subtitle">Cruza alumnos activos, promedio, asistencia, alertas y asignaciones.</div>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Curso</th><th>Alumnos</th><th>Promedio</th><th>Asistencia</th><th>Alertas</th><th>Asignaciones</th></tr>
                      </thead>
                      <tbody>
                        {reportes.rendimientoPorCurso.map((curso) => (
                          <tr key={curso.id}>
                            <td><strong>{curso.curso}</strong></td>
                            <td>{curso.alumnos}</td>
                            <td>{curso.promedio != null ? <span className={`admin-alert-value ${Number(curso.promedio) < 4 ? 'critical' : 'normal'}`}>{curso.promedio}</span> : '—'}</td>
                            <td>{curso.asistencia != null ? <span className={`admin-alert-value ${Number(curso.asistencia) < 85 ? 'critical' : 'normal'}`}>{curso.asistencia}%</span> : '—'}</td>
                            <td>{curso.alertas}</td>
                            <td>{curso.asignaciones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card" style={{ padding: 0, boxShadow: 'none' }}>
                  <div className="card-header" style={{ padding: '22px 24px 0', borderBottom: 'none', marginBottom: 10 }}>
                    <div>
                      <div className="card-title">Alertas destacadas del reporte</div>
                      <div className="card-subtitle">Muestra inicial para respaldo rápido del estado académico.</div>
                    </div>
                  </div>
                  {reportes.alertasDestacadas.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">✅</div>
                      <p>No hay alertas activas en este momento.</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Alumno</th><th>Curso</th><th>Promedio</th><th>Asistencia</th><th>Anot. neg.</th></tr>
                        </thead>
                        <tbody>
                          {reportes.alertasDestacadas.map((alerta) => (
                            <tr key={alerta.alumno_id}>
                              <td><strong>{alerta.alumno}</strong></td>
                              <td>{alerta.curso}</td>
                              <td>{alerta.promedio_general ?? '—'}</td>
                              <td>{alerta.porcentaje_asistencia != null ? `${alerta.porcentaje_asistencia}%` : '—'}</td>
                              <td>{alerta.anotaciones_negativas ?? 0}</td>
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
        </div>
      )}

      {/* ── Tab: Auditoría ── */}
      {tab === 'auditoria' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Auditoría del sistema</div>
                <div className="card-subtitle">Registra acciones ejecutadas desde los módulos de admin, profesor y PIE.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="button ghost" onClick={loadAuditoria}>Actualizar</button>
                <button className="button primary" onClick={() => { void downloadAuditExcel(auditoriaFiltrada) }} disabled={!auditoriaFiltrada.length}>
                  Exportar Excel
                </button>
              </div>
            </div>

            {auditStorage !== 'supabase' && (
              <div className="alert warning" style={{ marginBottom: 14 }}>
                La auditoría está funcionando en modo {auditStorage === 'mixed' ? 'mixto' : 'local'}.
                {auditWarning ? ` Motivo detectado: ${auditWarning}.` : ''}
              </div>
            )}

            <div className="admin-audit-filters">
              <input
                className="form-input"
                placeholder="Buscar por usuario, acción o módulo..."
                value={auditFilters.search}
                onChange={(e) => setAuditFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
              <select
                className="form-select"
                value={auditFilters.action}
                onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
              >
                <option value="">Todas las acciones</option>
                {auditActions.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
              <select
                className="form-select"
                value={auditFilters.entity}
                onChange={(e) => setAuditFilters((prev) => ({ ...prev, entity: e.target.value }))}
              >
                <option value="">Todos los módulos</option>
                {auditEntities.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
              </select>
            </div>

            <div className="admin-audit-summary">
              <span className="badge default">{auditoriaFiltrada.length} evento(s)</span>
              <span className="badge blue">Origen: {auditStorage}</span>
            </div>

            {loadingAuditoria && !auditoria.length ? (
              <div className="loading-wrap"><div className="spinner" /> Cargando auditoría...</div>
            ) : auditoriaFiltrada.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <p>No hay eventos de auditoría con los filtros actuales.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Módulo</th><th>Campo</th><th>Anterior</th><th>Nuevo</th></tr>
                  </thead>
                  <tbody>
                    {auditoriaFiltrada.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.created_at)}</td>
                        <td><strong>{log.actor_name ?? 'Sistema'}</strong></td>
                        <td><span className="badge default">{log.actor_role ?? 'sistema'}</span></td>
                        <td>{log.action ?? '—'}</td>
                        <td>{log.entity ?? '—'}</td>
                        <td>{log.field_name ?? '—'}</td>
                        <td>{formatAuditValue(log.old_value)}</td>
                        <td>{formatAuditValue(log.new_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Usuarios ── */}
      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Usuarios del sistema</div>
            <div className="card-subtitle">{usuarios.length} usuarios activos</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Rol</th><th>Curso</th><th>Registrado</th><th></th><th></th></tr>
              </thead>
                  <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td><span className="badge default">{u.rol}</span></td>
                    <td>{u.cursos ? `${u.cursos.nivel}°${u.cursos.letra}` : <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '.78rem' }}>
                      {new Date(u.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td>
                      {u.rol === 'alumno' && (
                        <button className="button ghost" style={{ fontSize: '.75rem', padding: '4px 10px' }}
                          onClick={() => handleVerHoja(u)}>
                          Ver hoja
                        </button>
                      )}
                    </td>
                    <td>
                        <button
                        className="button ghost"
                        style={{ fontSize: '.75rem', padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                        onClick={() => handleDesactivar(u)}>
                        Deshabilitar
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Usuarios deshabilitados ── */}
      {tab === 'usuarios_inactivos' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Usuarios deshabilitados</div>
            <div className="card-subtitle">{usuariosInactivos.length} usuarios deshabilitados</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Rol</th><th>Curso</th><th>Registrado</th><th></th><th></th></tr>
              </thead>
              <tbody>
                {usuariosInactivos.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td><span className="badge default">{u.rol}</span></td>
                    <td>{u.cursos ? `${u.cursos.nivel}°${u.cursos.letra}` : <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '.78rem' }}>
                      {new Date(u.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td>
                      {u.rol === 'alumno' && (
                        <button className="button ghost" style={{ fontSize: '.75rem', padding: '4px 10px' }}
                          onClick={() => handleVerHoja(u)}>
                          Ver hoja
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        className="button ghost"
                        style={{ fontSize: '.75rem', padding: '4px 10px', color: 'var(--success)', borderColor: 'var(--success-border)' }}
                        onClick={async () => {
                          if (!confirm(`¿Reactivar a ${u.nombre}?`)) return
                          const { error } = await reactivarUsuario(u.id, profile)
                          if (error) return notify('error', error.message)
                          notify('success', 'Usuario reactivado correctamente.')
                          await loadData()
                          refreshInsights()
                        }}>
                        Reactivar
                      </button>
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
            <div className="card-header"><div className="card-title">Crear curso</div></div>
            <form className="form-grid" onSubmit={handleCrearCurso}>
              <div className="form-group">
                <label className="form-label">Nivel</label>
                <input className="form-input" type="number" min="1" max="12" placeholder="Ej: 4"
                  value={cursoForm.nivel} onChange={e => setCursoForm(p => ({ ...p, nivel: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Letra (solo letras: A, B, C...)</label>
                <input className="form-input" placeholder="Ej: A" maxLength={2}
                  value={cursoForm.letra}
                  onChange={e => {
                    const val = e.target.value.replace(/[^A-Za-z]/g, '')
                    setCursoForm(p => ({ ...p, letra: val }))
                  }} />
              </div>
              <div className="form-actions">
                <button className="button primary" type="submit">Crear curso</button>
              </div>
            </form>

            {/* Lista cursos con botón eliminar */}
            <div style={{ marginTop: 16 }}>
              <div className="section-title">Cursos existentes</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {cursos.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--blue-light)', border: '1px solid #bee3f8', borderRadius: 'var(--radius-sm)', padding: '4px 10px' }}>
                    <span style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--blue-mid)' }}>
                      {c.nivel}°{c.letra}
                    </span>
                    <button
                      onClick={() => handleEliminarCurso(c)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '.75rem', padding: '0 2px', lineHeight: 1 }}
                      title="Eliminar curso">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crear asignatura */}
          <div className="card">
            <div className="card-header"><div className="card-title">Crear asignatura</div></div>
            <form className="form-grid" onSubmit={handleCrearAsig}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" placeholder="Ej: Matemáticas"
                  value={asigForm.nombre} onChange={e => setAsigForm({ nombre: e.target.value })} />
              </div>
              <div className="form-actions">
                <button className="button primary" type="submit">Crear asignatura</button>
              </div>
            </form>
            <div style={{ marginTop: 16 }}>
              <div className="section-title">Asignaturas existentes</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {asignaturas.map(a => (
                  <span key={a.id} className="badge default" style={{ fontSize: '.82rem', padding: '5px 12px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Asignar profesor a curso y asignatura</div>
                <div className="card-subtitle">Las combinaciones ya existentes se marcan en amarillo</div>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleAsignar}>
              <div className="form-group">
                <label className="form-label">Profesor</label>
                <select className="form-select" value={asignForm.profesorId}
                  onChange={e => setAsignForm(p => ({ ...p, profesorId: e.target.value }))} required>
                  <option value="">Elegir profesor</option>
                  {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignatura</label>
                <select className="form-select" value={asignForm.asignaturaId}
                  onChange={e => setAsignForm(p => ({ ...p, asignaturaId: e.target.value }))} required>
                  <option value="">Elegir asignatura</option>
                  {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Curso</label>
                <select className="form-select" value={asignForm.cursoId}
                  onChange={e => setAsignForm(p => ({ ...p, cursoId: e.target.value }))} required>
                  <option value="">Elegir curso</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>)}
                </select>
              </div>

              {yaExisteAsignacion && (
                <div className="form-group full">
                  <div className="alert warning">
                    ⚠️ Esta combinación ya existe. Ese profesor ya está asignado a esa asignatura y curso.
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button className="button primary" type="submit" disabled={yaExisteAsignacion}>
                  Asignar
                </button>
              </div>
            </form>
          </div>

          {/* Tabla asignaciones — filas en amarillo si coincide con selección actual */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Asignaciones actuales</div>
              <div className="card-subtitle">{asignaciones.length} registradas</div>
            </div>
            {asignaciones.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><p>No hay asignaciones.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Profesor</th><th>Asignatura</th><th>Curso</th><th></th></tr>
                  </thead>
                  <tbody>
                    {asignaciones.map(a => {
                      const coincide =
                        (asignForm.profesorId   === '' || a.profesor_id   === asignForm.profesorId) &&
                        (asignForm.asignaturaId === '' || a.asignatura_id === asignForm.asignaturaId) &&
                        (asignForm.cursoId      === '' || a.curso_id      === asignForm.cursoId) &&
                        (asignForm.profesorId !== '' || asignForm.asignaturaId !== '' || asignForm.cursoId !== '')

                      return (
                        <tr key={a.id} style={{ background: coincide ? 'var(--warning-bg)' : undefined }}>
                          <td>
                            {coincide && <span style={{ marginRight: 6 }}>⚠️</span>}
                            {a.usuarios?.nombre ?? '—'}
                          </td>
                          <td>{a.asignaturas?.nombre ?? '—'}</td>
                          <td>{a.cursos ? `${a.cursos.nivel}°${a.cursos.letra}` : '—'}</td>
                          <td>
                            <button className="button ghost"
                              style={{ fontSize: '.75rem', padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                              onClick={() => handleEliminarAsig(a.id)}>
                              Eliminar
                            </button>
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

      {/* ── Tab: Hoja de vida ── */}
      {tab === 'hoja' && (
        <div>
          {/* Buscador + selector */}
          <div className="card section">
            <div className="card-title" style={{ marginBottom: 12 }}>Buscar alumno</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="Buscar por nombre..."
                style={{ maxWidth: 260 }}
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <select className="form-select" style={{ maxWidth: 260 }}
                value={alumnoSel?.id ?? ''}
                onChange={e => {
                  const a = alumnos.find(u => u.id === e.target.value)
                  if (a) handleVerHoja(a)
                }}>
                <option value="">— Elegir alumno —</option>
                {alumnosFiltrados.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.cursos ? `(${a.cursos.nivel}°${a.cursos.letra})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {busqueda && (
              <div style={{ marginTop: 8, fontSize: '.78rem', color: 'var(--gray-500)' }}>
                {alumnosFiltrados.length} resultado(s) para "{busqueda}"
              </div>
            )}
          </div>

          {loadingHoja && <div className="loading-wrap"><div className="spinner" /> Cargando hoja de vida...</div>}

          {!loadingHoja && hojaVida && alumnoSel && (
            <div>
              {/* Header alumno */}
              <div className="card section" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  🎒
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{alumnoSel.nombre}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: '.8rem', marginTop: 2 }}>
                    {alumnoSel.cursos ? `Curso ${alumnoSel.cursos.nivel}°${alumnoSel.cursos.letra}` : 'Sin curso asignado'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[
                    { label: 'Promedio',    value: calcPromedio(hojaVida.notas) ?? '—' },
                    { label: 'Asistencia',  value: calcAsistencia(hojaVida.asistencia) != null ? calcAsistencia(hojaVida.asistencia) + '%' : '—' },
                    { label: 'Anot. neg.',  value: hojaVida.anotaciones.filter(a => a.tipo === 'negativa').length },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{s.value}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--gray-500)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cambiar curso */}
              <div className="card section">
                <div className="card-title" style={{ marginBottom: 12 }}>Cambiar curso del alumno</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select className="form-select" style={{ maxWidth: 200 }}
                    value={cursoCambio}
                    onChange={e => setCursoCambio(e.target.value)}>
                    <option value="">Sin curso</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nivel}°{c.letra}</option>)}
                  </select>
                  <button className="button primary" onClick={handleCambiarCurso}>
                    Guardar cambio
                  </button>
                </div>
              </div>

              {/* Tabs hoja */}
              <div className="tab-strip">
                {[
                  { key: 'notas',         label: `Notas (${hojaVida.notas.length})` },
                  { key: 'asistencia',    label: `Asistencia (${hojaVida.asistencia.length})` },
                  { key: 'anotaciones',   label: `Anotaciones (${hojaVida.anotaciones.length})` },
                  { key: 'retiros',       label: `Retiros (${hojaVida.retiros.length})` },
                  { key: 'observaciones', label: `Observaciones (${hojaVida.observaciones.length})` },
                ].map(({ key, label }) => (
                  <button key={key} className={`tab-btn ${tabHoja === key ? 'active' : ''}`} onClick={() => setTabHoja(key)}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Notas — con edición */}
              {tabHoja === 'notas' && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Notas</div>
                    <div className="card-subtitle">Haz clic en una nota para editarla</div>
                  </div>
                  {hojaVida.notas.length === 0
                    ? <div className="empty-state"><div className="empty-state-icon">📝</div><p>Sin notas.</p></div>
                    : <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th>Asignatura</th><th>Evaluación</th><th>%</th><th>Nota</th><th>Fecha</th><th></th></tr>
                          </thead>
                          <tbody>
                            {hojaVida.notas.map((n) => (
                              <tr key={n.id}>
                                <td>{n.evaluaciones?.asignaturas?.nombre ?? '—'}</td>
                                <td>{n.evaluaciones?.nombre ?? '—'}</td>
                                <td>{n.evaluaciones?.porcentaje ?? '—'}</td>
                                <td>
                                  {notaEditando?.id === n.id ? (
                                    <input
                                      className="form-input"
                                      type="number" min="1" max="7" step="0.1"
                                      style={{ width: 80 }}
                                      value={notaEditando.valor}
                                      onChange={e => setNotaEditando({ id: n.id, valor: e.target.value })}
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className={`nota-pill ${getNotaClass(n.nota)}`}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => setNotaEditando({ id: n.id, valor: n.nota })}
                                      title="Clic para editar">
                                      {n.nota.toFixed(1)}
                                    </span>
                                  )}
                                </td>
                                <td>{n.evaluaciones?.fecha ?? '—'}</td>
                                <td>
                                  {notaEditando?.id === n.id ? (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="button primary" style={{ padding: '4px 10px', fontSize: '.75rem' }}
                                        onClick={() => handleModificarNota(n.id, n.nota)}>
                                        Guardar
                                      </button>
                                      <button className="button ghost" style={{ padding: '4px 10px', fontSize: '.75rem' }}
                                        onClick={() => setNotaEditando(null)}>
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <button className="button ghost" style={{ padding: '4px 10px', fontSize: '.75rem' }}
                                      onClick={() => setNotaEditando({ id: n.id, valor: n.nota })}>
                                      Editar
                                    </button>
                                  )}
                                </td>
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
                  <div className="card-header"><div className="card-title">Asistencia</div></div>
                  {hojaVida.asistencia.length === 0
                    ? <div className="empty-state"><div className="empty-state-icon">📅</div><p>Sin registros.</p></div>
                    : <div className="table-wrap"><table>
                        <thead><tr><th>Fecha</th><th>Estado</th></tr></thead>
                        <tbody>
                          {hojaVida.asistencia.map((a, i) => (
                            <tr key={i}>
                              <td>{a.fecha}</td>
                              <td><span className={`badge ${a.estado}`}>{a.estado}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                  }
                </div>
              )}

              {/* Anotaciones — con formulario para agregar */}
              {tabHoja === 'anotaciones' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card">
                    <div className="card-header"><div className="card-title">Agregar anotación</div></div>
                    <form className="form-grid" onSubmit={handleCrearAnotacion}>
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
                          value={anotForm.descripcion}
                          onChange={e => setAnotForm(p => ({ ...p, descripcion: e.target.value }))} required />
                      </div>
                      <div className="form-actions">
                        <button className="button primary" type="submit">Guardar anotación</button>
                      </div>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-header"><div className="card-title">Historial de anotaciones</div></div>
                    {hojaVida.anotaciones.length === 0
                      ? <div className="empty-state"><div className="empty-state-icon">💬</div><p>Sin anotaciones.</p></div>
                      : <div className="table-wrap"><table>
                          <thead><tr><th>Tipo</th><th>Descripción</th><th>Por</th><th>Fecha</th></tr></thead>
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
                        </table></div>
                    }
                  </div>
                </div>
              )}

              {/* Retiros */}
              {tabHoja === 'retiros' && (
                <div className="card">
                  <div className="card-header"><div className="card-title">Retiros de clase</div></div>
                  {hojaVida.retiros.length === 0
                    ? <div className="empty-state"><div className="empty-state-icon">🚪</div><p>Sin retiros.</p></div>
                    : <div className="table-wrap"><table>
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
                      </table></div>
                  }
                </div>
              )}

              {/* Observaciones */}
              {tabHoja === 'observaciones' && (
                <div className="card">
                  <div className="card-header"><div className="card-title">Observaciones del profesor</div></div>
                  {hojaVida.observaciones.length === 0
                    ? <div className="empty-state"><div className="empty-state-icon">📋</div><p>Sin observaciones.</p></div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {hojaVida.observaciones.map((o, i) => (
                          <div key={i} style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--blue)' }}>
                            <div style={{ fontSize: '.84rem', marginBottom: 5 }}>{o.contenido}</div>
                            <div style={{ fontSize: '.74rem', color: 'var(--gray-500)' }}>{o.usuarios?.nombre ?? '—'} · {o.fecha}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          )}

          {!loadingHoja && !hojaVida && (
            <div className="empty-state"><div className="empty-state-icon">📄</div><p>Selecciona un alumno para ver su hoja de vida.</p></div>
          )}
        </div>
      )}
    </div>
  )
}
