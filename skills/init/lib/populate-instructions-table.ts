// skills/init/lib/populate-instructions-table.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-02 — instrucoes hardcoded por doc canonico (D18 CONTEXT).
// G8 do README: tabela e a fonte da verdade do conjunto de 16 docs populaveis.
// DI-Plano04-fase02-stackid-node-ts: CODE_PATHS_BY_DOC usa StackId real ('node-ts', nao
// 'nodejs-typescript'). 'nextjs' tambem mapeado pois compartilha o mesmo matrix folder.

import type { StackId } from './detect-stack'
import type { Wave, RiskEntry, StackVariants } from './render-fase-plan'

/**
 * Instrucao por doc — independente de stack. Paths reais vem de `buildWavesForDoc`.
 */
export type DocInstruction = {
  // === Campos antigos (mantidos para Plano 02 adapter) ===
  readonly goal: string
  readonly scopeIn: ReadonlyArray<string>
  readonly scopeOut: ReadonlyArray<string>
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  /** Secoes H2 que a LLM deve escrever no doc-alvo. Vira items da Wave 2. */
  readonly sectionsToWrite: ReadonlyArray<string>
  readonly reviewChecklist: ReadonlyArray<string>
  readonly compoundOpportunity: string
  readonly exitCriteria: ReadonlyArray<string>

  // === Campos novos (FasePlanInput v1 ext) ===
  /** Path do .md de guidance per-doc. NAO lido em runtime — apenas referenciado. */
  readonly guidanceFile: string
  /** Sinais que a LLM deve grepar no codebase antes de escrever o doc. */
  readonly detectionSignals: ReadonlyArray<string>
  /** Por H2 do doc-alvo, lista de itens que DEVEM ser cobertos na prosa final. */
  readonly mustCover: Readonly<Record<string, ReadonlyArray<string>>>
  /** Links obrigatorios para outros docs (anchor links permitidos). */
  readonly linkTargets: ReadonlyArray<string>
  /** Variacao por stack (opcional). Aceita 3 chaves: rails / nextjs / node-ts. */
  readonly stackVariants?: StackVariants
  /** Comando que fecha a fase com sinal de sucesso. */
  readonly validationCommand: string
  /** IDs de fases anteriores — docs dos quais este depende (vazio = independente). */
  readonly dependsOn: ReadonlyArray<string>
}

/**
 * Algoritmo canonico de slug. Documentado em G8 do Plano 04 README.
 * Exemplos: 'docs/SECURITY.md' → 'docs-security-md'; '.claude/CLAUDE.md' → 'claude-claude-md'.
 */
export function docToSlug(dst: string): string {
  return dst
    .replace(/^\./, '') // strip leading dot from .claude/
    .replaceAll('/', '-')
    .replace(/\.md$/, '-md')
    .toLowerCase()
}

