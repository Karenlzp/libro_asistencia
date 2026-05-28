// src/services/alumnoService.js
import { supabase } from '../supabaseClient'

// ── Perfil completo del alumno (con curso) ────────────────────────────────────
export async function getPerfilAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id, nombre, rol, created_at,
      cursos ( id, nivel, letra )
    `)
    .eq('id', alumnoId)
    .single()
  return { data, error }
}

// ── Notas del alumno ──────────────────────────────────────────────────────────
export async function getNotasAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('detalle_nota')
    .select(`
      nota,
      evaluaciones (
        id, nombre, porcentaje, fecha,
        asignaturas ( id, nombre ),
        cursos      ( nivel, letra )
      )
    `)
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })
  return { data, error }
}


// ── Asistencia del alumno (todas / sin filtrar por asignatura) ─────────────
export async function getAsistenciaAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('asistencia')
    .select('id, fecha, estado')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
  return { data, error }
}

// ── Asistencia del alumno por asignatura (vía vista v_asistencia_alumno) ──
export async function getAsistenciaAlumnoPorAsignatura(alumnoId) {
  const { data, error } = await supabase
    .from('v_asistencia_alumno')
    .select('alumno_id, curso_id, asignatura_id, asignatura, fecha, estado')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
  return { data, error }
}


// ── Anotaciones del alumno ────────────────────────────────────────────────────
export async function getAnotacionesAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('anotaciones')
    .select(`
      id, tipo, descripcion, fecha,
      usuarios!anotaciones_profesor_id_fkey ( nombre )
    `)
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
  return { data, error }
}

// ── Retiros del alumno ────────────────────────────────────────────────────────
export async function getRetirosAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('retiros_clase')
    .select(`
      id, tipo, motivo, fecha,
      usuarios!retiros_clase_profesor_id_fkey ( nombre )
    `)
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
  return { data, error }
}

// ── Observaciones del alumno ──────────────────────────────────────────────────
export async function getObservacionesAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('observaciones')
    .select(`
      id, contenido, fecha,
      usuarios!observaciones_profesor_id_fkey ( nombre )
    `)
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
  return { data, error }
}