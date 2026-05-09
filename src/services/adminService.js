    // src/services/adminService.js
    // Todas las consultas a Supabase para el panel Admin

    import { supabase } from '../supabaseClient'

    // ── Alertas activas (desde la vista v_alertas) ────────────────────────────────
    export async function getAlertas() {
    const { data, error } = await supabase
        .from('v_alertas')
        .select('*')
        .order('alumno')
    return { data, error }
    }

    // ── Resumen general (conteos)      ─────────────────────────────────────────────────
    export async function getResumen() {
    const [alumnos, profesores, cursos, evaluaciones] = await Promise.all([
        supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'alumno'),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'profesor'),
        supabase.from('cursos').select('id', { count: 'exact', head: true }),
        supabase.from('evaluaciones').select('id', { count: 'exact', head: true }),
    ])
    return {
        alumnos:      alumnos.count   ?? 0,
        profesores:   profesores.count ?? 0,
        cursos:       cursos.count    ?? 0,
        evaluaciones: evaluaciones.count ?? 0,
    }
    }

    // ── Lista de usuarios ─────────────────────────────────────────────────────────
    export async function getUsuarios() {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
        id,
        nombre,
        rol,
        created_at,
        cursos ( nivel, letra )
        `)
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

    // ── Hoja de vida de un alumno ─────────────────────────────────────────────────
    export async function getHojaVidaAlumno(alumnoId) {
    const [notas, asistencia, anotaciones, retiros, observaciones] = await Promise.all([
        supabase
        .from('detalle_nota')
        .select(`
            nota,
            evaluaciones ( nombre, fecha, porcentaje,
            asignaturas ( nombre )
            )
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
        .select(`
            tipo, descripcion, fecha,
            usuarios!anotaciones_profesor_id_fkey ( nombre )
        `)
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false }),

        supabase
        .from('retiros_clase')
        .select(`
            tipo, motivo, fecha,
            usuarios!retiros_clase_profesor_id_fkey ( nombre )
        `)
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false }),

        supabase
        .from('observaciones')
        .select(`
            contenido, fecha,
            usuarios!observaciones_profesor_id_fkey ( nombre )
        `)
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false }),
    ])

    return {
        notas:        notas.data        ?? [],
        asistencia:   asistencia.data   ?? [],
        anotaciones:  anotaciones.data  ?? [],
        retiros:      retiros.data      ?? [],
        observaciones: observaciones.data ?? [],
    }
    }

    // ── Crear curso ───────────────────────────────────────────────────────────────
    export async function crearCurso({ nivel, letra }) {
    const { data, error } = await supabase
        .from('cursos')
        .insert({ nivel: Number(nivel), letra: letra.toUpperCase() })
        .select()
        .single()
    return { data, error }
    }

    // ── Crear asignatura ──────────────────────────────────────────────────────────
    export async function crearAsignatura({ nombre }) {
    const { data, error } = await supabase
        .from('asignaturas')
        .insert({ nombre })
        .select()
        .single()
    return { data, error }
    }

    // ── Asignar profesor a asignatura y curso ─────────────────────────────────────
    export async function asignarProfesor({ profesorId, asignaturaId, cursoId }) {
    const { data, error } = await supabase
        .from('profesor_asignatura')
        .insert({ profesor_id: profesorId, asignatura_id: asignaturaId, curso_id: cursoId })
        .select()
        .single()
    return { data, error }
    }