import { supabase } from '../supabaseClient'
import { writeAuditLog } from './auditService'

export async function getHorarios() {
  const { data, error } = await supabase
    .from('horarios')
    .select(`
      id,
      curso_id,
      asignatura_id,
      profesor_id,
      dia,
      hora_inicio,
      hora_fin,
      sala,
      created_at,
      cursos ( nivel, letra ),
      asignaturas ( nombre ),
      usuarios ( nombre )
    `)
    .order('dia', { ascending: true })
    .order('hora_inicio', { ascending: true })

  return { data, error }
}

export async function getHorariosProfesor({ profesorId }) {
  if (!profesorId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('horarios')
    .select(`
      id,
      dia,
      hora_inicio,
      hora_fin,
      sala,
      cursos ( nivel, letra ),
      asignaturas ( nombre )
    `)
    .eq('profesor_id', profesorId)
    .order('dia', { ascending: true })
    .order('hora_inicio', { ascending: true })

  return { data, error }
}

export async function createHorario({ profesorId, cursoId, asignaturaId, dia, horaInicio, horaFin, sala, actor }) {
  const { data, error } = await supabase
    .from('horarios')
    .insert({
      profesor_id: profesorId,
      curso_id: cursoId,
      asignatura_id: asignaturaId,
      dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      sala: sala?.trim() ? sala.trim() : null,
    })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'horario',
      entityId: data.id,
      newValue: {
        profesor_id: data.profesor_id,
        curso_id: data.curso_id,
        asignatura_id: data.asignatura_id,
        dia: data.dia,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        sala: data.sala ?? null,
      },
      metadata: { origen: 'admin' },
    })
  }

  return { data, error }
}

export async function updateHorario({ id, profesorId, cursoId, asignaturaId, dia, horaInicio, horaFin, sala, actor }) {
  if (!id) return { data: null, error: { message: 'Horario inválido.' } }

  const { data: previo } = await supabase
    .from('horarios')
    .select('id, profesor_id, curso_id, asignatura_id, dia, hora_inicio, hora_fin, sala')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('horarios')
    .update({
      profesor_id: profesorId,
      curso_id: cursoId,
      asignatura_id: asignaturaId,
      dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      sala: sala?.trim() ? sala.trim() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'editar',
      entity: 'horario',
      entityId: data.id,
      fieldName: 'bloque',
      oldValue: previo ?? null,
      newValue: {
        profesor_id: data.profesor_id,
        curso_id: data.curso_id,
        asignatura_id: data.asignatura_id,
        dia: data.dia,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        sala: data.sala ?? null,
      },
      metadata: { origen: 'admin' },
    })
  }

  return { data, error }
}

export async function deleteHorario({ id, actor }) {
  if (!id) return { error: { message: 'Horario inválido.' } }

  const { data: previo } = await supabase
    .from('horarios')
    .select('id, profesor_id, curso_id, asignatura_id, dia, hora_inicio, hora_fin, sala')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('horarios')
    .delete()
    .eq('id', id)

  if (!error && previo) {
    await writeAuditLog({
      actor,
      action: 'eliminar',
      entity: 'horario',
      entityId: previo.id,
      oldValue: previo,
      metadata: { origen: 'admin' },
    })
  }

  return { error }
}

