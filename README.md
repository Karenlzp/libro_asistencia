# Libro de Clases Digital

Sistema web para la gestión académica de establecimientos educacionales, desarrollado para digitalizar procesos que tradicionalmente se realizan de forma manual, como asistencia, notas, anotaciones y seguimiento de estudiantes.

## Descripción

Libro de Clases Digital es una plataforma que permite gestionar información académica mediante distintos roles de usuario, facilitando la administración de cursos, estudiantes y registros escolares.

El sistema fue desarrollado utilizando una arquitectura moderna basada en frontend React y backend gestionado con Supabase.

## Funcionalidades principales

### Administrador
- Gestión de usuarios.
- Administración de cursos y asignaturas.
- Visualización general del sistema.

### Profesor
- Visualización de cursos asignados.
- Registro y consulta de asistencia.
- Registro de evaluaciones y notas.
- Creación de anotaciones de estudiantes.
- Seguimiento del rendimiento académico.

### Módulo PIE
- Registro de observaciones PIE.
- Seguimiento académico de estudiantes pertenecientes al programa.
- Visualización de información complementaria.

## Tecnologías utilizadas

### Frontend
- React
- JavaScript
- Vite
- CSS

### Backend / Base de datos
- Supabase
- PostgreSQL
- Supabase Auth

### Herramientas
- Git
- GitHub
- Vercel

## Arquitectura

El proyecto utiliza una arquitectura modular separando:

- Componentes de interfaz.
- Servicios para comunicación con Supabase.
- Módulos según roles de usuario.
- Gestión de autenticación y permisos.

##  Instalación local

Clonar repositorio:

```bash
git clone https://github.com/TU_USUARIO/libro-clases.git

## Instalar dependencias npm install
## ejecutar npm run dev

##  Demo

**Aplicación desplegada:**

https://libro-asistencia.vercel.app/

##  Credenciales de demostración

| Rol | Correo | Contraseña |
|------|---------|------------|
| Administrador | admin@colegio.cl | 1234 |
| Profesor | juan.perez@colegio.cl | 1234 |
| PIE | pie@colegio.cl | 1234 |

> Estas credenciales corresponden únicamente a cuentas de demostración creadas para evaluar el sistema.

##  Estado

🟡 Beta

Sistema funcional con los módulos principales implementados. Continúa en proceso de optimización y mejoras.
