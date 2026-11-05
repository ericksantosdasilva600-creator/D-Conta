# Nyvo — dossier funcional e técnico

**Versão do documento:** 1.0 · **Data:** 5 de novembro de 2026  
**Projeto:** `/home/ubuntu/viajadesp`  
**Objetivo:** reunir num só documento o propósito, as funcionalidades, o modelo de dados, o desenho visual, a arquitetura híbrida, as chaves de configuração, os comandos e os limites conhecidos do Nyvo.

> Este documento descreve o código e as configurações do projeto. Não inclui valores de credenciais, tokens, segredos JWT, URLs privadas de ligação à base de dados nem chaves de API. Os nomes das variáveis são documentados para permitir a configuração segura.

## 1. O que é o Nyvo

O Nyvo é um cockpit pessoal que reúne quatro áreas: **Anotações**, **Finanças Pessoais**, **Hábitos & Saúde** e **Atividades & Tarefas**. A proposta é reduzir a fricção de registar e rever coisas importantes: uma ação principal “Adicionar”, indicadores compactos no Resumo e acesso rápido a cada área, sem obrigar a classificar tudo ou a preencher relações entre módulos.

A aplicação é construída numa base partilhada Expo/React Native: experiência nativa em telemóvel e versão Web responsiva para navegador em notebook ou telemóvel. A conta usa Manus OAuth; os dados ficam primeiro no dispositivo e podem sincronizar com a nuvem quando existe sessão e ligação. O objetivo offline-first mantém leitura e edição local disponíveis mesmo quando a rede falha.

O nome visível da aplicação é **Nyvo**. Para preservar compatibilidade com instalações/configurações existentes, o `appSlug` (`viajadesp`), o scheme de deep link e os identificadores de pacote iOS/Android continuam com os identificadores originais; esses identificadores técnicos não são o nome mostrado ao utilizador.

## 2. Objetivos de produto

- Ajudar a concluir rapidamente tarefas comuns num telemóvel, sem impedir o uso num ecrã de notebook.
- Manter num único espaço notas, dinheiro, hábitos/saúde e tarefas, com ligações opcionais entre pilares.
- Guardar automaticamente alterações no dispositivo antes de depender da rede.
- Sincronizar a conta entre dispositivos com uma decisão explícita na primeira associação e resolução visível de conflitos.
- Sincronizar também as imagens dos recibos, sem tornar os caminhos de ficheiros do dispositivo URLs públicas.
- Usar português europeu, categorias de arranque úteis, datas escolhidas num calendário e identidade visual verde/azul.
- Tratar dados pessoais com minimização, controlo de acesso por utilizador e mensagens claras sobre o que fica local e o que é enviado para a conta.

## 3. Funcionalidades atuais

### Resumo / cockpit

Mostra uma ação **Adicionar**, data atual e quatro cartões de resumo: notas, saldo pessoal do mês, check-ins/atividade de saúde e tarefas abertas ou vencidas. O saldo e os indicadores são calculados a partir dos registos guardados; não vêm de uma fonte bancária externa. O dashboard apresenta estados de armazenamento, ligação e sincronização.

### Anotações

CRUD local e sincronizável de notas com título, conteúdo, etiquetas, projeto, ligação opcional a uma tarefa e datas de criação/atualização. A relação com projeto ou tarefa é opcional; não bloqueia uma nota rápida.

### Finanças

Regista receitas e despesas em duas áreas separadas: **Pessoal** e **Viagem**. Cada movimento pode ter valor, estabelecimento/origem, categoria, data, vencimento, estado pago/pendente, prioridade, notas e recibo. Inclui pesquisa, filtros por tipo/prioridade/categoria/período, ordenação por prioridade, saldo, gráficos e orçamentos mensais simples por categoria e âmbito.

Categorias de despesa predefinidas: Alimentação, Transporte, Alojamento, Atividades, Compras, Saúde e Outros. Categorias de receita predefinidas: Salário, Bonificação, Reembolsos, Adiantamentos e Outras receitas. O utilizador pode criar categorias adicionais. As sugestões rápidas do formulário preenchem nomes comuns e, quando aplicável, sugerem a categoria.

