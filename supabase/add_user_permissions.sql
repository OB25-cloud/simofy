-- Run this in your Supabase SQL editor.
-- Also add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Project Settings → API).

create table if not exists public.user_permissions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  module      text not null,
  action      text not null,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (profile_id, module, action)
);

alter table public.user_permissions enable row level security;

-- Users can read their own permissions (used by layout.tsx)
create policy "Users can read own permissions"
  on public.user_permissions for select
  using (auth.uid() = profile_id);

-- All writes go through service-role API routes (no authenticated write policies)

-- Optional: add 'supervisor' to profiles role constraint if your table has one
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--   CHECK (role IN ('admin', 'supervisor', 'field'));
