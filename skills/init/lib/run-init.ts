// skills/init/lib/run-init.ts
import { AbortError } from './steps/abort-error'
import type { Step, StepContext, StepResult } from './steps/types'
import { parseFlags } from './parse-flags'
import { lazyImport } from './lazy-import'
import { WriteRecorder } from './dry-run'
import { createAuditLogWriterForCtx } from './audit-log-writer-factory'
import { detectCrossUpgrade } from './cross-upgrade-detector'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function readPluginVersion(): Promise<string> {
  try {
    const pluginJsonPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '..', '..', '..', '.claude-plugin', 'plugin.json',
    )
    const raw = await readFile(pluginJsonPath, 'utf-8')
    const parsed = JSON.parse(raw) as { version?: string }
    if (parsed.version) return parsed.version
  } catch { /* fall through */ }
  try {
    const pkgPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '..', '..', '..', 'package.json',
    )
    const raw = await readFile(pkgPath, 'utf-8')
    const parsed = JSON.parse(raw) as { version?: string }
    if (parsed.version) return parsed.version
  } catch { /* fall through */ }
  return '6.4.1'
}

export type RunInitOptions = {
  /** Permite injetar registry alternativo (tests). Default: registry global. */
  registry?: readonly Step[]
  /** Permite injetar cwd (tests). Default: process.cwd(). */
  cwd?: string
  /** Sink de log (tests podem capturar). Default: console.log. */
  log?: (line: string) => void
  /**
   * 2026-05-17 (Luiz/dev): Plano 03 fase-06 — injetado em ctx para steps interativos.
   * Em prod: liga em AskUserQuestion via wrapper. Em test: stub direto. PRD D3, CH-01.
   */
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
}

/**
 * Executa todos os steps em sequencia. Para no primeiro AbortError.
 * Nao chama process.exit() — devolve `StepResult` para o caller decidir.
 *
 * @example
 * const result = await runInit(Bun.argv.slice(2))
 * if (result.kind === 'aborted') process.exit(result.code)
 */
