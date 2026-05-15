<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): preface inicial alinhado com PRD v6.3.0 §RF-MH-05`
-->

# Fase 01: Preface block + lookup table nas 4 skills Must Have

**Plano:** 04 — profile-aware-preface ×4-6 skills
**Sizing:** ~1.5h
**Depende de:** Plano 01 fase-01 (readPrefaceContext disponível em `skills/lib/preface-context.ts`)
**Visual:** false (sem UI — apenas SKILL.md + lookup tables TS)

---

## O que esta fase entrega

Adiciona o bloco marcado `<!-- profile-aware-preface:start --> ... <!-- profile-aware-preface:end -->` consumindo `readPrefaceContext()` às 4 skills priorizadas (`/security`, `/api-design`, `/system-design`, `/design-patterns`), com lookup table per-skill cobrindo `nextjs-app-router` + `mvc-flat` e fallback ao default quando `profile: null` (RF-MH-05, CA-01, CA-02).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/SKILL.md` | Modify | Inserir bloco preface entre telemetry e H1 (mirror `/architecture` linhas 35-82) |
| `skills/security/lib/security-prefaces.ts` | Create | `SECURITY_PREFACE_BY_PROFILE` + `DEFAULT_SECURITY_PREFACE` |
| `skills/security/lib/security-prefaces.test.ts` | Create | 1 teste: nextjs-app-router retorna preface esperada; null → default |
| `skills/api-design/SKILL.md` | Modify | Mesma inserção |
| `skills/api-design/lib/api-design-prefaces.ts` | Create | Lookup table per-skill |
| `skills/api-design/lib/api-design-prefaces.test.ts` | Create | Teste analógico |
| `skills/system-design/SKILL.md` | Modify | Mesma inserção |
| `skills/system-design/lib/system-design-prefaces.ts` | Create | Lookup table per-skill |
| `skills/system-design/lib/system-design-prefaces.test.ts` | Create | Teste analógico |
| `skills/design-patterns/SKILL.md` | Modify | Mesma inserção |
| `skills/design-patterns/lib/design-patterns-prefaces.ts` | Create | Lookup table per-skill |
| `skills/design-patterns/lib/design-patterns-prefaces.test.ts` | Create | Teste analógico |

---

## Implementacao

### Passo 0: Validar bloqueador (Plano 01 fase-01 verde)

- [ ] Confirmar que `skills/lib/preface-context.ts` existe e exporta `readPrefaceContext`.
- [ ] Confirmar que `bun run test -- preface-context` passa (teste tracer bullet do Plano 01).
- [ ] Se algum dos dois falhar: PARAR. Plano 04 não inicia sem o helper.

### Passo 1: Criar lookup table per-skill (exemplo: /security)

Mirror de `skills/architecture/lib/architecture-recommendations.ts` — shape `Record<ArchitectureProfileName, string>`:

```typescript
// 2026-05-15 (Luiz/dev): security-prefaces.ts — alinhado com PRD v6.3.0 §RF-MH-05 + §Decisão #1
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const SECURITY_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Priorize análise de:',
    '- Server Actions (CSRF tokens, mutation auth)',
    '- API Route Handlers (rate limiting, input validation em app/api/**/route.ts)',
    '- Middleware (matchers, edge runtime constraints)',
    '- Use de "use server" e exposição acidental de funções server-only',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Priorize análise de:',
    '- Controllers (input validation antes de Service)',
    '- Repository queries (SQL injection, parametrização)',
    '- Session/cookie handling no middleware HTTP',
    '- Secrets em config files vs env vars',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
// Não paraphrasing do corpo da skill. Quando profile é null, skill roda como em v6.2.
export const DEFAULT_SECURITY_PREFACE = ''
```

### Passo 2: Inserir bloco preface no SKILL.md (exemplo: /security)

Inserir EXATAMENTE entre o final do bloco telemetry (linha ~33 em `/architecture`) e o `# Consultor de Segurança` (H1). Se a skill não tem telemetry block ainda, inserir antes do H1.

```markdown
<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-01 — profile-aware-preface (PRD §RF-MH-05).
// Lê context UMA vez via readPrefaceContext (Plano 01). Lookup table per-skill (G3).
// Quando ctx.profile === null: fallback default = comportamento v6.2 intacto (CA-02).

import { readPrefaceContext } from '../lib/preface-context'
import { SECURITY_PREFACE_BY_PROFILE, DEFAULT_SECURITY_PREFACE } from './lib/security-prefaces'

const ctx = readPrefaceContext()
const preface = ctx.profile
  ? (SECURITY_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_SECURITY_PREFACE)
  : DEFAULT_SECURITY_PREFACE

// Quando ctx.profile é não-nulo, prepend preface ao corpo da skill.
// Quando null, behavior idêntico a v6.2 (CA-02).
```

Se `preface` for não-vazio, inicie sua resposta com o conteúdo de `preface` e em seguida proceda com a consulta de segurança normal.
Se `preface` for vazio (profile null), comportamento v6.2 intacto — sem preface, ir direto ao corpo.
<!-- profile-aware-preface:end -->
```

### Passo 3: Teste por skill (RED → GREEN)

`skills/security/lib/security-prefaces.test.ts`:

```typescript
// 2026-05-15 (Luiz/dev): security-prefaces.test.ts — RF-MH-05 + CA-01 + CA-02
import { describe, expect, test } from 'bun:test'
import { SECURITY_PREFACE_BY_PROFILE, DEFAULT_SECURITY_PREFACE } from '../security-prefaces'

