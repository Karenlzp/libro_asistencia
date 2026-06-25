    // src/services/profesorService.js
    import { supabase } from '../supabaseClient'

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
    export async function crearEvaluacion({ nombre, asignaturaId, profesorId, cursoId, porcentaje, fecha }) {
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
    return { data, error }
    }

    // ── Guardar nota (insert o update) ───────────────────────────────────────────
    export async function guardarNota({ evaluacionId, alumnoId, nota }) {
    const { data, error } = await supabase
        .from('detalle_nota')
        .upsert(
        { evaluacion_id: evaluacionId, alumno_id: alumnoId, nota: Number(nota) },
        { onConflict: 'evaluacion_id,alumno_id' }
        )
        .select()
        .single()
    return { data, error }
    }

    // ── Registrar asistencia masiva de un curso ───────────────────────────────────
    // registros = [{ alumnoId, estado }]
    export async function registrarAsistenciaMasiva(cursoId, asignaturaId, profesorId, fecha, registros = []) {
        if (!Array.isArray(registros)) {
            return { data: null, error: new Error('registrarAsistenciaMasiva: "registros" debe ser un array') }
        }

        const rows = registros.map(r => ({
            alumno_id: r.alumnoId,
            curso_id: cursoId,
            asignatura_id: asignaturaId,
            profesor_id: profesorId,
            fecha,
            estado: r.estado,
        }))

        if (rows.length === 0) {
            return { data: [], error: null }
        }

        const { data, error } = await supabase
            .from('asistencia')
            .upsert(rows, { onConflict: 'alumno_id,fecha,asignatura_id' })
            .select()
        return { data, error }
    }

    // ── Crear anotación ───────────────────────────────────────────────────────────
    export async function crearAnotacion({ alumnoId, profesorId, tipo, descripcion }) {
    const { data, error } = await supabase
        .from('anotaciones')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, tipo, descripcion })
        .select()
        .single()
    return { data, error }
    }

    // ── Crear retiro de clase ─────────────────────────────────────────────────────
    export async function crearRetiro({ alumnoId, profesorId, motivo, tipo }) {
    const { data, error } = await supabase
        .from('retiros_clase')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, motivo, tipo })
        .select()
        .single()
    return { data, error }
    }

    // ── Crear observación ─────────────────────────────────────────────────────────
    export async function crearObservacion({ alumnoId, profesorId, contenido }) {
    const { data, error } = await supabase
        .from('observaciones')
        .insert({ alumno_id: alumnoId, profesor_id: profesorId, contenido })
        .select()
        .single()
    return { data, error }
    }

    // ── Historial de observaciones por alumno ────────────────────────────────────
    export async function getObservacionesPorAlumno(alumnoId) {
    const { data, error } = await supabase
        .from('observaciones')
        .select('id, contenido, fecha')
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false })
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

    // ── Historial de retiros PIE por alumno ───────────────────────────────────
    // Fuente: pie_retiros
    export async function getRetirosPiePorAlumno({ alumnoId, cursoId }) {
    if (!alumnoId) return { data: [], error: null }

    let q = supabase
        .from('pie_retiros')
        .select(
        'id, alumno_id, curso_id, motivo, tipo, estado, created_at, fecha_retorno, hora_retorno'
        )
        .eq('alumno_id', alumnoId)

    if (cursoId) q = q.eq('curso_id', cursoId)

    q = q.order('created_at', { ascending: false })

    const { data, error } = await q
    return { data, error }
    }

    // ── Historial de asistencia (por curso + asignatura) ──────────────────────
export async function getHistorialAsistenciaProfesor({ profesorId, cursoId, asignaturaId }) {
    if (!cursoId || !profesorId) return { data: [], error: null }

    console.log('Historial asistencia params', {
        profesorId,
        cursoId,
        asignaturaId
    })

    let q = supabase
        .from('asistencia')
        .select(`
        fecha,
        alumno_id,
        estado,
        usuarios!asistencia_alumno_id_fkey ( nombre )
        `)
        .eq('curso_id', cursoId)
        .eq('profesor_id', profesorId)

    if (asignaturaId) {
        q = q.eq('asignatura_id', asignaturaId)
    }

    q = q.order('fecha', { ascending: false })

    const { data, error } = await q
    return { data, error }
    }