// 2026-05-21 (Luiz/dev): D18 do CONTEXT — 16 docs populaveis com plano LLM individual.
// Ordem da lista segue D18 (12 baseline Andre + 4 extras AVC). NAO reordenar sem audit.
export const POPULATE_INSTRUCTIONS_BY_DOC: ReadonlyMap<string, DocInstruction> = new Map([
  // ===== Baseline Andre (12) =====
  ['AGENTS.md', {
    goal: 'Document the agent operating contract: when to delegate, model profiles, audit log expectations, parallel subagent patterns.',
    scopeIn: ['Agent delegation triggers', 'Subagent contracts', 'Audit log fields', 'Model profile selection'],
    scopeOut: ['Subagent skill catalogs (lives in docs/AGENTS_LIST.md)', 'Skill source code'],
    assumptions: ['.claude/CLAUDE.md exists or has placeholder', 'Subagent IDs are stable across sessions'],
    risks: [{ risk: 'Conflicting guidance between AGENTS.md and CLAUDE.md', mitigation: 'AGENTS.md is contract; .claude/CLAUDE.md mirrors via link' }],
    sectionsToWrite: ['Operating Contract', 'Delegation Triggers', 'Audit Log Fields', 'Subagent Patterns'],
    reviewChecklist: ['Mirrors .claude/CLAUDE.md content', 'No conflicting instructions', 'All subagent IDs verifiable in code'],
    compoundOpportunity: 'If a delegation pattern proves valuable, capture as compound note in docs/compound/.',
    exitCriteria: ['harness:validate passes for AGENTS.md', 'Zero placeholder lines', 'Links to docs/AGENTS_LIST.md resolve'],
    guidanceFile: 'skills/init/assets/populate-guidance/agents-md.md',
    detectionSignals: ['subagent_type:', 'allowed-tools:', 'model:', 'Agent\\('],
    mustCover: {
      'Operating Contract': ['when to delegate vs do directly', 'cost of context switch'],
      'Delegation Triggers': ['parallel-safe tasks', 'isolation requirements'],
      'Audit Log Fields': ['fields required', 'retention policy'],
      'Subagent Patterns': ['fork vs worktree', 'context isolation'],
    },
    linkTargets: ['.claude/CLAUDE.md', 'docs/AGENTS_LIST.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['ARCHITECTURE.md', {
    goal: 'Document the system architecture: components, dependencies, data flow, and key invariants that must hold across the codebase.',
    scopeIn: ['Component diagram (text or mermaid)', 'Data flow', 'Stack choices and rationale', 'Cross-cutting concerns'],
    scopeOut: ['Implementation details (lives in source)', 'Future plans (lives in docs/PLANS.md)'],
    assumptions: ['Stack is detected and recorded in docs/STATE.md', 'Entry point is identifiable'],
    risks: [{ risk: 'Architecture description drifts from code', mitigation: 'Link each component section to specific file paths; review on major refactors' }],
    sectionsToWrite: ['System Overview', 'Components', 'Data Flow', 'Key Invariants', 'Decision Log Links'],
    reviewChecklist: ['Each component links to a source path', 'Diagrams accompanied by 1-2 sentence description', 'No placeholder text'],
    compoundOpportunity: 'Architecture decisions that recur or surprise belong in docs/design-docs/ADR-*.md.',
    exitCriteria: ['harness:validate passes', 'Components claimed in doc exist in codebase'],
    guidanceFile: 'skills/init/assets/populate-guidance/architecture-md.md',
    detectionSignals: ['import\\s', 'require\\(', 'export default', 'config/routes'],
    mustCover: {
      'System Overview': ['primary stack', 'deployment target'],
      'Components': ['each component links to source path', 'responsibility description'],
      'Data Flow': ['request lifecycle', 'data persistence layer'],
      'Key Invariants': ['invariants that must hold across refactors'],
      'Decision Log Links': ['links to relevant ADR-*.md'],
    },
    linkTargets: ['docs/PLANS.md', 'docs/DESIGN.md'],
    stackVariants: {
      rails: 'Rails MVC — app/ layout, config/routes.rb as entry point',
      nextjs: 'Next.js App Router — src/app/ layout, server/client split',
      'node-ts': 'Node-TS monolith — src/ layout, entry via package.json main',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['README.md', {
    goal: 'Provide the entry point for new contributors: what this project does, how to run it locally, and where to find more detailed documentation.',
    scopeIn: ['Project purpose (1-2 sentences)', 'Prerequisites', 'Quick start / local setup', 'Links to key docs'],
    scopeOut: ['Architecture detail (lives in ARCHITECTURE.md)', 'API reference (lives in generated docs)', 'Changelog'],
    assumptions: ['Project has a runnable local environment', 'Key docs are already scaffolded'],
    risks: [{ risk: 'Quick start instructions go stale after dependency updates', mitigation: 'Keep steps minimal and point to package.json scripts for the source of truth' }],
    sectionsToWrite: ['Overview', 'Prerequisites', 'Quick Start', 'Key Documentation'],
    reviewChecklist: ['Quick start can be followed top-to-bottom without external context', 'All links resolve', 'No placeholder text'],
    compoundOpportunity: 'Onboarding friction discovered during review belongs in docs/compound/ as a gotcha.',
    exitCriteria: ['harness:validate passes', 'Quick start steps verified runnable', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/readme-md.md',
    detectionSignals: ['"scripts":', 'next dev', 'rails server', 'python manage.py', 'bun run'],
    mustCover: {
      'Overview': ['one-sentence project purpose', 'primary audience'],
      'Prerequisites': ['runtime version', 'required env vars'],
      'Quick Start': ['clone command', 'install command', 'run command'],
      'Key Documentation': ['links to ARCHITECTURE.md, docs/PLANS.md'],
    },
    linkTargets: ['ARCHITECTURE.md'],
    stackVariants: {
      rails: 'Rails — bundle install + rails server quick start',
      nextjs: 'Next.js — npm/bun install + next dev quick start',
      'node-ts': 'Node-TS — bun install + bun run dev quick start',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/QUALITY_SCORE.md', {
    goal: 'Define the quality scoring rubric used in code review: dimensions, weights, and the threshold for merge approval.',
    scopeIn: ['Scoring dimensions (correctness, security, performance, maintainability)', 'Weight per dimension', 'Merge threshold', 'Score examples'],
    scopeOut: ['Merge gate binary checks (lives in docs/MERGE_GATES.md)', 'Style rules (lives in docs/CODE_STYLE.md)'],
    assumptions: ['Team has agreed on review dimensions', 'Merge gate thresholds are defined in docs/MERGE_GATES.md'],
    risks: [{ risk: 'Score rubric becomes subjective over time', mitigation: 'Anchor each dimension with an objective example of 1/5 and 5/5' }],
    sectionsToWrite: ['Scoring Dimensions', 'Weights', 'Merge Threshold', 'Score Examples'],
    reviewChecklist: ['Each dimension has an objective description', 'Weights sum to 100%', 'Threshold clearly stated'],
    compoundOpportunity: 'If a new quality dimension emerges from a post-mortem, add it here with rationale.',
    exitCriteria: ['harness:validate passes', 'All dimensions have examples', 'Threshold is a number, not vague language'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-quality_score-md.md',
    detectionSignals: ['review:', 'checklist', 'score', 'rubric', 'threshold'],
    mustCover: {
      'Scoring Dimensions': ['correctness', 'security', 'maintainability'],
      'Weights': ['weights sum to 100%', 'rationale for each weight'],
      'Merge Threshold': ['numeric threshold', 'who decides exceptions'],
      'Score Examples': ['example of 1/5 score', 'example of 5/5 score'],
    },
    linkTargets: ['docs/MERGE_GATES.md', 'docs/CODE_STYLE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/PLANS.md', {
    goal: 'Provide the index of all active and completed execution plans so contributors can find ongoing work and historical decisions.',
    scopeIn: ['Active plan links', 'Completed plan links', 'How to create a new plan (link to scripts/new-plan.ts)'],
    scopeOut: ['Plan content itself (lives in docs/exec-plans/)', 'Prioritization decisions (lives in docs/PRODUCT_SENSE.md)'],
    assumptions: ['docs/exec-plans/ structure is scaffolded', 'scripts/new-plan.ts exists'],
    risks: [{ risk: 'Index goes stale as plans are added/completed', mitigation: 'docs/exec-plans/active/README.md and completed/README.md auto-index by convention' }],
    sectionsToWrite: ['Active Plans', 'Completed Plans', 'Creating a New Plan'],
    reviewChecklist: ['All linked plans exist on disk', 'New plan workflow documented', 'No orphan links'],
    compoundOpportunity: 'Planning process improvements belong in docs/compound/ as process lessons.',
    exitCriteria: ['harness:validate passes', 'Active plan links resolve', 'Completed plan links resolve'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-plans-md.md',
    detectionSignals: ['docs/exec-plans/active/', 'docs/exec-plans/completed/', 'new-plan.ts', 'exec-plans'],
    mustCover: {
      'Active Plans': ['link to each active plan directory', 'brief status per plan'],
      'Completed Plans': ['link to completed plans archive', 'how to find historical decisions'],
      'Creating a New Plan': ['link to scripts/new-plan.ts', 'naming convention for plan directories'],
    },
    linkTargets: ['docs/PRODUCT_SENSE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/DESIGN.md', {
    goal: 'Document the visual and interaction design system: tokens, component guidelines, and design-to-code conventions.',
    scopeIn: ['Design tokens (colors, spacing, typography)', 'Component naming conventions', 'Design-to-code handoff process', 'Figma / design tool links if applicable'],
    scopeOut: ['Frontend implementation details (lives in docs/FRONTEND.md)', 'Code style (lives in docs/CODE_STYLE.md)'],
    assumptions: ['Project has a UI layer', 'Design tokens are defined somewhere (CSS vars, Tailwind config, or design file)'],
    risks: [{ risk: 'Design system described here drifts from implemented tokens', mitigation: 'Link to actual token files (tailwind.config, CSS vars) rather than duplicating values' }],
    sectionsToWrite: ['Design Tokens', 'Component Guidelines', 'Design-to-Code Conventions', 'Design Tool Links'],
    reviewChecklist: ['Token references link to actual source files', 'No hardcoded values duplicated from source', 'No placeholder text'],
    compoundOpportunity: 'Design patterns that prevent common UI bugs belong in docs/compound/ as reusable patterns.',
    exitCriteria: ['harness:validate passes', 'Token links resolve', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-design-md.md',
    detectionSignals: ['docs/design-docs/ADR-', 'tailwind.config', 'globals.css', 'design-tokens'],
    mustCover: {
      'Design Tokens': ['links to actual token source files', 'color and spacing systems'],
      'Component Guidelines': ['naming convention', 'atomic vs composed'],
      'Design-to-Code Conventions': ['handoff process', 'who owns token definitions'],
      'Design Tool Links': ['Figma URL or equivalent', 'access instructions'],
    },
    linkTargets: ['ARCHITECTURE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: ['ARCHITECTURE.md'],
  }],

  ['docs/FRONTEND.md', {
    goal: 'Document the frontend layer: routing, component hierarchy, styling system, and accessibility posture.',
    scopeIn: ['Routing approach', 'Component hierarchy', 'Styling system', 'Accessibility patterns and WCAG target'],
    scopeOut: ['Backend API (lives in ARCHITECTURE.md)', 'Auth flows (lives in docs/SECURITY.md)', 'Design tokens (lives in docs/DESIGN.md)'],
    assumptions: ['Project has a UI layer (frontend or full-stack)', 'Stack is detected (node-ts uses React/Next, rails uses ERB/Hotwire)'],
    risks: [{ risk: 'Stack mismatch — Rails app uses ERB/Hotwire, Node-TS uses React/Tailwind', mitigation: 'Wave 1 paths are stack-aware via buildWavesForDoc' }],
    sectionsToWrite: ['Routing', 'Components', 'Styling System', 'Accessibility'],
    reviewChecklist: ['All paths in doc match actual stack', 'A11y claims verified against actual a11y attrs in code', 'No placeholder text'],
    compoundOpportunity: 'Frontend patterns that get reused (modal, form, table) belong in docs/compound/ as pattern notes.',
    exitCriteria: ['harness:validate passes', 'No paths claim files that do not exist in the repo', 'WCAG level stated'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-frontend-md.md',
    detectionSignals: ['src/app/', 'src/components/', 'app/views/', 'jsx', 'tsx', 'hotwire'],
    mustCover: {
      'Routing': ['routing approach', 'file-based vs config-based'],
      'Components': ['component hierarchy', 'shared vs page-specific'],
      'Styling System': ['CSS framework or approach', 'design token integration'],
      'Accessibility': ['WCAG target level', 'screen reader testing approach'],
    },
    linkTargets: ['ARCHITECTURE.md'],
    stackVariants: {
      rails: 'Rails — ERB/Hotwire/Turbo, app/views/ layout',
      nextjs: 'Next.js App Router — server components, src/app/ layout',
      'node-ts': 'Node-TS — React SPA or SSR, src/components/ layout',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: ['ARCHITECTURE.md'],
  }],

  ['docs/PRODUCT_SENSE.md', {
    goal: 'Document the product intuition framework: when to push back on requirements, how to evaluate feature requests, and the user value lens.',
    scopeIn: ['When to push back', 'Feature evaluation criteria', 'User value metrics', 'Anti-patterns (over-engineering, feature-creep)'],
    scopeOut: ['Technical implementation (lives in ARCHITECTURE.md)', 'Execution plans (lives in docs/PLANS.md)', 'Design aesthetics (lives in docs/DESIGN.md)'],
    assumptions: ['Team has agreed on a user-first lens', 'Product decisions are documented somewhere'],
    risks: [{ risk: 'Product sense is inherently subjective and hard to operationalize', mitigation: 'Anchor each principle with a concrete example from the project history' }],
    sectionsToWrite: ['Push Back Criteria', 'Feature Evaluation', 'User Value Metrics', 'Anti-Patterns'],
    reviewChecklist: ['Each principle has a concrete example', 'No vague language without operationalization', 'No placeholder text'],
    compoundOpportunity: 'Product decisions that proved right or wrong after shipping belong in docs/compound/ as post-mortems.',
    exitCriteria: ['harness:validate passes', 'At least one concrete example per principle', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-product_sense-md.md',
    detectionSignals: ['docs/exec-plans/active/', 'docs/exec-plans/completed/', 'CHANGELOG.md', 'decision'],
    mustCover: {
      'Push Back Criteria': ['when to push back on requirements', 'how to frame the push back'],
      'Feature Evaluation': ['criteria checklist', 'user value vs engineering cost'],
      'User Value Metrics': ['how to measure value delivered', 'proxy metrics'],
      'Anti-Patterns': ['over-engineering examples', 'feature-creep signals'],
    },
    linkTargets: ['docs/PLANS.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/RELIABILITY.md', {
    goal: 'Document the reliability posture: error handling strategy, observability setup, SLO targets, and incident response basics.',
    scopeIn: ['Error handling conventions', 'Observability stack (logging, tracing, metrics)', 'SLO targets if defined', 'Incident response basics'],
    scopeOut: ['Security posture (lives in docs/SECURITY.md)', 'Performance benchmarks (lives in docs/QUALITY_SCORE.md)'],
    assumptions: ['Project has or will have a production environment', 'Logging is configured'],
    risks: [{ risk: 'Reliability posture described diverges from what is actually instrumented', mitigation: 'Link to actual logger/tracer initialization code rather than describing abstractly' }],
    sectionsToWrite: ['Error Handling', 'Observability', 'SLO Targets', 'Incident Response'],
    reviewChecklist: ['Logging links to actual initialization code', 'SLOs are measurable numbers', 'Incident steps are actionable', 'No placeholder text'],
    compoundOpportunity: 'Outages and near-misses belong in docs/compound/ as reliability incident notes.',
    exitCriteria: ['harness:validate passes', 'At least one observability tool named and linked', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-reliability-md.md',
    detectionSignals: ['try\\s*\\{', 'catch\\s*\\(', 'logger\\.', 'console\\.error', 'Sentry', 'pino'],
    mustCover: {
      'Error Handling': ['error handling conventions', 'unhandled promise rejections'],
      'Observability': ['logging setup', 'tracing or metrics if present'],
      'SLO Targets': ['uptime target', 'latency budget if defined'],
      'Incident Response': ['on-call process', 'runbook location'],
    },
    linkTargets: ['docs/SECURITY.md', 'ARCHITECTURE.md'],
    stackVariants: {
      rails: 'Rails — exception_notification or Sentry, Rails.logger',
      nextjs: 'Next.js — Sentry/Datadog, server action error boundaries',
      'node-ts': 'Node-TS — pino/winston logger, process uncaughtException handler',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: ['ARCHITECTURE.md'],
  }],

  ['docs/SECURITY.md', {
    goal: 'Document the security posture as it exists in the codebase: auth flow, secret management, input validation, dependency hygiene, security headers, and any compliance or threat-model context the project actually carries.',
    scopeIn: ['Auth flow', 'Secret storage and rotation', 'Input validation strategy', 'Dependency scanning setup', 'CSP and security headers', 'Compliance posture (LGPD, PCI DSS, GDPR, BCB, etc.) when the project carries it', 'Threat model summary when sensitivity warrants it'],
    scopeOut: ['Internal pentest findings still unpatched (keep confidential)', 'Business logic unrelated to security (lives in ARCHITECTURE.md)', 'Aspirational future work (lives in docs/PLANS.md)'],
    assumptions: ['.env.example exists or will be created', 'Project has auth if applicable', 'Dependency scanner is configured or planned'],
    risks: [{ risk: 'Auth logic spread across middleware, handlers, and controllers', mitigation: 'Wave 1 maps ALL auth touchpoints before writing to avoid gaps' }],
    sectionsToWrite: ['Auth Flow', 'Secret Management', 'Input Validation', 'Dependencies', 'Headers and CSP'],
    reviewChecklist: ['No secret values in markdown', 'Every claim links to code or to a real config file', 'Coverage matches what the project does (OWASP, compliance, threat model — only what is relevant)', 'No placeholder text'],
    compoundOpportunity: 'Security incident root causes and surprising vulnerability patterns belong in docs/compound/ as security gotchas.',
    exitCriteria: ['harness:validate passes', 'Each H2 reflects code reality or carries an explicit TODO when not identifiable', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-security-md.md',
    detectionSignals: ['process\\.env\\.', 'JWT_SECRET', 'cors\\(', 'bcrypt', 'helmet', 'csrf'],
    mustCover: {
      'Auth Flow': ['auth mechanism', 'token lifetime and rotation'],
      'Secret Management': ['.env.example coverage', 'secret rotation process'],
      'Input Validation': ['validation library or approach', 'where validation happens'],
      'Dependencies': ['dependency scanning tool', 'known CVE remediation process'],
      'Headers and CSP': ['CSP policy', 'security headers list'],
    },
    linkTargets: ['docs/MERGE_GATES.md', 'ARCHITECTURE.md'],
    stackVariants: {
      rails: 'Rails — devise/rack-attack, config/initializers/content_security_policy.rb',
      nextjs: 'Next.js — next-auth, middleware.ts CSP, security headers in next.config',
      'node-ts': 'Node-TS — passport/jose, helmet middleware, express-validator',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/design-docs/core-beliefs.md', {
    goal: 'Document the senior engineering principles that govern quality, security, and architecture defaults across all projects using this plugin.',
    scopeIn: ['Quality principles', 'Security defaults', 'Architecture defaults', 'When to push back'],
    scopeOut: ['Project-specific decisions (lives in docs/design-docs/ADR-*.md)', 'Style rules (lives in docs/CODE_STYLE.md)'],
    assumptions: ['Team has internalized XP discipline', 'This file is read by all agents before major decisions'],
    risks: [{ risk: 'Principles stated here conflict with CLAUDE.md global instructions', mitigation: 'Core beliefs inherit from CLAUDE.md; any conflict means CLAUDE.md wins' }],
    sectionsToWrite: ['Quality Principles', 'Security Defaults', 'Architecture Defaults', 'Push Back Triggers'],
    reviewChecklist: ['No conflicting instructions with CLAUDE.md', 'Each principle is actionable', 'No placeholder text'],
    compoundOpportunity: 'Principles discovered through hard lessons belong here after surviving two projects.',
    exitCriteria: ['harness:validate passes', 'Each principle cites a rationale', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-design-docs-core-beliefs-md.md',
    detectionSignals: ['docs/design-docs/', 'docs/compound/', 'ADR-', 'CLAUDE.md'],
    mustCover: {
      'Quality Principles': ['definition of done', 'quality gates'],
      'Security Defaults': ['minimum security baseline', 'never-do list'],
      'Architecture Defaults': ['default architectural patterns', 'when to deviate'],
      'Push Back Triggers': ['signals that requirements need challenge', 'how to raise concerns'],
    },
    linkTargets: ['docs/PRODUCT_SENSE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/generated/db-schema.md', {
    goal: 'Provide a human-readable snapshot of the database schema: tables, key columns, relationships, and index hints for query optimization.',
    scopeIn: ['Table list with column summaries', 'Primary and foreign key relationships', 'Index hints', 'Migration history pointer'],
    scopeOut: ['Full migration files (live in db/migrate/ or equivalent)', 'ORM model code'],
    assumptions: ['Project uses a relational database', 'Migrations or schema file is accessible'],
    risks: [{ risk: 'Generated snapshot goes stale after schema migrations', mitigation: 'Mark as generated and recommend regenerating after migrations' }],
    sectionsToWrite: ['Tables', 'Relationships', 'Indexes', 'Migration History'],
    reviewChecklist: ['Tables listed match actual migration files', 'Foreign key relationships are correct', 'Marked as generated (not authoritative)', 'No placeholder text'],
    compoundOpportunity: 'Schema design patterns or surprising query performance issues belong in docs/compound/ as DB notes.',
    exitCriteria: ['harness:validate passes', 'Table count matches actual schema', 'Marked as generated and dated'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-generated-db-schema-md.md',
    detectionSignals: ['CREATE TABLE', 'db/migrate/', 'prisma/schema.prisma', 'schema.rb', 'migrations/'],
    mustCover: {
      'Tables': ['table list with column summaries', 'primary keys noted'],
      'Relationships': ['foreign key relationships', 'join table semantics'],
      'Indexes': ['index list', 'query optimization hints'],
      'Migration History': ['pointer to migrations directory', 'schema version'],
    },
    linkTargets: ['ARCHITECTURE.md', 'docs/SECURITY.md'],
    stackVariants: {
      rails: 'Rails — db/schema.rb + db/migrate/ directory',
      nextjs: 'Next.js — prisma/schema.prisma or drizzle schema',
      'node-ts': 'Node-TS — prisma/schema.prisma, knexfile.ts, or drizzle',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: ['ARCHITECTURE.md'],
  }],

  // ===== Extras AVC (4) =====
  ['docs/MERGE_GATES.md', {
    goal: 'Define the binary merge gates that block PR merges: linting, type-checking, test coverage, and security scan thresholds.',
    scopeIn: ['Lint gate (eslint, biome, or rubocop)', 'Type-check gate', 'Test coverage threshold', 'Security scan gate', 'Performance budget gate if applicable'],
    scopeOut: ['Scoring rubric (lives in docs/QUALITY_SCORE.md)', 'Style preferences (lives in docs/CODE_STYLE.md)'],
    assumptions: ['CI is configured or will be', 'Test suite exists'],
    risks: [{ risk: 'Gate thresholds become aspirational rather than enforced', mitigation: 'Link each gate to the CI step that enforces it' }],
    sectionsToWrite: ['Lint Gate', 'Type Check Gate', 'Test Coverage Gate', 'Security Scan Gate', 'Enforcement'],
    reviewChecklist: ['Each gate links to CI config', 'Thresholds are numbers not ranges', 'No placeholder text'],
    compoundOpportunity: 'Gates that catch real bugs before merge belong in docs/compound/ as quality wins.',
    exitCriteria: ['harness:validate passes', 'All gates link to CI enforcement', 'Coverage threshold is a number'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-merge_gates-md.md',
    detectionSignals: ['.github/workflows/', 'eslint', 'biome.json', 'rubocop', 'coverage threshold'],
    mustCover: {
      'Lint Gate': ['linter name', 'link to CI step'],
      'Type Check Gate': ['type checker command', 'strict mode status'],
      'Test Coverage Gate': ['coverage threshold number', 'coverage tool'],
      'Security Scan Gate': ['scanner name', 'block on high severity'],
      'Enforcement': ['CI platform', 'branch protection rules'],
    },
    linkTargets: ['docs/QUALITY_SCORE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/CODE_STYLE.md', {
    goal: 'Document the code style conventions for this project: naming, formatting, patterns to prefer, and anti-patterns to avoid.',
    scopeIn: ['Naming conventions (files, variables, functions)', 'Formatting rules (enforced by linter vs by convention)', 'Preferred patterns (hash maps over switch, etc.)', 'Anti-patterns with rationale'],
    scopeOut: ['Architecture decisions (lives in ARCHITECTURE.md)', 'Visual design tokens (lives in docs/DESIGN.md)'],
    assumptions: ['Linter is configured', 'Team has agreed on baseline style'],
    risks: [{ risk: 'Style doc contradicts linter config', mitigation: 'Style doc describes intent; linter config is the enforcer — link linter config from each rule' }],
    sectionsToWrite: ['Naming Conventions', 'Formatting Rules', 'Preferred Patterns', 'Anti-Patterns'],
    reviewChecklist: ['Each rule links to linter config or example', 'Anti-patterns have rationale', 'No placeholder text'],
    compoundOpportunity: 'Style violations that caused real bugs (e.g. naming confusion leading to wrong var) belong in docs/compound/.',
    exitCriteria: ['harness:validate passes', 'Each anti-pattern has a concrete rationale', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-code_style-md.md',
    detectionSignals: ['.eslintrc', 'biome.json', '.rubocop.yml', '.editorconfig', 'prettier.config'],
    mustCover: {
      'Naming Conventions': ['file naming', 'variable/function naming'],
      'Formatting Rules': ['enforced rules vs convention-only', 'formatter config link'],
      'Preferred Patterns': ['hash maps over switch', 'early returns', 'functional patterns'],
      'Anti-Patterns': ['patterns to avoid', 'rationale per anti-pattern'],
    },
    linkTargets: ['docs/QUALITY_SCORE.md'],
    stackVariants: {
      rails: 'Rails — RuboCop rules, Ruby idioms',
      nextjs: 'Next.js — ESLint/Biome, TypeScript strict, React patterns',
      'node-ts': 'Node-TS — ESLint/Biome, TypeScript strict, no-any rule',
    },
    validationCommand: 'bun run harness:validate',
    dependsOn: [],
  }],

  ['docs/STATE.md', {
    goal: 'Capture the current state snapshot of this project installation: detected stack, manifest version, init date, and enabled features.',
    scopeIn: ['Detected stack (primary, secondary)', 'Manifest version', 'Init date', 'Enabled features and flags'],
    scopeOut: ['Execution plan history (lives in docs/exec-plans/)', 'Architecture (lives in ARCHITECTURE.md)'],
    assumptions: ['STATE.md is auto-generated or semi-auto by /init', 'Stack detection has run'],
    risks: [{ risk: 'STATE.md manually edited and diverges from actual state', mitigation: 'Treat as generated; do not hand-edit except for overrides section' }],
    sectionsToWrite: ['Detected Stack', 'Manifest Version', 'Init Date', 'Enabled Features'],
    reviewChecklist: ['Stack matches package.json or Gemfile', 'Version matches installed manifest', 'No placeholder text'],
    compoundOpportunity: 'If init state detection proves wrong across projects, capture as a detect-stack gotcha.',
    exitCriteria: ['harness:validate passes', 'Detected stack matches codebase signals', 'Init date is present'],
    guidanceFile: 'skills/init/assets/populate-guidance/docs-state-md.md',
    detectionSignals: ['package.json', 'Gemfile', 'requirements.txt', 'manifest', 'schemaVersion'],
    mustCover: {
      'Detected Stack': ['primary stack id', 'secondary stacks if any'],
      'Manifest Version': ['installed manifest version', 'checksum'],
      'Init Date': ['ISO date of last init run'],
      'Enabled Features': ['feature flags active', 'optional steps that ran'],
    },
    linkTargets: ['ARCHITECTURE.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: ['ARCHITECTURE.md'],
  }],

  ['.claude/CLAUDE.md', {
    goal: 'Mirror the canonical AGENTS.md content so Claude agents reading .claude/CLAUDE.md get the same operating contract as agents reading AGENTS.md.',
    scopeIn: ['Operating contract (mirror from AGENTS.md)', 'Link to AGENTS.md as source of truth'],
    scopeOut: ['Original content (lives in AGENTS.md)', 'Project context (lives in ARCHITECTURE.md)'],
    assumptions: ['AGENTS.md is already populated', '.claude/ directory exists from scaffold'],
    risks: [{ risk: 'AGENTS.md updated without updating .claude/CLAUDE.md', mitigation: 'CLAUDE.md should contain a link + note directing editors to update AGENTS.md first' }],
    sectionsToWrite: ['Mirror Notice', 'Operating Contract'],
    reviewChecklist: ['Content matches AGENTS.md within one review cycle', 'Mirror notice is first section', 'No placeholder text'],
    compoundOpportunity: 'If dual-file sync becomes a maintenance burden, consider automation and capture the decision in docs/design-docs/ADR.',
    exitCriteria: ['harness:validate passes', 'AGENTS.md and .claude/CLAUDE.md content match (or explicit note explains intentional divergence)', 'Zero placeholder lines'],
    guidanceFile: 'skills/init/assets/populate-guidance/claude-claude-md.md',
    detectionSignals: ['subagent_type:', 'MCP', 'allowed-tools:', 'mcpServers'],
    mustCover: {
      'Mirror Notice': ['explicit mirror notice', 'link to AGENTS.md as source of truth'],
      'Operating Contract': ['mirrored content from AGENTS.md', 'last sync date'],
    },
    linkTargets: ['AGENTS.md'],
    validationCommand: 'bun run harness:validate',
    dependsOn: ['AGENTS.md'],
  }],
])

// Mapa de paths de descoberta por doc + stack. Wave 1 = paths a LER antes de escrever.
// Para docs sem variacao por stack, 'default' se aplica a qualquer stack.
// DI-Plano04-fase02-stackid-node-ts: usa StackId real ('node-ts', 'nextjs', 'rails') — nao 'nodejs-typescript'.
// 'nextjs' e 'node-ts' mapeam para o mesmo matrix folder, por isso ambos usam src/.
type CodePathEntry = Partial<Record<Exclude<StackId, 'unknown'>, ReadonlyArray<string>>> & {
  default?: ReadonlyArray<string>
}

const CODE_PATHS_BY_DOC: ReadonlyMap<string, CodePathEntry> = new Map([
  ['docs/FRONTEND.md', {
    'node-ts': ['src/app/', 'src/components/', 'tailwind.config.ts', 'src/app/globals.css'],
    'nextjs': ['src/app/', 'src/components/', 'tailwind.config.ts', 'next.config.ts'],
    'rails': ['app/views/', 'app/assets/', 'app/javascript/', 'config/routes.rb'],
    'laravel': ['resources/views/', 'resources/js/', 'resources/css/', 'routes/web.php'],
    'python': ['templates/', 'static/', 'static/css/', 'urls.py'],
  }],
  ['docs/SECURITY.md', {
    'node-ts': ['src/middleware.ts', 'src/lib/auth/', '.env.example', 'package.json'],
    'nextjs': ['src/middleware.ts', 'src/lib/auth/', '.env.example', 'next.config.ts'],
    'rails': ['app/controllers/application_controller.rb', 'config/initializers/', '.env.example', 'Gemfile'],
    'laravel': ['app/Http/Middleware/', 'config/auth.php', '.env.example', 'composer.json'],
    'python': ['middleware.py', 'settings.py', '.env.example', 'requirements.txt'],
  }],
  ['ARCHITECTURE.md', {
    'node-ts': ['src/', 'package.json', 'tsconfig.json'],
    'nextjs': ['src/', 'package.json', 'next.config.ts', 'next.config.js'],
    'rails': ['app/', 'config/application.rb', 'Gemfile', 'config/routes.rb'],
    'laravel': ['app/', 'composer.json', 'routes/web.php', 'config/app.php'],
    'python': ['manage.py', 'requirements.txt', 'settings.py', 'urls.py'],
  }],
  ['docs/DESIGN.md', {
    'node-ts': ['tailwind.config.ts', 'src/app/globals.css', 'src/components/ui/'],
    'nextjs': ['tailwind.config.ts', 'src/app/globals.css', 'src/components/ui/'],
    'rails': ['app/assets/stylesheets/', 'app/javascript/', 'config/initializers/'],
    'laravel': ['resources/css/', 'resources/js/', 'tailwind.config.js'],
    'python': ['static/css/', 'static/js/', 'templates/base.html'],
  }],
  ['docs/RELIABILITY.md', {
    'node-ts': ['src/lib/', 'package.json', 'src/app/api/', '.env.example'],
    'nextjs': ['src/lib/', 'package.json', 'src/app/api/', 'next.config.ts'],
    'rails': ['config/application.rb', 'config/environments/', 'Gemfile', 'log/'],
    'laravel': ['config/logging.php', 'app/Exceptions/', 'composer.json'],
    'python': ['settings.py', 'requirements.txt', 'manage.py', 'wsgi.py'],
  }],
  ['docs/generated/db-schema.md', {
    'node-ts': ['prisma/schema.prisma', 'drizzle/', 'knexfile.ts', 'migrations/'],
    'nextjs': ['prisma/schema.prisma', 'drizzle/', 'migrations/'],
    'rails': ['db/schema.rb', 'db/migrate/', 'config/database.yml'],
    'laravel': ['database/migrations/', 'database/schema.sql', 'config/database.php'],
    'python': ['models.py', 'migrations/', 'settings.py'],
  }],
  // Docs sem variacao relevante por stack usam default
  ['README.md', {
    default: ['package.json', 'Gemfile', 'requirements.txt', 'Makefile', '.env.example'],
  }],
  ['docs/QUALITY_SCORE.md', {
    default: ['package.json', '.eslintrc*', 'biome.json', '.rubocop.yml', 'pytest.ini'],
  }],
  ['docs/PLANS.md', {
    default: ['docs/exec-plans/active/', 'docs/exec-plans/completed/', 'scripts/new-plan.ts'],
  }],
  ['docs/PRODUCT_SENSE.md', {
    default: ['docs/exec-plans/active/', 'docs/exec-plans/completed/', 'CHANGELOG.md'],
  }],
  ['docs/MERGE_GATES.md', {
    default: ['.github/workflows/', 'package.json', '.eslintrc*', 'biome.json', '.rubocop.yml'],
  }],
  ['docs/CODE_STYLE.md', {
    'node-ts': ['.eslintrc*', 'biome.json', 'tsconfig.json', 'package.json'],
    'nextjs': ['.eslintrc*', 'biome.json', 'tsconfig.json', 'next.config.ts'],
    'rails': ['.rubocop.yml', 'Gemfile', '.editorconfig'],
    'laravel': ['.phpcs.xml', 'composer.json', '.editorconfig'],
    'python': ['pyproject.toml', '.flake8', '.pylintrc', 'requirements.txt'],
  }],
  ['docs/STATE.md', {
    default: ['package.json', 'Gemfile', 'requirements.txt', 'composer.json', '.claude/'],
  }],
  ['docs/design-docs/core-beliefs.md', {
    default: ['docs/design-docs/', 'docs/compound/', 'ARCHITECTURE.md'],
  }],
  ['.claude/CLAUDE.md', {
    default: ['AGENTS.md', '.claude/'],
  }],
])

// 2026-05-22 (Luiz/dev): documentos pre-existentes que cada doc canonico DEVE escanear
// antes de grepar codigo. Origem do gap descoberto no tracer-bullet SECURITY: LLM ignorava
// SECURITY_AUDIT*.md, COMPLIANCE.md, .claude/rules/*, .claude/progress.txt — onde reside
// muito do conteudo "senior" que aparecia no output do Andre. Paths sao glob-style; se
// nao existirem no projeto-alvo, LLM apenas pula (TODO opcional).
const EXISTING_DOCS_TO_SCAN_BY_DOC: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ['docs/SECURITY.md', [
    'docs/SECURITY_AUDIT*.md',
    'docs/SECURITY_COMPLIANCE.md',
    'docs/COMPLIANCE.md',
    'docs/PCI*.md',
    'docs/LGPD*.md',
    '.claude/rules/security-patterns.md',
    '.claude/progress.txt (grep: gotcha, CWE-, security, auth, JWT, RLS, webhook)',
    '.claude/senior-principles.md',
    'docs/DECISIONS.md (grep: auth, secret, RLS, webhook, crypto)',
    'docs/design-docs/ADR-*.md (filtrar por seguranca)',
    'docs/compound/*.md (filtrar: category security, CWE, OWASP, incidente)',
    'docs/BUGS_ATIVOS.md (itens com tag security/auth/PII)',
    'docs/DEBITOS_TECNICOS.md (secao Seguranca)',
    'docs/RUNBOOK*.md, docs/PLAYBOOK*.md, docs/INCIDENT*.md',
  ]],
  ['docs/RELIABILITY.md', [
    'docs/RUNBOOK*.md, docs/PLAYBOOK*.md, docs/INCIDENT*.md',
    'docs/BUGS_ATIVOS.md (incidentes recentes)',
    'docs/DEBITOS_TECNICOS.md (secao Confiabilidade/Performance)',
    '.claude/progress.txt (grep: incidente, outage, rollback, cron, retry, fallback)',
    'docs/compound/*.md (filtrar: incidente, postmortem, regressao)',
    'docs/DECISIONS.md (grep: SLO, retry, fallback, observability)',
    'docs/design-docs/ADR-*.md (filtrar por reliability)',
  ]],
  ['docs/DESIGN.md', [
    'docs/DESIGN_SYSTEM*.md',
    'docs/DESIGN_QUICK_REFERENCE*.md',
    '.claude/skills/*/SKILL.md (procurar design-system local)',
    'docs/compound/*.md (filtrar: design, ui, ux)',
    'docs/design-docs/ADR-*.md (filtrar por design system)',
  ]],
  ['docs/FRONTEND.md', [
    '.claude/rules/typescript-standards.md',
    '.claude/rules/code-quality.md',
    'docs/DEBITOS_TECNICOS.md (secao Frontend)',
    'docs/BUGS_ATIVOS.md (bugs de UI/UX)',
    'docs/compound/*.md (filtrar: react, hook, render, performance frontend)',
    'docs/DECISIONS.md (grep: react, hook, state management, routing)',
  ]],
  ['ARCHITECTURE.md', [
    'docs/DECISIONS.md (grep: arquitetura, monolito, micro, layer)',
    'docs/design-docs/ADR-*.md (TODOS os ADRs sao input para ARCHITECTURE)',
    '.claude/progress.txt (grep: refactor, layer, boundary, decisao)',
    'docs/compound/*.md (filtrar: arquitetura, modelagem, layer)',
    'docs/DEBITOS_TECNICOS.md (secao Arquitetura)',
    'README.md (descricao de alto nivel ja existente)',
  ]],
  ['AGENTS.md', [
    '.claude/CLAUDE.md',
    '.claude/senior-principles.md',
    '.claude/rules/*.md (catalogo de regras)',
    '.claude/agents/*.md (catalogo de subagentes)',
    'docs/PIPELINE.md',
    'docs/AGENTS_LIST.md',
  ]],
  ['docs/QUALITY_SCORE.md', [
    'docs/DEBITOS_TECNICOS.md (input direto para Known Gaps)',
    'docs/BUGS_ATIVOS.md (input direto para Known Gaps)',
    'docs/SECURITY_AUDIT*.md (findings entram em Strengths/Gaps por dimensao)',
    'docs/compound/*.md (lessons learned ja capturadas)',
  ]],
  ['docs/PRODUCT_SENSE.md', [
    'docs/PRODUCT_OVERVIEW.md',
    'docs/FEATURES.md',
    'docs/BACKLOG.md (prioridades atuais informam tradeoffs)',
    'README.md (descricao publica do produto)',
    'docs/DECISIONS.md (grep: feature, product, user, scope)',
  ]],
  ['docs/design-docs/core-beliefs.md', [
    '.claude/senior-principles.md',
    '.claude/CLAUDE.md',
    'docs/compound/*.md (padroes recorrentes)',
  ]],
  ['README.md', [
    'docs/PRODUCT_OVERVIEW.md',
    'docs/FEATURES.md (features implementadas e status)',
    'docs/BACKLOG.md (prioridades atuais)',
    'CHANGELOG.md (historico de versoes)',
    '.claude/progress.txt (grep: status, mvp, release, what is)',
  ]],
  ['docs/PLANS.md', [
    'docs/exec-plans/active/README.md',
    'docs/exec-plans/completed/README.md',
    'docs/exec-plans/tech-debt-tracker.md',
    'docs/exec-plans/completed/*.md (sample — entender formato de planos ja concluidos)',
  ]],
  ['docs/generated/db-schema.md', [
    'docs/DECISIONS.md (grep: schema, migration, table, index, constraint, RLS, BYTEA)',
    'docs/DEBITOS_TECNICOS.md (secao banco de dados, migrations pendentes)',
    'docs/compound/*.md (filtrar: schema, migration, query, RLS, index, gotcha DB)',
    '.claude/progress.txt (grep: migration, schema, BYTEA, RLS, trigger, coluna)',
  ]],
  ['docs/MERGE_GATES.md', [
    '.github/workflows/*.yml (gates de CI ja configurados)',
    'docs/QUALITY_SCORE.md (thresholds de qualidade atuais)',
    '.claude/rules/testing-standards.md',
    '.claude/rules/code-quality.md',
    'docs/DEBITOS_TECNICOS.md (itens que precisam de gate — fat components, eslint-disable)',
    'docs/compound/*.md (filtrar: qualidade, cobertura, lint, CI, gate)',
  ]],
  ['docs/CODE_STYLE.md', [
    '.claude/rules/code-quality.md',
    '.claude/rules/typescript-standards.md',
    'docs/DEBITOS_TECNICOS.md (secao codigo duplicado, fat components, no-unused-vars, console.log)',
    'docs/compound/*.md (filtrar: padrao de codigo, anti-pattern, refatoracao)',
    '.claude/progress.txt (grep: style, convention, anti-pattern, padrao, gotcha)',
    'docs/DECISIONS.md (grep: naming, convention, code style)',
  ]],
  ['docs/STATE.md', [
    '.claude/ (diretorio completo — estado instalado do plugin)',
    'docs/exec-plans/active/ (planos em andamento — informa "pending work")',
    'docs/exec-plans/tech-debt-tracker.md',
    'plugin-manifest.json',
  ]],
])

/**
 * Retorna Wave 1 (discovery, stack-aware) e Wave 2 (write sections) para um doc canonico.
 * Plano 04 fase-02 — CA-04 do PRD: Rails → app/views/app/assets em FRONTEND.md,
 * Node-TS → src/ paths. G3 do README: paths vivem em CODE_PATHS_BY_DOC, nao concatenados.
 *
 * 2026-05-22 (Luiz/dev): Wave 1 agora prepende existingDocs (docs/audits/gotchas/ADRs
 * pre-existentes) antes dos paths de codigo stack-specific. Origem: tracer-bullet SECURITY
 * revelou que LLM-senior precisa ler artefatos existentes (auditorias, compound, gotchas)
 * antes de grepar codigo — sem isso o output regrediu ao escopo "grep-only" do Andre.
 */
export function buildWavesForDoc(doc: string, stack: StackId | null): ReadonlyArray<Wave> {
  const pathsEntry = CODE_PATHS_BY_DOC.get(doc)
  const existingDocs = EXISTING_DOCS_TO_SCAN_BY_DOC.get(doc) ?? []
  const existingItems: ReadonlyArray<string> = existingDocs.map(
    p => `Scan existing artifact \`${p}\` if present (skip silently if absent)`,
  )
  if (!pathsEntry) {
    const fallbackItems = existingItems.length > 0
      ? [...existingItems, `Then read the codebase to find inputs relevant to ${doc}`]
      : [`Read the codebase to find inputs relevant to ${doc}`]
    return [
      { name: 'Wave 1 — Discovery', items: fallbackItems },
      { name: 'Wave 2 — Write sections', items: ['Write each section listed in sectionsToWrite'] },
    ]
  }

  // Resolve paths por stack — fallback para default se stack-specific ausente ou stack=null.
  const stackKey = stack && stack !== 'unknown' ? stack : undefined
  const stackPaths = (stackKey && pathsEntry[stackKey]) ?? pathsEntry.default ?? []
  const codeItems: ReadonlyArray<string> = stackPaths.length > 0
    ? stackPaths.map(p => `Read \`${p}\``)
    : [`Read the codebase to find inputs relevant to ${doc}`]

  // Existing artifacts (auditorias, compound, gotchas, ADRs) PRIMEIRO; codigo depois.
  const wave1Items: ReadonlyArray<string> = [...existingItems, ...codeItems]

  return [
    { name: 'Wave 1 — Discovery', items: wave1Items },
    { name: 'Wave 2 — Write sections', items: ['Write each section listed in sectionsToWrite (one H2 per item).'] },
  ]
}
