---
slug: init-refactor-v7
date: 2026-05-20
status: completed
completedAt: 2026-05-21
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# PRD: Refatoração do /anti-vibe-coding:init (v7)

**Status:** Approved
**Author:** Luiz Felipe + AI
**Date:** 2026-05-20
**Context:** ./CONTEXT.md

---

## Problema

O `/anti-vibe-coding:init` v6.7 sofreu uma regressão arquitetural intencional (commit `1ad0317`, 2026-05-19): os Steps 07-11 que populavam os docs canônicos do harness foram removidos e substituídos por um PLAN.md com 4 fases rasas que o usuário raramente executa.

O resultado prático: após rodar o init, **nenhum doc canônico existe** no projeto — nem como shell vazio nos casos com artefatos `.claude/*` presentes. O init destrói o `.claude/CLAUDE.md` existente (533→51 linhas) sem criar nenhum doc canônico em troca. O Harness do André Prado, rodando no mesmo projeto-alvo, produziu 9 docs canônicos populados preservando o CLAUDE.md intacto.

Impacto de não resolver: o init continua sendo a porta de entrada do plugin — se ela estiver quebrada, nenhum usuário chega às demais skills.

---

## Solução

### Outcomes

- Desenvolvedor roda `/anti-vibe-coding:init` e ao final tem: 16+ placeholders criados, 16 planos individuais (formato André) prontos para execução sequencial, e `.claude/CLAUDE.md` preservado intacto.
- Projetos com artefatos legacy (`.claude/planning/`, `lessons-learned.md`, `progress.txt`) têm esses artefatos mapeados em `.claude/legacy-manifest.json` — o execute-plan usa esse manifest como contexto ao popular os docs canônicos.
- Cada plano individual instrui a LLM com precisão: quais arquivos ler (Waves de descoberta), quais seções escrever, o que está fora de escopo, quais riscos existem e como validar.
- O init nunca sobrescreve conteúdo existente do usuário — apenas cria o que não existe ainda.

### Mecanismo

Refatoração incremental de 24 steps → 8 steps. O código existente que funciona é reaproveitado; steps removidos são deletados; `populate-plan-generator.ts` é reescrito com novo formato.

**Nova sequência de steps:**

```
Step 1: detect-legacy + detect-stack
  → Leitura pura (zero escrita)
  → detect-legacy: mapeia artefatos v5.x (.claude/planning/, lessons-learned.md,
    decisions.md, progress.txt, .claude/rules/, .claude/knowledge/)
  → detect-stack: lê package.json/Cargo.toml/go.mod → identifica stack primária
  → Ambos gravam no StepContext (ctx.legacy, ctx.stack)
  → Não aborta mesmo se legacy detectado

Step 2: migrate-planning + build-legacy-manifest
  → Se ctx.legacy.planning existe: mv .claude/planning/ → docs/specs/
  → Escreve .claude/legacy-manifest.json com todos os artefatos mapeados
    (ver schema em Decisões Técnicas DT-06)
  → progress.txt incluído como compound source no manifest (não importado agora)
  → Se nenhum legacy: escreve manifest vazio { "legacy": [] }

Step 3: scaffold-full-tree + link-claude-agents
  → Cria 16 placeholders mínimos (template André + extras AVC)
  → Skip-if-exists: se arquivo já existe, pula sem erro (idempotente)
  → NUNCA sobrescreve .claude/CLAUDE.md existente
  → Se .claude/CLAUDE.md existe: linka/copia para AGENTS.md
  → Se .claude/CLAUDE.md não existe: cria placeholder + inclui no plano do AGENTS.md

Step 4: install-gh-files
  → Copia .github/workflows/harness.yml (estático)
  → Copia .github/pull_request_template.md (estático)
  → Skip-if-exists

Step 5: generate-populate-plans
  → Gera 16 PLAN.md individuais em docs/exec-plans/active/DATE-populate-{slug}/PLAN.md
  → Cada plano no formato André: Goal, Scope, Assumptions, Risks,
    Execution Waves, Review Checklist, Validation Log, Compound Opportunity,
    Lessons Captured, Exit Criteria
  → Instruções hardcoded por doc + paths reais do projeto (de ctx.stack + ctx.legacy)
  → Substitui o atual populate-plan-generator.ts e fase.md.tpl/PLAN.md.tpl

Step 6: delivery-loop (interativo)
  → Pergunta: "Incluir delivery loop no CLAUDE.md?" (única pergunta interativa)
  → Se sim: injeta seção no placeholder CLAUDE.md/AGENTS.md
  → Se não: continua sem modificar

Step 7: copy-knowledge
  → Copia docs/knowledge/ da stack detectada (nodejs-typescript ou rails) para projeto
  → Se stack desconhecida: pula com aviso, não aborta

Step 8: final-validation
  → Roda bun run harness:validate
  → Não-bloqueante: imprime warnings mas não falha o init
  → Emite mensagem final com paths dos 16 planos gerados
```

