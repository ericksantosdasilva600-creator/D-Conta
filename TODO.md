# Entregas do Nyvo

## Estratégia aprovada

- [x] O plano aprovado cobre os quatro pilares — Anotações, Finanças Pessoais, Hábitos & Saúde, Atividades & Tarefas —, as ligações opcionais entre eles, o dashboard, stack, privacidade/LGPD, casos de uso futuros de IA e roadmap.
- [x] A primeira V1 foi local-first: sem conta, sincronização ou integração real de IA. Esta direção inicial foi depois substituída pela fase híbrida aprovada; os fluxos atuais continuam locais-first e sincronizam apenas depois de autenticação/associação explícita.
- [x] Linguagem natural/voz, OCR de recibos/faturas/notas manuscritas, insights preditivos, cartões avançados e metas financeiras permanecem evolução posterior; a sincronização cloud deixou de ser backlog e foi aprovada nesta fase híbrida.

## Identidade, integração inicial e navegação

- [x] Apresentar o nome **Nyvo** na configuração Expo, nos ecrãs, onboarding e ícones; atualizar metadados da marca sem alterar `appSlug`, scheme, `iosBundleId` ou `androidPackage` existentes.
- [x] Atualizar o onboarding para explicar Anotações, Finanças, Hábitos & Saúde e Tarefas; informar que os dados ficam primeiro no dispositivo, sincronizam após login e confirmação, e continuam disponíveis localmente sem internet.
- [x] Disponibilizar Resumo e acesso direto às quatro áreas — Anotações, Finanças, Hábitos & Saúde e Tarefas — e manter Definições acessíveis através de um botão no cabeçalho, sem adicionar uma aba de consultoria.
- [x] Incluir a ação principal **Adicionar**, permitindo escolher explicitamente nota, movimento financeiro, hábito/registo de saúde ou tarefa, e abrir um formulário simples, editável e sem classificações obrigatórias.
- [x] O Resumo apresenta um cockpit compacto: uma ação principal e quatro cartões, no máximo um indicador útil por pilar, com links diretos, sem grelha densa ou excesso de métricas.

## Anotações

- [x] Permitir criar, consultar, editar, eliminar, pesquisar e ordenar localmente notas com título e conteúdo; etiquetas e ligações a tarefa/projeto são opcionais e não bloqueiam a gravação.

## Finanças Pessoais

- [x] Permitir registar, consultar, editar e remover despesas e receitas com categoria, moeda, data, notas, prioridades, filtros, pesquisa, gráficos, recibos e vencimentos; a captura/seleção de imagem tem alternativa manual quando a permissão é recusada.
- [x] Preservar categorias predefinidas e personalizadas, sugestões rápidas contextuais, prioridade baixa/média/alta, gráficos financeiros, seleção de data por calendário e lembretes locais de vencimento.
- [x] Separar os movimentos em **Pessoal** e **Viagem**; novos movimentos pertencem por defeito a **Pessoal**, podem ser associados a **Viagem** e todos os movimentos antigos ficam associados a **Viagem** após migração.
- [x] Preservar em cada movimento antigo ID, valor, data, categoria, estabelecimento/origem, estado, prioridade, vencimento, notas e recibo, mantendo a preferência global de moeda; apresentar fluxo de caixa local e orçamentos mensais simples por categoria/grupo sem duplicar movimentos nem totais derivados.
- [x] Manter gestão avançada de cartões/metas e integrações bancárias fora da V1; nunca recolher número completo do cartão ou CVV.

## Hábitos & Saúde

- [x] Preservar criação, consulta, edição, arquivo, prioridade, dias/horas de lembrete, checklist diária, histórico dos check-ins e notificações locais; continuar a permitir o uso da checklist se a permissão de notificações for recusada.
- [x] Acrescentar registos locais de hidratação por quantidade/data e registos de treino/atividade física, leitura e estudo com tipo/data/duração; permitir consultar e corrigir os registos, sem diagnóstico ou aconselhamento clínico.
- [x] Permitir associar uma rotina a um objetivo como relação opcional, sem criar metas obrigatórias nem alterar o histórico de check-ins existente.

## Atividades & Tarefas

- [x] Permitir criar, consultar, editar, concluir/reabrir e eliminar tarefas com estados **Backlog**, **Próxima**, **Em curso** e **Concluída**, prioridade e data de vencimento opcional.
- [x] Disponibilizar vistas simples do backlog e dos próximos prazos, com pesquisa/filtragem útil e lembretes locais apenas quando escolhidos pelo utilizador.
- [x] Permitir acrescentar notas, etiqueta/projeto e ligação a categoria de orçamento como opções; remover uma ligação não elimina registos nem altera movimentos financeiros.

## Ligações entre os pilares

- [x] Permitir, por ação explícita e reversível, associar uma nota a uma tarefa existente, associar uma tarefa a uma categoria orçamentária e ligar uma rotina a um objetivo; não inferir relações sensíveis por data, não exigir classificação e não criar conteúdo ou movimentos duplicados.

## Persistência, migração, privacidade e estados

