<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado nesta fase precisam de linhagem
(autor + data + razão). Ver fase-01 para exemplo.
-->

# Fase 03: verify-work consome handler genérico (até 8 auditores paralelos)

**Plano:** 04 — Orquestradores
**Sizing:** 2h
**Depende de:** fase-02 (padrao de consolidacao paralela validado em 3 invocacoes)
**Visual:** false

---

## O que esta fase entrega

`verify-work` invocando ate 8 auditores em paralelo (`security-auditor`, `react-auditor`, `solid-auditor`, `code-smell-detector`, `tdd-verifier` + condicionalmente `api-auditor`, `database-analyzer`, `infrastructure-auditor`) e consumindo todos via `parseAndDispatch()` filtrando por `kind: "audit"`. Consolida `payload.issues[]` em tabela unica de findings + secao **nova** "Reasoning dos auditores" com `reasoning[]` agregado por agent. Deduplicacao por finding (mesmo issue em 2+ agents = manter o mais severo) opera sobre objetos JSON, nao markdown.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/verify-work/SKILL.md` | Modify | Step 2 (Audit Pipeline) atualiza Step 2f (Coletar Resultados) para usar `parseAndDispatch()`; Step 3 (Compilar Relatorio) deriva severidade de `payload.issues[].severity` + `payload.domain_status`; adiciona secao "Reasoning dos auditores" |
| `skills/verify-work/lib/audit-consolidator.ts` (Create) | Create | Modulo TS que recebe array de outputs de subagentes (crus), parseia cada um, consolida `issues[]` deduplicados + `reasoning[]` por agent, retorna estrutura tipada para o relatorio |
| `skills/verify-work/lib/audit-consolidator.test.ts` (Create) | Create | Testes: 5 auditores paralelos com fixtures variadas; dedup quando 2 agents reportam mesmo file:line; ordem determinista por nome de agente; 1 agent blocked nao derruba consolidacao |
| `skills/verify-work/SKILL.md` (template do relatorio) | Modify | Adicionar secao "### Reasoning dos auditores" entre "Test Quality Assessment" e "Recommendations" |

**Nota A4:** `verify-work` SKILL.md confirma 5 auditores fixos (tdd, security, code-smell) + 4 condicionais (api, react, db, infra, solid). Total `kind: audit` ate 8. Todos consumidos via mesmo handler — handler nao sabe nomes especificos, apenas le `kind`.

---

## Implementacao

### Passo 1: Criar `skills/verify-work/lib/audit-consolidator.ts`

```typescript
// 2026-05-14 (Luiz/dev): consolidador para verify-work — PRD §Decisões #4 (kind: audit)
// Promise.allSettled (G1) + ordenacao determinista por agent name (G-P04-01)
// + deduplicacao por file:line:category (G3 — consolidacao multi-agent).

import { parseAndDispatch, withRetry } from '../../lib/subagent-contract'
import type { SubagentContractV1 } from '../../lib/subagent-contract-types'

export type AuditInvocation = {
  agent: string // nome canonico do auditor, ex: "security-auditor"
  rawOutput: string
}

export type Finding = {
  agent: string
  severity: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO'
  category: string
  description: string
  file?: string
  line?: number
}

export type AuditConsolidation = {
  findings: Finding[] // deduplicados e ordenados por severidade
  reasoningByAgent: Record<string, string> // agent name -> reasoning livre
  incomplete: Array<{ agent: string; reason: string }> // status blocked / parse error
  domainStatuses: Record<string, string | undefined> // agent -> payload.domain_status
}

