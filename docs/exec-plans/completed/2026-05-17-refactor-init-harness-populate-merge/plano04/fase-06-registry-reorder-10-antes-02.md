<!--
Princípio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
`// 2026-05-18 (Luiz/dev): <razao> — PRD <ref>`.
-->

# Fase 06: Registry reorder — Step 10 imediatamente antes de Step 02

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 0.5h
**Depende de:** fase-03 (Step 10 implementado e com testes verdes) + fase-05 (Step 11 implementado, registry ja modificado com Steps 09/10/11 em sequencia)
**Visual:** false

---

## O que esta fase entrega

Reorder definitivo do `registry.ts`: `applyMergeDestructiveStep` (id `10-apply-merge-destructive`) eh movido para vir **IMEDIATAMENTE antes** de `linkClaudeAgentsStep` (id `02-link-claude-agents`). Razao (D23): apply-merge reescreve CLAUDE.md primeiro, e Step 02 (link-claude-agents) ja encontra arquivo no formato espelho ≤40 linhas — symlink/hardlink/copy 3-tier eh criado sobre arquivo correto sem necessidade de recriacao posterior. Ajusta testes do Step 02 que dependem da ordem antiga.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Mover `applyMergeDestructiveStep` para imediatamente antes de `linkClaudeAgentsStep` (D23) |
| `skills/init/lib/registry.test.ts` | Modify | Atualizar assert de posicao (Step 10 indexOf === Step 02 indexOf - 1) |
| `skills/init/lib/steps/02-link-claude-agents.test.ts` | Modify (provavel) | Fixture do teste agora fornece CLAUDE.md ja espelho ≤40 linhas (cenario realistico apos reorder), OU teste roda Step 10 + Step 02 em sequencia |
| Outros testes E2E que assumam ordem antiga | Modify | Listar antes de iniciar a fase via `Grep "linkClaudeAgentsStep|02-link-claude-agents"` (G14 do README do plano) |

---

## Implementacao

### Passo 1: Mapear impacto antes de mexer

ANTES de editar `registry.ts`, executar grep e listar TODOS os testes que referenciam Step 02 OU sua ordem relativa:

```bash
# Listar arquivos que importam linkClaudeAgentsStep
grep -r "linkClaudeAgentsStep" skills/init/ --include="*.ts" --include="*.test.ts"

# Listar arquivos que mencionam '02-link-claude-agents'
grep -r "02-link-claude-agents" skills/init/ tests/ --include="*.ts" --include="*.md"

# Listar testes E2E que rodam o init completo
grep -r "runInit" tests/ --include="*.ts"
```

Registrar a lista no `MEMORY.md` do Plano 04 (campo "Lista de testes ajustados em fase-06") ANTES de aplicar mudancas. Sem essa lista, o reorder eh feito as cegas.

### Passo 2: Reorder no registry

Estado atual do registry (de `f:\Projetos\Anti-Vibe-Coding\skills\init\lib\registry.ts`, linhas 34-52):

```typescript
// ESTADO ATUAL (apos fase-02/03/05 com Steps 09/10/11 posicionados em sequencia entre
// classify-blocks-hybrid e migrate0ParseDryRunStep — wiring provisorio):

export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  // ... (Steps 06/07/08 inseridos por Plano 03)
  secretsScanStep,
  discoverExistingDocsStep,
  classifyBlocksHybridStep,
  proposeMergeBatchStep,             // 2026-05-18 — fase-02
  applyMergeDestructiveStep,         // 2026-05-18 — fase-03 (PROVISORIO aqui)
  moveDocsWithStubStep,              // 2026-05-18 — fase-05
  migrate0ParseDryRunStep,
  migrateAllOrchestrateStep,
  migrate1BackupStep,
  migrate2PlanningStep,
  migrate3LessonsStep,
  migrate4DecisionsStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,              // <- Step 02 reposicionado pelo legacy
  detectStackAndRegisterStep,
  // ...
]
```

Estado APOS reorder desta fase (D23 — Step 10 imediatamente antes de Step 02):

