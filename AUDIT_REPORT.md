# 🔍 AUDITORÍA COMPLETA DEL SISTEMA — LIBRO DE CLASES

**Fecha de Auditoría:** 9 de julio de 2026  
**Objetivo:** Revisar coherencia visual, funcional y de experiencia de usuario en toda la plataforma  
**Alcance:** Frontend, componentes, páginas, servicios, navegación y flujos de usuario  

---

## 📋 RESUMEN EJECUTIVO

La plataforma **Libro de Clases** es un sistema educativo bien estructurado con 4 roles principales (Admin, Profesor, Alumno, PIE) y una arquitectura clara basada en React + Vite + Supabase. Sin embargo, existen **inconsistencias importantes** en la coherencia de datos, experiencia visual y flujos de usuario que afectan la usabilidad y profesionalismo del sistema.

**Hallazgos críticos:**
- ⚠️ **Inconsistencia de datos** entre módulos (asistencia, notas, asignaciones)
- ⚠️ **Fragmentación visual** en el diseño de componentes (tablas, tarjetas, formularios)
- ⚠️ **Navegación confusa** entre módulos relacionados (alumno → profesor → PIE)
- ⚠️ **Falta de contexto** en varias pantallas importantes
- ⚠️ **Información duplicada o incompleta** en diferentes vistas

---

## 1️⃣ COHERENCIA ENTRE MÓDULOS

### 1.1 Problema: Asistencia con Contexto Inconsistente

**Ubicación:** Múltiples módulos (Profesor Dashboard, Alumno Dashboard, PIE)

**Descripción del problema:**
```
PROFESOR ve:
- Registro de asistencia por FECHA y ASIGNATURA
- Estados: Presente, Ausente, Justificado, Retornado
- Información: Alumno, curso, asignatura

ALUMNO ve:
- Asistencia filtrada por ASIGNATURA
- Porcentaje global y por asignatura
- Solo estados: Presente, Ausente, Justificado (sin "Retornado")

PIE ve:
- Asistencia con TIPO DE INTERVENCIÓN
- Información: Fecha, estado, asignatura
- Desagregación adicional por tipo de retiro

INCONSISTENCIA:
- Profesor ve "Retornado" pero Alumno NO
- Alumno ve "Porcentaje de asistencia" pero Profesor NO
- PIE tiene contexto de "retiros" que otros módulos no tienen
```

**Impacto:** Usuario confundido sobre qué datos son relevantes en cada vista.

**Severidad:** ALTO

---

### 1.2 Problema: Notas y Evaluaciones con Jerarquía Confusa

**Ubicación:** Profesor (Nueva Evaluación), Alumno Dashboard, Admin Hoja de Vida

**Descripción del problema:**
```
PROFESOR:
- Crea evaluación seleccionando: Curso → Asignatura → Nombre
- Porcentaje: Campo obligatorio (defecto 20%)
- Fecha: Campo obligatorio (defecto hoy)

ALUMNO:
- Ve notas AGRUPADAS POR ASIGNATURA
- Filtra por asignatura con selector "todas/específica"
- Promedio se recalcula según el filtro

ADMIN (Hoja de vida):
- Ve notas de múltiples asignaturas y evaluaciones
- SIN opción de filtrar o agrupar
- Muestra "nombre" de evaluación + asignatura + nota

INCONSISTENCIA:
- Profesor no ve un listado consolidado de evaluaciones por asignatura
- Alumno ve datos agrupados pero Profesor ve "Nueva evaluación" sin ver el listado posterior
- Admin ve todo plano sin jerarquía
- NO hay forma de saber si una evaluación está "cerrada" o abierta
- NO hay datos de: cuántos alumnos respondieron, calificación mínima/máxima
```

**Impacto:** Profesor no puede auditar sus evaluaciones; Alumno desconoce la estructura de calificación; Admin ve datos crudos.

**Severidad:** CRÍTICO

---

### 1.3 Problema: Anotaciones (Conducta) con Definiciones Vagas

**Ubicación:** Profesor (dentro del Dashboard), Alumno Dashboard, Admin, PIE

**Descripción del problema:**
```
Se menciona "Anotaciones Negativas" pero:
- NO hay definición clara de qué es "negativa"
- NO hay clasificación de severidad (leve, media, grave)
- NO hay categorización (disciplina, tarea, comportamiento)
- Alumno ve SOLO número ("Tienes 3 anotaciones negativas")
- NO ve el CONTENIDO o DESCRIPCIÓN

COMPARACIÓN PIE:
- PIE tiene "observaciones" con "tipo_intervencion" (ej: "Observación general")
- PIE tiene "retiros" que es una acción formal
- Otros roles no distinguen entre estos conceptos

INCONSISTENCIA:
- Rol Alumno: Anotaciones = NÚMERO (feedback vago)
- Rol Profesor: Anotaciones = Descripción + Fecha
- Rol PIE: Observaciones ≠ Anotaciones (conceptos separados)
- NO hay coherencia en QUÉ ES UNA ANOTACIÓN a nivel sistémico
```

**Impacto:** Alumno no entiende qué anotaciones tiene; Profesor confunde conducta con PIE.

**Severidad:** ALTO

---

### 1.4 Problema: Alertas (Alerting System) sin Definición Consistente

**Ubicación:** Admin Dashboard, Profesor Dashboard, PIE Dashboard

