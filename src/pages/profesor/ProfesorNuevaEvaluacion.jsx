import { useMemo, useState } from 'react'

import {
  getProfesorCursos,
  getEvaluacionesProfesor,
  crearEvaluacion,
} from '../../services/profesorService'

const hoy = new Date().toISOString().slice(0, 10)

export default function ProfesorNuevaEvaluacion({ profile }) {
  const [loading, setLoading] = useState(false)

  const [cursoAsig, setCursoAsig] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])

  const [cursoId, setCursoId] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')

  const [evalForm, setEvalForm] = useState({ nombre: '', porcentaje: 20, fecha: hoy })

  const loadBase = async () => {
    if (!profile?.id) return
    setLoading(true)
    const [ca, ev] = await Promise.all([
      getProfesorCursos(profile.id),
      getEvaluacionesProfesor(profile.id),
    ])
    setCursoAsig(ca.data ?? [])
    setEvaluaciones(ev.data ?? [])
    setLoading(false)
  }

  // Carga inicial
  useMemo(() => {
    loadBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const cursoMap = useMemo(() => {
    const map = {}
    for (const item of cursoAsig) {
      const id = item.cursos.id
      if (!map[id]) map[id] = { ...item.cursos, asignaturas: [] }
      map[id].asignaturas.push(item.asignaturas)
    }
    return map
  }, [cursoAsig])

  const cursoList = Object.values(cursoMap)
  const asignaturasDelCurso = cursoId ? (cursoMap[cursoId]?.asignaturas ?? []) : []

  const [status, setStatus] = useState(null)
  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 4000)
  }

  const handleCursoChange = async (id) => {
    setCursoId(id)
    setAsignaturaId('')
  }

  const handleCrearEval = async (e) => {
    e.preventDefault()

    if (!cursoId || !asignaturaId || !evalForm.nombre) {
      return notify('error', 'Selecciona curso, asignatura y nombre.')
    }

    const { error } = await crearEvaluacion({
      nombre: evalForm.nombre,
      asignaturaId,
      profesorId: profile.id,
      cursoId,
      porcentaje: evalForm.porcentaje,
      fecha: evalForm.fecha,
    })

    if (error) return notify('error', 'Error: ' + error.message)

    notify('success', 'Evaluación creada.')
    setEvalForm({ nombre: '', porcentaje: 20, fecha: hoy })

    const { data } = await getEvaluacionesProfesor(profile.id)
    setEvaluaciones(data ?? [])
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /> Cargando panel...</div>

  return (
    <div>
      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Crear evaluación</div>
        </div>

        <form className="form-grid" onSubmit={handleCrearEval}>
          <div className="form-group">
            <label className="form-label">Curso</label>
            <select
              className="form-select"
              value={cursoId}
              onChange={(e) => handleCursoChange(e.target.value)}
              required
            >
              <option value="">Elegir curso</option>
              {cursoList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nivel}°{c.letra}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Asignatura</label>
            <select
              className="form-select"
              value={asignaturaId}
              onChange={(e) => setAsignaturaId(e.target.value)}
              disabled={!cursoId}
              required
            >
              <option value="">Elegir asignatura</option>
              {asignaturasDelCurso.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              className="form-input"
              placeholder="Ej: Prueba 1 — Unidad 2"
              value={evalForm.nombre}
              onChange={(e) => setEvalForm((p) => ({ ...p, nombre: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Porcentaje (%)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              max="100"
              value={evalForm.porcentaje}
              onChange={(e) => setEvalForm((p) => ({ ...p, porcentaje: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              className="form-input"
              type="date"
              value={evalForm.fecha}
              onChange={(e) => setEvalForm((p) => ({ ...p, fecha: e.target.value }))}
              required
            />
          </div>

          <div className="form-actions">
            <button className="button primary" type="submit">Crear evaluación</button>
          </div>
        </form>
      </div>
    </div>
  )
}

