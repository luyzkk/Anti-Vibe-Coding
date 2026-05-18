# Memoria: Plano 03 — Discovery Pipeline (secrets + docs + classifier)

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Concluido:** 2026-05-18
**Status:** concluido (6/6 fases)

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** `secrets-scanner.ts` usa rastreamento de intervalos (`usedRanges`) por linha para evitar sobreposicao de matches entre patterns.
  - Por que: o regex de email casava `pass@db.example.com` dentro de uma postgres URL, gerando 2 matches onde o teste esperava 1.
  - Impacto: patterns de maior prioridade (definidos primeiro em `SECRET_PATTERNS`) prevalecem quando ha sobreposicao de posicao na string. Teste #4 (`postgres URL`) passou a exigir exatamente 1 match.

- **DI-2 (fase-05):** `harness?.sources.sort()` corrigido para `[...(harness?.sources ?? [])].sort()` no teste de glossario.
  - Por que: `GlossaryEntry.sources` eh `readonly string[]` — array readonly nao tem `.sort()` mutavel.
  - Impacto: qualquer consumidor que precise ordenar `sources` de `GlossaryEntry` deve usar spread antes de sort.

---

## Bugs Descobertos

Nenhum bug de runtime. Dois ajustes de implementacao identificados durante TDD (ver DI-1 e DI-2 acima).

---

## Gotchas

- **GT-1 (sem script lint):** O projeto nao tem script `lint` no `package.json`. Verificacoes de tipagem foram feitas com `bunx tsc --noEmit`. Erros pre-existentes em `lazy-import.test.ts` e `subagent-contract.ts` nao foram introduzidos por este plano.

---

## Desvios do Plano

- **DEV-1 (fase-01):** `secrets-scanner.ts` usa `usedRanges` para deduplicar matches sobrepostos, em vez da implementacao simples do spec. Comportamento externo identico — apenas 1 match por posicao, com prioridade para o primeiro pattern.
- **DEV-2 (fase-05):** `.sort()` em `readonly string[]` usa spread `[...arr].sort()` — ajuste minimo, sem impacto na API publica.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 2 (ambos minimos) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Testes da suite completa | 52/52 pass |

---

## Notas para Planos Seguintes

### API publica final de `skills/init/lib/secrets-scanner.ts`

```typescript
export type SecretKind = 'aws-key' | 'stripe-live' | 'postgres-url' | 'email' | 'jwt'

export type SecretMatch = {
  readonly kind: SecretKind
  readonly lineNumber: number
  readonly redactedSample: string  // 4 chars + '***'
}

export function scanSecrets(content: string): readonly SecretMatch[]
```

**NOTA CRITICA para Plano 04:** A implementacao usa `usedRanges` por linha — patterns de maior prioridade prevalecem em sobreposicao. Uma postgres URL com credencial `user:pass@host` nao emite match de email para `pass@host`.

### API publica final de `skills/init/lib/discover-existing-docs.ts`

```typescript
export type DiscoveredDoc = {
  readonly absolutePath: string
  readonly relativePath: string  // sempre posix-normalizado (forward slash)
  readonly bytes: number
  readonly extension: '.md' | '.mdx'
}

export async function discoverExistingDocs(cwd: string): Promise<readonly DiscoveredDoc[]>
```

Escopo: raiz nao-recursivo + `docs/` recursivo + `.claude/` recursivo.
Blacklist: `node_modules`, `dist`, `build`, `.git`, `.anti-vibe/backup`.
README guard: apenas `README.md` da raiz excluido; `docs/README.md` incluido.
Output: ordenado lexicograficamente por `relativePath`.

### API publica final de `skills/init/lib/blocks-classifier.ts`

```typescript
export type HarnessCategory =
  | 'docs/SECURITY.md' | 'docs/DESIGN.md' | 'docs/FRONTEND.md'
  | 'docs/RELIABILITY.md' | 'docs/PLANS.md' | 'docs/QUALITY_SCORE.md'
  | 'docs/MERGE_GATES.md'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type DocMapping = {
  readonly source: string
  readonly target: HarnessCategory
  readonly confidence: ConfidenceLevel
  readonly rationale: string
  readonly pendingLlmRefinement: boolean  // true quando confidence !== 'high'
}

export type OrphanMapping = {
  readonly source: string
  readonly target: string  // sempre 'docs/references/<basename>'
  readonly reason: string
}

export type GlossaryEntry = {
  readonly term: string
  readonly occurrences: number
  readonly sources: readonly string[]  // NOTA: readonly — use [...arr].sort() para ordenar
}

export type ClassifyInput = {
  readonly docs: readonly DiscoveredDoc[]
  readonly cwd: string
  readonly contentsBySource?: ReadonlyMap<string, string>  // injetavel para testes
}

export type ClassifyOutput = {
  readonly mappings: readonly DocMapping[]
  readonly orphans: readonly OrphanMapping[]
  readonly sharedGlossary: readonly GlossaryEntry[]
}

export async function classifyDocs(input: ClassifyInput): Promise<ClassifyOutput>
```