**Arquivos deletados (steps removidos):**

| Step atual | Motivo da remoção |
|-----------|-------------------|
| 02-reuse-discovery | Cache desnecessário na v7 (D3) |
| 03-reentry-guard | Overengineering, removido (D3) |
| 04-backup-pre-6_5_0 | Backup phase removida (D3) |
| 05-import-progress-txt | Absorvido pelo Step 2 via legacy-manifest |
| 07-backup-pre-mutation | Backup phase removida (D3) |
| 08-migrate-0-parse-dry-run | Dry-run removido (D4) |
| 09-migrate-all-orchestrate | Simplificado no Step 2 |
| 10-migrate-1-backup | Simplificado no Step 2 |
| 11-migrate-2-planning | Absorvido pelo Step 2 |
| 12-migrate-3-lessons | Delegado ao execute-plan via manifest |
| 13-migrate-4-decisions | Delegado ao execute-plan via manifest |
| 14-migrate-knowledge-path | Absorvido pelo Step 2 via manifest |
| 17-detect-stack-and-register | Mesclado no Step 1 |
| 18-persist-stack-and-knowledge | Renomeado Step 7 (copy-knowledge) |
| 19-customize-architecture | Vira plano individual (D11) |
| 22-capabilities-discovery | Removido (D5) |

---

## Fluxos UX por Ator

### Desenvolvedor (CLI)

```
$ /anti-vibe-coding:init

[init v7] Detectando legado e stack...
  ✓ Stack: nodejs-typescript (package.json)
  ✓ Legacy: .claude/planning/ detectado → migrar para docs/specs/
  ✓ Manifest: .claude/legacy-manifest.json criado (3 artefatos mapeados)

[init v7] Scaffolding harness...
  ✓ 16 placeholders criados (4 já existiam — mantidos intactos)
  ✓ AGENTS.md → .claude/CLAUDE.md linkado (preservado, 533 linhas)

[init v7] Instalando CI/CD...
  ✓ .github/workflows/harness.yml
  ✓ .github/pull_request_template.md

[init v7] Gerando planos de população...
  ✓ 16 planos criados em docs/exec-plans/active/

[init v7] Pergunta: Incluir delivery loop no CLAUDE.md?
  [s/N] _

[init v7] Copiando knowledge nodejs-typescript...
  ✓ docs/knowledge/ populado (15 atoms)

[init v7] Validando harness...
  ⚠ 3 avisos (docs ainda são placeholders — esperado antes de popular)

─────────────────────────────────────────
Harness scaffold criado. Próximo passo:

Execute os planos na ordem sugerida:
  1. docs/exec-plans/active/2026-05-20-populate-architecture-md/PLAN.md
  2. docs/exec-plans/active/2026-05-20-populate-agents-md/PLAN.md
  3. docs/exec-plans/active/2026-05-20-populate-security-md/PLAN.md
  ... (13 mais)

Use /anti-vibe-coding:execute-plan <path> para cada plano.
─────────────────────────────────────────
```

---

## Requisitos Funcionais

### Must Have (máximo 40%)

- [ ] **RF-01** Step 1: `detect-legacy` mapeia artefatos v5.x e `detect-stack` identifica stack primária — ambos read-only, sem abortar
- [ ] **RF-02** Step 2: `migrate-planning` move `.claude/planning/` → `docs/specs/` e grava `.claude/legacy-manifest.json` com todos os artefatos mapeados
- [ ] **RF-03** Step 3: `scaffold-full-tree` cria os 16 placeholders mínimos com skip-if-exists; `.claude/CLAUDE.md` existente NUNCA sobrescrito
- [ ] **RF-04** Step 5: `generate-populate-plans` gera 16 PLAN.md individuais em formato André (Goal/Scope/Assumptions/Risks/Waves/Review Checklist/Exit Criteria) — um por doc canônico
- [ ] **RF-05** Cada plano individual contém instruções hardcoded específicas para o doc: quais arquivos ler (Wave 1), quais seções escrever (Wave 2), o que está out-of-scope, quais riscos
- [ ] **RF-06** Paths nas Waves dos planos são ajustados pela stack detectada (Node: `src/`, `app/`; Rails: `app/controllers/`, `app/models/`)
- [ ] **RF-07** Steps 02/03/04/05/07/08/09/10/11/12/13/14/17/19/22 removidos do registry — código deletado
- [ ] **RF-08** Testes (unit + e2e) reescritos alinhados com os 8 novos steps

