# Nyvo — instruções para o Claude

- Projeto Expo (React Native Web) do Erick. Idioma da interface: português do Brasil; moeda padrão BRL.
- O site público é o GitHub Pages servido a partir de `docs/` em https://ericksantosdasilva600-creator.github.io/nyvo/.
- Modo publicado: local-only (`EXPO_PUBLIC_NYVO_LOCAL_ONLY=1`), sem login nem servidor; dados no localStorage do navegador.
- Depois de qualquer mudança no app, SEMPRE reconstruir o site com `NYVO_BASE_URL=/nyvo/app pnpm build:site`, conferir que `pnpm check` e `pnpm test` passam, e fazer commit incluindo `docs/` inteiro (apresentação em `docs/index.html`, app em `docs/app/index.html`, `docs/404.html`).
- O código de login Manus / sincronização MySQL continua no projeto, desativado no modo local. Não remover.
- Estrutura do site: `/nyvo/` é a página de apresentação (SEO, `site-static/index.html`), `/nyvo/app/` é o app, `/nyvo/guias/` tem os guias. Conteúdo estático fica em `site-static/`.
