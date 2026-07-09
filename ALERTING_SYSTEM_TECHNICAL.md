# 🔬 ANÁLISIS TÉCNICO — Vista v_alertas

## ⚠️ DISCLAIMER
Esta es una **RECONSTRUCCIÓN** basada en uso del código. La definición real está en Supabase.

---

## Qué Debería Ser v_alertas

Basándome en el código que la consulta, `v_alertas` debería ser algo como:

```sql
-- Posible definición de v_alertas (TEÓRICA)
CREATE VIEW v_alertas AS
SELECT
  u.id as alumno_id,
  u.nombre as alumno,
  c.nivel || '°' || c.letra as curso,
  c.id as curso_id,
  -- Promedio de notas del alumno
  COALESCE(AVG(dn.nota)::NUMERIC(3,1), NULL) as promedio_general,
  -- Porcentaje de asistencia
  ROUND(
    100.0 * COUNT(CASE WHEN a.estado IN ('presente', 'justificado') THEN 1 END) /
    NULLIF(COUNT(a.id), 0)
  ) as porcentaje_asistencia,
  -- Contar anotaciones negativas
  COUNT(CASE WHEN ann.tipo = 'negativa' THEN 1 END) as anotaciones_negativas,
  -- Booleanos de alerta
  (COALESCE(AVG(dn.nota), 0) < 4.0) as alerta_promedio,
  (
    ROUND(
      100.0 * COUNT(CASE WHEN a.estado IN ('presente', 'justificado') THEN 1 END) /
      NULLIF(COUNT(a.id), 0)
    ) < 85
  ) as alerta_asistencia,
  (COUNT(CASE WHEN ann.tipo = 'negativa' THEN 1 END) >= 3) as alerta_conducta
FROM
  usuarios u
  LEFT JOIN cursos c ON u.curso_id = c.id
  LEFT JOIN detalle_nota dn ON u.id = dn.alumno_id
  LEFT JOIN asistencia a ON u.id = a.alumno_id
  LEFT JOIN anotaciones ann ON u.id = ann.alumno_id
WHERE
  u.rol = 'alumno'
GROUP BY
  u.id, u.nombre, c.id, c.nivel, c.letra;
```

### Problemas con esta definición (TEÓRICA):

1. **MÚLTIPLES FILAS POR ALUMNO**
   - Si alumno tiene múltiples asignaturas → múltiples filas
   - Porque los JOINs generan Cartesian product
   
2. **PROMEDIOS INCORRECTOS**
   - Si alumno tiene notas en Aritmética (4.0) y Lenguaje (3.8)
   - Promedio por asignatura distinto a promedio general
   
3. **CONTEOS DUPLICADOS**
   - Si hay múltiples evaluaciones por asignatura
   - COUNT da valores incorrectos

---

## Qué REALMENTE Sucede

### Análisis del Código Consumidor

**En profesorService.js:**
```javascript
getAlertasPorCurso(cursoId) {
  const { data } = await supabase
    .from('v_alertas')
    .select('*')
    .eq('curso_id', cursoId)
  // data puede tener MÚLTIPLES FILAS POR ALUMNO
  return { data, error }
}

// Luego en profesorDashboard.jsx:
const alertasAgrupadas = useMemo(() => {
  const map = new Map()
  for (const a of alertas ?? []) {
    const alumnoId = a.alumno_id
    const existente = map.get(alumnoId)
    
    if (!existente) {
      // Primera vez que veo este alumno
      map.set(alumnoId, {
        promedio_general: a.promedio_general,
        alerta_promedio: !!a.alerta_promedio,
        // ... más campos
      })
      continue
    }
    
    // YA EXISTE: fusionar datos
    existente.alerta_promedio = existente.alerta_promedio || !!a.alerta_promedio
    existente.promedio_general = Math.min(
      Number(existente.promedio_general), 
      Number(a.promedio_general)
    )
    // ... más lógica de agregación
  }
  return Array.from(map.values())
})
```

**Conclusión:** v_alertas devuelve **múltiples filas por alumno** (probablemente una por asignatura o por evaluación).

---

## Escenario Real: Juan Pérez

### Datos en Tablas

**Tabla: usuarios**
```
id: 123
nombre: Juan Pérez
rol: alumno
curso_id: 456
```

**Tabla: detalle_nota**
```
alumno_id  |  evaluacion_id  |  nota
123        |  e1             |  3.8  (Aritmética - Prueba 1)
123        |  e2             |  4.2  (Aritmética - Prueba 2)
123        |  e3             |  4.5  (Lenguaje - Prueba 1)
```

**Tabla: asistencia**
```
alumno_id  |  fecha      |  estado
123        |  2026-07-01 |  presente
123        |  2026-07-02 |  presente
123        |  2026-07-03 |  ausente
123        |  2026-07-04 |  justificado
```

**Tabla: anotaciones**
```
alumno_id  |  tipo      |  descripcion
123        |  positiva  |  Entrega a tiempo
123        |  negativa  |  Interrupción en clase
123        |  negativa  |  Tarea incompleta
```

### Qué Devuelve v_alertas (ESTIMADO)

