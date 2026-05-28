import { supabase } from '../supabaseClient'

// ── Cursos ────────────────────────────────────────────────────────────────
export async function getCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('id, nivel, letra')
    .order('nivel')
    .order('letra')
  return { data, error }
}

// ── Listado alumnos PIE (usuarios.pie = true) ─────────────────────────────
export async function getAlumnosPie({ cursoId, search }) {
  let q = supabase
    .from('usuarios')
    .select('id, nombre, pie, curso_id, cursos ( id, nivel, letra )')
    .eq('rol', 'alumno')
    .eq('pie', true)

  if (cursoId) q = q.eq('curso_id', cursoId)
  if (search && search.trim()) {
    const s = `%${search.trim()}%`
    q = q.ilike('nombre', s)
  }

  q = q.order('nombre')

  const { data, error } = await q
  return { data, error }
}

// ── Detalle alumno PIE ────────────────────────────────────────────────────
export async function getAlumnoPieDetail(alumnoId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, pie, curso_id, cursos ( id, nivel, letra )')
    .eq('id', alumnoId)
    .single()

  return { data, error }
}

// ── Observaciones PIE ────────────────────────────────────────────────────
export async function getObservacionesPie(alumnoId) {
  const { data, error } = await supabase
    .from('pie_observaciones')
    .select('id, observacion, created_at, alumno_id')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function createObservacionPie({ alumnoId, pieId, observacion }) {
  const { data, error } = await supabase
    .from('pie_observaciones')
    .insert({ alumno_id: alumnoId, pie_id: pieId, observacion })
    .select()
    .single()

  return { data, error }
}

// ── Retiros PIE ───────────────────────────────────────────────────────────
export async function getRetirosPie(alumnoId) {
  const { data, error } = await supabase
    .from('pie_retiros')
    .select('id, motivo, tipo, estado, created_at, alumno_id, curso_id, pie_id')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function createRetiroPie({ alumnoId, cursoId, pieId, motivo, tipo }) {
  const { data, error } = await supabase
    .from('pie_retiros')
    .insert({ alumno_id: alumnoId, curso_id: cursoId, pie_id: pieId, motivo, tipo })
    .select()
    .single()

  return { data, error }
}

