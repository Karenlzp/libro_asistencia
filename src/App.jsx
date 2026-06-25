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
import AdminProfesores   from './pages/admin/AdminProfesores'
import ProfesorDashboard from './pages/profesor/profesor_Dashboard'
import ProfesorNuevaEvaluacion from './pages/profesor/ProfesorNuevaEvaluacion'
import AlumnoDashboard   from './pages/alumno/alumno_Dashboard'

import ProfesorAlumnoFichaIntegral from './pages/profesor/ProfesorAlumnoFichaIntegral'

import PieDashboard      from './pages/pie/pie_Dashboard'
import PieAlumnoDetalle from './pages/pie/pie_AlumnoDetalle'

// Guards
import ProtectedRoute from './components/ProtectedRoute'


export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)

  // PIE pages
  // (import deferred below to keep file edits localized)


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

        <Route
          path="/admin/profesores"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="admin">
              <DashboardLayout profile={profile}>
                <AdminProfesores profile={profile} />
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

        <Route
          path="/profesor/nueva-evaluacion"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="profesor">
              <DashboardLayout profile={profile}>
                <ProfesorNuevaEvaluacion profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profesor/alumno/:id"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="profesor">
              <DashboardLayout profile={profile}>
                <ProfesorAlumnoFichaIntegral profile={profile} />
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


        {/* ── Rutas protegidas PIE ── */}
        <Route
          path="/pie/dashboard"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="pie">
              <DashboardLayout profile={profile}>
                <PieDashboard profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pie/alumno/:id"
          element={
            <ProtectedRoute session={session} profile={profile} requiredRole="pie">
              <DashboardLayout profile={profile}>
                <PieAlumnoDetalle profile={profile} />
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
  const rutas = { admin: '/admin', profesor: '/profesor', alumno: '/alumno', pie: '/pie/dashboard' }
  return rutas[profile.rol] ?? '/login'
}
