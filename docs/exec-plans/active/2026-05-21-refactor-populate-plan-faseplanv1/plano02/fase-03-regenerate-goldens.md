# Fase 03: Regenerar goldens de e2e

**Plano:** 02 — Orchestrator, Hierarchy, Goldens
**Sizing:** 1h
**Depende de:** fase-01, fase-02 (output novo do init precisa estar estavel)
**Visual:** false

---

## O que esta fase entrega

Tres goldens em `tests/e2e/__golden__/` regenerados para refletir o novo output do init:
1. `init-greenfield.tree.json` — arvore de arquivos esperada apos `init` em greenfield (uma pasta `{date}-populate-harness/` substitui 16 pastas `{date}-populate-{slug}/`)
2. `init-greenfield.stdout.txt` — stdout esperado (linhas do Step 7 summary mudam: `1 folder generated with 16 fases` em vez de `16 plans generated`)
3. `populate-plan-andre-parity.md` — golden estrutural de paridade Andre (regenerado a partir de uma fase representativa, p.ex. `fase-01-...`)

Tudo no MESMO commit que move fase-01/02 — CI nao pode ficar quebrado entre commits.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/__golden__/init-greenfield.tree.json` | Modify | Regenerar |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Modify | Regenerar |
| `tests/e2e/__golden__/populate-plan-andre-parity.md` | Modify | Regenerar |
| `tests/e2e/init-cutover-greenfield.test.ts` | Modify (talvez) | Ajustar somente se path do tree.json mudou |

---

## Implementacao

### Passo 1: Inspecionar goldens atuais

```bash
# Linhas relevantes do tree.json atual (16 entradas {date}-populate-*)
grep "populate" tests/e2e/__golden__/init-greenfield.tree.json

# Step 7 line no stdout
grep "init-07" tests/e2e/__golden__/init-greenfield.stdout.txt
```

Anotar:
- Quantas entradas `populate-` existem no tree.json (esperado: 16 pastas, cada uma com 1 PLAN.md)
- O wording exato da linha Step 7 no stdout atual
- O formato do `populate-plan-andre-parity.md` (provavelmente um snapshot de 1 PLAN.md inteiro)

### Passo 2: Rodar init em sandbox para capturar novo output

```bash
# Sandbox temporario
TMP_PROJECT="$(mktemp -d)"
cd "$TMP_PROJECT"

# Setup minimo para o init detectar stack (ex: package.json com typescript)
cat > package.json <<'JSON'
{
  "name": "sandbox",
  "private": true,
  "devDependencies": { "typescript": "^5" }
}
JSON

# Rodar init
bun "/path/to/Anti-Vibe-Coding/scripts/init-cli.ts" --cwd "$TMP_PROJECT" > stdout.txt 2>&1

# Capturar arvore
find docs -type f | sort > tree.txt
```

### Passo 3: Construir tree.json novo

Atualizar `init-greenfield.tree.json` (formato JSON ja existente; manter shape):
- Remover as 16 entradas antigas `docs/exec-plans/active/{date}-populate-{slug}/PLAN.md`
- Adicionar 1 pasta com 19 arquivos: `docs/exec-plans/active/{date}-populate-harness/{PRD.md, CONTEXT.md, PLAN.md, fase-01-*.md, ..., fase-16-*.md}`

Datas no golden devem ser **placeholders** (`{DATE}` ou similar) — o test ja normaliza datas antes de comparar. Verificar o test atual para entender o pattern de normalizacao usado.

### Passo 4: Construir stdout.txt novo

Substituir linhas do Step 7:

**Antes:**
```
init-07: 16 plans generated (node-ts stack)
Legacy artifacts found: 0
Docs skipped: 0 (none excluded)
Output: docs/exec-plans/active/*-populate-*/
```

**Depois:**
```
init-07: 1 folder generated with 16 fases (node-ts stack)
Folder: docs/exec-plans/active/{DATE}-populate-harness
Legacy artifacts found: 0
Docs skipped: 0 (none excluded)
```

(usar normalizacao de data como o test ja faz para outros steps).

### Passo 5: Regenerar `populate-plan-andre-parity.md`

Este golden serve para garantir paridade estrutural com Andre. Conteudo:
- Snapshot de **1 fase representativa** (ex: `fase-01-agents-md.md`) emitida pelo novo renderer
- Anchora os 11 H2 (10 do Andre + Final Report Contract) e os blocos de extensao

Copiar o output do sandbox: `cp "$TMP_PROJECT/docs/exec-plans/active/{DATE}-populate-harness/fase-01-agents-md.md" tests/e2e/__golden__/populate-plan-andre-parity.md`.

Normalizar data no header (se houver) para `{DATE}`.

### Passo 6: Rodar suite e2e

```bash
bun test tests/e2e/init-cutover-greenfield.test.ts
```

Se algum teste ainda falhar, ler mensagem de diff e ajustar — provavelmente eh wording detalhado de stdout ou ordem de keys em tree.json.

### Passo 7: Commit tudo junto

O commit que muda `populate-plan-generator.ts` + `07-generate-populate-plans.ts` + goldens TEM que ser atomico. Recomendado:

```bash
git add skills/init/lib/populate-plan-generator.ts
git add skills/init/lib/render-fase-plan.ts
git add skills/init/lib/populate-instructions-table.ts
git add skills/init/lib/populate-harness-prd-template.ts
git add skills/init/lib/populate-harness-context-template.ts
git add skills/init/lib/populate-harness-plan-overview.ts
git add skills/init/lib/steps/07-generate-populate-plans.ts
git add skills/init/lib/__golden__/fase-plan-sample.md
git add skills/init/assets/populate-guidance/
git add tests/e2e/__golden__/init-greenfield.tree.json
git add tests/e2e/__golden__/init-greenfield.stdout.txt
git add tests/e2e/__golden__/populate-plan-andre-parity.md
git add -A skills/init/lib/populate-plan-generator.test.ts skills/init/lib/render-fase-plan.test.ts skills/init/lib/populate-guidance-files.test.ts skills/init/lib/populate-guidance-drift.test.ts skills/init/lib/populate-instructions-table.test.ts skills/init/lib/steps/07-generate-populate-plans.test.ts
git rm skills/init/assets/snippets/populate-plan-template.md

