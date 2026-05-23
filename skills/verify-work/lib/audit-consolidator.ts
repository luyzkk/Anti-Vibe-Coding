// 2026-05-14 (Luiz/dev): consolidador para verify-work — fase-03 plano04
// Promise.allSettled (G1) + ordenacao determinista por agent name (G-P04-01)
// + deduplicacao por file:line:description (BUG-P04: category nao existe no schema real — usar description)
// Severidade lowercase ingles conforme auditVariant em agents/_contract/v1.schema.json (BUG-P03-01)

import { parseContract, withRetry } from '../../lib/subagent-contract'
import type { AuditContract, IssueSeverity } from '../../lib/subagent-contract'

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

export type AuditInvocation = {
  /** Nome canonico do auditor, ex: "security-auditor" */
  agent: string
  rawOutput: string
}

export type Finding = {
  agent: string
  severity: IssueSeverity
  description: string
  file?: string
  line?: number
}

export type AuditConsolidation = {
  /** Findings deduplicados e ordenados por severidade decrescente */
  findings: Finding[]
  /** Reasoning livre por agent (agent name → reasoning) — alimenta secao "Reasoning dos auditores" */
  reasoningByAgent: Record<string, string>
  /** Agents que nao puderam ser consolidados (blocked / kind mismatch / parse error) */
  incomplete: Array<{ agent: string; reason: string }>
  /** domain_status por agent — alimenta linha de Summary no relatorio */
  domainStatuses: Record<string, string | undefined>
}

// ---------------------------------------------------------------------------
// Ranking de severidade para dedup e ordenacao
// 2026-05-14 (Luiz/dev): lowercase ingles conforme IssueSeverity do schema real
// ---------------------------------------------------------------------------

const SEV_RANK: Record<IssueSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function dedupKey(f: { file?: string; line?: number; description: string }): string {
  // 2026-05-14 (Luiz/dev): dedup por file:line:description — category nao existe no schema (BUG-P04-02)
  return `${f.file ?? ''}|${f.line ?? ''}|${f.description}`
}

// ---------------------------------------------------------------------------
// consolidateAudits — sincronico, recebe raws já coletados
// 2026-05-14 (Luiz/dev): sync puro para facilitar teste com fixtures JSON (sem I/O)
// ---------------------------------------------------------------------------

export function consolidateAudits(invocations: AuditInvocation[]): AuditConsolidation {
  // Ordem alfabetica de agent — snapshot determinista (G-P04-01)
  const sorted = [...invocations].sort((a, b) => a.agent.localeCompare(b.agent))

  const allFindings: Finding[] = []
  const reasoningByAgent: Record<string, string> = {}
  const incomplete: AuditConsolidation['incomplete'] = []
  const domainStatuses: Record<string, string | undefined> = {}

  for (const inv of sorted) {
    // 1. Parse tolerante (strips code fences, trailing commas — G1)
    const validation = parseContract(inv.rawOutput)

    if (!validation.valid || !validation.contract) {
      // Parse error ou contract invalido — degradacao graciosa, nao derruba pipeline
      const errorMsg = validation.errors.map((e) => e.message).join('; ')
      incomplete.push({ agent: inv.agent, reason: `parse/validation error: ${errorMsg}` })
      continue
    }

    const contract = validation.contract

    // 2. Filtrar por kind: audit (CA-04 — handler rejeita outros kinds)
    if (contract.kind !== 'audit') {
      incomplete.push({
        agent: inv.agent,
        reason: `expected kind=audit, got kind=${contract.kind}`,
      })
      continue
    }

    // 3. Lifecycle check — blocked/needs_human nao alimentam findings (G-P04-03)
    if (contract.status === 'blocked' || contract.status === 'needs_human') {
      incomplete.push({
        agent: inv.agent,
        reason: `${contract.status}: ${contract.reasoning}`,
      })
      continue
    }

    // 4. Cast seguro — kind=audit ja validado pelo ajv schema
    const auditContract = contract as AuditContract

    // 5. Capturar reasoning (sempre presente — CA-02 ja validado)
    reasoningByAgent[inv.agent] = auditContract.reasoning

    // 6. Capturar domain_status
    domainStatuses[inv.agent] = auditContract.payload.domain_status

    // 7. Coletar issues com agent provenance
    for (const issue of auditContract.payload.issues) {
      const finding: Finding = {
        agent: inv.agent,
        severity: issue.severity,
        description: issue.description,
        ...(issue.file !== undefined ? { file: issue.file } : {}),
        ...(issue.line !== undefined ? { line: issue.line } : {}),
      }
      allFindings.push(finding)
    }
  }

  // 8. Deduplicar: manter severidade mais alta por chave file:line:description
  // 2026-05-14 (Luiz/dev): dedup opera em objetos JSON, nao markdown (fase-03 objetivo)
  const dedupMap = new Map<string, Finding>()
  for (const finding of allFindings) {
    const key = dedupKey(finding)
    const existing = dedupMap.get(key)
    if (!existing || SEV_RANK[finding.severity] > SEV_RANK[existing.severity]) {
      dedupMap.set(key, finding)
    }
  }

  // 9. Ordenar por severidade decrescente (critical primeiro)
  const findings = Array.from(dedupMap.values()).sort(
    (a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity],
  )

  return { findings, reasoningByAgent, incomplete, domainStatuses }
}

