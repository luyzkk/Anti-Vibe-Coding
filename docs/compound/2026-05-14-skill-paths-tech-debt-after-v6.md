---
title: "Path-em-doc-skill envelhece em silencio quando o layout do repo migra"
category: armadilha
tags: [skills, layout-migration, validator, harness, docs-vs-code, v6]
created: 2026-05-14
---

## Problem

Apos a migracao v5 -> v6 (de `.planning/` para `docs/exec-plans/`), o comando `/init` foi corretamente atualizado para escrever no novo layout. Os testes passavam, o `harness:validate` passava, o `compound:check` passava.

Mesmo assim, 9 SKILL.md ainda diziam ao agente que devia escrever em `.planning/`:

- `skills/write-prd/SKILL.md`: 17 ocorrencias hardcoded de `.planning/{date-slug}/PRD.md`
- `skills/plan-feature/SKILL.md`: 27 ocorrencias em fluxo principal
- `skills/execute-plan/SKILL.md`: 25 ocorrencias em discovery + verify pos-plano
- `skills/verify-work/SKILL.md`: 14 ocorrencias, incluindo o fluxo de arquivamento `mv .planning/{slug} .planning/_archive/{slug}` (em v6 deveria ser `mv docs/exec-plans/active/{slug} docs/exec-plans/completed/{slug}`)
- `skills/grill-me/SKILL.md`: 5
- `skills/lessons-learned/SKILL.md`: 4
- `skills/quick-plan/SKILL.md`: 2 descritivas (no campo `description` e na lista "o que NAO faco")
- `skills/iterate/SKILL.md`: 1 Glob
- `skills/design-twice/SKILL.md`: 1
- `templates/SUMMARY.md`: 1

Resultado real (descoberto investigando o PRD `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`): um PRD criado em 2026-05-14 aterrou em `.planning/2026-05-14-init-migration-mode/` pela orientacao da skill, mesmo que a v6 ja estivesse vigente e `/init` ja apontasse para `docs/`. O agente seguiu a instrucao da SKILL.md ao pe da letra — porque skills sao contratos para o agente, nao codigo executavel.

Categoria do bug: __divergencia silenciosa entre instrucao-em-doc e estado-real-do-repo__.

## Solution

Migrar todas as 9 skills + 1 template para apontarem a v6 (`docs/exec-plans/active/`, `docs/exec-plans/completed/`), preservando intencionalmente:

- `skills/init/**` (cuja missao e detectar v5 e migrar)
- `skills/lib/legacy-detector.md` e `skills/lib/legacy-migrator.md` (chamados por `/init`)
- `skills/lib/state-utils.md` (legado pre-init que ficou de fora do escopo)
- Step 0 de `plan-feature` e `execute-plan` (caminho de fallback "v5 detectado, oferece migrar" — mantido para D10)
- 2 referencias de teste em `skills/lib/completion-signal.test.ts` (fixture, nao operacional)
- `hooks/prompt-guard.cjs` (security check em arquivos `.planning/*` para repos em migracao)
- Artefatos historicos: `tests/fixtures/legacy-v5/`, `docs/references/v5-legacy/`, `docs/exec-plans/completed/_legacy-detail/`

Execucao em 3 batches (Batch A: pipeline principal; Batch B: execucao/verificacao; Batch C: cleanup + templates), com `bun run harness:validate` apos cada batch.

Smoke test end-to-end: invocar `/anti-vibe-coding:write-prd` em ambiente limpo, conferir que o PRD aterra em `docs/exec-plans/active/` e nao em `.planning/`.

## Prevention

__Adicionar check ao `scripts/harness-validate.ts`__: skills em v6 nao podem referenciar paths v5 fora de uma whitelist explicita (init/**, legacy-*, state-utils.md, fixtures). Falha de validacao bloqueia merge.

Regra geral: __toda migracao de layout precisa de uma varredura grep automatizada como gate de release__. Nao basta atualizar `/init` e ver os testes passarem — paths em SKILL.md, templates e descricoes de skill sao parte do contrato vivo com o agente e nunca sao executados pelos testes.

Sub-regra: __path-em-doc vs path-em-codigo precisam de validacao distinta__. Codigo apontando para path antigo quebra um teste de import. Doc apontando para path antigo quebra silenciosamente — o agente segue a instrucao e cria arquivos no lugar errado, sem nenhum sinal de erro ate alguem ir ler o filesystem.

Quando lancar uma nova versao com mudanca de layout, expandir a whitelist de paths "preservados" e adicionar o path antigo a uma lista de "paths proibidos fora da whitelist" em `harness-validate.ts`.

## See Also

- Plano executor: `docs/exec-plans/completed/2026-05-14-skill-paths-v6-migration.md`
- Snapshot de audit antes da migracao: `docs/exec-plans/completed/2026-05-14-skill-paths-v6-migration.audit.txt`
- ADR relacionado: `docs/design-docs/ADR-*` (procurar "layout v5->v6")
