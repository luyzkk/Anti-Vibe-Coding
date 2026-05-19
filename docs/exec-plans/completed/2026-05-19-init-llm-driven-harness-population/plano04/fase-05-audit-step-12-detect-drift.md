<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Auditoria do Step 12 (detect-drift-incremental)

**Plano:** 04 — Reentrada + Validator allowlist + Audit Step 12
**Sizing:** 1.5h
**Depende de:** fase-03, fase-04 (precisa allowlist provada eficaz antes de decidir sobre Step 12)
**Visual:** false

---

## O que esta fase entrega

Decisao auditada (com evidencia) sobre Step 12 (`12-detect-drift-incremental`): remove-o do registry + deleta libs orfas se a funcionalidade ja for coberta pela allowlist da fase-03, OU documenta coexistencia explicita se ortogonal. Resolve R3 da revisao de riscos.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/12-detect-drift-incremental.ts` | Delete (provavel) | Remover apos confirmar sobreposicao com Step 90 allowlist |
| `skills/init/lib/steps/12-detect-drift-incremental.test.ts` | Delete (provavel) | Suite acompanha o step |
| `skills/init/lib/drift-detector.ts` | Delete (provavel) | Lib orfa apos remocao do step |
| `skills/init/lib/drift-detector.test.ts` | Delete (provavel) | Suite acompanha |
| `skills/init/lib/registry.ts` | Modify | Remover `detectDriftIncrementalStep` do array exportado OU adicionar comentario justificando coexistencia |
| `skills/init/lib/registry.test.ts` | Modify | Atualizar assertions de IDs presentes |
| `docs/exec-plans/active/2026-05-19-init-llm-driven-harness-population/plano04/MEMORY.md` | Modify | Registrar decisao em "Decisoes de Implementacao" |

---

## Implementacao

### Passo 1: auditoria comparativa (no codigo, antes de tocar)

Comparar contrato funcional:

| Aspecto | Step 12 (`detect-drift-incremental`) | Step 90 (allowlist, fase-03) |
|---|---|---|
| Quando roda | apenas modo `already-initiated` (`ctx.flags['__initMode']`) | sempre apos scaffold |
| Input | `.claude/.anti-vibe-manifest.json` files+sha256 | `TEMPLATE_MANIFEST.dst[]` + walk de `docs/` |
| Output | `drift-report.json` com `{placeholder, populated, drift}` por arquivo | summary com `N warnings agrupados` |
| Decisao | classifica conteudo: placeholder/populated/drift via `isTemplateContent` + sha mismatch | binario: arquivo dentro/fora do scaffold canonico |
| Escrita em disco | sim (`drift-report.json` via `writeDiscoveryArtifact`) | nao (so summary) |

**Sobreposicao real:** Step 12 detecta drift de **conteudo** (sha mudou); Step 90 detecta drift de **estrutura** (arquivos extras / faltantes). Conclusao: NAO sao totalmente sobrepostos — mas o caso de uso original do Step 12 (alertar reentrada destrutiva) ja e coberto pelo Step `00_2-reentry-guard` (fase-01).

**Decisao recomendada:** **REMOVER** Step 12. Justificativa: o gate de reentrada (fase-01) substitui o sinal principal (`already-initiated -> drift`); detalhe de sha-by-file deixou de ser acionavel (`/sync` cobre isso). Confirmar em codigo.

### Passo 2: verificar callers antes de deletar

```bash
# Comandos de verificacao (rodar e anexar output em MEMORY.md > Decisoes)
grep -rn "drift-detector\|detectDriftIncrementalStep\|DRIFT_REPORT_FILENAME" \
  skills/ tests/ scripts/ \
  --include="*.ts" --include="*.md"
```

Resultados esperados:
- `skills/init/lib/registry.ts` (so import + uso na constante)
- `skills/init/lib/steps/12-detect-drift-incremental.ts` (self)
- `skills/init/lib/drift-detector.ts` (self)
- testes acompanhando

Se aparecer caller fora dessa lista (ex: tracer-bullet, script externo), reavaliar: deletar quebra esse caller. Nesse caso, documentar coexistencia em vez de deletar.

### Passo 3a: caminho A — remocao (se sem callers externos)

```typescript
// skills/init/lib/registry.ts (diff)
- import { detectDriftIncrementalStep } from './steps/12-detect-drift-incremental'
// ...
  reuseDiscoveryStep,
  reentryGuardStep,
  backupPre650Step,
  secretsScanStep,
  discoverExistingDocsStep,
  classifyBlocksHybridStep,
  proposeMergeBatchStep,
  moveDocsWithStubStep,
- detectDriftIncrementalStep,
  migrate0ParseDryRunStep,
