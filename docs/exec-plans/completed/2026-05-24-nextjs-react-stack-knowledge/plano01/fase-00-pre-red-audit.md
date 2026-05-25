<!--
Princípio universal #5 — Comment Provenance.
Esta fase NÃO toca código de produção. Apenas testes e assertions são ajustados.
Toda mudança em assertion deve carregar comentário inline:
`// 2026-05-24 (Luiz/dev): pre-RED audit fase-00 — desacoplado para aceitar mapping nextjs→nextjs (D17 + R1)`
-->

# Fase 00: Pre-RED Audit — catalogar ~9 testes que assertam `'nodejs-typescript'`/`'node-ts'` em projeto Next

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Audit completo + ajuste de assertions de testes ANTES do mapping change de fase-04. Suite verde no estado intermediário (mapping ainda `nextjs→nodejs-typescript`) E preparada para o estado pós-fase-04 (mapping `nextjs→nextjs`). Resolve R1 do PRD via D17. **Esta fase NÃO toca código de produção, só testes/assertions.**

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/audit-report-fase00.md` | Create | Catálogo dos ~9 arquivos afetados (tabela: arquivo / linha / assertion atual / ajuste proposto / motivação) |
| `tests/**/*.test.ts` (subset — ~9 arquivos catalogados) | Modify | Desacoplar assertions que esperam `nextjs→nodejs-typescript` para aceitar o estado intermediário E o futuro |
| `tests/fixtures/**/*.json` (se aplicável) | Modify | Ajustar fixtures que hardcodaram `'nodejs-typescript'` esperando mapping antigo (raro mas possível) |

**Nota:** o `audit-report-fase00.md` é criado pelo subagente desta fase, não por este plan-document agora.

---

## Implementacao

### Passo 1: grep amplo dos 3 termos críticos

Rodar os 3 greps abaixo no codebase. Salvar output integral em buffer para criar `audit-report-fase00.md` no Passo 4.

```bash
# Grep 1 — string literal 'nodejs-typescript' em testes
rg "'nodejs-typescript'|\"nodejs-typescript\"" tests/ skills/init/lib/ --type ts -n

# Grep 2 — StackId literal 'node-ts' em testes (cuidado: 'node-ts' aparece em código de produção também — filtrar para tests apenas)
rg "'node-ts'|\"node-ts\"" tests/ skills/init/lib/**/*.test.ts -n

# Grep 3 — referencia direta ao mapping STACK_ID_TO_MATRIX_FOLDER em testes
rg "STACK_ID_TO_MATRIX_FOLDER" tests/ skills/init/lib/ -n
```

**Resultado esperado (PRD estima ~9 arquivos afetados):** lista contendo arquivos como:
- `tests/e2e/init-v7-tracer-bullet.test.ts` (linha 64-66: `expect(detectLog).toContain('stack=node-ts')`)
- `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (assertions sobre `primary` retornar `'nodejs-typescript'`)
- `tests/e2e/__golden__/init-greenfield.stdout.txt` (golden file pode citar `nodejs-typescript`)
- `skills/init/lib/detect-stack.test.ts` (probeNextjs retorna `id: 'nextjs'`; pode haver test que checa `STACK_ID_TO_MATRIX_FOLDER['nextjs']`)
- `skills/init/lib/detect-multi-stack.test.ts`
- `skills/init/lib/stack-id-map.test.ts` (se existir)
- `skills/init/lib/write-stack-json.test.ts` (se hardcoda mapping)
- Outros 2-3 arquivos descobertos pelo grep

### Passo 2: classificar cada hit em 3 categorias

Para cada arquivo retornado pelos greps, classificar a assertion em:

| Categoria | Ação | Exemplo |
|---|---|---|
| **A — Probe-only (não-mapping):** assertion checa que probeNextjs retorna `id: 'nextjs'` (não mapping); NÃO precisa ajuste | Manter como está | `expect(result.id).toBe('nextjs')` ou `expect(stack.primary).toBe('nextjs')` |
| **B — Mapping intermediário (precisa desacoplar):** assertion checa explicitamente `STACK_ID_TO_MATRIX_FOLDER['nextjs'] === 'nodejs-typescript'` OU lê `.claude/stack.json` num projeto Next esperando `primary: 'nodejs-typescript'` | Reescrever para aceitar `'nextjs'` (estado futuro). Se contexto é teste integration que USA o detector + writeStackJson, ajustar para o novo valor — entra na fase-04 como GREEN | `expect(stackJson.primary).toBe('nodejs-typescript')` num projeto com `next` em deps |
| **C — Fixture isolada (não precisa do real mapping):** teste usa fixture sem `next` em deps mas que assertou `'nodejs-typescript'` pelo motivo certo (typescript em devDeps puro) | Manter — assertion correta para fixture Node-TS puro | `tracer-stack-` fixture com `package.json` contendo apenas `typescript` em devDeps → `primary: 'nodejs-typescript'` é correto |

