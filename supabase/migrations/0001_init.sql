-- Registro de entreno: esquema inicial.
-- Cada fila pertenece a un usuario (user_id) y RLS solo deja ver/editar las propias.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  block_start date not null default date '2026-10-05',
  bodyweight numeric,
  created_at timestamptz not null default now()
);

-- Un "slot" es una línea del plan: un ejercicio de un día con su prescripción actual.
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day smallint not null check (day between 1 and 6),
  section text not null check (section in ('principal', 'abdomen', 'antebrazo', 'cardio')),
  position smallint not null default 0,
  name text not null,
  lift text,
  load numeric,
  load_unit text,
  load_step numeric,
  sets smallint not null default 3 check (sets > 0),
  target numeric not null,
  target_unit text not null default 'reps',
  target_min numeric,
  target_max numeric,
  target_step numeric not null default 1,
  rest_s integer,
  rest_min_s integer,
  rest_max_s integer,
  rest_step_s integer not null default 30,
  level smallint,
  ladder text,
  rpe text,
  notes text,
  deload text not null default 'normal' check (deload in ('normal', 'skip')),
  deload_alt text,
  optional boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index slots_user_day_idx on public.slots (user_id, day, position);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  day smallint not null check (day between 1 and 6),
  week smallint,
  kind text not null default 'normal' check (kind in ('normal', 'descarga', 'pr')),
  feeling text check (feeling in ('bien', 'normal', 'decaido')),
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index sessions_user_date_idx on public.sessions (user_id, date desc);

-- Registro de un ejercicio dentro de una sesión. "prescribed" es la foto de lo que tocaba.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  slot_id uuid references public.slots (id) on delete set null,
  name text not null,
  section text not null,
  position smallint not null default 0,
  prescribed jsonb not null,
  sets jsonb not null default '[]'::jsonb,
  decision text,
  next jsonb,
  note text,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, slot_id)
);
create index entries_user_slot_idx on public.entries (user_id, slot_id, created_at desc);
create index entries_user_name_idx on public.entries (user_id, name, created_at desc);
create index entries_session_idx on public.entries (session_id);

create table public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  lift text not null,
  value numeric not null,
  unit text not null,
  reps integer not null default 1,
  notes text,
  created_at timestamptz not null default now()
);
create index records_user_lift_idx on public.records (user_id, lift, date desc);

-- updated_at automático
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger slots_touch before update on public.slots for each row execute function public.touch_updated_at();
create trigger entries_touch before update on public.entries for each row execute function public.touch_updated_at();

-- RLS: cada usuario solo ve y toca lo suyo
alter table public.profiles enable row level security;
alter table public.slots enable row level security;
alter table public.sessions enable row level security;
alter table public.entries enable row level security;
alter table public.records enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own slots" on public.slots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own sessions" on public.sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries" on public.entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own records" on public.records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
