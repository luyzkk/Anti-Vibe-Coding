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

**No validator — CORRIGIDO em 2026-08-18, a versão abaixo era meia correção:**

> ~~aceitar ambos os formatos (`/^---\r?\n/`) em vez de só LF~~
>
> ```typescript
> // Em vez de /^---\n/
> const FRONTMATTER_START = /^---\r?\n/
> ```

Tolerar `\r?` **só na regex de abertura não basta** e é pior que não corrigir, porque parece
completo. O `\r` continua dentro do bloco capturado e vaza para os valores dos campos:
`created: 2026-05-14\r`, `updated: 2026-05-16\r`. Aí uma regex de campo ancorada em `$` —
`created:\s*(\d{4}-\d{2}-\d{2})$` — falha do mesmo jeito, agora por um motivo que não parece CRLF,
porque o frontmatter "foi encontrado".

**A correção é normalizar na entrada do parser**, e manter o `\r?` só como defense-in-depth:

```typescript
// Primeiro: normaliza. Isso conserta a regex de abertura E todas as regex de campo de uma vez.
const content = raw.replace(/\r\n/g, '\n')
// Depois: \r? como rede, caso alguém remova o normalize acima no futuro.
const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
```

Aplicado em `skills/lib/exec-plan-reader.ts`, `skills/init/lib/atoms-frontmatter-validator.ts` e
`skills/init/lib/compound-writer.ts` (PR #44). O `exec-plan-reader` era o pior dos três: sem
`normalize` ele não lançava erro — caía no fallback `{frontmatter: ''}` e `isComplete()` devolvia
`false` em silêncio, fazendo plano completo parecer incompleto.

**A prevenção "Imediato" acima só foi aplicada em 2026-08-18** — o `.editorconfig` ficou três meses
prescrito e não escrito. Ver
`docs/compound/2026-08-18-item-de-backlog-nomeia-o-site-que-gritou.md`.

**Sinal de alerta:** `bun run harness:validate` falha com "frontmatter missing" em arquivo que parece correto no editor → primeiro suspeito é CRLF.

**Gotcha relacionado:** `git diff` não mostra `\r` em modo normal — usar `git diff --ws-error-highlight=all` ou `cat -A file.md | head -3` para revelar `^M` no final das linhas.
