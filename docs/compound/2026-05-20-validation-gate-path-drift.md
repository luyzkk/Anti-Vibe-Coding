---
title: "Validation gate path drifted from producer path — silent abort hidden for weeks"
category: processo
tags: [validation-gate, path-contract, producer-consumer, silent-failure, test-skip-debt, init-pipeline]
created: "2026-05-20"
---

## Problem

`/init` Step 90 (`90-final-validation.ts`) tinha um gate bloqueante que verificava
`.claude/knowledge/{stack}/INDEX.md` para abortar em greenfield se a stack foi detectada mas o
knowledge nao foi copiado. O producer (`copyKnowledge` chamado via `run-stack-knowledge-init.ts`)
copia o conteudo de `knowledge/{stack}/` **diretamente para `.claude/knowledge/`** — sem criar
subdiretorio nomeado pela stack. O INDEX.md real fica em `.claude/knowledge/INDEX.md`, nao em
`.claude/knowledge/{stack}/INDEX.md`. Resultado: o gate **sempre** disparava AbortError em
greenfield apos detecao de stack.

O teste E2E que pegaria isso (`init-cutover-greenfield.test.ts`, 2 testes de golden) foi
**skipado** em sprint anterior (Plano 01 fase-05 do PRD `knowledge-path-cutover`), depois
**unskipado** em sprint seguinte (Plano 05 fase-04 do mesmo PRD antigo) com nota "test.skip
removido — regenerar golden" mas o golden nao foi regenerado. Tests passaram a falhar como
"baseline pre-existente" e ficaram 7 semanas mascarados na contagem de fails.

A descoberta veio acidentalmente no Plano 05 fase-06 deste PRD (`populate-plan-andre-port`),
ao tentar regenerar os goldens — o subagente seguiu a falha real ao inves de aceitar como
baseline e encontrou o bug do gate.

**Custo do drift silencioso:**
- 7+ semanas com `/init` greenfield abortando em condicoes normais — qualquer usuario que rodasse
  o init num projeto greenfield com stack detectavel encontrava o abort.
- 3 testes E2E falhando continuamente, normalizados como "baseline" — efeito psicologico de
  "fails sao sempre aceitos" que mascara regressoes futuras.
- Bug so foi pego durante outra feature (`populate-plan-andre-port`), por acidente do escopo.

## Solution

Plano 05 fase-06 do PRD `populate-plan-andre-port` (commit `8355829`):

1. Corrigido path no gate (`skills/init/lib/steps/90-final-validation.ts:53`):
   `path.join(cwd, '.claude', 'knowledge', primary, 'INDEX.md')` →
   `path.join(cwd, '.claude', 'knowledge', 'INDEX.md')`.
2. Mensagem do AbortError ajustada para refletir path real.
3. Comentario inline adicionado linkando ao producer (`copyKnowledge`) para que futuras leituras
   nao confundam a estrutura.
4. Teste unitario atualizado para refletir path correto + golden regenerado para fluxo greenfield
   completo (sem abort).

## Prevention

> Quando um Step de validacao bloqueante verifica path produzido por outro Step (producer/consumer
> entre steps), ESSE path deve estar coberto por **contract test** que linka producer-consumer.
> Path string-literal duplicado em 2 lugares = drift inevitavel.

**Padroes acionaveis:**

1. **Path como constante exportada:** o producer (`copyKnowledge` / `run-stack-knowledge-init.ts`)
   deve exportar a constante de path destino. O consumer (`90-final-validation.ts`) importa a
   mesma constante. Drift impossivel (compile-time).

2. **Contract test E2E nao-skipavel:** se um teste E2E que cobre producer→consumer for skipado,
   **nao mergear** o skip ate o problema raiz estar resolvido. Comentario `// regenerar golden`
   sem follow-up vira debt — registrar como `TODO(skip-N):` com prazo no STATE.md ou abrir issue.
   "test.skip + comentario depois" eh proxy para "nunca". 

3. **Fails baseline com lifetime:** quando uma feature aceita "N fails pre-existentes",
   listar quais sao + data + razao. Apos 30 dias sem fix, escalar ou criar plano dedicado.
   Sem isso, o numero N cresce monotonicamente e novas regressoes se misturam.

4. **Discovery acidental como sinal:** o bug foi achado em outra feature, "por acaso". Isso
   indica falta de cobertura na area — nao "sorte" do reviewer. Quando descoberta de bug eh
   acidental, considerar adicionar coverage que teria pego sozinho.

## Evidencia

- Bug fix: `skills/init/lib/steps/90-final-validation.ts:53` (commit `8355829`)
- Test ressuscitado: `tests/e2e/init-cutover-greenfield.test.ts` (5/5 verde apos fix)
- Golden regenerado: `tests/e2e/__golden__/init-greenfield.stdout.txt`
- Producer canonico: `skills/init/lib/run-stack-knowledge-init.ts` linha 103 (leitura do preview)
- Validador consumer: `skills/init/lib/steps/90-final-validation.ts`
- Plano de descoberta: `docs/exec-plans/completed/2026-05-19-populate-plan-andre-port/plano05/fase-06-regenerar-goldens.md`

## Pontos do plugin onde a regra deve ser aplicada

- **Outros gates pos-init que checam paths de output:** auditar `skills/init/lib/steps/9*.ts`
  para identificar outros checks de path. Cada um precisa de contract test producer-consumer.
- **`docs/exec-plans/active/` vs `completed/` moves:** `exec-plan-mover.ts` move arquivos por
  basename. Se algum step gerar pasta vs arquivo, drift similar e possivel. Cobertura existe
  via `exec-plan-mover.test.ts` — confirmar que cobre folder-vs-file.
- **Subagent contract output paths:** `INIT_SUBAGENT_IDS` mapeia IDs a paths esperados.
  Drift entre ID e path eh categoria similar — verificar `subagent-contract.test.ts`.