export function consolidateAudits(invocations: AuditInvocation[]): AuditConsolidation {
  // 2026-05-14 (Luiz/dev): ordem alfabetica de agent — snapshot determinista (G-P04-01)
  const sorted = [...invocations].sort((a, b) => a.agent.localeCompare(b.agent))

  const findings: Finding[] = []
  const reasoningByAgent: Record<string, string> = {}
  const incomplete: AuditConsolidation['incomplete'] = []
  const domainStatuses: Record<string, string | undefined> = {}

  for (const inv of sorted) {
    let parsed: SubagentContractV1
    try {
      parsed = parseAndDispatch(inv.rawOutput)
    } catch (err) {
      // 2026-05-14 (Luiz/dev): parse error nao derruba audit pipeline — degradacao graciosa
      incomplete.push({ agent: inv.agent, reason: `unparseable: ${(err as Error).message}` })
      continue
    }

    if (parsed.kind !== 'audit') {
      incomplete.push({ agent: inv.agent, reason: `expected kind=audit, got ${parsed.kind}` })
      continue
    }

    // 2026-05-14 (Luiz/dev): G-P04-03 — blocked != complete+critical; nao consumir payload
    if (parsed.status === 'blocked' || parsed.status === 'needs_human') {
      incomplete.push({ agent: inv.agent, reason: `${parsed.status}: ${parsed.reasoning}` })
      continue
    }

    reasoningByAgent[inv.agent] = parsed.reasoning
    domainStatuses[inv.agent] =
      typeof parsed.payload === 'object' && parsed.payload !== null
        ? (parsed.payload as Record<string, unknown>).domain_status as string | undefined
        : undefined

    const issues = (parsed.payload as { issues?: Finding[] }).issues ?? []
    for (const issue of issues) {
      findings.push({ ...issue, agent: inv.agent })
    }
  }

  // 2026-05-14 (Luiz/dev): dedup por (file, line, category) — manter severidade mais alta
  // (Step 2f original do verify-work — agora opera sobre objetos JSON, nao markdown)
  const dedupKey = (f: Finding) => `${f.file ?? ''}|${f.line ?? ''}|${f.category}`
  const sevRank = { CRITICO: 4, ALTO: 3, MEDIO: 2, BAIXO: 1 } as const
  const map = new Map<string, Finding>()
  for (const f of findings) {
    const existing = map.get(dedupKey(f))
    if (!existing || sevRank[f.severity] > sevRank[existing.severity]) {
      map.set(dedupKey(f), f)
    }
  }

  const ordered = Array.from(map.values()).sort(
    (a, b) => sevRank[b.severity] - sevRank[a.severity],
  )

  return { findings: ordered, reasoningByAgent, incomplete, domainStatuses }
}

export async function invokeAndConsolidate(
  invocationFns: Array<{ agent: string; invoke: () => Promise<string> }>,
): Promise<AuditConsolidation> {
  // 2026-05-14 (Luiz/dev): Promise.allSettled + withRetry por agente — D9 + G1
  const settled = await Promise.allSettled(
    invocationFns.map(async (f) => ({
      agent: f.agent,
      rawOutput: await withRetry(async () => {
        const raw = await f.invoke()
        return parseAndDispatch(raw)
      }).then((parsed) => JSON.stringify(parsed)),
    })),
  )

  const invocations: AuditInvocation[] = settled
    .filter((s): s is PromiseFulfilledResult<AuditInvocation> => s.status === 'fulfilled')
    .map((s) => s.value)

  return consolidateAudits(invocations)
}
```

**Nota de design:** `invokeAndConsolidate` faz double-parse (parseAndDispatch → stringify → parseAndDispatch). Trade-off aceito para manter `consolidateAudits` puro (recebe raw strings) — facilita teste com fixtures JSON salvas. Otimizacao para v6.2 se virar gargalo.

### Passo 2: Atualizar `skills/verify-work/SKILL.md` Step 2f

Substituir:
```
- Aguardar todos os agents completarem
- Se agent falha (timeout, erro) → registrar como "audit incomplete: {agent}"
- Consolidar todos os findings em lista unica
- Deduplicar: se mesmo issue aparece em 2+ agents → manter o mais severo
```

Por:
```
- Chamar invokeAndConsolidate(invocationFns) de skills/verify-work/lib/audit-consolidator.ts
- O modulo cuida de:
  * Promise.allSettled (1 agent falhar nao derruba pipeline — G1)
  * withRetry(invoke, {max: 1}) para status: "needs_retry" — D9
  * parseAndDispatch para output cru (rejeita kind != audit, contract_version != 1.0)
  * Deduplicacao por (file, line, category) mantendo severidade mais alta
  * Captura de incomplete[] (blocked / needs_human / parse error)
  * Reasoning preservado por agent (alimenta nova secao do relatorio)