- [x] Migrar o formato local atual `viaja.app-data.v1` para o esquema Nyvo versionado, com cópia recuperável anterior à conversão, operação idempotente e verificação da leitura nova; manter intactas as cópias antigas e anexos durante a recuperação.
- [x] Preservar os movimentos antigos sob **Viagem**, incluindo todos os campos e recibos; conservar hábitos, IDs, dias/horas de lembrete e histórico de check-ins; dados vazios, parciais, inválidos ou já migrados não podem ser substituídos silenciosamente por dados vazios.
- [x] Manter os fluxos existentes de finanças, recibos, checklist, prioridade, definições e notificações locais disponíveis offline; comunicar armazenamento local-first, sincronização após login/associação, estado de ligação e limitações de recuperação.
- [x] Cobrir também dashboard, notas, registos de saúde, orçamento e tarefas com estados acessíveis de carregamento, vazio, offline, sucesso, erro e recuperação; as ações locais não dependem de rede.
- [x] A autorização do sistema para notificações permanece independente das preferências internas; os lembretes e vencimentos continuam visíveis na aplicação quando a permissão falta.
- [x] Limitar dados recolhidos ao necessário, permitir correção/eliminação local e não guardar credenciais, tokens ou chaves em `AsyncStorage`; não apresentar o armazenamento atual como cifrado.

## IA e versões posteriores

- [x] Não integrar chamadas reais de IA nem enviar conteúdo pessoal a terceiros na V1; o processamento por nuvem exige aprovação e consentimento contextual.
- [ ] Numa fase posterior e aprovada, interpretar entradas de texto/voz como “gastei 45 no mercado hoje”, propor destino e campos estruturados com pré-visualização editável, confiança por campo e confirmação explícita; perguntar quando houver ambiguidade e conservar a alternativa manual.
- [ ] Numa fase posterior, avaliar OCR de recibos fiscais/faturas de cartão e digitalização de notas manuscritas; mostrar imagem e extração lado a lado, realçar incerteza e nunca gravar/alterar valores financeiros sem confirmação.
- [ ] Numa fase posterior, avaliar alertas opt-in de estouro de orçamento, queda de produtividade/consistência e relações entre hábitos e energia/rendimento; explicar período/dados, limitar frequência, permitir desligar/dispensar e não apresentar correlação como causalidade ou diagnóstico.
- [ ] Avaliar primeiro processamento local leve; qualquer LLM/OCR em nuvem requer consentimento, minimização, retenção definida, fornecedor avaliado, alternativa manual/local e tratamento LGPD adequado.
- [x] A decisão de fase posterior para conta, API/banco remoto e sincronização multi-dispositivo foi substituída pelo plano híbrido aprovado nesta fase; gestão avançada de cartões/metas e integrações bancárias continuam fora do escopo atual.

## Retenção

- [x] Usar sequências, métricas de execução diária e micro-recompensas como feedback opcional e não punitivo; permitir retomar após uma pausa, sem rankings ou mensagens de culpa.

> A V1 Nyvo foi verificada por TypeScript, lint, `git diff --check`, export estático Expo Web, respostas HTTP 200 do Expo/API e ensaio sintético em memória de migração válida/inválida — sem aceder ao AsyncStorage real. Câmara, notificações do sistema e migração no armazenamento de um telemóvel ainda dependem de validação em dispositivo físico. IA e integrações listadas acima permanecem backlog intencional.


## Fase híbrida aprovada — critérios abertos (substitui o backlog de sync acima)

A decisão anterior “sincronização multi-dispositivo em fase posterior” está substituída pela aprovação do modelo **site + app, login e sincronização na nuvem**, incluindo imagens de recibos. O caráter local-first/offline continua obrigatório.

### Site, conta e sessão

- [x] Disponibilizar a mesma aplicação como app Expo nativa e site Web responsivo que funcione em notebook e telemóvel; usar navegação lateral em ecrãs largos e navegação inferior em telemóvel, preservando os quatro pilares e o cockpit já aprovados.
- [x] Reutilizar Manus OAuth no site e no app; até a sessão real ser validada, apresentar estado não autenticado. Permitir logout e não criar login por palavra-passe nem utilizador de demonstração. (Código fail-closed implementado; login com conta real ainda não foi testado.)
- [x] Manter cookie de sessão `webdev_app_session`; em HTTPS Preview, usar `SameSite=None; Secure`, sem decidir esses atributos a partir de `NODE_ENV` ou do protocolo interno do servidor.
- [x] Isolar a cache local por conta. Depois de mudar de conta no mesmo dispositivo, não apresentar nem sincronizar registos da conta anterior; logout preserva a cache local daquela conta.
- [x] Atualizar onboarding/Definições para explicar conta, sincronização, modo offline e estado da ligação; conservar as categorias predefinidas **Salário**, **Bonificação** e **Saúde**, a identidade verde/azul e o calendário tátil.

### Dados remotos e conflito

