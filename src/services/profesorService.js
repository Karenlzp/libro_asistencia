    // src/services/profesorService.js
    import { supabase } from '../supabaseClient'
    import { writeAuditLog } from './auditService'

    // ── Cursos y asignaturas del profesor ─────────────────────────────────────────
    export async function getProfesorCursos(profesorId) {
    const { data, error } = await supabase
        .from('profesor_asignatura')
        .select(`
        id,
        cursos   ( id, nivel, letra ),
        asignaturas ( id, nombre )
        `)
        .eq('profesor_id', profesorId)
        .order('created_at')
    return { data, error }
    }

    // ── Alumnos de un curso ───────────────────────────────────────────────────────
    export async function getAlumnosPorCurso(cursoId) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('curso_id', cursoId)
        .eq('rol', 'alumno')
        .order('nombre')
    return { data, error }
    }

    // ── Evaluaciones del profesor ─────────────────────────────────────────────────
    export async function getEvaluacionesProfesor(profesorId) {
    const { data, error } = await supabase
        .from('evaluaciones')
        .select(`
        id, nombre, porcentaje, fecha,
        asignaturas ( nombre ),
        cursos      ( nivel, letra )
        `)
        .eq('profesor_id', profesorId)
        .order('fecha', { ascending: false })
    return { data, error }
    }

    // ── Notas de una evaluación ───────────────────────────────────────────────────
    export async function getNotasPorEvaluacion(evaluacionId) {
    const { data, error } = await supabase
        .from('detalle_nota')
        .select(`
        id, nota, alumno_id,
        usuarios ( nombre )
        `)
        .eq('evaluacion_id', evaluacionId)
    return { data, error }
    }

    // ── Asistencia de un curso en una fecha ───────────────────────────────────────
    export async function getAsistenciaCursoFecha(cursoId, fecha) {
    const { data, error } = await supabase
        .from('asistencia')
        .select('alumno_id, estado')
        .eq('curso_id', cursoId)
        .eq('fecha', fecha)
    return { data, error }
    }

    // ── Anotaciones del profesor ──────────────────────────────────────────────────
    export async function getAnotacionesProfesor(profesorId) {
    const { data, error } = await supabase
        .from('anotaciones')
        .select(`
        id, tipo, descripcion, fecha,
        usuarios!anotaciones_alumno_id_fkey ( nombre )
        `)
        .eq('profesor_id', profesorId)
        .order('fecha', { ascending: false })
    return { data, error }
    }

    // ── Crear evaluación ──────────────────────────────────────────────────────────
    export async function crearEvaluacion({ nombre, asignaturaId, profesorId, cursoId, porcentaje, fecha, actor }) {
    const { data, error } = await supabase
        .from('evaluaciones')
        .insert({
        nombre,
        asignatura_id: asignaturaId,
        profesor_id:   profesorId,
        curso_id:      cursoId,
        porcentaje:    Number(porcentaje),
        fecha,
        })
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: 'crear',
        entity: 'evaluacion',
        entityId: data.id,
        newValue: {
            nombre: data.nombre,
            asignatura_id: data.asignatura_id,
            curso_id: data.curso_id,
            porcentaje: data.porcentaje,
            fecha: data.fecha,
        },
        metadata: { origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Guardar nota (insert o update) ───────────────────────────────────────────
    export async function guardarNota({ evaluacionId, alumnoId, nota, actor }) {
    const { data: previa } = await supabase
        .from('detalle_nota')
        .select('id, nota')
        .eq('evaluacion_id', evaluacionId)
        .eq('alumno_id', alumnoId)
        .maybeSingle()

    const { data, error } = await supabase
        .from('detalle_nota')
        .upsert(
        { evaluacion_id: evaluacionId, alumno_id: alumnoId, nota: Number(nota) },
        { onConflict: 'evaluacion_id,alumno_id' }
        )
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: previa ? 'editar' : 'crear',
        entity: 'nota',
        entityId: data.id,
        fieldName: 'nota',
        oldValue: previa ? { nota: previa.nota } : null,
        newValue: { nota: data.nota },
        metadata: { evaluacion_id: evaluacionId, alumno_id: alumnoId, origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Registrar asistencia masiva de un curso ───────────────────────────────────
    // registros = [{ alumnoId, estado }]
    export async function registrarAsistenciaMasiva(cursoId, fecha, registros, actor) {
    const rows = registros.map(r => ({
        alumno_id: r.alumnoId,
        curso_id:  cursoId,
        fecha,
        estado:    r.estado,
    }))

    const alumnoIds = registros.map(r => r.alumnoId)
    const { data: previos } = await supabase
        .from('asistencia')
        .select('alumno_id, estado')
        .eq('curso_id', cursoId)
        .eq('fecha', fecha)
        .in('alumno_id', alumnoIds)

    const { data, error } = await supabase
        .from('asistencia')
        .upsert(rows, { onConflict: 'alumno_id,fecha' })
        .select()

    if (!error) {
        await writeAuditLog({
        actor,
        action: 'editar',
        entity: 'asistencia',
        entityId: `${cursoId}-${fecha}`,
        fieldName: 'estado',
        oldValue: previos ?? [],
        newValue: rows,
        metadata: { curso_id: cursoId, fecha, total_registros: rows.length, origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Crear anotación ───────────────────────────────────────────────────────────
    export async function crearAnotacion({ alumnoId, profesorId, tipo, descripcion, actor }) {
    const { data, error } = await supabase
        .from('anotaciones')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, tipo, descripcion })
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: 'crear',
        entity: 'anotacion',
        entityId: data.id,
        newValue: { alumno_id: alumnoId, profesor_id: profesorId, tipo },
        metadata: { origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Crear retiro de clase ─────────────────────────────────────────────────────
    export async function crearRetiro({ alumnoId, profesorId, motivo, tipo, actor }) {
    const { data, error } = await supabase
        .from('retiros_clase')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, motivo, tipo })
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: 'crear',
        entity: 'retiro_clase',
        entityId: data.id,
        newValue: { alumno_id: alumnoId, profesor_id: profesorId, tipo, motivo },
        metadata: { origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Crear observación ─────────────────────────────────────────────────────────
    export async function crearObservacion({ alumnoId, profesorId, contenido, actor }) {
    const { data, error } = await supabase
        .from('observaciones')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, contenido })
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: 'crear',
        entity: 'observacion',
        entityId: data.id,
        newValue: { alumno_id: alumnoId, profesor_id: profesorId, contenido },
        metadata: { origen: 'profesor' },
        })
    }
    return { data, error }
    }

    // ── Alertas del curso del profesor ───────────────────────────────────────────
    export async function getAlertasPorCurso(cursoId) {
    const { data, error } = await supabase
        .from('v_alertas')
        .select('*')
        .eq('curso_id', cursoId)
    return { data, error }
    }