export async function runInit(
  argv: readonly string[],
  opts: RunInitOptions = {},
): Promise<StepResult> {
  const { registry: injectedRegistry, cwd, log = console.log, askUser } = opts
  // 2026-05-17 (Luiz/dev): lazyImport documenta DI-06/GT-04 — Windows safety boundary.
  // import dinamico apenas se nao houver injecao — evita carregar todos os steps em testes.
  const reg = injectedRegistry ?? (await lazyImport(() => import('./registry'))).registry

  const ctx: StepContext = (() => {
    const { args, flags } = parseFlags(argv)
    // 2026-05-18 (Luiz/dev): Plano 05 fase-01 — instancia WriteRecorder UMA vez por run em dry-run.
    // Steps le via getRecorder(ctx). Compartilhado ao longo do registry para CA-13 parity.
    const recorder = flags['dry-run'] === true ? new WriteRecorder() : undefined
    const flagsWithRecorder = recorder !== undefined
      ? { ...flags, __dryRunRecorder: recorder as unknown as boolean }
      : flags
    const base: StepContext = { cwd: cwd ?? process.cwd(), args, flags: flagsWithRecorder }
    if (askUser !== undefined) {
      return { ...base, askUser }
    }
    return base
  })()

  // 2026-05-18 (Luiz/dev): D19 — instancia AuditLogWriter UMA vez por run e injeta em ctx.
  // Steps consomem via ctx.flags['__auditLog'] sem mudar a assinatura de Step.run(ctx).
  // 'no-audit-log' flag opt-out para CI/testes deterministicos (parseFlags strip o '--').
  const _runId = randomUUID()
  const _auditWriter = createAuditLogWriterForCtx(
    ctx.cwd,
    _runId,
    { disabled: ctx.flags['no-audit-log'] === true },
  )
  const ctxWithAudit: StepContext = _auditWriter !== null
    ? { ...ctx, flags: { ...ctx.flags, __auditLog: _auditWriter as unknown as boolean } }
    : ctx

  // 2026-05-18 (Luiz/dev): Plano 06 fase-02 — cross-upgrade warning v6.3.x -> v6.4.x.
  // Lê manifest e CLAUDE.md sem lançar exceção; detectCrossUpgrade decide se avisa.
  const _manifestVersion = await (async () => {
    try {
      const raw = await readFile(
        path.join(ctxWithAudit.cwd, '.claude', '.anti-vibe-manifest.json'),
        'utf-8',
      )
      return (JSON.parse(raw) as { pluginVersion?: string }).pluginVersion ?? null
    } catch { return null }
  })()
  const _claudeMdLines = await (async () => {
    try {
      const raw = await readFile(path.join(ctxWithAudit.cwd, 'CLAUDE.md'), 'utf-8')
      return raw.split('\n').length
    } catch { return null }
  })()
  const _upgradeWarning = detectCrossUpgrade({
    manifestPluginVersion: _manifestVersion,
    currentPluginVersion: await readPluginVersion(),
    claudeMdLineCount: _claudeMdLines,
    additiveOptIn: ctxWithAudit.flags['additive-merge'] === true,
    dryRun: ctxWithAudit.flags['dry-run'] === true,
  })
  if (_upgradeWarning !== null) {
    const noColor = process.env['NO_COLOR'] === '1' || ctxWithAudit.flags['no-color'] === true
    const msg = noColor ? _upgradeWarning.message : `\x1b[33m${_upgradeWarning.message}\x1b[0m`
    log(msg)
  }

  // 2026-05-18 (Luiz/dev): PRD D24 — `--rollback` early-return ANTES do registry.
  // D21 — dispatcher imutavel: nenhum step novo, nenhum hook beforeStep.
  if (ctxWithAudit.flags.rollback === true) {
    const { runRollback } = await lazyImport(() => import('./rollback'))
    const rollbackOpts = {
      cwd: ctx.cwd,
      log,
      ...(askUser !== undefined ? { askUser } : {}),
      ...(_auditWriter !== null ? { auditWriter: _auditWriter } : {}),
    }
    return runRollback(rollbackOpts)
  }

  for (const step of reg) {
    try {
      let report = await step.run(ctxWithAudit)

      // 2026-05-17 (Luiz/dev): contrato needsUser (PRD D3, CH-01, G6 do plano).
      // Ordem: checar needsUser PRIMEIRO (pode mudar o report), depois skipRemaining no report final.
      // Anti-loop guard: re-invoca step UMA UNICA VEZ. Se segunda chamada tambem retorna needsUser,
      // eh bug do step — lanca Error generica (NAO AbortError, pois nao eh comportamento esperado).
      if (report.needsUser !== undefined) {
        if (ctxWithAudit.askUser !== undefined) {
          const answer = await ctxWithAudit.askUser(report.needsUser.prompt, report.needsUser.options)
          // 2026-05-17 (Luiz/dev): propagar resposta via ctx.flags. Chave __interactiveAnswer reservada.
          // Cada step interativo le de ctx.flags['__interactiveAnswer'] na segunda invocacao.
          const ctxWithAnswer: StepContext = ctxWithAudit.askUser !== undefined
            ? { ...ctxWithAudit, flags: { ...ctxWithAudit.flags, __interactiveAnswer: answer }, askUser: ctxWithAudit.askUser }
            : { ...ctxWithAudit, flags: { ...ctxWithAudit.flags, __interactiveAnswer: answer } }
          report = await step.run(ctxWithAnswer)
          if (report.needsUser !== undefined) {
            throw new Error(`Step "${step.id}" returned needsUser twice — anti-loop guard tripped.`)
          }
        }
        // Se ctxWithAudit.askUser nao estiver injetado: skip interacao (comportamento defensive em prod).
      }

      log(`[${step.id}] ${report.summary}`)
      if (report.mutated) {
        // 2026-05-17 (Luiz/dev): log explicito de mutacao — alinhado com PRD SH-04 (rastreabilidade).
        log(`[${step.id}] (mutated disk)`)
      }
      // 2026-05-17 (Luiz/dev): Plano 02 fase-06 — early-exit para reuse-discovery cache-fresh.
      // Mapeia process.exit(0) do SKILL.md linha 550 sem usar AbortError (semantica de erro). PRD MH-04, CA-04.
      if (report.skipRemaining === true) {
        break
      }
    } catch (e) {
      if (e instanceof AbortError) {
        log(e.reason)
        return { kind: 'aborted', code: e.code, reason: e.reason }
      }
      throw e
    }
  }

  // 2026-05-18 (Luiz/dev): Plano 05 fase-05 — warning amarelo quando --additive-merge ativo (G10)
  // Usa log injetado (nao console.warn) para que testes capturem via sink.
  if (ctxWithAudit.flags['additive-merge'] === true) {
    log('')
    log('WARN: Running in --additive-merge mode (v6.3.x behavior).')
    log('   Destructive merge skipped. CLAUDE.md preserved as-is.')
    log('   To migrate later: re-run /anti-vibe-coding:init without --additive-merge.')
    log('')
  }

  // 2026-05-19 (Luiz/dev): Plano 05 fase-03 — mensagem final CA-11.
  // `__populatePlanPath` e setado por Step 91 em ctx.flags apos escrever o plano populate.
  // Mensagem sugestiva — nunca invoca automaticamente (feedback_suggest_dont_execute.md).
  const populatePlanPath = typeof ctxWithAudit.flags['__populatePlanPath'] === 'string'
    ? ctxWithAudit.flags['__populatePlanPath']
    : null
  if (populatePlanPath !== null) {
    log('')
    log(`Harness scaffold criado. Plano populate em ${populatePlanPath}`)
    log('')
    log(`Proximo passo: rode /anti-vibe-coding:execute-plan ${populatePlanPath}`)
    log('para a IA popular cada doc canonico lendo o codigo real. Revise via PR antes de fechar cada fase.')
    log('')
    log('Opcional: /anti-vibe-coding:detect-architecture para Modo Dual nas skills estruturantes.')
  }

  return { kind: 'ok', report: { mutated: false, summary: 'all steps completed' } }
}
