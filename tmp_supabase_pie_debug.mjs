import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve('.env.local')
const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const idx = line.indexOf('=')
  if (idx > 0) acc[line.slice(0, idx)] = line.slice(idx + 1)
  return acc
}, {})
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const ids = [
  '85432b11-17f1-49cd-8474-ca464736b190',
  '96008681-7704-448f-a962-484d8012f2ca',
  'a5b197b6-fef1-478b-8979-d655386c79aa'
]

for (const id of ids) {
  console.log('===', id, '===')
  const det = await supabase.from('usuarios').select('id,nombre,pie,curso_id,cursos(id,nivel,letra)').eq('id', id).single()
  console.log('detail', JSON.stringify(det, null, 2))
  const resumen = await supabase.from('v_pie_resumen').select('*').eq('alumno_id', id).maybeSingle()
  console.log('resumen', JSON.stringify(resumen, null, 2))
  const asistencia = await supabase.from('v_pie_asistencia').select('*').eq('alumno_id', id).order('fecha', { ascending: false })
  console.log('asistencia', JSON.stringify(asistencia, null, 2))
  const notas = await supabase.from('v_pie_notas').select('*').eq('alumno_id', id).order('fecha', { ascending: false })
  console.log('notas', JSON.stringify(notas, null, 2))
  const alertas = await supabase.from('v_alertas').select('*').eq('alumno_id', id).maybeSingle()
  console.log('alertas', JSON.stringify(alertas, null, 2))
}
