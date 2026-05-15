// 2026-05-14 (Luiz/dev): Reconciler orchestrator — slot-a-slot, emite VerificationContract

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseContract } from '../../lib/subagent-contract'
import type { VerificationContract } from '../../lib/subagent-contract'
import type { TemplateEntry } from './template-manifest'
import type { SemanticInventory } from './migration-planner'
import type { SubagentInvoker } from './migration-planner'
import type { AuditLogWriter } from './audit-log'
import { writeMigrationPlan } from './plan-writer'

export type ReconcilerOptions = {
  logger?: AuditLogWriter
  generateEmptySlotPlans?: boolean
  slotsPerInvocation?: number
}

export type ReconcilerResult = {
  planPaths: string[]
  failedSlots: string[]
  slotDecisions: Array<{
    slotPath: string
    domainStatus: string
    planPath?: string
    error?: string
  }>
}

function isVerificationPayload(
  v: unknown,
): v is { checks: unknown[]; domain_status?: string; migration_plan_content?: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'checks' in v &&
    Array.isArray((v as Record<string, unknown>)['checks'])
  )
}

export async function runReconciler(
  semanticInventory: SemanticInventory,
  templateManifest: TemplateEntry[],
  targetDir: string,
  invoker: SubagentInvoker,
  opts: ReconcilerOptions = {},
): Promise<ReconcilerResult> {
  const runId = semanticInventory.run_id
  const slotsPerInvocation = opts.slotsPerInvocation ?? 5
  const generateEmptySlotPlans = opts.generateEmptySlotPlans ?? true

  const promptPath = path.join(import.meta.dir, 'prompts/reconciler.md')
  const reconcilerPrompt = await fs.readFile(promptPath, 'utf-8')

  const planPaths: string[] = []
  const failedSlots: string[] = []
  const slotDecisions: ReconcilerResult['slotDecisions'] = []

  for (let i = 0; i < templateManifest.length; i += slotsPerInvocation) {
    const slotBatch = templateManifest.slice(i, i + slotsPerInvocation)

    for (const slot of slotBatch) {
      try {
        const relevantEntries = semanticInventory.entries.filter(
          (e) => e.slot_match === slot.dst || e.confidence > 0.5,
        )

        const inputJson = JSON.stringify(
          {
            run_id: runId,
            current_slot: slot.dst,
            slot_category: slot.category,
            slot_description: slot.src,
            relevant_semantic_entries: relevantEntries,
          },
          null,
          2,
        )

        const rawOutput = await invoker(
          reconcilerPrompt + '\n\n## Input\n\n```json\n' + inputJson + '\n```',
          {},
        )

        const result = parseContract(rawOutput)
        if (!result.valid || !result.contract) {
          throw new Error(
            `Reconciler contract invalid: ${result.errors.map((e) => e.message).join('; ')}`,
          )
        }
        if (result.contract.kind !== 'verification') {
          throw new Error(
            `Reconciler expected kind:verification, got ${result.contract.kind}`,
          )
        }

        const contract = result.contract as VerificationContract
        const payload = contract.payload

        if (!isVerificationPayload(payload)) {
          throw new Error('Reconciler payload missing checks array')
        }

        const domainStatus =
          ((payload as Record<string, unknown>)['domain_status'] as string | undefined) ??
          'unknown'
        const planContent = (payload as Record<string, unknown>)[
          'migration_plan_content'
        ] as string | undefined

        if (opts.logger) {
          await opts.logger.append({
            subagent_id: 'reconciler',
            input_paths: [slot.dst],
            output_struct: { domain_status: domainStatus, has_plan: !!planContent },
            duration_ms: 0,
            retry_count: 0,
          })
        }

        if (planContent && (domainStatus !== 'empty' || generateEmptySlotPlans)) {
          const written = await writeMigrationPlan(
            targetDir,
            slot.dst,
            domainStatus,
            planContent,
          )
          planPaths.push(written.absolutePath)
          slotDecisions.push({
            slotPath: slot.dst,
            domainStatus,
            planPath: written.absolutePath,
          })
        } else {
          slotDecisions.push({ slotPath: slot.dst, domainStatus })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failedSlots.push(slot.dst)
        slotDecisions.push({ slotPath: slot.dst, domainStatus: 'error', error: message })

        if (opts.logger) {
          await opts.logger.append({
            subagent_id: 'reconciler',
            input_paths: [slot.dst],
            output_struct: null,
            duration_ms: 0,
            retry_count: 0,
            error: message,
          })
        }
      }
    }
  }

  return { planPaths, failedSlots, slotDecisions }
}