A moeda inicial é EUR. A aplicação também permite apresentar valores em USD, GBP e BRL; mudar a moeda **não converte** montantes existentes.

### Hábitos & Saúde

Permite criar, editar, arquivar e consultar hábitos, escolher dias da semana e hora de lembrete, assinalar check-ins e percorrer o histórico. Os registos de saúde abrangem hidratação, treino/atividade física, leitura e estudo, com data, quantidade/duração e notas conforme o tipo. Não é uma ferramenta de diagnóstico ou aconselhamento clínico.

### Atividades & Tarefas

Permite criar, editar, concluir/reabrir, eliminar, pesquisar e priorizar tarefas. Estados: **Backlog**, **Próxima**, **Em curso** e **Concluída**. Projeto, prazo, notas, lembrete e ligação opcional a categoria orçamental são campos de organização, não requisitos para guardar.

### Datas e notificações

Os formulários usam um seletor de calendário, em vez de exigir a escrita manual da data. Os lembretes são notificações **locais do dispositivo**: despesas pendentes podem avisar no dia anterior e no dia do vencimento às 09:00; hábitos seguem os dias/horas escolhidos; tarefas podem avisar na data definida. A autorização do sistema é opcional e independente das preferências da app. No Web, os lembretes locais não são suportados; continuam visíveis nas listas e em Definições.

### Login, modo offline e sincronização

- Login por Manus OAuth; não há login por palavra-passe.
- A sessão Web usa cookie. A app nativa usa token guardado no SecureStore.
- O perfil previamente autenticado pode ser mantido em cache para permitir acesso local durante uma falha de rede.
- O cache de dados é separado por ID da conta. O logout não apaga a cópia local dessa conta.
- Dados antigos sem associação cloud não são carregados automaticamente para a conta: o utilizador escolhe entre associar os dados deste dispositivo e usar os dados que já existem na nuvem.
- As alterações sincronizadas são enviadas após um debounce de cerca de 800 ms, quando a conta está ligada, a rede está disponível e a revisão remota não mudou. O estado remoto é atualizado ao retomar a app, ao recuperar a rede e ao voltar à janela Web.
- Se dois dispositivos tiverem alterações concorrentes, a revisão esperada impede sobrescrita silenciosa. A interface oferece escolher os dados deste dispositivo ou os da nuvem; antes de substituir dados locais, guarda uma cópia recuperável.

Estados apresentados: **Sincronizado**, **A sincronizar**, **Sem ligação**, **Conflito**, **Erro de sincronização**, **Associar dados** e estados de verificação/sessão.

## 4. Modelo de dados

### Entidades de produto no estado `AppData` (schemaVersion 3)

| Entidade | Campos principais | Utilização |
|---|---|---|
| `Transaction` | `id`, `kind`, `amount`, `merchant`, `category`, `date`, `dueDate`, `paid`, `priority`, `notes`, `scope`; campos opcionais `receiptId`, `receiptMimeType`; `receiptUri` e `receiptPendingBase64` são locais | Receita/despesa pessoal ou de viagem; a referência do recibo é sincronizada, não o caminho local nem a base64 temporária |
| `Note` | `id`, `title`, `body`, `tags`, `project`, `relatedTaskId`, `createdAt`, `updatedAt` | Anotação com relações opcionais |
| `Habit` | `id`, `name`, `weekdays`, `reminderTime`, `priority`, `archived`, `goalLabel` | Rotina e preferência de lembrete |
| Check-ins | `completedByDate: Record<date, habitId[]>` | Histórico diário dos hábitos |
| `HealthLog` | `id`, `kind`, `date`, `amountMl`, `durationMinutes`, `notes` | Hidratação, atividade, leitura ou estudo |
| `Task` | `id`, `title`, `description`, `status`, `priority`, `dueDate`, `project`, `linkedBudgetId`, `remindAtDue`, datas de criação/atualização | Backlog, execução e prazos |
| `MonthlyBudget` | `id`, `month`, `category`, `scope`, `limit` | Limite de orçamento por mês, categoria e âmbito |
| Preferências | `remindersEnabled`, `dueRemindersEnabled`, `taskRemindersEnabled`, `reduceMotion`, `currency`, `tripName` | Configuração por utilizador |