**Descripción del problema:**
```
ADMIN ve:
- Tabla de ALERTAS que incluye:
  - Alumno, Promedio, Asistencia, Conducta
  - Campos: "alerta_promedio", "alerta_asistencia", "alerta_conducta"
  - Indicadores: promedio < 4.0, asistencia < 85%, conducta >= 3

PROFESOR ve:
- Tabla de "Alertas en este curso"
- Agrupa por alumno (deduplicación compleja)
- Calcula: porcentaje_asistencia, promedio_general, anotaciones_negativas
- Muestra: alerta_promedio, alerta_asistencia, alerta_conducta (valores booleanos)

ALUMNO ve:
- Listado de "Alertas" en pestaña (si aplica)
- Mensajes textuales como: "Tu promedio está bajo 4.0"
- Basado en filtro por asignatura (FILTRO QUE NO AFECTA ADMIN NI PROFESOR)

PIE no tiene sección de alertas (esto es un problema)

INCONSISTENCIA:
- Definición de umbral es inconsistente (¿conducta >= 3 qué significa?)
- Alumno ve ALERTAS FILTRADAS por asignatura, pero Admin/Profesor ven GLOBALES
- NO hay explicación QUÉ ACCIÓN TOMAR ante una alerta
- NO hay vinculación entre alertas y PIE (¿quién debe intervenir?)
- PIE debería ver alertas pero NO LAS VE
```

**Impacto:** Sistema de alertas no es confiable; no guía acciones correctivas.

**Severidad:** CRÍTICO

---

### 1.5 Problema: Retiros (Clase vs PIE) con Terminología Confusa

**Ubicación:** Servicios Alumno, Profesor, PIE

**Descripción del problema:**
```
Existen DOS sistemas de retiros:

1) RETIROS_CLASE (Regular):
   - Registrados por Profesor
   - Tabla: retiros_clase
   - Campos: tipo, motivo, fecha, profesor_id, alumno_id

2) PIE_RETIROS (PIE):
   - Registrados por PIE
   - Tabla: pie_retiros
   - Campos: tipo, motivo, estado, fecha_retorno, hora_retorno

ALUMNO ve:
- "Retiros" en dashboard (retiros_clase)
- Sin indicar si es clase o PIE
- Datos incompletos (solo tipo, motivo, profesor, fecha)

PROFESOR ve:
- EN LA FICHA INTEGRAL: pie_retiros (retiros PIE del alumno)
- NO VE: retiros_clase que él mismo registró

ADMIN ve:
- Ambos tipos en "Hoja de vida" del alumno
- Marcados como "Regular" vs "PIE" (tiene fuente identificada) ✓
- Pero estructura diferente para cada tipo (confuso)

INCONSISTENCIA:
- Alumno no sabe QUIÉN registró su retiro o POR QUÉ
- Profesor ve retiros PIE en ficha pero no sus propios retiros
- Retiro PIE puede tener "estado" y "fecha_retorno" pero regular NO
- NO hay forma de vincular retiro regular con retiro PIE
```

**Impacto:** Confusión sobre quién es responsable de qué retiro.

**Severidad:** ALTO

---

## 2️⃣ EXPERIENCIA VISUAL (UI/UX)

### 2.1 Problema: Inconsistencia de Componentes Visuales

**Ubicación:** Todas las páginas

**Descripción del problema:**

#### Tabla de comparación de componentes:

| Componente | Admin | Profesor | Alumno | PIE |
|-----------|-------|----------|--------|-----|
| **Card Header** | ✓ Título + Subtítulo | ✓ Misma | ✓ Similar | ✓ Similar |
| **Botones de acción** | Primary, Ghost | Primary, Ghost | Primary (limitados) | Primary, Ghost |
| **Tablas** | Bordes, colores uniformes | Algunas tablas, algunas cards | Pocos datos en tabla | Tablas + Cards |
| **Estado Badges** | "Activo/Inactivo" (verde/rojo) | "Positiva/Negativa" (colores) | Implícito en texto | "PIE activo/inactivo" |
| **Alertas/Notificaciones** | Banner colorido | Alert (mismo estilo) | Alert tipo toast | Alert tipo banner |
| **Formularios** | Input estilo uniforme | Input con validación simple | Input básicos | Input + Select complejos |
| **Distribución espacial** | Grid-2/4 para stats | Cards individuales | Card principal + tabs | Grid-4 para stats + table |
| **Colores de estado** | Rojo (peligro), Verde (ok) | Rojo, Ámbar, Verde | Azul marino + peligro | Verde/Rojo |

**Inconsistencias específicas:**

1. **Badges (Estado):**
   - Admin: `badge positiva/negativa` (Activo/Inactivo)
   - Alumno: TEXTO (no usa badges)
   - PIE: `badge positiva/negativa/default`
   - PROBLEMA: Sin iconografía consistente

2. **Tablas:**
   - Admin: Columnas con ancho variable
   - Profesor: Algunos datos en tablas, otros en cards
   - Alumno: Datos en tarjetas no tabulares
   - PROBLEMA: Dificultad comparar información

3. **Formularios:**
   - Profesor: Campos requeridos sin indicador visual `*`
   - Admin: Validación inline silenciosa
   - Alumno: Solo lectura (sin formularios)
   - PROBLEMA: UX confusa en validación

4. **Espaciado:**
   - Admin Dashboard: Gap 24px entre tarjetas
   - Profesor: Gap variable (12px a 24px)
   - Alumno: Gap inconsistente
   - PROBLEMA: Falta de ritmo visual

5. **Iconografía:**
   - SVG personalizados en cada componente
   - PROBLEMA: Sin sistema de iconos consistente
   - Algunos iconos son redundantes (Lápiz = Editar/Escribir)

**Impacto:** Plataforma se siente fragmentada; usuarios confundidos por inconsistencias visuales.

**Severidad:** MEDIO

---

### 2.2 Problema: Información Desorganizada en Vistas Grandes

**Ubicación:** Admin Dashboard, Profesor Dashboard, PIE Alumno Detalle

**Descripción del problema:**

