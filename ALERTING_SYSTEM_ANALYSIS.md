# 🚨 ANÁLISIS DEL SISTEMA DE ALERTAS — Libro de Clases

**Fecha:** 9 de julio de 2026  
**Objetivo:** Auditoría completa del sistema de alertas sin cambios  
**Alcance:** Lógica, datos, UX, reglas de negocio

---

## ÍNDICE

1. [Estado Actual](#1-estado-actual)
2. [Cómo Funciona](#2-cómo-funciona)
3. [Problemas Encontrados](#3-problemas-encontrados)
4. [Soluciones Recomendadas](#4-soluciones-recomendadas)
5. [Elementos Correctos](#5-elementos-correctos)

---

## 1. ESTADO ACTUAL

### 1.1 Arquitectura de Alertas

El sistema de alertas está basado en una **vista SQL de Supabase llamada `v_alertas`** que:

- **Existe:** Definida en Supabase (en el SQL Editor)
- **NO está documentada:** No se encontró archivo `.sql` en el repositorio local
- **Es consultada por:** 3 servicios principales (Admin, Profesor, PIE)
- **Calcula:** 3 tipos de alertas (Académica, Asistencia, Conducta)

### 1.2 Campos de v_alertas

```
alumno_id           → UUID del alumno
alumno              → Nombre del alumno
curso               → Texto (ej: "3°A")
curso_id            → UUID del curso
promedio_general    → Número decimal (ej: 5.2)
porcentaje_asistencia → Número 0-100 (ej: 92)
anotaciones_negativas → Número entero (ej: 2)
alerta_promedio     → Boolean (true/false)
alerta_asistencia   → Boolean (true/false)
alerta_conducta     → Boolean (true/false)
```

### 1.3 Umbrales Actuales (Escritos en UI de Admin)

```
Promedio < 4.0          → alerta_promedio = TRUE
Asistencia < 85%        → alerta_asistencia = TRUE
3+ anotaciones negativas → alerta_conducta = TRUE
```

**Nota:** Los umbrales están DUROS (hardcodeados) en la vista SQL.

---

## 2. CÓMO FUNCIONA

### 2.1 Flujo en Admin Dashboard

```
1. Admin carga /admin
   ↓
2. adminService.getAlertas()
   ├─ SELECT * FROM v_alertas ORDER BY alumno
   └─ Devuelve: Lista plana de todas las alertas del sistema
   ↓
3. UI muestra tabla:
   ├─ Columnas: Alumno | Curso | Promedio | Asistencia | Anot.neg | Alertas
   ├─ Rows: 1 fila por alumno con alerta
   ├─ Colores dinámicos según getAlertValueClass()
   └─ Botón: "Ver hoja" → va a /hoja (historial completo)
```

**Lógica de colores (Admin):**
```javascript
getAlertValueClass(type, value):
  - promedio: value < 4 ? 'critical' : 'normal'
  - asistencia: value < 85 ? 'critical' : 'normal'
  - conducta: value >= 3 ? 'critical' : 'normal'  // ⚠️ FALTA CLARIDAD
```

**Problema:** El umbral de conducta "≥ 3" es ambiguo. ¿Significa:
- 3 anotaciones negativas?
- 3 puntos de severidad?
- Otra escala?

### 2.2 Flujo en Profesor Dashboard

```
1. Profesor selecciona curso
   ↓
2. profesorService.getAlertasPorCurso(cursoId)
   ├─ SELECT * FROM v_alertas WHERE curso_id = ?
   └─ Devuelve: Solo alertas del curso seleccionado
   ↓
3. Frontend hace AGRUPACIÓN COMPLEJA:
   ├─ Agrupa por alumno_id
   ├─ Deduplica: Un alumno puede tener múltiples filas (múltiples asignaturas)
   ├─ Lógica especial:
   │  ├─ alerta_promedio = ANY (OR)
   │  ├─ alerta_asistencia = ANY (OR)
   │  ├─ alerta_conducta = ANY (OR)
   │  ├─ promedio_general = MIN (más bajo)
   │  ├─ porcentaje_asistencia = MIN (más bajo)
   │  └─ anotaciones_negativas = MAX (más alto)
   └─ Resultado: 1 fila por alumno (deduplicada)
   ↓
4. UI muestra tabla con alertas agrupadas
   ├─ Mismo formato que Admin
   └─ Botón: "Ver alumno" → va a /profesor/alumno/:id
```

**Problema:** La lógica de agrupación es COMPLEJA y DUPLICADA en el frontend:
- `profesorDashboard.jsx` hace toda la deduplicación
- `pieService.js` hace otra transformación diferente
- No hay una función reutilizable

**Pregunta sin respuesta:** ¿Por qué v_alertas devuelve múltiples filas por alumno?
- ¿Una fila por asignatura?
- ¿Una fila por evaluación?
- ¿Una fila por período?

### 2.3 Flujo en PIE Alumno Detalle

```
1. PIE abre alumno (ej: /pie/alumno/123)
   ↓
2. pieService.getAlertasAlumnoPie(alumnoId)
   ├─ SELECT * FROM v_alertas WHERE alumno_id = ?
   │
   ├─ Transformación adicional:
   │  ├─ promedio_general = AVERAGE(rows.promedio_general)
   │  ├─ porcentaje_asistencia = AVERAGE(rows.porcentaje_asistencia)
   │  ├─ anotaciones_negativas = COUNT(anotaciones WHERE tipo != 'positiva')
   │  │                           (re-consulta tabla anotaciones)
   │  ├─ alerta_promedio = ANY(rows.alerta_promedio)
   │  ├─ alerta_asistencia = ANY(rows.alerta_asistencia)
   │  └─ alerta_conducta = ANY(rows.alerta_conducta)
   │
   └─ Devuelve: 1 objeto (NO array)
   ↓
3. UI muestra 3 cards:
   ├─ Riesgo académico: RED si alerta_promedio, GREEN si no
   ├─ Riesgo asistencia: RED si alerta_asistencia, GREEN si no
   └─ Riesgo conducta: RED si alerta_conducta, GREEN si no
```

**Problema:** PIE hace cálculos DIFERENTES a Profesor:
- Profesor: Toma MIN de promedio
- PIE: Toma AVERAGE de promedio
- ¿Cuál es correcto?

### 2.4 Cómo ve Alumno las Alertas

```
alumno_Dashboard.jsx:

const alertas = []
if (promedioFiltrado !== null && promedioFiltrado < 4.0)
  alertas.push("Tu promedio está bajo 4.0.")
if (pctAsistenciaFiltrada !== null && pctAsistenciaFiltrada < 85)
  alertas.push("Tu asistencia es 85%, está bajo el mínimo (85%).")
if (negativasFiltradas >= 3)
  alertas.push("Tienes 3 anotaciones negativas.")

// Muestra listado de textos
```

**Problema:** Alumno ve alertas CALCULADAS LOCALMENTE (no desde v_alertas):
- Diferentes lógica que Admin/Profesor/PIE
- FILTRO POR ASIGNATURA afecta los valores (Admin ve global)
- Sin badges visuales claras

---

## 3. PROBLEMAS ENCONTRADOS

### 3.1 CRÍTICOS

#### C1: Vista SQL NO documentada

| Aspecto | Estado |
|---------|--------|
| **Ubicación** | Supabase (no en repo local) |
| **Definición** | Desconocida (no encontrada) |
| **Versionado** | No (cambios solo en Supabase) |
| **Reproducibilidad** | Difícil (requiere acceso a Supabase) |

**Impacto:**
- Cambios de umbrales no quedan registrados en Git
- Imposible auditar quién/cuándo cambió las reglas
- Nuevo ambiente requiere reconstruir manualmente

**Recomendación:** Crear archivo `supabase/v_alertas.sql` con definición de vista

---

#### C2: Umbrales Hardcodeados

| Parámetro | Valor | Dónde |
|-----------|-------|-------|
| Promedio mínimo | 4.0 | ¿v_alertas SQL? |
| Asistencia mínima | 85% | ¿v_alertas SQL? |
| Anotaciones negativas | >= 3 | ¿v_alertas SQL? |

**Problema:** No se sabe exactamente dónde están definidos

**Impacto:**
- No se pueden cambiar sin ir a Supabase
- Cada institución podría tener umbrales distintos
- No se puede configurar por período o curso

**Recomendación:** Documentar EXACTAMENTE dónde están (SQL o constantes)

---

#### C3: Lógica Duplicada / Inconsistente

| Servicio | Lógica | Resultado |
|----------|--------|-----------|
| Admin | Lee de v_alertas | Sencillo |
| Profesor | Agrupa + Deduplica | Complejo |
| PIE | Transforma + Recalcula | Muy distinto |
| Alumno | Calcula local | Independiente |

**Problema:** Cada rol ve NÚMEROS DIFERENTES para el mismo alumno

**Ejemplo:**
```
Alumno: Juan Pérez en 3°A con:
- Aritmética: 3.8 (alerta: promedio < 4.0)
- Lenguaje: 4.5 (sin alerta)

Admin ve: promedio = 4.15 (agregado) → ¿Alerta?
Profesor ve: promedio = 3.8 (mínimo) → Alerta
PIE ve: promedio = 4.15 (promedio) → ¿Alerta?
Alumno ve: promedio = 4.15 (filtro "todas") → ¿Alerta?
```

**Impacto:** Inconsistencia de datos → Desconfianza en sistema

---

#### C4: "Alerta de Conducta" Sin Definición Clara

| Campo | Estado |
|-------|--------|
| `alerta_conducta` | Boolean en BD |
| Umbral | "3+ anotaciones negativas" |
| ¿Qué es "negativa"? | Ambiguo |
| ¿Período considerado? | Desconocido |

**Problema:** ¿Significa 3 anotaciones?
- En el mes actual?
- En el trimestre?
- En el año?
- De ANY tipo o solo 'negativa'?

**Impacto:** Alumno no entiende por qué tiene alerta de conducta

---

#### C5: Sin Acción Sugerida

| Alerta | Quién la ve | Qué debería hacer |
|--------|------------|------------------|
| Promedio bajo | Admin, Profesor, PIE, Alumno | ??? |
| Asistencia baja | Admin, Profesor, PIE, Alumno | ??? |
| Conducta mala | Admin, Profesor, PIE, Alumno | ??? |

**Problema:** No hay "siguientes pasos" claros

**Impacto:**
- Profesor ve alerta pero no sabe si contactar apoderado
- PIE ve alerta pero no sabe si intervenir
- Alumno ve alerta pero no sabe qué cambiar

---

### 3.2 ALTOS

#### A1: Sin Historial de Alertas

**Problema:**
- No se registra cuándo se ACTIVÓ alerta
- No se registra cuándo se RESOLVIÓ
- No se puede ver tendencia (¿mejora?)

**Impacto:**
- No hay forma de auditar efectividad
- No se sabe si intervención funcionó
- Alumno con histórico de mejora podría verse igual

---

#### A2: Información Falta en PIE

**Problema:** PIE ve campos adicionales vs Admin:
```
PIE adicionales:
- promedio_general (valor numérico)
- porcentaje_asistencia (valor numérico)
- anotaciones_negativas (valor numérico)

Admin/Profesor solo ven:
- alerta_promedio (boolean)
- alerta_asistencia (boolean)
- alerta_conducta (boolean)
```

**Impacto:** PIE tiene más contexto, pero ¿es consistente?

---

#### A3: Falta Validación de Datos

**Problema:**
- Si v_alertas devuelve NULL para promedio → UI muestra "—"
- Si anotaciones_negativas es -1 (error) → se muestra como "-1 anotaciones"
- Si curso_id es NULL → alumno aparece sin curso

**Impacto:** Datos inconsistentes o confusos en UI

---

### 3.3 MEDIOS

#### M1: Múltiples Tablas de Anotaciones

**Problema:** Sistema confunde tipos de "anotación":
- Tabla `anotaciones` → Conducta general
- Tabla `pie_observaciones` → Observaciones PIE
- Tabla `pie_retiros` → Retiros PIE

**¿Se cuentan todas en "alerta_conducta"?** No está claro.

---

#### M2: Sin Exportación de Alertas

**Problema:** Admin no puede exportar listado de alertas a Excel/PDF

**Impacto:** Dificultad para reportes mensuales/trimestrales

---

#### M3: Asistencia Sin Contexto de Retornos

**Problema:** % asistencia cuenta:
- Presente + Justificado ÷ Total
- ¿Pero qué pasa con "Retornado"?
- ¿Se cuenta como presente o ausente?

**Impacto:** Alumno retirado del aula ve baja asistencia aunque vuelva

---

---

## 4. SOLUCIONES RECOMENDADAS

### 4.1 CRÍTICAS (Implementar Primero)

#### S1: Documentar v_alertas

**Acción:**
1. Abrir Supabase → SQL Editor
2. Copiar definición de `v_alertas`
3. Crear archivo: `supabase/v_alertas.sql`
4. Agregar a Git

**Beneficio:** Reproducible, versionado, documentado

---

#### S2: Definir Umbrales Explícitos

**Crear tabla de configuración:**

```sql
CREATE TABLE alertas_umbrales (
  id UUID PRIMARY KEY,
  tipo TEXT UNIQUE, -- 'promedio', 'asistencia', 'conducta'
  valor_umbral NUMERIC,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

INSERT INTO alertas_umbrales VALUES
  (uuid_generate_v4(), 'promedio', 4.0, 'Promedio mínimo requerido', true, now(), now()),
  (uuid_generate_v4(), 'asistencia', 85, 'Porcentaje mínimo de asistencia', true, now(), now()),
  (uuid_generate_v4(), 'conducta', 3, 'Máximo de anotaciones negativas en 30 días', true, now(), now());
```

**Beneficio:** 
- Configurables sin cambiar BD
- Auditables (historial de cambios)
- Admin puede ajustar

---

#### S3: Crear Función Única de Cálculo

**Problema actual:** Lógica en 3 lugares distintos

**Solución:**
```javascript
// services/alertaService.js
export async function consolidarAlertasAlumno(alumnoId) {
  // Lógica ÚNICA y reutilizable
  // Usada por: Profesor, PIE, Admin
}
```

**Beneficio:** Una fuente de verdad

---

#### S4: Definir Acciones Sugeridas

**Crear tabla:**
```
alerta_sugerencias (
  alerta_tipo: 'promedio' | 'asistencia' | 'conducta',
  accion_sugerida: TEXT,
  responsable: TEXT, -- 'profesor' | 'pie' | 'apoderado'
  urgencia: 'leve' | 'media' | 'alta'
)
```

**Ejemplo:**
| Alerta | Acción | Responsable | Urgencia |
|--------|--------|-------------|----------|
| Promedio bajo | Reunión con profesor | Profesor | Alta |
| Asistencia baja | Contactar apoderado | Profesor | Alta |
| Conducta negativa | Entrevista + Plan | PIE | Alta |

**Beneficio:** Todos saben qué hacer

---

### 4.2 ALTOS (Implementar Después)

#### S5: Crear Historial de Alertas

**Nueva tabla:**
```
alertas_historial (
  id UUID PRIMARY KEY,
  alumno_id UUID,
  tipo_alerta TEXT,
  estado: 'activada' | 'resolvida' | 'archivada',
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  notas TEXT,
  resuelto_por UUID,
  accion_tomada TEXT
)
```

**Beneficio:** Auditoría completa

---

#### S6: Agregar Validaciones

**Cambios en UI:**
```javascript
// Si promedio === null: mostrar "Sin calificaciones"
// Si asistencia === null: mostrar "Sin registro"
// Si anotaciones === null: mostrar "Sin registro"
```

**Beneficio:** UI más clara

---

### 4.3 MEDIOS (Mejorar UX)

#### S7: Añadir Contexto Visual

Mostrar en cada alerta:
- 📊 Gráfico de tendencia (últimos 30 días)
- 📝 Últimas notas del alumno
- 👥 Alertas relacionadas (si existe plan PIE)

---

#### S8: Crear Dashboard de Alertas Específico

**Para cada rol:**
- Admin: Todas las alertas, filtros por curso/tipo/fecha
- Profesor: Alertas de sus cursos, con acciones sugeridas
- PIE: Alertas de alumnos PIE, plan de intervención
- Alumno: Mis alertas, recursos de ayuda

---

---

## 5. ELEMENTOS CORRECTOS

### ✅ Lo que funciona bien

1. **Estructura de permisos:** Solo roles correctos ven sus alertas ✓

2. **Actualización en tiempo real:** Si cambian datos → alertas se recalculan ✓

3. **Relaciones de datos correctas:**
   - Alumno → Curso ✓
   - Asignatura → Profesor ✓
   - Alumno → Anotaciones ✓

4. **Botones de navegación:** "Ver hoja" / "Ver alumno" funcionan ✓

5. **Colores diferenciados:** Rojo = riesgo, Verde = ok ✓

6. **Cálculo de promedios:** Suma correcta (aunque ponderación falta) ✓

7. **Filtrado por curso:** Profesor ve solo su curso ✓

8. **Sistema de notificaciones:** Profesor recibe alertas (limitado pero funciona) ✓

---

## 6. RESUMEN EJECUTIVO

### Estado Actual

| Aspecto | Calificación | Justificación |
|---------|--------------|---------------|
| **Funcionamiento básico** | 7/10 | Funciona pero con inconsistencias |
| **Documentación** | 2/10 | v_alertas no documentada |
| **Consistencia de datos** | 4/10 | Múltiples lógicas para mismo cálculo |
| **UX / Claridad** | 5/10 | No hay acciones sugeridas |
| **Auditoría / Historial** | 1/10 | No hay registro de cambios |

### Prioridad de Fixes

| # | Fix | Prioridad | Esfuerzo | Impacto |
|---|-----|-----------|----------|---------|
| 1 | Documentar v_alertas | CRÍTICO | 1h | Alto |
| 2 | Definir umbrales configurables | CRÍTICO | 4h | Alto |
| 3 | Crear función única de cálculo | ALTO | 3h | Alto |
| 4 | Definir acciones sugeridas | ALTO | 2h | Medio |
| 5 | Crear historial de alertas | ALTO | 6h | Medio |
| 6 | Añadir validaciones en UI | MEDIO | 2h | Bajo |
| 7 | Dashboard específico por rol | MEDIO | 8h | Medio |

### Conclusión

El sistema de alertas **funciona** pero carece de:
- 📋 **Documentación** clara
- ⚙️ **Configurabilidad** de umbrales
- 🎯 **Consistencia** entre vistas
- ✅ **Acciones claras** para cada alerta
- 📊 **Historial** de cambios

**Recomendación:** Implementar S1-S4 (Críticos) antes de usar en producción.

---

**Fin del análisis**  
*Generado: 9 de julio de 2026*
