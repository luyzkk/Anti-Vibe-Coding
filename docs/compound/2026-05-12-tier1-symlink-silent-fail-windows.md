---
title: "Tier 1 symlink fallback fails silently on Windows git-bash"
category: platform-gotcha
tags: [windows, symlink, hooks, fallback, install, d16]
created: 2026-05-12
---

## Problem

D16 do plugin define um 3-tier symlink fallback para `CLAUDE.md → AGENTS.md`:

- **Tier 1:** POSIX `ln -s` (true symlink, mesmo inode).
- **Tier 2:** Windows `mklink /H` (hard link, inode compartilhado em NTFS).
- **Tier 3:** `cp` (regular file copy, requer hook de resync).

Em Plano 08 fase-08, Tier 1 foi executado em git-bash no Windows e retornou **exit 0** — sucesso aparente. Verificacao posterior:

```bash
$ stat -c%h CLAUDE.md
1                          # esperado 2 (hard link com AGENTS.md)
$ stat -c%i CLAUDE.md AGENTS.md
{X}                        # inodes diferentes
{Y}
$ diff CLAUDE.md AGENTS.md
                           # vazio (conteudo identico)
```

Comportamento real: git-bash emulou `ln -s` como **copia regular**. Exit code mente. Conteudo identico no momento da criacao, mas qualquer edit subsequente em AGENTS.md NAO propaga para CLAUDE.md.

Impacto: Tier 1 do D16 degrada silenciosamente para Tier 3 em ambientes Windows sem developer mode. Sem hook de resync, AGENTS.md e CLAUDE.md divergem ao longo do tempo.

## Solution

1. Detectar Tier 3 silencioso via `stat -c%h` ou `fs.lstat().isSymbolicLink()` **apos** o comando, nao via exit code.
2. Quando deteccao indica copy real (link count == 1 OU isSymbolicLink() == false), tratar como Tier 3 e exigir hook de resync.
3. Criar `hooks/agents-md-sync.cjs` (PostToolUse em Edit/Write de AGENTS.md) que regrava CLAUDE.md com conteudo identico.
4. Documentar em ARCHITECTURE.md que Windows sem dev mode = Tier 3 efetivo, com mitigation via hook.

Pendente em Plano 09 (release): implementar `hooks/agents-md-sync.cjs`. TODO.md item criado em `anti-vibe-coding/TODO.md`.

## Prevention

- **Nunca confiar em exit code para validar criacao de symlink em ambientes cross-platform.** Sempre verificar via stat/lstat apos o comando.
- Em scripts de install/sync que dependem de symlink semantics, adicionar `verifySymlink(path)` que checa link count > 1 OU isSymbolicLink() === true.
- Para arquivos derivados (CLAUDE.md de AGENTS.md, README espelhos, etc.), preferir hook de resync em vez de symlink: comportamento previsivel em todas plataformas, custo trivial.
- Documentar limitacoes de plataforma EXPLICITAMENTE no D16 / equivalente, nao deixar como "Tier 1 sempre funciona em Linux/Mac, Windows tem fallback transparente".
- git-bash emulation layer pode ter divergencias sutis vs Linux puro — testar comandos relevantes em CI Windows + Linux + Mac.

## Affected files

- `anti-vibe-coding/CLAUDE.md` (Tier 3 copy em vez de symlink, criado em commit `8cab16c`)
- `anti-vibe-coding/AGENTS.md` (source-of-truth, 35 linhas)
- `anti-vibe-coding/TODO.md` (item: criar hooks/agents-md-sync.cjs)
- D16 documentado em `anti-vibe-coding/ARCHITECTURE.md` ou `docs/design-docs/`
- Discovery em: `.planning/2026-05-11-v60-harness-compound-fusion/plano08/MEMORY.md` (GT-6, DEV-3, DI-17)