Relações entre pilares são opcionais: uma nota pode apontar a uma tarefa; uma tarefa pode guardar uma referência de orçamento/categoria e projeto; um hábito pode ter uma etiqueta de objetivo; finanças e orçamentos usam categoria e âmbito. Não há inferência automática de relações sensíveis.

### Tabelas MySQL/Drizzle

- `users`: identidade Manus (`openId` único), ID numérico, nome, email, método de login, role e datas. O ID numérico é usado como dono das linhas de dados da aplicação.
- `nyvo_user_state`: uma linha por `userId`; `userId` é chave primária e chave estrangeira para `users.id` com cascade, com `schemaVersion`, `revision`, `payload` JSON e `updatedAt`. A estratégia atual armazena o estado dos quatro pilares como snapshot para permitir sincronização/migração atómica simples.
- `nyvo_receipts`: tabela binária separada, com UUID, `userId` proprietário, MIME, tamanho, bytes `MEDIUMBLOB` e data. Os endpoints verificam simultaneamente o ID do recibo e o ID do utilizador autenticado.

A autorização é aplicada na API; os dados JSON não são uma base relacional normalizada por movimento/nota. Se forem necessárias consultas analíticas, colaboração, pesquisa complexa ou volume elevado, deve ser planeada uma migração por entidade.

## 5. Recibos: captura, sincronização e limites

1. A câmara ou galeria fornece a imagem; se a permissão faltar, a pessoa pode continuar sem recibo ou alterar a permissão.
2. O cliente redimensiona para largura máxima de 1600 px e comprime para JPEG, qualidade 0,68. Se necessário, tenta 1200 px e qualidade 0,45.
3. O limite aplicado é **1,5 MiB por recibo**. O cliente mantém uma cópia local e uma cópia base64 pendente até o servidor confirmar o upload.
4. A imagem vai para `nyvo_receipts`, separada do snapshot. O snapshot contém `receiptId` e MIME, nunca o URI local nem base64 temporária.
5. O servidor aceita apenas JPEG, PNG ou WebP, confere base64, tamanho e assinatura real do ficheiro. A API de leitura exige sessão e filtra por proprietário; uma referência pertencente a outra conta é rejeitada.
6. Após a confirmação da gravação do snapshot, bytes de recibos que deixaram de ser referenciados por esse snapshot podem ser apagados dentro da operação de sincronização. A operação de remoção não apaga um recibo ainda referenciado.
7. As imagens descarregadas são guardadas em IndexedDB no Web (`nyvo-private-receipts-v1`) ou no diretório privado da app nativa, associadas a `userId:receiptId`, para consulta offline. Isto é cache local, não uma promessa de cifragem ponta a ponta.

A escolha atual é guardar bytes na própria tabela MySQL, em vez de expor um URL de armazenamento global. É uma opção conservadora para o volume pessoal esperado no MVP; convém reavaliar para grande volume, custo de backup ou requisitos de retenção.

## 6. Arquitetura técnica

```text
App Expo nativa                    Site Expo Web responsivo
  AsyncStorage + SecureStore       localStorage de perfil + cookie + IndexedDB de recibos
            \                       /
             Expo Router / React Native Web
                    | tRPC (superjson)
          Express API, porta 3000
       OAuth · auth · sync · recibos
                    |
        Drizzle ORM / MySQL gerido
        users · nyvo_user_state · nyvo_receipts
```

