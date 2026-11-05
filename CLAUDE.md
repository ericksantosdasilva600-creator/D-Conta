# Nyvo — instruções para o Claude

- Projeto Expo (React Native Web) do Erick. Idioma da interface: português do Brasil; moeda padrão BRL.
- O site público é o GitHub Pages servido a partir de `docs/` em https://ericksantosdasilva600-creator.github.io/nyvo/.
- Modo publicado: local-only (`EXPO_PUBLIC_NYVO_LOCAL_ONLY=1`), sem login nem servidor; dados no localStorage do navegador.
- Depois de qualquer mudança no app, SEMPRE reconstruir o site com `NYVO_BASE_URL=/nyvo/app pnpm build:site`, conferir que `pnpm check` e `pnpm test` passam, e fazer commit incluindo `docs/` inteiro (apresentação em `docs/index.html`, app em `docs/app/index.html`, `docs/404.html`).
- O código de login Manus / sincronização MySQL continua no projeto, desativado no modo local. Não remover.
- Estrutura do site: `/nyvo/` é a página de apresentação (SEO, `site-static/index.html`), `/nyvo/app/` é o app, `/nyvo/guias/` tem os guias. Conteúdo estático fica em `site-static/`.
- Monetização preparada e desligada: `PRO_SALES_OPEN` em `lib/plans.ts` e `ADSENSE_CLIENT`/`AD_SLOT` em `site-static/ads.js`. Anúncios só nas páginas públicas, nunca no app. Antes de ligar: sair do GitHub Pages (uso comercial proibido), domínio próprio, e atualizar a política e os textos "grátis/sem anúncios".
- Lupa e assistente: busca e respostas locais em `lib/assistant.ts`; IA em `supabase/functions/nyvo-assistente` (Supabase, segredo `ANTHROPIC_API_KEY`, limites na tabela `nyvo_ai_usage`). Nunca enviar dados do usuário para a IA sem consentimento explícito e sem atualizar a política de privacidade.
