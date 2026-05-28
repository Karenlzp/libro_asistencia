# TODO

- [x] Revisar rutas React Router y ProtectedRoute en el repo.
- [x] Crear `vercel.json` con rewrite SPA para servir siempre `index.html`.
- [x] Ajustar redirect inicial de login para incluir rol `pie`.
- [x] Hacer `logout`/navegación estable (dejar sesión invalidada antes de navegar).
- [x] Corregir `ProtectedRoute` para roles incluyendo `pie`.
- [ ] Probar en Vercel: abrir directo `/admin`, `/profesor`, `/alumno`, `/pie/dashboard`.
- [ ] Probar logout: navegar a `/login` sin 404.
- [ ] Si persiste 404, validar configuración `buildCommand` y `outputDirectory` en Vercel.