### Should Have

- [ ] **RF-09** `.claude/legacy-manifest.json` tem schema estruturado (ver DT-06) com todos os campos necessários para o execute-plan
- [ ] **RF-10** Mensagem final lista os 16 planos em ordem de execução sugerida (ARCHITECTURE.md → AGENTS.md → demais)
- [ ] **RF-11** Step 7: `copy-knowledge` pula graciosamente se stack não mapeada, sem abortar
- [ ] **RF-12** `harness-validate` atualizado para incluir os 4 docs extras AVC (MERGE_GATES.md, CODE_STYLE.md, STATE.md, .claude/CLAUDE.md)

### Could Have

- [ ] **RF-13** Análise de quais funções viram skills separados (`/init:migrate`, `/init:refresh`) — D13, adiado

### Won't Have (desta versão)

- Dry-run mode / `WriteRecorder` — removido (D4); testes testam comportamento real
- Capabilities discovery de MCPs/subagentes — removido (D5)
- Backup automático de CLAUDE.md antes de transformar — backup phase removida (D3)
- Cache de reuso / reentry-guard — removidos (D3)
- Customização inline de ARCHITECTURE.md (agora é plano individual)
- Execução automática dos planos gerados (execute-plan continua sendo passo manual)
- Migração de lições/decisões legacy no init (delegada ao execute-plan via manifest)

---

## Requisitos Não-Funcionais

- **Performance:** Init completo < 30s em projeto Node.js médio (1000 arquivos). Step 5 (geração dos 16 planos) é puro TypeScript, sem LLM — deve ser < 2s.
- **Segurança:** Nenhuma credencial é lida ou gravada. `.claude/legacy-manifest.json` não deve conter conteúdo dos arquivos — apenas paths e metadados.
- **Idempotência:** Rodar init duas vezes não deve destruir trabalho do usuário. Skip-if-exists em todos os writes de scaffold. Plans re-gerados sobrescrevem planos anteriores (behavior aceitável).
- **Observabilidade:** Audit log existente mantido para o step de generate-plans (métricas: plansGenerated, stackPrimary, legacyArtifactsFound, docsSkipped).
- **Acessibilidade:** N/A (CLI-only).

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| DT-01 | Estratégia de mudança | Refatoração incremental | Greenfield total | Mais seguro; preserva contratos AbortError, StepContext, libs detect-stack |
| DT-02 | Quem popula os docs | LLM via planos individuais | Scripts/regex (Steps 07-11) | Scripts produzem docs genéricos (82 linhas vs 155 André). LLM lê código real |
| DT-03 | Formato dos planos | 16 planos individuais André format | 1 PLAN.md com 20 fases | Planos individuais permitem execução/pausa/revisão por doc |
| DT-04 | CLAUDE.md existente | PRESERVAR sempre | Destruir (533→51 linhas) | André preservou 27KB e ainda assim populou 9 docs. Destruição sem benefício |
| DT-05 | Dry-run | Removido | Manter WriteRecorder | Complexidade do WriteRecorder não justifica benefício. Testes testam real |
| DT-06 | Legacy state | `.claude/legacy-manifest.json` em disco | Só em memória | Execute-plan precisa acessar em sessão separada |

**DT-06 — Schema do legacy-manifest.json:**

```json
{
  "schemaVersion": "1.0",
  "detectedAt": "2026-05-20T10:00:00Z",
  "stack": { "primary": "nodejs-typescript", "confidence": "high" },
  "legacy": [
    {
      "type": "planning",
      "found": true,
      "sourcePath": ".claude/planning/",
      "migratedTo": "docs/specs/",
      "action": "moved"
    },
    {
      "type": "compound",
      "found": true,
      "sourcePath": ".claude/progress.txt",
      "action": "reference-only",
      "note": "Importar para docs/compound/ via execute-plan"
    },
    {
      "type": "lessons",
      "found": true,
      "sourcePath": "lessons-learned.md",
      "action": "reference-only",
      "note": "Usar como contexto ao popular harness docs"
    },
    {
      "type": "decisions",
      "found": true,
      "sourcePath": ".claude/decisions.md",
      "action": "reference-only",
      "note": "Usar como contexto ao popular harness docs"
    },
    {
      "type": "claude-md",
      "found": true,
      "sourcePath": ".claude/CLAUDE.md",
      "lines": 533,
      "action": "preserved",
      "note": "Fonte primária para popular AGENTS.md"
    }
  ]
}
```

---

## Critérios de Aceite

