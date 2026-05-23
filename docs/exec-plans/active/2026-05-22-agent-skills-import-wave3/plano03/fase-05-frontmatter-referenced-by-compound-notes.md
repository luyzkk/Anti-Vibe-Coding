<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Frontmatter `referenced-by:` nas Compound Notes-Origem

**Plano:** 03 — Pipeline Compound -> Reference
**Sizing:** 0.5h (XS)
**Depende de:** fase-02, fase-03, fase-04 (frontmatter so cita references ja criados — fase-05 PRECISA que os 3 arquivos em `docs/references/` existam)
**Visual:** false

---

## O que esta fase entrega

Campo `referenced-by:` adicionado no frontmatter das 5 compound notes-origem fechando o ciclo de descoberta. Implementacao idempotente — re-rodar nao duplica. Cobre SH-04 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/compound/2026-05-18-init-self-protection.md` | Modify | Adicionar `referenced-by: [docs/references/init-step-contract.md]` no frontmatter |
| `docs/compound/2026-05-18-path-escape-cascade.md` | Modify | Adicionar `referenced-by: [docs/references/init-step-contract.md]` no frontmatter |
| `docs/compound/2026-05-18-detector-parser-narrow-happy-path.md` | Modify | Adicionar `referenced-by: [docs/references/init-step-contract.md]` no frontmatter |
| `docs/compound/2026-05-20-prompt-hook-includes-no-loop.md` | Modify | Adicionar `referenced-by: [docs/references/hooks-checklist.md]` no frontmatter |
| `docs/compound/2026-05-19-tdd-gate-needs-stub-first.md` | Modify | Adicionar `referenced-by: [docs/references/tdd-cycle-checklist.md]` no frontmatter |

---

## Implementacao

### Passo 1: Pre-verificar que as 3 references existem

Antes de tocar qualquer compound note, confirmar que fases 02-04 entregaram:

```bash
test -f docs/references/init-step-contract.md || echo "FALTA fase-02"
test -f docs/references/hooks-checklist.md || echo "FALTA fase-03"
test -f docs/references/tdd-cycle-checklist.md || echo "FALTA fase-04"
```

Se qualquer FALTA aparecer, pausar a fase-05 e voltar para fechar a fase pendente.

### Passo 2: Mapeamento explicito compound -> reference

| Compound note | Reference que cita |
|---------------|---------------------|
| `2026-05-18-init-self-protection.md` | `docs/references/init-step-contract.md` |
| `2026-05-18-path-escape-cascade.md` | `docs/references/init-step-contract.md` |
| `2026-05-18-detector-parser-narrow-happy-path.md` | `docs/references/init-step-contract.md` |
| `2026-05-20-prompt-hook-includes-no-loop.md` | `docs/references/hooks-checklist.md` |
| `2026-05-19-tdd-gate-needs-stub-first.md` | `docs/references/tdd-cycle-checklist.md` |

**Decisao de escopo:** Compound notes irmas citadas como contexto em `hooks-checklist.md` (`2026-04-21-hooks-cjs-stdin-pattern.md` e `2026-03-23-hooks-json-overwrite-bug.md`) NAO recebem `referenced-by:` nesta fase. Elas sao "Referencias relacionadas" no fim do checklist, nao "Origem" — diferenca registrada em fase-03 Gotcha. Adicionar `referenced-by:` nelas seria inflar o ciclo e contradizer o header `Origem` da reference. Registrar como DI no MEMORY se PR review pedir.

### Passo 3: Edit cirurgico idempotente em cada compound note

Para cada um dos 5 arquivos, o frontmatter atual termina com:

```yaml
---
title: "..."
category: ...
tags: [...]
created: YYYY-MM-DD
---
```

Adicionar linha `referenced-by:` antes do `---` de fechamento. Snippet de edicao (exemplo para `init-self-protection.md` — replicar para os outros 4 com a reference correspondente):

ANTES:
```yaml
---
title: "Dispatchers that mutate cwd must refuse to run inside their own plugin directory"
category: architecture-gotcha
tags: [dispatcher, init, self-protection, idempotency, blast-radius]
created: 2026-05-18
---
```

DEPOIS:
```yaml
---
title: "Dispatchers that mutate cwd must refuse to run inside their own plugin directory"
category: architecture-gotcha
tags: [dispatcher, init, self-protection, idempotency, blast-radius]
created: 2026-05-18
referenced-by: [docs/references/init-step-contract.md]
---
```

**Idempotencia:** Antes de adicionar, verificar se a linha ja existe:

```bash
# Pseudo-codigo do check
if grep -E "^referenced-by:" docs/compound/<file>.md > /dev/null; then
  echo "skip (ja existe)"
else
  # Edit cirurgico inserindo a linha antes do --- de fechamento do frontmatter
