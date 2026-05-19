---
name: init
description: "This skill should be used when the user asks to 'initialize anti-vibe', 'setup anti-vibe coding', 'add anti-vibe to project', 'configure anti-vibe', or wants to onboard a project into the Anti-Vibe Coding methodology. Handles first-time setup with intelligent CLAUDE.md merge, rules deployment, and decisions registry initialization."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicializa o Anti-Vibe Coding no projeto atual. Detecta o estado do projeto (greenfield ou
legacy v5.x), aplica migracao incremental quando necessario, gera estrutura `docs/`,
linka `CLAUDE.md` -> `AGENTS.md` (3 tiers com fallback Windows) e instala GH Actions + PR
template. Steps executam pelo dispatcher `lib/run-init.ts`; cada step esta em
`lib/steps/NN-{slug}.ts` registrado em `lib/registry.ts`.

## Como executar

```typescript
// 2026-05-17 (Luiz/dev): cutover Rails-style (PRD D1/D7) — orquestrador unico.
// DI-06/GT-04 (Windows): lazy-import centralizado no dispatcher.
import { runInit } from './lib/run-init'
await runInit({ args: process.argv.slice(2), cwd: process.cwd() })
```

## Fluxo de Steps (documentacao)

A tabela abaixo eh **documentacao gerada a mao**. A fonte de verdade do runtime eh
`lib/registry.ts` (consumido por `runInit`). Se divergirem, o registry vence.

| # | ID | Quando roda | Helper(s) | Args/Flags |
|---|----|----|----|----|
| 1 | `detect-legacy` | sempre | `detect-v5-legacy.ts` | — |
| 2 | `reuse-discovery` | sempre | `parse-refresh-flag.ts` | `--refresh`, `--reuse-discovery` |
| 3 | `migrate-0-parse-dry-run` | sempre | inline parse | `--dry-run` |
| 4 | `migrate-all-orchestrate` | se `--dry-run` (early-exit) | `migrate-orchestrator.ts`, `dry-run-renderer.ts` | `--dry-run` |
| 5 | `migrate-1-backup` | se `detect-legacy.isLegacy` | `backup-planning.ts` | — |
| 6 | `migrate-2-planning` | apos backup OK | `migrate-planning.ts` | — |
| 7 | `migrate-3-lessons` | apos migrate-2 OK | `migrate-lessons.ts` | — |
| 8 | `migrate-4-decisions` | apos migrate-2 OK | `migrate-decisions.ts` | — |
| 9 | `scaffold-full-tree` | sempre | `scaffold-templates.ts`, `scaffold-full-tree.ts`, `scaffold-todo-md.ts` | — |
| 10 | `link-claude-agents` | sempre | `symlink-fallback.ts` (3 tiers) | — |
| 11 | `detect-stack-and-register` | sempre | `detect-stack.ts`, `state-md-init.ts` | — |
| 12 | `persist-stack-knowledge` | sempre (idempotente) | `run-stack-knowledge-init.ts` | `--refresh-knowledge` |
| 13 | `customize-architecture` | apos detect-stack | `customize-architecture.ts` | — |
| 14 | `install-gh-files` | sempre (D14) | `install-gh-files.ts` | — |
| 15 | `delivery-loop` | opcional opt-in (Step 6) | `inject-optional-section.ts` + `assets/snippets/delivery-loop.md` | resposta `y`/`N` |
| 16 | `capabilities-discovery` | soft-fail se profile ausente | `capabilities-writer.ts`, `read-architecture-profile.ts`, `audit-log.ts` | — |
| 17 | `final-validation` | sempre, ultimo | `scripts/harness-validate.ts` | — |

## Referencias

- **Rationale completo:** [`docs/design-docs/init-rationale.md`](../../docs/design-docs/init-rationale.md)
  (DI-XX / GT-XX / CA-XX / R-XX / M-XX / D-XX / gates).
- **Akita snippets** (mesclados no `CLAUDE.md` do projeto cliente):
  - [`akita-code-style.md`](./assets/snippets/akita-code-style.md)
  - [`akita-comments.md`](./assets/snippets/akita-comments.md)
  - [`akita-tests.md`](./assets/snippets/akita-tests.md)
  - [`akita-dependencies.md`](./assets/snippets/akita-dependencies.md)
  - [`akita-logging.md`](./assets/snippets/akita-logging.md)
- **Delivery Loop snippet** (opt-in via Step 6): [`delivery-loop.md`](./assets/snippets/delivery-loop.md)

## Regras Importantes

- **NUNCA sobrescrever** informacoes do projeto sem aprovacao
- **NUNCA remover** secoes existentes do CLAUDE.md original
- **SEMPRE** criar backup antes de modificar
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar
- **Default destrutivo + revogavel** — em projetos com CLAUDE.md pre-existente, o init **transforma** o CLAUDE.md em espelho <=40 linhas (D2/D26/D28) extraindo regras Akita para `docs/DESIGN.md`. NUNCA aplica essa transformacao sem (a) aprovacao explicita do dev via `needsUser` agregado (MH-04) e (b) backup recuperavel em `.anti-vibe/backup/{timestamp}/` (D9, D29). Reversibilidade garantida via `/anti-vibe-coding:init --rollback` (MH-07).
- **Opt-in conservador disponivel:** `/anti-vibe-coding:init --additive-merge` preserva o comportamento da v6.3.x (merge aditivo, sem reescrever CLAUDE.md, sem backup) para users que ainda nao querem migrar para o novo formato (SH-09). Documentado tambem em `docs/design-docs/ADR-NNNN-destructive-merge-default.md` (Plano 06 fase-03).
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**

## Diretorio do projeto

$ARGUMENTS

## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

> Harness scaffold criado. Plano populate em `{populatePlanPath}`.
>
> Proximo passo: rode `/anti-vibe-coding:execute-plan {populatePlanPath}`
> para a IA popular cada doc canonico lendo o codigo real. Cada fase = 1 doc canonico.
> Revise via PR antes de fechar a fase.
>
> Opcional: `/anti-vibe-coding:detect-architecture` para classificar o projeto em 1 dos 5
> perfis arquiteturais (ativa Modo Dual nas skills estruturantes).

Substituir `{populatePlanPath}` pelo valor real emitido pelo Step 91
(`docs/exec-plans/active/{YYYY-MM-DD}-populate-harness/PLAN.md`).

NAO invocar `/anti-vibe-coding:execute-plan` nem `/anti-vibe-coding:detect-architecture`
automaticamente (respeita `feedback_suggest_dont_execute.md` — IA sugere, usuario decide).