```
ADMIN DASHBOARD:
- 4 stat-cards en grid-4 (importante pero abajo en la página)
- Tabs: Alertas (default), Usuarios, Cursos, Asignaturas, Asignaciones, etc.
- PROBLEMAS:
  ❌ Demasiadas tabs (8+)
  ❌ No hay indicador visual de cuál es la más importante
  ❌ Scroll necesario en casi todos los tabs
  ❌ Información de "Hoja de vida" requiere búsqueda dentro de tab

PROFESOR DASHBOARD:
- Tabs: Notas, Asistencia, Anotaciones, Alertas, etc.
- Dentro de "Notas": Sub-selector de Curso → Asignatura
- PROBLEMAS:
  ❌ Estructura multinivel sin breadcrumbs
  ❌ Al cambiar curso, se resetean datos visuales
  ❌ Tabla de "Alertas" agrupa/deduplica datos (lógica oculta)
  ❌ Botón "Ver alumno" no es evidente
  ❌ Campos de búsqueda + filtros esparcidos sin agrupación visual

PIE ALUMNO DETALLE:
- Tabs: Observaciones, Retiros, Informes, Asistencia, Notas, Alertas
- Header: Nombre, Curso, Estado PIE, Badge de estado
- PROBLEMAS:
  ❌ Demasiadas tabs (6+)
  ❌ Botón de "Crear observación" y "Crear retiro" en header (no agrupados)
  ❌ Formularios inline en modales (sin confirmación clara)
  ❌ Información de "Resumen PIE" no está en primer plano
```

**Impacto:** Usuarios no saben por dónde empezar; exceso de opciones paraliza.

**Severidad:** ALTO

---

### 2.3 Problema: Estado de Carga Inconsistente

**Ubicación:** Todas las páginas

**Descripción del problema:**

```
DURANTE CARGA:
- Admin: Muestra spinner + "Cargando..."
- Profesor: Spinner + "Cargando panel..."
- Alumno: Spinner + "Cargando tu información..."
- PIE: Spinner + "Cargando módulo PIE..."
- Login: Spinner + "Cargando..." (sin contexto)

PROBLEMAS:
❌ No hay indicación de CUÁL es el progreso
❌ Spinner global sin barras de progreso
❌ No se sabe si hay ERRORES de carga (ambigüedad)
❌ SIN timeouts visuales (¿se colgó?)
```

**Impacto:** Experiencia frustrante si hay lentitud de conexión.

**Severidad:** BAJO

---

### 2.4 Problema: Responsiveness y Dispositivos Móviles

**Ubicación:** Todas las páginas

**Descripción del problema:**

```
Diseño parecería ser DESKTOP FIRST:
- Sidebar fijo de 248px ocupa mucho espacio en mobile
- Tablas sin scroll horizontal explícito
- Campos de formularios sin ajuste a pantalla pequeña
- Grid-4 colapsa a columna única (sin breakpoints visuales)

PROBLEMAS:
❌ NO hay indicador de que la app es responsive
❌ Navegación móvil NO implementada (hamburger menu)
❌ Sidebar inutilizable en phone
❌ Tablas con datos se cortan en mobile
```

**Impacto:** Inutilizable en celulares.

**Severidad:** MEDIO

---

## 3️⃣ LÓGICA DEL SISTEMA

### 3.1 Problema: Flujos de Permisos Confusos

**Ubicación:** ProtectedRoute.jsx, App.jsx

**Descripción del problema:**

```
ROLES Y ACCESOS:
- Admin: Acceso a /admin y /admin/profesores
- Profesor: Acceso a /profesor, /profesor/horario, /profesor/nueva-evaluacion, /profesor/alumno/:id
- Alumno: Acceso a /alumno
- PIE: Acceso a /pie/dashboard y /pie/alumno/:id

PROBLEMAS LÓGICOS:

1. PROFESOR VE DATOS DE ALUMNO EN:
   - /profesor/alumno/:id (Ficha Integral)
   - ¿Qué alumno? Solo aquellos en sus cursos → ¿SE VALIDA ESTO?
   - RIESGO: Profesor podría acceder a /profesor/alumno/999 (alumno de otro curso)

2. PROFESOR NO VE:
   - Horario de otros profesores (✓ correcto)
   - Evaluaciones de otros profesores (✓ correcto)
   - Pero VE alertas de todos los alumnos de SUS cursos (✓ correcto)

3. ALUMNO NO VE:
   - Información de otros alumnos (✓ correcto)
   - Asistencia detallada (solo % y filtro por asignatura)
   - Pero VE: Notas, Asistencia, Anotaciones, Retiros, Observaciones (✓ correcto)

4. PIE VE:
   - Solo alumnos con pie=true
   - Información detallada (observaciones, retiros, informes)
   - ¿PUEDE VER INFORMACIÓN DEL PROFESOR ASIGNADO?
   - ¿PUEDE CREAR EVALUACIONES PARA ALUMNO PIE?
   - FALTA CLARIDAD EN PERMISOS DE PIE

5. ADMIN VE:
   - TODO (correcto para rol admin)
   - Pero interface es abrumadora (ves 8 opciones, no sabes cuál usar)
```

**Impacto:** Riesgos de seguridad; confusión sobre qué datos debería ver cada rol.

**Severidad:** CRÍTICO (si hay brechas de seguridad)

---

### 3.2 Problema: Datos Calculados Inconsistentemente

**Ubicación:** Múltiples servicios

**Descripción del problema:**

```
CÁLCULO: Promedio de notas

PROFESOR:
- Función: calcPromedio(notas) → suma / cantidad
- NO considera: Ponderación de evaluaciones (porcentaje)
- RESULTADO: Promedio simple (INCORRECTO para sistema con ponderación)

ALUMNO:
- Mismo cálculo: Promedio simple
- Filtrado por asignatura (luego recalcula)
- RESULTADO: Inconsistente con Profesor (ambos deberían ser iguales)

ADMIN:
- NO CALCULA promedio, solo muestra notas
- Muestra "Promedio" en tabla pero ¿ES CALCULADO O DE BD?

PROBLEMA:
❌ ¿Promedio es SIMPLE o PONDERADO?
❌ Profesor ve un promedio, Admin ve otro
❌ Alumno no confía en el número que ve
```

**Cálculo: Asistencia**

