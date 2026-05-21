// 2026-05-21 (Luiz/dev): Plano 04 fase-01 DEV-01 — testes skipados.
// Testavam parity gate do V2 generator (generatePopulatePlanV2, EXCLUDED_FROM_POPULATION_V2,
// LLM_INSTRUCTIONS, ImperativeInstruction, DEFAULT_INSTRUCTION).
// Todos esses exports foram deletados junto com o generator V2.
// Gate de parity V3 sera recriado em Plano 04 fase-05 (init-v7-populate-plans-*.test.ts).
import { describe, test } from 'bun:test'

describe.skip('populate-plan parity (gate V2 — deletado em Plano 04 fase-01)', () => {
  test('placeholder — ver tests/e2e/init-v7-populate-plans-*.test.ts em Plano 04 fase-05', () => {})
})
