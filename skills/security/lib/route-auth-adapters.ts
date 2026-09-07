// 2026-09-06 (Luiz/dev): Plano 04 DP-8/DP-12 — PRD RF-06 (detectStack escolhe; monorepo roda varios).
// Registro por StackId; ausencia de entrada ou `applies` falso vira `skipped` COM razao — nunca silencio (RF-04).
import type { DetectedStack, StackId } from '../../init/lib/detect-stack'
import type { RouteAdapter } from './route-auth-matrix.types'
import { nextjsAdapter } from './route-auth-nextjs'
import { railsAdapter } from './route-auth-rails'
import { expressAdapter, hasExpress } from './route-auth-express'
import { pythonAdapter } from './route-auth-python'

export type KnownStack = Exclude<StackId, 'unknown'>
export type AdapterEntry = { adapter: RouteAdapter; applies: (targetDir: string) => boolean }

export const ADAPTERS: Readonly<Partial<Record<KnownStack, AdapterEntry>>> = {
  nextjs: { adapter: nextjsAdapter, applies: () => true },
  rails: { adapter: railsAdapter, applies: () => true },
  'node-ts': { adapter: expressAdapter, applies: hasExpress },   // DP-12
  python: { adapter: pythonAdapter, applies: () => true },       // dialeto decidido por import (DP-6)
}

// Hash map, nao switch. Toda stack conhecida sem adaptador aplicavel tem uma frase aqui.
export const SKIP_REASONS: Readonly<Record<string, string>> = {
  react: 'react: SPA sem rotas de servidor nesta versao',
  laravel: 'laravel: sem adaptador nesta versao',
  'node-ts': 'node-ts sem express: Fastify/Koa/Hono/NestJS fora do escopo desta versao',
  none: 'nenhuma stack detectada — sem manifest reconhecido na raiz (DP-13: monorepo por subdiretorio fora desta versao)',
}

export type SelectedAdapter = { stack: KnownStack; adapter: RouteAdapter }
export type SkippedStack = { stack: string; reason: string }

export function selectAdapters(detected: DetectedStack, targetDir: string): { selected: SelectedAdapter[]; skipped: SkippedStack[] } {
  if (detected.primary === null) return { selected: [], skipped: [{ stack: 'none', reason: SKIP_REASONS.none ?? 'nenhuma stack detectada' }] }
  const ordered = [...new Set([detected.primary, ...detected.secondary])]
  const selected: SelectedAdapter[] = []
  const skipped: SkippedStack[] = []
  for (const stack of ordered) {
    const entry = ADAPTERS[stack]   // G5: `AdapterEntry | undefined`
    if (entry !== undefined && entry.applies(targetDir)) { selected.push({ stack, adapter: entry.adapter }); continue }
    skipped.push({ stack, reason: SKIP_REASONS[stack] ?? `${stack}: sem adaptador nesta versao` })
  }
  return { selected, skipped }
}