```
PROFESOR:
- Lista asistencias por fecha (sin agregar por asignatura)
- Calcula: % = (presente + justificado) / total

ALUMNO:
- Agrupa por asignatura
- Calcula: % = (presente + justificado) / total (por asignatura)
- GLOBAL: suma todas / suma total (CORRECTO)

PIE:
- Ve asistencia con "tipo_intervencion"
- ¿CUENTA RETORNOS?
- PROBLEMA: Retorno PIE vs Retorno Clase ¿son iguales?

PROBLEMA:
❌ ¿Un retorno cuenta como "presente" o "ausencia parcial"?
❌ Profesor y Alumno deberían ver el mismo %
❌ PIE ve datos adicionales que otros roles no entienden
```

**Impacto:** Datos no confiables; decisiones basadas en números equívocos.

**Severidad:** CRÍTICO

---

### 3.3 Problema: Flujo de Creación de Evaluación Incompleto

**Ubicación:** ProfesorNuevaEvaluacion.jsx

**Descripción del problema:**

```
FLUJO ACTUAL:
1. Profesor selecciona Curso
2. Profesor selecciona Asignatura (asociada al curso)
3. Profesor ingresa: Nombre, Porcentaje, Fecha
4. Profesor presiona "Crear evaluación"
5. ✓ Evaluación creada

PROBLEMAS:

1. ¿QUÉ PASA DESPUÉS?
   - Página resetea formulario
   - NO muestra: "Evaluación creada" (solo notificación temporal)
   - NO redirige a lista de evaluaciones
   - Usuario debe ASUMIR que se creó

2. VALIDACIONES FALTANTES:
   - ¿Puede haber dos evaluaciones con el mismo nombre?
   - ¿Qué pasa si la suma de porcentajes > 100%?
   - ¿Se puede crear evaluación para fecha pasada?
   - ¿Se valida que el profesor esté asignado al curso?

3. DESPUÉS DE CREAR:
   - Profesor NO ve el listado de evaluaciones creadas
   - NO ve cuántos alumnos respondieron
   - NO sabe si debe ingresar notas manualmente
   - Ficha integral del alumno BUSCA evaluaciones pero no las encuentra (¿indexing issue?)

4. CARENCIA DE DATOS:
   - NO hay: "Evaluación abierta/cerrada"
   - NO hay: "Descripción de evaluación" (ej: objetivos, contenidos)
   - NO hay: "Rúbrica" o "Criterios de calificación"
```

**Impacto:** Profesor no confía en el proceso; datos inconsistentes.

**Severidad:** ALTO

---

### 3.4 Problema: Ausencia de Flujo Claro para PIE

**Ubicación:** PIE Dashboard, PIE Alumno Detalle

**Descripción del problema:**

```
¿CUÁL ES EL FLUJO PIE?

1. PIE ve alumnos con pie=true (✓ claro)
2. PIE abre alumno → ve:
   - Observaciones (crear nueva) ✓
   - Retiros (crear nuevo) ✓
   - Informes (upload nuevo) ✓
   - Asistencia histórica (solo lectura)
   - Notas (solo lectura)
   - Alertas (solo lectura)

PROBLEMAS:

❌ ¿CUÁL ES EL PROPÓSITO DE CADA SECCIÓN?
   - Observaciones: Registro de intervenciones
   - Retiros: ¿Sacarle el alumno de clase?
   - Informes: ¿Evaluación del progreso PIE?
   
❌ FALTA WORKFLOW:
   - No hay "plan de intervención"
   - No hay "seguimiento de objetivos"
   - No hay "evaluación de efectividad"
   - Solo se registra información reactivamente

❌ INTEGRACIÓN CON PROFESOR:
   - Profesor VE observaciones PIE en ficha del alumno
   - Profesor NO PUEDE COMENTAR O RESPONDER
   - PIE NO VE EVALUACIONES del profesor
   - ¿Cómo coordinan?

❌ FALTA CONTEXTO:
   - ¿Cuándo se inició el PIE?
   - ¿Cuál es el objetivo del alumno?
   - ¿Quién es responsable principal?
   - ¿Cuándo se revisa el progreso?
```

**Impacto:** PIE es un módulo aislado; no integrado con flujo general.

**Severidad:** CRÍTICO

---

## 4️⃣ CONSISTENCIA DE DATOS

### 4.1 Problema: Desincronización entre Vistas de Mismo Alumno

**Ubicación:** Múltiples servicios

**Descripción del problema:**

```
MISMO ALUMNO, MÚLTIPLES VISTAS:

PROFESOR vu:
- Nombre: Juan Pérez
- Curso: 3°A
- Promedio: 5.2 (en aritmética)
- Asistencia: 92% (en aritmética)
- Anotaciones: 1 negativa

ALUMNO Ve (misma data):
- Nombre: Juan Pérez
- Curso: 3°A
- Promedio: 5.1 (filtro "todas")
- Asistencia: 91% (filtro "todas")
- Anotaciones: 1 negativa

DIFERENCIA: ¿Por qué promedio es 5.2 vs 5.1?
- Profesor: Calcula SOLO aritmética
- Alumno: Calcula TODAS las asignaturas
- ¿CUÁL ES LA VERDAD?

ADMIN Ve (mismo alumno):
- Nombre: Juan Pérez
- Curso: 3°A
- Promedio: 5.15 (en tabla general)
- Asistencia: 90.5% (en tabla general)
- Anotaciones: 1 + 2 = 3 (¿por qué suma cambió?)
```

**Impacto:** Desconfianza en datos; auditoría imposible.

**Severidad:** CRÍTICO

---

### 4.2 Problema: Campos Faltantes en Algunos Contextos

**Ubicación:** Múltiples servicios

**Descripción del problema:**

