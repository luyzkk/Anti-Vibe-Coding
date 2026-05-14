# Plano 05: Validacao Final + Harness + Unlock /init

**Feature:** v6.1.0 — Contrato de Subagentes v1 ([PLAN overview](../PLAN.md), [PRD](../PRD.md))
**Fases:** 5
**Sizing total:** ~4h
**Depende de:** Plano 04 (4 orquestradores limpos via `parseAndDispatch()`, fixtures e2e do verify-work consolidadas, helper `withRetry` extraido)
**Desbloqueia:** Merge to main, release v6.1.0, /init migration-mode (`docs/exec-plans/active/2026-05-14-init-migration-mode/`) liberado para iniciar

---

## O que este plano entrega

Fecha o ciclo: `scripts/harness-validate.ts` ganha check de prompts contrato v1 em `agents/*.md`, pre-commit hook ativa o validador local, PRD do `/init` confirma `requires: [v6.1.0-subagent-contract]`, suite `bun test agents:contract` entra no CI cobrindo as 13 fixtures, entrada `## [6.1.0]` no CHANGELOG com link ao ADR, compound note se padrao durar e merge to main da branch isolada. Saida: tag `v6.1.0` em main, /init desbloqueado, sem release intermediario publico (PRD §DoD).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 13 agentes emitindo envelope v1 (`agents/*.md` com `contract_version`, `kind`, `status`, `reasoning`, `payload`) | Plano 03 fase-05 | bloqueador — fase-01 deste plano regex contra os prompts |
| 13 fixtures verdes (`agents/__fixtures__/{nome}/{input.json,expected-output.json}`) | Plano 03 fase-05 | bloqueador — fase-04 deste plano coloca no CI |
| 4 orquestradores limpos de parsing custom (`parseAndDispatch()` no caminho quente) | Plano 04 fases 01-04 | bloqueador — sem isso CHANGELOG nao pode listar breaking change |
| `skills/lib/subagent-contract.ts` (`parseContract`, `parseAndDispatch`, `withRetry`, secret-pattern, threshold reasoning) | Plano 01 fase-04 + Plano 04 fase-01 | bloqueador |
| ADR-0002 commitada em `docs/design-docs/` + doc canonico `docs/design-docs/subagent-contract-v1.md` | Plano 01 fases 01-02 + Plano 02 fase-04 (migration guide destilado) | bloqueador — CHANGELOG e harness-validate referenciam |
| JSON schema `agents/_contract/v1.schema.json` (oneOf por kind) | Plano 01 fase-03 | bloqueador — citado no validador da fase-01 |
| Branch isolado `feat/v6.1.0-subagent-contract` (ou similar) com Planos 01-04 mergeados localmente | Planos 01-04 | bloqueador — fase-05 faz merge to main daqui |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `scripts/harness-validate.ts` com check de contrato em `agents/*.md` | CI (`.github/workflows/harness.yml`) ja roda — passa a falhar se prompt regredir; PRs futuros que adicionarem agent novo precisam declarar contrato v1 |
| Pre-commit hook ativo via `prepare` script no `package.json` | Devs locais que editam `agents/*.md` — hook bloqueia commit sem contrato v1 |
| Entrada CHANGELOG `## [6.1.0]` com breaking changes + link ADR + reservation v6.2 | `/init` migration mode (PRD em `docs/exec-plans/active/2026-05-14-init-migration-mode/`) — usa contrato v1 como base para Reconciler/Explorer/Compound |
| Tag `v6.1.0` em main + branch isolada mergeada | release publico (PRD §DoD: sem release intermediario; este e o primeiro publico desde v6.0.0) |
| Compound note (se justificavel) em `docs/compound/{YYYY-MM-DD}-reasoning-forca-fora-do-schema.md` | sessoes futuras que questionarem "por que reasoning obrigatorio" — argumento durador |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-harness-validate-extension.md | `scripts/harness-validate.ts` ganha `checkAgentContracts()` — regex rapida contra `agents/*.md` confirma que cada prompt instrui emissao de contrato v1 (`contract_version`, `kind`, `status`, `reasoning`, `payload`) | 1h | Plano 03 fase-05 |
| 02 | fase-02-pre-commit-hook.md | Husky leve instalado via `bun install` (`prepare` script no package.json) + hook em `.husky/pre-commit` que roda `bun run harness:validate` quando algum `agents/*.md` esta staged | 0.5h | fase-01 |
| 03 | fase-03-init-prd-update.md | `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` confirmado com `requires: [v6.1.0-subagent-contract]` no frontmatter; secao §Dependencias inclui nota explicita "Reconciler/Explorer/Compound declarem `kind` e emitem envelope v1"; CA-08 satisfeito | 0.5h | — (independente das outras) |
| 04 | fase-04-fixtures-regression-ci.md | `.github/workflows/harness.yml` (ou novo `agents-contract.yml`) roda `bun test agents:contract` apos `bun run harness:validate`; script `agents:contract` em package.json mapeia para `bun test tests/agents-contract/`; 13 fixtures verdes em CI | 1h | fase-01 (CI ja confia no validador) + Plano 03 fase-05 |
| 05 | fase-05-changelog-compound-merge.md | Entrada `## [6.1.0]` em CHANGELOG.md com Breaking Changes (parsing markdown por-agente removido nos 4 orquestradores), Added (contrato v1 + 13 fixtures + harness check + pre-commit), Deprecated (nada — big-bang), link ao ADR-0002, reservation `v6.2 — spec real do mutation payload`; avaliacao compound note (criar so se padrao real emergiu no MEMORY dos planos 01-04); merge squash to main; tag `v6.1.0` | 1h | fase-01, 02, 03, 04 todas verdes |

