<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
Ex: `// 2026-08-30 (Luiz/dev): python_versions opcional — D9/RF3 do PRD stack-knowledge-python`
-->

# Fase 00: Pré-RED Audit — testes e goldens que enumeram knowledge/

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Audit-report catalogando todo teste/golden/script que enumera `knowledge/`,
`MATRIX_FOLDER_VALUES` ou comportamento python-sem-matrix — e prova de suite verde ANTES de
qualquer mudança de produção (RF11, R1). **Zero código de produção é tocado nesta fase.**

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano01/audit-report-fase-00.md` | Create | Catálogo dos afetados + baseline da suite |

Nenhum arquivo fora de `docs/exec-plans/` é criado ou modificado. Se um teste precisar mudar,
isso acontece na fase que introduz a mudança que o afeta (01, 03 ou 04) — nunca aqui.

---

## Implementacao

### Passo 1: Criar a branch do plano

```
git checkout -b feat/stack-knowledge-python-plano01
```

Todo o Plano 01 vive nesta branch (G9 do README — nunca main).

### Passo 2: Grep sistemático (Busca Não é Semântica — múltiplos padrões)

Rodar os greps abaixo e catalogar TODOS os hits em código de teste, golden ou script de
validação. Um único grep não captura tudo — rodar os quatro:

```
# 1. Constantes de mapeamento de matrix
rg -n "MATRIX_FOLDER_VALUES|STACK_ID_TO_MATRIX_FOLDER" --type ts

# 2. Enumeração literal da pasta knowledge/
rg -n "knowledge/" --glob "**/*.{ts,json,txt}" tests/ skills/ scripts/

# 3. Comportamento python ATUAL (sem matrix): testes que assertam AbortError/no-matrix p/ python
rg -n -i "python" skills/init/lib/*.test.ts tests/ scripts/

# 4. Contagens de átomos e stacks hardcoded (viram falso-vermelho quando python aparece)
rg -n "atom_count|atomCount|toBe\(14\)|toBe\(3\)|no-matrix" --type ts tests/ skills/
```

### Passo 3: Catalogar no audit-report

Candidatos já conhecidos do planejamento (verificar cada um — a lista NÃO é exaustiva,
o grep decide):

| Arquivo | O que verificar |
|---|---|
| `skills/init/lib/copy-knowledge.test.ts` | Teste assertando python → `no-matrix`/AbortError HOJE? Regride quando a pasta existir |
| `skills/init/lib/detect-multi-stack.test.ts` | `recognized_no_matrix` inclui python em alguma fixture? |
| `skills/init/lib/run-stack-knowledge-init.test.ts` | Mensagem M2.4 "matrix não disponível" cita python? |
| `tests/harness-validate-knowledge.test.ts` | Enumera as pastas de `knowledge/` (3 stacks hardcoded?) |
| `tests/repo-structure/knowledge-path.test.ts` | Idem — lista de stacks esperadas |
| `tests/e2e/__golden__/init-greenfield.tree.json` | Árvore golden enumera algo derivado da contagem de matrizes? |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Stdout golden com mensagem que cite stacks disponíveis |
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts` + `stack-knowledge-full-e2e.test.ts` | Asserções negativas ("python não copiado") |
| `tests/e2e/stack-aware-preface-all-skills.test.ts` | Loop sobre matrizes existentes |
| `skills/init/lib/steps/10-final-validation(.test).ts` | Gate que valida presença/estrutura de knowledge |
| `scripts/harness-validate.ts` | Regra `[knowledge-presence]` (linhas 698-722) — confirma o gotcha G1 do bundle |

Formato do report (uma linha por afetado):

```markdown
# Audit Report — Fase 00 (pré-RED, RF11/R1)

**Data:** YYYY-MM-DD  |  **Branch:** feat/stack-knowledge-python-plano01

## Baseline (antes de qualquer mudança)

- `bun test`: N pass / N skip / 0 fail (colar resumo real)
- `bun run typecheck`: limpo (exceto GT-01 pré-existente: lazy-import.test.ts + subagent-contract.ts)
- `bun run harness:validate`: verde

## Afetados catalogados

| # | Arquivo | O que enumera | Quebra quando knowledge/python/ aparecer? | Fase que corrige |
|---|---------|---------------|-------------------------------------------|------------------|
| 1 | ... | ... | sim/não + por quê | fase-01 / fase-03 / fase-04 / nenhuma |

## Não-afetados verificados (falso-alarme do grep)

- arquivo X — hit era comentário/path de source, sem asserção
```

### Passo 4: Rodar a suite completa e registrar baseline

```
bun test
bun run typecheck
bun run harness:validate
```

Colar os resumos REAIS no report. Se algo já estiver vermelho ANTES desta feature,
registrar como pré-existente (precedente: GT-01 do MEMORY global — erros de typecheck em
`lazy-import.test.ts` e `subagent-contract.ts` não são desta feature) e NÃO corrigir aqui.

### Passo 5: Commit separado do audit

```
git add docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano01/audit-report-fase-00.md
git commit -m "docs(python-knowledge): fase-00 pre-RED audit de testes/goldens (RF11)"
```

Commit SÓ do audit-report — G1 do README: o próximo commit é o bundle das fases 01+02+03.

---

## Gotchas

- **G1 do plano:** este commit é o ÚNICO permitido antes do bundle 01+02+03. Confirmar aqui
  (lendo `scripts/harness-validate.ts:698-722`) que `[knowledge-presence]` exige INDEX.md +
  ≥1 `.md` em `atoms/` — é a razão mecânica do bundle.
- **G10 do plano:** o audit-report vive em `docs/` → rodar `bun run harness:validate` antes
  do commit.
- **Local:** resultado de grep >50.000 chars é truncado silenciosamente (~2KB). Se um grep
  retornar suspeito de truncamento, re-rodar com escopo por diretório (`tests/` depois
  `skills/` depois `scripts/`).
- **Local:** hits em `docs/exec-plans/completed/` (planos Rails/Node/Next antigos) são
  histórico, não afetados — listar como falso-alarme, não catalogar como risco.

---

## Verificacao

### TDD

N/A — fase de auditoria, sem código de produção. O "RED" desta fase é conceitual: capturar o
estado verde ANTES para que qualquer vermelho futuro seja atribuível às mudanças da feature.

### Checklist

- [ ] Os 4 greps do Passo 2 rodados e resultados triados (nenhum truncado)
- [ ] Cada arquivo da tabela de candidatos verificado individualmente (aberto e lido, não só grep)
- [ ] `audit-report-fase-00.md` criado com baseline REAL colado (números, não "verde")
- [ ] Nenhum arquivo fora de `docs/exec-plans/` modificado (`git status` mostra só o report)
- [ ] Vermelhos pré-existentes (se houver) marcados como tal, não corrigidos
- [ ] Testes passam: `bun test`
- [ ] TypeCheck: `bun run typecheck` (módulo GT-01 pré-existente à parte)
- [ ] `bun run harness:validate` verde
- [ ] Commit separado feito na branch do plano

---

## Criterio de Aceite

**Por maquina:**
- `bun test` retorna 0 fail no commit desta fase
- `git show --stat HEAD` lista exatamente 1 arquivo: o audit-report

**Por humano:**
- O report responde, para cada afetado: "quebra ou não quebra quando `knowledge/python/`
  aparecer, e qual fase corrige" — sem itens "a investigar" pendentes

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
