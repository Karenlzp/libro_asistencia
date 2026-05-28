    // src/pages/Login.jsx
    import { useState } from 'react'
    import { supabase } from '../supabaseClient'
    import { useNavigate } from 'react-router-dom'

    export default function Login() {
    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [error,    setError]    = useState(null)
    const [loading,  setLoading]  = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        // 1. Autenticar
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
        setError('Correo o contraseña incorrectos.')
        setLoading(false)
        return
        }

        // 2. Obtener perfil y validar activo
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
        // Deshabilitado: cerrar sesión y mostrar mensaje
        await supabase.auth.signOut()
        setError('Tu cuenta fue deshabilitada.')
        setLoading(false)
        return
        }

        const rutas = { admin: '/admin', profesor: '/profesor', alumno: '/alumno' }
        navigate(rutas[perfil.rol] ?? '/login', { replace: true })
        setLoading(false)
    }

    return (
        <div className="login-shell">
        <div className="login-brand">
            <div className="login-brand-logo">📚</div>
            <h1>Plataforma Escolar</h1>
            <p>Sistema integrado de gestión académica para docentes y estudiantes.</p>
        </div>

        <div className="login-form-area">
            <div className="login-box">
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu correo institucional.</p>

            <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                    className="form-input"
                    type="email"
                    placeholder="nombre@colegio.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                />
                </div>

                <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                />
                </div>

                {error && <div className="alert error">{error}</div>}

                <button className="login-submit" type="submit" disabled={loading}>
                {loading ? 'Ingresando…' : 'Entrar'}
                </button>
            </form>
            </div>
        </div>
        </div>
    )
    }
