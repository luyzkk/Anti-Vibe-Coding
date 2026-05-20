<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 06: Regenerar goldens `init-greenfield` + cleanup MEMORY.md raiz

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03, fase-04, fase-05 do Plano 05 (snapshots so estabilizam apos demais fases verdes)
**Visual:** false

---

## O que esta fase entrega

Fecha o ciclo do PRD `populate-plan-andre-port` regenerando os goldens do `/init` greenfield para refletirem o output esperado **apos** todas as mutacoes dos Planos 01-04 + fases 01-05 do Plano 05:

1. **`tests/e2e/__golden__/init-greenfield.stdout.txt` regenerado** — output de Step 91 agora incluira novo formato de PLAN.md (11 secoes), instrucoes imperativas, audit log estendido. Linhas 35-36 do golden atual (`Fases emitidas: 26 (1 por doc canonico)` + `Stack detectado:`) podem mudar contagem ou wording.
2. **`tests/e2e/__golden__/init-greenfield.tree.json` regenerado** — estrutura de arquivos gerada agora inclui `docs/exec-plans/active/{date}-populate-harness/` (provavelmente ja inclui — mas validar) e talvez novos paths que o `customize-architecture` toca depois das mudancas de `TEMPLATE_MANIFEST` (Plano 01 fase-01).
3. **2 testes em `tests/e2e/init-cutover-greenfield.test.ts` confirmados verdes** — os comentarios atuais (`// Plano 05 fase-04 — golden regenerado. test.skip removido.`) indicam tentativa parcial em sprint anterior. Esta fase confirma o estado final E o remove se foi falso (test ja sem `.skip` mas golden incompleto).
4. **`bun run harness:validate` exit 0** — confirma estrutura `docs/exec-plans/active/` + `docs/compound/` integra apos as mudancas do PRD.
5. **MEMORY.md raiz limpa** — secao "Notas para Planos Seguintes — Golden snapshot precisa regeneracao (Plano 05 fase-04)" (do PRD anterior, knowledge-path-cutover) substituida por esta execucao — remover.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Modify (regen) | Regerar via `UPDATE_GOLDENS=1 bun test tests/e2e/init-cutover-greenfield.test.ts` ou mecanismo equivalente do test helper. Diff esperado: contagem de fases pode subir (Plano 01 fase-01 estende `CanonicalDoc`); wording de Step 91 pode mudar (Plano 05 fase-04 + Plano 02 fase-03). |
| `tests/e2e/__golden__/init-greenfield.tree.json` | Modify (regen) | Mesmo padrao de regen. Diff esperado: adicao de `docs/compound/2026-05-19-never-diminish-andre.md` (fase-05) — embora compound nao seja criado por `/init`, ele exists no repo e pode aparecer dependendo de como `readTreeSorted` opera (verificar — provavelmente o tree e do `tmpDir` apos init, nao do repo). Se nao aparecer, sem diff. |
| `tests/e2e/init-cutover-greenfield.test.ts` | Verify only (no modify se ja sem `.skip`) | Confirmar que linhas 102-118 e 120-132 estao SEM `test.skip` (atualmente sao `test('...')` direto). Se ainda houver `.skip`, remover. |
| `C:\Users\luizf\.claude\projects\F--Projetos-Anti-Vibe-Coding\memory\MEMORY.md` | Modify | Remover linha do indice (secao "Project (Plano 01)") que referencia "Plano 05 fase-04" do PRD anterior (knowledge-path-cutover). Substituida pelo fechamento deste plano. |

Estado esperado apos esta fase: 4 testes em `init-cutover-greenfield.test.ts` passam (2 dos goldens + 2 outros pre-existentes). `bun run harness:validate` retorna verde. MEMORY.md raiz nao referencia mais TODO de regenerar golden.

---

## Implementacao

### Passo 1: Snapshot do estado atual dos goldens antes de regerar

```powershell
Copy-Item tests/e2e/__golden__/init-greenfield.stdout.txt tests/e2e/__golden__/init-greenfield.stdout.txt.bak
Copy-Item tests/e2e/__golden__/init-greenfield.tree.json tests/e2e/__golden__/init-greenfield.tree.json.bak
```

Manter `.bak` durante toda esta fase. Apos validacao final (Passo 7), comparar diff manualmente. Apos confirmar diff intencional, deletar `.bak`.

