import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv(path = './.env.local') {
  try {
    const s = readFileSync(path, 'utf8')
    return s.split(/\r?\n/).reduce((acc, line) => {
      const m = line.match(/^([^=]+)=(.*)$/)
      if (m) acc[m[1]] = m[2]
      return acc
    }, {})
  } catch (e) {
    console.error('No se pudo leer .env.local:', e.message)
    process.exit(1)
  }
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(url, key)

async function getAlumnos() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .eq('rol', 'alumno')
    .eq('pie', true)
    .order('nombre')
  if (error) throw error
  return data
}

async function testAlumno(id) {
  const results = {}
  const calls = {
    getAlumno: supabase.from('usuarios').select('id, nombre, pie, curso_id, cursos ( id, nivel, letra )').eq('id', id).single(),
    observaciones: supabase.from('pie_observaciones').select('id').eq('alumno_id', id),
    anotaciones: supabase.from('anotaciones').select('id').eq('alumno_id', id),
    resumen: supabase.from('v_pie_resumen').select('*').eq('alumno_id', id).maybeSingle(),
    asistencia: supabase.from('v_pie_asistencia').select('*').eq('alumno_id', id),
    retiros: supabase.from('pie_retiros').select('id').eq('alumno_id', id),
    informes: supabase.from('pie_informes').select('id').eq('alumno_id', id),
    notas: supabase.from('v_pie_notas').select('*').eq('alumno_id', id),
    alertas: supabase.from('v_alertas').select('*').eq('alumno_id', id).maybeSingle(),
  }

  for (const [k, p] of Object.entries(calls)) {
    try {
      const r = await p
      results[k] = { ok: true, data: r.data }
    } catch (e) {
      results[k] = { ok: false, error: e.message ?? e }
    }
  }
  return results
}

;(async () => {
  try {
    const alumnos = await getAlumnos()
    console.log('Encontrados', alumnos.length, 'alumnos PIE')
    for (const a of alumnos) {
      console.log('\n--- Alumno:', a.nombre, a.id)
      const r = await testAlumno(a.id)
      for (const k of Object.keys(r)) {
        if (!r[k].ok) console.log(k, 'ERROR:', r[k].error)
        else console.log(k, 'OK (rows):', Array.isArray(r[k].data) ? r[k].data.length : (r[k].data ? '1' : '0'))
      }
    }
    process.exit(0)
  } catch (e) {
    console.error('Fatal:', e.message ?? e)
    process.exit(1)
  }
})()
