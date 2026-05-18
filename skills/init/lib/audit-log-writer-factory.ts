import { AuditLogWriter } from './audit-log'

/**
 * Conforme D19 do PRD: cria writer canonico para um run de `runInit` e
 * pode ser depositado em `ctx.flags['__auditLog']` para que steps consumam sem mudar a
 * assinatura de `Step.run(ctx)`. Reusa contrato existente — sem nova API.
 *
 * @param targetDir cwd do projeto-alvo (mesmo que `ctx.cwd`)
 * @param runId UUID correlacionando inventory ↔ agents-log (gerado pelo dispatcher)
 * @param opts.disabled quando true, retorna null (opt-out via --no-audit-log)
 * @returns AuditLogWriter pronto, ou null se audit log estiver desabilitado
 */
export function createAuditLogWriterForCtx(
  targetDir: string,
  runId: string | null,
  opts: { disabled?: boolean } = {},
): AuditLogWriter | null {
  if (opts.disabled === true) return null
  if (runId === null || runId.length === 0) return null
  return new AuditLogWriter(targetDir, runId)
}