describe('security-prefaces lookup', () => {
  test('returns nextjs-specific preface for nextjs-app-router profile', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
    expect(result).toContain('Server Actions')
  })

  test('returns mvc-flat preface for mvc-flat profile', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toBeDefined()
    expect(result).toContain('MVC flat')
  })

  test('falls back to default when profile not in table (clean-architecture-ritual)', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['clean-architecture-ritual'] ?? DEFAULT_SECURITY_PREFACE
    expect(result).toBe(DEFAULT_SECURITY_PREFACE)
  })

  test('DEFAULT preserves v6.2 behavior — empty preface = no prepend (CA-02)', () => {
    expect(DEFAULT_SECURITY_PREFACE).toBe('')
  })
})
```

### Passo 4: Replicar para as outras 3 skills (api-design, system-design, design-patterns)

Mecânico — copiar pattern do `/security` e adaptar conteúdo de cada preface ao domínio da skill. Conteúdo sugerido (não-prescritivo, autor da skill ajusta):

- **/api-design** + `nextjs-app-router`: foco em route handlers, Server Actions como API, edge runtime limits.
- **/api-design** + `mvc-flat`: foco em controller-service-repo, REST resource modeling.
- **/system-design** + `nextjs-app-router`: foco em ISR, edge cache, Vercel constraints, serverless cold start.
- **/system-design** + `mvc-flat`: foco em monolito stateful, scaling vertical primeiro.
- **/design-patterns** + `nextjs-app-router`: foco em RSC composition, "use client" boundaries.
- **/design-patterns** + `mvc-flat`: foco em service layer purity, repository abstraction.

---

## Gotchas

- **G1 do plano:** Telemetry block precede preface, H1 sucede preface. Em `/security`, a SKILL.md atual NÃO tem telemetry block ainda — então o preface vai direto antes do H1 `# Consultor de Seguranca`. Em skills que recebam telemetry no futuro, o preface continua entre os dois.
- **G2 do plano:** Não tocar em `ctx.language` ou `ctx.framework` no código do preface — campos null reservados (PRD Decisão #2).
- **G3 do plano:** Cada skill ganha `lib/{skill}-prefaces.ts` própria. Não criar `skills/lib/all-prefaces.ts`.
- **G5 do plano:** `DEFAULT_*_PREFACE = ''` (string vazia). Preserva v6.2 quando profile é null (CA-02). Não copiar/paraphrasing do corpo da skill.
- **Local — frontmatter intacto:** A inserção do bloco preface NÃO toca o frontmatter YAML da SKILL.md (linhas 1-8 ou 1-9). `name`, `description`, `allowed-tools` continuam idênticos. Apenas content abaixo do frontmatter muda.
- **Local — `Partial<Record<...>>`:** Usar `Partial<Record<ArchitectureProfileName, string>>` (não `Record<...>` completo) — isso permite cobrir só `nextjs-app-router` + `mvc-flat` sem hack de undefined em runtime. Lookup com `?? DEFAULT` cobre o resto.

---

## Verificacao

### TDD

- [ ] **RED:** Teste de `security-prefaces` falha porque o módulo ainda não existe.
  - Comando: `bun run test -- security-prefaces`
  - Resultado esperado: `Cannot find module ... security-prefaces` ou `Expected nextjs-app-router preface, received undefined`

- [ ] **GREEN:** Tabela criada, teste passa.
  - Comando: `bun run test -- security-prefaces`
  - Resultado esperado: `4 passed, 0 failed`

- [ ] Repetir RED → GREEN para `api-design-prefaces`, `system-design-prefaces`, `design-patterns-prefaces`.

### Checklist

- [ ] Plano 01 fase-01 verde (bloqueador externo confirmado)
- [ ] `skills/security/SKILL.md` contém `<!-- profile-aware-preface:start -->` E `<!-- profile-aware-preface:end -->` E `readPrefaceContext`
- [ ] `skills/api-design/SKILL.md` mesmo
- [ ] `skills/system-design/SKILL.md` mesmo
- [ ] `skills/design-patterns/SKILL.md` mesmo
- [ ] 4 arquivos `*-prefaces.ts` exportam `*_PREFACE_BY_PROFILE` + `DEFAULT_*_PREFACE`
- [ ] 4 arquivos de teste passam (`bun run test -- prefaces`)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck limpo: `bun run typecheck` (se configurado)
- [ ] `bun run harness:validate` ainda passa (não regrediu — check da fase-03 ainda não foi adicionado, mas markdown structure check existente não pode quebrar)

---

## Criterio de Aceite

**Por máquina:**
- `grep -l "<!-- profile-aware-preface:start -->" skills/{security,api-design,system-design,design-patterns}/SKILL.md` retorna 4 paths.
- `grep -l "<!-- profile-aware-preface:end -->" skills/{security,api-design,system-design,design-patterns}/SKILL.md` retorna 4 paths.
- `grep -l "readPrefaceContext" skills/{security,api-design,system-design,design-patterns}/SKILL.md` retorna 4 paths.
- `bun run test -- prefaces` retorna `16 passed, 0 failed` (4 testes × 4 skills).
- `bun run test` ainda verde no resto da suite.

**Referências PRD:**
- RF-MH-05: ✓ 4 skills priorizadas com bloco preface
- CA-01: ✓ nextjs-app-router retorna preface específico
- CA-02: ✓ DEFAULT vazio quando profile null (comportamento v6.2 intacto)
- CA-09: ✓ shape `{profile, language, framework, confidence}` consumido sem hardcode em language/framework

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
