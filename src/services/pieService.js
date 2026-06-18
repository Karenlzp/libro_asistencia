import { supabase } from '../supabaseClient'
import { writeAuditLog } from './auditService'

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

export async function createObservacionPie({ alumnoId, pieId, observacion, actor }) {
  const { data, error } = await supabase
    .from('pie_observaciones')
    .insert({ alumno_id: alumnoId, pie_id: pieId, observacion })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'pie_observacion',
      entityId: data.id,
      newValue: { alumno_id: alumnoId, pie_id: pieId, observacion },
      metadata: { origen: 'pie' },
    })
  }

  return { data, error }
}

// ── Retiros PIE ───────────────────────────────────────────────────────────
export async function getRetirosPie(alumnoId) {
  const { data, error } = await supabase
    .from('pie_retiros')
    .select(
      'id, motivo, tipo, estado, created_at, fecha_retorno, hora_retorno, alumno_id, curso_id, pie_id'
    )
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  return { data, error }
}


export async function createRetiroPie({ alumnoId, cursoId, pieId, motivo, tipo, actor }) {
  const { data, error } = await supabase
    .from('pie_retiros')
    .insert({ alumno_id: alumnoId, curso_id: cursoId, pie_id: pieId, motivo, tipo })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'pie_retiro',
      entityId: data.id,
      newValue: { alumno_id: alumnoId, curso_id: cursoId, pie_id: pieId, motivo, tipo },
      metadata: { origen: 'pie' },
    })
  }

  return { data, error }
}

export async function registrarRetornoPie(retiroId, actor) {
  console.log('retiroId', retiroId)

  if (!retiroId || typeof retiroId !== 'string') {
    return { data: null, error: { message: 'Retiro inválido.' } }
  }

  // Validación básica UUID v4/v1 (sin depender del backend)
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidLike.test(retiroId)) {
    return { data: null, error: { message: 'Retiro inválido.' } }
  }

  const ahora = new Date()

  // 1) Verificar que el retiro existe y traer estado (evita update “vacío”)
  const { data: existsData, error: existsError } = await supabase
    .from('pie_retiros')
    .select('id, estado, fecha_retorno, hora_retorno, alumno_id, pie_id')
    .eq('id', retiroId)
    .maybeSingle()

  if (existsError) {
    console.log('resultado retorno - existsError', existsData, existsError)
    return { data: null, error: existsError }
  }

  if (!existsData) {
    return { data: null, error: { message: 'Retiro no encontrado.' } }
  }

  // Si ya estaba retornado, igualmente actualizamos (o podrías cancelar). Mantengo update idempotente.

  // 2) Update sin single() para evitar coerción si el backend no devuelve exactamente 1 fila
  const { data, error } = await supabase
    .from('pie_retiros')
    .update({
      estado: 'retornado',
      fecha_retorno: ahora.toISOString(),
      hora_retorno: ahora.toTimeString().slice(0, 8),
    })
    .eq('id', retiroId)
    .select('id')
    .maybeSingle()

  console.log('resultado retorno', data, error)

  if (error) return { data: null, error }

  await writeAuditLog({
    actor,
    action: 'editar',
    entity: 'pie_retiro',
    entityId: retiroId,
    fieldName: 'estado',
    oldValue: {
      estado: existsData.estado,
      fecha_retorno: existsData.fecha_retorno,
      hora_retorno: existsData.hora_retorno,
    },
    newValue: {
      estado: 'retornado',
      fecha_retorno: ahora.toISOString(),
      hora_retorno: ahora.toTimeString().slice(0, 8),
    },
    metadata: { alumno_id: existsData.alumno_id, pie_id: existsData.pie_id, origen: 'pie' },
  })

  return { data, error: null }
}