- **Frontend:** Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript, NativeWind, React Query e tRPC React.
- **API:** Node.js 22 no container, Express 4, tRPC 11, Zod, `superjson`, Drizzle ORM e `mysql2`.
- **Persistência local:** AsyncStorage para `AppData`; SecureStore para token/perfil nativo; IndexedDB para recibos Web; ficheiros no diretório privado da app para recibos nativos.
- **Persistência cloud:** MySQL gerido, com ownership manual obrigatório em cada procedimento.
- **Web/produção:** `expo export --platform web` cria `dist-web`; esbuild produz `dist-server`; Express serve a API e os ficheiros Web no mesmo container/origem. `/api/trpc` é a API; páginas Web usam o fallback SPA. O site usa URL relativa na origem publicada; o telemóvel/Preview usa a URL de API fornecida pelo ambiente.
- **Desenvolvimento:** Metro/Web em `8081`, API em `3000`. Não alterar essas portas do starter.

## 7. Login e segurança

- OAuth Manus é o único método de conta atualmente implementado.
- O fluxo Web começa em `/api/oauth/start`; origens são comparadas com a origem e o par API/Preview esperado. O backend gera nonce aleatório, guarda-o no cookie temporário `nyvo_oauth_state` (HttpOnly, expiração de 5 minutos, caminho `/api/oauth`) e compara-o com o state devolvido antes de trocar o código.
- O cookie de sessão Web chama-se `webdev_app_session`. Em HTTPS/Preview usa `SameSite=None; Secure`; em HTTP local mantém atributos compatíveis com desenvolvimento local. CORS aceita origens configuradas e usa credenciais; não é um `*` aberto.
- Na app nativa, o nonce OAuth é aleatório e guardado temporariamente no SecureStore sob `nyvo.oauth.native-nonce`; o callback compara nonce e redirect URI antes da troca. O token da sessão usa `app_session_token` no SecureStore.
- O perfil em cache usa `manus-runtime-user-info` (localStorage no Web, SecureStore no nativo). É uma cópia de identidade para experiência offline, não prova autónoma de autorização para a API.
- Os procedimentos tRPC de sincronização usam `protectedProcedure` e `ctx.user.id`. O cliente não escolhe o `userId` de destino.
- O endpoint `/api/health` é intencionalmente não autenticado para healthcheck. A API aplica `Cache-Control: private, no-store` em `/api`.
- Não é alegada cifragem ponta a ponta. O armazenamento local usa AsyncStorage/IndexedDB/ficheiros privados do sistema; a app não cifra os snapshots por conta própria. A política de cifragem/backup em repouso da base gerida e a retenção dos seus backups são determinadas pela plataforma e não são inferidas neste documento.
- Logout remove a sessão, mas preserva o cache local da conta. “Limpar cache deste dispositivo” não apaga o snapshot da nuvem. Não existe atualmente uma ação de eliminação completa da conta cloud.
- Não recolher número completo de cartão, CVV ou credenciais bancárias.

## 8. Chaves e variáveis de configuração

**“Chave” aqui significa nome de variável/identificador. Os valores abaixo não são apresentados. Não pedir, colocar em chat, no Git, em `app.config.ts`, em `EXPO_PUBLIC_*` ou no bundle Web os valores de segredos.**