- [ ] **CA-01:** Dado projeto Node.js sem init anterior, quando rodar `/init`, então 16 placeholders são criados em `docs/` + 16 PLAN.md em `docs/exec-plans/active/` + `bun run harness:validate` termina (com ou sem warnings)
- [ ] **CA-02:** Dado projeto com `.claude/CLAUDE.md` de 533 linhas, quando rodar `/init`, então após o init o arquivo tem exatamente 533 linhas — nenhuma linha adicionada ou removida
- [ ] **CA-03:** Dado projeto com `.claude/planning/` legacy, quando rodar `/init`, então `docs/specs/` existe com o conteúdo migrado E `.claude/legacy-manifest.json` contém entrada `type: "planning"` com `action: "moved"`
- [ ] **CA-04:** Dado projeto Rails detectado (presença de `Gemfile`), quando rodar `/init`, então o PLAN.md para `docs/FRONTEND.md` contém `app/views` e `app/assets` nas Waves de descoberta (e não `src/`)
- [ ] **CA-05** (edge case): Dado projeto sem nenhum artefato legacy, quando rodar `/init`, então `.claude/legacy-manifest.json` é criado com `"legacy": []` e init conclui sem erro
- [ ] **CA-06:** Dado init chegando ao step delivery-loop, quando o LLM perguntar sobre o delivery loop, então a pergunta é feita ANTES de qualquer modificação no CLAUDE.md
- [ ] **CA-07:** Dado um PLAN.md individual gerado (ex: `docs/SECURITY.md`), quando abrir o arquivo, então ele contém exatamente as seções: `## Goal`, `## Scope`, `## Assumptions`, `## Risks`, `## Execution Steps` (com mínimo 2 Waves), `## Review Checklist`, `## Validation Log`, `## Compound Opportunity`, `## Lessons Captured`, `## Exit Criteria`
- [ ] **CA-08:** Dado init rodando duas vezes no mesmo projeto, quando o segundo run executar o scaffold, então nenhum arquivo criado no primeiro run é sobrescrito (skip-if-exists funciona)
- [ ] **CA-09** (regressão): Dado `bun run test` após a refatoração, então todos os novos testes de unit dos 8 steps passam e nenhum teste de step removido existe no codebase

---

## Out of Scope

- Execução automática dos planos gerados (execute-plan é passo separado e deliberado)
- Skills separadas `/init:migrate` e `/init:refresh` — D13 adiado para análise pós-refatoração
- Migração de lições/decisões legacy para docs harness — responsabilidade do execute-plan lendo o manifest
- Geração de docs canônicos populados diretamente no init (init cria só placeholders)
- Suporte a stacks além de nodejs-typescript e rails na copy-knowledge (extensível no futuro)

---

## Dependências

| Tipo | Dependência | Status |
|------|-------------|--------|
| Lib interna | `detect-stack.ts` | Existente — reaproveitada |
| Lib interna | `scaffold-full-tree.ts` | Existente — simplificada (remover dry-run branch) |
| Lib interna | `link-claude-agents.ts` | Existente — mantida |
| Lib interna | `install-gh-files.ts` | Existente — mantida |
| Lib interna | `delivery-loop.ts` | Existente — mantida |
| Lib interna | `final-validation.ts` | Existente — mantida |
| Arquivo central | `populate-plan-generator.ts` | Reescrito — novo formato André + 16 instruções |
| Template | `harness-engineering/assets/harness-template/` | Referência para placeholders |
| Knowledge | `knowledge/nodejs-typescript/`, `knowledge/rails/` | Existente — mantido |
| Feature externa | `/execute-plan` skill | Existente — consumidora dos planos gerados |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| skip-if-exists em scaffold faz re-run nunca re-popular placeholders editados pelo usuário | Média | Médio | Documentar: re-run é para projetos novos; para refresh usar flag futura `/init:refresh` (D13) |
| Stack não reconhecida → Wave 1 dos planos usa paths genéricos `src/` | Média | Baixo | Fallback para paths genéricos com nota "⚠ stack não detectada — ajuste os paths" no plano |
| 16 instruções hardcoded desatualizadas quando harness adiciona novo doc canônico | Baixa | Médio | `harness-validate` gates a lista; falha de teste CA-01 detecta gap |
| Testes reescritos perdem cobertura de behaviors válidos mantidos | Média | Alto | Mapear quais behaviors dos steps mantidos têm testes antes de deletar |
| `.claude/legacy-manifest.json` não lido corretamente pelo execute-plan | Baixa | Alto | Schema versionado (schemaVersion: "1.0"). Validar leitura no execute-plan antes de v7 release |
