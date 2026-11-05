-- Limite de uso do assistente. Guarda só um hash do IP e a contagem do dia.
create table if not exists public.nyvo_ai_usage (
  bucket text not null,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (bucket, day)
);
alter table public.nyvo_ai_usage enable row level security;

create or replace function public.nyvo_ai_hit(p_bucket text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  insert into public.nyvo_ai_usage as u (bucket, count) values (p_bucket, 1)
  on conflict (bucket, day) do update set count = u.count + 1
  returning count into v;
  delete from public.nyvo_ai_usage where day < (now() at time zone 'utc')::date - 7;
  return v <= p_limit;
end $$;
revoke all on function public.nyvo_ai_hit(text, integer) from public, anon, authenticated;
grant execute on function public.nyvo_ai_hit(text, integer) to service_role;
