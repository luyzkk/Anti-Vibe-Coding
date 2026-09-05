// 2026-05-14 (Luiz/dev): ruleset mínimo — expansão futura via PRs separados, evita scope creep (PRD §Decisão #5)

import type { ToolRegistrySnapshot } from '../../lib/tool-registry-inspector'
import type { ParityGap } from './parity-gaps-writer'

export type Severity = 'critical' | 'important' | 'nice'

export type GapRule = {
  gap_id: string                  // ex: 'stripe-mcp'
  task_type: string               // ex: 'payment-debug'
  required_capability: string     // descrição humana do que falta
  detect: (snapshot: ToolRegistrySnapshot) => boolean
  severity: Severity
  suggestion: string
}

export const GAP_RULES: GapRule[] = [
  {
    gap_id: 'stripe-mcp',
    task_type: 'payment-debug',
    required_capability: 'Stripe MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('stripe')),
    severity: 'critical',
    suggestion: 'Instalar mcp-stripe ou pular tasks de debug Stripe. PRD CA-05.',
  },
  {
    gap_id: 'playwright-mcp',
    task_type: 'browser-test',
    required_capability: 'Playwright MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('playwright')),
    severity: 'critical',
    suggestion: 'Instalar plugin Playwright MCP (qa-visual depende disso — CA-06).',
  },
  {
    gap_id: 'email-mcp',
    task_type: 'email-send',
    required_capability: 'Email provider MCP (SES, Sendgrid, etc)',
    detect: snap =>
      !snap.mcps.some(m =>
        ['ses', 'sendgrid', 'mailgun', 'resend'].some(p => m.name.toLowerCase().includes(p))
      ),
    severity: 'important',
    suggestion: 'Sem MCP de email, /security não consegue inspecionar templates ou rate limits de envio.',
  },
  {
    gap_id: 'github-mcp',
    task_type: 'pr-review',
    required_capability: 'GitHub MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('github')),
    severity: 'nice',
    suggestion: 'Sem GitHub MCP, /pr-review cai em CLI gh — funciona, mas com mais latência.',
  },
]

// 2026-05-16 (Luiz/dev): GREEN CA-08 — cross capabilities with source file usage scan.
// Detects declared routes that are never imported/referenced anywhere in the project.


// 2026-09-05 (Luiz/dev): `crossCapabilitiesWithUsage` (CA-08 do PRD v6.3.1) foi REMOVIDA daqui,
// junto de `collectSourceFiles` e `escapeRegex`, que existiam so para ela.
//
// Ela cruzava `Capability[]` com o uso real no codigo para achar rota que existe e ninguem chama —
// detector de rota morta. Boa ideia, mas sem entrada: as capabilities vinham do step
// `15-capabilities-discovery`, removido por decisao D5 do init-refactor-v7 ("Remover — nao queremos
// essa complexidade", origem dev). `computeParityGaps` recebia `capabilities?` opcional e
// `scripts/parity-audit.ts` nunca as passava, entao `crossGaps` era sempre `[]`. Codigo com teste,
// sem caminho de execucao.
//
// Religar exigiria reviver o que D5 matou. Se a deteccao de rota morta voltar a ser desejada, a
// fonte natural hoje NAO e o capabilities-writer: e o `enumerateNextjsRoutes` de
// `skills/security/lib/route-auth-nextjs.ts`, que o RF-11 trouxe e ja produz o inventario de rotas
// com arquivo e linha. Isso seria feature nova, com fonte de dados de verdade — nao ressurreicao.
