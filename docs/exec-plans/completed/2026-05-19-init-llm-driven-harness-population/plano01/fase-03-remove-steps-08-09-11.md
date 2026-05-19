<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 03: Remove Steps 08 / 09-propose-merge-batch / 11 + Libs Orfas

**Plano:** 01 — Refactor de Registry (Tracer Bullet)
**Sizing:** 1.5h
**Depende de:** fase-01 (pode rodar em paralelo com fase-02)
**Visual:** false

---

## O que esta fase entrega

Steps `08-classify-blocks-hybrid`, `09-propose-merge-batch` e `11-move-docs-with-stub` removidos
do registry; arquivos source e tests deletados; libs orfas correspondentes
(`blocks-classifier`, `doc-mover-stub`, `merge-proposal-types`, `preview-renderer`,
eventualmente `discovery-store` se totalmente orfao) tambem deletadas. Pipeline da init
sem nenhuma heuristica regex residual de classificacao/move.

**Importante:** Step `09-migrate-0-parse-dry-run` e Step `10-apply-merge-destructive`
NAO sao tocados nesta fase:
- `09-migrate-0-parse-dry-run` permanece (parse de flag, nao tem relacao com a heuristica
  removida).
- `10-apply-merge-destructive` e tratado na fase-04 (rename via `git mv`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Remove 3 imports + 3 entries do array. Atualiza comentario explicativo. |
| `skills/init/lib/steps/08-classify-blocks-hybrid.ts` | Delete | Heuristica regex de classificacao removida (MH-04). |
| `skills/init/lib/steps/08-classify-blocks-hybrid.test.ts` | Delete | Testes obsoletos. |
| `skills/init/lib/steps/09-propose-merge-batch.ts` | Delete | Diff preview heuristico removido (MH-04). |
| `skills/init/lib/steps/09-propose-merge-batch.test.ts` | Delete | Testes obsoletos. |
| `skills/init/lib/steps/11-move-docs-with-stub.ts` | Delete | Move com stub via regex removido (MH-04). |
| `skills/init/lib/steps/11-move-docs-with-stub.test.ts` | Delete | Testes obsoletos. |
| `skills/init/lib/blocks-classifier.ts` | Delete | Lib orfa apos delete do Step 08. |
| `skills/init/lib/blocks-classifier.test.ts` | Delete | Testes orfaos. |
| `skills/init/lib/doc-mover-stub.ts` | Delete | Lib orfa apos delete do Step 11. |
| `skills/init/lib/doc-mover-stub.test.ts` | Delete | Testes orfaos. |
| `skills/init/lib/merge-proposal-types.ts` | Investigate | Tipos `MoveAction`/`BlockedAction`/`MergeProposal`. Se nao tiverem mais callers, deletar. |
| `skills/init/lib/preview-renderer.ts` | Investigate | `renderMergePreview` usado pelo Step 09. Verificar se ha outros callers; se nao, deletar. |
| `skills/init/lib/discovery-store.ts` | Investigate | Step 06 ainda usa para `secrets-scan-result`. Manter A MENOS que grep prove orfandade total. |

---

## Implementacao

### Passo 1: Remover imports + entries em `registry.ts`

Linhas a remover (estado atual apos fase-01 + fase-02):

```typescript
import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
```

E no array, remover as 3 linhas:

```typescript
  classifyBlocksHybridStep,     // 2026-05-18 (Luiz/dev): ...
  proposeMergeBatchStep,        // 2026-05-18 (Luiz/dev): ...
  moveDocsWithStubStep,         // 2026-05-18 (Luiz/dev): ...
```

Substituir os 3 slots por UM unico comentario explicativo:

```typescript
  // 2026-05-19 (Luiz/dev): Plano 01 fase-03 — Steps 08 (classify-blocks-hybrid),
  // 09 (propose-merge-batch) e 11 (move-docs-with-stub) removidos. PRD MH-04 / D1:
  // mapeamento N -> M de docs vira responsabilidade da LLM via plano populate
  // gerado pelo Step 91 (reescrito no Plano 03).
```

### Passo 2: Deletar arquivos dos Steps 08/09/11

```bash
rm skills/init/lib/steps/08-classify-blocks-hybrid.ts
rm skills/init/lib/steps/08-classify-blocks-hybrid.test.ts
rm skills/init/lib/steps/09-propose-merge-batch.ts
rm skills/init/lib/steps/09-propose-merge-batch.test.ts
rm skills/init/lib/steps/11-move-docs-with-stub.ts
rm skills/init/lib/steps/11-move-docs-with-stub.test.ts
```

### Passo 3: Auditoria de libs orfas

Rodar em sequencia (cada grep informa se a lib pode ser deletada):

```bash
# blocks-classifier
grep -rn "from.*blocks-classifier\|require.*blocks-classifier" skills/ --include="*.ts" \
  | grep -v "^skills/init/lib/blocks-classifier"

# doc-mover-stub
grep -rn "from.*doc-mover-stub\|require.*doc-mover-stub" skills/ --include="*.ts" \
  | grep -v "^skills/init/lib/doc-mover-stub"

# merge-proposal-types
grep -rn "from.*merge-proposal-types\|require.*merge-proposal-types" skills/ --include="*.ts" \
  | grep -v "^skills/init/lib/merge-proposal-types"

# preview-renderer
grep -rn "from.*preview-renderer\|require.*preview-renderer" skills/ --include="*.ts" \
  | grep -v "^skills/init/lib/preview-renderer"

# discovery-store (sera preservada se Step 06 ainda usar)
grep -rn "from.*discovery-store\|require.*discovery-store" skills/ --include="*.ts" \
  | grep -v "^skills/init/lib/discovery-store"
```

Regra: zero matches (alem da propria lib) -> delete. Qualquer match (alem da propria lib)
-> manter e anotar caller no MEMORY.md.

### Passo 4: Deletar libs orfas

Esperado pos-auditoria (hipotese de partida — fase pode ajustar):
- `blocks-classifier.ts` + `.test.ts` -> delete
- `doc-mover-stub.ts` + `.test.ts` -> delete
- `merge-proposal-types.ts` -> delete (usado apenas por Step 09 que foi deletado)
- `preview-renderer.ts` + eventuais testes -> delete (usado apenas por Step 09)
- `discovery-store.ts` -> MANTER (Step 06 secrets-scan ainda usa via
  `writeDiscoveryArtifact`/`readDiscoveryArtifact`; alem disso Step 10 backup-pre-mutation
  no Plano 02 fase-03 pode reusar)

```bash
# Apenas executar apos confirmar zero callers via Passo 3:
rm skills/init/lib/blocks-classifier.ts
rm skills/init/lib/blocks-classifier.test.ts
rm skills/init/lib/doc-mover-stub.ts
rm skills/init/lib/doc-mover-stub.test.ts
rm skills/init/lib/merge-proposal-types.ts
rm skills/init/lib/preview-renderer.ts
# Se houver preview-renderer.test.ts:
rm -f skills/init/lib/preview-renderer.test.ts
```

### Passo 5: Verificar imports orfaos em outros arquivos

```bash
# Apos deletes, verificar se algum arquivo TS quebra por import morto
bun run typecheck
```

Erros esperados podem vir de:
- `tests/e2e/ca13-dry-run-parity.test.ts` linha 42 menciona `09-propose-merge-batch`
  em comentario — verificar se ha tambem import ativo; se sim, marcar `test.skip` no
  arquivo todo (E2E vai ser reescrito no Plano 05 fase-04).
- Outros E2E que importam `proposeMergeBatchStep` ou similares: marcar `test.skip` com
  motivo apontando para Plano 05 fase-04.

NUNCA deletar testes E2E nesta fase — apenas skipar com comentario.

---

## Gotchas

- **G1 do plano (E2E quebrados):** Maioria dos E2E vai precisar de `test.skip`. Confirmar
  via `bun test tests/e2e/` apos os deletes. Listar no MEMORY.md exatamente quais arquivos
  E2E foram skipados (Plano 05 fase-04 precisa dessa lista).
- **G4 do plano (libs orfas):** O Passo 3 nao e opcional. Deletar `blocks-classifier.ts`
  sem checar callers pode esconder um caller residual (ex: Step 12 detect-drift-incremental
  pode importar tipos). Se o grep retornar match, NAO deletar a lib — manter, documentar
  no MEMORY.md (DI-N), e cobrir num plano futuro.
- **Local (interdependencias entre arquivos deletados):** `blocks-classifier.ts` importa
  de `discover-existing-docs.ts` (se ainda existir apos fase-02). Ordem de delete
  recomendada: arquivos de teste primeiro (sem dependencia reversa), depois Steps,
  depois libs. TS pode quebrar transitoriamente — usar `--noEmit` no typecheck
  para apenas validar.
- **Local (discovery-store preservada):** Atencao para nao deletar `discovery-store.ts`
  por engano. Step 06 usa. Tipo `SecretsScanResult` em `06-secrets-scan.ts` consume.
  Plano 02 fase-03 (backup-pre-mutation) PODE ainda usar para registrar artefato
  de backup. Manter conservadoramente.
- **Local (Step 12 detect-drift-incremental):** Step 12 esta no registry mas nao e tocado
  por este Plano 01. Verificar se importa de algum arquivo deletado — `12-detect-drift-incremental.ts`
  apareceu no grep da fase 02 (G4). Documentar no MEMORY.md se houver dependencia.
  Plano 04 fase-03 (validator allowlist) pode revisitar.

---

## Verificacao

### TDD

- [ ] **RED:** Antes dos deletes, rodar suite completa do init:
  - Comando: `bun test skills/init/lib/`
  - Resultado esperado: pass (estado pre-mudanca)

- [ ] **GREEN:** Apos deletes + atualizacao do `registry.ts`, suite passa SEM os arquivos deletados.
  - Comando: `bun test skills/init/lib/`
  - Resultado esperado: pass (nenhum arquivo deletado restante; nenhum import orfao)

### Checklist

- [ ] `registry.ts` nao tem mais imports de `08-classify-blocks-hybrid`, `09-propose-merge-batch`, `11-move-docs-with-stub`
- [ ] `registry.ts` nao tem mais as 3 entries correspondentes no array
- [ ] Arquivos dos 3 steps deletados (6 arquivos: 3 source + 3 test)
- [ ] Libs orfas confirmadas via grep (Passo 3) deletadas
- [ ] `discovery-store.ts` MANTIDA (Step 06 ainda usa)
- [ ] E2E afetados marcados com `test.skip` + comentario apontando Plano 05 fase-04
- [ ] Lista de E2E skipados anotada no MEMORY.md
- [ ] `bun run typecheck` passa sem erros
- [ ] `bun test skills/init/lib/registry.smoke.test.ts` continua passando

---

## Criterio de Aceite

**Por maquina:**
- `test ! -f skills/init/lib/steps/08-classify-blocks-hybrid.ts`
- `test ! -f skills/init/lib/steps/09-propose-merge-batch.ts`
- `test ! -f skills/init/lib/steps/11-move-docs-with-stub.ts`
- `grep -rn "classifyBlocksHybridStep\|proposeMergeBatchStep\|moveDocsWithStubStep" skills/init/lib/registry.ts` retorna `0` matches
- `bun run typecheck` retorna exit 0
- `bun test skills/init/lib/` retorna 0 failures
- `test -f skills/init/lib/discovery-store.ts` (preservada)

**Por humano:**
- MEMORY.md tem entrada DI-N listando libs deletadas + libs preservadas com justificativa
- MEMORY.md lista todos os arquivos E2E que foram skipados (input para Plano 05 fase-04)

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
