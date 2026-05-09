    // src/pages/NotFound.jsx
    import { useNavigate } from 'react-router-dom'

    export default function NotFound() {
    const navigate = useNavigate()
    return (
        <div className="notfound-shell">
        <div className="notfound-code">404</div>
        <h2>Página no encontrada</h2>
        <p>La ruta que buscas no existe o fue movida.</p>
        <button className="button ghost" style={{ marginTop: 8 }} onClick={() => navigate(-1)}>
            ← Volver
        </button>
        </div>
    )
    }
