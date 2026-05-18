// skills/init/lib/steps/helpers.ts
// 2026-05-17 (Luiz/dev): DRY helpers extraidos apos code-smell audit do Plano 04.
// Substituem isMigrateMode (duplicado 6x), const dryRun (duplicado 6x) e
// resolvePluginRoot (duplicado 2x). Magic strings encapsuladas como constants internas.
import path from 'node:path'

const FLAG_DRY_RUN = 'dry-run'
const COMMAND_MIGRATE = 'migrate'

/**
 * True quando o /init foi invocado em modo migracao (`/init migrate`).
 * Steps de migrate.* sao no-op silencioso fora desse modo.
 * DI-1 herdado de Plano 03 fase-02 (args[0] === 'migrate').
 */
export function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === COMMAND_MIGRATE
}

/**
 * True quando `--dry-run` foi passado. Steps que mutam disco devem honrar.
 * PRD CA-03.
 */
export function isDryRun(flags: Readonly<Record<string, boolean | string>>): boolean {
  return flags[FLAG_DRY_RUN] === true
}

/**
 * Resolve plugin root para steps que precisam ler `assets/` ou outros recursos
 * empacotados. Honra `CLAUDE_PLUGIN_ROOT` (override de teste); fallback eh 4 niveis
 * acima do arquivo do step (skills/init/lib/steps/ -> root).
 */
export function resolvePluginRoot(stepFileDir: string): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? path.join(stepFileDir, '..', '..', '..', '..')
}