```

Deletar fisicamente:
- `skills/init/lib/steps/12-detect-drift-incremental.ts`
- `skills/init/lib/steps/12-detect-drift-incremental.test.ts`
- `skills/init/lib/drift-detector.ts`
- `skills/init/lib/drift-detector.test.ts`

Atualizar `skills/init/lib/registry.test.ts`:

```typescript
// skills/init/lib/registry.test.ts (diff conceitual)
it('does not include the removed detect-drift-incremental step', () => {
  const ids = registry.map((s) => s.id)
  expect(ids).not.toContain('12-detect-drift-incremental')
})
```

### Passo 3b: caminho B — coexistencia (se ortogonal e callers existem)

Em `registry.ts`, adicionar bloco JSDoc explicando coexistencia:

```typescript
/**
 * Step 12 (detect-drift-incremental) coexiste com Step 90 (allowlist) por razao ORTOGONAL:
 * - Step 90 valida ESTRUTURA: arquivos extras vs scaffold canonico.
 * - Step 12 valida CONTEUDO: sha de arquivos templated vs original (modo already-initiated).
 * Manter ambos. Auditado em Plano 04 fase-05 (2026-05-19, Luiz/dev).
 */
```

Em `plano04/MEMORY.md`, registrar:

```markdown
- **DI-Plano04-fase05:** Step 12 mantido em coexistencia com Step 90.
  - Por que: Step 90 valida estrutura (arquivos extras); Step 12 valida conteudo (sha de templates) em modo already-initiated. Ortogonais.
  - Callers externos detectados: `<lista do grep>`.
  - Impacto: nenhuma alteracao no registry; doc inline acrescentado.
```

### Passo 4: registrar decisao em MEMORY.md

Independente do caminho A ou B, anexar ao `MEMORY.md` do plano:

```markdown
## Decisoes de Implementacao

- **DI-Plano04-fase05:** {Remocao | Coexistencia}
  - Output do grep de callers: ...
  - Justificativa: ...
  - Arquivos afetados: ...
```

---

## Gotchas

- **G9 do plano:** Step 12 le `ctx.flags['__initMode']` (legado). Pos-fase-01, a flag relevante e `__reentryMode`. Mesmo no caminho B, considerar atualizar a leitura para `__reentryMode === 're-populate'` para manter coerencia semantica.
- **G10 do plano:** `drift-detector` pode ser importado por tracer-bullet ou scripts. Rodar o grep ANTES de deletar — esta e a unica forma de evitar broken imports silenciosos.
- **Local:** Se deletar `drift-detector.ts`, conferir que nenhum doc em `docs/` referencia `drift-report.json` como artefato esperado (grep em `docs/`). Se referenciar, atualizar doc no mesmo PR.
- **Local:** Bun cache de teste pode esconder regressao. Apos delecao, rodar `bun test` LIMPO (sem watch) cobrindo todo `skills/`.

---

## Verificacao

### TDD

Caminho A (remocao):

- [ ] **RED:** `bun test skills/init/lib/registry.test.ts` falha apos remocao se assertion for "expect length === 22" (numero antigo)
- [ ] **GREEN:** ajustar assertion para length nova; teste de "nao contem id removido" passa

Caminho B (coexistencia):

- [ ] Nenhum teste muda; adicionar smoke test que confirma ambos steps existem no registry com IDs distintos

### Checklist

- [ ] Output do grep de callers anexado em `MEMORY.md`
- [ ] Decisao (A ou B) registrada com data + autor em `MEMORY.md`
- [ ] Se caminho A: 4 arquivos deletados (`12-*.ts`, `12-*.test.ts`, `drift-detector.ts`, `drift-detector.test.ts`) + import removido de `registry.ts`
- [ ] Se caminho B: comentario JSDoc adicionado em `registry.ts` + flag legacy atualizada
- [ ] `bun test` cobrindo `skills/init/` passa
- [ ] Nenhum import quebrado: `bun run lint`
- [ ] `git grep "drift-detector"` retorna 0 (caminho A) ou apenas referencias internas justificadas (caminho B)

---

## Criterio de Aceite

**Por maquina (caminho A):**
- `ls skills/init/lib/steps/12-detect-drift-incremental.ts 2>/dev/null` retorna vazio
- `ls skills/init/lib/drift-detector.ts 2>/dev/null` retorna vazio
- `grep -rn "detectDriftIncrementalStep\|drift-detector" skills/ tests/ --include="*.ts"` retorna 0 linhas
- `bun test skills/init/` retorna `0 failed`

**Por maquina (caminho B):**
- `grep -n "Step 12 .* coexiste" skills/init/lib/registry.ts` retorna 1 linha
- `bun test skills/init/lib/registry.test.ts` passa com Step 12 ainda registrado

**Por humano:**
- Releitura do `MEMORY.md` da fase-05 deixa claro POR QUE a decisao foi A ou B, incluindo evidencia do grep

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