```
TABLA: usuarios
CAMPOS ESPERADOS: id, nombre, email, rol, activo, created_at, curso_id

ADMIN Ve:
- Listado de usuarios con TODOS los campos
- ✓ Email mostrado
- ✓ Rol mostrado

PROFESOR Ve:
- Listado de alumnos SIN email
- Campos: nombre, curso, asistencia, promedio
- ¿Email del alumno no es relevante?

ALUMNO Ve:
- Datos de SÍ MISMO
- ✓ Nombre, curso, promedio global
- NO ve: Email (propio o de otros)

ADMIN PROFESORES Ve:
- Lista profesores CON email
- Botón para desactivar/reactivar
- ¿Puede cambiar email?

PROBLEMA:
❌ Email inconsistentemente mostrado
❌ ¿Quién PUEDE VER email de otros?
❌ NO hay "perfil de usuario" consistente
❌ Formato de nombre: ¿"Juan Pérez" vs "J. Pérez"?
```

**Impacto:** UI inconsistente; datos potencialmente privados expuestos.

**Severidad:** MEDIO

---

### 4.3 Problema: Timestamps Confusos

**Ubicación:** Múltiples servicios

**Descripción del problema:**

```
¿CUÁNDO SE REGISTRÓ ALGO?

Tabla: anotaciones
- Tiene campo "fecha" (tipo date)
- ¿Hora exacta o solo fecha?

Tabla: pie_observaciones
- Tiene campo "created_at" (tipo timestamp)
- Más preciso que anotaciones

Tabla: asistencia
- Campo "fecha" (solo fecha, sin hora)
- ¿Si falta a clase a las 10am y a las 2pm?

PROBLEMA:
❌ Inconsistencia de precisión temporal
❌ NO se sabe exactamente CUÁNDO ocurrió algo
❌ Admin Dashboard calcula "cambios auditados" pero sin timestamps claros
❌ Reportes no pueden desglosar por hora
```

**Impacto:** Auditoría incompleta; análisis temporal imposible.

**Severidad:** MEDIO

---

### 4.4 Problema: Relaciones Clave Mal Documentadas

**Ubicación:** Servicios

**Descripción del problema:**

```
RELACIÓN: Profesor ↔ Asignatura ↔ Curso

TABLA: profesor_asignatura
- Campos: profesor_id, asignatura_id, curso_id

PREGUNTA: ¿Un profesor enseña la MISMA asignatura en MÚLTIPLES cursos?
- Respuesta esperada: SÍ (ej: Aritmética en 3°A y 3°B)
- Base de datos: ✓ Soporta esto

PERO: ProfesorNuevaEvaluacion:
- Selecciona Curso → Asignatura
- ASUME: Una asignatura por curso
- ¿QUÉ SI hay 2 asignaturas en 1 curso? (ej: "Inglés Conversación" + "Inglés Gramática")

RELACIÓN: Alumno ↔ Curso ↔ Asignatura

TABLA: usuarios
- Campo: curso_id (UN solo curso por alumno)
- Asignatura: NO EXISTE campo (relación implícita por curso)

PROBLEMA:
❌ ¿Un alumno puede estar en MÚLTIPLES cursos?
❌ ¿Un alumno puede hacer SOLO algunas asignaturas?
❌ Base de datos NO soporta estos casos

IMPACTO: Sistema limitado a 1 curso, todas las asignaturas
```

**Impacto:** Limitaciones funcionales no documentadas.

**Severidad:** MEDIO

---

## 5️⃣ NAVEGACIÓN Y FLUJO DEL USUARIO

### 5.1 Problema: Navegación Lateral sin Contexto

**Ubicación:** DashboardLayout.jsx

**Descripción del problema:**

```
SIDEBAR ACTUAL:

ADMIN:
- Inicio (/admin)
- Profesores (/admin/profesores)

PROFESOR:
- Inicio (/profesor)
- Horario (/profesor/horario)
- Nueva evaluación (/profesor/nueva-evaluacion)

ALUMNO:
- Inicio (/alumno)

PIE:
- PIE (/pie/dashboard)

PROBLEMAS:

1. FALTA CONTEXTO:
   ❌ No se indica "Dónde estoy" (breadcrumb)
   ❌ No hay indicador de sección activa (highlight)
   ❌ No hay "volver" obvio en vistas anidadas

2. RUTAS ANIDADAS SIN NAVEGACIÓN:
   ❌ /profesor/alumno/:id (Ficha Integral)
   - NO aparece en sidebar
   - Acceso SOLO por click desde tabla
   - SIN botón "volver" evidente
   
   ❌ /pie/alumno/:id (PIE Detalle)
   - NO aparece en sidebar
   - Acceso SOLO por click desde tabla
   - SIN botón "volver" evidente

3. FLUJO INCOMPLETO:
   Profesor → Dashboard → Tabla de Alertas → Click alumno → Ficha Integral
   Pero: SI QUIERO VOLVER A ALERTAS → ¿Cuál era el filtro?

4. FALTA INFORMACIÓN:
   ❌ ¿Cuántas notificaciones no leídas tengo?
   ❌ ¿Cuál es mi rol actual?
   ❌ ¿Cuándo fue mi último login?
   ❌ ¿Hay alertas críticas que requieran atención?
```

**Impacto:** Usuarios se pierden fácilmente; experiencia confusa.

**Severidad:** ALTO

---

### 5.2 Problema: Transitions y Estados Sin Feedback

**Ubicación:** Todas las páginas

**Descripción del problema:**

```
CUANDO HAGO CLICK EN "CREAR":

1. Profesor crea evaluación
   - Click en "Crear evaluación"
   - Button no tiene estado "loading" visual
   - ¿Se creó o no? Espera 0.3s y notificación toast
   - Toast desaparece en 4s
   - SI el usuario no mira: ¿Cómo sabe?

2. Admin desactiva profesor
   - Click en "Desactivar"
   - Modal de confirmación (NO SIEMPRE)
   - Tabla se actualiza
   - ¿Se vio la actualización? Hay un "refresh" invisible

3. PIE crea observación
   - Click en "Crear observación"
   - Formulario inline
   - Click "Guardar"
   - Espera respuesta del servidor
   - ¿Status "saving"? NO.
   - Observación aparece/desaparece de tabla

PROBLEMAS:
❌ NO hay estado visual "saving", "loading", "success"
❌ NO hay confirmación de destrucción irreversible
❌ NO hay "undo" en acciones importantes
❌ Notificaciones toast son muy breves
```