fi
```

Se ja existir mas com lista vazia ou com outra reference, NAO duplicar — adicionar a reference correta na lista existente (transformar `referenced-by: [old]` em `referenced-by: [old, docs/references/init-step-contract.md]`).

### Passo 4: Validar com `compound:check`

`docs/compound/README.md` menciona `bun run compound:check` como validador de frontmatter. Apos os 5 edits, rodar:

```bash
bun run compound:check
```

Se o validador for estrito sobre campos conhecidos (`title`, `category`, `tags`, `created` apenas), o novo campo `referenced-by` pode quebrar — nesse caso, decisao: (a) atualizar o validador para permitir o campo opcional, ou (b) registrar DI no MEMORY e nao adicionar via frontmatter, usando outro mecanismo (footer no corpo). Verificar antes de prosseguir.

---

## Gotchas

- **G6 do plano (idempotencia):** Re-rodar fase-05 nao deve duplicar `referenced-by:` no frontmatter. Implementacao confere existencia ANTES de adicionar.
- **G2 do plano (R-03):** Compound notes-origem mantem TODO conteudo atual; apenas frontmatter ganha 1 linha nova. Verificacao pos-edicao: `wc -l` deve aumentar em exatamente 1 linha em cada arquivo modificado (em relacao ao estado pre-fase).
- **Local — validador compound:check:** Se o validador rejeitar o novo campo, decisao registrada em DI. Hipotese inicial: validador checa apenas presenca dos required (`title`, `category`, `tags`, `created`); campos adicionais sao tolerados. Confirmar no codigo do validador antes de assumir.
- **Local — escopo restrito:** Apenas 5 compound notes recebem o campo. As outras compound notes do repo (~35+) NAO sao tocadas. Quem deve receber `referenced-by:` no futuro: qualquer compound que sirva de Origem para uma reference nova — processo manual conforme criterio da fase-01.
- **Local — formato exato:** Lista YAML inline `[item1, item2]`. NAO usar formato block:
  ```yaml
  referenced-by:
    - item1
    - item2
  ```
  Razao: consistencia com `tags: [item1, item2]` no mesmo frontmatter. Validador pode aceitar ambos, mas inline e o padrao existente.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, grep retorna 0 matches em cada arquivo.
  - Comando: `grep -c "^referenced-by:" docs/compound/2026-05-18-init-self-protection.md`
  - Resultado esperado: `0` (e repetir para os outros 4)

- [ ] **GREEN:** Apos edicao, grep retorna 1 match em cada arquivo.
  - Comando: `grep -c "^referenced-by:" docs/compound/2026-05-18-init-self-protection.md`
  - Resultado esperado: `1` (e repetir para os outros 4)

### Checklist

- [ ] `2026-05-18-init-self-protection.md` tem `referenced-by:`: `grep -c "^referenced-by:" docs/compound/2026-05-18-init-self-protection.md` retorna `1`
- [ ] Cita `init-step-contract.md`: `grep "referenced-by:" docs/compound/2026-05-18-init-self-protection.md | grep -c "init-step-contract"` retorna `1`
- [ ] `2026-05-18-path-escape-cascade.md` tem `referenced-by:`: idem
- [ ] Cita `init-step-contract.md`: idem
- [ ] `2026-05-18-detector-parser-narrow-happy-path.md` tem `referenced-by:`: idem
- [ ] Cita `init-step-contract.md`: idem
- [ ] `2026-05-20-prompt-hook-includes-no-loop.md` tem `referenced-by:`: idem
- [ ] Cita `hooks-checklist.md`: `grep "referenced-by:" docs/compound/2026-05-20-prompt-hook-includes-no-loop.md | grep -c "hooks-checklist"` retorna `1`
- [ ] `2026-05-19-tdd-gate-needs-stub-first.md` tem `referenced-by:`: idem
- [ ] Cita `tdd-cycle-checklist.md`: `grep "referenced-by:" docs/compound/2026-05-19-tdd-gate-needs-stub-first.md | grep -c "tdd-cycle-checklist"` retorna `1`
- [ ] Idempotencia validada: rodar `grep -c "^referenced-by:" <file>` em CADA arquivo retorna `1` (nao `2`)
- [ ] Conteudo das compound notes preservado: `git diff docs/compound/` mostra APENAS adicao de 1 linha no frontmatter de cada arquivo, sem outras mudancas
- [ ] `bun run compound:check` exit 0 (ou DI registrado se validador rejeitar)
- [ ] `bun run harness:validate` exit 0

---

## Criterio de Aceite

**Por maquina (script de batch):**
```bash
for f in \
  "docs/compound/2026-05-18-init-self-protection.md" \
  "docs/compound/2026-05-18-path-escape-cascade.md" \
  "docs/compound/2026-05-18-detector-parser-narrow-happy-path.md" \
  "docs/compound/2026-05-20-prompt-hook-includes-no-loop.md" \
  "docs/compound/2026-05-19-tdd-gate-needs-stub-first.md"
do
  count=$(grep -c "^referenced-by:" "$f")
  [ "$count" -eq 1 ] || { echo "FAIL: $f tem $count linhas referenced-by"; exit 1; }
done
echo "OK: 5/5 compound notes com referenced-by valido"
```

Saida esperada: `OK: 5/5 compound notes com referenced-by valido`

**Por humano:**
- `git diff docs/compound/` mostra apenas 5 hunks, cada um adicionando 1 linha `referenced-by: [...]` no frontmatter. Nenhuma outra mudanca.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