- [x] Acrescentar apenas tabelas Drizzle novas ao MySQL gerido: uma linha `nyvo_user_state` por `userId` com `schemaVersion`, `revision`, payload JSON e `updatedAt`; tabela separada `nyvo_receipts` com ID, `userId`, tipo MIME, tamanho, bytes e data. Não apagar nem alterar os registos existentes. Migration aditiva revista e aplicada; catálogo confirma as tabelas `users`, `nyvo_user_state` e `nyvo_receipts`.
- [x] Criar procedimentos tRPC protegidos para obter/gravar o estado e carregar/consultar/apagar recibos. Derivar o dono da sessão validada no servidor; todas as operações de leitura, escrita e eliminação verificam `userId` no backend.
- [x] Usar uma revisão esperada nas gravações. Se dois dispositivos alterarem versões diferentes, não sobrescrever automaticamente; permitir **usar a versão da nuvem** ou **manter a versão deste dispositivo** e guardar uma cópia local recuperável antes de substituir conteúdo.
- [x] Após login, descarregar os dados remotos ou pedir escolha explícita antes de associar à conta os dados locais já existentes. Manter a origem local até o servidor confirmar a cópia; uma falha nunca pode converter uma conta com dados num perfil vazio.
- [x] Com rede disponível, enviar alterações locais com debounce e atualizar a nuvem ao retomar/reconectar. Offline, permitir criar/editar/consultar/apagar dados localmente e manter alterações numa fila até sincronizar.
- [x] Apresentar os estados textuais **Sincronizado**, **A sincronizar**, **Sem ligação**, **Conflito** e **Erro**; em erro, preservar o cache e disponibilizar nova tentativa.

### Imagens de recibos

- [x] Sincronizar imagens de recibos entre site e app, comprimindo cada ficheiro para no máximo **1,5 MB**; guardar bytes numa tabela separada do snapshot e referências remotas por `receiptId`.
- [x] Servir imagem remota apenas por API autenticada ao proprietário; não expor caminhos/URLs de armazenamento global nem permitir que um utilizador consulte recibos de outra conta.
- [x] Manter imagens locais utilizáveis offline e numa fila pendente quando a ligação falhar; não apagar a cópia local antes da confirmação do servidor e da referência no movimento financeiro.
- [x] Ao remover um recibo, apagar os bytes acessíveis na linha da aplicação. Se um recibo local legado não puder ser lido, manter o movimento e avisar que a imagem tem de ser anexada novamente.

### Serving e limites operacionais

- [x] Servir a exportação Expo Web e API Express/tRPC no mesmo container/origem; o Web usa caminhos relativos, o app nativo usa a URL de API fornecida pelo ambiente, e o healthcheck é público/não autenticado. Build, healthcheck e smoke test local passaram; deployment declarado, mas publicação ainda pendente.
- [x] Respeitar `PORT` de publicação (3000 por defeito) e não mudar as portas Mobile de desenvolvimento Metro `8081` / API `3000`.
- [x] Na exportação estática Web, omitir o endpoint API transitório e os segredos; usar API relativa à mesma origem e verificar o bundle final.
- [ ] Preparar o build nativo através do Dashboard; validar recursos exclusivos do dispositivo em hardware real.
- [x] Antes de aplicar migrações, rever SQL e confirmar que são aditivas. O MySQL de desenvolvimento e produção é o mesmo: usar verificações estáticas e dados sintéticos fora dessa base, sem gravar/apagar registos reais para teste. A migration aplicada só criou tabelas/chaves; os testes não escreveram dados de utilizadores.
- [x] Manter tokens e chaves fora de AsyncStorage e do bundle Web; apresentar segurança como autorização/TLS da aplicação, sem alegar cifragem ponta a ponta ou garantia de eliminação de cópias de backup do fornecedor.


## Validação/pendências do estado atual — 5 de novembro de 2026

- [x] `pnpm check`, `pnpm lint`, `pnpm test` (31 testes) e `pnpm build` concluíram sem erro; o lint reporta o aviso `MODULE_TYPELESS_PACKAGE_JSON` da configuração ESLint e o sanitizador limpa a configuração API serializada pelo Expo.
- [x] Smoke test do container local: páginas Web e `GET /api/health` responderam HTTP 200; `GET /manus-routes.json` serviu JSON com 10 rotas. Sem sessão, `GET /api/auth/me` respondeu 401, sem autenticar nem expor dados.
- [x] A varredura do bundle Web final não encontrou o endpoint de Preview nem credenciais de servidor.
- [x] A migration aditiva foi revista e aplicada; a verificação de metadados confirmou `users`, `nyvo_user_state` e `nyvo_receipts`.
- [ ] Validar o fluxo Manus OAuth com uma sessão real e sincronização real entre dois dispositivos; não foram criados utilizadores ou registos sintéticos na base partilhada.
- [ ] Publicar o container híbrido e confirmar o domínio/healthcheck de produção. A declaração já aponta para `Dockerfile` e `/api/health`; a publicação automática está desligada e esta alteração ainda não foi publicada.
- [ ] Preparar o build nativo no Dashboard e validar câmara, notificações, haptics e deep links num dispositivo físico.
