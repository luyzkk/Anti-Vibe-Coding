// 2026-05-14 (Luiz/dev): consolidador para design-twice — PRD §Decisoes #4 (kind: proposal)
// Promise.allSettled (NAO Promise.all) porque 1 design-explorer falhar nao deve derrubar os 3 — G1.
// Usa parseContract (nao parseAndDispatch) porque precisamos do contrato tipado direto, sem handler dispatch.

import { parseContract } from '../lib/subagent-contract'
import type { ProposalContract, LifecycleStatus } from '../lib/subagent-contract'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export type DesignTwiceInvocation = {
  /** A|B|C|D|E — ate 5 propostas (PRD limit) */
  letter: 'A' | 'B' | 'C' | 'D' | 'E'
  philosophy: string
  /** String JSON crua retornada pelo subagente design-explorer */
  rawOutput: string
}

/** Shape canonico de payload.proposal — Plano 02 fase-02 BUG-P02-01 (nao usar complexity/effort/pros/cons/risks) */
export type ProposalPayload = ProposalContract['payload']['proposal']

export type ConsolidatedProposal = {
  letter: string
  philosophy: string
  status: LifecycleStatus
  /** null se status != complete ou se rawOutput invalido */
  proposal: ProposalPayload | null
  reasoning: string
  humanReadable: string | undefined
}

// ---------------------------------------------------------------------------
// consolidateProposals — funcao principal exportada
// ---------------------------------------------------------------------------

/**
 * Consolida N invocacoes de design-explorer em array ordenado por letter.
 *
 * Ordem deterministica por letter (G-P04-01): paralelismo pode retornar fora de ordem.
 * Throws se rawOutput de qualquer invocacao nao for kind: proposal ou JSON invalido.
 * Se status != complete: proposal = null (graceful degradation — D4 + Passo 4 da fase).
 *
 * 2026-05-14 (Luiz/dev): funcao sincrona — parsing/validacao e sincrono em parseContract.
 * A camada async (Promise.allSettled) fica no orquestrador que chama invokeDesignExplorer.
 */
export function consolidateProposals(
  invocations: DesignTwiceInvocation[],
): ConsolidatedProposal[] {
  // 2026-05-14 (Luiz/dev): ordem deterministica por letter — G-P04-01
  const sorted = [...invocations].sort((a, b) => a.letter.localeCompare(b.letter))

  return sorted.map((inv) => {
    const validation = parseContract(inv.rawOutput)

    if (!validation.valid || !validation.contract) {
      // 2026-05-14 (Luiz/dev): JSON invalido ou falha de schema = throw (nao silenciar)
      const errorMsg = validation.errors.map((e) => e.message).join('; ')
      throw new Error(
        `design-twice: rawOutput de ${inv.letter} invalido — ${errorMsg}`,
      )
    }

    const contract = validation.contract

    if (contract.kind !== 'proposal') {
      // 2026-05-14 (Luiz/dev): kind errado = bug no agente — D4 (handler rejeita kind != proposal)
      throw new Error(
        `design-twice esperava kind: proposal de ${inv.letter}, recebeu ${contract.kind}`,
      )
    }

    // 2026-05-14 (Luiz/dev): TypeScript nao estreita union por kind ainda apos validacao de runtime —
    // usar type assertion segura apos confirmacao de kind === 'proposal' acima.
    const proposalContract = contract as ProposalContract

    return {
      letter: inv.letter,
      philosophy: inv.philosophy,
      status: proposalContract.status,
      // 2026-05-14 (Luiz/dev): proposta null se nao completo — Passo 4 (graceful degradation)
      proposal: proposalContract.status === 'complete' ? proposalContract.payload.proposal : null,
      reasoning: proposalContract.reasoning,
      humanReadable: proposalContract.human_readable,
    }
  })
}
