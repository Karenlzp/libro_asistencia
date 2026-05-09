// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
// Auth / públicas
import Login    from './pages/Login'
import NotFound from './pages/NotFound'

// Páginas por rol (las iremos creando paso a paso)
import AdminDashboard    from './pages/admin/admin_Dashboard'
import ProfesorDashboard from './pages/profesor/profesor_Dashboard'
import AlumnoDashboard   from './pages/alumno/alumno_Dashboard'

// Guards
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
    })

    // Escuchar cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, curso_id')
      .eq('id', userId)
      .single()

    if (!error && data) setProfile(data)
  }

  // Pantalla de carga mientras resuelve la sesión
  if (session === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Ruta pública ── */}
        <Route
          path="/login"
          element={
            session
              ? <Navigate to={getRutaInicio(profile)} replace />
              : <Login />
          }
        />

        {/* ── Rutas protegidas Admin ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="admin">
              <DashboardLayout profile={profile}>
                <AdminDashboard profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Rutas protegidas Profesor ── */}
        <Route
          path="/profesor"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="profesor">
              <DashboardLayout profile={profile}>
                <ProfesorDashboard profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Rutas protegidas Alumno ── */}
        <Route
          path="/alumno"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="alumno">
              <DashboardLayout profile={profile}>
                <AlumnoDashboard profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Raíz: redirige según estado ── */}
        <Route
          path="/"
          element={
            session
              ? <Navigate to={getRutaInicio(profile)} replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  )
}

// Devuelve la ruta de inicio según el rol del perfil
function getRutaInicio(profile) {
  if (!profile) return '/login'
  const rutas = { admin: '/admin', profesor: '/profesor', alumno: '/alumno' }
  return rutas[profile.rol] ?? '/login'
}
