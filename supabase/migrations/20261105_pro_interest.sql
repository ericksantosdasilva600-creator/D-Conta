-- Lista de interessados no Nyvo Pro. O app só insere; ninguém lê pela chave pública.
create table if not exists public.nyvo_pro_interest (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  benefits text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint nyvo_pro_interest_email_ok check (char_length(email) between 5 and 254 and email = lower(email) and email like '%_@_%._%'),
  constraint nyvo_pro_interest_benefits_ok check (cardinality(benefits) <= 3 and benefits <@ array['relatorios','indicadores','personalizacao']::text[])
);
create unique index if not exists nyvo_pro_interest_email_key on public.nyvo_pro_interest (email);
alter table public.nyvo_pro_interest enable row level security;
revoke all on public.nyvo_pro_interest from anon, authenticated;
grant insert (email, benefits) on public.nyvo_pro_interest to anon, authenticated;
create policy "qualquer pessoa pode entrar na lista" on public.nyvo_pro_interest
  for insert to anon, authenticated with check (char_length(email) <= 254);
