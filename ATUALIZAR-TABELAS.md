# Atualizar as tabelas do ano (todo janeiro)

As calculadoras trabalhistas e de MEI usam valores que mudam todo ano. O ano em uso fica em
`ANO_TABELAS`, no topo de `site-static/calculadoras/calc.js`. Quando o ano vira, o aviso aparece
no começo de cada sessão do Claude, e `pnpm tabelas` lista o que revisar.

Regra de ouro: só troque um número depois de ver o ato oficial publicado. Se ainda não saiu,
deixe as tabelas do ano anterior (as páginas já dizem que é uma estimativa) e tente de novo depois.

## Quando sai cada coisa

| O quê | Onde sai | Quando costuma sair |
| --- | --- | --- |
| Salário mínimo | Decreto no Diário Oficial (in.gov.br) | Últimos dias de dezembro |
| Faixas e teto do INSS | Portaria Interministerial MPS/MF (em 2026: nº 13, de 9/1/2026) | Primeira quinzena de janeiro |
| Tabela mensal do IRRF, dependente, desconto simplificado, redução até R$ 5.000 | Lei ou Medida Provisória; resumo na Receita Federal (gov.br/receitafederal › Tabelas) | Só muda se sair lei nova; confira em janeiro |
| DAS do MEI (5% do salário mínimo + ICMS/ISS) e limite de faturamento | Receita Federal e Portal do Empreendedor | Primeiros dias de janeiro |

## Passo a passo

1. Rode `pnpm tabelas` e anote os arquivos e linhas que citam o ano antigo.
2. Em `site-static/calculadoras/calc.js`, troque: `ANO_TABELAS`, `INSS` (faixas e alíquotas), `IR`,
   `DEPENDENTE`, `SIMPLIFICADO`, a redução em `comReducao` (se a lei mudar), `MEI` e o comentário
   com o número da portaria e das leis.
3. Refaça à mão, com a tabela oficial, os valores esperados em `tests/calculadoras.test.ts`
   (INSS de 1 salário mínimo, de R$ 3.000 e acima do teto; IR de R$ 5.000, R$ 6.000 e R$ 8.000; 13º; DAS).
   Não copie o resultado da calculadora para o teste: o teste existe para conferir a conta.
4. Nas páginas listadas no passo 1: título e descrição com o ano novo, valores citados no texto
   (salário mínimo, teto do INSS, faixas), perguntas frequentes e o JSON-LD.
   Datas de "atualizado em" de anos passados podem ficar como estão.
5. Atualize `<lastmod>` dessas páginas em `site-static/sitemap.xml` e suba a versão do cache em `site-static/sw.js`.
6. Troque "valem para 2026" no `CLAUDE.md` pelo ano novo.
7. `pnpm check`, `pnpm test`, `NYVO_BASE_URL=/D-Conta/app pnpm build:site`, confira as páginas no navegador
   e faça commit com `docs/` inteiro.

Páginas acompanhadas pelo teste `tests/tabelas.test.ts` (lista em `scripts/check-tabelas.mjs`):
se `ANO_TABELAS` mudar e alguma delas não citar o ano novo, o teste falha.
