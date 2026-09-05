---
name: init
description: "Onboarding de um projeto no Anti-Vibe Coding: monta o scaffold do harness, espelha CLAUDE.md/AGENTS.md, migra artefatos legados e gera o plano de populate. Use ao inicializar ou configurar o Anti-Vibe num projeto."
user-invocable: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicializa o Anti-Vibe Coding no projeto atual. Detecta o estado do projeto (greenfield ou
legacy v5.x), aplica migracao incremental quando necessario, gera estrutura `docs/`,
linka `CLAUDE.md` -> `AGENTS.md` (3 tiers com fallback Windows) e instala GH Actions + PR
template. Steps executam pelo dispatcher `lib/run-init.ts`; cada step esta em
`lib/steps/NN-{slug}.ts` registrado em `lib/registry.ts`.

## Como executar

OBRIGATORIO: invocar o CLI via Bash. NUNCA simular steps manualmente — sem o CLI, o scaffold
de 30+ harness docs nao roda e o plano gerado sera reduzido e incorreto.

Este SKILL.md esta em `PLUGIN_ROOT/skills/init/SKILL.md`.
O CLI esta em `PLUGIN_ROOT/scripts/init-cli.ts` (dois niveis acima daqui).

```bash
# TARGET_DIR = $ARGUMENTS se fornecido, caso contrario current dir
bun "PLUGIN_ROOT/scripts/init-cli.ts" --cwd="TARGET_DIR"
```

Para obter PLUGIN_ROOT: substituir `skills/init/SKILL.md` pelo caminho real deste arquivo
e subir 2 diretorios. Exemplo Windows:
  SKILL.md em `f:\Projetos\Anti-Vibe-Coding\skills\init\SKILL.md`
  CLI em      `f:\Projetos\Anti-Vibe-Coding\scripts\init-cli.ts`

Flags disponiveis: `--dry-run`, `--refresh`, `--additive-merge`, `--rollback`.

## Fluxo de Steps (documentacao)

A tabela abaixo eh **documentacao gerada a mao**. A fonte de verdade do runtime eh
`lib/registry.ts` (consumido por `runInit`). Se divergirem, o registry vence.

| # | ID | Quando roda | Helper(s) | Args/Flags |
|---|----|----|----|----|
| 1 | `reentry-gate` | sempre | inline (le `.claude/.anti-vibe-manifest.json`) | — |
| 2 | `detect-legacy-and-stack` | sempre | `detect-v5-legacy.ts`, `detect-stack.ts` | — |
| 3 | `03-secrets-scan` | sempre | `secrets-scanner.ts`, `discovery-store.ts`, `init-subagent-ids.ts`, `audit-log.ts` | — |
| 4 | `migrate-planning-and-manifest` | sempre (no-op se nao ha legacy) | `migrate-planning.ts`, `detect-stack.ts`, `detect-v5-legacy.ts` | — |
| 5 | `05-scaffold-and-link` | sempre | `detect-project-name.ts`, `scaffold-full-tree.ts`, `symlink-fallback.ts` | — |
| 5b | `inject-harness-scripts` | se `package.json` existe | inline (merge de scripts) | — |
| 6 | `06-install-gh-files` | sempre (D14) | `install-gh-files.ts` | — |
| 7 | `generate-populate-plans` | sempre | `populate-plan-generator.ts`, `detect-stack.ts` | — |
| 8 | `delivery-loop` | opcional, opt-in | `inject-optional-section.ts` + `assets/snippets/delivery-loop.md` | resposta `y`/`N` |
| 9 | `copy-knowledge` | se stack detectada | `run-stack-knowledge-init.ts` | — |
| 10 | `final-validation` | sempre | `validator-allowlist.ts`, `scripts/harness-validate.ts` | — |
| 11 | `write-anti-vibe-manifest` | sempre, ultimo | `read-plugin-version.ts`, `manifest-writer.ts` | — |

<!-- 2026-09-05 (Luiz/dev): tabela reescrita a partir de `lib/registry.ts`. A anterior descrevia o
     pipeline v6 e sobreviveu ao refactor init-v7 sem ser atualizada: das 17 linhas, ~14 nomeavam
     steps que o commit 6dd3b36 deletou ou fundiu, e CINCO steps reais (`03-secrets-scan`,
     `generate-populate-plans`, `write-anti-vibe-manifest`, `inject-harness-scripts`,
     `copy-knowledge`) nao apareciam uma unica vez.

     Removidos com justificativa rastreavel (regra "nunca diminuir" — cada linha tem o porque):
     - `capabilities-discovery`  -> D5 do init-refactor-v7: "Remover — nao queremos essa
       complexidade" (CONTEXT.md linha 43, origem dev). `capabilities-writer.ts` segue no repo,
       marcado como nao-ligado; nao ha step que o chame.
     - `migrate-0-parse-dry-run`, `migrate-all-orchestrate` -> D4 (dry-run removido).
     - `reuse-discovery` -> D3/D5; o helper `reuse-discovery.ts` tambem ficou fora do registry.
     - `migrate-1-backup`, `migrate-3-lessons`, `migrate-4-decisions` -> deletados em 6dd3b36
       (AUDIT.md: "Steps 100% obsoletos"); o que sobrou virou `migrate-planning-and-manifest`.
     - `detect-legacy` + `detect-stack-and-register` -> fundidos em `detect-legacy-and-stack`.
     - `scaffold-full-tree` + `link-claude-agents` -> fundidos em `05-scaffold-and-link`.
     - `customize-architecture` -> deletado em 6dd3b36 (D11: ARCHITECTURE.md passa a ser
       populate-plan individual, gerado pelo Step 7).
     - `persist-stack-knowledge` -> renomeado `copy-knowledge`.

     Os ids com prefixo numerico (`05-scaffold-and-link`, `06-install-gh-files`) estao assim no
     codigo; a tabela copia o id real em vez de normalizar. -->

> **Nota de manutencao.** Esta tabela ja carregava o aviso "se divergirem, o registry vence" e
> mesmo assim ficou ~4 meses descrevendo um pipeline que nao existia. Aviso de divergencia nao
> substitui conferir: ao mexer no registry, atualize esta tabela no mesmo commit.

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
- **Nada e perdido** — o que sai do CLAUDE.md original e realocado, nunca descartado
- **SEMPRE** criar backup antes de modificar
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar
- **Default destrutivo + revogavel** — em projetos com CLAUDE.md pre-existente, o init **transforma** o CLAUDE.md em espelho <=40 linhas (D2/D26/D28) extraindo regras Akita para `docs/DESIGN.md`. NUNCA aplica essa transformacao sem (a) aprovacao explicita do dev via `needsUser` agregado (MH-04) e (b) backup recuperavel em `.anti-vibe/backup/{timestamp}/` (D9, D29). Reversibilidade garantida via `/anti-vibe-coding:init --rollback` (MH-07).
- **Opt-in conservador disponivel:** `/anti-vibe-coding:init --additive-merge` preserva o comportamento da v6.3.x (merge aditivo, sem reescrever CLAUDE.md, sem backup) para users que ainda nao querem migrar para o novo formato (SH-09). Documentado tambem em `docs/design-docs/ADR-NNNN-destructive-merge-default.md` (Plano 06 fase-03).
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**
- **Passo que sobrevive a sessao** — pegar `DATABASE_URL` num painel, criar secret de deploy no GitHub Actions — nao e pergunta: `AskUserQuestion` cobre resposta que o agente usa para agir agora; para o que o dev faz fora daqui, e talvez repita depois, ofereca `/anti-vibe-coding:wizard`

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
