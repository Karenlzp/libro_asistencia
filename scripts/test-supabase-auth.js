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
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

;(async () => {
  try {
    const email = 'admin@colegio.cl'
    const password = '1234'
    console.log('Intentando autenticar:', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Auth error:', error.message ?? error)
      process.exit(2)
    }
    console.log('Auth success. user id:', data?.user?.id)
    process.exit(0)
  } catch (e) {
    console.error('Exception:', e?.message ?? e)
    process.exit(3)
  }
})()
