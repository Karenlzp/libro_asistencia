# TODO - Dashboard alumno por asignatura

- [ ] Revisar `src/pages/alumno/alumno_Dashboard.jsx` y `src/services/alumnoService.js` para identificar dónde se aplica el filtro y dónde no.
- [ ] Actualizar `getNotasAlumno` para que incluya `evaluaciones.asignaturas.id` (además de nombre).
- [ ] Cambiar el estado `asignaturaSel` para que filtre por `asignatura_id` (y mantener opción `todas`).
- [ ] Asegurar que el filtro afecte:
  - [ ] Render de tab “📘 Notas” (usar `notasFiltradas`).
  - [ ] Render de tab “📅 Asistencia” (usar `asistenciaFiltrada`).
- [ ] Header / resumen (promedio y asistencia deben usar valores filtrados).
- [ ] Sección de “Promedio por asignatura” (mostrar solo la asignatura seleccionada cuando aplique).
- [ ] Alertas (ya usan filtrado parcial; ajustar para cobertura total).

- [x] Verificar que “anotaciones” sigan siendo globales (sin filtrarlas por asignatura).
- [ ] Ejecutar `npm run dev` y comprobar el comportamiento en UI.


