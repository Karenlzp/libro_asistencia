    // src/components/ProtectedRoute.jsx
    import { Navigate } from 'react-router-dom'

    export default function ProtectedRoute({ session, profile, requiredRole, children }) {
    if (!session) return <Navigate to="/login" replace />

    if (!profile) {
        return (
        <div className="loading-screen">
            <div className="spinner" />
            <p>Verificando acceso...</p>
        </div>
        )
    }

    if (requiredRole && profile.rol !== requiredRole) {
        const rutas = { admin: '/admin', profesor: '/profesor', alumno: '/alumno' }
        return <Navigate to={rutas[profile.rol] ?? '/login'} replace />
    }

    return children
    }
