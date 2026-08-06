# Trakeo de invitados de boda

Sistema para crear invitaciones de boda, enviarlas por WhatsApp/email con un link único, y
llevar el control de quién confirma asistencia. Autenticación de invitados vía **Magic Link + PIN**
(sin necesidad de que creen una cuenta), con límite de acompañantes por invitación y auditoría
completa de cada cambio de estado.

## Stack

- Next.js (App Router) + TypeScript + Tailwind — desplegado en Vercel
- Supabase (PostgreSQL + Row Level Security) como base de datos y auth de novios/colaboradores
- Resend para el envío de emails de invitación
- Sesiones de invitados vía JWT de corta duración (15 min) emitido tras verificar el PIN

## 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el SQL editor, ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`.
   Esto crea las tablas `bodas`, `boda_colaboradores`, `invitados`, `confirmaciones`,
   `invitados_historial`, sus políticas de RLS y triggers de auditoría.
3. En **Project Settings > API**, copia la `URL`, la `anon key` y la `service_role key`.

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa los valores:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: del proyecto de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: usada solo en API routes server-side para el flujo público de
  invitados (validar token, verificar PIN, confirmar), que no pasa por Supabase Auth.
- `SESSION_JWT_SECRET`: genera uno con `openssl rand -base64 32`.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`: de [resend.com](https://resend.com), para enviar los
  emails de invitación.

## 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Crea una cuenta en `/auth/signup` para
entrar al dashboard de novios.

## 4. Flujo del sistema

**Novios / colaboradores** (requieren cuenta, protegido por Supabase Auth + RLS):
- `/dashboard` — crea la boda y ve estadísticas generales
- `/dashboard/invitados` — tabla de invitados, filtros, reenvío de invitación, exportar CSV
- `/dashboard/invitados/crear` — alta en lote de invitados (nombre, email, teléfono, límite de
  acompañantes por invitación)
- `/dashboard/invitados/[id]` — editar datos, ver historial de auditoría completo

**Invitados** (sin cuenta, acceso vía link único + PIN):
- `/confirmar/[token]` — valida el link, pide el PIN de 4 dígitos (bloqueo tras 3 intentos
  fallidos), y permite confirmar/declinar con acompañantes (limitados al máximo asignado),
  restricciones dietéticas y comentarios

Cada confirmación queda registrada de forma inmutable en `confirmaciones`, y cada evento
(creación, intentos de PIN, confirmaciones, reenvíos, ediciones) queda en `invitados_historial`
con IP y user agent para auditoría.

## 5. Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com/new).
2. Agrega las mismas variables de entorno del paso 2 en la configuración del proyecto.
3. Define `NEXT_PUBLIC_APP_URL` con la URL final de producción (se usa para construir los links
   de confirmación que se envían por email).
