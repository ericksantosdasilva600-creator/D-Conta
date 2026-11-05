# Plano estratégico e técnico atualizado do Nyvo

Esta é a fonte de verdade para a direção atual e substitui as decisões antigas que tratavam a sincronização como fase futura.

## Direção do produto

O Nyvo é um cockpit pessoal, mobile-first mas responsivo em notebook, com quatro pilares: Anotações, Finanças Pessoais, Hábitos & Saúde e Atividades & Tarefas. O Resumo prioriza uma ação “Adicionar” e quatro indicadores compactos. A experiência deve manter uma alternativa manual e offline, evitar classificação obrigatória e ligar módulos apenas por escolhas reversíveis do utilizador.

A V1 local-first evolui para modelo híbrido: app Expo nativa + site Expo Web com Manus OAuth e sincronização multi-dispositivo via API e MySQL gerido. Os dados continuam a ser escritos primeiro no dispositivo. A primeira associação de conteúdo local e cloud exige escolha explícita. Os recibos fazem parte da sincronização.

## Requisitos funcionais mantidos

- CRUD, pesquisa e relações opcionais nas quatro áreas, sem criar movimentos ou notas duplicados.
- Finanças separadas entre Pessoal e Viagem, receitas/despesas, categorias predefinidas (incluindo Salário, Bonificação e Saúde), categorias personalizadas, pesquisa/filtros, prioridades, gráficos e orçamentos mensais simples.
- Calendário para seleção de datas, vencimentos e prazos; lembretes locais para despesas pendentes, hábitos e tarefas, com permissão opcional.
- Identidade verde/azul, português europeu, acessibilidade, recuperação e mensagens claras para vazio, offline, erro, permissão, sucesso e sincronização.
- Funcionar no smartphone e no notebook; navegação inferior no ecrã pequeno e sidebar em Web largo.
- Login real Manus OAuth; sem login por palavra-passe, utilizador de demonstração ou segredos incorporados no bundle.
- Cache isolada por conta, sincronização por revisão, conflito explícito, filas offline e sincronização total dos recibos comprimidos.

## Arquitetura e modelo de dados

- Reutilizar o starter Expo/React Native/TypeScript, Expo Router, NativeWind, React Query e tRPC v11. Não substituir o projeto nem as portas do starter.
- Express no Node.js, procedimentos tRPC autenticados por sessão Manus, validação de payload com Zod e Drizzle ORM sobre MySQL gerido.
- Tabela `users` para identidade; `nyvo_user_state` com uma linha por utilizador, `schemaVersion`, `revision`, JSON de `AppData` e `updatedAt`; `nyvo_receipts` separada com UUID, `userId`, MIME, tamanho, bytes e data.
- Toda consulta/mutação cloud obtém o proprietário do `ctx.user.id`; nunca confiar num `userId` enviado pelo cliente. Gravação do snapshot compara `expectedRevision` dentro de transação; conflitos não são resolvidos por last-write-wins.
- Guardar os bytes comprimidos dos recibos em `MEDIUMBLOB` separado do JSON, com limite de 1,5 MiB e leitura apenas pela API autenticada. O snapshot remoto guarda `receiptId`, nunca `file://`, URI `blob:` ou base64 pendente. A decisão evita URL global pública; rever custo/volume antes de escalar.
- AsyncStorage isola cada conta; SecureStore protege token e perfil nativos; Web usa cookie para sessão e IndexedDB para cache de imagens. O site e API publicados partilham a mesma origem. No Preview, usar os URLs/variáveis fornecidos pelo ambiente.

## Sincronização e recuperação

- No arranque, ler a cache local validada e a sessão; carregar a revisão remota se houver ligação.
- Ao encontrar dados locais não associados, apresentar escolha explícita para manter/enviar esses dados ou usar cloud. Criar backup local antes de substituir; nunca enviar conteúdo sem consentimento nem substituir silenciosamente por estrutura vazia.
- Quando a cache está ligada, alterações marcam `dirty` e são enviadas com debounce se a rede estiver disponível. Ao retomar/reconectar, consultar revisão remota.
- Se a revisão remota mudou enquanto existem alterações locais, parar o push e apresentar as opções “Usar dados da nuvem” ou “Manter este dispositivo”; ambas devem preservar um caminho de recuperação.
- Comprimir recibo antes da fila; manter bytes locais até o servidor confirmar upload e snapshot. Validar MIME real/tamanho, conservar imagens localmente para acesso offline e limpar cópias órfãs apenas depois de uma substituição/remoção confirmada.
- Estados visíveis: Sincronizado, A sincronizar, Sem ligação, Conflito, Erro e Associar dados; disponibilizar nova tentativa sem eliminar cache.

## UX, retenção e desenho visual

**Movimento:** interfaces utilitárias de bem-estar digital, com serenidade editorial em vez de painel corporativo.
**Princípios:** leitura imediata; registo sem burocracia; recuperação acima de otimização; privacidade perceptível e controlos sob escolha do utilizador.
**Paleta:** papel quente `#F7F5EF`, superfícies brancas, verde Nyvo `#187A61`/escuro `#105A48`, azul `#3478A9`/escuro `#235E84`, com âmbar e coral reservados para prioridade, vencimento e erro.
**Layout:** coluna principal com cartões curtos; navegação inferior em telemóvel, sidebar de 248 px em browser a partir de 1024 px.
**Motivos de marca:** BrandMark original, superfícies de papel e cartões de canto arredondado, azul para conteúdo financeiro e verde para ação/conclusão.
**Interação:** calendário, feedback táctil, permissões contextuais, debounce de sync e escolha clara em conflitos; reduzir movimento respeita preferência local.
**Animação:** feedback de pressão discreto e modal deslizante curto; a preferência “Reduzir movimento” elimina a animação do modal; evitar movimento contínuo, alertas pulsantes ou gamificação punitiva.
**Tipografia:** sans do sistema para interface; Georgia/serif em títulos de destaque.
**Essência:** “um espaço pessoal para organizar o que importa sem espalhar a vida por aplicações”; personalidade serena, prática e fiável.
**Voz:** direta, acolhedora e sem culpa. Exemplos: “O essencial, num só lugar.” e “Um próximo passo de cada vez.”
**Wordmark & logo:** usar o símbolo original já existente — quatro pilares ligados num emblema compacto — junto ao nome Nyvo; manter o logótipo textual legível, sem transformar o símbolo numa imagem com texto embutido.
**Cor própria:** verde `#187A61` como cor identificável e de ação, apoiado pelo azul para orientação/finanças.

