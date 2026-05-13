<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 01: Templates de todos os 14+ docs do harness (em EN)

**Plano:** 02 — Full Scaffold
**Sizing:** 3h
**Depende de:** Plano 01 fase-01 (formato `.tpl` com placeholders `{{PROJECT_NAME}}`/`{{STACK}}` ja estabelecido)
**Visual:** false

---

## O que esta fase entrega

Conjunto completo de templates `.tpl` em ingles para os 14+ documentos institucionais e estruturais do harness do Andre absorvidos pela v6.0.0 (D9, M2, D2). Tudo armazenado sob `anti-vibe-coding/skills/init/assets/templates/` e indexado em um manifest TS (`lib/template-manifest.ts`) que a fase-02 itera para gerar a arvore de arquivos.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/docs/DESIGN.md.tpl` | Create | Template (EN) — designsistema, tokens, tipografia |
| `anti-vibe-coding/skills/init/assets/templates/docs/FRONTEND.md.tpl` | Create | Template (EN) — placeholder com `<!-- N/A — replace when applicable -->` (G-A2) |
| `anti-vibe-coding/skills/init/assets/templates/docs/PLANS.md.tpl` | Create | Template (EN) — quando abrir exec-plan, como mante-lo |
| `anti-vibe-coding/skills/init/assets/templates/docs/PRODUCT_SENSE.md.tpl` | Create | Template (EN) — usuarios, outcomes, non-goals |
| `anti-vibe-coding/skills/init/assets/templates/docs/QUALITY_SCORE.md.tpl` | Create | Template (EN) — quality bar atual + gaps |
| `anti-vibe-coding/skills/init/assets/templates/docs/RELIABILITY.md.tpl` | Create | Template (EN) — SLOs, failure posture |
| `anti-vibe-coding/skills/init/assets/templates/docs/SECURITY.md.tpl` | Create | Template (EN) — security constraints + review checklist |
| `anti-vibe-coding/skills/init/assets/templates/docs/COMPOUND_ENGINEERING.md.tpl` | Create | Template (EN) — quando capturar lessons + Compound Decision Gate referencia |
| `anti-vibe-coding/skills/init/assets/templates/docs/design-docs/index.md.tpl` | Create | Template (EN) — indice dos design docs |
| `anti-vibe-coding/skills/init/assets/templates/docs/design-docs/core-beliefs.md.tpl` | Create | Template (EN) — operating principles for humans and agents |
| `anti-vibe-coding/skills/init/assets/templates/docs/exec-plans/active/README.md.tpl` | Create | Template (EN) — "active plans live here, completed move to ../completed/" |
| `anti-vibe-coding/skills/init/assets/templates/docs/exec-plans/completed/README.md.tpl` | Create | Template (EN) — historic plans index |
| `anti-vibe-coding/skills/init/assets/templates/docs/exec-plans/tech-debt-tracker.md.tpl` | Create | Template (EN) — tabela Impact/Owner/Next Step (G-A1: incluido) |
| `anti-vibe-coding/skills/init/assets/templates/docs/compound/README.md.tpl` | Create | Template (EN) — explica formato compound note + frontmatter |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/README.md.tpl` | Create | Template (EN) — indice |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/security.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/reliability.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/agent-api.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/frontend-ui.md.tpl` | Create | Template (EN) — placeholder N/A |
| `anti-vibe-coding/skills/init/assets/templates/docs/review-checklists/production-readiness.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/smoke-flows/README.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/product-specs/index.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/references/README.md.tpl` | Create | Template (EN) |
| `anti-vibe-coding/skills/init/assets/templates/docs/generated/db-schema.md.tpl` | Create | Template (EN) — placeholder N/A (G-A2) |
| `anti-vibe-coding/skills/init/assets/templates/TODO.md.tpl` | Create | Template (EN) — TODO.md raiz com 1 item de exemplo (S2, D8) |
| `anti-vibe-coding/skills/init/lib/template-manifest.ts` | Create | Manifest TS exportando array `TEMPLATE_MANIFEST: TemplateEntry[]` consumido pela fase-02 |
| `anti-vibe-coding/skills/init/lib/template-manifest.test.ts` | Create | Teste: cada entry do manifest aponta para arquivo `.tpl` que existe e e legivel |

**Total:** 25 templates `.tpl` + 1 manifest + 1 teste = **27 arquivos novos**.

---

## Implementacao

### Passo 1: Definir o tipo `TemplateEntry` e o manifest

Criar `anti-vibe-coding/skills/init/lib/template-manifest.ts`:

```typescript
// 2026-05-11 (Luiz/dev): manifest de templates do harness — Plano 02 fase-01.
// Alinhado com PRD M2 (estrutura completa) e D9 (/init absorve harness).
// Cada entrada mapeia source `.tpl` (relativo ao templates root) → destino no projeto.

