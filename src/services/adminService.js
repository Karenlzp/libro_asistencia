// src/services/adminService.js
import { supabase } from '../supabaseClient'

// ── Alertas ───────────────────────────────────────────────────────────────────
export async function getAlertas() {
  const { data, error } = await supabase
    .from('v_alertas')
    .select('*')
    .order('alumno')
  return { data, error }
}

// ── Resumen general ───────────────────────────────────────────────────────────
export async function getResumen() {
  const [alumnos, profesores, cursos, evaluaciones] = await Promise.all([
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'alumno').eq('activo', true),
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'profesor').eq('activo', true),
    supabase.from('cursos').select('id', { count: 'exact', head: true }),
    supabase.from('evaluaciones').select('id', { count: 'exact', head: true }),
  ])
  return {
    alumnos:      alumnos.count      ?? 0,
    profesores:   profesores.count   ?? 0,
    cursos:       cursos.count       ?? 0,
    evaluaciones: evaluaciones.count ?? 0,
  }
}

// ── Lista de usuarios (solo activos) ─────────────────────────────────────────
export async function getUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`id, nombre, rol, activo, created_at, cursos ( nivel, letra )`)
    .eq('activo', true)
    .order('rol')
    .order('nombre')
  return { data, error }
}

// ── Lista de cursos ───────────────────────────────────────────────────────────
export async function getCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('*')
    .order('nivel')
    .order('letra')
  return { data, error }
}

// ── Lista de asignaturas ──────────────────────────────────────────────────────
export async function getAsignaturas() {
  const { data, error } = await supabase
    .from('asignaturas')
    .select('*')
    .order('nombre')
  return { data, error }
}

// ── Asignaciones profesor → asignatura → curso ────────────────────────────────
export async function getAsignaciones() {
  const { data, error } = await supabase
    .from('profesor_asignatura')
    .select(`
      id,
      profesor_id,
      asignatura_id,
      curso_id,
      usuarios    ( nombre ),
      asignaturas ( nombre ),
      cursos      ( nivel, letra )
    `)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ── Hoja de vida completa de un alumno ────────────────────────────────────────
export async function getHojaVidaAlumno(alumnoId) {
  const [notas, asistencia, anotaciones, retiros, observaciones] = await Promise.all([
    supabase
      .from('detalle_nota')
      .select(`
        id, nota, evaluacion_id,
        evaluaciones ( nombre, fecha, porcentaje, asignaturas ( nombre ) )
      `)
      .eq('alumno_id', alumnoId)
      .order('created_at', { ascending: false }),
    supabase
      .from('asistencia')
      .select('fecha, estado')
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false }),
    supabase
      .from('anotaciones')
      .select(`tipo, descripcion, fecha, usuarios!anotaciones_profesor_id_fkey ( nombre )`)
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false }),
    supabase
      .from('retiros_clase')
      .select(`tipo, motivo, fecha, usuarios!retiros_clase_profesor_id_fkey ( nombre )`)
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false }),
    supabase
      .from('observaciones')
      .select(`contenido, fecha, usuarios!observaciones_profesor_id_fkey ( nombre )`)
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false }),
  ])
  return {
    notas:         notas.data         ?? [],
    asistencia:    asistencia.data    ?? [],
    anotaciones:   anotaciones.data   ?? [],
    retiros:       retiros.data       ?? [],
    observaciones: observaciones.data ?? [],
  }
}

// ── Crear curso ───────────────────────────────────────────────────────────────
export async function crearCurso({ nivel, letra }) {
  // Validar que letra solo tenga letras
  if (!/^[A-Za-z]+$/.test(letra)) {
    return { data: null, error: { message: 'La letra del curso solo puede contener letras (A, B, C...).' } }
  }
  const { data, error } = await supabase
    .from('cursos')
    .insert({ nivel: Number(nivel), letra: letra.toUpperCase() })
    .select()
    .single()
  return { data, error }
}

// ── Eliminar curso ────────────────────────────────────────────────────────────
export async function eliminarCurso(id) {
  const { error } = await supabase
    .from('cursos')
    .delete()
    .eq('id', id)
  return { error }
}

// ── Crear asignatura ──────────────────────────────────────────────────────────
export async function crearAsignatura({ nombre }) {
  const { data, error } = await supabase
    .from('asignaturas')
    .insert({ nombre: nombre.trim() })
    .select()
    .single()
  return { data, error }
}

// ── Asignar profesor ──────────────────────────────────────────────────────────
export async function asignarProfesor({ profesorId, asignaturaId, cursoId }) {
  const { data, error } = await supabase
    .from('profesor_asignatura')
    .insert({ profesor_id: profesorId, asignatura_id: asignaturaId, curso_id: cursoId })
    .select()
    .single()
  return { data, error }
}

// ── Eliminar asignación ───────────────────────────────────────────────────────
export async function eliminarAsignacion(id) {
  const { error } = await supabase
    .from('profesor_asignatura')
    .delete()
    .eq('id', id)
  return { error }
}

// ── Desactivar usuario (soft delete) ─────────────────────────────────────────
export async function desactivarUsuario(id) {
  const { error } = await supabase
    .from('usuarios')
    .update({ activo: false })
    .eq('id', id)
  return { error }
}

// ── Lista de usuarios deshabilitados ─────────────────────────────────────
export async function getUsuariosInactivos() {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`id, nombre, rol, activo, created_at, cursos ( nivel, letra )`)
    .eq('activo', false)
    .order('rol')
    .order('nombre')
  return { data, error }
}

// ── Re-activar usuario ────────────────────────────────────────────────────
export async function reactivarUsuario(id) {
  const { error } = await supabase
    .from('usuarios')
    .update({ activo: true })
    .eq('id', id)
  return { error }
}


// ── Modificar nota (admin) ────────────────────────────────────────────────────
export async function modificarNota({ detalleNotaId, nota }) {
  const { data, error } = await supabase
    .from('detalle_nota')
    .update({ nota: Number(nota) })
    .eq('id', detalleNotaId)
    .select()
    .single()
  return { data, error }
}

// ── Agregar anotación (admin) ─────────────────────────────────────────────────
export async function crearAnotacionAdmin({ alumnoId, adminId, tipo, descripcion }) {
  const { data, error } = await supabase
    .from('anotaciones')
    .insert({
      alumno_id:   alumnoId,
      profesor_id: adminId,   // admin actúa como profesor_id
      tipo,
      descripcion,
    })
    .select()
    .single()
  return { data, error }
}

// ── Cambiar curso de un alumno ────────────────────────────────────────────────
export async function cambiarCursoAlumno({ alumnoId, cursoId }) {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ curso_id: cursoId })
    .eq('id', alumnoId)
    .select()
    .single()
  return { data, error }
}