### Passo 2: Identificar mecanismo de regen dos goldens

Os comentarios em `tests/e2e/init-cutover-greenfield.test.ts` linha 102/120 (`Plano 05 fase-04 — golden regenerado. test.skip removido`) sugerem que regen ja foi tentada em sprint anterior. Verificar como o test helper escreve goldens:

```powershell
# Procurar mecanismo de update no test ou helper
Select-String -Pattern "UPDATE_GOLDENS|writeFile.*golden|--update" -Path tests/e2e/init-cutover-greenfield.test.ts -Context 2,2
Select-String -Pattern "GOLDEN_STDOUT|GOLDEN_TREE" -Path tests/e2e/init-cutover-greenfield.test.ts
```

**Cenarios:**

- **Cenario A — helper ja suporta `UPDATE_GOLDENS=1`:** rodar:
  ```powershell
  $env:UPDATE_GOLDENS = "1"
  bun test tests/e2e/init-cutover-greenfield.test.ts
  Remove-Item env:UPDATE_GOLDENS
  ```

- **Cenario B — sem helper, escrever manualmente:** rodar o test e capturar output em variavel. Comparar com golden. Quando intencionalmente divergente, sobrescrever golden via `Out-File -Encoding utf8 tests/e2e/__golden__/init-greenfield.stdout.txt`.

Decidir entre A e B pelo resultado do `Select-String` acima. Provavel cenario B (test helper atual usa `expect(actual).toEqual(expected)` direto sem flag de update).

### Passo 3: Capturar output novo do `/init` greenfield

Approach pragmatico (Cenario B):

```typescript
// 2026-05-19 (Luiz/dev): tmp/regen-golden.ts — script descartavel para fase-06.
// NAO comitar este arquivo. Rodar 1x, capturar output, deletar.

import { runInit } from '../skills/init/lib/run-init'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

async function main() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'regen-golden-'))
  // Copiar fixture greenfield (mesmo que o test usa — checar FIXTURE_SRC em init-cutover-greenfield.test.ts)
  // ... cp fixture to tmpDir

  const lines: string[] = []
  const originalLog = console.log
  console.log = (...args) => lines.push(args.join(' '))

  await runInit([], { cwd: tmpDir, askUser: async () => 'N' })

  console.log = originalLog

  // Normalizar (substituir <TMP>, <DATE>, <NN>):
  const TMP_REGEX = new RegExp(tmpDir.replace(/\\/g, '\\\\'), 'g')
  const DATE_REGEX = /\d{4}-\d{2}-\d{2}/g
  const NN_REGEX = / in \d+ ms/g
  const normalized = lines
    .join('\n')
    .replace(TMP_REGEX, '<TMP>')
    .replace(DATE_REGEX, '<DATE>')
    .replace(NN_REGEX, ' in <NN> ms')

  await fs.writeFile('tests/e2e/__golden__/init-greenfield.stdout.txt.new', normalized)
  console.log(`Novo golden em tests/e2e/__golden__/init-greenfield.stdout.txt.new`)
  console.log(`Para aplicar: Move-Item tests/e2e/__golden__/init-greenfield.stdout.txt.new tests/e2e/__golden__/init-greenfield.stdout.txt -Force`)
}
main().catch(e => { console.error(e); process.exit(1) })
```

```powershell
bun run tmp/regen-golden.ts
```

### Passo 4: Diff manual entre `.bak`, atual e `.new`

```powershell
# Comparar visualmente
Compare-Object (Get-Content tests/e2e/__golden__/init-greenfield.stdout.txt.bak) (Get-Content tests/e2e/__golden__/init-greenfield.stdout.txt.new)
```

**Validar manualmente:** todas as diferencas estao alinhadas com mudancas intencionais dos Planos 01-05? Lista de diffs esperados:

| Linha esperada mudar | Razao |
|----------------------|-------|
| `Fases emitidas: N` (linha 36) | Plano 01 fase-01 expandiu `CanonicalDoc` — N pode subir |
| `[91-generate-populate-plan] (mutated disk)` — adicao de audit log lines | Plano 05 fase-04 emite `docsCoveredByStack` etc no audit (mas audit nao vai em stdout — verificar) |
| Wording de `customize-architecture` | Plano 01 fase-01 talvez mude `TEMPLATE_MANIFEST` |

