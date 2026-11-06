-- Contagem anônima de visitas. O site só insere; ninguém lê pela chave pública.
create table if not exists public.nyvo_visits (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 8 and 40),
  kind text not null default 'view' check (kind in ('view','ping')),
  path text not null check (char_length(path) between 1 and 120),
  referrer text check (char_length(referrer) <= 120),
  tz text check (char_length(tz) <= 64),
  created_at timestamptz not null default now()
);
create index if not exists nyvo_visits_created_at_idx on public.nyvo_visits (created_at desc);
alter table public.nyvo_visits enable row level security;
revoke all on public.nyvo_visits from anon, authenticated;
grant insert (session_id, kind, path, referrer, tz) on public.nyvo_visits to anon, authenticated;
create policy "site pode registrar visitas anonimas" on public.nyvo_visits
  for insert to anon, authenticated with check (char_length(session_id) <= 40);
