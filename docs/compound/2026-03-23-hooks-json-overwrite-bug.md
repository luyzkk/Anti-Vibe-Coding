---
title: "hooks.json overwrite bug during init"
category: bug-history
tags: [hooks, manifest, install, regression]
created: 2026-03-23
---

## Problem

Ao rodar `/anti-vibe-coding:init` em projeto com hooks customizados, o `hooks.json` foi completamente substituído. Hooks customizados do projeto (doc-enforcement.cjs, design-validator.cjs, etc.) perderam configuração. Arquivos `.cjs` do plugin foram copiados para `.claude/hooks/` do projeto (duplicação).

Causa raiz:
1. `plugin-manifest.json` tinha `hooks/hooks.json` com `updateStrategy: "replace"`
2. `plugin-manifest.json` listava arquivos `.cjs` individuais (tdd-gate.cjs, user-prompt-gate.cjs) — não deviam ser rastreados
3. `skills/init/SKILL.md` não documentava como fazer merge de hooks
4. Implementação estava copiando arquivos cegamente sem merge

Impacto: Projeto Carreirarte perdeu configuração de hooks customizados; `doc-enforcement.cjs` parou de funcionar; hooks duplicados no projeto (deviam estar só no cache do plugin).

## Solution

1. Mudou `updateStrategy` de `hooks/hooks.json` para `"merge"` no manifest
2. Removeu arquivos `.cjs` individuais do manifest (não devem ser rastreados)
3. Adicionou Passo 4 no init skill documentando merge de hooks
4. Criou `skills/lib/hooks-merge-utils.md` com algoritmo de merge
5. Corrigiu manualmente `hooks.json` do Carreirarte
6. Removeu arquivos `.cjs` duplicados do projeto Carreirarte

Lições:
- Hooks `.cjs` do plugin NUNCA devem ser copiados para projetos — vivem em `$CLAUDE_PLUGIN_ROOT/hooks/`
- Hooks customizados do projeto ficam em `.claude/hooks/*.cjs`
- `hooks.json` deve combinar AMBOS via merge: projeto primeiro, plugin depois; preservar matchers; sempre criar backup antes

## Prevention

- Documentar TODOS os passos de instalação no SKILL.md
- Testar `init` em projeto com customizações existentes
- Validar que `updateStrategy` está correto para cada tipo de arquivo
- Arquivos que devem ser merged: CLAUDE.md, rules/*.md, hooks/hooks.json
- Arquivos que devem ser replaced: agents/*.md, skills/*.md, senior-principles.md
- Arquivos que NUNCA devem ser copiados: hooks/*.cjs (do plugin)

## Affected files

- `plugin-manifest.json` (linha 66-70)
- `skills/init/SKILL.md` (linhas 288-337)
- `skills/lib/hooks-merge-utils.md` (novo)
- Projeto Carreirarte: `.claude/hooks/hooks.json` (corrigido manualmente)