### Passo 3: ajustar assertions classificadas como B

**Estratégia:** mudar a expectativa para o estado FUTURO (`'nextjs'`). Como o mapping ainda não mudou em fase-04, alguns testes vão regredir agora. Esses são justamente os testes que fase-04 vai "consertar" automaticamente quando o mapping mudar.

**Trade-off:** suite fica VERMELHA entre fase-00 e fase-04. Não é o desejado pelo PRD (suite verde no estado intermediário). Como mitigar:

**Opção A — Parametrização (recomendada quando viável):** desacoplar via helper de teste que lê o mapping atual ao runtime:
```typescript
// 2026-05-24 (Luiz/dev): pre-RED audit fase-00 — assertion parametrizada para aceitar mapping intermediário E pós-fase-04
import { STACK_ID_TO_MATRIX_FOLDER } from '../../skills/init/lib/stack-id-map'
const expectedMatrix = STACK_ID_TO_MATRIX_FOLDER['nextjs'] // 'nodejs-typescript' hoje, 'nextjs' pós-fase-04
expect(stackJson.primary).toBe(expectedMatrix)
```
Resultado: teste aceita ambos os estados. Quando fase-04 muda o mapping, o teste continua verde sem ajuste. Para assertions de `primary` que vêm de `detectMultiStack`, o helper resolve igualmente.

**Opção B — Assertion permissiva (matcher unioned):**
```typescript
// 2026-05-24 (Luiz/dev): pre-RED audit fase-00 — aceita ambos os mappings durante transição
expect(['nodejs-typescript', 'nextjs']).toContain(stackJson.primary)
```
Pós-fase-04, voltar e tightar para `expect(stackJson.primary).toBe('nextjs')`.

**Opção C — `test.skip` temporário:** se assertion é complexa e desacoplar custa caro, marcar `.skip` com comentário linkando fase-04. Last resort — preferir A ou B.

Para cada arquivo da categoria B, escolher entre A/B/C e aplicar. Documentar a escolha em `audit-report-fase00.md`.

### Passo 4: criar `audit-report-fase00.md`

```markdown
# Audit Report — fase-00 pré-RED (Plano 01)

**Data:** 2026-05-24
**Objetivo:** catalogar arquivos que assertam mapping `nextjs→nodejs-typescript` E ajustar ANTES do mapping change em fase-04.

## Arquivos catalogados

| # | Arquivo | Linha(s) | Assertion atual | Categoria | Ajuste aplicado |
|---|---------|----------|-----------------|-----------|-----------------|
| 1 | `tests/e2e/init-v7-tracer-bullet.test.ts` | 64-66 | `expect(detectLog).toContain('stack=node-ts')` | A (probe-only, projeto fixture é Node puro — sem `next`) | nenhum (fixture não tem `next` em deps) |
| 2 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 88 | `expect(stackJson.primary).toBe('nodejs-typescript')` | C (fixture Node-TS puro, sem `next`) | nenhum |
| 3 | ... | ... | ... | ... | ... |

## Resumo

- Total catalogado: N (~9 esperado)
- Categoria A (probe-only, no-op): X
- Categoria B (desacoplar — opção A): Y
- Categoria B (assertion permissiva — opção B): Z
- Categoria C (skip temporário): W (idealmente 0)

## Estado da suite pós-fase-00

- `bun test` → EXIT=0 (suite verde no estado intermediário)
- Pós-fase-04, voltar nos arquivos categoria B Opção B e tightar para `'nextjs'`
```

### Passo 5: rodar suite e confirmar verde

```bash
bun test
```

Resultado esperado: `EXIT=0` (zero regressões). Se houver qualquer teste vermelho:
- **Causa A:** assertion B foi ajustada incorretamente — revisar Opção A/B aplicada.
- **Causa B:** assertion C foi mal-classificada (era na verdade B) — re-classificar e aplicar ajuste.
- **Causa C:** teste de produção quebrou (extremamente improvável — esta fase não muda código de produção). Se aconteceu, ROLLBACK imediato — provavelmente arquivo errado foi tocado.

Iterar até `bun test` retornar EXIT=0.

### Passo 6: commit da fase-00

