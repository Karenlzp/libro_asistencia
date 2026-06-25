// src/services/adminService.js
import { supabase } from '../supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { writeAuditLog } from './auditService'

function createEphemeralAuthClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `tmp-admin-create-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
  })
}

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
  const primary = await supabase
    .from('usuarios')
    .select(`id, nombre, email, rol, activo, created_at, curso_id, cursos ( nivel, letra )`)
    .eq('activo', true)
    .order('rol')
    .order('nombre')

  if (!primary.error) return { data: primary.data, error: null }

  const msg = String(primary.error.message ?? '')
  if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('does not exist')) {
    const fallback = await supabase
      .from('usuarios')
      .select(`id, nombre, rol, activo, created_at, curso_id, cursos ( nivel, letra )`)
      .eq('activo', true)
      .order('rol')
      .order('nombre')
    return { data: fallback.data ?? [], error: null }
  }

  return { data: [], error: primary.error }
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
export async function crearCurso({ nivel, letra, actor }) {
  // Validar que letra solo tenga letras
  if (!/^[A-Za-z]+$/.test(letra)) {
    return { data: null, error: { message: 'La letra del curso solo puede contener letras (A, B, C...).' } }
  }
  const { data, error } = await supabase
    .from('cursos')
    .insert({ nivel: Number(nivel), letra: letra.toUpperCase() })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'curso',
      entityId: data.id,
      newValue: { nivel: data.nivel, letra: data.letra },
      metadata: { curso: `${data.nivel}°${data.letra}` },
    })
  }
  return { data, error }
}

export async function actualizarCurso({ id, nivel, letra, actor }) {
  if (!id) return { data: null, error: { message: 'Curso inválido.' } }
  if (!/^[A-Za-z]+$/.test(letra)) {
    return { data: null, error: { message: 'La letra del curso solo puede contener letras (A, B, C...).' } }
  }

  const { data: previo } = await supabase
    .from('cursos')
    .select('id, nivel, letra')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('cursos')
    .update({ nivel: Number(nivel), letra: String(letra).trim().toUpperCase() })
    .eq('id', id)
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'editar',
      entity: 'curso',
      entityId: data.id,
      fieldName: 'curso',
      oldValue: previo ? { nivel: previo.nivel, letra: previo.letra } : null,
      newValue: { nivel: data.nivel, letra: data.letra },
      metadata: { curso: `${data.nivel}°${data.letra}` },
    })
  }
  return { data, error }
}

// ── Eliminar curso ────────────────────────────────────────────────────────────
export async function eliminarCurso(id, actor) {
  const { data: previo } = await supabase
    .from('cursos')
    .select('id, nivel, letra')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('cursos')
    .delete()
    .eq('id', id)

  if (!error && previo) {
    await writeAuditLog({
      actor,
      action: 'eliminar',
      entity: 'curso',
      entityId: previo.id,
      oldValue: previo,
      metadata: { curso: `${previo.nivel}°${previo.letra}` },
    })
  }
  return { error }
}

// ── Crear asignatura ──────────────────────────────────────────────────────────
export async function crearAsignatura({ nombre, actor }) {
  const { data, error } = await supabase
    .from('asignaturas')
    .insert({ nombre: nombre.trim() })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'asignatura',
      entityId: data.id,
      newValue: { nombre: data.nombre },
    })
  }
  return { data, error }
}

// ── Asignar profesor ──────────────────────────────────────────────────────────
export async function asignarProfesor({ profesorId, asignaturaId, cursoId, actor }) {
  const { data, error } = await supabase
    .from('profesor_asignatura')
    .insert({ profesor_id: profesorId, asignatura_id: asignaturaId, curso_id: cursoId })
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'asignacion_profesor',
      entityId: data.id,
      newValue: {
        profesor_id: data.profesor_id,
        asignatura_id: data.asignatura_id,
        curso_id: data.curso_id,
      },
    })
  }
  return { data, error }
}

// ── Eliminar asignación ───────────────────────────────────────────────────────
export async function eliminarAsignacion(id, actor) {
  const { data: previo } = await supabase
    .from('profesor_asignatura')
    .select('id, profesor_id, asignatura_id, curso_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('profesor_asignatura')
    .delete()
    .eq('id', id)

  if (!error && previo) {
    await writeAuditLog({
      actor,
      action: 'eliminar',
      entity: 'asignacion_profesor',
      entityId: previo.id,
      oldValue: previo,
    })
  }
  return { error }
}

// ── Desactivar usuario (soft delete) ─────────────────────────────────────────
export async function desactivarUsuario(id, actor) {
  const { data: previo } = await supabase
    .from('usuarios')
    .select('id, nombre, rol, activo')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('usuarios')
    .update({ activo: false })
    .eq('id', id)

  if (!error && previo) {
    await writeAuditLog({
      actor,
      action: 'desactivar',
      entity: 'usuario',
      entityId: previo.id,
      fieldName: 'activo',
      oldValue: { activo: previo.activo },
      newValue: { activo: false },
      metadata: { nombre: previo.nombre, rol: previo.rol },
    })
  }
  return { error }
}

// ── Lista de usuarios deshabilitados ─────────────────────────────────────
export async function getUsuariosInactivos() {
  const primary = await supabase
    .from('usuarios')
    .select(`id, nombre, email, rol, activo, created_at, curso_id, cursos ( nivel, letra )`)
    .eq('activo', false)
    .order('rol')
    .order('nombre')

  if (!primary.error) return { data: primary.data, error: null }

  const msg = String(primary.error.message ?? '')
  if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('does not exist')) {
    const fallback = await supabase
      .from('usuarios')
      .select(`id, nombre, rol, activo, created_at, curso_id, cursos ( nivel, letra )`)
      .eq('activo', false)
      .order('rol')
      .order('nombre')
    return { data: fallback.data ?? [], error: null }
  }

  return { data: [], error: primary.error }
}

export async function actualizarUsuarioPerfil({ id, nombre, email, rol, cursoId, actor }) {
  const { data: previo, error: prevError } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, curso_id')
    .eq('id', id)
    .maybeSingle()

  if (prevError) return { data: null, error: prevError }
  if (!previo) return { data: null, error: { message: 'Usuario no encontrado.' } }

  const normalizedRol = rol ? String(rol).trim().toLowerCase() : null
  const nextRol = normalizedRol ?? previo.rol
  const nextCursoId = nextRol === 'alumno' ? (cursoId ?? previo.curso_id ?? null) : null

  if (nextRol === 'alumno' && !nextCursoId) {
    return { data: null, error: { message: 'El rol alumno requiere un curso asignado.' } }
  }

  const payload = {
    nombre: nombre?.trim() ? nombre.trim() : previo.nombre,
    email: email?.trim() ? email.trim().toLowerCase() : (previo.email ?? null),
    rol: nextRol,
    curso_id: nextCursoId,
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(payload)
    .eq('id', id)
    .select('id, nombre, email, rol, curso_id')
    .single()

  if (error) {
    const msg = String(error.message ?? '')
    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('does not exist')) {
      return { data: null, error: { message: 'Falta la columna email en la tabla usuarios. Ejecuta supabase/usuarios_email.sql en Supabase.' } }
    }
  }

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'editar',
      entity: 'usuario',
      entityId: data.id,
      fieldName: 'perfil',
      oldValue: { nombre: previo.nombre, email: previo.email ?? null, rol: previo.rol, curso_id: previo.curso_id ?? null },
      newValue: { nombre: data.nombre, email: data.email ?? null, rol: data.rol, curso_id: data.curso_id ?? null },
      metadata: { rol: data.rol },
    })
  }

  return { data, error }
}

export async function crearUsuario({ nombre, email, password, rol, cursoId, actor }) {
  const correo = String(email ?? '').trim().toLowerCase()
  const displayName = String(nombre ?? '').trim()

  if (!correo) return { data: null, error: { message: 'Debes ingresar un correo.' } }
  if (!displayName) return { data: null, error: { message: 'Debes ingresar un nombre.' } }
  if (!password || String(password).length < 6) return { data: null, error: { message: 'La contraseña debe tener al menos 6 caracteres.' } }
  if (!rol) return { data: null, error: { message: 'Debes seleccionar un rol.' } }

  const authClient = createEphemeralAuthClient()
  const { data: authData, error: authError } = await authClient.auth.signUp({
    email: correo,
    password: String(password),
  })

  if (authError) {
    const msg = String(authError.message ?? '').toLowerCase()
    if (msg.includes('rate limit') && msg.includes('email')) {
      return {
        data: null,
        error: {
          message:
            'Supabase bloqueó el envío de correos por límite (email rate limit exceeded). ' +
            'Soluciones: espera unos minutos e intenta de nuevo, usa un correo real, o desactiva temporalmente la confirmación por correo en Supabase (Auth) para pruebas.',
        },
      }
    }
    return { data: null, error: authError }
  }

  const userId = authData?.user?.id
  if (!userId) return { data: null, error: { message: 'No se pudo crear el usuario en Auth.' } }

  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      id: userId,
      nombre: displayName,
      email: correo,
      rol,
      curso_id: rol === 'alumno' ? (cursoId || null) : null,
      activo: true,
    })
    .select('id, nombre, email, rol, curso_id, activo')
    .single()

  if (error) {
    const msg = String(error.message ?? '')
    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email') && msg.toLowerCase().includes('does not exist')) {
      return { data: null, error: { message: 'Falta la columna email en la tabla usuarios. Ejecuta supabase/usuarios_email.sql en Supabase.' } }
    }
  }

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'usuario',
      entityId: data.id,
      newValue: { nombre: data.nombre, email: data.email ?? null, rol: data.rol, curso_id: data.curso_id ?? null },
      metadata: { origen: 'admin' },
    })
  }

  return { data, error }
}

export async function enviarResetContrasena({ email, redirectTo }) {
  const correo = String(email ?? '').trim()
  if (!correo) return { data: null, error: { message: 'Correo inválido.' } }

  const to = redirectTo || `${window.location.origin}/reset-password`
  const { data, error } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo: to })
  return { data, error }
}

// ── Re-activar usuario ────────────────────────────────────────────────────
export async function reactivarUsuario(id, actor) {
  const { data: previo } = await supabase
    .from('usuarios')
    .select('id, nombre, rol, activo')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('usuarios')
    .update({ activo: true })
    .eq('id', id)

  if (!error && previo) {
    await writeAuditLog({
      actor,
      action: 'reactivar',
      entity: 'usuario',
      entityId: previo.id,
      fieldName: 'activo',
      oldValue: { activo: previo.activo },
      newValue: { activo: true },
      metadata: { nombre: previo.nombre, rol: previo.rol },
    })
  }
  return { error }
}


// ── Modificar nota (admin) ────────────────────────────────────────────────────
export async function modificarNota({ detalleNotaId, nota, actor }) {
  const { data: previa } = await supabase
    .from('detalle_nota')
    .select('id, nota, alumno_id, evaluacion_id')
    .eq('id', detalleNotaId)
    .maybeSingle()

  const { data, error } = await supabase
    .from('detalle_nota')
    .update({ nota: Number(nota) })
    .eq('id', detalleNotaId)
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'editar',
      entity: 'nota',
      entityId: data.id,
      fieldName: 'nota',
      oldValue: previa ? { nota: previa.nota } : null,
      newValue: { nota: data.nota },
      metadata: { alumno_id: data.alumno_id, evaluacion_id: data.evaluacion_id },
    })
  }
  return { data, error }
}

// ── Agregar anotación (admin) ─────────────────────────────────────────────────
export async function crearAnotacionAdmin({ alumnoId, adminId, tipo, descripcion, actor }) {
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

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'crear',
      entity: 'anotacion',
      entityId: data.id,
      newValue: {
        alumno_id: data.alumno_id,
        profesor_id: data.profesor_id,
        tipo: data.tipo,
      },
      metadata: { origen: 'admin' },
    })
  }
  return { data, error }
}

// ── Cambiar curso de un alumno ────────────────────────────────────────────────
export async function cambiarCursoAlumno({ alumnoId, cursoId, actor }) {
  const { data: previo } = await supabase
    .from('usuarios')
    .select('id, nombre, curso_id')
    .eq('id', alumnoId)
    .maybeSingle()

  const { data, error } = await supabase
    .from('usuarios')
    .update({ curso_id: cursoId })
    .eq('id', alumnoId)
    .select()
    .single()

  if (!error && data) {
    await writeAuditLog({
      actor,
      action: 'editar',
      entity: 'usuario_curso',
      entityId: data.id,
      fieldName: 'curso_id',
      oldValue: { curso_id: previo?.curso_id ?? null },
      newValue: { curso_id: data.curso_id ?? null },
      metadata: { nombre: previo?.nombre ?? null },
    })
  }
  return { data, error }
}
