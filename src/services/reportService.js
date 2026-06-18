import { supabase } from '../supabaseClient'
import { downloadCsv, downloadExcel } from './auditService'

function formatCourseLabel(course) {
  if (!course) return 'Sin curso'
  return `${course.nivel}°${course.letra}`
}

function roundNumber(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value).toFixed(decimals)
}

function calcAverage(list) {
  if (!list.length) return null
  return list.reduce((acc, value) => acc + Number(value), 0) / list.length
}

function calcAttendance(records) {
  if (!records.length) return null

  const valid = records.filter((record) =>
    ['presente', 'justificado'].includes(String(record.estado).toLowerCase())
  ).length

  return (valid / records.length) * 100
}

export async function getAdminReports() {
  const [
    usuariosRes,
    cursosRes,
    alertasRes,
    asistenciaRes,
    notasRes,
    asignacionesRes,
    evaluacionesRes,
  ] = await Promise.all([
    supabase.from('usuarios').select('id, rol, activo, curso_id, cursos ( nivel, letra )'),
    supabase.from('cursos').select('id, nivel, letra').order('nivel').order('letra'),
    supabase.from('v_alertas').select('*'),
    supabase.from('asistencia').select('curso_id, estado, fecha'),
    supabase.from('detalle_nota').select('nota, alumno_id, evaluaciones ( curso_id )'),
    supabase.from('profesor_asignatura').select('id, profesor_id, curso_id, asignatura_id'),
    supabase.from('evaluaciones').select('id, fecha'),
  ])

  const errors = [
    usuariosRes.error,
    cursosRes.error,
    alertasRes.error,
    asistenciaRes.error,
    notasRes.error,
    asignacionesRes.error,
    evaluacionesRes.error,
  ].filter(Boolean)

  if (errors.length) {
    return { data: null, error: errors[0] }
  }

  const usuarios = usuariosRes.data ?? []
  const cursos = cursosRes.data ?? []
  const alertas = alertasRes.data ?? []
  const asistencia = asistenciaRes.data ?? []
  const notas = notasRes.data ?? []
  const asignaciones = asignacionesRes.data ?? []
  const evaluaciones = evaluacionesRes.data ?? []

  const alumnosActivos = usuarios.filter((user) => user.rol === 'alumno' && user.activo)
  const profesoresActivos = usuarios.filter((user) => user.rol === 'profesor' && user.activo)

  const averageGrade = calcAverage(notas.map((item) => item.nota))
  const attendanceRate = calcAttendance(asistencia)
  const evaluacionesMesActual = evaluaciones.filter((item) => {
    const fecha = item.fecha ? new Date(item.fecha) : null
    const now = new Date()
    return fecha && fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear()
  }).length

  const profesoresConAsignacion = new Set(asignaciones.map((item) => item.profesor_id).filter(Boolean)).size
  const coberturaDocente = profesoresActivos.length
    ? (profesoresConAsignacion / profesoresActivos.length) * 100
    : null

  const courseMetricsMap = new Map()

  cursos.forEach((course) => {
    courseMetricsMap.set(course.id, {
      id: course.id,
      curso: formatCourseLabel(course),
      alumnos: 0,
      promedio: null,
      asistencia: null,
      alertas: 0,
      asignaciones: 0,
    })
  })

  alumnosActivos.forEach((student) => {
    const metrics = courseMetricsMap.get(student.curso_id)
    if (metrics) metrics.alumnos += 1
  })

  const notasPorCurso = new Map()
  notas.forEach((item) => {
    const courseId = item.evaluaciones?.curso_id
    if (!courseId) return
    const values = notasPorCurso.get(courseId) ?? []
    values.push(Number(item.nota))
    notasPorCurso.set(courseId, values)
  })

  const asistenciaPorCurso = new Map()
  asistencia.forEach((item) => {
    const values = asistenciaPorCurso.get(item.curso_id) ?? []
    values.push(item)
    asistenciaPorCurso.set(item.curso_id, values)
  })

  alertas.forEach((alerta) => {
    const metrics = courseMetricsMap.get(alerta.curso_id)
    if (metrics) metrics.alertas += 1
  })

  asignaciones.forEach((assignment) => {
    const metrics = courseMetricsMap.get(assignment.curso_id)
    if (metrics) metrics.asignaciones += 1
  })

  for (const [courseId, values] of notasPorCurso.entries()) {
    const metrics = courseMetricsMap.get(courseId)
    if (metrics) metrics.promedio = roundNumber(calcAverage(values))
  }

  for (const [courseId, records] of asistenciaPorCurso.entries()) {
    const metrics = courseMetricsMap.get(courseId)
    if (metrics) metrics.asistencia = roundNumber(calcAttendance(records))
  }

  const rendimientoPorCurso = Array.from(courseMetricsMap.values())
    .sort((a, b) => a.curso.localeCompare(b.curso, 'es'))

  return {
    data: {
      resumen: {
        alumnosActivos: alumnosActivos.length,
        profesoresActivos: profesoresActivos.length,
        cursosTotales: cursos.length,
        alertasActivas: alertas.length,
        promedioGeneral: roundNumber(averageGrade),
        asistenciaGeneral: roundNumber(attendanceRate),
        evaluacionesMesActual,
        coberturaDocente: roundNumber(coberturaDocente),
      },
      rendimientoPorCurso,
      alertasDestacadas: alertas.slice(0, 20),
    },
    error: null,
  }
}

