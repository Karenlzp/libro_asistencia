import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

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
if (!url || !key) {
  console.error('Faltan variables de supabase en .env.local')
  process.exit(1)
}
const supabase = createClient(url, key)

const ids = [
  '85432b11-17f1-49cd-8474-ca464736b190', // Cole Ramírez
  '96008681-7704-448f-a962-484d8012f2ca', // lui
  'a5b197b6-fef1-478b-8979-d655386c79aa', // Pedro Soto
]

;(async () => {
  for (const id of ids) {
    console.log('\n--- alumno:', id)
    try {
      const { data, error } = await supabase
        .from('v_alertas')
        .select('*')
        .eq('alumno_id', id)
        .limit(100)
      if (error) {
        console.error('ERROR:', error)
      } else {
        console.log('rows:', data.length)
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (e) {
      console.error('EXCEPTION:', e.message || e)
    }
  }
})()
