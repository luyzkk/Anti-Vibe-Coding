<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: /init PRD Update (requires + §Dependencias)

**Plano:** 05 — Validacao Final + Harness + Unlock /init
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente; pode rodar em qualquer momento, mas semanticamente fecha o unlock)
**Visual:** false

---

## O que esta fase entrega

`docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` confirmado com `requires: [v6.1.0-subagent-contract]` no frontmatter + nota explicita em §Dependencias (ou equivalente) declarando que Reconciler/Explorer/Compound do `/init` emitirao envelope v1 conforme `docs/design-docs/subagent-contract-v1.md`. Cumpre **CA-08** do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` | Verify + Modify (minimo) | confirmar `requires: [v6.1.0-subagent-contract]` no frontmatter (linha 4 — ja presente conforme observado); adicionar/confirmar nota em §Dependencias |

---

## Implementacao

### Passo 1: Verificar estado atual

```bash
# Confirmar frontmatter
head -10 docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md
```

Saida esperada (ja foi verificada no planejamento — G-P05-03):

```yaml
---
slug: init-migration-mode
date: 2026-05-14
status: draft
requires: [v6.1.0-subagent-contract]
---
```

**Se `requires` ja contem `v6.1.0-subagent-contract`:** frontmatter OK, ir para Passo 2. **Se nao:** editar via `Edit` com `old_string` exato (cuidado G-P05-03 — outro PRD pode estar em edicao concorrente).

### Passo 2: Localizar secao §Dependencias (ou §Dependencies)

```bash
grep -n "^## Depend\|^### Depend" docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md
```

Verificar se ja contem mencao explicita ao contrato v1. Se nao, adicionar.

### Passo 3: Adicionar nota explicita em §Dependencias (se ausente)

Trecho a adicionar (usar `Edit` com `old_string` ancorando em linha existente da secao):

```markdown
### Dependencia: Contrato de Subagentes v1

Os 3 subagentes novos do /init (`reconciler`, `explorer`, `compound-writer`)
declaram `kind` no frontmatter e emitem envelope conforme contrato v1.
Referencia: [docs/design-docs/subagent-contract-v1.md](../../../../../docs/design-docs/subagent-contract-v1.md)
e [ADR-0002](../../../../../docs/design-docs/ADR-0002-subagent-contract.md).

Mapeamento de kind por agent do /init:
- `reconciler` -> `kind: "verification"` (compara estado existente vs canon, emite `payload.checks[]`)
- `explorer` -> `kind: "proposal"` (sugere estrutura de docs para repo desconhecido, emite `payload.proposal` + `human_readable`)
- `compound-writer` -> `kind: "mutation"` (cria/edita compound notes; usa `payload.mutation` stub conforme reservation v6.2)

Fixtures correspondentes serao adicionadas em `agents/__fixtures__/{nome}/`
seguindo o template do Plano 03 fase-05 deste feature predecessor.
```

### Passo 4: Verificar links

```bash
bun run harness:validate
# deve passar — links internos do PRD nao podem quebrar
```

Se algum link quebrar (paths relativos podem variar conforme depth da pasta), ajustar o `../../` conforme localizacao real do PRD do /init.

### Passo 5: Commit

```bash
git add docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md
git commit -m "docs(init): confirm requires v6.1.0-subagent-contract + dependency note (CA-08)"
```

---

## Gotchas

- **G-P05-03 (init PRD ja pode estar atualizado):** Verificado no planejamento — frontmatter ja tem `requires: [v6.1.0-subagent-contract]`. Esta fase entao se reduz a: (a) verificar; (b) adicionar nota explicita em §Dependencias se ausente; (c) commit. **Nao re-editar frontmatter** — pode quebrar outro trabalho em curso no PRD do /init.
- **G-P05-03 corolario:** Antes de qualquer edicao, fazer `git status` e `git diff docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` para garantir que nao ha edicao local nao-comitada conflitando.
- **G2 (do PRD — lifecycle vs domain_status):** A nota adicionada em §Dependencias deve referenciar o **mapeamento de kind**, nao misturar com `domain_status`. Reconciler emite `kind: verification`; o que ele "achou" vive em `payload.domain_status` (opcional). Manter a nota curta — referenciar doc canonico para detalhes.
- **G7 do Plano 01 (migration guide <30min):** Nao reescrever migration guide aqui — referenciar com link. PRD do /init nao e lugar para spec detalhada do contrato.
- **Local:** Se §Dependencias nao existe no PRD do /init (formato pode variar), adicionar antes de §Riscos ou §Decisoes. **Nao criar secao nova arbitraria** se ja existe equivalente com outro nome (ex: §Dependencias e Bloqueadores). Reaproveitar.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da fase, grep nao acha nota explicita sobre contrato v1 no PRD do /init
  - Comando: `grep -c "subagent-contract-v1" docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`
  - Resultado esperado: 0 (ou numero baixo) — sinaliza ausencia da nota

- [ ] **GREEN:** Apos a fase, grep retorna >=2 (frontmatter requires + nota §Dependencias)
  - Comando: idem
  - Resultado esperado: >=2

### Checklist

- [ ] `head -10 docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` mostra `requires: [v6.1.0-subagent-contract]`
- [ ] Nota em §Dependencias mapeia 3 subagentes do /init para os 4 kinds do contrato (audit/mutation/proposal/verification — usar 3 deles)
- [ ] Link interno para `docs/design-docs/subagent-contract-v1.md` resolve (harness:validate sem erros de link)
- [ ] Link interno para `docs/design-docs/ADR-0002-subagent-contract.md` resolve (ADR ja criado no Plano 01 fase-01)
- [ ] `bun run harness:validate` passa
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `grep "^requires:" docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` retorna linha contendo `v6.1.0-subagent-contract`
- `grep -c "subagent-contract-v1" docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` >= 2
- `bun run harness:validate` exit 0 (links resolvem)

**Por humano:**
- Lendo o PRD do /init, fica claro que: (a) feature aguarda v6.1.0 merge; (b) os 3 subagentes novos seguirao contrato v1 com kinds especificos; (c) onde achar a doc completa.

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
