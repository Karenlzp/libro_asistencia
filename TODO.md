# TODO — Informes Internos PIE (React + Supabase)

- [ ] Paso 1: Agregar backend en `src/services/pieService.js`
  - [ ] getInformesPie(alumnoId)
  - [ ] uploadInformePie(file, alumnoId) -> upload a bucket `pie-informes`, path único, obtener signed URL (temporal) para usar en UI y/o para guardar, pero guardar solo path en DB.
  - [ ] createInformePie(...) -> insertar en `pie_informes` (guardar alumno_id, pie_id, titulo, descripcion, archivo_url=path, nombre_archivo)
  - [ ] getInformeUrl(path) -> generar signed URL en tiempo real

- [ ] Paso 2: Actualizar frontend en `src/pages/pie/pie_AlumnoDetalle.jsx`
  - [ ] Agregar nueva pestaña `Informes` manteniendo `Observaciones` y `Retiros` sin cambios
  - [ ] Agregar formulario (título, descripción, file) con validaciones
  - [ ] Implementar carga: upload -> signed URL -> createInformePie -> recargar listado
  - [ ] Implementar listado: mostrar Título, Descripción, Fecha, Archivo
  - [ ] Implementar botones: `Ver informe` (abrir en nueva pestaña con URL firmada), `Descargar` (download desde URL firmada)

- [ ] Paso 3: Verificar que errores de Supabase muestren `error.message` en la alerta existente del módulo PIE.

- [ ] Paso 4: Ejecutar `npm run build` o `npm run lint` para asegurar que no se rompa el proyecto.