// ---------------------------------------------------------------------------
// invokeAndConsolidate — assincronico, usa Promise.allSettled + withRetry
// 2026-05-14 (Luiz/dev): Promise.allSettled isola falhas individuais — 1 agent caindo nao derruba pipeline (G1)
// withRetry por invocacao: max=1 por agente (D9)
// ---------------------------------------------------------------------------

export type InvocationFn = {
  agent: string
  invoke: () => Promise<string>
}

export async function invokeAndConsolidate(
  invocationFns: InvocationFn[],
): Promise<AuditConsolidation> {
  // Promise.allSettled: 1 agent falhar nao cancela os outros (G1)
  const settled = await Promise.allSettled(
    invocationFns.map(async (fn): Promise<AuditInvocation> => {
      // withRetry semantico: status=needs_retry dispara novo invoke (D9)
      // Wrap: invoke retorna rawOutput (string), precisamos de SubagentContractBase para withRetry
      // Pattern: invocar, parsear para withRetry, re-serializar para consolidateAudits (sync puro)
      // Trade-off aceito: double-parse mantém consolidateAudits testavel com fixtures (nota de design fase-03)
      const parsedContract = await withRetry(
        async () => {
          const raw = await fn.invoke()
          const validation = parseContract(raw)
          if (!validation.valid || !validation.contract) {
            // withRetry precisa de um contrato — emitir needs_retry para tentar novamente
            // 2026-05-14 (Luiz/dev): validation failure gera needs_retry sintetico para withRetry escalar
            // 2026-05-23 (Luiz/dev): contrato sintetico interno — usa v1 porque e emitido pelo orquestrador
            // (nao por agente externo). Agentes externos emitem v2.0.0; este objeto e sinal de controle interno.
            return {
              contract_version: '1.0' as const,
              agent: fn.agent,
              kind: 'audit' as const,
              status: 'needs_retry' as const,
              reasoning: `parse failed: ${validation.errors.map((e) => e.message).join('; ')}`,
              payload: { issues: [] },
            }
          }
          return validation.contract
        },
        { max: 1 },
      )

      return {
        agent: fn.agent,
        rawOutput: JSON.stringify(parsedContract),
      }
    }),
  )

  // Coletar apenas fulfilled — rejected ficam fora (Promise.allSettled nao gera rejected por throw interno)
  // Nota: se invoke() lanca erro nao capturado, settled[i].status === 'rejected'
  const invocations: AuditInvocation[] = []
  const incompleteFromRejected: Array<{ agent: string; reason: string }> = []

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    const fn = invocationFns[i]
    if (!result || !fn) continue

    if (result.status === 'fulfilled') {
      invocations.push(result.value)
    } else {
      // Promise rejected — invoke() lancou excecao
      incompleteFromRejected.push({
        agent: fn.agent,
        reason: `invoke threw: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      })
    }
  }

  const consolidation = consolidateAudits(invocations)

  // Mesclar incompletos de rejected com incompletos de consolidateAudits
  return {
    ...consolidation,
    incomplete: [...consolidation.incomplete, ...incompleteFromRejected],
  }
}