**Sizing total:** 1 + 0.5 + 0.5 + 1 + 1 = **4h** — alinhado com overview.

---

## Grafo de Fases

```
fase-01 (harness-validate ext)      fase-02 (pre-commit hook)
        \                                    /
         \                                  /
          +-------- (paralelas) ----------+
                          |
                          v
                fase-04 (fixtures + CI)            fase-03 (init PRD update — independente)
                          \                                /
                           \                              /
                            +-------- (sintese) ---------+
                                        |
                                        v
                            fase-05 (CHANGELOG + compound + merge to main)
```

**Paralelismo possivel:**
- **fase-01 e fase-02 em paralelo:** independentes — fase-01 toca `scripts/harness-validate.ts`, fase-02 toca `package.json` + `.husky/`. Sem conflito de arquivo.
- **fase-03 totalmente independente:** edita PRD de outro feature; pode rodar a qualquer momento, ate antes do Plano 01. Sequenciado aqui por afinidade tematica (unlock /init e parte do encerramento).
- **fase-04 depende de fase-01:** o `harness:validate` no CI ja chama o novo check da fase-01; rodar fase-04 antes pode quebrar CI.
- **fase-05 sintetiza:** so roda quando 01-04 todas verdes + Planos 01-04 verdes + `bun run test && bun run lint && bun test agents:contract` verde local.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: rodar comando-alvo, esperar falha especifica
   - fase-01: bun run harness:validate => falha "agent X nao instrui contract_version"
   - fase-02: editar agents/security-auditor.md removendo "contract_version" => git commit deve bloquear
   - fase-03: grep no PRD do /init confirma `requires: [v6.1.0-subagent-contract]` ja presente
   - fase-04: workflow CI roda agents:contract e passa 13/13
   - fase-05: grep CHANGELOG.md por "[6.1.0]" => match
