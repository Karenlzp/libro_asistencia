import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data?.session))
      setReady(true)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)

    const pwd = password.trim()
    if (pwd.length < 8) {
      setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (pwd !== confirmPassword.trim()) {
      setStatus({ type: 'error', msg: 'Las contraseñas no coinciden.' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) {
      setLoading(false)
      setStatus({ type: 'error', msg: error.message })
      return
    }

    await supabase.auth.signOut()
    setLoading(false)
    setStatus({ type: 'success', msg: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
    navigate('/login', { replace: true })
  }

  return (
    <div className="login-shell">
      <section className="login-brand">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <div className="login-brand-copy">
              <span className="login-brand-kicker">Plataforma Escolar</span>
              <h1>Restablecer contraseña.</h1>
              <p>Define una nueva contraseña para tu cuenta.</p>
            </div>
          </div>
        </div>
        <div className="login-brand-footer">
          <div className="login-brand-badge">Acceso seguro</div>
          <p>Si el enlace expiró, solicita uno nuevo desde la pantalla de inicio.</p>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-box login-card">
          <div className="login-box-header">
            <span className="login-box-kicker">Recuperación</span>
            <h2>Nueva contraseña</h2>
            <p>Ingresa y confirma tu nueva contraseña.</p>
          </div>

          {!ready ? (
            <div className="loading-wrap"><div className="spinner" /> Verificando enlace...</div>
          ) : !hasSession ? (
            <div className="alert error">
              El enlace es inválido o expiró. Vuelve a iniciar la recuperación desde el login.
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">Nueva contraseña</label>
                <input
                  id="new-password"
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirmar contraseña</label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {status && <div className={`alert ${status.type}`}>{status.msg}</div>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>

              <div className="login-help-links">
                <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>Volver al login</a>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
