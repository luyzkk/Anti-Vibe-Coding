---
title: "Quality-gate regex must skip comments, not match the whole file"
category: bug
tags: [validator, regex, quality-gate, false-positive, shell]
created: 2026-05-12
---

## Problem

Em Plano 09 fase-04, ao reescrever `scripts/sync-to-global.sh` para v6, o desenvolvedor adicionou um comentário WHY explicando uma decisão técnica:

```bash
# 2026-05-12 (Luiz/dev): cp -r em vez de rsync - rsync nao garantido em Git Bash Windows nativo
```

O comentário menciona `rsync` em contexto puramente explicativo. Em seguida, um check de equivalência rodava:

```bash
! grep -qE 'rsync|realpath|readlink -f' scripts/sync-to-global.sh
```

A intenção do gate era garantir que o script body não dependa de utilitários não-POSIX. Mas `grep` por default casa em qualquer linha — incluindo comentários. O gate reportou FAIL apesar do script body ser POSIX-puro.

## Solution

Validadores de quality gate baseados em regex devem rodar contra o **body** do script (sem comentários), não contra o arquivo bruto:

```bash
grep -v '^[[:space:]]*#' scripts/sync-to-global.sh | grep -qE 'rsync|realpath|readlink -f'
```

Ou, equivalentemente, usar uma ferramenta que entenda a linguagem (e.g. `shellcheck` para shell, `tree-sitter` para queries estruturais). Regex sobre texto bruto trata comentários como código — quase sempre errado para gates de equivalência ou ausência.

No caso concreto, o gate foi documentado como false-positive em DI-06 (Plano 09) e o comentário preservado (Princípio Universal #5 — Comment Provenance: comentários são parte do histórico de raciocínio do código).

## Prevention

- **Antes de adicionar um regex gate, pergunte: e se o token aparecer num comentário?** Se a resposta for "ainda assim falha", o gate está errado.
- Para gates de ausência (`! grep TOKEN`), strip comentários primeiro. Para gates de presença, idem — uma referência em comentário não é uso real.
- Em ferramentas de auditoria CI (ESLint custom rules, gates shell, linters caseiros), preferir parsers AST sobre regex quando a granularidade importa.
- Quando um gate dispara FAIL em código que parece correto, o primeiro hipótese deve ser "o gate está strict demais" antes de "o código está errado" — especialmente se o token aparece num comentário ou string literal.

## Affected files

- Reflexão sobre `anti-vibe-coding/scripts/sync-to-global.sh` (comentário preservado em linha 35)
- Discovery em: `.planning/2026-05-11-v60-harness-compound-fusion/plano09/MEMORY.md` (DI-06)
- Padrão relacionado: `2026-05-12-dog-food-reveals-strict-validators.md` (mesmo tema: validadores ingênuos)