export function exportAdminReportsToCsv(reportData) {
  if (!reportData) return

  const resumenRows = [
    { indicador: 'Alumnos activos', valor: reportData.resumen.alumnosActivos ?? 0 },
    { indicador: 'Profesores activos', valor: reportData.resumen.profesoresActivos ?? 0 },
    { indicador: 'Cursos totales', valor: reportData.resumen.cursosTotales ?? 0 },
    { indicador: 'Alertas activas', valor: reportData.resumen.alertasActivas ?? 0 },
    { indicador: 'Promedio general', valor: reportData.resumen.promedioGeneral ?? '—' },
    { indicador: 'Asistencia general', valor: reportData.resumen.asistenciaGeneral ? `${reportData.resumen.asistenciaGeneral}%` : '—' },
    { indicador: 'Evaluaciones del mes', valor: reportData.resumen.evaluacionesMesActual ?? 0 },
    { indicador: 'Cobertura docente', valor: reportData.resumen.coberturaDocente ? `${reportData.resumen.coberturaDocente}%` : '—' },
  ]

  const rendimientoRows = reportData.rendimientoPorCurso.map((curso) => ({
    curso: curso.curso,
    alumnos: curso.alumnos,
    promedio: curso.promedio ?? '—',
    asistencia: curso.asistencia ? `${curso.asistencia}%` : '—',
    alertas: curso.alertas,
    asignaciones: curso.asignaciones,
  }))

  downloadCsv('reporte_resumen_admin.csv', resumenRows)
  downloadCsv('reporte_rendimiento_cursos.csv', rendimientoRows)

  if (reportData.alertasDestacadas?.length) {
    downloadCsv(
      'reporte_alertas_activas.csv',
      reportData.alertasDestacadas.map((alerta) => ({
        alumno: alerta.alumno,
        curso: alerta.curso,
        promedio: alerta.promedio_general ?? '—',
        asistencia: alerta.porcentaje_asistencia != null ? `${alerta.porcentaje_asistencia}%` : '—',
        anotaciones_negativas: alerta.anotaciones_negativas ?? 0,
      }))
    )
  }
}