```typescript
// ESTADO APOS FASE-06:
// - Step 10 (apply-merge-destructive) movido para JUST BEFORE linkClaudeAgentsStep
// - Step 09 e Step 11 mantem suas posicoes proximas a Step 10 — agrupamento logico
// - Alternativa considerada: mover Steps 09 + 10 + 11 inteiro para antes de Step 02.
//   Decisao: mover apenas Step 10 (apply destrutivo). Step 09 (propose) e Step 11 (move)
//   nao precisam dessa proximidade — eles agem em outros arquivos. O reorder eh especifico
//   ao CLAUDE.md.

export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  secretsScanStep,
  discoverExistingDocsStep,
  classifyBlocksHybridStep,
  proposeMergeBatchStep,             // fase-02: emite needsUser com diff agregado
  // Step 10 movido daqui para antes do Step 02 (linha abaixo).
  moveDocsWithStubStep,              // fase-05: move docs classificados
  migrate0ParseDryRunStep,
  migrateAllOrchestrateStep,
  migrate1BackupStep,
  migrate2PlanningStep,
  migrate3LessonsStep,
  migrate4DecisionsStep,
  scaffoldFullTreeStep,
  // 2026-05-18 (Luiz/dev): D23 — Step 10 IMMEDIATELY BEFORE Step 02 (link-claude-agents).
  // apply-merge reescreve CLAUDE.md espelho antes de link-claude-agents criar
  // symlink/hardlink/copy 3-tier. Step 02 ja encontra arquivo no formato espelho <=40 linhas.
  applyMergeDestructiveStep,         // 2026-05-18 (Luiz/dev): D23 — antes de linkClaudeAgentsStep
  linkClaudeAgentsStep,              // 2026-05-17 (Luiz/dev): consome CLAUDE.md ja espelho apos D23
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,
  deliveryLoopStep,
  capabilitiesDiscoveryStep,
  finalValidationStep,
]
```

**Nota:** o reorder mantem Step 11 (move-docs-with-stub) na posicao anterior (apos Step 09). Step 11 NAO depende de estar proximo a Step 02 — atua em outros arquivos. Step 09 idem. Apenas Step 10 (que reescreve CLAUDE.md) muda para antes de Step 02.

### Passo 3: Atualizar `registry.test.ts`

```typescript
// 2026-05-18 (Luiz/dev): plano04 fase-06 — assert reorder D23
import { registry } from './registry'
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'

it('positions apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents (D23 reorder)', () => {
  const i10 = registry.indexOf(applyMergeDestructiveStep)
  const i02 = registry.indexOf(linkClaudeAgentsStep)
  expect(i10).toBeGreaterThan(-1)
  expect(i02).toBeGreaterThan(-1)
  expect(i10).toBe(i02 - 1)
})
```

E remover/atualizar quaisquer testes existentes em `registry.test.ts` que tenham assertions de posicao baseadas na ordem antiga.

### Passo 4: Atualizar testes do Step 02

Cenarios provaveis (confirmar via grep do Passo 1):

**Cenario A — teste de Step 02 isolado com fixture de CLAUDE.md original (>40 linhas):**
- Antes: fixture criava `CLAUDE.md` de 287 linhas + rodava Step 02 esperando que link/copia funcionasse sobre arquivo grande.
- Depois: fixture cria `CLAUDE.md` ja espelho ≤40 linhas (formato pos-Step 10). Step 02 testado isoladamente nao precisa rodar Step 10 antes — apenas o ESTADO FINAL pos-Step 10 eh fornecido.

**Cenario B — teste E2E completo que assume ordem antiga:**
- Antes: rodava `runInit` em fixture com CLAUDE.md grande e validava que link foi criado ANTES da transformacao.
- Depois: `runInit` agora roda Step 10 (transforma) ANTES de Step 02 (linka). Test atualizado para validar que linka acontece sobre o ESPELHO (≤40 linhas) e nao sobre o original.

**Estrategia de update:**
```typescript
// Antes (cenario A — fixture obsoleto):
beforeEach(() => {
  writeFileSync(claudePath, 'linha\n'.repeat(287), 'utf8') // 287 linhas
})

// Depois:
beforeEach(() => {
  // 2026-05-18 (Luiz/dev): fase-06 reorder — CLAUDE.md chega ao Step 02 ja espelho — D23
  writeFileSync(claudePath, MIRROR_FIXTURE_CONTENT, 'utf8') // <40 linhas
})
```

### Passo 5: Validar que nada quebrou

```bash
bun test skills/init/lib/registry.test.ts
bun test skills/init/lib/steps/02-link-claude-agents.test.ts
bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts
bun test skills/init/lib/steps/11-move-docs-with-stub.test.ts
bun test tests/e2e/  # ou paths especificos via grep do Passo 1
```

Cada um deve retornar 0 falhas.

---

## Gotchas

