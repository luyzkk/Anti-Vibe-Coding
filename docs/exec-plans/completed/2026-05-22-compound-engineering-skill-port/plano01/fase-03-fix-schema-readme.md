<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): schema canônico title/category/tags/created — PRD MH-01, D3`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Fix Schema do `compound/README.md.tpl` (Bug MH-01)

**Plano:** 01 — Fundação + Bug Fix
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente — pode mergear standalone antes de fase-01/02)
**Visual:** false

---

## O que esta fase entrega

Bug fix isolado: troca o bloco frontmatter de exemplo em `skills/init/assets/templates/docs/compound/README.md.tpl` do schema buggy (`date/author/tags/decision`) para o schema canônico do validator (`title/category/tags/created`). Fecha MH-01 e CA-01 do PRD. Pode mergear isolado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/docs/compound/README.md.tpl` | Modify | Substitui APENAS o bloco YAML de exemplo (linhas 9-16 do arquivo atual) por schema canônico. Conteúdo prosa (`# Compound Notes`, seção "When to write", tabela Index) fica intacto. |
| `tests/e2e/__golden__/init-greenfield.tree.json` | (verify only) | Não muda — só estrutura de árvore, não conteúdo. |

---

## Implementacao

### Passo 1: Confirmar estado atual (bug evidence)

```bash
sed -n '9,16p' skills/init/assets/templates/docs/compound/README.md.tpl
```

Esperado (estado buggy a corrigir):

```yaml
```yaml
---
date: YYYY-MM-DD
author: <name or "agent">
tags: [<tag1>, <tag2>]
decision: <one-line summary of the decision or lesson>
---
```
```

### Passo 2: Substituir bloco frontmatter de exemplo

Trocar o bloco para schema canônico do `scripts/compound-check.ts` validator (literal André: D3, MH-01):

```yaml
---
title: "Curto título descritivo da nota"
category: debugging
tags: [tag1, tag2]
created: YYYY-MM-DD
---
```

> Categorias recomendadas (mantém string livre — D9): `debugging | pattern | review | operations | security | reliability`. Adicionar comentário curto abaixo do bloco se quiser documentar — mas não obrigar. **Decisão escopo mínimo:** apenas trocar o bloco. Não adicionar prosa nova. André literal entra no Plano 02 fase-01.

### Passo 3: Verificar que conteúdo prosa NÃO foi tocado

```bash
git diff skills/init/assets/templates/docs/compound/README.md.tpl
```

Esperado: apenas 4 linhas alteradas dentro do bloco yaml (date→title, author→removida, decision→removida, tags inalterada, created adicionada/substituída). Cabeçalho `# Compound Notes`, seção `## When to write a compound note`, tabela `## Index` permanecem byte-idênticos.

---

## Gotchas

- **G7 do plano (MH-01):** Editar `skills/init/assets/templates/docs/compound/README.md.tpl` — NÃO confundir com:
  - `Infos/package/skills/compound-engineering/assets/compound-template/docs/compound/README.md` (versão literal do André, intacta)
  - `docs/compound/README.md` (README do plugin Anti-Vibe-Coding em si — fora do escopo desta fase, ver D24/RT-01)
- **Local:** O validator (`scripts/compound-check.ts` deste plugin) já valida `title/category/tags/created`. Após o fix, gerar uma compound note de teste com o novo schema e rodar `bun run compound:check` deve passar — CA-01.
- **Local:** Fase é independente. Pode ir pra produção como commit isolado (`fix(init/template): compound/README.md schema title/category/tags/created`). Não bloqueia fase-01/02.

---

## Verificacao

### TDD

- [ ] **RED:** Criar fixture test que gera uma compound note SEGUINDO o bloco de exemplo do template, depois roda `compound-check.ts` contra ela.
  - Comando (RED state — antes do fix):
    ```bash
    # extrair bloco do tpl atual, salvar como docs/compound/2026-05-23-test-mh01.md, rodar:
    bun run compound:check
    ```
  - Resultado esperado (antes do fix): `compound-check` FALHA porque `date/author/decision` não casa com `title/category/created` esperado.

- [ ] **GREEN:** Após fix, mesma fixture passa.
  - Comando: `bun run compound:check`
  - Resultado esperado: `0 errors`

> Subagente da fase pode optar por test de string match no template (mais simples, mais rápido) em vez de roundtrip via compound-check. Aceitar ambas as formas — o que importa é provar CA-01 verificável.

### Checklist

- [ ] Bloco yaml de exemplo no `compound/README.md.tpl` contém `title:`, `category:`, `tags:`, `created:` (nesta ordem ou alfabética — irrelevante)
- [ ] Bloco yaml de exemplo NÃO contém `date:`, `author:`, `decision:`
- [ ] Conteúdo fora do bloco yaml é byte-idêntico ao original (cabeçalho, seções, tabela Index)
- [ ] `bun run compound:check` em projeto novo (gerado por init) passa com nota de exemplo seguindo o template
- [ ] Goldens E2E init permanecem verdes: `bun test tests/e2e/init-cutover-greenfield.test.ts` (golden de árvore não muda; golden de conteúdo se existir pode precisar regenerar — verificar)
- [ ] Lint: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por máquina (CA-01 do PRD):**

```bash
grep -E "^(title|category|created):" skills/init/assets/templates/docs/compound/README.md.tpl | wc -l
```
Resultado esperado: `>= 3` (todos os 3 campos canônicos presentes no bloco de exemplo).

```bash
grep -E "^(date|author|decision):" skills/init/assets/templates/docs/compound/README.md.tpl | wc -l
```
Resultado esperado: `0` (nenhum campo do schema antigo restante).

```bash
# Simulação: gerar projeto greenfield via init, rodar compound:check
cd $(mktemp -d) && bun /path/to/plugin/bin/init && bun run compound:check
```
Resultado esperado: exit 0 (validator passa contra template gerado — CA-01).

**Por humano:** Abrir `docs/compound/README.md` em projeto novo inicializado por init — o bloco de exemplo está com schema canônico legível e bate com o que `compound:check` espera.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
