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
  /**
   * 2026-09-06 (Luiz/dev): Plano 04 DP-2 — PRD RF-09/CA-05. Declaracao que o adaptador ENXERGA mas
   * nao consegue resolver estaticamente (path nao literal, `match` sem `via:`, `mount`, `re_path`...).
   * `path` e o texto-fonte da expressao (prefixado com `/`); o motor curto-circuita para
   * `indeterminada` antes de allowlist e matcher. Nunca inventar path, nunca `coberta`.
   */
  unresolved?: string
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
      // 2026-09-06 (Luiz/dev): DP-1a — escopo do opaco. Sem isto, um `before_action ... if:` num
      // controller tornaria TODAS as rotas do projeto indeterminada. Next omite (opaco global, como hoje).
      handler?: string
    }
  | {
      // 2026-09-06 (Luiz/dev): DP-1 — a UNICA variante nova. "O adaptador demonstrou que auth esta
      // presa a ESTE handler" — before_action efetivo, Depends resolvido, middleware anterior na cadeia.
      // O motor casa por `handler` OU por `file:line`; nao sabe o que e Rails, Express ou FastAPI.
      kind: 'handler-chain'
      handler: string
      file: string
      line: number
      /** Prosa curta do que cobriu: `before_action :authenticate_user! (herdado de ApplicationController)`. */
      via: string
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

// 2026-09-05 (Luiz/dev): Plano 03 DP-4 — qual entrada do CONJUNTO-GATILHO (PRD Decisao 6) trouxe a rota:
// G1 = o arquivo dela esta no diff; G2 = cobertura perdida por mudanca no matcher/allowlist. Opcional porque
// `evaluateRoute`/`verdictFor` sao puras e nao sabem o gatilho; o MOTOR sempre preenche.
export type AuditTrigger = 'G1' | 'G2'

export type RouteVerdict = {
  route: Route
  verdict: Verdict
  /** O que demonstrou o veredito (a regra que casou) ou o que faltou (RF-05). */
  evidence: string
  trigger?: AuditTrigger
}

/** So os veredictos que emitem finding viram RouteFinding — ver tabela de severidade do PRD. */
export type RouteFinding = {
  route: Route
  verdict: Exclude<Verdict, 'coberta' | 'publica-declarada'>
  severity: IssueSeverity
  /** O que faltou, em prosa curta: "nenhuma entrada de config.matcher casa /api/admin". */
  missing: string
  trigger?: AuditTrigger
}

export interface RouteAdapter {
  readonly stack: StackId
  enumerate(targetDir: string): Route[]
  readCoverage(targetDir: string): CoverageMap
  // 2026-09-05 (Luiz/dev): Plano 03 DP-1/DP-2 — G2 (PRD Decisao 6). OPCIONAIS de proposito: o Plano 04
  // registra adaptadores sem eles e o motor responde `not-applicable` com nota — nunca `coberta`.
  /** O arquivo do diff define cobertura desta stack? (Next: `middleware.ts` na raiz.) */
  isCoverageFile?(file: string): boolean
  /** Reconstroi a cobertura na ponta ANTES a partir do seam `read` — puro, sem I/O proprio. */
  readCoverageAtBase?(read: (file: string) => BaseRead): CoverageAtBase
}

export type CoverageAtBase = CoverageMap | { unavailable: string }

/** G15 do plano: `in` narrowing — `CoverageMap` nao tem a chave `unavailable`. Sem `as`. */
export function isCoverageUnavailable(value: CoverageAtBase): value is { unavailable: string } {
  return 'unavailable' in value
}

// 2026-09-05 (Luiz/dev): Plano 03 DP-7 — summary aditivo do G2. `reason` so quando `before !==
// 'resolved'` (G3: nunca `reason: undefined`).
export type G2Summary = {
  triggered: boolean
  /** Arquivos de cobertura e/ou allowlist que estavam no diff (cobertura primeiro). */
  sources: string[]
  /** `resolved` tambem quando nao disparou: a ponta antes E a ponta depois. */
  before: 'resolved' | 'unavailable' | 'not-applicable'
  /** Quantas rotas do conjunto G2 sairam com veredito DESCOBERTA. */
  lost: number
  /** Quantas rotas do conjunto G2 sairam com veredito indeterminada. */
  indeterminate: number
  reason?: string
}

// 2026-09-05 (Luiz/dev): Plano 02 — allowlist versionada (PRD RF-02, Decisoes 3 e 7). Tudo aditivo:
// o contrato de Route/CoverageRule/RouteFinding esta congelado desde a fase-02 do Plano 01.

/** Entrada ACEITA. `file`/`line` apontam para a declaracao — RF-05 vale para ela tambem. */
export type AllowlistEntry = { path: string; reason: string; file: string; line: number }

/** Entrada recusada pelo parser (DP-4). Sem finding proprio: a rota volta ao motor (CA-04b). */
export type RejectedEntry = { path?: string; line: number; reason: string }

/**
 * Finding sobre a PROPRIA allowlist — nao ha `route`, por isso nao e RouteFinding (DP-9).
 * Nesta fase o tipo existe e ninguem o produz: `AuditResult.allowlistFindings` e sempre `[]`.
 * A fase-02 (DP-3) passa a produzi-lo para entrada ampla; declarar aqui faz o RED dela ser
 * assertion (`Expected length: 1, Received length: 0`), nao erro de compilacao.
 */
export type AllowlistFinding = {
  path: string
  file: string
  line: number
  severity: IssueSeverity
  description: string
  /** 2026-09-06 (Luiz/dev): DP-7 — candidata ampla guarda a `reason` para poder ser promovida a entrada literal. */
  reason?: string
}

export type AllowlistParseResult = {
  entries: AllowlistEntry[]
  rejected: RejectedEntry[]
  /** Fase-02 preenche. Aqui sempre `[]`. */
  wide: AllowlistFinding[]
  notes: string[]
}

// ---------------------------------------------------------------------------
// Type guards — o repo proibe `as`; quem recebe `unknown` (JSON da CLI, fixture) estreita por aqui.
// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === 'string' && HTTP_METHODS.some((method) => method === value)
}

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VERDICTS.some((verdict) => verdict === value)
}

// 2026-09-05 (Luiz/dev): DP-11 refinada (MEMORY DEV-plan-2). Tres estados porque a DP exige tres
// consequencias: encontrado → diff real; ausente na base → tudo `added` com before 'resolved';
// indisponivel → before 'unavailable' + reason. Um `string | null` nao distingue os dois ultimos, e
// o Plano 03 reusa este seam para `middleware.ts` — nao pode devolver um literal de allowlist vazia.
export type BaseRead =
  | { status: 'found'; source: string }
  | { status: 'absent' }
  | { status: 'unavailable'; reason: string }

export type AllowlistDelta = {
  before: 'resolved' | 'unavailable'
  added: AllowlistEntry[]
  /** `file`/`line` apontam para a versao NA BASE — a entrada nao existe mais no HEAD. */
  removed: AllowlistEntry[]
  reason?: string
}

export function isRoute(value: unknown): value is Route {
  if (!isRecord(value)) return false
  const { method, path, file, line, stack, handler, unresolved } = value
  // `handler` e opcional; presente, tem de ser string nao-vazia. Ausente e valido (Next omite).
  if (handler !== undefined && (typeof handler !== 'string' || handler.length === 0)) return false
  // `unresolved` e opcional; presente, tem de ser string nao-vazia (DP-2).
  if (unresolved !== undefined && (typeof unresolved !== 'string' || unresolved.length === 0)) return false
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
