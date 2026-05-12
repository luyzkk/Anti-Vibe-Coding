---
title: "Dog-food reveals overly-strict validators"
category: process
tags: [validator, dog-food, harness, false-positives, quality-gate]
created: 2026-05-12
---

## Problem

`harness-validate.ts` foi escrito e testado isoladamente durante Plano 04 (validators full). Suite de testes passava 100% contra fixtures sinteticos. Quando aplicado pela primeira vez ao proprio repositorio do plugin em Plano 08 fase-08 (dog-food gate, D20/R4 mitigation), reportou ~40 erros — todos falsos positivos do validator, nao regressao de dados:

1. **BUG-08-01:** H1 check falhava em todos os 5 compound notes (frontmatter YAML na linha 1, CA-29).
2. **BUG-08-02:** H1 check falhava em todos os SKILL.md do plugin (convencao Claude Code = frontmatter + body, sem H1).
3. **BUG-08-03:** H1 check falhava em ADR-0001 (frontmatter + H1, mas validator nao stripava frontmatter).
4. **BUG-08-04:** H1 check falhava em agents/*.md (frontmatter + HTML comment lider + H1).

Causa raiz: validator foi testado contra fixtures sinteticos com formato puro (sem frontmatter, sem HTML comments, sem variantes de convencao). Nunca rodou contra um repositorio real com diversidade de formatos.

## Solution

Patch do validator (nao dos dados):

1. SKIP_DIRS estendido: `compound/`, `templates/`, `__fixtures__/`, `fixtures/`, `snippets/` (cada um por razao especifica documentada inline).
2. H1 check reescrito para stripar frontmatter YAML + HTML comments lideres + whitespace ANTES de verificar `# `.
3. SKILL.md isentado por basename (convencao Claude Code).
4. Sync entre `.tpl` source-of-truth e `scripts/` runtime copy (G6 do Plano 04 manter manual).

Resultado: 175 .md validados, exit 0. Bugs corrigidos no validator, dados intactos.

Bonus discovery via dog-food: `noUncheckedIndexedAccess` strictness exigiu guards `if (!target) return` no link checker (BUG-08-05).

## Prevention

- **Validator nao tem testes unitarios suficientes — tem dog-food.** Todo validator de quality gate DEVE rodar sobre o repositorio que o gerou antes do release.
- Fixtures sinteticos cobrem o caminho feliz; dog-food cobre a diversidade real (frontmatter YAML, HTML comments, convencoes de file types, SKILL.md vs ADR vs compound).
- D20 (dog-food do plugin) eh R4 mitigation — confirmado empiricamente em Plano 08.
- Quando um validator falha em um arquivo legitimo, a duvida default eh: validator esta strict demais OU dados estao errados? Se ha multiplos arquivos legitimos falhando do mesmo jeito, a resposta eh validator.
- Sync source-of-truth (`.tpl`) com runtime copy (`scripts/`) precisa preservar guards de strict mode TypeScript.

## Affected files

- `anti-vibe-coding/skills/init/assets/templates/scripts/harness-validate.ts.tpl` (SKIP_DIRS, H1 check, link guards)
- `anti-vibe-coding/scripts/harness-validate.ts` (runtime sync)
- Commits: `8cab16c` (patches 1-4), `1d7e2db` (typecheck guards)
- Discovery em: `.planning/2026-05-11-v60-harness-compound-fusion/plano08/MEMORY.md` (BUG-08-01..05, DI-13..16, GT-8, DEV-2)
