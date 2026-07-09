# 📋 RESUMEN EJECUTIVO — Sistema de Alertas

## 🎯 Hallazgo Principal

El sistema de alertas **FUNCIONA** pero tiene **INCONSISTENCIAS CRÍTICAS** que pueden causar problemas si se expande a producción.

---

## ⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. Vista SQL NO Documentada (CRÍTICO)
- La vista `v_alertas` existe en Supabase pero **NO está en el repositorio local**
- Cambios de reglas requieren acceso directo a Supabase (no queda en Git)
- **Impacto:** No se puede auditar cambios, difícil de replicar en otros ambientes
- **Solución:** Crear archivo `supabase/v_alertas.sql` con la definición

### 2. Umbrales Hardcodeados (CRÍTICO)
```
- Promedio < 4.0 → Alerta
- Asistencia < 85% → Alerta  
- 3+ anotaciones negativas → Alerta
```
- Estos valores están **DUROS en la BD**, no son configurables
- Cada institución podría necesitar valores distintos
- **Impacto:** Imposible adaptar el sistema a otras escuelas
- **Solución:** Crear tabla `alertas_umbrales` con valores configurables

### 3. Lógica Duplicada E Inconsistente (CRÍTICO)
```
Mismo alumno, DIFERENTES cálculos:

Admin ve:       promedio = ??? (de v_alertas directamente)
Profesor ve:    promedio = MÍNIMO (agrupación en frontend)
PIE ve:         promedio = PROMEDIO (transformación en función)
Alumno ve:      promedio = calculado local + FILTRO POR ASIGNATURA

RESULTADO: Números DIFERENTES para el mismo alumno 👎
```

- **Impacto:** Desconfianza en los datos, confusión del usuario
- **Solución:** Crear una función única reutilizable `consolidarAlertasAlumno()`

### 4. "Alerta de Conducta" Sin Definición Clara (CRÍTICO)
- Umbrales dice "3+ anotaciones negativas" pero ¿en qué período?
- ¿Solo cuenta tipo='negativa' o todas las que no sean 'positiva'?
- Alumno ve "Alerta de conducta" pero no entiende por qué
- **Impacto:** Comunicación confusa con estudiantes
- **Solución:** Documentar exactamente qué significa cada alerta

### 5. Sin Acción Sugerida (CRÍTICO)
```
Profesor ve alerta de promedio bajo
├─ ¿Contactar apoderado?
├─ ¿Hacer clase de apoyo?
├─ ¿Enviar a PIE?
└─ ??? NO HAY GUÍA

PIE ve alerta de conducta
├─ ¿Intervenir?
├─ ¿Evaluar?
├─ ¿Derivar a orientador?
└─ ??? NO HAY GUÍA
```

- **Impacto:** Cada usuario toma decisiones sin criterio unificado
- **Solución:** Crear tabla `alerta_sugerencias` con acciones por tipo

---

## 🔍 PROBLEMAS SECUNDARIOS (ALTOS)

| Problema | Efecto |
|----------|--------|
| **Sin historial de alertas** | No se sabe cuándo se activó/resolvió, no hay auditoría |
| **Información inconsistente entre roles** | Admin, Profesor y PIE ven campos diferentes |
| **Sin validación de datos nulos** | Puede mostrar "—" o valores extraños |
| **Asistencia sin contexto de retornos** | Alumno retirado pero que vuelve ve "baja asistencia" |
| **Sin exportación de alertas** | Imposible generar reportes automáticos |

---

## ✅ LO QUE FUNCIONA BIEN

- ✓ La vista se consulta correctamente desde los servicios
- ✓ Los datos relacionales están bien estructurados
- ✓ Los permisos por rol se respetan
- ✓ Los botones de navegación funcionan
- ✓ Colores diferenciados (Rojo = alerta, Verde = ok)
- ✓ Cálculos básicos (promedios, porcentajes) son correctos

---

## 🛠️ QUÉ HACER AHORA

### Fase 1: CRÍTICA (Antes de producción)

