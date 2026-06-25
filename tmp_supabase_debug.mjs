import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve('.env.local')
const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const idx = line.indexOf('=')
  if (idx > 0) {
    acc[line.slice(0, idx)] = line.slice(idx + 1)
  }
  return acc
}, {})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const res = await supabase
  .from('usuarios')
  .select('id,nombre,pie,curso_id,cursos(id,nivel,letra)')
  .eq('pie', true)
  .order('nombre')

console.log(JSON.stringify(res, null, 2))
