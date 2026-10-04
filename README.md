# Registro de entreno

Web para llevar el registro del gym desde el teléfono. Abres la sesión del día, ves qué te toca (peso, series×reps, descanso), anotas cada serie con su RPE y eliges qué hacer la próxima vez. La app guarda la nueva prescripción para el siguiente entrenamiento.

- **Plan:** [`docs/plan-v4.md`](docs/plan-v4.md) (bloque de 8 semanas → descarga → PRs). La app arranca con ese plan cargado.
- **Stack:** Vite + React + TypeScript, Supabase (login + base de datos). Sin Supabase configurado, arranca en *modo local* (guarda en el navegador), útil para probar.

## Qué hace

- **Hoy:** semana del bloque (1–8, descarga, PR), la plantilla del día (Lun–Sáb, se puede cambiar si mueves días) y botón de iniciar sesión.
- **Sesión:** ejercicios agrupados en Principal · Abdomen · Antebrazo · Cardio. Por serie: reps o segundos, peso, RPE (6–10) y ✓ (arranca el temporizador de descanso). Al terminar el ejercicio eliges *Mantener · ± reps · ± descanso · ± peso · Subir nivel · Personalizar*. La app marca una sugerencia y te enseña cómo quedará la próxima vez. "Ver cómo me fue antes" muestra las sesiones anteriores de ese ejercicio, serie por serie, con sus notas.
- **Descarga (semana 9):** 2 series al 65 %, sin negativas, sin gripper pesado y sin intervalos. No cambia tu plan.
- **Semana de PR (semana 10):** calentamientos e intentos calculados con tu 1RM estimado. Ahí mismo registras los resultados.
- **Historial:** por mes → semana → día, como en tu app de notas, con "Copiar como nota". También tiene una vista por ejercicio.
- **Plan:** editar, añadir, quitar o reordenar ejercicios de cada día. Incluye la pantalla de **Recalibración** (qué ejercicio está estancado al terminar cada mes).
- **PRs:** metas con barra de progreso (1RM estimado contra el que pide la meta) y registro de PRs.

## Poner tu Supabase (otra cuenta)

### 1. Crear el proyecto y las tablas

1. En [supabase.com](https://supabase.com), con la cuenta que quieras usar: **New project** → nombre `workout`.
2. Ve a **SQL Editor** → **New query**, pega todo el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y pulsa **Run**. Crea 5 tablas (`profiles`, `slots`, `sessions`, `entries`, `records`) con RLS: cada usuario solo ve lo suyo.

O con la CLI, desde la carpeta del repo:

```bash
npx supabase login                               # abre el navegador; entra con esa cuenta
npx supabase init                                # crea supabase/config.toml (responde "N" a las preguntas)
npx supabase link --project-ref <REF_DEL_PROYECTO>   # el ref sale en la URL del dashboard
npx supabase db push                             # aplica supabase/migrations/0001_init.sql
```

### 2. Login

- **Authentication → Sign In / Providers → Email:** viene activado. Si no quieres confirmar el correo al registrarte, desactiva **Confirm email**.
- **Authentication → URL Configuration → Site URL:** pon la URL donde publiques la web (por ejemplo `https://workout-tuusuario.vercel.app`). Así funciona el enlace de confirmación.

### 3. Conectar la web

En **Project Settings → API** copia la **Project URL** y la **publishable key** (o la `anon` key):

```bash
cp .env.example .env.local
# edita .env.local:
# VITE_SUPABASE_URL=https://<ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

La primera vez que entres con tu cuenta, la app carga el plan v4 y tus PRs conocidos.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # lógica de progresión, calendario y formato
npm run build      # genera dist/
```

## Publicarla (para usarla desde el teléfono)

Con Vercel: **Add New → Project → importa `Fockus26/workout`**. Vercel detecta Vite solo. En **Environment Variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` y despliega. Después, en el teléfono, abre la URL y usa **Añadir a pantalla de inicio**: se abre como una app.

Cualquier hosting estático sirve (Netlify, Cloudflare Pages, GitHub Pages): la app usa rutas con `#`, así que no necesita reglas de redirección.

## Estructura

```
docs/plan-v4.md                  plan de entrenamiento
supabase/migrations/0001_init.sql
src/lib/seed.ts                  el plan v4 como datos (lo que se carga la primera vez)
src/lib/progression.ts           niveles: aplicar decisión, sugerencia, descarga, 1RM estimado
src/lib/calendar.ts              semanas del bloque, descarga, PR
src/lib/ladders.ts               escaleras (one arm, dragon flag, leg raise, ab wheel, archer)
src/lib/store.ts                 datos: Supabase o local
src/pages, src/components        pantallas
```
