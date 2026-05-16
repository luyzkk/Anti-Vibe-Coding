<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): /decision-registry preface — alinhado com PRD §RF-SH-05`
-->

# Fase 02: Preface em 2 skills Should Have (/decision-registry + /lessons-learned)

**Plano:** 04 — profile-aware-preface ×4-6 skills
**Sizing:** ~1h
**Depende de:** fase-01 (pattern provado em 4 skills Must Have)
**Visual:** false

---

## O que esta fase entrega

Aplica o mesmo padrão `profile-aware-preface` a `/decision-registry` e `/lessons-learned` (candidatos RF-SH-05) — totalizando 6 skills com preface no fim de v6.3.0. Cada skill que se mostrar inadequada durante a implementação pode ser SKIPADA com decisão registrada em MEMORY.md; o RF-SH-05 explicitamente permite "candidates, choice open".

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/decision-registry/SKILL.md` | Modify | Inserir bloco preface entre frontmatter e H1 (mesma estrutura da fase-01) |
| `skills/decision-registry/lib/decision-registry-prefaces.ts` | Create | Lookup table per-skill |
| `skills/decision-registry/lib/decision-registry-prefaces.test.ts` | Create | Teste mínimo |
| `skills/lessons-learned/SKILL.md` | Modify | Inserir bloco preface (ou SKIP — ver Passo 0) |
| `skills/lessons-learned/lib/lessons-learned-prefaces.ts` | Create | Lookup table (ou SKIP) |
| `skills/lessons-learned/lib/lessons-learned-prefaces.test.ts` | Create | Teste (ou SKIP) |
| `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/plano04/MEMORY.md` | Modify | Registrar decisão de SKIP se aplicável (G6 do plano) |

---

## Implementacao

### Passo 0: Decisão de inclusão por skill (G6 do plano)

Antes de adicionar preface, perguntar para cada skill:

> "A skill consulta código do projeto / depende de profile arquitetural para emitir output adaptado?"

- **`/decision-registry`** — registra ADRs. Profile influencia caveats sobre forma de armazenar decisões (ex: `nextjs-app-router` sugere ADR em `docs/design-docs/`; `mvc-flat` pode ter convenção própria). **Vereditc: provável inclusão útil.**
- **`/lessons-learned`** — registra lições. Profile influencia categorização (`[Arquitetura]` específica de Clean Arch vs MVC, etc). **Veredict: marginal. Decidir durante implementação:**
  - Se preface adiciona valor (ex: sugerir tag `[Next-Specific]` quando profile é `nextjs-app-router`) → incluir.
  - Se preface é cosmético (skill é meta-orquestradora pura) → SKIPAR.

Decisão DEVE ser registrada em `MEMORY.md` da pasta plano04 antes de prosseguir.

### Passo 1: Criar lookup table — /decision-registry

```typescript
// 2026-05-15 (Luiz/dev): decision-registry-prefaces.ts — alinhado com PRD v6.3.0 §RF-SH-05
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const DECISION_REGISTRY_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Sugestão: ADRs em `docs/design-docs/ADR-NNNN-*.md` (convenção v6).',
    'Considere registrar decisões sobre: Server Components default, edge runtime, ISR vs SSG.',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Sugestão: ADRs em `docs/design-docs/` ou `.claude/decisions.md` legado.',
    'Considere registrar decisões sobre: framework HTTP, ORM choice, deployment topology.',
  ].join('\n'),
}

export const DEFAULT_DECISION_REGISTRY_PREFACE = '' // CA-02
```

### Passo 2: Inserir bloco preface no SKILL.md — /decision-registry

Mesmo padrão da fase-01 — inserir bloco entre frontmatter YAML (linhas 1-8) e H1 `# Registro de Decisoes Arquiteturais`. Não há telemetry block atual em `/decision-registry`, então o bloco preface vai direto entre frontmatter e H1.

```markdown
<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-02 — profile-aware-preface (PRD §RF-SH-05).
// Mesmo pattern de /security (fase-01); per-skill lookup; fallback v6.2 quando profile null.

import { readPrefaceContext } from '../lib/preface-context'
import {
  DECISION_REGISTRY_PREFACE_BY_PROFILE,
  DEFAULT_DECISION_REGISTRY_PREFACE,
} from './lib/decision-registry-prefaces'

const ctx = readPrefaceContext()
const preface = ctx.profile
  ? (DECISION_REGISTRY_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_DECISION_REGISTRY_PREFACE)
  : DEFAULT_DECISION_REGISTRY_PREFACE
```