import path from 'node:path'

export type TemplateEntry = {
  /** Caminho do `.tpl` relativo a `assets/templates/`. */
  src: string
  /** Caminho de saida relativo ao `targetDir` do projeto. */
  dst: string
  /** Marca arquivos que sempre sao copiados (nao opcionais). */
  required: boolean
}

export const TEMPLATE_MANIFEST: ReadonlyArray<TemplateEntry> = [
  // Camada 1: docs institucionais (raiz docs/)
  { src: 'docs/DESIGN.md.tpl',                      dst: 'docs/DESIGN.md',                      required: true },
  { src: 'docs/FRONTEND.md.tpl',                    dst: 'docs/FRONTEND.md',                    required: true },
  { src: 'docs/PLANS.md.tpl',                       dst: 'docs/PLANS.md',                       required: true },
  { src: 'docs/PRODUCT_SENSE.md.tpl',               dst: 'docs/PRODUCT_SENSE.md',               required: true },
  { src: 'docs/QUALITY_SCORE.md.tpl',               dst: 'docs/QUALITY_SCORE.md',               required: true },
  { src: 'docs/RELIABILITY.md.tpl',                 dst: 'docs/RELIABILITY.md',                 required: true },
  { src: 'docs/SECURITY.md.tpl',                    dst: 'docs/SECURITY.md',                    required: true },
  { src: 'docs/COMPOUND_ENGINEERING.md.tpl',        dst: 'docs/COMPOUND_ENGINEERING.md',        required: true },

  // Camada 2: design-docs/
  { src: 'docs/design-docs/index.md.tpl',           dst: 'docs/design-docs/index.md',           required: true },
  { src: 'docs/design-docs/core-beliefs.md.tpl',    dst: 'docs/design-docs/core-beliefs.md',    required: true },

  // Camada 3: exec-plans/
  { src: 'docs/exec-plans/active/README.md.tpl',           dst: 'docs/exec-plans/active/README.md',           required: true },
  { src: 'docs/exec-plans/completed/README.md.tpl',        dst: 'docs/exec-plans/completed/README.md',        required: true },
  { src: 'docs/exec-plans/tech-debt-tracker.md.tpl',       dst: 'docs/exec-plans/tech-debt-tracker.md',       required: true },

  // Camada 4: compound/
  { src: 'docs/compound/README.md.tpl',             dst: 'docs/compound/README.md',             required: true },

  // Camada 5: review-checklists/
  { src: 'docs/review-checklists/README.md.tpl',                dst: 'docs/review-checklists/README.md',                required: true },
  { src: 'docs/review-checklists/security.md.tpl',              dst: 'docs/review-checklists/security.md',              required: true },
  { src: 'docs/review-checklists/reliability.md.tpl',           dst: 'docs/review-checklists/reliability.md',           required: true },
  { src: 'docs/review-checklists/agent-api.md.tpl',             dst: 'docs/review-checklists/agent-api.md',             required: true },
  { src: 'docs/review-checklists/frontend-ui.md.tpl',           dst: 'docs/review-checklists/frontend-ui.md',           required: true },
  { src: 'docs/review-checklists/production-readiness.md.tpl',  dst: 'docs/review-checklists/production-readiness.md',  required: true },

  // Camada 6: smoke-flows / product-specs / references / generated
  { src: 'docs/smoke-flows/README.md.tpl',          dst: 'docs/smoke-flows/README.md',          required: true },
  { src: 'docs/product-specs/index.md.tpl',         dst: 'docs/product-specs/index.md',         required: true },
  { src: 'docs/references/README.md.tpl',           dst: 'docs/references/README.md',           required: true },
  { src: 'docs/generated/db-schema.md.tpl',         dst: 'docs/generated/db-schema.md',         required: true },

  // Raiz
  { src: 'TODO.md.tpl',                             dst: 'TODO.md',                             required: true },
]

