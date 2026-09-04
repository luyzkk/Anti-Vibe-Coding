// 2026-09-04 (Luiz/dev): contrato unico rota x cobertura — PRD route-auth-matrix-audit RF-01, D1.
// O adaptador e nativo por stack; o que e comum e SO este shape. O Plano 04 implementa
// RouteAdapter para rails/node-ts/python contra este arquivo — mudanca aqui reabre tres adaptadores.
import type { StackId } from '../../init/lib/detect-stack'
import type { IssueSeverity } from '../../lib/subagent-contract'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

/** Uma rota enumerada. `file` e `path` sempre POSIX, relativos a raiz do projeto auditado. */
export type Route = {
  method: HttpMethod
  /** Caminho publico como a stack o escreve (`/api/users/[id]` no Next, `/users/:id` no Express). */
  path: string
  file: string
  line: number
  stack: StackId
  /**
   * Quem ATENDE a rota, quando a stack separa declaracao de implementacao.
   *
   * 2026-09-04 (Luiz/dev): campo nasceu da leitura do contrato com os olhos do Plano 04, que a
   * fase-02 exige fazer. No Next.js o arquivo E o handler, entao `file` basta. No Rails, a rota e
   * declarada em `config/routes.rb` e a cobertura (`before_action`) vive no controller — sem este
   * campo nao ha como ligar filtro a rota, e Rails e Python cairiam inteiros em `indeterminada`.
   * Django tem o mesmo formato (`urls.py` aponta para a view).
   *
   * Opcional de proposito: adaptador file-system (Next) omite. Formato e da stack:
   * `'UsersController#show'` no Rails, `'app.views.detail'` no Django.
   */
  handler?: string
}

/**
 * Como a stack expressa "esta rota exige auth". Uniao ABERTA a extensao aditiva pelo Plano 04
 * (ex: `controller-filter` para o before_action do Rails, `dependency` para o Depends do FastAPI).
 * O motor de veredito trata `kind` desconhecido como `indeterminada` — nunca como coberta.
 */
export type CoverageRule =
  | {
      kind: 'path-pattern'
      /** Padrao no dialeto da stack (`/admin/:path*` no Next e no Express). */
      pattern: string
      file: string
      line: number
    }
  | {
      kind: 'opaque'
      /** Por que nao deu para ler: matcher computado, spread, import dinamico. */
      reason: string
      file: string
      line: number
    }

export type CoverageMap = {
  stack: StackId
  rules: CoverageRule[]
  /** Arquivos lidos para montar o mapa — o relatorio cita, e o Plano 03 le nas duas pontas do diff. */
  sources: string[]
  /** Observacoes nao-bloqueantes (ex: `src/app` e `app` coexistem). */
  notes: string[]
}

export const VERDICTS = ['coberta', 'publica-declarada', 'DESCOBERTA', 'indeterminada'] as const
export type Verdict = (typeof VERDICTS)[number]

export type RouteVerdict = {
  route: Route
  verdict: Verdict
  /** O que demonstrou o veredito (a regra que casou) ou o que faltou (RF-05). */
  evidence: string
}

/** So os veredictos que emitem finding viram RouteFinding — ver tabela de severidade do PRD. */
export type RouteFinding = {
  route: Route
  verdict: Exclude<Verdict, 'coberta' | 'publica-declarada'>
  severity: IssueSeverity
  /** O que faltou, em prosa curta: "nenhuma entrada de config.matcher casa /api/admin". */
  missing: string
}

export interface RouteAdapter {
  readonly stack: StackId
  enumerate(targetDir: string): Route[]
  readCoverage(targetDir: string): CoverageMap
}

// ---------------------------------------------------------------------------
// Type guards — o repo proibe `as`; quem recebe `unknown` (JSON da CLI, fixture) estreita por aqui.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === 'string' && HTTP_METHODS.some((method) => method === value)
}

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VERDICTS.some((verdict) => verdict === value)
}

export function isRoute(value: unknown): value is Route {
  if (!isRecord(value)) return false
  const { method, path, file, line, stack, handler } = value
  // `handler` e opcional; presente, tem de ser string nao-vazia. Ausente e valido (Next omite).
  if (handler !== undefined && (typeof handler !== 'string' || handler.length === 0)) return false
  return (
    isHttpMethod(method) &&
    typeof path === 'string' &&
    path.startsWith('/') &&
    typeof file === 'string' &&
    !file.includes('\\') &&
    typeof line === 'number' &&
    Number.isInteger(line) &&
    line >= 1 &&
    typeof stack === 'string'
  )
}