**Se diff contem algo INESPERADO:** nao prosseguir. Investigar — pode ser regressao acidental de outro PRD.

### Passo 5: Aplicar golden novo

```powershell
Move-Item tests/e2e/__golden__/init-greenfield.stdout.txt.new tests/e2e/__golden__/init-greenfield.stdout.txt -Force
```

Para `tree.json`: capturar tree via `readTreeSorted(tmpDir)` (helper ja existe no test — usar import direto em outro script `tmp/regen-tree.ts`):

```typescript
// 2026-05-19 (Luiz/dev): tmp/regen-tree.ts — descartavel.
import { readTreeSorted, normalizeTree } from '../tests/e2e/init-cutover-greenfield.test'
// OBS: se readTreeSorted nao for exportado, copiar a logica do test inline ate este script.
// ...
```

Mesma logica: capturar, normalizar, gravar em `.new`, diff, mover para `.json`.

### Passo 6: Rodar os 2 testes especificos

```powershell
bun test tests/e2e/init-cutover-greenfield.test.ts
```

**Esperado:** 4 testes pass (2 do golden + 2 outros pre-existentes na suite). Se algum falhar:
- Test `'greenfield init generates expected file tree matching golden'` fails: tree.json desatualizado — re-rodar Passo 5 (tree).
- Test `'greenfield init produces stdout matching golden (normalized)'` fails: stdout desatualizado — re-rodar Passo 5 (stdout).

### Passo 7: Validar nao-regressao em outros testes

```powershell
bun test
```

**Esperado:** suite completa verde, **incluindo** todos os testes do parity (`populate-plan-parity.test.ts`) das fases 01-05.

```powershell
bun run harness:validate
```

**Esperado:** exit 0. Confirma estrutura `docs/exec-plans/active/`, `docs/compound/` integras.

### Passo 8: Atualizar MEMORY.md raiz do harness

Localizar arquivo `C:\Users\luizf\.claude\projects\F--Projetos-Anti-Vibe-Coding\memory\MEMORY.md` E o `MEMORY.md` no nivel do plugin (se houver — verificar com `Get-ChildItem MEMORY.md -Recurse` na raiz do projeto).

Conforme `MEMORY.md` raiz (escopo: usuario harness — `C:\Users\luizf\.claude\projects\F--Projetos-Anti-Vibe-Coding\memory\MEMORY.md`):

Antes:
```markdown
### Golden snapshot precisa regeneracao (Plano 05 fase-04)

- `tests/e2e/__golden__/init-greenfield.stdout.txt` linhas 4-7+19 conteem referencias a steps removidos:
  - linha 4: `[07-discover-existing-docs]`
  - linha 5: `[08-classify-blocks-hybrid]`
  - linha 6: `[09-propose-merge-batch]`
  - linha 7: `[11-move-docs-with-stub]`
  - linha 19: `[10-apply-merge-destructive]`
  Regenerar no Plano 05 fase-04 apos reescrita dos E2E para o fluxo novo.
```

Depois (substituir o bloco inteiro por nota de fechamento):

```markdown
### Goldens regenerados (PRD populate-plan-andre-port, Plano 05 fase-06 — fechado 2026-05-19)

- `tests/e2e/__golden__/init-greenfield.stdout.txt` regenerado contra fluxo Step 91 novo
  (11 secoes PLAN.md, instrucoes imperativas, audit log com `docsCoveredByStack`).
- `tests/e2e/__golden__/init-greenfield.tree.json` confirmado contra output atual.
- 4 testes em `tests/e2e/init-cutover-greenfield.test.ts` ativos e verdes (sem `test.skip`).
- Substitui TODO anterior do PRD knowledge-path-cutover (Plano 05 fase-04).
```

**OBSERVACAO IMPORTANTE:** O MEMORY.md do auto-memory system (em `C:\Users\luizf\.claude\projects\...`) NAO usa o formato hierarquico do plugin — ele e um indice de arquivos individuais (`user_profile.md`, `feedback_*.md`, `project_*.md`). A entrada "Golden snapshot precisa regeneracao" foi observada na conversa do system-reminder no inicio desta skill, mas pode estar em um arquivo separado ou inline no `MEMORY.md` plugin-level. **Verificar PRIMEIRO** onde a nota vive:

