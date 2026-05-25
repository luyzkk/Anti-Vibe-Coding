<!--
Princípio universal #5 — Comment Provenance.
Esta fase TOCA codigo .ts (E2E test). Provenance comment OBRIGATORIO no E2E novo, formato:
`// 2026-05-24 (Luiz/dev): CA-06 do PRD next-stack — atom supabase-integration deve ser copiado quando hasSupabaseSignal() bate`
NAO toca runtime de plugin (helpers TS ja tem JSDoc).
-->

# Fase 05: Supabase integration atom + fixture + E2E (CA-06)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** M (~2h — 1 extracao + 1 fixture + 1 E2E)
**Depende de:** Plano 01 fase-05 (fixture base `nextjs-app-router-fixture/` + tracer molde)
**Visual:** false

---

## O que esta fase entrega

1 atom T3 em `knowledge/nextjs/atoms/`: `supabase-integration.md` (server vs client clients com `@supabase/ssr`, RLS via SSR, auth.uid() no Postgres, signed URLs para storage, edge functions). **Flagged R3-B** para audit humano na fase-07. + 1 fixture variante `tests/fixtures/nextjs-supabase-fixture/` derivada da fixture base do Plano 01 fase-05 (acrescentando pasta `supabase/` + `@supabase/ssr` em deps). + 1 E2E `tests/e2e/init-v7-nextjs-supabase.test.ts` validando CA-06 (atom supabase carregado quando `hasSupabaseSignal()` bate).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/supabase-integration.md` | Create | Atom T3 EN, ≤200 linhas, **flagged R3-B** |
| `tests/fixtures/nextjs-supabase-fixture/package.json` | Create | Derivado da fixture base; deps `next` + `@supabase/ssr` |
| `tests/fixtures/nextjs-supabase-fixture/src/app/page.tsx` | Create | Copia da fixture base |
| `tests/fixtures/nextjs-supabase-fixture/src/app/layout.tsx` | Create | Copia da fixture base |
| `tests/fixtures/nextjs-supabase-fixture/next.config.js` | Create | Copia da fixture base |
| `tests/fixtures/nextjs-supabase-fixture/tsconfig.json` | Create | Copia da fixture base |
| `tests/fixtures/nextjs-supabase-fixture/supabase/.gitkeep` | Create | Diretorio supabase/ presente para `hasSupabaseSignal()` (sinal 1) |
| `tests/e2e/init-v7-nextjs-supabase.test.ts` | Create | E2E CA-06 (assert atom supabase em `.claude/knowledge/atoms/`) |

---

## Implementacao

### Passo 1: Identificar sources para o atom

**supabase-integration.md (flagged R3-B):**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md` (fonte primaria — auth + SSR clients)
- `Infos/knowledge/NextJS/compass_artifact_wf-*supabase*.md` ou `*auth*.md` (busca local)

Confirmar paths exatos antes de lancar (audit trail). `nextjs-supabase-auth/SKILL.md` e a fonte mais densa — verificar prioridade.

### Passo 2: Lancar 1 extrator para o atom

Prompt inclui:
1. Bloco "REGRA DE FIDELIDADE" VERBATIM da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (G1)
2. Path do source
3. Frontmatter alvo (Passo 3)
4. Instrucao: markdown EN + 4 secoes + hard cap 200 + use ONLY source
5. **Atencao R3-B:** "este atom sera revisado por humano. Seja extra-conservador: claims tecnicas (ex.: nome de funcao do `@supabase/ssr`, sintaxe de RLS policy) DEVEM corresponder literalmente ao source. Em duvida, OMITIR."

### Passo 3: Frontmatter alvo do atom

```yaml
---
topic: supabase-integration
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 3
triggers: [supabase, RLS, auth.js, SSR, "@supabase/ssr", createServerClient, createBrowserClient, signed URL, edge function]
related_skills: [/security]
updated: 2026-05-24
flagged_for_human_audit: true  # R3-B — resolvido em Plano 03 fase-07
---
```

(Frontmatter `triggers` espelhado de CA-06 do PRD: `[supabase, RLS, auth.js, SSR]` minimo. Acrescido com items relevantes do source — manter consistencia com CA-06 ao revisar.)

### Passo 4: Criar fixture `nextjs-supabase-fixture/`