**Impacto:** Usuario no confía en acciones; posibles errores silenciosos.

**Severidad:** ALTO

---

### 5.3 Problema: Búsqueda y Filtros Fragmentados

**Ubicación:** Múltiples componentes

**Descripción del problema:**

```
BÚSQUEDA INCONSISTENTE:

Admin Profesores:
- Input text "Buscar profesor por nombre..."
- Busca EN VIVO (sin botón "buscar")
- Tabs: "Activos" vs "Inactivos"
- Resultado: Busca DENTRO del tab actual

Profesor Dashboard:
- Input "Buscar alumno" (notas/asistencia)
- Busca EN VIVO
- ¿Se puede buscar por apellido? Parece que solo por nombre

PIE Dashboard:
- Input "Buscar alumno"
- Select "Curso" (filtro dropdown)
- Busca EN VIVO
- Aplica AMBOS filtros (curso AND búsqueda)

PROBLEMAS:
❌ No hay FILTROS GUARDADOS (resets al recargar)
❌ No hay FILTROS MÚLTIPLES (solo un campo de búsqueda)
❌ No hay ORDENAMIENTO (excepto por nombre)
❌ No hay EXPORTACIÓN (datos no son descargables)
❌ Búsqueda sin wildcard: "juan" no encuentra "J.Pérez"
```

**Impacto:** Imposible encontrar información rápidamente.

**Severidad:** MEDIO

---

### 5.4 Problema: Ausencia de Breadcrumbs

**Ubicación:** Todas las páginas anidadas

**Descripción del problema:**

```
USUARIO ESTÁ EN: /profesor/alumno/123
PREGUNTA: ¿Dónde estoy exactamente?

RESPUESTA ACTUAL: Solo el nombre del alumno en header

DEBERÍA SER:
Profesor > Mis Cursos > 3°A > Juan Pérez > Ficha Integral

BENEFICIOS FALTANTES:
❌ NO se puede saber "cuánto profundo" estoy
❌ NO se puede acceder a niveles superiores rápidamente
❌ NO se sabe el "contexto" de los datos mostrados
```

**Impacto:** Desorientación; difícil entender la estructura.

**Severidad:** MEDIO

---

## 6️⃣ PROBLEMAS ENCONTRADOS (RESUMEN CATEGORIZADO)

### 🔴 CRÍTICOS (Deben corregirse antes de producción)

| # | Problema | Módulo | Impacto |
|---|----------|--------|---------|
| C1 | Inconsistencia de cálculo de alertas (umbral de conducta indefinido) | Sistema de alertas | Alertas no confiables |
| C2 | Profesor puede acceder a datos de alumnos de otros cursos | Seguridad | Brechas de privacidad |
| C3 | Promedio ponderado NO se calcula (solo promedio simple) | Notas | Datos académicos incorrectos |
| C4 | PIE es un módulo aislado (sin integración con profesor/alumno) | PIE | Workflow incompleto |
| C5 | Definición de "alerta" inconsistente entre vistas | Alertas | Decisiones basadas en datos falsos |
| C6 | Asistencia: retiro PIE vs clase tratado inconsistentemente | Asistencia | Datos auditables cuestionables |

---

### 🟠 ALTOS (Deben corregirse antes de producción)

| # | Problema | Módulo | Impacto |
|---|----------|--------|---------|
| A1 | Anotaciones (conducta) sin clasificación ni contexto | Conducta | Feedback vago a estudiantes |
| A2 | Evaluaciones: sin listado consolidado para profesor | Evaluaciones | Profesor no audita sus evaluaciones |
| A3 | Navegación anidada sin breadcrumbs ni botón "volver" | Navegación | Usuarios se pierden |
| A4 | Transiciones y estados sin feedback visual (loading/saving) | UX | Incertidumbre en acciones |
| A5 | Inconsistencia de componentes visuales (badges, tablas, formularios) | UI | Apariencia fragmentada |
| A6 | Información desorganizada en vistas grandes (8+ tabs) | Organización | Abrumador; difícil usar |
| A7 | Retiros clase vs PIE sin diferenciación clara para alumno | Retiros | Confusión sobre responsabilidad |

---

### 🟡 MEDIOS (Mejoras importantes, pero no blockers)

| # | Problema | Módulo | Impacto |
|---|----------|--------|---------|
| M1 | Responsiveness: Sidebar no funciona en móvil | Mobile | Inutilizable en celulares |
| M2 | Timestamps inconsistentes (fecha vs timestamp) | Datos | Auditoría incompleta |
| M3 | Email mostrado inconsistentemente | Privacidad | Exposición de datos |
| M4 | Búsqueda y filtros sin guardado ni exportación | Usabilidad | Difícil análisis de datos |
| M5 | Estado de carga sin progreso (spinner sin contexto) | UX | Experiencia frustrante |
| M6 | Asignaciones profesor-asignatura-curso no documentadas | Documentación | Limitaciones no claras |

---

### 🟢 BAJOS (Mejoras menores)

| # | Problema | Módulo | Impacto |
|---|----------|--------|---------|
| B1 | Iconografía sin sistema consistente | UI | Coherencia visual |
| B2 | Espaciado variable entre componentes | UI | Ritmo visual inconsistente |

---

## 7️⃣ MEJORAS RECOMENDADAS

### 7.1 MEJORAS CRÍTICAS

#### C1: Sistema de Alertas Redefinido

**Propuesta:**

