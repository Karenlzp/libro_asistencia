// src/pages/Login.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.75Zm1.8-.25L12 11.32 18.2 6.5H5.8Zm12.7 1.93-5.89 4.58a1 1 0 0 1-1.22 0L5.5 8.43v8.82c0 .14.11.25.25.25h12.5a.25.25 0 0 0 .25-.25V8.43Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.75A4.75 4.75 0 0 0 7.25 7.5V9H6.5A2.5 2.5 0 0 0 4 11.5v7A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 17.5 9h-.75V7.5A4.75 4.75 0 0 0 12 2.75Zm-3.25 6.5V7.5a3.25 3.25 0 1 1 6.5 0v1.75h-6.5Zm-2 2a1 1 0 0 1 1-1h8.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-7Zm5.25 1.25a1 1 0 0 0-1 1v2.5a1 1 0 1 0 2 0V13.5a1 1 0 0 0-1-1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5c4.85 0 8.63 2.88 10.5 7-1.87 4.12-5.65 7-10.5 7S3.37 16.12 1.5 12C3.37 7.88 7.15 5 12 5Zm0 2C8.18 7 5.14 9.13 3.58 12 5.14 14.87 8.18 17 12 17s6.86-2.13 8.42-5C18.86 9.13 15.82 7 12 7Zm0 1.75A3.25 3.25 0 1 1 8.75 12 3.25 3.25 0 0 1 12 8.75Zm0 1.5A1.75 1.75 0 1 0 13.75 12 1.75 1.75 0 0 0 12 10.25Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.28 2.22 2.22 3.28l3 3C3.55 7.6 2.28 9.61 1.5 12c1.87 4.12 5.65 7 10.5 7 2.04 0 3.91-.51 5.52-1.41l3.2 3.19 1.06-1.06L3.28 2.22ZM7.4 8.46l1.63 1.63a3.25 3.25 0 0 0 4.88 4.19l1.76 1.76A8.82 8.82 0 0 1 12 17c-3.82 0-6.86-2.13-8.42-5 .68-1.24 1.63-2.3 2.82-3.12Zm8.85 4.6-1.56-1.56c.04-.16.06-.33.06-.5A2.75 2.75 0 0 0 11 8.25c-.17 0-.34.02-.5.06L8.74 6.55A8.87 8.87 0 0 1 12 6.99c3.82 0 6.86 2.13 8.42 5-.9 1.64-2.22 3-3.85 4.07l-1.31-1.31c.44-.48.78-1.04.99-1.69Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Correo o contraseña incorrectos.')
        setLoading(false)
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('rol, activo')
        .eq('id', data.user.id)
        .single()

      if (perfilError || !perfil?.rol) {
        setError('Tu usuario no tiene un perfil configurado. Contacta al administrador.')
        setLoading(false)
        return
      }

      if (perfil.activo === false) {
        await supabase.auth.signOut()
        setError('Tu cuenta fue deshabilitada.')
        setLoading(false)
        return
      }

      const rutas = { admin: '/admin', profesor: '/profesor', alumno: '/alumno', pie: '/pie/dashboard' }
      navigate(rutas[perfil.rol] ?? '/login', { replace: true })
      setLoading(false)
    } catch {
      setError('Ocurrió un error inesperado. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const handleSupportAccess = (e) => {
    e.preventDefault()
    setError('Si no puedes acceder, contacta a soporte institucional o al administrador del sistema.')
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    ;(async () => {
      setError(null)
      const correo = email.trim()
      if (!correo) {
        setError('Escribe tu correo y luego presiona "¿Olvidaste tu contrasena?"')
        return
      }
      setLoading(true)
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      setError('Te enviamos un enlace de recuperación a tu correo. Revisa tu bandeja de entrada.')
    })()
  }

  return (
    <div className="login-shell">
      <section className="login-brand">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <div className="login-brand-copy">
              <span className="login-brand-kicker">Plataforma Escolar</span>
              <h1>Gestion escolar simple, clara y conectada.</h1>
              <p>
                Centraliza el acceso de docentes, estudiantes y equipos de apoyo en una
                experiencia institucional moderna.
              </p>
            </div>
          </div>

          <div className="login-visual-card" aria-hidden="true">
            <div className="login-visual-metrics">
              <div className="login-visual-chart">
                <span className="login-visual-bar bar-1" />
                <span className="login-visual-bar bar-2" />
                <span className="login-visual-bar bar-3" />
              </div>
              <div className="login-visual-stat">
                <strong>92%</strong>
                <span>Asistencia semanal</span>
              </div>
            </div>
            <div className="login-visual-summary">
              <div className="login-visual-summary-top">
                <span className="login-visual-chip">Indicador semanal</span>
                <div className="login-visual-book">
                  <span />
                  <span />
                </div>
              </div>
              <div className="login-visual-copy">
                <strong>Vista general del sistema</strong>
                <p>Esta semana se registro un 92% de asistencia general.</p>
              </div>
              <div className="login-visual-lines">
                <span>Seguimiento academico centralizado</span>
                <span>Informacion escolar disponible en un solo lugar</span>
                <span>Acceso seguro para toda la comunidad educativa</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          <div className="login-brand-badge">Entorno seguro para gestion academica</div>
          <p>Educacion, seguimiento y analitica en una misma plataforma.</p>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-box login-card">
          <div className="login-box-header">
            <span className="login-box-kicker">Acceso institucional</span>
            <h2>Iniciar sesion</h2>
            <p>Ingresa con tu correo institucional para continuar.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Correo electronico</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  id="login-email"
                  className="form-input login-input"
                  type="email"
                  placeholder="nombre@colegio.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Contrasena</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="login-password"
                  className="form-input login-input login-input-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  aria-pressed={showPassword}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && <div className="alert error">{error}</div>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>

            <div className="login-help-links">
              <a href="/" onClick={handleForgotPassword}>Olvidaste tu contrasena?</a>
              <a href="/" onClick={handleSupportAccess}>Acceso a soporte</a>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