export const TEMPLATES_ROOT = path.join(import.meta.dir, '..', 'assets', 'templates')
```

### Passo 2: Escrever os 25 templates `.tpl` em EN

Cada template e curto, declarativo e termina com a frase **"Replace this scaffold with project-specific content."** para o redator nao confundir scaffold com conteudo final.

Exemplo `docs/SECURITY.md.tpl`:

```markdown
# Security

## Principles

- Treat all external input as untrusted until proven safe.
- Centralize secret handling in environment variables; never commit secrets.
- Defense in depth: validation at the edge, authorization at the service, RLS at the data layer.

## Review Checklist (snapshot)

- [ ] Input validation on every entry point
- [ ] AuthN + AuthZ on every protected route
- [ ] No secrets in logs, errors, or client bundles
- [ ] Rate limiting on public endpoints
- [ ] Dependency audit clean (`bun audit` or equivalent)

## Threat Model (placeholder)

Document the top 3 threats that matter for this project: data exfiltration, account takeover, supply-chain.

---

Replace this scaffold with project-specific content.
```

Exemplo `docs/exec-plans/active/README.md.tpl`:

```markdown
# Active execution plans

Plans currently in progress live here. When a plan completes (Exit Criteria all checked + Validation Log passed), move the file to `../completed/{date}-{slug}.md`.

A plan is considered substantial when it requires 3+ ordered steps or touches more than one architectural boundary.

Use `bun run new-plan "<title>"` to scaffold a new plan from the template.
```

Exemplo `TODO.md.tpl`:

```markdown
# TODO

Micro-debt and quick follow-ups. For substantial work open an execution plan in `docs/exec-plans/active/`.

Format: `- [ ] {YYYY-MM-DD} {file:path:line?} short description`

- [ ] {{TODAY}} README.md update project description with real one-liner

<!-- Skill `/todo-pick` (anti-vibe-coding plugin) reads this file. -->
```

`{{TODAY}}` e um placeholder novo — adicionar ao helper `scaffoldTemplates` em fase-02 para substituir por `new Date().toISOString().slice(0, 10)`.

Os 22 templates restantes seguem o mesmo padrao (cabecalho `#` em EN + 3-8 linhas de orientacao + footer "Replace this scaffold..."). Nao reproduzo todos aqui — sao redacao mecanica em EN.

### Passo 3: Teste do manifest `template-manifest.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida que cada entry do manifest aponta para .tpl real.
// Previne drift: entries sem arquivo correspondente quebram fase-02 silenciosamente.

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT } from './template-manifest'

