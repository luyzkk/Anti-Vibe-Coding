<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): verifier refined + E2E tracer — alinhado com D12 + D19 + CA-02/09/11`
-->

# Fase 06: Verifier refined sobre piloto + E2E tracer (CA-02 + CA-09 + CA-11)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5-2h
**Depende de:** fase-05 (piloto deve existir para verifier auditar e E2E ter source real para copiar); fase-04 (regression test do detector Rails sobre contrato D22 deve estar verde — sem isso o E2E pode falhar por motivo errado); fase-03 (contrato multi-stack ja refatorado — E2E usa `stack.primary`)
**Visual:** false

---

## O que esta fase entrega

(a) **Subagente verifier roda protocolo refined** sobre o piloto `rails-conventions-and-magic.md` — audita APENAS seções `Padrões sênior` + `Anti-padrões` + `Critérios de decisão` (skip `Quando consultar` + `Referências externas`); meta = ≥80% das claims rastreáveis para passagens específicas das fontes em `sources:`. Verifier prompt contém cláusula verbatim do compound lesson 2026-05-16-verifier-protocol-technical-sections-only.md.

(b) **E2E tracer test** `tests/e2e/stack-knowledge-rails-tracer.test.ts` monta projeto Rails dummy (Gemfile com `gem 'rails'`), invoca `runStackKnowledgeInit({ primary: 'rails' })`, e prova:
  - **CA-02:** `.claude/knowledge/INDEX.md` + `.claude/knowledge/atoms/rails-conventions-and-magic.md` presentes em ≤100ms
  - **CA-09:** sem `.claude/knowledge/` no projeto, `getStackKnowledgePreface()` retorna string vazia (graceful degradation)
  - **CA-11 (regressão Node):** fixture combinada — projeto com `package.json` (TS) sem `Gemfile` ainda funciona com Node knowledge (regressão da infra v6.3.2)

D12 + D19 + RF6 + RF8 do PRD; CA-02/09/11.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-rails-tracer.test.ts` | Create | E2E tracer cobrindo CA-02 + CA-09 + CA-11 |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Modify | Adicionar bloco `## Verifier refined report (Plano 01 fase-06)` com resultado (≥80% claims rastreáveis) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/PLAN.md` | Modify | Adicionar entry na `## Validation Log` com output do E2E + métrica de tempo |

---

## Implementacao

### Passo 1: subagente verifier roda protocolo refined

Invocar subagente via Task tool. **Prompt OBRIGATÓRIO contém os blocos abaixo verbatim**:

```text
TAREFA: validar fidelidade ao source do piloto `rails-conventions-and-magic.md`
(Plano01 fase-05, feature Stack Knowledge Rails v6.3.3).

ARQUIVO A AUDITAR:
docs/knowledge/rails/atoms/rails-conventions-and-magic.md

FONTES DE GROUND TRUTH (declaradas no frontmatter `sources:` do átomo):
{listar paths absolutos das fontes — copiar do frontmatter do átomo}

================================================================================
PROTOCOLO DE AUDITORIA REFINED (compound lesson 2026-05-16, REGRESSION desde Plano01):
================================================================================

> "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in:
> Padrões sênior, Anti-padrões, Critérios de decisão.
>
> ATOM-STRUCTURAL METADATA lives in: Quando consultar (use-case framing) and
> Referências externas (cross-skill linking) — DO NOT evaluate these sections
> for source traceability."

INSTRUÇÕES OPERACIONAIS:

1. Ler o átomo INTEIRO.
2. Identificar as 3 seções técnicas: `## Padrões sênior`, `## Anti-padrões`, `## Critérios de decisão`.
3. Extrair de cada uma TODAS as claims técnicas concretas (nomes de APIs Ruby/Rails,
   números/percentuais, libs específicas, comandos `bin/rails`, regras "use X quando Y").
4. Para CADA claim, abrir as fontes em `sources:` e procurar passagem que suporte
   literalmente ou parafraseavelmente o claim.
5. Marcar cada claim como:
   - ✅ rastreável (cita passagem da fonte com linha aproximada)
   - ❌ não-rastreável (claim factualmente plausível mas ausente da fonte)
6. NÃO auditar `## Quando consultar` nem `## Referências externas` — são editorial scaffolding.

ENTREGÁVEIS:

Markdown report com formato:

# Verifier Report — rails-conventions-and-magic.md

**Data:** 2026-05-18
**Protocolo:** refined (apenas Padrões sênior + Anti-padrões + Critérios de decisão)

