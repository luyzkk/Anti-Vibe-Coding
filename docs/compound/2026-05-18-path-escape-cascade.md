---
title: "Windows path escapes get mangled across bash → bun → JS string layers"
category: shell-gotcha
tags: [windows, path, escape, bash, bun, plugin-corruption]
created: 2026-05-18
referenced-by: [docs/references/init-step-contract.md]
---

## Problem

Tentativa de passar um path Windows literal para um `bun -e` durante validacao manual:

```bash
bun -e "import { runInit } from '...'; await runInit([], { cwd: 'C:\\\\Users\\\\luizf\\\\Videos\\\\Carreirarte - ANTI VIBE CODING' })"
```

A intencao era passar `C:\Users\luizf\Videos\Carreirarte - ANTI VIBE CODING` para o `cwd`. Resultado real: o dispatcher recebeu `C:UsersluizfVideosCarreirarte - ANTI VIBE CODING` (sem separadores), e quando o init scaffoldou, criou uma pasta com esse nome literal dentro do plugin cache: `skills/init/UsersluizfVideosCarreirarte - ANTI VIBE CODING/`.

Causa raiz: a string passou por **3 layers de escape**, cada um consumindo um nivel de `\`:

1. **Bash double-quoted string** consome 1 nivel — `\\\\` vira `\\`
2. **Bun parser do `-e`** consome outro — `\\` vira `\`
3. **JS string literal** consome o ultimo — `\U` vira o caractere literal `U` (escape JS nao reconhecido, `\U` colapsa para `U`)

Resultado liquido: `\\\\Users` → `\\Users` → `\Users` → `Users` (o `\` foi consumido como escape inutil, deixando so o `U`).

Combinado com o bug do `VAR=x && cmd` (lesson irma), o cache global do plugin foi corrompido — `runInit` rodou contra o proprio diretorio do plugin (cwd default `process.cwd()`), e criou os artefatos do scaffold com o nome mangled como subdir adicional.

## Solution

Tres alternativas confiaveis para passar paths Windows entre shells:

1. **Arquivo intermediario** (mais simples e a prova de bala):
   ```bash
   echo 'C:\Users\luizf\Videos\Carreirarte - ANTI VIBE CODING' > /tmp/target
   bun -e "import { runInit } from '...'; await runInit([], { cwd: require('fs').readFileSync('/tmp/target', 'utf8').trim() })"
   ```

2. **JSON.stringify-friendly** via `printf %q` ou base64:
   ```bash
   TARGET_B64=$(printf '%s' 'C:\Users\luizf\Videos\...' | base64)
   bun -e "const cwd = Buffer.from('$TARGET_B64', 'base64').toString('utf8'); ..."
   ```

3. **POSIX path em vez de Windows** + normalizacao no codigo (combina com `resolveNativeCwd` ja implementado em `run-init.ts`):
   ```bash
   bun -e "import { runInit } from '...'; await runInit([], { cwd: '/c/Users/luizf/Videos/Carreirarte - ANTI VIBE CODING' })"
   ```

## Prevention

- **Nunca usar `\\\\` em strings de codigo embutido em shell** — eh sinal de que voce nao tem certeza de quantos layers vai atravessar. Use uma das 3 alternativas acima.
- **Para invocacoes manuais durante debug**, prefira POSIX paths (`/c/Users/...`) + `resolveNativeCwd` no lado do codigo — o normalizador foi adicionado em `run-init.ts:16-23` exatamente para isso.
- **Sanity check antes de rodar**: imprimir o que o codigo vai usar (`console.log({ cwd: opts.cwd })`) antes de qualquer side-effect destrutivo. Se o path parecer mangled, abortar.
- **Defensive guard no proprio dispatcher**: se o cwd recebido nao passa `path.isAbsolute()` + `fs.existsSync()`, abortar com erro explicito em vez de cair em fallback silencioso.

## Affected files

- `skills/init/lib/run-init.ts` (recebeu cwd mangled; ja tem `resolveNativeCwd` que mitiga PARTE do problema mas nao protege contra escape cascade)
- `C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\6.4.1\skills\init\UsersluizfVideosCarreirarte - ANTI VIBE CODING\` (pasta literal criada; movido junto com o resto do cache para trash)
- `docs/compound/2026-05-18-bash-env-var-scope-and.md` (lesson irma — as duas falhas juntas causaram o desastre)
