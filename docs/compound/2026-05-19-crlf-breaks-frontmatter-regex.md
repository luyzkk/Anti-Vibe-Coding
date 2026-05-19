---
title: "CRLF silencioso quebra regex de frontmatter em Windows"
category: bug
tags: [windows, crlf, regex, validator, markdown, frontmatter, cross-platform]
created: 2026-05-19
---

## Problem

O harness-validate rejeitou `active-storage.md` com erro de frontmatter mesmo o arquivo estando visualmente correto. A regex do validator era `/^---\n/` — espera LF após os traços. O arquivo tinha `\r\n` (CRLF), padrão do Windows quando o editor salva sem `.editorconfig` ou `core.autocrlf`.

`wc -l` reportou 103 linhas. O arquivo parecia OK em todos os editores. O erro era invisível.

## Solution

Conversão CRLF→LF via Python one-liner:

```bash
python -c "
import sys
content = open(sys.argv[1], 'rb').read()
open(sys.argv[1], 'wb').write(content.replace(b'\r\n', b'\n'))
" path/to/file.md
```

Verificação: `file path/to/file.md` deve retornar `ASCII text` (não `CRLF line terminators`).

## Prevention

**Imediato:** adicionar `.editorconfig` na raiz com `end_of_line = lf` + `charset = utf-8` para todos os arquivos `*.md`.

**No validator:** aceitar ambos os formatos (`/^---\r?\n/`) em vez de só LF — isso fecha o bug silenciosamente para qualquer arquivo gerado no Windows sem `.editorconfig`.

```typescript
// Em vez de /^---\n/
const FRONTMATTER_START = /^---\r?\n/
```

**Sinal de alerta:** `bun run harness:validate` falha com "frontmatter missing" em arquivo que parece correto no editor → primeiro suspeito é CRLF.

**Gotcha relacionado:** `git diff` não mostra `\r` em modo normal — usar `git diff --ws-error-highlight=all` ou `cat -A file.md | head -3` para revelar `^M` no final das linhas.