```bash
git add tests/ docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/audit-report-fase00.md
git commit -m "$(cat <<'EOF'
test(plano01-fase00): pre-RED audit das assertions de mapping nextjs

D17 do PRD resolve R1: cataloga ~N arquivos que assertam
nextjs→nodejs-typescript em testes, desacopla via helper de mapping
runtime para aceitar mapping intermediário E o pós-fase-04
(nextjs→nextjs). Suite verde no estado intermediário; fase-04
faz o mapping change atômico sem regressão.

Audit report: docs/exec-plans/active/.../plano01/audit-report-fase00.md
EOF
)"
```

---

## Gotchas

- **G7 do plano (fase-00 ajusta APENAS testes/assertions, NÃO código de produção):** se algum teste exigir mudança em código de produção para passar, RECUAR. Provavelmente é um teste que já estava acoplado a um anti-padrão. Tratar como TODO da fase-04 (com `.skip` documentado) — não tentar consertar produção aqui.

- **Local — categoria A é a maioria esperada:** muitos testes asseram apenas a presença de `stack=node-ts` no log porque a FIXTURE é Node-TS puro (sem `next`). Esses testes NÃO precisam ajuste — `node-ts` continua sendo o StackId correto para fixtures TS puro. Não confundir com testes que usam fixture com `next` em deps esperando mapping nodejs-typescript.

- **Local — golden files podem precisar de regeneração tardia:** `tests/e2e/__golden__/init-greenfield.stdout.txt` foi recentemente regenerado (PRD populate-plan-andre-port, Plano 05 fase-06 — fechado 2026-05-20). Se o golden cita `nodejs-typescript` num contexto Next, ajuste pode quebrar outros 4 testes ativos da `init-cutover-greenfield.test.ts`. Validar TODOS os testes que dependem do golden ANTES de mexer no arquivo.

- **Local — Opção B (assertion permissiva) tem custo de manutenção:** todos os hits Opção B precisam voltar ser tightados em pós-fase-04. Manter contador em `audit-report-fase00.md` para não esquecer.

- **Local — `tests/fixtures/**/*.json` raramente são afetados:** fixtures de projetos são `package.json` etc. (não assertam mapping). Mas fixtures de DOCS já-existentes (ex: `tests/fixtures/v6-state-fixture/docs/STATE.md` no git status atual) podem conter strings literal `nodejs-typescript` em documentos congelados. Só editar se for assertion ativa de teste — se é apenas documento histórico, deixar como está.

---

## Verificacao

### TDD

Esta fase é **content-only no sentido de ajustar testes, não código de produção**. Não há ciclo RED→GREEN clássico. Em vez disso:

- [ ] **Pre-RED (estado inicial):** `bun test` EXIT=0 (suite verde antes da fase começar)
  - Comando: `bun test`
  - Resultado esperado: `Bun pass`

- [ ] **Pós-ajustes:** `bun test` EXIT=0 (suite continua verde após Opção A/B aplicada)
  - Comando: `bun test`
  - Resultado esperado: `EXIT=0`, mesma contagem de testes (ou ligeiramente diferente se algum foi parametrizado em test.each)

### Checklist

- [ ] Grep 1 (`'nodejs-typescript'` em tests) executado e output salvo
- [ ] Grep 2 (`'node-ts'` em tests) executado e output salvo
- [ ] Grep 3 (`STACK_ID_TO_MATRIX_FOLDER` em tests) executado e output salvo
- [ ] `audit-report-fase00.md` criado em `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/` com tabela completa
- [ ] Cada arquivo da categoria B teve ajuste aplicado (Opção A, B ou C documentada)
- [ ] Categoria C (`.skip`) tem ≤ 1 teste (idealmente 0) — se >1, reclassificar
- [ ] `bun test` retorna EXIT=0
- [ ] Lint limpo: `bun run lint`
- [ ] Nenhum arquivo em `skills/init/lib/**/*.ts` (código de produção) foi modificado nesta fase — confirmar via `git diff --stat skills/init/lib/`

---

## Criterio de Aceite

**Por maquina:**
- `bun test` retorna EXIT=0
- `git diff --stat skills/init/lib/ | wc -l` retorna 0 (zero arquivos de produção mudaram)
- `wc -l docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/audit-report-fase00.md` retorna ≥30 linhas (tabela + resumo + estado)
- Grep dos 3 termos NÃO mostra assertions cruas Categoria B remanescentes (todas têm comentário `// 2026-05-24 (Luiz/dev): pre-RED audit fase-00`)

**Por humano:**
- `audit-report-fase00.md` cataloga ~9 arquivos esperados (com tabela contendo arquivo / linha / assertion / categoria / ajuste)
- Distribuição A/B/C registrada
- Nenhum teste pulado sem motivação explícita

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
