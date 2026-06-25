-- Sincroniza el correo desde auth.users hacia public.usuarios.email
-- Ejecutar en Supabase SQL Editor (con permisos de proyecto)

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS email text;

UPDATE public.usuarios u
SET email = au.email
FROM auth.users au
WHERE au.id = u.id
  AND (u.email IS NULL OR u.email = '');