A fixture deriva da `nextjs-app-router-fixture/` (Plano 01 fase-05) — copia os 5 arquivos e adiciona pasta `supabase/` + dep `@supabase/ssr`.

`tests/fixtures/nextjs-supabase-fixture/package.json`:

```json
{
  "name": "nextjs-supabase-fixture",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0"
  }
}
```

`tests/fixtures/nextjs-supabase-fixture/src/app/page.tsx`, `layout.tsx`, `next.config.js`, `tsconfig.json`: copia LITERAL da fixture base (`nextjs-app-router-fixture/`). Nao adicionar codigo supabase no body — o fixture e apenas estrutural para o detector.

`tests/fixtures/nextjs-supabase-fixture/supabase/.gitkeep`: arquivo vazio (1 byte) para garantir que a pasta `supabase/` exista no checkout (sinal 1 do `hasSupabaseSignal()`).

**G10 cobertura dupla:** o `hasSupabaseSignal()` detecta pasta `supabase/` (sinal 1) OU dep `@supabase/*` (sinal 2). A fixture usa AMBOS para cobrir os 2 codepaths num so teste — defense-in-depth.

### Passo 5: Escrever E2E `init-v7-nextjs-supabase.test.ts`

Molde: `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (Plano 01 fase-05). Adapta paths para a fixture supabase.

```typescript
// tests/e2e/init-v7-nextjs-supabase.test.ts
// 2026-05-24 (Luiz/dev): CA-06 do PRD next-stack — atom supabase-integration deve ser
// copiado quando hasSupabaseSignal() bate. Fixture com pasta supabase/ + @supabase/ssr em deps.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { cpSync, rmSync, mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInit } from '../../skills/init/lib/run-init'