```
DEFINICIÓN:
- Alerta = Indicador de riesgo automático basado en umbrales
- Objetivo: Notificar sobre estudiantes que necesitan intervención

UMBRALES (Configurables por institución):
- ACADÉMICO: Promedio < 4.0 (mínima en sistema educativo chileno)
- ASISTENCIA: < 85% (incumplimiento de régimen de asistencia)
- CONDUCTA: >= 3 anotaciones negativas en 30 días (escalada de comportamiento)

QUIÉN VE ALERTAS:
- Admin: Todas las alertas (globales)
- Profesor: Solo alertas de sus alumnos
- Alumno: Alertas propias (con explicación clara)
- PIE: Alertas de alumnos PIE + sugerencia de intervención

ACCIÓN SUGERIDA:
- Alerta académica → Aumentar seguimiento
- Alerta asistencia → Contactar apoderado
- Alerta conducta → Entrevista con alumno
- Múltiples alertas → Derivación a PIE

IMPLEMENTACIÓN:
✓ Vista consolidada de alertas en Admin/Profesor
✓ Historial de alertas (cuándo se activó/resolvió)
✓ Comentarios sobre acciones tomadas
✓ Escalamiento automático a PIE si no se resuelve
```

**Beneficios:**
- Alertas consistentes y confiables
- Acciones claras para cada alerta
- Integración PIE automática

---

#### C2: Validación de Permisos Mejorada

**Propuesta:**

```
VALIDACIÓN SERVER-SIDE:
- Cuando profesor accede a /profesor/alumno/:id
- Verificar: alumno está en alguno de mis cursos
- Si NO: Redirigir a /profesor (error 403)

VALIDACIÓN CLIENT-SIDE:
- ProtectedRoute: Verificar rol + permiso específico
- No solo rol, sino "tiene acceso a este alumno"

DOCUMENTACIÓN:
- Tabla de permisos por rol (wiki interna)
- Test de permisos automatizados
```

---

#### C3: Promedio Ponderado

**Propuesta:**

```
FÓRMULA:
Promedio = Σ (nota × porcentaje_evaluación) / Σ porcentaje

IMPLEMENTACIÓN:
export function calcPromedioP onderado(notas) {
  // notas = [{nota: 6.0, porcentaje: 20}, ...]
  let sumaPonderada = 0
  let sumaPorcentajes = 0
  
  for (const n of notas) {
    sumaPonderada += n.nota * n.porcentaje
    sumaPorcentajes += n.porcentaje
  }
  
  return sumaPonderada / sumaPorcentajes
}

APLICAR EN:
- getProfesorCursos: Calcular promedio ponderado por asignatura
- getNotasAlumno: Calcular promedio global ponderado
- Admin Dashboard: Mostrar promedio ponderado

VALIDACIÓN:
- Suma de porcentajes no puede > 100%
- Warning si suma < 100% (evaluación incompleta)
```

---

#### C4: Integración PIE - Workflow Completo

**Propuesta:**

```
ESTADOS DEL ALUMNO PIE:
1. "Identificado" → Requiere evaluación diagnóstica
2. "En evaluación diagnóstica" → PIE evalúa
3. "Diagnóstico completado" → Requiere plan de intervención
4. "Plan activo" → En seguimiento
5. "Plan finalizado" → Requiere evaluación de salida

INFORMACIÓN REQUERIDA:
- Fecha de ingreso a PIE
- Objetivo de intervención (ej: "Mejorar comprensión lectora")
- Responsable principal (Profesor regular + PIE)
- Reuniones de coordinación (registro)
- Evaluación de avance (cada mes)
- Fecha de egreso proyectado

VISTAS:
Admin:
- Listado de alumnos PIE con estado
- Reportes de avance

Profesor:
- VER: Alumnos propios en PIE con observaciones
- COMENTAR: En observaciones del PIE
- SUGERIR: Intervenciones al PIE

PIE:
- CREAR: Planes de intervención
- REGISTRAR: Observaciones y retiros
- EVALUAR: Avance del alumno
- REPORTAR: Al profesor y admin

Alumno:
- VER: Que está en PIE
- VER: Objetivo de intervención
- VER: Progreso (simple y motivador)
```

---

### 7.2 MEJORAS ALTAS

#### A1: Anotaciones con Clasificación

**Propuesta:**

```
CAMPOS:
- tipo: "positiva" | "negativa"
- categoría: "académica" | "disciplina" | "responsabilidad" | "convivencia"
- severidad: "leve" | "media" | "grave" (solo negativas)
- descripción: Texto claro
- profesor_id: Quién registró
- fecha: Cuándo ocurrió

VISTA ALUMNO:
Positivas (3): ✓ Entrega a tiempo, ✓ Participa en clase, ✓ Ayuda compañeros
Negativas (1): ⚠️ Convivencia (leve) - Interrupción en clase

VISTA PROFESOR:
Tabla con filtros: Tipo, Categoría, Severidad, Fecha

IMPACTO:
- Alumno entiende feedback específico
- Profesor puede hacer seguimiento
- Sistema genera reportes útiles
```

---

#### A2: Evaluaciones - Listado Consolidado

**Propuesta:**

```
NUEVA PÁGINA: /profesor/evaluaciones

VISTA:
- Tabla de evaluaciones creadas
- Columnas: Nombre, Curso, Asignatura, Fecha, % respuestas, Estado
- Estados: "Abierta" (puedo ingresar notas), "Cerrada" (bloqueada)
- Botones: Cerrar, Ver respuestas, Editar, Eliminar

FLUJO:
1. Crear evaluación → Aparece en esta tabla
2. Ver tabla de respuestas (si existe alguien con nota)
3. Cerrar evaluación (finaliza calificación)
4. O editar (si nadie ha respondido aún)

IMPACTO:
- Profesor audita su trabajo
- Datos consistentes
- Sin duplicados o perdidos
```

---

#### A3: Navegación con Breadcrumbs

**Propuesta:**

```
ADICIONAR A TODAS LAS PÁGINAS:

En el header, debajo del nombre:
Profesor > 3°A > Alertas

Al hacer click:
- "Profesor" → Vuelve a /profesor
- "3°A" → Vuelve a /profesor con 3°A seleccionado
- "Alertas" → Estado actual (no clickeable)

BENEFICIOS:
- Usuario sabe dónde está
- Puede navegar arriba sin perder contexto
- Vueltas rápidas sin usar browser back
```