- **G7 do plano (reorder cirurgico):** APENAS Step 10 (`applyMergeDestructiveStep`) muda de posicao. Steps 09 e 11 ficam onde estavam (apos `classifyBlocksHybridStep` em sequencia logica de discovery → propose → move). Mover os 3 juntos para antes do Step 02 quebraria a sequencia de discovery (Plano 03) que precisa rodar antes da proposta.
- **G14 do plano (test fragility):** Testes do Step 02 que rodam com fixture de CLAUDE.md original precisam ser identificados via grep ANTES da edicao. NAO improvisar — listar paths exatos no MEMORY do plano. Se NENHUM teste do Step 02 quebrar apos reorder, isso eh suspeito (provavel que algum cenario nao esta sendo testado) — investigar antes de marcar fase como concluida.
- **Local (sequencia geral preservada):** Apos reorder, a ordem logica fica:
  1. detect-legacy → reuse-discovery (gates)
  2. secrets-scan → discover-existing-docs → classify-blocks-hybrid (discovery — Plano 03)
  3. propose-merge-batch (needsUser — Plano 04 fase-02)
  4. move-docs-with-stub (executa moves apos aprovacao — Plano 04 fase-05)
  5. migrate-0..4 (migration legacy)
  6. scaffold-full-tree (Step 01)
  7. **apply-merge-destructive (NOVO POSICIONAMENTO — Plano 04 fase-06 reorder)**
  8. link-claude-agents (Step 02 — agora ja com CLAUDE.md espelho)
  9. detect-stack → persist → customize → install-gh → delivery → capabilities → final-validation → generate-populate-plan (Plano 02 Step 91)

  Documentar essa sequencia no MEMORY do plano para que Plano 05 fase-05 (`--additive-merge`) e Plano 06 fase-01 (audit log) saibam onde injetar logica.

- **Local (rollback friendly):** Apos reorder, em modo `--rollback` (Plano 05 fase-04), reverter eh: restaurar CLAUDE.md original do backup → re-rodar Step 02 (link) sobre o original. O ADR de rollback documenta isso.

---

## Verificacao

### TDD

- [ ] **RED:** Apos editar `registry.ts` mas ANTES de atualizar `registry.test.ts`, o teste antigo de posicao falha — confirma que a ordem mudou.
- [ ] **GREEN:** Atualizar `registry.test.ts` com novo assert (Step 10 indexOf === Step 02 indexOf - 1) → teste passa.
- [ ] **REFACTOR:** N/A (apenas reorder).

### Checklist

- [ ] `registry.indexOf(applyMergeDestructiveStep) === registry.indexOf(linkClaudeAgentsStep) - 1` (assert no `registry.test.ts`).
- [ ] `bun test skills/init/lib/registry.test.ts` retorna 0 falhas.
- [ ] `bun test skills/init/lib/steps/02-link-claude-agents.test.ts` retorna 0 falhas (apos ajustes em fixture).
- [ ] `bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/steps/11-move-docs-with-stub.test.ts skills/init/lib/steps/09-propose-merge-batch.test.ts` retornam 0 falhas (sem regressao).
- [ ] `bun test tests/e2e/` (se houver) retorna 0 falhas — ou cada arquivo listado pelo grep do Passo 1 retorna 0 falhas individualmente.
- [ ] `bun run lint` clean em todos os arquivos modificados.
- [ ] Lista exata de testes ajustados (paths + breve descricao) registrada no `MEMORY.md` do Plano 04.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/registry.test.ts skills/init/lib/steps/02-link-claude-agents.test.ts` retorna `0 failed`.
- `node -e "import('./skills/init/lib/registry.ts').then(r => { const arr = r.registry; const i10 = arr.findIndex(s => s.id === '10-apply-merge-destructive'); const i02 = arr.findIndex(s => s.id.startsWith('02-link-claude-agents')); process.exit(i10 === i02 - 1 ? 0 : 1) })"` retorna exit code 0.

**Por humano:**
- Leitura visual do `registry.ts` mostra `applyMergeDestructiveStep` na linha imediatamente anterior a `linkClaudeAgentsStep`, com comentario inline `// 2026-05-18 (Luiz/dev): D23 — antes de linkClaudeAgentsStep`.

---

**Referencia cruzada:**
- PRD: D23 (Step 10 antes Step 02), Notas de Implementacao (Ordem Step 10 → Step 02)
- README do plano: G7, G14
- Plano 04 fase-03: implementacao de Step 10 — pre-requisito desta fase
- Plano 04 fase-05: implementacao de Step 11 — pre-requisito desta fase
- Plano 05 fase-05 (`--additive-merge`): consome a posicao definida aqui para skip cirurgico
- Plano 07 fase-03 (CA-12 E2E): valida E2E que a ordem nova entrega o resultado esperado

<!-- Gerado por /plan-feature em 2026-05-18 -->
