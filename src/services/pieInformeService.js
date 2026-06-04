import { supabase } from '../supabaseClient'

const BUCKET = 'pie-informes'

function buildInformePath(alumnoId, fileName) {
  return `${alumnoId}/${Date.now()}_${fileName}`
}

export async function getInformesPie(alumnoId) {
  const { data, error } = await supabase
    .from('pie_informes')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function getInformeUrl(path) {
  if (!path) return { data: { url: null }, error: null }

  // Para bucket privado: usar createSignedUrl cuando exista.
  // Si la versión de supabase-js no lo soporta, cae al fallback público.
  if (typeof supabase.storage?.from?.(BUCKET)?.createSignedUrl === 'function') {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10) // 10 min

    if (error) return { data: { url: null }, error }
    return { data: { url: data.signedUrl }, error: null }
  }

  const { data, error } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (error) return { data: { url: null }, error }
  return { data: { url: data.publicUrl }, error: null }
}

export async function uploadInformePie(file, alumnoId) {
  if (!file) return { data: null, error: { message: 'Debe seleccionar un archivo.' } }

  const path = buildInformePath(alumnoId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) return { data: null, error: uploadError }

  // Importante: no guardar URL firmada en DB; solo generarla en tiempo real.
  // Retornamos signedUrl para usar inmediatamente en la UI.
  const { data: urlData, error: urlError } = await getInformeUrl(path)
  if (urlError) return { data: { path, url: null }, error: urlError }

  return { data: { path, url: urlData.url }, error: null }
}

export async function createInformePie({ alumnoId, pieId, titulo, descripcion, archivo_url, nombre_archivo }) {
  const { data, error } = await supabase
    .from('pie_informes')
    .insert({
      alumno_id: alumnoId,
      pie_id: pieId,
      titulo,
      descripcion,
      archivo_url,
      nombre_archivo,
    })
    .select()
    .single()

  return { data, error }
}