git commit -m "$(cat <<'EOF'
feat(init): hierarchical populate-harness output + FasePlanInput v1

Implementa ADR-0022: substitui 16 PLAN.md soltos por 1 pasta
{date}-populate-harness/ com PRD + CONTEXT + PLAN + 16 fase-NN-*.md.
Adota schema FasePlanInput v1 (10 H2 Andre + 6 extensoes AVC) e
guidance interpretativa em .md per-doc.

- Adiciona render-fase-plan.ts com FasePlanInput v1 e renderFasePlan
- Estende DocInstruction com 6 campos novos; migra 16 entradas
- Cria 16 .md de guidance em assets/populate-guidance/
- Refatora generatePopulatePlans para emitir hierarquia
- Atualiza Step 7 summary + ABORT_MESSAGE_NO_STACK
- Regenera goldens de e2e
- Drift test entre mustCover e prosa
- Final Report Contract hardcoded no renderer
EOF
)"
```

---

## Gotchas

- **G1 do plano:** Goldens NAO podem ser commitados sem o refactor (CI quebra) e refactor NAO pode ser commitado sem goldens (CI quebra). Atomicidade obrigatoria.
- **G2 do plano:** Datas nos goldens dependem do test pattern de normalizacao. Ler `init-cutover-greenfield.test.ts` para saber se eh `{DATE}` literal, regex, ou data fixa de clock injetado.
- **G3:** `populate-plan-andre-parity.md` mantem proposito (paridade Andre) mas seu conteudo agora reflete o novo schema. Wording do golden eh source of truth — mudancas futuras de renderer regeneram este arquivo.
- **G4:** Se houver shapshot adicional em `tests/e2e/__fixtures__/` referenciando o output antigo, atualizar tambem. Procurar com `grep -r "populate-" tests/e2e/`.
- **Local:** Sandbox usa stack `node-ts` por simplicidade. Tests com outras stacks (rails/nextjs) podem precisar de fixtures separados — verificar se o test atual roda em multiplas stacks.

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test tests/e2e/init-cutover-greenfield.test.ts` antes da regen — falha (golden antigo nao bate)
- [ ] **RED → GREEN:** apos regen + commit atomico, e2e passa
- [ ] **REFACTOR:** rodar `bun run lint`, `bun run typecheck`, `bun test` em todo o repo

### Checklist

- [ ] `init-greenfield.tree.json` reflete 1 pasta `{date}-populate-harness/` com 19 entradas (PRD, CONTEXT, PLAN, 16 fases)
- [ ] `init-greenfield.tree.json` NAO contem 16 entradas `{date}-populate-{slug}/`
- [ ] `init-greenfield.stdout.txt` linha do Step 7 reflete novo summary
- [ ] `populate-plan-andre-parity.md` regenerado com 11 H2 (10 + Final Report Contract)
- [ ] Commit eh atomico (refactor + goldens juntos)
- [ ] `bun test tests/e2e/` retorna verde
- [ ] Suite completa verde: `bun test`

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-cutover-greenfield.test.ts` retorna verde
- `grep "init-07: 16 plans generated" tests/e2e/__golden__/init-greenfield.stdout.txt` retorna vazio
- `grep "1 folder generated with 16 fases" tests/e2e/__golden__/init-greenfield.stdout.txt` retorna match
- `git log -1 --stat` mostra goldens + codigo no mesmo commit

**Por humano:**
- Inspecao do diff dos goldens: mudancas sao apenas estruturais (renomeacoes, contagens), sem regressoes acidentais em outros steps

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