| Nome | Tipo | Finalidade/onde pode aparecer |
|---|---|---|
| `MANUS_PROJECT_ID` | Identificador público do projeto | App ID de OAuth; serializado como `appId` no subset público do Expo |
| `MANUS_OAUTH_PORTAL_URL` | URL pública | Base do portal de autorização Manus; pode estar no bundle público |
| `MANUS_OAUTH_API_URL` | URL/endpoint, não credencial | Endpoint do serviço OAuth; o config Expo também expõe o endpoint, nunca uma senha |
| `DATABASE_URL` | **Segredo** | DSN MySQL, exclusivamente servidor/runtime |
| `MANUS_JWT_SECRET` | **Segredo** | Assinatura de sessão/JWT, exclusivamente servidor/runtime |
| `JWT_SECRET` | **Segredo legado** | Fallback antigo para `MANUS_JWT_SECRET`; evitar em novas configurações |
| `OWNER_OPEN_ID` | Identificador de conta | Pode atribuir role admin ao utilizador correspondente durante o upsert; não substitui o controlo de propriedade por `userId` |
| `BUILT_IN_FORGE_API_URL` | Endpoint | Endpoint dos serviços Manus auxiliares (voz/imagem/dados) no servidor |
| `BUILT_IN_FORGE_API_KEY` | **Segredo** | Chave dos serviços auxiliares; servidor apenas. Não é usada pela sincronização principal de notas/finanças/hábitos/tarefas |
| `EXPO_PUBLIC_APP_ID` | Público | Fallback para o ID de OAuth exposto ao cliente |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Público | Fallback para URL pública do portal OAuth |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | Endpoint público | Fallback para endpoint OAuth |
| `EXPO_PUBLIC_API_BASE_URL` | Endpoint público | URL de API para Preview/nativo; se vazio, o Web publicado usa a mesma origem |
| `EXPO_PUBLIC_OWNER_OPEN_ID`, `OWNER_NAME`, `EXPO_PUBLIC_OWNER_NAME` | Dados/identificadores opcionais | Aliases de compatibilidade usados pelo loader; não são necessários para as funções normais do Nyvo |
| `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL` | Aliases antigos | Fallbacks de ambientes publicados antigos; preferir os nomes `MANUS_*`/`EXPO_PUBLIC_*` canónicos |
| `PORT` | Configuração de runtime | Porta do Express em publicação; 3000 por omissão |
| `NODE_ENV` | Configuração de runtime | Modo Node; não deve decidir sozinho os atributos `Secure`/`SameSite` do cookie |
| `EXPO_PACKAGER_PROXY_URL`, `EXPO_WEB_PREVIEW_URL` | URLs injetadas pela plataforma | Origens CORS/Preview; normalmente fornecidas pelo ambiente gerido |

`app.config.ts` só serializa `appId`, `oauthPortalUrl`, `oauthServerUrl` e `apiBaseUrl`; o código comenta explicitamente que `MANUS_JWT_SECRET` e segredos de servidor não podem entrar nesse objeto. `scripts/load-env.js` lê `.env` sem substituir valores já injetados pelo sistema e mapeia nomes canónicos para aliases Expo. O repositório atual não tinha `.env.example`; foi acrescentado um exemplo sem valores secretos.

## 9. Chaves locais, cookies e endpoints

### Persistência e sessão

- `nyvo.app-data.v2`: cache local guest/legado do Nyvo.
- `viaja.app-data.v1`: chave anterior da aplicação Viaja; a migração preserva a fonte original.
- `nyvo.migration.viaja-app-data-v1`: cópia anterior à migração.
- `nyvo.app-data.v2.recovery-backup` e variantes com sufixo: cópias para recuperação/substituição.
- `nyvo.app-data.v2.user.{userId}`: cache de dados isolado por utilizador.
- `nyvo.app-data.v2.user.{userId}.sync-meta`: revisão, flag `dirty` e associação da conta.
- `nyvo.oauth.native-nonce`: nonce OAuth de uso único em SecureStore.
- `app_session_token`: token nativo em SecureStore; no Web não há token manual, usa-se o cookie.
- `manus-runtime-user-info`: perfil local do utilizador.
- Cookie temporário `nyvo_oauth_state`; cookie de sessão `webdev_app_session`.
- IndexedDB `nyvo-private-receipts-v1`, object store `receipts`; chave composta `userId:receiptId`.

### Rotas/serviços visíveis

- `GET /api/health`: healthcheck público.
- `GET /api/auth/me` e `POST /api/auth/logout`: sessão/perfil e logout.
- `GET /api/oauth/start`, `GET /api/oauth/callback`, `GET /api/oauth/mobile`: fluxo OAuth Web/nativo.
- `/api/trpc`: API tRPC, incluindo `auth.me`, `auth.logout`, `sync.get`, `sync.push`, `sync.uploadReceipt`, `sync.getReceipt` e `sync.deleteReceipt`.
- `GET /`: site Expo Web no container de produção; rotas principais declaradas em `public/manus-routes.json`: `/`, `/finance`, `/notes`, `/habits`, `/tasks`, `/settings`, `/login`, `/onboarding`, `/oauth/callback`. `/dev/theme-lab` é rota de laboratório visual, não item da navegação principal.

