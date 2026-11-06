-- Visitantes sem conta não precisam de nenhum acesso à tabela de dados do app.
revoke all on public.nyvo_state from anon;