**Filosoficos excluidos do enum:** `COMPOUND_ENGINEERING.md` e `PRODUCT_SENSE.md` NUNCA aparecem como `HarnessCategory` — garantia em type-level.
**Orphan rule:** `confidence === 'low'` OU zero matches → target `docs/references/{basename}`.
**Glossario:** termos com >= 3 ocorrencias totais, >= 4 chars, sem stopwords PT/EN.

### API publica final de `skills/init/lib/discovery-store.ts`

```typescript
export type DiscoveryArtifactName =
  | 'secrets-scan-result' | 'discovered-docs' | 'classification-result'

export type DiscoveryWriteOptions = {
  readonly noWrite?: boolean  // quando true, retorna sem escrever (dry-run hook, Plano 05)
}

export function discoveryArtifactPath(cwd: string, name: DiscoveryArtifactName): string
export async function writeDiscoveryArtifact<T>(cwd: string, name: DiscoveryArtifactName, data: T, opts?: DiscoveryWriteOptions): Promise<void>
export async function readDiscoveryArtifact<T>(cwd: string, name: DiscoveryArtifactName): Promise<T | null>
```

Path canonico: `{cwd}/.anti-vibe/discovery/{name}.json`

### Posicao dos Steps no Registry (CONFIRMADA)

Registry apos Plano 03:
```
[0] detectLegacyStep
[1] reuseDiscoveryStep       ('reuse-discovery')
[2] secretsScanStep          ('06-secrets-scan')   ← Plano 03 fase-02
[3] discoverExistingDocsStep ('07-discover-existing-docs') ← Plano 03 fase-04
[4] classifyBlocksHybridStep ('08-classify-blocks-hybrid') ← Plano 03 fase-06
[5] migrate0ParseDryRunStep  ('migrate-0-parse-dry-run')
... resto inalterado
```

Invariante testada: Steps 06 → 07 → 08 consecutivos, apos `reuse-discovery` e antes de `migrate-0-parse-dry-run`.

### Paths Canonicos dos 3 Artefatos JSON

- `.anti-vibe/discovery/secrets-scan-result.json`
- `.anti-vibe/discovery/discovered-docs.json`
- `.anti-vibe/discovery/classification-result.json`

### Estado do LLM Refinement (DEFERIDO)

`pendingLlmRefinement: true` em qualquer `DocMapping` com `confidence !== 'high'`.
O Step 09 (Plano 04 fase-02 propose-merge-batch) decide se renderiza `skills/init/assets/snippets/classifier-llm-prompt.md` e invoca subagente LLM.
Em v6.4.0, a heuristica eh autoritativa por default.

### Estado do Audit Log (STUB)

`logAudit` ainda eh stub — `summary` carrega o `subagent_id` literal como proxy:
- `init-secrets-scan` (Step 06)
- `init-discover-existing-docs` (Step 07)
- `init-classify-blocks` (Step 08)

Plano 06 fase-01 substitui pelo `AuditLogWriter.append` canonico.

### Shapes Canonicos dos Resultados Persistidos (para Plano 04)

**secrets-scan-result.json:**
```typescript
{
  subagent_id: 'init-secrets-scan',
  scannedCount: number,
  blockedFiles: Array<{ relativePath: string, matches: SecretMatch[] }>,
  durationMs: number
}
```

**discovered-docs.json:**
```typescript
{
  subagent_id: 'init-discover-existing-docs',
  docs: Array<DiscoveredDoc & { blockedBySecret: boolean }>,
  blockedCount: number,
  durationMs: number
}
```

**classification-result.json:**
```typescript
{
  subagent_id: 'init-classify-blocks',
  mappings: DocMapping[],
  orphans: OrphanMapping[],
  sharedGlossary: GlossaryEntry[],
  pendingLlmRefinement: string[],  // paths com confidence !== 'high'
  skippedDueToSecret: string[],    // paths com blockedBySecret=true
  durationMs: number
}
```

---

<!-- Atualizado automaticamente durante execucao -->