**1. Documentar v_alertas**
- Copiar definición de Supabase
- Crear archivo `supabase/v_alertas.sql`
- Agregar a Git
- **Tiempo:** ~1 hora

**2. Definir umbrales configurables**
- Crear tabla `alertas_umbrales`
- Documentar por qué cada valor fue elegido
- **Tiempo:** ~4 horas

**3. Crear función única de alertas**
- Consolidar lógica de Admin/Profesor/PIE
- Reutilizar en los 3 servicios
- **Tiempo:** ~3 horas

**4. Documentar qué significa cada alerta**
- Crear tabla `alerta_sugerencias`
- Indicar qué acción tomar
- Quién es responsable
- **Tiempo:** ~2 horas

### Fase 2: IMPORTANTE (Después de producción)

- [ ] Crear historial de alertas (auditoría)
- [ ] Agregar validaciones en UI
- [ ] Exportar alertas a Excel
- [ ] Dashboard específico por rol

---

## 📊 COMPARATIVA DE COMPORTAMIENTO

### Caso: Alumno con Promedio 3.8 (Sin "4.0")

```
┌─ Admin Dashboard ─────────────────────────────┐
│ Alumno: Juan Pérez                            │
│ Promedio: 3.8 ❌ ALERTA PROMEDIO              │
└──────────────────────────────────────────────┘

┌─ Profesor Dashboard ──────────────────────────┐
│ Alumno: Juan Pérez                            │
│ Promedio: 3.8 (Mínimo) ❌ ALERTA PROMEDIO     │
└──────────────────────────────────────────────┘

┌─ PIE Alumno Detalle ──────────────────────────┐
│ Alumno: Juan Pérez                            │
│ Promedio: 4.1 (Promedio) ✓ SIN ALERTA          │
└──────────────────────────────────────────────┘

┌─ Alumno ve ───────────────────────────────────┐
│ Promedio: 4.15 (Filtro "todas") ✓ SIN ALERTA  │
└──────────────────────────────────────────────┘

⚠️ PROBLEMA: CUATRO VISTAS DIFERENTES DEL MISMO ALUMNO
```

---

## 📈 MATRIZ DE SEVERIDAD

| Problema | Severidad | Esfuerzo | Debería Esperar | Notas |
|----------|-----------|----------|-----------------|-------|
| v_alertas no documentada | 🔴 CRÍTICO | 1h | NO | Bloquea reproducibilidad |
| Umbrales hardcodeados | 🔴 CRÍTICO | 4h | NO | Bloquea flexibilidad |
| Lógica duplicada | 🔴 CRÍTICO | 3h | NO | Causa inconsistencias |
| Conducta sin definición | 🔴 CRÍTICO | 2h | NO | Confunde usuarios |
| Sin acciones sugeridas | 🔴 CRÍTICO | 2h | NO | Desorienta acciones |
| Sin historial | 🟠 ALTO | 6h | SÍ | Auditoría futura |
| Sin validaciones | 🟡 MEDIO | 2h | SÍ | Mejora UX |
| Sin exportación | 🟡 MEDIO | 3h | SÍ | Funcionalidad extra |

---

## 🎓 CONCLUSIÓN

### Estado Actual
- **Funcionalidad:** 7/10 - Funciona básicamente
- **Confiabilidad:** 3/10 - Inconsistencias preocupantes  
- **Documentación:** 2/10 - Casi nada documentado
- **Escalabilidad:** 2/10 - Umbrales no son configurables
- **Auditoría:** 1/10 - Sin historial

### Recomendación
**No lanzar a producción sin resolver CRÍTICOS 1-5.**

Los cambios de Fase 1 son esenciales y toman menos de 12 horas total.

---

## 📍 DÓNDE VER DETALLES

Análisis completo: [ALERTING_SYSTEM_ANALYSIS.md](ALERTING_SYSTEM_ANALYSIS.md)

---

**Preparado por:** GitHub Copilot  
**Fecha:** 9 de julio de 2026