describe('TEMPLATE_MANIFEST', () => {
  it('lists at least 25 templates (PRD M2: 14+ docs structure scaffold)', () => {
    expect(TEMPLATE_MANIFEST.length).toBeGreaterThanOrEqual(25)
  })

  it('every src points to a readable .tpl file', async () => {
    for (const entry of TEMPLATE_MANIFEST) {
      const fullPath = path.join(TEMPLATES_ROOT, entry.src)
      const stat = await fs.stat(fullPath)
      expect(stat.isFile()).toBe(true)
      expect(entry.src.endsWith('.tpl')).toBe(true)
    }
  })

  it('no duplicate dst paths', () => {
    const dsts = TEMPLATE_MANIFEST.map(e => e.dst)
    expect(new Set(dsts).size).toBe(dsts.length)
  })

  it('every required template ships in EN — no PT-BR diacritics in template body', async () => {
    const ptDiacritic = /[ãâáàçéêíóôõú]/i
    for (const entry of TEMPLATE_MANIFEST) {
      const body = await fs.readFile(path.join(TEMPLATES_ROOT, entry.src), 'utf8')
      expect(ptDiacritic.test(body)).toBe(false)
    }
  })
})
```

---

## Gotchas

- **G1 do plano (D2 idioma EN):** Ao redigir os 25 `.tpl` em sessao manual, e facil escrever uma linha de exemplo em PT por inercia. O ultimo `it()` do teste varre por diacriticos — quebra cedo. Se um termo tecnico exige diacritico (raro em texto institucional EN), mover para snippet de codigo (regex nao varre fenced blocks se ajustarmos — mas mais simples: nao usar diacritico).
- **G2 do plano (cross-platform paths):** `path.join(TEMPLATES_ROOT, entry.src)`. `entry.src` ja contem `/` (literal forward-slash) — em Windows, `path.join` normaliza para `\\`. **Nao** trocar `/` por `path.sep` no manifest — `path.join` cuida.
- **G7 do plano (escopo D37 — sem KP):** Esta fase NAO cria `docs/knowledge/{stack}/` nem templates de knowledge pack. Resista a tentacao de "ja deixar pronto" — fica para v6.1.0 (Roadmap PRD).
- **Local — `import.meta.dir` em `template-manifest.ts`:** O helper resolve `assets/templates` relativo ao proprio arquivo. Se mover o `.ts` de pasta no futuro (refactor), o `path.join` quebra. Documentado no JSDoc.
- **Local — placeholder `{{TODAY}}`:** novo placeholder introduzido por `TODO.md.tpl`. Atualizar `scaffoldTemplates` (Plano 01 fase-02) na fase-02 deste plano para substituir tambem `{{TODAY}}` — caso contrario o template gera literal `{{TODAY}}` no projeto. Ja sinalizado em fase-02.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/template-manifest.test.ts` — falha em `Cannot find module './template-manifest'` ou em `expect(stat.isFile()).toBe(true)` antes de escrever os `.tpl`.
  - Comando: `bun run test skills/init/lib/template-manifest.test.ts`
  - Resultado esperado: pelo menos 1 fail (modulo ausente OU arquivo `.tpl` faltando)

- [ ] **GREEN:** Apos manifest + 25 `.tpl` escritos, todos os 4 `it()` passam.
  - Comando: `bun run test skills/init/lib/template-manifest.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `anti-vibe-coding/skills/init/assets/templates/` contem **exatamente** 25 arquivos `.tpl` (`find anti-vibe-coding/skills/init/assets/templates -name "*.tpl" | wc -l` retorna 25)
- [ ] Manifest tem **25** entradas; teste `expect(TEMPLATE_MANIFEST.length).toBeGreaterThanOrEqual(25)` passa
- [ ] Nenhum `.tpl` contem diacritico PT-BR (teste cobre)
- [ ] Nenhum `.tpl` contem placeholder nao reconhecido — apenas `{{PROJECT_NAME}}`, `{{STACK}}`, `{{TODAY}}` sao validos. Lint manual: `grep -rE "\{\{[A-Z_]+\}\}" anti-vibe-coding/skills/init/assets/templates/` retorna so esses 3 tokens
- [ ] Cada `dst` no manifest e unico (sem colisoes — teste cobre)
- [ ] Lint limpo: `bun run lint anti-vibe-coding/skills/init/lib/template-manifest.ts`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`, sem `as`)

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/template-manifest.test.ts
# Esperado: 4 passed, 0 failed em <1s

find skills/init/assets/templates -name "*.tpl" | wc -l
# Esperado: 25
```

**Por humano:**

- Inspecao visual de 3 templates aleatorios (`SECURITY.md.tpl`, `exec-plans/active/README.md.tpl`, `TODO.md.tpl`) confirma:
  - Header `#` em EN
  - 3-8 linhas de conteudo orientativo
  - Footer "Replace this scaffold with project-specific content." (exceto README/index files que sao auto-explicativos)
  - Tom **declarativo**, nao tutorial — instrucoes para humanos+agentes que ja conhecem o conceito.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
