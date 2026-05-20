---
title: "Gate de paridade com referencia externa deve ser TESTE, nao doc"
category: processo
tags: [parity, gate, regression-test, andre-port, populate-plan, anti-drift]
created: "2026-05-19"
---

## Problem

PRD `populate-plan-andre-port` (2026-05-19) revelou que o `/init` antigo produzia
populate-plans com fases ausentes para docs criticos (PRODUCT_SENSE, README, AGENTS,
.claude/CLAUDE.md) — exclusao silenciosa em `EXCLUDED_FROM_POPULATION_V2` + cobertura
incompleta no `TEMPLATE_MANIFEST`. Comparativo com `harness-engineering` + `compound-engineering`
do Andre rodando lado-a-lado no projeto Carreirarte mostrou que o output dele cobria
13 docs ricos enquanto o nosso parava em 7 docs com stubs `TBD`.

Diagnostico foi mecanico (lista de docs, instrucoes LLM, paths candidatos), mas o
risco real e RECORRENCIA: alguem futuro pode readicionar entry em
`EXCLUDED_FROM_POPULATION_V2` por "limpeza", ou esquecer de adicionar instrucao
imperativa para novo doc canonico, e a regressao passa silenciosa porque doc-only
gates (ex: "siga o checklist em docs/PRODUCT_SENSE.md") sao ignorados em PR review.

**Custo do gate-em-doc:** docs decaem. Comentario `<!-- nunca diminuir -->` no
`populate-plan-generator.ts` daria sinal fraco — primeira pessoa que precisar
remover entry para fix urgente comenta o comentario e segue. Ninguem ve.

**Padrao observado em outros pontos do plugin:**
- D14 do PRD anterior mantinha `docs/PRODUCT_SENSE.md` em `EXCLUDED_FROM_POPULATION_V2`
  com comentario `// D14 mantem filosoficos sem populate`. Comentario fica, decisao envelhece,
  resultado e doc vazio quando deveria ter sido populado.
- Golden snapshot do `init-greenfield.stdout.txt` referenciava steps removidos do PRD
  `knowledge-path-cutover` — MEMORY.md raiz registrava "regenerar golden no Plano 05 fase-04"
  como TODO informal. Esqueceu por 2 sprints.

## Solution

PRD `populate-plan-andre-port` adotou gate **mecanico + claro + revisao humana** em 3 camadas:

1. **Gate mecanico (CA-04 do PRD):** `tests/e2e/populate-plan-parity.test.ts` assertando
   `plan.phases.length >= 12` + `EXCLUDED_FROM_POPULATION_V2` nao contem PRODUCT_SENSE/README +
   cada `LLM_INSTRUCTION` satisfaz `isImperativeInstruction()` + Next.js+Supabase tem >= 3 paths
   reais em SECURITY/ARCHITECTURE/RELIABILITY. Build quebra se qualquer assert falhar.

2. **Mensagem clara (CA-07 do PRD):** quando o gate quebra, o assert emite mensagem
   `... esperado X, encontrado Y. Verifique {causa provavel}. Ver PRD secao MH-N.`
   em vez de `Expected 12, got 11`. Regressor le exatamente o que removeu + onde
   encontrar o "por que" original.

3. **Aprovacao humana explicita (CA-08 do PRD):** `tests/e2e/__golden__/populate-plan-andre-parity.md`
   captura estrutura minima. Mudancas no output exigem `UPDATE_GOLDENS=1` para regerar — o diff
   aparece no PR e precisa de approve humano explicito. Nao tem auto-update silencioso.

## Prevention

> Quando o codigo importa paridade com uma referencia externa (Andre, biblioteca madura,
> protocolo, contrato API), o gate de paridade DEVE ser teste mecanico, nao comentario nem doc.
>
> - Doc-only gate: 0/3 protecoes. Confia em PR review consistente — improvavel.
> - Schema lint: 1/3 protecoes. Cobre estrutura, nao cobertura.
> - Teste mecanico + mensagem clara + golden com diff humano: 3/3 protecoes.
>
> Aplicar a qualquer ponto do plugin onde "paridade com referencia" importa: portagens
> de skills externas, espelhamento de schemas, compatibilidade com upstream APIs.

## Evidencia

- Test gate mecanico: `tests/e2e/populate-plan-parity.test.ts`
- Golden snapshot com diff humano: `tests/e2e/__golden__/populate-plan-andre-parity.md`
- Audit log de cobertura (observability): `skills/init/lib/populate-plan-coverage.ts` (`docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected`)
- PRD original com CA-04/CA-07/CA-08: `docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md`

## Pontos do plugin onde a regra deve ser aplicada (gaps conhecidos)

- **`tests/e2e/__golden__/init-greenfield.stdout.txt`**: golden ja existe. Reativar testes
  skipados em `init-cutover-greenfield.test.ts` (feito em Plano 05 fase-06). Protege regressao
  da estrutura do `/init` greenfield.
- **Subagent contract validators**: `tests/e2e/subagent-contract.test.ts` deveria ter golden
  do output esperado por subagent_id. Hoje verifica estrutura — nao cobertura.
- **Stack knowledge format** (`.claude/knowledge/{stack}/INDEX.md`): contrato definido em
  V6.6.0 `knowledge-path-cutover` PRD. Test parity equivalente seria valioso — iteracao futura.