**Fila 1 (por evaluación Aritmética):**
```
alumno_id: 123
alumno: "Juan Pérez"
curso: "3°A"
curso_id: 456
promedio_general: 4.0  (promedio de (3.8, 4.2))
porcentaje_asistencia: 75%  (3 de 4)
anotaciones_negativas: 2
alerta_promedio: TRUE   (4.0 < 4.0 es FALSE, pero depende de BD)
alerta_asistencia: TRUE  (75 < 85)
alerta_conducta: FALSE   (2 < 3)
```

**Fila 2 (por evaluación Lenguaje):**
```
alumno_id: 123
alumno: "Juan Pérez"
curso: "3°A"
curso_id: 456
promedio_general: 4.5   (solo Lenguaje)
porcentaje_asistencia: 75%
anotaciones_negativas: 2
alerta_promedio: FALSE
alerta_asistencia: TRUE
alerta_conducta: FALSE
```

### Qué Ve Cada Rol

**Admin ve (sin procesamiento):**
- Fila 1: Promedio 4.0, Asistencia 75%, Alerta de asistencia
- Fila 2: Promedio 4.5, Asistencia 75%, Alerta de asistencia

**Profesor ve (con agrupación en frontend):**
- 1 fila consolidada por alumno
- Promedio: 4.0 (MÍNIMO de las 2 filas)
- Asistencia: 75% (igual)
- Alertas: OR de ambas filas

**PIE ve (transformación en función):**
- Promedio: 4.25 (PROMEDIO de las 2 filas = (4.0 + 4.5)/2)
- Asistencia: 75% (igual)
- Alertas: OR de ambas filas

---

## Problemas Identificados

### 1. Múltiples Filas por Alumno
```
✓ Esto EXPLICA por qué Profesor debe agrupar
✓ Esto EXPLICA por qué PIE recalcula

Pero:
✗ NO está documentado
✗ Hace inconsistente el display
```

### 2. Diferencias en Cálculo

```
Si Juan tiene:
- Aritmética: 3.8 (alerta)
- Lenguaje: 4.5 (sin alerta)

Admin/Profesor → MÍNIMO = 3.8 → ALERTA
PIE → PROMEDIO = 4.15 → ¿SIN ALERTA?

¿Cuál es correcto?
```

### 3. Periodicidad de Anotaciones

```
¿Las "3+ anotaciones negativas" incluyen:
- Solo del mes actual?
- Solo del trimestre?
- De todo el año?

Si Juan tiene 2 este mes y 1 el mes anterior:
- BD cuenta: 2 (solo mes actual) → sin alerta
- BD cuenta: 3 (total) → con alerta
```

---

## Recomendaciones Técnicas

### 1. Documentar EXACTAMENTE la Definición
```sql
-- supabase/v_alertas.sql
-- Aquí la definición oficial
-- Con comentarios explicando cada campo
-- Y por qué se agrupa así
```

### 2. Decidir: ¿Una o Múltiples Filas?

**Opción A: Una fila por alumno (MEJOR)**
```sql
CREATE VIEW v_alertas AS
SELECT DISTINCT ON (u.id)
  u.id as alumno_id,
  u.nombre as alumno,
  -- agregaciones aquí
GROUP BY u.id
```

**Opción B: Múltiples filas (documentar bien)**
```sql
CREATE VIEW v_alertas AS
SELECT
  -- mantener tal cual pero con COMENTARIOS
```

### 3. Crear Función de Consolidación

```javascript
// Reemplazar la lógica duplicada
export function consolidarAlertas(filas) {
  // Una sola función para deduplicar
  // Usada por Admin, Profesor, PIE
}
```

### 4. Especificar Períodos

```javascript
// Parámetro: últimos X días
export function getAnotacionesNegativas(alumnoId, días = 30) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - días)
  // contar desde esa fecha
}
```

---

## Verdades Establecidas

### ✓ Confirmado en el Código

1. v_alertas tiene estos campos exactos:
   - alumno_id, alumno, curso, curso_id
   - promedio_general, porcentaje_asistencia, anotaciones_negativas
   - alerta_promedio, alerta_asistencia, alerta_conducta

2. Devuelve múltiples filas por alumno
   - Profesor agrupa en frontend
   - Admin muestra todas
   - PIE transforma

3. Los umbrales hardcodeados son:
   - 4.0 para promedio
   - 85 para asistencia
   - 3 para anotaciones

### ❓ No Confirmado

1. ¿Qué período cubre cada métrica?
2. ¿Cómo maneja los NULL?
3. ¿Por qué múltiples filas?
4. ¿Quién definió los umbrales y por qué?

---

## Próximos Pasos

1. **Conectarse a Supabase** → Abrir SQL Editor
2. **Copiar definición de v_alertas** → Guardar en archivo
3. **Responder preguntas sin confirmar** (ver arriba)
4. **Crear archivo .sql documentado** → Agregar a Git
5. **Refactorizar lógica** → Una función única

---

*Este análisis es especulativo pero basado en código real.*  
*Se confirma consultando Supabase directamente.*