Se `preface` for não-vazio, prepend ao output principal.
Se vazio (profile null), comportamento v6.2 intacto — sem preface (CA-02).
<!-- profile-aware-preface:end -->
```

### Passo 3: Teste — /decision-registry

```typescript
// 2026-05-15 (Luiz/dev): decision-registry-prefaces.test.ts — RF-SH-05
import { describe, expect, test } from 'bun:test'
import {
  DECISION_REGISTRY_PREFACE_BY_PROFILE,
  DEFAULT_DECISION_REGISTRY_PREFACE,
} from '../decision-registry-prefaces'

describe('decision-registry-prefaces lookup', () => {
  test('nextjs-app-router preface mentions App Router convention', () => {
    const result = DECISION_REGISTRY_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
  })

  test('mvc-flat preface mentions MVC convention', () => {
    const result = DECISION_REGISTRY_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toContain('MVC flat')
  })

  test('DEFAULT is empty string — CA-02 v6.2 preserved', () => {
    expect(DEFAULT_DECISION_REGISTRY_PREFACE).toBe('')
  })
})
```

### Passo 4: Replicar para /lessons-learned (ou SKIPAR)

Se a decisão do Passo 0 foi INCLUIR:
- Criar `skills/lessons-learned/lib/lessons-learned-prefaces.ts` análogo.
- Inserir bloco preface no `skills/lessons-learned/SKILL.md`.
- Criar teste.

Se SKIPAR:
- Adicionar entry em `MEMORY.md`:
  ```markdown
  - **DEV-1:** /lessons-learned skipado — meta-skill orquestradora sem dependência de profile arquitetural
    - Motivo: preface adicionaria string vazia ou cosmética; valor zero
    - Lesson candidate para fase-04 compound note
  ```
- Atualizar contagem: total final = 5 skills com preface (4 Must + 1 Should).

---

## Gotchas

- **G6 do plano:** SKIP é resultado válido para RF-SH-05. Documentar decisão em MEMORY.md. Não forçar adoção mecânica quando o preface seria string vazia.
- **G1 do plano:** Em ambas as skills, NÃO há telemetry block atual — preface vai entre frontmatter YAML e H1.
- **G5 do plano:** DEFAULT = `''` (string vazia). Não copiar/paraphrasing do corpo da skill.
- **Local — `/decision-registry` write semantics:** A skill tem `allowed-tools: Read, Grep, Glob, Write, Edit` (não apenas Read como as 4 da fase-01). O preface NÃO afeta o `allowed-tools` — apenas o conteúdo abaixo do frontmatter.
- **Local — `/lessons-learned` filtro de qualidade:** Se incluir preface, NÃO sugerir relaxar o "filtro de qualidade senior" (>=2 critérios) baseado em profile. Filtro é universal; preface só sugere categorização.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test -- decision-registry-prefaces` falha (módulo não existe).
- [ ] **GREEN:** Tabela criada, teste passa (`3 passed, 0 failed`).
- [ ] **(Condicional) RED/GREEN para `lessons-learned-prefaces`** se decisão foi INCLUIR.

### Checklist

- [ ] Decisão de inclusão/SKIP de `/lessons-learned` registrada em MEMORY.md
- [ ] `skills/decision-registry/SKILL.md` contém os 3 markers (start, end, readPrefaceContext)
- [ ] `skills/decision-registry/lib/decision-registry-prefaces.ts` criado e exporta as 2 constantes
- [ ] Teste de `/decision-registry` verde
- [ ] (Condicional) Mesmo para `/lessons-learned` se incluído
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck limpo: `bun run typecheck` (se configurado)
- [ ] `bun run harness:validate` ainda passa (check da fase-03 ainda não adicionado)

---

## Criterio de Aceite

**Por máquina:**
- `grep -l "<!-- profile-aware-preface:start -->" skills/decision-registry/SKILL.md` retorna 1 path.
- (Condicional) `grep -l "<!-- profile-aware-preface:start -->" skills/lessons-learned/SKILL.md` retorna 1 path se incluído.
- Total de skills com bloco preface após fase-02: 5 ou 6 (depende do SKIP decision).
- `bun run test -- prefaces` continua verde com novos testes incluídos.

**Por humano:**
- Decisão de SKIP de `/lessons-learned` (se aplicável) registrada com justificativa em MEMORY.md
- Decisão refletida em fase-04 como candidato a compound lesson

**Referências PRD:**
- RF-SH-05: ✓ 2 skills adicionais (ou 1 + skip documentado) ganham preface
- CA-02: ✓ DEFAULT vazio preserva v6.2 quando profile null
- CA-09: ✓ slot composabilidade preservado

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