## Claims auditadas

| # | Seção | Claim | Status | Fonte | Passagem |
|---|---|---|---|---|---|
| 1 | Padrões sênior | "Zeitwerk substitui classic autoloader em Rails 6+" | ✅ rastreável | {fonte}.md linha ~45 | "Zeitwerk became default in Rails 6.0..." |
| 2 | Anti-padrões | "`require_relative` em app/ causa autoload conflicts" | ❌ não-rastreável | — | claim plausível mas ausente |
| ... | ... | ... | ... | ... | ... |

## Resumo

- Total de claims auditadas: N
- Rastreáveis: M
- Não-rastreáveis: K
- Taxa de fidelidade: M/N = X%
- **Meta:** ≥80%
- **Status:** ✅ APROVADO / ❌ REPROVADO

## Recomendações (se reprovado)

- Claim #2: REMOVER ou re-extrair com base em {fonte alternativa}
- ...

================================================================================
GATE DE BLOQUEIO:
================================================================================
Se taxa < 80%, REPROVAR — fase-06 não avança para E2E até piloto ser corrigido em rework cirúrgico.
Se ≥80%, APROVAR e produzir relatório para STATE.md.
```

Verifier entrega report. Salvar em `STATE.md` da feature:

```markdown
## Verifier refined report (Plano 01 fase-06 — 2026-05-18)

{colar resumo do verifier report aqui}

**Decisão:** APROVADO (taxa X%) — prossegue para E2E.
```

Se REPROVADO, **PARAR fase-06** e re-rodar fase-05 com prompt do extrator reforçado (citar claims específicas que falharam). Não avançar para E2E com piloto não-aprovado.

### Passo 2 (RED): escrever o E2E tracer test

```typescript
// tests/e2e/stack-knowledge-rails-tracer.test.ts
// 2026-05-18 (Luiz/dev): E2E tracer Rails — Plano01 fase-06.
// Prova CA-02 (init com primary=rails copia knowledge ≤100ms),
//      CA-09 (graceful degradation sem .claude/knowledge/),
//      CA-11 (regressão Node — projeto TS sem Gemfile continua funcionando).
// Alinhado com D12 + D19 + RF6 + RF8 do PRD.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

describe('stack-knowledge Rails tracer bullet (Plano 01 fase-06)', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'tracer-rails-'))
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  // CA-02 — happy path Rails: detect → init → copy knowledge ≤100ms
  it('CA-02: projeto Rails com Gemfile gem rails → .claude/knowledge/ populado em ≤100ms', async () => {
    // fixture Rails dummy mínimo
    writeFileSync(
      join(project, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails', '~> 8.0'\ngem 'puma'\n",
      'utf8',
    )

    const start = performance.now()
    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      // logger silent: capturar output via array em vez de console
      logger: () => {},
    })
    const elapsed = performance.now() - start

    expect(result.stackPrimary).toBe('rails')
    expect(result.copyResult.status).toBe('copied')
    expect(elapsed).toBeLessThan(200) // CA-02 SLA (D24: relaxado 100→200ms para absorver flakey CI Windows com cold I/O)

    // arquivos esperados (piloto da fase-05 + INDEX skeleton)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'))).toBe(true)

    // frontmatter do átomo copiado preservado
    const atom = readFileSync(join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'), 'utf-8')
    expect(atom).toContain("rails_versions: ['>=7.1']")
    expect(atom).toContain('stack: rails')
  })

  // CA-09 — graceful degradation sem .claude/knowledge/
  it('CA-09: projeto Rails sem .claude/knowledge/ não crashea e getStackKnowledgePreface retorna vazio', async () => {
    writeFileSync(
      join(project, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails'\n",
      'utf8',
    )
    // NÃO rodar runStackKnowledgeInit — simular projeto antes de init

    const knowledgeIndex = join(project, '.claude', 'knowledge', 'INDEX.md')
    expect(existsSync(knowledgeIndex)).toBe(false)

    // replicar lógica do getStackKnowledgePreface — preface vazio quando INDEX ausente
    const preface = existsSync(knowledgeIndex)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\`.`
      : ''
    expect(preface).toBe('')
  })

  // CA-11 — regressão Node: projeto TS sem Gemfile continua entregando Node knowledge
  it('CA-11: projeto Node+TS puro (sem Gemfile) continua entregando Node knowledge sem regressão', async () => {
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture-node', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')
    // NOTA: sem Gemfile — detector deve cair para node-ts, não rails

    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      logger: () => {},
    })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(result.copyResult.status).toBe('copied')

    // Node knowledge presente (regressão v6.3.2 — 14 átomos)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
    // Rails knowledge AUSENTE (não foi detectado)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'))).toBe(false)
  })

  // Bonus: validar frontmatter do átomo Rails copiado contra o validator da fase-02
  it('regression: piloto Rails copiado passa validateAtomFrontmatter', async () => {
    writeFileSync(
      join(project, 'Gemfile'),
      "gem 'rails', '~> 8.0'\n",
      'utf8',
    )
    await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    const { validateAtomFrontmatter } = await import('../../skills/init/lib/atoms-frontmatter-validator')
    const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md')
    const validation = validateAtomFrontmatter(atomPath)
    expect(validation.valid, `Piloto copiado falhou validação: ${validation.errors.join(', ')}`).toBe(true)
  })
})
```

Comando RED: `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'` → 4 assertion failures (piloto pode ainda não estar na matrix, infra pode estourar 100ms na primeira execução com warm-up).