describe('init v7 — Next.js + Supabase variant (CA-06)', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'init-v7-nextjs-supabase-'))
    cpSync(
      path.join(import.meta.dir, '..', 'fixtures', 'nextjs-supabase-fixture'),
      cwd,
      { recursive: true },
    )
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  test('CA-06: supabase-integration atom copiado quando supabase/ + @supabase/ssr presentes', async () => {
    const result = await runInit([], { cwd, log: () => {} })

    expect(result.kind).toBe('ok')

    // stack.json reporta primary=nextjs (probeNextjs bate via package.json#dependencies.next)
    const stackPath = path.join(cwd, '.claude', 'stack.json')
    expect(existsSync(stackPath)).toBe(true)
    const stack = JSON.parse(readFileSync(stackPath, 'utf-8')) as { primary?: string }
    expect(stack.primary).toBe('nextjs')

    // Atom supabase-integration copiado para .claude/knowledge/atoms/
    const atomPath = path.join(cwd, '.claude', 'knowledge', 'atoms', 'supabase-integration.md')
    expect(existsSync(atomPath)).toBe(true)

    // Frontmatter contem tier: 3 e triggers com supabase, RLS, auth.js, SSR
    const atomContent = readFileSync(atomPath, 'utf-8')
    expect(atomContent).toContain('tier: 3')
    expect(atomContent).toMatch(/triggers:\s*\[[^\]]*supabase[^\]]*RLS[^\]]*auth\.js[^\]]*SSR/)
  })
})
```

### Passo 6: Flagging R3-B em STATE.md

Apos `supabase-integration.md` ser entregue, anotar em `STATE.md` global da feature (raiz da pasta ativa):

```
- [ ] R3-B audit humano: `knowledge/nextjs/atoms/supabase-integration.md` (flagged em Plano 03 fase-05) — resolvido em Plano 03 fase-07
```

---

## Gotchas

- **G1 do plano (anti-drift VERBATIM):** prompt do extrator inclui bloco da compound lesson + atencao extra R3-B.
- **G2 do plano (hard cap 200 linhas):** supabase pode inflar com exemplos de codigo `createServerClient` + cookies — re-roda com instrucao de cortar. Priorizar Senior patterns + Decision criteria.
- **G3 do plano (idioma EN):** atom completo em EN. Comentario `.ts` do E2E em PT-BR (padrao).
- **G4 do plano (R3-B flagging):** supabase-integration vai em STATE.md como pending audit humano fase-07 (junto com react-server-components do Plano 02 e security-stack-specific do Plano 03 fase-01).
- **G7 do plano (Infos/ paths):** `sources:` aponta para `Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md` mesmo com .gitignore — audit trail textual.
- **G10 do plano (`hasSupabaseSignal()` ja existe):** [`skills/init/lib/stack-aware-input-paths.ts:446`](../../../../skills/init/lib/stack-aware-input-paths.ts#L446) detecta pasta `supabase/` (sinal 1) OU dep `@supabase/*` (sinal 2). Fixture usa AMBOS para cobrir os 2 codepaths num so teste. NAO mudar este predicate.
- **G12 do plano (provenance comment):** E2E novo (`init-v7-nextjs-supabase.test.ts`) inclui comentario `// 2026-05-24 (Luiz/dev): CA-06 do PRD next-stack — atom supabase-integration deve ser copiado quando hasSupabaseSignal() bate.` Markdown (atom) NAO precisa porque tem frontmatter `updated:`.
- **Local (fixture deriva, NAO copia tudo cega):** fixture supabase reusa os 5 arquivos da fixture base. Se Plano 01 fase-05 mudar o conteudo do `page.tsx`/`layout.tsx`, esta fixture deve refletir. Considere usar `cpSync` no setup do teste em vez de duplicar arquivos — mas o padrao do plugin e duplicar fixtures isolados (preserva separation of concerns; mais facil de auditar). Manter duplicacao explicita.
- **Local (atom standalone — R2-C):** `supabase-integration.md` NAO cross-link para Node-TS data-persistence ou similar. Apenas conteudo Next-supabase entra: `@supabase/ssr` clients (server/browser/middleware), cookies handling, RLS via `auth.uid()`, signed URLs para storage, edge functions deploy. Excluir Postgres generico, ORMs (Prisma/Drizzle).

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test tests/e2e/init-v7-nextjs-supabase.test.ts` ANTES da fixture existir / antes do atom ser commitado em `knowledge/nextjs/atoms/`
  - Comando: `bun test tests/e2e/init-v7-nextjs-supabase.test.ts --grep 'CA-06'`
  - Resultado esperado: FALHA — `.claude/knowledge/atoms/supabase-integration.md` nao existe (atom nao no copyKnowledge target)

- [ ] **GREEN:** atom criado + fixture criada + `hasSupabaseSignal()` bate, teste passa
  - Comando: `bun test tests/e2e/init-v7-nextjs-supabase.test.ts --grep 'CA-06'`
  - Resultado esperado: `1 passed, 0 failed`

### Checklist

- [ ] Atom `supabase-integration.md` criado em `knowledge/nextjs/atoms/` (<=200 linhas, 4 secoes, EN, `tier: 3`, `flagged_for_human_audit: true`)
- [ ] STATE.md global recebe linha registrando supabase-integration como pending audit humano fase-07
- [ ] Fixture `tests/fixtures/nextjs-supabase-fixture/` criada com 6 arquivos (5 da base + `supabase/.gitkeep`)
- [ ] `package.json` da fixture tem dep `@supabase/ssr` E dep `next` (probeNextjs bate primeiro — primary=nextjs)
- [ ] E2E `tests/e2e/init-v7-nextjs-supabase.test.ts` criado com provenance comment + assertions CA-06
- [ ] `bun test tests/e2e/init-v7-nextjs-supabase.test.ts` retorna `1 passed, 0 failed`
- [ ] `bun test tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (Plano 01 fase-05) CONTINUA verde — zero regressao
- [ ] `bun run harness:validate` aceita o novo atom
- [ ] `bun run lint` passa no E2E novo

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/supabase-integration.md` retorna `≤200`
- `bun test tests/e2e/init-v7-nextjs-supabase.test.ts` retorna `1 passed, 0 failed` (CA-06)
- `bun test tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` retorna `passed` (zero regressao da fase do Plano 01)
- `grep -c 'flagged_for_human_audit: true' knowledge/nextjs/atoms/supabase-integration.md` retorna `1`

**Por humano (verifier batch fase-07 + audit humano Luiz):**
- Verifier batch confirma >=80% rastreabilidade em Senior patterns + Anti-patterns + Decision criteria
- Luiz aprova `supabase-integration.md` em fase-07 com signature `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
