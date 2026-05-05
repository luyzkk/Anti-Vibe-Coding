import type { TelemetryStart, TelemetryEnd } from '../telemetry-types'

export const FIXTURE_START: TelemetryStart = {
  evento: 'start',
  skill_invocada: 'plan-feature',
  timestamp_inicio: '2026-05-04T10:00:00.000Z',
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
}

export const FIXTURE_END_SUCCESS: TelemetryEnd = {
  evento: 'end',
  skill_invocada: 'plan-feature',
  timestamp_inicio: '2026-05-04T10:00:00.000Z',
  timestamp_fim: '2026-05-04T10:00:42.000Z',
  duracao_ms: 42_000,
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 3,
  arquivos_modificados: 1,
  sucesso: true,
}

export const FIXTURE_END_FAILURE: TelemetryEnd = {
  ...FIXTURE_END_SUCCESS,
  sucesso: false,
  error_message: 'fixture failure for tests',
}