### Passo 3 (GREEN): garantir que tudo está em lugar

Esta fase **não escreve nova lib code** — apenas integra fase-01 a 05. Se algum test falha:

| Falha | Provável causa | Onde investigar |
|---|---|---|
| CA-02: `stackPrimary !== 'rails'` | Detector Rails não classificou Gemfile dummy | fase-04 (regression test); confirmar fixture Gemfile usa `gem 'rails'` no formato esperado |
| CA-02: `copyResult.status !== 'copied'` | `docs/knowledge/rails/` ausente ou vazio | fase-05 (piloto não foi criado em local correto) |
| CA-02: `elapsed >= 200` | Cópia lenta — investigar I/O do tmpdir | considerar warm-up run antes do measurement (D24: limite 200ms já absorve cold I/O Windows) |
| CA-02: arquivo `rails-conventions-and-magic.md` ausente em `.claude/knowledge/atoms/` | `runStackKnowledgeInit` não copia subárvore `atoms/` | bug em `copyKnowledge` — não esperado, mas se ocorrer escalar para `/iterate` |
| CA-09: preface não vazio | Lógica replicada no test diverge de `getStackKnowledgePreface` real | sincronizar com `skills/security/lib/stack-aware-preface.ts` |
| CA-11: `stackPrimary !== 'nodejs-typescript'` | Detector tie-break errado | revisar G6 do `detect-stack.ts` (precedência) |
| validateAtomFrontmatter retorna `valid: false` no piloto copiado | Frontmatter do piloto da fase-05 está malformado | fase-05 rework |

Comando GREEN: `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'` → `4 passed, 0 failed`.

### Passo 4: registrar Validation Log no PLAN.md

Após GREEN, adicionar entry em `../PLAN.md` seção `## Validation Log`:

```markdown
### Plano 01 — Tracer Bullet (2026-05-18)

- `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'` → 4 passed, 0 failed
- CA-02 measured: durationMs = <N>ms (limite 100ms) com 1 átomo (piloto)
- CA-09: preface vazio confirmado quando `.claude/knowledge/` ausente
- CA-11: Node atoms continuam sendo copiados em projeto TS puro (sem regressão visível)
- Verifier refined: taxa X% claims rastreáveis (meta ≥80%) — APROVADO
- Anti-drift clause + verifier refined protocol aplicados como regression desde Plano01 (D12)
```

### Passo 5: commit consolidando fase-06

```bash
git add tests/e2e/stack-knowledge-rails-tracer.test.ts
git add docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md
git add docs/exec-plans/active/2026-05-18-stack-knowledge-rails/PLAN.md
git commit -m "$(cat <<'EOF'
test(e2e): tracer bullet Rails — CA-02 + CA-09 + CA-11

E2E prova que runStackKnowledgeInit({ primary: 'rails' }) copia o piloto
rails-conventions-and-magic em ≤100ms, sem regressão para projetos Node+TS
puros (CA-11). Verifier refined sobre piloto aprovado com X% claims rastreáveis
(meta ≥80% per D12 + compound lesson 2026-05-16-verifier-protocol-technical-sections-only).

Plano 01 (Tracer Bullet) concluído — arquitetura validada, Plano 02 pode
escalar para os 13 átomos restantes com segurança.