- Output tipado: { findings, reasoningByAgent, incomplete, domainStatuses }
- Prosseguir para Step 3 (Compilar Relatorio)
```

### Passo 3: Atualizar template do relatorio (Step 3)

Adicionar secao **antes** de "### Recommendations":

```markdown
### Reasoning dos auditores

{Para cada agent em reasoningByAgent (ordem alfabetica):}
**{agent}**: {reasoning}

{Para cada incomplete entry:}
**{agent}** (incomplete): {reason}
```

**Por que aqui:** PRD §Fluxos por Ator — "Recebe relatorio consolidado com seção 'Reasoning dos auditores' — frases livres dos subagentes, separadas das findings estruturadas." Esta e a parte do contrato que destrava granularity — agentes podem dizer coisas fora do schema.

### Passo 4: Tratar `domain_status` por auditor no Summary

No bloco "### Summary" do relatorio, hoje aparece linha por linha (`Security: clean | warnings | issues`). Mudar fonte: derivar de `domainStatuses[agent]`:

```
- Security: {se domainStatuses["security-auditor"] === "clean"} ✅ clean
            {se "issues_found"} ⚠️ issues found
            {se "critical"} ❌ critical
            {se incomplete} ⏸ incomplete
- React: {analogo, se "react-auditor" rodou}
...
```

### Passo 5: Telemetria preservada (G-P04-07)

Bloco `writeTelemetryStart` / `writeTelemetryEnd` em SKILL.md linhas ~10-57 e ~545-565 — preservar intactos.

---

## Gotchas

- **G1 do plano (JSON malformado):** Critico com 8 invocacoes paralelas. `Promise.allSettled` isola; `parseAndDispatch` (com retry mecanico do Plano 01 fase-04) tolera whitespace/trailing-comma; ainda assim 1 agent pode acabar em `incomplete[]`. Relatorio mostra isso claramente.
- **G-P04-01 (paralelismo fora de ordem):** Aplicado — `sort by agent name alfabetico` em `consolidateAudits`. Mesma feature audita 2x = mesmo snapshot.
- **G-P04-03 (status blocked != domain_status critical):** Aplicado — agents com `status: blocked` nao consolidam payload (vao para `incomplete[]`). Apenas `status: complete` + `payload.domain_status` alimentam findings + Summary.
- **G2 (lifecycle vs domain_status — herdado):** `payload.domain_status: "critical"` mapeia para Summary "❌ critical" mas NAO bloqueia pipeline; verify-work segue rodando outros auditores e gerando relatorio. Apenas dev decide se aborta no Step 4 (Apresentar ao Dev).
- **G3 (reasoning 20/50 — herdado):** Handler ja rejeitou <20. Para 20-49 (warning), exibir o reasoning normalmente na secao nova. Decisao: nao filtrar visualmente — mostrar e deixar dev notar prompts subotimos.
- **G-P04-07 (telemetria intacta):** Confirmar no diff.
- **Local — Test Quality Audit (Step 2e) NAO migra para handler:** Este sub-step roda heuristicas TS internas (cobertura, weak tests, hallucinations, mutation), nao invoca subagentes. Permanece como esta. Apenas Step 2b (auditores fixos) e Step 2c (domain-specific) sao migrados.
- **Local — fresh-context review (final da SKILL.md):** Spawnado **apos** o relatorio principal. Tambem deve emitir contrato v1 (kind: audit ou kind: verification?). Decisao: **kind: audit** com `reasoning` livre — pergunta-resposta nao tem schema rigido de issues. Plano 03 ja migrou se houver agente dedicado; se for `general-purpose` direto, a fase-03 deste plano apenas garante que o prompt instrua contrato v1 (anomalia a registrar em MEMORY).

---

## Verificacao

### TDD

- [ ] **RED:** `skills/verify-work/lib/audit-consolidator.test.ts` test "consolidateAudits dedupe por file:line:category, mantem severidade mais alta". Fixture com 2 agents reportando `parser.ts:42:Performance` (1 com MEDIO, 1 com CRITICO). Esperar 1 finding CRITICO. Implementacao ausente → ReferenceError.
  - Comando: `bun test skills/verify-work/lib/audit-consolidator.test.ts -t "dedupe"`
  - Resultado RED: `ReferenceError: consolidateAudits is not defined`.

- [ ] **GREEN:** Implementar `consolidateAudits` conforme Passo 1; teste passa.

- [ ] **RED 2:** Test "ordem alfabetica de agentes apos shuffle".

- [ ] **GREEN 2:** Implementacao do Passo 1 ja ordena.

- [ ] **RED 3:** Test "agent com status blocked vai para incomplete[], nao quebra outros".

- [ ] **GREEN 3:** Implementacao trata.

### Checklist

- [ ] `skills/verify-work/lib/audit-consolidator.ts` exporta `consolidateAudits` e `invokeAndConsolidate`.
- [ ] `skills/verify-work/SKILL.md` Step 2f cita `invokeAndConsolidate` e remove referencia a parsing markdown manual.
- [ ] Template do relatorio inclui secao "### Reasoning dos auditores" entre "Test Quality Assessment" e "Recommendations".
- [ ] Grep assertion: `grep -rn "parse.*Status:\|enum.*OPTIMIZED\|VULNERABILITIES_FOUND" skills/verify-work/` retorna 0.
- [ ] CA-06: simular adicao de auditor novo (`agents/foo-auditor.md` com `kind: audit` + fixture) — teste de integracao mostra que `consolidateAudits` ja o consome sem mudar codigo da skill.
- [ ] Test Quality Audit (Step 2e) inalterado (continua heuristica interna).
- [ ] Telemetria preservada.
- [ ] Testes passam: `bun run test`
- [ ] Lint: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/verify-work/lib/audit-consolidator.test.ts` retorna 5+ testes verdes (dedupe, ordem, incomplete, kind-mismatch, parse-error degradacao).
- `bun test skills/verify-work/` (suite completa) verde.
- Teste CA-06: adicionar fixture mock `foo-auditor` com `kind: audit` no array de invocacoes → finding consolidado aparece em `findings[]` sem mudar `audit-consolidator.ts`.
- `grep -rn "Status:.*FOUND\|enum.*compliant" skills/verify-work/SKILL.md skills/verify-work/lib/` retorna 0.

**Por humano:**
- Relatorio gerado mostra secao "Reasoning dos auditores" legivel (frases curtas livres) separada da tabela de findings.

**Decisoes do PRD aplicadas:**
- **D2** (lifecycle vs domain_status): Summary deriva de `payload.domain_status`; lifecycle decide bloqueio (apenas `blocked`).
- **D3** (reasoning obrigatorio + livre): secao nova do relatorio destaca reasoning — destrava granularity.
- **D4** (kind: audit): handler rejeita outros kinds para fins de consolidacao.
- **D5** (`payload.issues[]` por kind=audit): consumer le diretamente.
- **D9** (retry): `withRetry` aplicado por invocacao paralela.
- **CA-04** (handler unico por kind): atendido.
- **CA-06** (auditor novo sem mudanca de codigo): atendido — teste de integracao prova.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