```powershell
Select-String -Pattern "Plano 05 fase-04" -Path "C:\Users\luizf\.claude\projects\F--Projetos-Anti-Vibe-Coding\memory\*.md"
Select-String -Pattern "Plano 05 fase-04" -Path "F:\Projetos\Anti-Vibe-Coding\MEMORY.md" -ErrorAction SilentlyContinue
Select-String -Pattern "Plano 05 fase-04" -Path "F:\Projetos\Anti-Vibe-Coding\**\MEMORY.md" -ErrorAction SilentlyContinue
```

Editar o arquivo correto. Se a nota estiver em MULTIPLOS lugares (raiz do plugin + auto-memory), atualizar **apenas** o do plugin — auto-memory pertence ao usuario.

### Passo 9: Cleanup arquivos `.bak` e scripts temporarios

```powershell
Remove-Item tests/e2e/__golden__/init-greenfield.stdout.txt.bak
Remove-Item tests/e2e/__golden__/init-greenfield.tree.json.bak
Remove-Item tmp/regen-golden.ts -ErrorAction SilentlyContinue
Remove-Item tmp/regen-tree.ts -ErrorAction SilentlyContinue
```

### Passo 10: Validacao final

```powershell
bun test
bun run typecheck
bun run lint
bun run harness:validate
bun run compound:check
```

**Todos esperados:** exit 0.

### Passo 11: Registrar fechamento em MEMORY.md do Plano 05

- `DI-Plano05-fase06-regen-mecanismo`: detectado em Passo 2 entre Cenario A (helper com `UPDATE_GOLDENS=1`) ou Cenario B (script descartavel `tmp/regen-golden.ts`). Registrar qual foi usado.
- `DI-Plano05-fase06-diff-esperado`: lista exata dos diffs intencionais validados em Passo 4. Se algum diff for inesperado, NAO aceitar.
- `DI-Plano05-fase06-memory-cleanup`: arquivo MEMORY.md onde a nota antiga estava + linha substituida.

---

## Gotchas

- **G9 do plano (escopo da regen):** regen NAO eh "reescrever do zero". E capturar output atual do `/init` greenfield apos os Planos 01-05. Diff manual em Passo 4 e o gate de qualidade — se algo inesperado aparecer, parar.
- **G-test-skip-ja-removido:** os 2 testes em `init-cutover-greenfield.test.ts` (linhas 103 e 121) ja estao SEM `test.skip` (apenas comentarios `Plano 05 fase-04 — test.skip removido`). Se golden estava desatualizado, os tests passariam erradamente — possivel falso positivo. Validar manualmente que ambos testes geram diff util ANTES de remover `.bak`. Se ambos passarem trivialmente sem mudar golden, eh suspeito — investigar.
- **G-memory-locations:** MEMORY.md pode existir em (1) auto-memory usuario, (2) raiz do plugin, (3) por plano. A nota a remover (Passo 8) e do **auto-memory usuario** baseado no system-reminder. Verificar TODOS os locais antes de editar.
- **G-windows-line-endings-golden:** Golden em Windows pode gravar com CRLF. Test helper usa `normalizeStdout` (linha 131 do test atual) — confirmar que normaliza line endings. Se nao, adicionar `.replace(/\r\n/g, '\n')` no helper antes do compare.
- **G-tmp-cleanup-forgotten:** scripts em `tmp/regen-*.ts` sao **descartaveis**. Falha em deletar = adicionar arquivo nao-relacionado ao PR. Cleanup obrigatorio em Passo 9.
- **G-fixture-src-changed:** se Plano 01 fase-01 ou Plano 02 mudaram a fixture greenfield usada pelo test, regen pode pegar estado novo da fixture (intencional). Mas se fixture nao deveria ter mudado, eh regressao — investigar antes de aplicar.
- **G-tree-json-format:** `init-greenfield.tree.json` e array de paths (strings). Helper `normalizeTree` aplica algum filtro (verificar). Regen do tree.json e mais simples que stdout — apenas serializar array.

---

## Verificacao

### TDD

Esta fase nao tem TDD — entrega e regen de goldens. Verificacao via:

- [ ] **RED (inicial):** ANTES de Passo 5 (golden ainda antigo, planos 01-05 todos mergeados), rodar `bun test tests/e2e/init-cutover-greenfield.test.ts` — esperado: 2 fails (`'greenfield init generates expected file tree matching golden'` + `'greenfield init produces stdout matching golden (normalized)'`) porque output atual diverge do golden antigo.
- [ ] **GREEN:** apos Passo 5 (golden regerado), 4 pass.
- [ ] **REFACTOR:** N/A (sao snapshots).

### Checklist

- [ ] Snapshot `.bak` dos 2 goldens criado em Passo 1.
- [ ] Mecanismo de regen identificado (Cenario A ou B) em Passo 2.
- [ ] `init-greenfield.stdout.txt` regenerado E inspecionado em diff manual (Passo 4).
- [ ] `init-greenfield.tree.json` regenerado E inspecionado.
- [ ] 4 testes em `tests/e2e/init-cutover-greenfield.test.ts` pass.
- [ ] `bun test` suite completa pass.
- [ ] `bun run typecheck` exit 0.
- [ ] `bun run lint` exit 0.
- [ ] `bun run harness:validate` exit 0.
- [ ] `bun run compound:check` exit 0.
- [ ] MEMORY.md raiz tem nota anterior substituida ou removida (Passo 8).
- [ ] Arquivos `.bak` e scripts em `tmp/regen-*.ts` deletados.
- [ ] MEMORY.md do Plano 05 atualizada (3 DIs).

### Comandos verificaveis

```powershell
# Tests do init greenfield
bun test tests/e2e/init-cutover-greenfield.test.ts
# Esperado: 4 pass

# Suite completa
bun test
# Esperado: TUDO verde (este e o ultimo check do PRD)

# Validators
bun run typecheck
bun run lint
bun run harness:validate
bun run compound:check
# Todos: exit 0

# Confirma cleanup
Test-Path tests/e2e/__golden__/init-greenfield.stdout.txt.bak
# Esperado: False

Test-Path tmp/regen-golden.ts
# Esperado: False

# Confirma MEMORY.md sem nota antiga
Select-String -Pattern "Plano 05 fase-04 do plano antigo" -Path **/MEMORY.md
# Esperado: 0 matches (sem nota antiga)
```

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-cutover-greenfield.test.ts` — exit 0, 4 pass.
- `bun test` — exit 0, suite completa verde.
- `bun run typecheck` e `bun run lint` exit 0.
- `bun run harness:validate` exit 0.
- `bun run compound:check` exit 0.
- `Test-Path tests/e2e/__golden__/init-greenfield.stdout.txt.bak` retorna `False` (cleanup feito).
- `Test-Path tmp/regen-golden.ts` retorna `False` (cleanup feito).

**Por humano:**
- Diff manual entre golden `.bak` e golden novo (Passo 4) listado em MEMORY.md como esperado.
- Cada diff intencional rastreavel a um Plano 01-05 deste PRD.
- MEMORY.md raiz nao tem mais nota "regenerar golden — Plano 05 fase-04" do PRD anterior.

---

## Fechamento do PRD

Apos esta fase, o PRD `populate-plan-andre-port` esta pronto para merge. Checklist final
(para reportar ao dev no momento de `/verify-work`):

- [ ] 4 Must Haves cobertos: MH-1 (Plano 01), MH-2 (Plano 02), MH-3 (Plano 03), MH-4 (Plano 04).
- [ ] 4 Should Haves cobertos: SH-1 (Plano 05 fase-05), SH-2 (Plano 05 fase-02), SH-3 (Plano 05 fase-03), SH-4 (Plano 05 fase-04).
- [ ] 8 Criterios de Aceite verdes: CA-01 (Plano 01), CA-02 (Plano 04), CA-03 (Plano 02), CA-04 (Plano 01), CA-05 (Plano 04), CA-06 (Plano 03), CA-07 (Plano 05 fase-01), CA-08 (Plano 05 fase-01).
- [ ] Compound capturado: `docs/compound/2026-05-19-never-diminish-andre.md` (Plano 05 fase-05).
- [ ] Goldens regenerados: este Plano 05 fase-06.
- [ ] Suite verde + harness validate verde + compound check verde.

Proximo passo: `/anti-vibe-coding:verify-work` no PR antes de merge.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