---

#### A4: Estados Visuales de Transición

**Propuesta:**

```
ESTADOS PARA CADA ACCIÓN:

Normal:
<button className="button primary">Crear evaluación</button>

Al hacer click (loading):
<button className="button primary" disabled>
  <Spinner size="sm" /> Creando...
</button>

Al completar (success):
<button className="button primary success">
  ✓ Creada
</button>

Si error:
<button className="button primary error">
  ✗ Error: Nombre duplicado
</button>

IMPLEMENTACIÓN:
- Hook `useAsyncAction` que manja estados
- Timeout de 2-3s en success/error antes de volver a normal
```

---

### 7.3 MEJORAS MEDIAS

#### M1: Responsiveness - Mobile Navigation

**Propuesta:**

```
BREAKPOINTS:
- Desktop: > 1024px (sidebar fijo)
- Tablet: 768px - 1024px (sidebar colapsable)
- Mobile: < 768px (hamburger menu, sidebar drawer)

MÓVIL:
- Hamburger icon en top-left
- Drawer slide-in desde izquierda
- Overlay semi-transparente
- Sidebar toma 70% del ancho

TABLAS EN MÓVIL:
- Stack vertical en cards (1 fila = 1 card)
- O scroll horizontal con indicador
```

---

#### M2: Email con Consistencia

**Propuesta:**

```
REGLA:
- Mostrar email SOLO en vistas administrativas (Admin)
- NO mostrar email en vistas de profesor/alumno
- Si es necesario en profesor: agregar campo con validación de privacidad

CAMPOS SENSIBLES:
- Email: Admin only
- Teléfono: Si existe, Admin only
- Domicilio: Si existe, Admin only
```

---

---

## 8️⃣ ELEMENTOS QUE ESTÁN CORRECTOS

### ✅ Lo que funciona bien:

1. **Estructura de Roles Clara**
   - 4 roles bien diferenciados (Admin, Profesor, Alumno, PIE)
   - Rutas protegidas implementadas correctamente (excepto una validación)
   - Redirecciones automáticas según rol

2. **Autenticación Robusta**
   - Supabase integrado correctamente
   - Session management correcto
   - Reset de contraseña implementado
   - Desactivación de usuarios funciona

3. **Layout Consistente**
   - DashboardLayout reutilizable
   - Sidebar con navegación clara
   - Notificaciones (al menos para profesor)
   - Loader screen durante transiciones

4. **Servicios Bien Organizados**
   - Separación clara por dominio (adminService, profesorService, etc.)
   - Funciones con nombres descriptivos
   - Manejo de errores básico
   - Queries ordenadas y documentadas

5. **Datos Relacionales Correctos**
   - Relaciones Supabase bien configuradas
   - SELECT con joins explícitos
   - Manejo de `null` y ausencia de datos

6. **Formularios Funcionales**
   - Validaciones básicas presentes
   - Estados de error mostrados
   - Inputs accesibles

7. **PIE - Integración Completa (a nivel BD)**
   - Tablas separadas para observaciones/retiros PIE
   - Admin ve datos PIE en hoja de vida
   - Profesor ve datos PIE en ficha del alumno
   - Aunque falta workflow completo

8. **Auditoría**
   - Sistema de audit logs implementado
   - Registro de cambios por usuario
   - Disponible para descarga

9. **Notificaciones**
   - Sistema de notificaciones para profesor (alerts sobre alumnos)
   - Subscripción a cambios en tiempo real
   - Toast notifications funcionales

10. **Horarios**
    - Tabla de horarios del profesor implementada
    - Representación visual del calendario
    - Relaciones con cursos y asignaturas

---

## 9️⃣ RESUMEN Y RECOMENDACIONES FINALES

### Priorización de Trabajo

**Fase 1 (CRÍTICA - 2-3 semanas):**
1. Validación de permisos mejorada (C2)
2. Promedio ponderado (C3)
3. Sistema de alertas redefinido (C1)
4. Integración PIE completa (C4)

**Fase 2 (ALTA - 1-2 semanas):**
1. Breadcrumbs de navegación (A3)
2. Estados visuales (A4)
3. Anotaciones con clasificación (A1)
4. Evaluaciones listado consolidado (A2)

**Fase 3 (MEDIA - 1 semana):**
1. Mobile responsiveness (M1)
2. Email privacy consistency (M2)
3. Búsqueda y filtros mejorados

**Fase 4 (CONTINUO):**
1. Documentación de permisos
2. Tests de integración
3. Performance audit
4. Capacitación de usuarios

---

### Próximas Acciones Inmediatas

1. **BLOQUEAR acceso injustificado** (validar permisos en server)
2. **REVISAR fórmula de cálculo** de promedios en base de datos
3. **DOCUMENTAR umbrales** de alertas (cuáles son correctos)
4. **CREAR plan PIE** detallado con estados y flujo
5. **DISEÑAR sistema visual** consistente (design system)
6. **AUDITAR datos** en producción (¿hay inconsistencias reales?)

---

## 📊 TABLA DE RESUMEN

| Categoría | Cantidad | Severidad Promedio |
|-----------|----------|-------------------|
| Críticos | 6 | 🔴 Inmediato |
| Altos | 7 | 🟠 Urgente |
| Medios | 6 | 🟡 Pronto |
| Bajos | 2 | 🟢 Cuando sea |
| **Total** | **21** | **NECESITA ATENCIÓN** |

---

## ⚠️ DISCLAIMER

Esta auditoría se basa en análisis estático del código. Para validación completa se recomienda:
- ✓ Test de usabilidad con usuarios reales
- ✓ Pruebas de carga y performance
- ✓ Auditoría de seguridad profesional
- ✓ Validación de datos en producción
- ✓ Entrevistas con stakeholders (rectores, profesores, apoderados)

---

**Fin del Informe de Auditoría**  
*Documento generado: 9 de julio de 2026*
