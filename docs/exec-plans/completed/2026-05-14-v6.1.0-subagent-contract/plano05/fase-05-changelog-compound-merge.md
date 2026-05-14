<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: CHANGELOG + Compound (condicional) + Merge to Main

**Plano:** 05 — Validacao Final + Harness + Unlock /init
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03, fase-04 — todas verdes; alem de Planos 01-04 verdes localmente
**Visual:** false

---

## O que esta fase entrega

Entrada `## [6.1.0]` em `CHANGELOG.md` com Breaking Changes (parsing markdown por-agente removido) + Added (contrato v1 + 13 fixtures + harness check + pre-commit + helper TS) + Changed (4 orquestradores via handler generico) + link ao ADR-0002 + reservation `v6.2 — spec real do mutation payload`. Compound note **so** se padrao real emergiu nos MEMORY dos Planos 01-04 ("reasoning forcou auditores a notar coisas fora do enum"). Squash merge da branch isolada para `main` + tag `v6.1.0`. Cumpre **PRD §DoD** (todos os itens) + amarra cabos soltos.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `CHANGELOG.md` | Modify | adicionar bloco `## [6.1.0] - 2026-05-14` apos `## [Unreleased]` |
| `docs/compound/2026-05-14-reasoning-forca-fora-do-schema.md` | Create (CONDICIONAL) | criar so se MEMORY dos Planos 01-04 contem evidencia explicita de "reasoning capturou observacao fora do schema" |
| Plano 05 `MEMORY.md` | Modify | registrar DI sobre criar/nao-criar compound + decisao de squash + hash do commit de merge |
| Branch `main` | Modify | receber squash merge da branch isolada |
| Git tag `v6.1.0` | Create | cravada no commit de merge |

---

## Implementacao

### Passo 1: Pre-merge gate — rodar TODOS os checks (G-P05-06)

```bash
bun run harness:validate    # 0 failures
bun run compound:check      # 0 failures
bun run agents:contract     # 13 passed
bun run test                # suite completa verde
bun run lint                # 0 erros
```

Se qualquer um falhar: **parar**. Identificar fase causadora. Nao prosseguir para CHANGELOG/merge.

### Passo 2: Adicionar entrada CHANGELOG

Editar `CHANGELOG.md` inserindo bloco apos `## [Unreleased]` e antes de `## [6.0.0] - 2026-05-12`:

```markdown
## [6.1.0] - 2026-05-14

> **Minor release — Contrato de Subagentes v1 (Eixo 1 Agent-Native)**
> Unifica output dos 13 subagentes do plugin em um contrato JSON unico.
> Orquestradores passam a parsear via `kind` (audit/mutation/proposal/verification),
> sem regex por auditor. Pre-requisito para `/init` migration-mode (v6.2).

### Breaking Changes

- **Output dos 13 subagentes mudou de markdown com enum de dominio para JSON envelope v1.** Auditores agora emitem `{contract_version, agent, kind, status, reasoning, payload}`. Skills consumidoras (`execute-plan`, `design-twice`, `verify-work`, `anti-vibe-review`) parsam via handler generico `parseAndDispatch()` de `skills/lib/subagent-contract.ts`. Plugins/forks que estendiam parsers custom por nome de auditor precisam migrar. Migration guide: [`docs/design-docs/subagent-contract-v1.md`](../../../../../docs/design-docs/subagent-contract-v1.md) (<30min).
- **Campo `status` agora e lifecycle padronizado** (`complete | needs_retry | needs_human | blocked`), separado de status de dominio. Enum de dominio (`VULNERABILITIES_FOUND`, `OPTIMIZED`, `COMPLIANT`, etc) vive em `payload.domain_status`. Validator rejeita uso de enum de dominio em `status` top-level.
- **Campo `reasoning` obrigatorio, minimo 20 caracteres** (warning em <50 chars). Sem reasoning => output rejeitado com erro `REASONING_TOO_SHORT`.

### Added

- **Contrato de Subagentes v1.** [`docs/design-docs/subagent-contract-v1.md`](../../../../../docs/design-docs/subagent-contract-v1.md) (doc canonico + migration guide), [`docs/design-docs/ADR-0002-subagent-contract.md`](../../../../../docs/design-docs/ADR-0002-subagent-contract.md), [`agents/_contract/v1.schema.json`](../../../../../agents/_contract/v1.schema.json).
- **Helper TS** [`skills/lib/subagent-contract.ts`](../../../../../skills/lib/subagent-contract.ts) — `parseContract()`, `parseAndDispatch()`, `withRetry(needsRetry, max=1)`, secret-pattern detection (`API_KEY=`, `SECRET=`, etc), threshold reasoning (rejeita <20, warning <50).
- **13 fixtures de regressao** em `agents/__fixtures__/{nome}/{input.json,expected-output.json}` — 1 cenario por subagente. Rodam em CI via `bun run agents:contract`.
- **Harness validator** estendido (`scripts/harness-validate.ts` :: `checkAgentContracts()`) — regex em `agents/*.md` confirma que prompt instrui emissao de contrato v1.
- **Pre-commit hook** via husky + `.husky/pre-commit` — bloqueia commit local quando agent staged nao instrui contrato v1.
- **CI step** `bun run agents:contract` adicionado em `.github/workflows/harness.yml`.

### Changed

- **4 orquestradores agora consomem via handler generico**: `execute-plan` (mini-tracer-bullet — `plan-verifier` + `plan-executor` via `kind: verification`), `design-twice` (3x `design-explorer` paralelos via `kind: proposal`), `verify-work` (ate 8 auditores via `kind: audit` com deduplicacao de findings cross-agent), `anti-vibe-review` (replica padrao do verify-work). Codigo de parsing markdown por-agente removido. Adicionar auditor novo passa a custar zero mudanca nas skills (CA-06).
- **`/init` (`docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`)** declara `requires: [v6.1.0-subagent-contract]`. Reconciler/Explorer/Compound do /init nascerao ja conformes.

### Security

- **Validator rejeita patterns de secret** (`API_KEY=`, `SECRET=`, `PASSWORD=`, `TOKEN=`) em `payload` e `reasoning` — defesa-em-profundidade contra agentes que copiariam arquivo cru com credenciais (PRD §Seguranca).

### Reservation

- **v6.2 — spec real do `payload.mutation`.** `documentation-writer` ganhou envelope cosmetico `kind: "mutation"` em v6.1.0; spec do payload (dry-run, diff preview, conflict resolution) fica para v6.2. Tracked em [`TODO.md`](../../../../../TODO.md).

### Migration Guide

Para autor de subagente externo / fork:

1. Adicione `kind: <audit|mutation|proposal|verification>` no frontmatter de `agents/{nome}.md`.
2. Substitua o template de output do agent por bloco JSON com `{contract_version: "1.0", agent, kind, status, reasoning, payload}` — exemplos em [`docs/design-docs/subagent-contract-v1.md`](../../../../../docs/design-docs/subagent-contract-v1.md).
3. Adicione fixture em `agents/__fixtures__/{nome}/{input.json,expected-output.json}`.
4. Rode `bun run harness:validate && bun run agents:contract` — deve passar.

Tempo medio: <30min por agent (RF-SH-04).
```

### Passo 3: Avaliar compound note (G-P05-04)

Procurar evidencia explicita nos MEMORY dos Planos 01-04:

```bash
grep -A 3 -i "reasoning.*fora.*schema\|reasoning.*forçou\|reasoning.*captured.*outside" \
  docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/plano{01,02,03,04}/MEMORY.md
```

**Se houver ocorrencia(s) substantiva(s):** criar compound note. Estrutura (G-P05-08 — usar template):

Ver compound recente como modelo:

```bash
cat docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md | head -30
```

Criar `docs/compound/2026-05-14-reasoning-forca-fora-do-schema.md`:

```markdown
---
title: Reasoning obrigatorio forcou auditores a notar coisas fora do schema
category: design
tags: [subagents, contract-v1, reasoning, schema-design]
created: 2026-05-14
---

# Reasoning obrigatorio forcou auditores a notar coisas fora do schema

## Problem

Antes do contrato v1, os 13 subagentes do plugin retornavam markdown com enum de dominio fixo
(SECURE, VULNERABILITIES_FOUND, OPTIMIZED, etc). Quando o agente observava algo fora desse enum
— ex: security-auditor notando que arquitetura geral facilita uma classe de bug que nao cabia em
nenhuma das 3 categorias — a informacao era descartada porque nao tinha onde colocar (PRD §Problema #3).
Anti-pattern Every: *"Defensive tool design — over-constrains tool inputs"*.

## Solution

Contrato v1 (v6.1.0) introduziu campo `reasoning` **obrigatorio, prosa livre, minimo 20 caracteres**.
Durante a migracao dos Planos 01-04, autores de subagente registraram (ver MEMORY de cada plano)
multiplas vezes que o campo capturou observacoes que **nao estavam no schema do payload** —
exatamente o escape hatch que o PRD §Decisoes #3 antecipou.

Validator emite warning em reasoning <50 chars (sinal de prompt subotimo — agente nao esta usando
o campo, so passando o pano). Threshold em 2 niveis (rejeita <20, warn <50) distingue "agente
quebrou contrato" de "agente esta usando mal".

## Prevention

- **Manter `reasoning` obrigatorio em v2 do contrato.** Tentacao classica de "deixar opcional" deve
  ser rejeitada — opcional vira sempre vazio na pratica.
- **Threshold de 2 niveis e essencial.** Colapsar em 1 nivel (so rejeitar vazio) perde o sinal de
  prompt subotimo.
- **Prompts que mostram `reasoning` curto/generico** (ex: "Analyzed code successfully") sao
  bandeira vermelha — autor do agente nao internalizou o proposito do campo. Migration guide deve
  incluir 2 exemplos contrastantes (bom + fraco).
```

**Se NAO houver evidencia substantiva nos MEMORY:** **NAO criar compound.** Registrar em `plano05/MEMORY.md`:

```markdown
- **DI-2:** Compound note "reasoning forca fora do schema" NAO criada
  - Por que: MEMORY.md dos Planos 01-04 nao contem evidencia explicita de autor capturando observacao
    fora do schema via reasoning. Padrao **antecipado** pelo PRD, mas nao **observado** durante execucao.
  - Impacto: zero — registrar lesson nao-comprovada vira ruido. Se padrao emergir em uso real pos-v6.1.0,
    capturar entao via /lessons-learned skill.
```

### Passo 4: Commit das mudancas de fase-05

```bash
git add CHANGELOG.md
git add docs/compound/2026-05-14-reasoning-forca-fora-do-schema.md 2>/dev/null || true  # se criado
git add docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/plano05/MEMORY.md
git commit -m "docs(v6.1.0): CHANGELOG entry + compound note decision + memory update"
```

### Passo 5: Push, PR, merge squash, tag (G-P05-05 + G-P05-06)

```bash
# Estado: branch isolado tem Planos 01-04 + Plano 05 commitados localmente
git push origin {nome-da-branch}

# Abrir PR para main (manualmente ou via gh CLI):
gh pr create --base main --title "feat: v6.1.0 contrato de subagentes" --body "$(cat <<'EOF'
## Summary
- Contrato canonico v1 para 13 subagentes (JSON envelope + lifecycle separado de dominio)
- 4 orquestradores via handler generico `parseAndDispatch()`
- 13 fixtures de regressao em CI
- Harness validator + pre-commit hook
- Unlock /init migration-mode

## Test plan
- [x] `bun run harness:validate` passa
- [x] `bun run compound:check` passa
- [x] `bun run agents:contract` passa (13/13)
- [x] `bun run test` passa
- [x] `bun run lint` passa
- [x] CI verde

Ver `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/` para detalhes.
EOF
)"

# Aguardar CI verde no PR (G-P05-06 — bloqueador hard)
# Merge squash via Github UI ou gh:
gh pr merge --squash --delete-branch=false

# Apos merge confirmado:
git checkout main
git pull
git tag -a v6.1.0 -m "v6.1.0 — Contrato de Subagentes v1"
git push origin v6.1.0

# Opcional: arquivar branch isolada
git branch -m {nome-da-branch} archive/v6.1.0
git push origin archive/v6.1.0
git push origin --delete {nome-da-branch}
```

### Passo 6: Mover exec-plan para completed

```bash
mv docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract docs/exec-plans/completed/2026-05-14-v6.1.0-subagent-contract
git add -A
git commit -m "chore(exec-plans): archive v6.1.0-subagent-contract (completed)"
git push origin main
```

### Passo 7: Anunciar (opcional, fora de escopo do plano mas recomendado)

Se houver canal interno: post anunciando v6.1.0 com link para CHANGELOG e ao ADR-0002.

---

## Gotchas

- **G-P05-04 (compound condicional):** **NAO criar compound forcado**. Se MEMORY dos Planos 01-04 nao mostra padrao, registrar DI explicita em `plano05/MEMORY.md` e seguir. Compound forcado vira ruido, viola principio do CLAUDE.md.
- **G-P05-05 (squash merge):** PRD §DoD diz "sem release intermediario". Squash consolida 5 ondas em 1 commit no main. Historico granular preservado em `archive/v6.1.0` (ou similar). Tag `v6.1.0` cravada no commit de merge no main.
- **G-P05-06 (gate hard pre-merge):** SEM EXCECAO. Se qualquer um dos 5 checks falhar, parar fase-05 e devolver para fase causadora. Bypass via `--no-verify` no commit NAO autorizado — viola CLAUDE.md global.
- **G-P05-07 (ordem das secoes do CHANGELOG):** Keep-a-Changelog convencao. Breaking Changes => Added => Changed => Deprecated => Removed => Fixed => Security. Em v6.1.0: BC + Added + Changed + Security (+ Reservation extra, alinhada com v6.0.0 que tem "Reservation" similar para v6.1.0).
- **G-P05-08 (compound frontmatter rigido):** Se criar, espelhar exatamente o formato de `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md` — `title`, `category`, `tags`, `created` + secoes Problem/Solution/Prevention. `compound:check` ja roda em pre-merge.
- **G2 do PRD (lifecycle vs domain_status):** Entrada CHANGELOG menciona ambos eixos para upgraders entenderem. Texto deve ser curto — referenciar doc canonico para detalhes.
- **Local:** Tag `v6.1.0` so apos merge em main + CI verde no commit de main. Cravar tag em branch nao-mergeada e foot-gun.
- **Local:** Mover exec-plan para `completed/` so depois do merge — durante a janela, o plan vive em `active/` para que harness:validate nao reclame de "orphan plan".

---

## Verificacao

### TDD

- [ ] **RED:** Antes de fase-05, `grep "## \[6.1.0\]" CHANGELOG.md` retorna 0 matches
  - Comando: `grep -c "^## \[6.1.0\]" CHANGELOG.md`
  - Resultado esperado: 0

- [ ] **GREEN:** Apos fase-05, retorna 1 match
  - Comando: idem
  - Resultado esperado: 1

### Checklist

- [ ] 5 checks pre-merge (G-P05-06) todos verdes localmente
- [ ] Entrada `## [6.1.0]` em CHANGELOG com Breaking Changes + Added + Changed + Security + Reservation
- [ ] Links em CHANGELOG resolvem (`bun run harness:validate` passa)
- [ ] Decisao sobre compound note documentada em `plano05/MEMORY.md` (criada OU registrada nao-criacao)
- [ ] Se compound criada, `bun run compound:check` passa
- [ ] PR aberto contra main com checklist preenchido
- [ ] CI verde no PR (workflow `harness.yml` com 3 gates)
- [ ] Squash merge executado
- [ ] Tag `v6.1.0` cravada no commit de merge em main
- [ ] Tag push para origin
- [ ] Exec-plan movido para `docs/exec-plans/completed/`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `grep "^## \[6.1.0\] - 2026-05-14" CHANGELOG.md` retorna 1 linha
- `git tag --list "v6.1.0"` retorna `v6.1.0`
- `git log main --oneline -1` mostra commit de merge (squash) com mensagem v6.1.0
- `ls docs/exec-plans/completed/2026-05-14-v6.1.0-subagent-contract/` mostra estrutura migrada
- `bun run harness:validate && bun run compound:check && bun run agents:contract && bun run test && bun run lint` todos exit 0

**Por humano:**
- CHANGELOG legivel — upgrader externo entende em <5min o que mudou e como migrar
- ADR-0002 e doc canonico linkados — quem quer profundidade tem caminho
- Decisao de compound note (criar ou nao) registrada com justificativa em MEMORY

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