## Segurança, privacidade e limites

- Cookies HTTPS `SameSite=None; Secure` no Preview; manter comportamento local para HTTP sem selecionar atributos apenas por `NODE_ENV`.
- CORS limitado às origens confiáveis; API `/api` com cache privado/no-store; healthcheck `/api/health` público.
- `DATABASE_URL`, `MANUS_JWT_SECRET` e `BUILT_IN_FORGE_API_KEY` só no servidor/gestor de segredos; valores `EXPO_PUBLIC_*` são públicos e não podem conter credenciais.
- A autorização e ownership por utilizador são implementados na API; o projeto não reivindica cifragem ponta a ponta. A política do fornecedor para cifragem em repouso e retenção de backups não é inferida.
- Não recolher números completos de cartões/CVV; dados de saúde não produzem diagnóstico; IA/OCR/cloud LLM não são chamados pelos fluxos atuais.
- A mesma base MySQL é partilhada por desenvolvimento e produção. Rever migrations Drizzle antes de aplicar; alterações devem ser aditivas, sem testes destrutivos em dados reais.

## Deploy e operação

O Web export e a API Express são servidos num container único na mesma origem. `pnpm build` produz `dist-web` e `dist-server`; `Dockerfile` compila no Node 22 e executa o servidor, respeitando `PORT` (3000 por defeito). O healthcheck é `/api/health`. A app nativa continua a usar o pipeline Mobile do Dashboard; a exportação Web não substitui nem altera o build iOS/Android.

Comandos normais: `pnpm dev`, `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm start`. `pnpm db:push` só após rever a migration, pois a base managed é partilhada.

## Roadmap

**Estado atual:** autenticação Manus/OAuth, isolamento por conta, snapshot/revisão tRPC/MySQL, recibos privados, fluxo offline-first, UI responsiva, export Web/container e migration aditiva implementados; checks locais e healthcheck passaram.
**Próximos marcos:** validar login Manus real e sync em dois dispositivos, fazer o build nativo pelo Dashboard e publicar o container após a confirmação do pedido de publicação.
**Depois, apenas com decisão/consentimento adicionais:** captura NLP/voz com pré-visualização editável; OCR de recibos/notas com confirmação; insights opt-in e explicáveis; export/backup por conta; pesquisa avançada; migração para entidades relacionais caso o volume/consulta justifique; integrações bancárias e metas financeiras avançadas.

## Estrutura do projeto

- `app/`: rotas Expo Router partilhadas entre app nativa e site Web, incluindo quatro pilares, Resumo, Definições, login, onboarding e callback OAuth; `_layout.tsx` protege as rotas privadas.
- `app/(tabs)/_layout.tsx`: navegação inferior em telemóvel e navegação lateral em browser largo.
- `components/`: ecrãs dos quatro pilares, design system, calendário, gráficos, formulários e preview de recibos.
- `hooks/auth-context.tsx`, `hooks/use-auth.ts`: sessão Manus, perfil offline em cache, renovação e logout.
- `lib/app-data.tsx`: domínio, migração Viaja→Nyvo, validação/backup, cache local isolada por conta e metadados de revisão.
- `lib/cloud-sync.tsx`: bootstrap, associação explícita, debounce, envio/download de recibos, conflito e recuperação.
- `lib/receipt-cache.ts`: cópias locais por conta em IndexedDB no Web e ficheiros privados no dispositivo.
- `lib/_core/`, `constants/oauth.ts`, `lib/oauth-state.ts`: chamadas API autenticadas, origem de API e state/nonce OAuth para browser e deep link.
- `server/`: Express, tRPC, sessão, OAuth, validação, ownership e operações MySQL.
- `drizzle/`: tabelas de identidade, snapshot Nyvo por utilizador e recibos binários.
- `public/manus-routes.json`: manifesto de páginas Web; `Dockerfile`: site Expo exportado e API Express na mesma origem.
- `assets/images/`, `app.config.ts`: ícones e identidade; os identificadores Expo existentes são preservados.
- `NYVO_GUIA_COMPLETO.md` documenta utilização, armazenamento, segurança e limites; `TODO.md` acompanha cláusulas e estado de implementação.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: comandos, dependências e política de scripts permitidos.

## Condições de operação

A migration aditiva foi revista e aplicada; uma consulta só de metadados confirmou `users`, `nyvo_user_state` e `nyvo_receipts`. Os checks locais, manifesto de 10 rotas e healthcheck passaram; uma chamada sem sessão ao endpoint de identidade respondeu 401. Ainda não foi validado um login Manus real, sync entre dois dispositivos, build físico nem publicação do container. O aviso anterior para `viajadesp-djjzgjdt.manus.space` corresponde a uma versão anterior à transição cloud, não a esta entrega.