## 10. Comandos do projeto

O projeto fixa **pnpm 9.12.0** (Node 22 no Dockerfile). Executar no diretório `/home/ubuntu/viajadesp`.

| Comando | O que faz |
|---|---|
| `corepack enable` | Ativa Corepack para disponibilizar pnpm |
| `corepack prepare pnpm@9.12.0 --activate` | Ativa a versão de pnpm fixada pelo projeto |
| `pnpm install --frozen-lockfile` | Instala as dependências sem alterar o lockfile |
| `pnpm dev` | Arranca API e Expo Web/Metro em conjunto |
| `pnpm dev:server` | Arranca Express/tRPC em `PORT=3000`, com watch via tsx |
| `pnpm dev:metro` | Arranca Expo Web/Metro na porta `8081` |
| `pnpm check` | Verificação TypeScript (`tsc --noEmit`) |
| `pnpm lint` | Lint Expo/ESLint |
| `pnpm test` | Testes unitários Vitest |
| `pnpm build` | Exporta o site Web para `dist-web` e empacota o servidor em `dist-server` |
| `pnpm start` | Inicia o servidor compilado em modo produção; usa `PORT` ou 3000 |
| `pnpm db:push` | Gera e aplica migrações Drizzle; requer ligação DB e altera a base partilhada |
| `pnpm android` | Inicia o Expo para Android |
| `pnpm ios` | Inicia o Expo para iOS |
| `pnpm qr` | Gera o QR através de `scripts/generate_qr.mjs` |
| `pnpm format` | Reescreve ficheiros com Prettier; rever `git diff` antes de guardar |

### Arranque local sugerido

```bash
cd /home/ubuntu/viajadesp
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env   # preencher apenas valores fornecidos/configurados pelo ambiente autorizado
pnpm dev
```

Depois, abrir o Preview Expo/Web servido em `8081`; o servidor API atende em `3000`. Sem `DATABASE_URL` e configuração OAuth válidos, podem funcionar ecrãs/cache local, mas login e sincronização cloud não estarão operacionais.

### Verificação e build

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
PORT=3000 pnpm start
curl -i http://localhost:3000/api/health
```

`pnpm db:push` não é um teste descartável: a base gerida de desenvolvimento e produção é partilhada. Antes de o executar, inspecionar a migração gerada e confirmar que é aditiva e não elimina/altera dados existentes. Não usar dados reais em testes de carga ou validação.

## 11. Design system

- **Cores base:** papel `#F7F5EF`, superfície `#FFFFFF`, texto `#1E2B26`, texto secundário `#718078`, linha `#E8E5DC`.
- **Verde Nyvo:** `#187A61`; variante escura `#105A48`; fundo suave `#E7F2ED`. É a cor principal de ação, continuidade e confiança.
- **Azul:** `#3478A9`, escuro `#235E84`, suave `#EAF2F8`. Apoia informação financeira e sincronização sem competir com o verde.
- **Sinais:** coral `#E27A5E`/erro `#B94B42` para urgência, âmbar `#C89A3C` para pendência, alerta e prioridade média.
- **Tipografia:** sans-serif do sistema para leitura e UI; Georgia/serif para alguns títulos de foco e ecrãs de autenticação.
- **Composição:** cartões de leitura rápida e uma coluna principal; no telemóvel, barra de navegação inferior; no Web com largura a partir de 1024 px, sidebar fixa de 248 px e navegação lateral. O conteúdo principal alarga no browser sem alterar o modelo de ecrã mobile-first.
- **Marca:** `BrandMark` original e wordmark Nyvo; iconografia Material Community Icons. O `logoUrl` do projeto é uma URL HTTPS literal em `app.config.ts`; ícones nativos e favicon são assets locais separados.
- **Interação:** alvos acessíveis, feedback táctil/`HapticTab` quando disponível, calendários para datas, estados de erro/recuperação e redução de movimento configurável. As notificações pedem permissão explicitamente.

