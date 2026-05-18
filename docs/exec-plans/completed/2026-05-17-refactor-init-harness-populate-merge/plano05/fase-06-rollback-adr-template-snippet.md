<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): rollback ADR — D10 + MH-07 + CA-06`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 06: Rollback ADR Template Snippet

**Plano:** 05 — Modos Reversiveis
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase do grafo do ponto de vista executavel — content-only, sem TDD codigo)
**Visual:** false

---

## O que esta fase entrega

Snippet `assets/snippets/rollback-adr-template.md` com 6 marcadores literais de substituicao. Consumido pela fase-04 (`lib/rollback.ts`) durante restore para gerar `docs/design-docs/ADR-NNNN-rollback-init-{date}.md` automaticamente apos sucesso. Documenta o motivo do rollback no historico de ADRs do projeto (D10 + MH-07).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/snippets/rollback-adr-template.md` | Create | Template Markdown com 6 marcadores literais (`{NUMBER}`, `{date}`, `{backup_ts}`, `{git_sha}`, `{N}`, `{restored_files_list}`) consumido em runtime pelo rollback writer da fase-04 |

---

## Implementacao

### Passo 1: Criar o snippet em `skills/init/assets/snippets/`

Arquivo eh Markdown puro com marcadores literais (NAO eh Mustache, NAO eh Handlebars — substituicao mecanica via `String.prototype.replaceAll` na fase-04). Marcadores usam chaves simples `{nome}` para nao colidir com sintaxe Markdown nem com JSON.

Conteudo exato (≤30 linhas):

```markdown
# ADR-{NUMBER}: Rollback of /anti-vibe-coding:init — {date}

**Status:** Accepted
**Date:** {date}
**Backup restored:** `.anti-vibe/backup/{backup_ts}/`
**Git SHA at rollback:** {git_sha}

## Context

Dev invoked `/anti-vibe-coding:init --rollback`. This ADR documents the rollback so future investigations have a record of when and why the destructive merge applied by `/init` was reverted.

## Decision

Restored {N} files from backup at `.anti-vibe/backup/{backup_ts}/`. State of repo returned to pre-init checkpoint. Backup manifest checksum integrity validated before any file was restored (per D29 schema + CA-10).

## Restored Files

{restored_files_list}

## Consequences

- Repo returned to state at {backup_ts}.
- CLAUDE.md original content recovered byte-identico (per CA-06).
- If `/init` is re-attempted, dev may want to address the issue that prompted rollback first (e.g., revise classification heuristic output, adjust `--additive-merge` opt-in, edit secrets in flagged files).
- The backup directory `.anti-vibe/backup/{backup_ts}/` is preserved for forensic reference.

<!-- 2026-05-18 (Luiz/dev): template para `lib/rollback.ts` fase-04 — D10 + MH-07 + CA-06 -->
```

### Passo 2: Convencao de substituicao (documentar no proprio snippet via comentario HTML final)

A linha final do snippet eh um comentario HTML invisivel ao usuario final documentando que o arquivo eh template:

```markdown
<!-- 2026-05-18 (Luiz/dev): template para `lib/rollback.ts` fase-04 — D10 + MH-07 + CA-06 -->
```

Esse comentario eh mantido no ADR gerado (sobrevive a substituicao). Sinaliza ao dev/auditor que o ADR foi gerado por automacao, nao escrito manualmente.

### Passo 3: Lista de marcadores (especificacao para fase-04 consumir)

| Marcador | Tipo | Exemplo runtime |
|----------|------|-----------------|
| `{NUMBER}` | string (zero-padded 4 digits) | `0007` |
| `{date}` | string (ISO date YYYY-MM-DD) | `2026-05-18` |
| `{backup_ts}` | string (ja path-safe) | `2026-05-18T14-30-00Z` |
| `{git_sha}` | string ou `null` literal | `abc123de` ou `null` (sem git) |
| `{N}` | numero como string | `4` |
| `{restored_files_list}` | string Markdown multi-linha | `- CLAUDE.md\n- docs/ARQUITETURA.md\n- docs/STRIPE_INTEGRATION.md\n- CONTRIBUTING.md` |

**Decisao de design:** marcadores sao TEXTUAIS (substituicao mecanica via `.replaceAll('{NUMBER}', value)`). Sem engine de template — uma dependencia evitada (`bun add handlebars` foi rejeitado: 50KB extra para 6 substituicoes nao se justifica).

---

## Gotchas

- **G1 do plano (G9 — ADR numbering):** O `{NUMBER}` eh calculado em runtime pela fase-04, NAO faz parte do template. Template apenas reserva o lugar.
- **G2 do plano (G2 — manifest integrity):** O `{restored_files_list}` reflete EXATAMENTE os arquivos que passaram pelo checksum gate em fase-04. Se rollback aborta por integrity check failure, o ADR NAO eh escrito (a fase-04 retorna `adrPath: null`).
- **Local: marcadores nao podem conflitar com sintaxe Markdown ou JSON.** Chaves simples `{nome}` sao seguras — nao colidem com `[link](url)`, `**bold**`, codeblocks ou `{ "key": "value" }` JSON. Decisao registrada na MEMORY.md como DI-1 apos execucao.
- **Local: chaves duplas `{{nome}}` foram rejeitadas.** Plano 03 fase-05 usa `{{FILE_PATH}}` em `classifier-llm-prompt.md` — convencao DIFERENTE deliberadamente (LLM prompts usam Mustache-like). Snippets de templates de ADR/Plan usam chave simples. Marcado em MEMORY.md.

---

## Verificacao

### TDD

N/A — content-only authoring. Validacao por grep + line-count.

- [ ] **Validacao por grep:** Comando `grep -o '{[A-Za-z_]*}' skills/init/assets/snippets/rollback-adr-template.md | sort -u | wc -l` retorna `6`.
- [ ] **Validacao de marcadores especificos:** Comando `grep -c '{NUMBER}\|{date}\|{backup_ts}\|{git_sha}\|{N}\|{restored_files_list}' skills/init/assets/snippets/rollback-adr-template.md` retorna `>= 6` (cada marcador aparece ao menos 1 vez).
- [ ] **Limite de tamanho:** `wc -l skills/init/assets/snippets/rollback-adr-template.md` retorna `<= 30`.

### Checklist

- [ ] Arquivo `skills/init/assets/snippets/rollback-adr-template.md` existe.
- [ ] Os 6 marcadores literais aparecem ao menos 1 vez cada (verificavel via grep).
- [ ] Arquivo ≤30 linhas (sem inflar ala Akita).
- [ ] Comentario HTML final presente com provenance (`2026-05-18 (Luiz/dev): template para lib/rollback.ts fase-04`).
- [ ] Sem dependencia de engine de template (substituicao mecanica via `.replaceAll`).
- [ ] Lint nao se aplica (Markdown puro) — mas a fase-04 que consome roda lint TS.

---

## Criterio de Aceite

**Por maquina:**
- `grep -o '{[A-Za-z_]*}' skills/init/assets/snippets/rollback-adr-template.md | sort -u | wc -l` retorna exatos `6`.
- `wc -l < skills/init/assets/snippets/rollback-adr-template.md` retorna valor `<= 30`.
- `ls skills/init/assets/snippets/rollback-adr-template.md` nao retorna erro.

**Por humano:**
- ADR de exemplo (rendered com valores fake) eh legivel e bate o padrao dos outros ADRs em `docs/design-docs/` do proprio repo plugin.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