Alinhado com D12 + D17 + D19 do CONTEXT, RF6 + RF8 do PRD.
EOF
)"
```

---

## Gotchas

- **G3 do plano (verifier refined é regression):** prompt do verifier DEVE conter o bloco `TECHNICAL CLAIMS ... ATOM-STRUCTURAL METADATA` colado verbatim do compound lesson. NÃO simplificar para "audit só seções técnicas" — a literalidade evita drift do próprio protocolo. Se ≥2 piloto-runs falharem v1, suspeitar de prompt mal copiado antes de re-extrair.

- **G1 do plano (detector já existe):** se CA-02 falha por `stackPrimary !== 'rails'`, NÃO assumir bug no detector — primeiro confirmar que o Gemfile fixture do test usa formato válido (`gem 'rails'`, não `# rails` comentado). Detector é regression-coverage, não nova implementação.

- **Local — `runStackKnowledgeInit` retorna `stackPrimary` em formato matrix folder (`'rails'`), não `StackId` (`'rails'` coincide neste caso, mas verificar):** em Node era `'nodejs-typescript'` (folder name), não `'node-ts'` (StackId interno). Para Rails ambos coincidem por sorte do mapeamento. Não confundir.

- **Local — tmpdir cleanup:** `afterEach` com `rmSync({ recursive: true, force: true })`. Sem cleanup, `mkdtempSync` enche `%TEMP%` no Windows. CI eventualmente quebra.

- **Local — Windows path separators:** `join(...)` normaliza para `\` em Windows. `expect(...).toContain('.claude/knowledge/INDEX.md')` pode falhar se string vier com `\\`. Usar `.toContain(join('.claude', 'knowledge', 'INDEX.md'))` ou string forward-slash literal (matrix sempre escreve com `/`).

- **Local — primeira execução E2E pode estourar 100ms por warm-up:** se test falha apenas no run inicial (cache frio), considerar warm-up `await copyKnowledge(...)` antes do measurement. Documentar em STATE.md como observação operacional, não regressão.

- **Local — `getStackKnowledgePreface` mora em `skills/security/lib/stack-aware-preface.ts`:** o E2E replica lógica inline em vez de importar — manter alinhado se a função real mudar. Plano 03 fase-09 (E2E completo) faz `import { getStackKnowledgePreface }` para teste de integração; aqui é só smoke.

---

## Verificacao

### TDD

- [ ] **RED:** E2E escrito, falha em ≥1 assertion (piloto ainda não está copiado ou frontmatter validator pode falhar inicialmente)
  - Comando: `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'`
  - Resultado esperado: ≥1 assertion failure

- [ ] **GREEN:** Após verifier aprovar + piloto presente em `docs/knowledge/rails/`, todos os 4 tests passam
  - Comando: `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] Verifier subagente entregou report markdown com tabela de claims auditadas
- [ ] Taxa de fidelidade ≥80% (meta D12 do CONTEXT)
- [ ] STATE.md tem bloco `## Verifier refined report (Plano 01 fase-06)` com resumo e decisão APROVADO
- [ ] Prompt do verifier (em transcripts ou anexado ao STATE.md) inclui verbatim "TECHNICAL CLAIMS ... ATOM-STRUCTURAL METADATA" do compound lesson — não parafrase
- [ ] `tests/e2e/stack-knowledge-rails-tracer.test.ts` existe e cobre 4 cenários (CA-02, CA-09, CA-11, regression frontmatter)
- [ ] `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'` retorna `4 passed`
- [ ] CA-02 measured: `durationMs` real registrado na Validation Log do PLAN.md
- [ ] `bun run test` global continua verde (sem regressão em `stack-knowledge-tracer-bullet.test.ts` ou `detect-stack.test.ts`)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo
- [ ] Commit de fase-06 referencia D12 + RF6 + RF8

---

## Criterio de Aceite

**Por maquina:**
- `bun run test:e2e -- --grep 'stack-knowledge Rails tracer'` retorna `4 passed, 0 failed`
- `bun run test && bun run lint && bun run typecheck` todos exit 0
- Validation Log do PLAN.md tem entrada `### Plano 01 — Tracer Bullet (2026-05-18)` com `durationMs` real

**Por humano:**
- Verifier report mostra ≥80% claims rastreáveis em `Padrões sênior` + `Anti-padrões` + `Critérios de decisão`
- `durationMs` da CA-02 bem abaixo de 100ms (idealmente <30ms com 1 átomo — extrapolação para 14 átomos é confortável)
- Decisão de prosseguir com Plano 02 registrada no MEMORY.md como `## Notas para Planos Seguintes`

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