## 12. Fontes de dados e integrações

### Dados realmente usados pela aplicação

1. Informação introduzida pelo utilizador nos quatro pilares.
2. Imagens selecionadas da câmara/galeria pelo utilizador.
3. Perfil de sessão devolvido pelo Manus OAuth (ID Manus, nome/email quando disponíveis, método de login e data de sessão).
4. Cache local no dispositivo/navegador e snapshot/recibos na base MySQL gerida, quando o utilizador autentica e confirma a associação/sincronização.
5. Preferências de notificações, moeda, viagem e acessibilidade escolhidas pelo utilizador.

**Não há importação bancária, ligação a cartões, cotação cambial automática, Google Calendar, fonte médica externa, feed de terceiros, OCR ativo nem modelo LLM chamado pelos fluxos atuais.** As integrações de voz/imagem/dados que existem no starter são auxiliares de plataforma e não fazem parte dos fluxos funcionais principais documentados acima.

### Fontes usadas para este dossier

- Requisitos fornecidos pelo utilizador ao longo da conversa (nome Nyvo, quatro pilares, cores verde/azul, calendário, notificações, site + app, login, sync e recibos).
- Código e configuração do projeto: `app.config.ts`, `package.json`, `lib/app-data.tsx`, `lib/design.ts`, `lib/cloud-sync.tsx`, `server/routers.ts`, `drizzle/schema.ts`, `server/_core/*`, `Dockerfile`, `public/manus-routes.json` e ecrãs/componentes referidos neste documento.
- Contratos oficiais do starter Expo e dos serviços geridos Manus usados para definir OAuth, Preview, build, MySQL e operação do container.
- Não foi feita pesquisa Web nem foram adicionadas fontes externas de dados pessoais/financeiros para compor este dossier.

## 13. Não incluído / limitações conhecidas

- Interpretação NLP/voz de registos, OCR de recibos/notas manuscritas, insights preditivos ou conselhos gerados por IA.
- Integração bancária, cartões, pagamentos, importação de extratos e conversão cambial.
- Notificações Web/push para browser; os lembretes existentes são locais no nativo.
- Partilha entre utilizadores, projetos colaborativos, papéis multiutilizador ou resolução de conflitos por merge automático.
- Cifragem ponta a ponta, promessa explícita sobre retenção de backups do fornecedor ou gestão de eliminação total da conta na cloud.
- O armazenamento de bytes em MySQL é adequado ao volume pequeno do MVP; avaliar quota, retenção, backups e crescimento antes de aumentar os limites.

## 14. Estado e decisões pendentes de validação

Em 5 de novembro de 2026, `pnpm check`, `pnpm lint`, `pnpm test` (26 testes) e `pnpm build` concluíram sem erro; o lint emitiu apenas o aviso `MODULE_TYPELESS_PACKAGE_JSON` da configuração ESLint. `GET /api/health` respondeu HTTP 200, `GET /manus-routes.json` serviu JSON válido com 10 rotas e, sem sessão, `GET /api/auth/me` respondeu 401. A migration foi revista e aplicada sem operações destrutivas; uma consulta só de metadados confirmou `users`, `nyvo_user_state` e `nyvo_receipts`. Os nomes das variáveis OAuth/JWT/DB estavam disponíveis no processo gerido deste Sandbox, mas os valores não foram expostos. Continuam por validar um login Manus real, sincronização entre dois dispositivos, build nativo em hardware e publicação do container híbrido. A configuração atual tem publicação automática desligada; a versão cloud não foi publicada.

O domínio reportado numa publicação anterior é `https://viajadesp-djjzgjdt.manus.space`; essa publicação antecede as últimas alterações cloud e **não confirma** que esta versão do código esteja publicada.