export async function exportAdminReportsToExcel(reportData) {
  if (!reportData) return

  const resumenRows = [
    { Indicador: 'Alumnos activos', Valor: reportData.resumen.alumnosActivos ?? 0 },
    { Indicador: 'Profesores activos', Valor: reportData.resumen.profesoresActivos ?? 0 },
    { Indicador: 'Cursos totales', Valor: reportData.resumen.cursosTotales ?? 0 },
    { Indicador: 'Alertas activas', Valor: reportData.resumen.alertasActivas ?? 0 },
    { Indicador: 'Promedio general', Valor: reportData.resumen.promedioGeneral ?? '—' },
    { Indicador: 'Asistencia general', Valor: reportData.resumen.asistenciaGeneral ? `${reportData.resumen.asistenciaGeneral}%` : '—' },
    { Indicador: 'Evaluaciones del mes', Valor: reportData.resumen.evaluacionesMesActual ?? 0 },
    { Indicador: 'Cobertura docente', Valor: reportData.resumen.coberturaDocente ? `${reportData.resumen.coberturaDocente}%` : '—' },
  ]

  const rendimientoRows = reportData.rendimientoPorCurso.map((curso) => ({
    Curso: curso.curso,
    Alumnos: curso.alumnos,
    Promedio: curso.promedio ?? '—',
    Asistencia: curso.asistencia ? `${curso.asistencia}%` : '—',
    Alertas: curso.alertas,
    Asignaciones: curso.asignaciones,
  }))

  await downloadExcel('reporte_resumen_admin.xlsx', resumenRows, { sheetName: 'Resumen' })
  await downloadExcel('reporte_rendimiento_cursos.xlsx', rendimientoRows, { sheetName: 'Cursos' })

  if (reportData.alertasDestacadas?.length) {
    await downloadExcel(
      'reporte_alertas_activas.xlsx',
      reportData.alertasDestacadas.map((alerta) => ({
        Alumno: alerta.alumno,
        Curso: alerta.curso,
        Promedio: alerta.promedio_general ?? '—',
        Asistencia: alerta.porcentaje_asistencia != null ? `${alerta.porcentaje_asistencia}%` : '—',
        'Anot. neg.': alerta.anotaciones_negativas ?? 0,
      })),
      { sheetName: 'Alertas' }
    )
  }
}

export function printAdminReport(reportData) {
  if (typeof window === 'undefined' || !reportData) return

  const printWindow = window.open('', '_blank', 'width=1120,height=820')
  if (!printWindow) return

  const rows = reportData.rendimientoPorCurso
    .map(
      (course) => `
        <tr>
          <td>${course.curso}</td>
          <td>${course.alumnos}</td>
          <td>${course.promedio ?? '—'}</td>
          <td>${course.asistencia ? `${course.asistencia}%` : '—'}</td>
          <td>${course.alertas}</td>
          <td>${course.asignaciones}</td>
        </tr>
      `
    )
    .join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>Reporte Admin</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1a202c; padding: 32px; }
          h1 { margin: 0 0 8px; }
          p { color: #4a5568; margin: 0 0 24px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .metric { border: 1px solid #d9dfe6; border-radius: 12px; padding: 14px; }
          .metric strong { display: block; font-size: 24px; margin-bottom: 4px; }
          .metric span { color: #4a5568; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 10px 12px; border-bottom: 1px solid #edf0f3; text-align: left; font-size: 13px; }
          th { color: #718096; text-transform: uppercase; letter-spacing: .08em; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>Reporte administrativo</h1>
        <p>Generado el ${new Date().toLocaleString('es-CL')}</p>
        <div class="metrics">
          <div class="metric"><strong>${reportData.resumen.alumnosActivos ?? 0}</strong><span>Alumnos activos</span></div>
          <div class="metric"><strong>${reportData.resumen.profesoresActivos ?? 0}</strong><span>Profesores activos</span></div>
          <div class="metric"><strong>${reportData.resumen.promedioGeneral ?? '—'}</strong><span>Promedio general</span></div>
          <div class="metric"><strong>${reportData.resumen.asistenciaGeneral ? `${reportData.resumen.asistenciaGeneral}%` : '—'}</strong><span>Asistencia general</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Alumnos</th>
              <th>Promedio</th>
              <th>Asistencia</th>
              <th>Alertas</th>
              <th>Asignaciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
