// skills/_shared/legacy-manifest-schema.ts
// 2026-05-21 (Luiz/dev): Schema Zod compartilhado entre init (writer) e execute-plan (reader).
// DR-5 do PLAN.md init-refactor-v7. Schema espelha DT-06 do PRD (linha 230-273).
// Mudança em qualquer campo aqui quebra ambos os lados tipados em compile-time.

import { z } from 'zod'

// 2026-05-21 (Luiz/dev): tipos de entrada definidos no PRD D6/D7/D8.
// 'planning' é o único que tem action 'moved'; demais são 'reference-only' ou 'preserved'.
export const LegacyEntryTypeSchema = z.enum([
  'planning',
  'compound',
  'lessons',
  'decisions',
  'claude-md',
  'knowledge-legacy',
  'rules',
])

export type LegacyEntryType = z.infer<typeof LegacyEntryTypeSchema>

// 2026-05-21 (Luiz/dev): action enum derivado dos exemplos do DT-06.
// 'moved' = init moveu (só planning). 'reference-only' = init não tocou; execute-plan lê.
// 'preserved' = init NÃO modificou (CLAUDE.md, CA-02 do PRD).
export const LegacyActionSchema = z.enum(['moved', 'reference-only', 'preserved'])

export type LegacyAction = z.infer<typeof LegacyActionSchema>

// 2026-05-21 (Luiz/dev): entrada individual do array `legacy[]` do manifest.
// `found: true` sempre — entradas com `found: false` não são adicionadas ao array.
// `lines` opcional; populado apenas para `type: 'claude-md'`.
// `migratedTo` opcional; populado apenas para `action: 'moved'`.
// `note` opcional; texto livre orientador (ex: "Importar para docs/compound/").
export const LegacyEntrySchema = z.object({
  type: LegacyEntryTypeSchema,
  found: z.literal(true),
  sourcePath: z.string().min(1),
  action: LegacyActionSchema,
  migratedTo: z.string().optional(),
  note: z.string().optional(),
  lines: z.number().int().nonnegative().optional(),
})

export type LegacyEntry = z.infer<typeof LegacyEntrySchema>

// 2026-05-21 (Luiz/dev): stack snapshot do Step 2 (Plano 01 fase-02).
// `primary` pode ser null (fallback "no signal"). `confidence` derivado da quantidade
// de manifests detectados — high se >=1 probe positivo + anchor files; low se nenhum.
export const ManifestStackSchema = z.object({
  // 2026-05-24 (Luiz/dev): PRD §RF-03 — 'react' adicionado em fase-04 (Vite + React puro).
  primary: z.enum(['nextjs', 'react', 'node-ts', 'rails', 'laravel', 'python']).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type ManifestStack = z.infer<typeof ManifestStackSchema>

// 2026-05-21 (Luiz/dev): schema raiz. schemaVersion literal '1.0' — qualquer mudança breaking
// vira '2.0' e o reader precisa migrar. detectedAt em ISO 8601 (`new Date().toISOString()`).
export const LegacyManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  detectedAt: z.string().datetime(),
  stack: ManifestStackSchema,
  legacy: z.array(LegacyEntrySchema),
})

export type LegacyManifest = z.infer<typeof LegacyManifestSchema>

/**
 * Parseia JSON cru do manifest e valida contra o schema.
 * Lança `z.ZodError` em caso de divergência — caller pode capturar e formatar mensagem.
 */
export function parseLegacyManifest(input: unknown): LegacyManifest {
  return LegacyManifestSchema.parse(input)
}