2. GREEN: implementar o codigo/config minimo
3. VERIFY: bun run harness:validate && bun run compound:check && bun test agents:contract && bun run test && bun run lint
```

**Tracer Bullet deste plano:** **N/A** — tracer bullet foi entregue no Plano 01 fase-05 (`security-auditor` migrado E2E). Este plano consolida e amarra. Justificativa: tracer bullet faz sentido quando o slice fino prova viabilidade de uma arquitetura nova; aqui ja temos 13 agentes + 4 orquestradores em producao na branch isolada — falta apenas: (a) blindar regressao (harness + hook + CI), (b) atualizar dependentes (init PRD), (c) anunciar (CHANGELOG, merge). Sao tarefas de fechamento, nao de exploracao.

Para fases sem testes TS automatizados (fase-03, fase-05), o "teste" e verificacao por comando shell:
- fase-03: `grep -A1 "^requires:" docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` mostra `[v6.1.0-subagent-contract]`
- fase-05: `grep "^## \[6.1.0\]" CHANGELOG.md` retorna 1 match; `git log --oneline -5` mostra commit de merge em main; `git tag --list "v6.1.0"` retorna `v6.1.0`.

---

## Gotchas Conhecidos

Herdados dos Planos 01-04 onde relevantes. **Maioria nao aplica** porque este plano nao parsa output de subagente nem invoca LLM. Foco nos especificos.

### Herdados (aplicacao limitada)

- **G1 (LLM emite JSON malformado):** **NAO se aplica.** Este plano nao parsa output de subagente em runtime. Apenas valida prompts estaticos (`agents/*.md`).
- **G2 (lifecycle vs domain_status):** Aplica-se indiretamente — entrada de CHANGELOG fase-05 menciona os 2 eixos como Decision do PRD. Texto do release notes deve esclarecer distincao para upgraders, nao confundir.
- **G-P04-XX (orquestradores):** Nao se aplicam — orquestradores ja foram migrados.

### Novos deste plano

- **G-P05-01 (harness-validate roda em CI — extensao precisa ser rapida):** `checkAgentContracts()` da fase-01 deve usar **regex linha-por-linha**, NAO parse YAML completo de cada `agents/*.md`. Cada arquivo tem ~50-200 linhas; 13 arquivos => ~1500 linhas no pior caso. Regex direto: <50ms total. Parse YAML inteiro seria desnecessario — o prompt nao tem YAML estrito, e markdown com bloco de exemplo JSON inline. Falha de regex == erro claro com **caminho do arquivo violador + numero da linha + tokens faltando**. Mensagem-exemplo: `agents/foo-auditor.md: missing 'contract_version' instruction in output template (expected literal "1.0")`. Aplica-se a fase-01.

- **G-P05-02 (Husky/lefthook em Windows tem armadilhas):** Devs em Windows tem line endings (CRLF) e shell (bash vs cmd) diferentes. Husky 9+ funciona via `prepare` script + `.husky/pre-commit` shell script. Em CI **nao precisamos do hook** — `.github/workflows/harness.yml` ja roda validador. Hook e conforto local; CI e blindagem hard. Documentar no commit que `bun install` ativa o hook automatico. Alternativa rejeitada: lefthook (precisa binario extra), `.git/hooks/pre-commit` manual (nao versionado no repo, nao se ativa via `bun install`). Aplica-se a fase-02.

- **G-P05-03 (init PRD ja pode estar atualizado — VERIFICAR antes de editar):** **Anomalia detectada na exploracao:** `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` ja tem `requires: [v6.1.0-subagent-contract]` no frontmatter (linha 4). fase-03 nao precisa editar frontmatter — vira **verificacao + adicao opcional** de nota explicita em §Dependencias mencionando que Reconciler/Explorer/Compound emitem envelope v1. Se §Dependencias ja existir com a nota, fase-03 vira **no-op verificada**. Sizing reduz para 0.25h se ja estiver completo; mantido em 0.5h para incluir verificacao + commit do snapshot. Aplica-se a fase-03.

- **G-P05-04 (compound note so cria se padrao real emergiu):** Validar nos MEMORY.md dos Planos 01-04 se aparece o padrao "reasoning capturou observacao fora do schema X" (PRD §Decisoes #3 + §Riscos). Se MEMORY dos 4 planos nao registrar isso explicitamente, **NAO forcar** criacao de compound. Compound forcado vira ruido — viola principio do PRD/CLAUDE.md ("se nao houve licao durador, registre por que decidiu nao criar"). Em MEMORY.md do Plano 05 entrar a DI explicita: "compound note nao criada porque MEMORY dos planos 01-04 nao mostra padrao 'reasoning fora do schema'". Aplica-se a fase-05.

- **G-P05-05 (merge to main deve ser squash se branch tem muitos commits intermediarios):** PRD §DoD: "sem release intermediario". Branch isolado tem 5 ondas (~21 fases) commitadas — squash consolida em 1 commit `feat(plugin): v6.1.0 contrato de subagentes (#PR)`. Alternativa: merge commit normal (preserva historico mas inflate main log). **Decisao:** squash. Justificativa: cada plano ja tem seu MEMORY/STATE consolidado em git; historico granular vive no branch (que pode ser preservado como `archive/v6.1.0`). Tag `v6.1.0` no commit de merge. Aplica-se a fase-05.

- **G-P05-06 (ANTES do merge, todos os gates passam — bloqueador hard):** Sequencia obrigatoria antes do squash merge:
  1. `bun run harness:validate` => 0 failures
  2. `bun run compound:check` => 0 failures
  3. `bun test agents:contract` => 13/13 passed (todas as fixtures)
  4. `bun run test` => suite completa verde
  5. `bun run lint` => 0 erros
  6. Workflow CI no PR verde (Github Actions)
  Se qualquer um falhar: fase-05 para, devolve para fase causadora, nao merge. Aplica-se a fase-05.

- **G-P05-07 (CHANGELOG entry: section ordem importa):** Convencao Keep-a-Changelog: Breaking Changes => Added => Changed => Deprecated => Removed => Fixed => Security. Para v6.1.0 vamos ter: **Breaking Changes** (parsing markdown por-agente removido nos 4 orquestradores; agents agora obrigatoriamente emitem contrato v1) + **Added** (contrato v1 + ADR-0002 + doc canonico + JSON schema + helper TS + harness check + pre-commit hook + 13 fixtures) + **Changed** (4 orquestradores via handler generico) + **Deprecated** (nada — big-bang) + **Removed** (nada substantivo) + **Fixed** (nada — feature nova) + **Security** (validator rejeita patterns de secret em payload/reasoning). Se sair dessa ordem, harness-validate (existente) checa `docs/QUALITY_SCORE.md` mas nao CHANGELOG — entao depende de revisao manual. Aplica-se a fase-05.

- **G-P05-08 (compound note de "reasoning fora do schema" tem formato YAML rigido):** Se criada na fase-05, deve seguir o frontmatter aceito por `scripts/compound-check.ts`: `title`, `category`, `tags`, `created` + secoes `Problem`, `Solution`, `Prevention`. **Antes de escrever**, ler 1 compound note recente como template (ex: `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md`). Senao falha `bun run compound:check` no pre-merge gate (G-P05-06). Aplica-se a fase-05.

---

## Criterio de Aceite (encadeado aos CAs do PRD)

| CA do PRD | Como fase deste plano cobre |
|-----------|----------------------------|
| **CA-07** (13 fixtures verdes em CI) | fase-04 entrega — script `agents:contract` no package.json, workflow chama, 13/13 passam |
| **CA-08** (`/init` PRD `requires: v6.1.0-subagent-contract`) | fase-03 confirma/verifica (ja presente) + adiciona nota explicita em §Dependencias |
| **CA-10** (`harness-validate` checa prompts contrato v1 em `agents/*.md`) | fase-01 entrega `checkAgentContracts()` em `scripts/harness-validate.ts` |
| **§DoD** (CHANGELOG entry v6.1.0 + link ADR + branch merge to main) | fase-05 entrega CHANGELOG + tag + squash merge |
| **RF-SH-05** (validator como pre-commit hook em `agents/*.md`) | fase-02 entrega via husky + `prepare` no package.json |
| **RF-SH-04 indireto** (migration guide < 30min completo) | ja entregue no Plano 02 fase-04; CHANGELOG da fase-05 referencia explicitamente |

CAs cobertos em planos anteriores (recapitulacao):
- CA-01, CA-02, CA-03 (envelope v1, reasoning threshold, lifecycle separado) — Plano 01 + Plano 02
- CA-04 (handler generico por kind) — Plano 04
- CA-05 (retry policy 1x em needs_retry) — Plano 04 fase-01 + helper
- CA-06 (auditor novo sem mudar codigo) — Plano 04 fase-03
- CA-09 (doc canonico com migration guide + exemplos por kind) — Plano 02 fase-04

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
