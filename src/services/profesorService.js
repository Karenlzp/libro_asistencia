import { supabase } from '../supabaseClient'
import { writeAuditLog } from './auditService'

// src/services/profesorService.js
// Mantiene la API de exports existente.
// Corrección: getProfesorAlumnoFichaResumen debe retornar SIEMPRE una forma consistente.

export async function getProfesorCursos(profesorId) {
  const { data, error } = await supabase
    .from('profesor_asignatura')
    .select(`
      id,
      cursos ( id, nivel, letra ),
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

    // ── Notas del alumno (con relaciones) ─────────────────────────────────────
// --- Mapeos de compatibilidad (para que los imports existentes funcionen) ---
// El componente ProfesorAlumnoFichaIntegral.jsx espera estos exports con nombres específicos.
// Se reutiliza la lógica ya existente (sin cambiar el comportamiento), creando wrappers.

export async function getProfesorAlumnoFichaResumen({ alumnoId }) {
  console.log('RAW alumnoId:', alumnoId)

  try {
    let filtroId = alumnoId

    const str = typeof alumnoId === 'string' ? alumnoId.trim() : null
    const looksNumeric = str && /^[0-9]+$/.test(str)

    if (looksNumeric) {
      filtroId = Number(str)
    }

    console.log('filtroId final:', filtroId)

    const { data: alumnoData, error: alumnoError } = await supabase
      .from('usuarios')
      .select('id, nombre, cursos (nivel, letra)')
      .eq('id', filtroId)
      .maybeSingle()

    console.log('ALUMNO RAW:', alumnoData)

    const { data: anotData } = await supabase
      .from('v_alertas')
      .select('*')
      .eq('alumno_id', filtroId)

    return {
      data: {
        alumno: alumnoData ?? null,
        resumen: {
          promedio_general: null,
          porcentaje_asistencia: null,
          anotaciones_positivas: 0,
          anotaciones_negativas: 0,
          cantidad_alertas: anotData?.length ?? 0,
        },
      },
      error: alumnoError ?? null,
    }

  } catch (err) {
    console.error('ERROR ficha resumen:', err)

    return {
      data: {
        alumno: null,
        resumen: {
          promedio_general: null,
          porcentaje_asistencia: null,
          anotaciones_positivas: 0,
          anotaciones_negativas: 0,
          cantidad_alertas: 0,
        },
      },
      error: err,
    }
  }
}


export async function getProfesorAlumnoAsistenciaHistorial({ alumnoId }) {
    const { data, error } = await supabase
        .from('asistencia')
        .select('id, fecha, estado')
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false })

    return { data, error }
}

export async function getProfesorAlumnoConducta({ alumnoId }) {
    const { data, error } = await supabase
        .from('anotaciones')
        .select('id, tipo, descripcion, fecha, alumno_id')
        .eq('alumno_id', alumnoId)
        .order('fecha', { ascending: false })

    return { data, error }
}

export async function getProfesorAlumnoPieObservaciones({ alumnoId }) {
    const { data, error } = await supabase
        .from('pie_observaciones')
        .select('id, tipo_intervencion, observacion, resultado, created_at, alumno_id')
        .eq('alumno_id', alumnoId)
        .order('created_at', { ascending: false })

    return { data, error }
}

export async function getProfesorAlumnoPieRetiros({ alumnoId }) {
    const { data, error } = await supabase
        .from('pie_retiros')
        .select('id, motivo, tipo, estado, created_at, fecha_retorno, hora_retorno, alumno_id, curso_id, pie_id')
        .eq('alumno_id', alumnoId)
        .order('created_at', { ascending: false })

    return { data, error }
}

export async function getProfesorAlumnoPieInformes({ alumnoId }) {
    const { data, error } = await supabase
        .from('pie_informes')
        .select('*')
        .eq('alumno_id', alumnoId)
        .order('created_at', { ascending: false })

    return { data, error }
}

export async function getProfesorAlumnoNotas({ alumnoId }) {
  const { data, error } = await supabase
    .from('detalle_nota')
    .select(`
        id,
        nota,
        created_at,
        evaluaciones (
            nombre,
            fecha,
            asignaturas ( nombre )
        )
        `)
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

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
            profesor_id: data.profesor_id,
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
    const { data: previa, error: previaError } = await supabase
        .from('detalle_nota')
        .select('id, nota')
        .eq('evaluacion_id', evaluacionId)
        .eq('alumno_id', alumnoId)
        .maybeSingle()

    if (previaError) {
        return { data: null, error: previaError }
    }

    const valores = { evaluacion_id: evaluacionId, alumno_id: alumnoId, nota: Number(nota) }
    let data
    let error

    if (previa) {
        const response = await supabase
            .from('detalle_nota')
            .update(valores)
            .eq('id', previa.id)
            .select()
            .single()

        data = response.data
        error = response.error
    } else {
        const response = await supabase
            .from('detalle_nota')
            .insert(valores)
            .select()
            .single()

        data = response.data
        error = response.error
    }

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

    // ── Eliminar nota ─────────────────────────────────────────────────────────────
    export async function eliminarNota(detalleNotaId, actor) {
    const { data: previo, error: previoError } = await supabase
        .from('detalle_nota')
        .select('id, nota, alumno_id, evaluacion_id')
        .eq('id', detalleNotaId)
        .maybeSingle()

    if (previoError) {
        return { error: previoError }
    }

    const { error } = await supabase
        .from('detalle_nota')
        .delete()
        .eq('id', detalleNotaId)

    if (!error && previo) {
        await writeAuditLog({
        actor,
        action: 'eliminar',
        entity: 'nota',
        entityId: previo.id,
        fieldName: 'nota',
        oldValue: { nota: previo.nota },
        newValue: null,
        metadata: { evaluacion_id: previo.evaluacion_id, alumno_id: previo.alumno_id, origen: 'profesor' },
        })
    }

    return { error }
    }

    // ── Promedios de asignaturas del profesor ──────────────────────────────────────
    export async function getPromediosAsignaturasProfesor(profesorId) {
    const { data, error } = await supabase
        .from('detalle_nota')
        .select(`
        nota,
        evaluaciones!inner(
            asignaturas ( id, nombre ),
            profesor_id
        )
        `)
        .eq('evaluaciones.profesor_id', profesorId)

    if (error) return { data: null, error }

    const map = new Map()
    for (const row of data ?? []) {
        const asignatura = row?.evaluaciones?.asignaturas?.nombre ?? 'Sin asignatura'
        const key = row?.evaluaciones?.asignaturas?.id ?? asignatura
        const notaValor = Number(row.nota ?? 0)
        if (!map.has(key)) {
        map.set(key, { asignatura, total: notaValor, cantidad: 1 })
        } else {
        const actual = map.get(key)
        actual.total += notaValor
        actual.cantidad += 1
        }
    }

    const promedios = Array.from(map.values()).map(item => ({
        asignatura: item.asignatura,
        promedio: Number((item.total / item.cantidad).toFixed(2)),
        notas: item.cantidad,
    }))

    return { data: promedios, error: null }
    }

    // ── Editar anotación ─────────────────────────────────────────────────────────
    export async function editarAnotacion({ anotacionId, tipo, descripcion, actor }) {
    const { data: previo, error: previoError } = await supabase
        .from('anotaciones')
        .select('id, tipo, descripcion, alumno_id, profesor_id')
        .eq('id', anotacionId)
        .maybeSingle()

    if (previoError) {
        return { data: null, error: previoError }
    }

    const { data, error } = await supabase
        .from('anotaciones')
        .update({ tipo, descripcion })
        .eq('id', anotacionId)
        .select()
        .single()

    if (!error && data) {
        await writeAuditLog({
        actor,
        action: 'editar',
        entity: 'anotacion',
        entityId: data.id,
        fieldName: 'anotacion',
        oldValue: { tipo: previo?.tipo, descripcion: previo?.descripcion },
        newValue: { tipo: data.tipo, descripcion: data.descripcion },
        metadata: { alumno_id: previo?.alumno_id, profesor_id: previo?.profesor_id, origen: 'profesor' },
        })
    }

    return { data, error }
    }

    // ── Registrar asistencia masiva de un curso ───────────────────────────────────
    // registros = [{ alumnoId, estado }]
    export async function registrarAsistenciaMasiva(cursoId, asignaturaId, profesorId, fecha, registros = [], actor) {
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

        const { data: previos } = await supabase
            .from('asistencia')
            .select('alumno_id, estado, asignatura_id')
            .eq('curso_id', cursoId)
            .eq('profesor_id', profesorId)
            .eq('fecha', fecha)
            .eq('asignatura_id', asignaturaId)
            .in('alumno_id', registros.map(r => r.alumnoId))

        const { data, error } = await supabase
            .from('asistencia')
            .upsert(rows, { onConflict: 'alumno_id,fecha,asignatura_id' })
            .select()

        if (!error) {
            await writeAuditLog({
            actor,
            action: 'editar',
            entity: 'asistencia',
            entityId: `${cursoId}-${asignaturaId}-${fecha}`,
            fieldName: 'estado',
            oldValue: previos ?? [],
            newValue: rows,
            metadata: {
                curso_id: cursoId,
                asignatura_id: asignaturaId,
                profesor_id: profesorId,
                fecha,
                total_registros: rows.length,
                origen: 'profesor',
            },
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
        newValue: { alumno_id: alumnoId, profesor_id: profesorId, tipo, descripcion },
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
        newValue: { alumno_id: alumnoId, profesor_id: profesorId, motivo, tipo },
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
export async function getHistorialAsistenciaProfesor({ profesorId, cursoId, asignaturaId, fecha }) {
    if (!cursoId || !profesorId) return { data: [], error: null }

    console.log('Historial asistencia params', {
        profesorId,
        cursoId,
        asignaturaId,
        fecha,
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

    if (fecha) {
        q = q.eq('fecha', fecha)
    }

    q = q.order('fecha', { ascending: false })

    const { data, error } = await q
    return { data, error }
    }

