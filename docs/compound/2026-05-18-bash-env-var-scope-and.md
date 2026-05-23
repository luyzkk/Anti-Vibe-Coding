---
title: "Bash VAR=x && cmd does NOT export VAR to cmd"
category: shell-gotcha
tags: [bash, env-var, scope, subprocess, plugin-corruption]
created: 2026-05-18
---

## Problem

Tentativa de passar `PROJECT_PATH` para um `bun -e "..."` durante validação manual do fix `resolveNativeCwd`:

```bash
PROJECT_PATH="C:\Users\luizf\Videos\Carreirarte - ANTI VIBE CODING" && bun -e "..."
```

Resultado: o bun rodou SEM `process.env.PROJECT_PATH` definido. O codigo fez fallback para `process.cwd()`, que era o diretorio do proprio plugin (`C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\6.4.1\skills\init\`). O dispatcher do init scaffoldou o proprio cache do plugin contra si mesmo, sobrescrevendo `SKILL.md` (87 linhas → 3-line stub), criando `.anti-vibe/`, `docs/`, `AGENTS.md`, etc. dentro do `skills/init/`.

Causa raiz: em bash, `VAR=x` antes de `&&` NAO eh uma exportacao — eh uma atribuicao para uma "command" vazia (apenas a atribuicao, sem executar nada com aquele env). O proximo comando apos `&&` roda em um escopo de ambiente que NAO viu aquela atribuicao.

3 formas que parecem equivalentes mas tem semanticas diferentes:

```bash
VAR=x && cmd        # WRONG: cmd nao ve VAR
VAR=x cmd           # OK: cmd ve VAR (inline, scope da chamada)
export VAR=x; cmd   # OK: cmd ve VAR (scope do shell, persiste)
```

Impacto desta corrupcao especifica: cache global do plugin v6.4.1 ficou inutilizavel (SKILL.md virou stub, fixtures contaminadas com diretorio literal `UsersluizfVideosCarreirarte - ANTI VIBE CODING/`). Recovery exigiu mover `6.4.1/` inteiro para `_trash-2026-05-18-corrupted-6.4.1/` e re-rodar `sync-to-global.sh`.

## Solution

1. Quando precisar passar env var para um subprocess pontual: usar **forma inline** `VAR=x cmd` — escopo perfeito, sem poluir o shell.
2. Quando precisar de persistencia: `export VAR=x; cmd` (separador `;`, nao `&&`).
3. Nunca confiar em `VAR=x && cmd` para passar `VAR` para `cmd` — o `&&` separa em comandos distintos.
4. Em scripts que usam env vars para configurar paths/cwd de subprocessos (ex: dispatcher do init), preferir argumentos CLI explicitos em vez de env vars opacas — o erro de scope vira erro de parsing visivel, nao falha silenciosa.

## Prevention

- **Code review de scripts bash**: rejeitar `VAR=x && cmd` automaticamente; sugerir `VAR=x cmd` ou `export VAR=x; cmd`.
- **Dispatchers que dependem de env var para identificar projeto-alvo** (ex: `PROJECT_PATH`, `TARGET_DIR`): documentar EXPLICITAMENTE no SKILL.md a forma correta de invocacao, com exemplo copy-paste-able.
- **Fallback defensivo**: quando o subprocess detecta que a env var critica esta ausente, abortar com mensagem explicita em vez de cair em `process.cwd()` silenciosamente — falha visivel > corrupcao silenciosa.
- **Teste manual cross-shell**: sempre validar o snippet em bash, zsh, PowerShell antes de cola-lo em SKILL.md / docs. Git Bash no Windows tem comportamento POSIX mas com gotchas adicionais (paths, line endings).

## Affected files

- `skills/init/lib/run-init.ts` (recebeu o `cwd` errado por causa do fallback para `process.cwd()`)
- `C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\6.4.1\` (corrompido; movido para `_trash-2026-05-18-corrupted-6.4.1/`)
- `docs/exec-plans/active/2026-05-18-init-cascade-fix.md` (plano de remediacao)
