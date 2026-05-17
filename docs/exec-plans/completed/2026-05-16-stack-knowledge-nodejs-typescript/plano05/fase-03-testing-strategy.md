<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 03: Átomo `testing-strategy.md`

**Plano:** 05 — Atom Batch B
**Sizing:** 1.5-2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 full `docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` (~130 linhas), condensando estratégias de teste no idioma Node+TS atual: escolha entre Vitest, Jest e `node:test`; pirâmide e shape de testes; doubles (mock, stub, spy, fake); property/fuzz com `fast-check`; contract testing com Pact; mutation testing com StrykerJS. Cobre o ângulo Node+TS-específico de cada decisão; `/tdd-workflow` cobre o ciclo RED-GREEN-REFACTOR e princípios gerais de TDD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~130 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: testing-strategy
stack: nodejs-typescript
layer: both
sources:
  - research: ab2553f8
tier: 2
triggers: [vitest, jest, node:test, mock, fast-check, pact, stryker, mutation testing]
related_skills: [/tdd-workflow]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `ab2553f8` — Estratégias de Teste (1288 linhas, Vitest/Jest/node:test, pirâmide, doubles, mutação, contrato)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Testing Strategy — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 2-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skill `/tdd-workflow` + paths das fontes

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

Patterns recomendados (mínimo 5, máximo 7):

- **Pattern: Vitest vs Jest vs `node:test` (escolha do runner)** — Vitest (ESM-first, Vite plugin, fast HMR, jest-compatible API). Jest (ecossistema maior, mais legado em monorepos React). `node:test` (zero-dep, runner built-in Node 20+, ideal para libs publicadas). Quando usar Vitest: projeto novo, ESM, monorepo TS, performance importa. Quando usar Jest: codebase existente já em Jest, integração com `babel-jest` legacy. Quando usar `node:test`: lib pequena, sem deps em runtime, CI minimal.
- **Pattern: Pirâmide vs Honeycomb (Honeycomb = mais integration)** — pirâmide clássica (muito unit, alguns integration, pouquíssimos e2e) vs honeycomb (mais integration, unit só pra lógica complexa, e2e pra fluxos críticos). Quando usar pirâmide: lógica de domínio densa (cálculos, regras de negócio). Quando usar honeycomb: services orquestradores (a maioria do código é "chamar X, transformar, chamar Y") — testes integration pegam o valor real.
- **Pattern: Doubles — mock, stub, spy, fake (e quando usar cada)** — fake (impl funcional simplificada, ex: in-memory repo) > stub (return fixo) > mock (verifica interação) > spy (apenas observa). Quando usar fake: I/O boundaries (DB, HTTP) — preserva valor de teste. Quando usar mock: contratos de comando void (envio de email, push event). Quando NÃO usar mock: lógica pura — teste real é mais barato.
- **Pattern: Property/fuzz testing com `fast-check`** — para funções com propriedade invariante (ex: `parse(stringify(x)) === x`, `sort(arr).length === arr.length`). Quando usar: parsers, serializers, lógica matemática, transformações com inverso. Quando NÃO usar: lógica com side-effect — propriedade fica difícil de expressar.
- **Pattern: Contract testing com Pact (consumer-driven)** — quando services se comunicam via HTTP/AMQP, contratos não-verificados causam break silencioso. Pact: consumer escreve teste contra mock provider, gera pact file, provider verifica o pact no CI. Quando usar: monorepo polyglot ou microservices. Quando NÃO usar: monorepo TS com tRPC (type-safety já garante).
- **Pattern: Mutation testing com StrykerJS** — coverage % é métrica fraca; mutation testing introduz alterações e verifica se testes pegam. Quando usar: módulo crítico (auth, billing, dados sensíveis). Quando NÃO usar: codebase inteiro (overhead de CI alto) — focar em módulos sensíveis.
- **Pattern: Testes contra clock/data com fakers determinísticos** — `Date.now()`, `setTimeout`, `setInterval` causam flakiness. Padrão: `vi.useFakeTimers()` (Vitest) / `jest.useFakeTimers()` / `node:test` mock module. Quando usar: lógica time-dependent (TTL, retry backoff, expirações).

### Passo 4: Anti-padrões (2-4 armadilhas com correção)

- **Mock de tudo (overmocking)** — teste verifica que função X foi chamada, mas não verifica resultado real. Correção: usar `fake` (impl simplificada) ou teste integration com DB ephemeral.
- **Teste flaky por dependência de tempo real ou rede externa** — `Date.now()`, real HTTP fetch, timers reais. Correção: fake timers + MSW (Mock Service Worker) ou nock para HTTP.
- **Cobertura como meta** — perseguir 90% coverage gera testes triviais. Correção: focar em mutation score nos módulos críticos; ignorar coverage em módulos boilerplate (DTOs, types).
- **Snapshot tests gigantes (50KB+ JSON)** — qualquer mudança quebra; ninguém revisa. Correção: snapshot apenas de output relevante (subset), ou usar property-based em vez de snapshot.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Projeto novo, ESM, monorepo TS | Vitest |
| Codebase existente já Jest | Continuar Jest (não migrar gratuitamente) |
| Lib publicada, zero-dep | `node:test` (Node 20+) |
| Service orquestrador (I/O-heavy) | Honeycomb (mais integration) |
| Domain lógico denso | Pirâmide (mais unit) |
| Função pura com invariante | `fast-check` property test |
| Microservices polyglot | Pact contract testing |
| Módulo crítico (auth/billing) | StrykerJS mutation testing |

### Passo 6: Referências externas

- Skill: `/tdd-workflow` para ciclo RED→GREEN→REFACTOR, naive-first, vertical slices, princípios gerais de TDD
- Source: `claude-code/knowledge/Nodejs/wf-ab2553f8.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/testing-strategy.md
```

Resultado esperado: entre 110 e 150 linhas. Alvo: ~130 (per `_topic-plan.md:59`).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano:** cap de 200 linhas. Se exceder, condensar (cortar exemplos), não adicionar nova seção. Faixa saudável: 110-150 linhas.
- **G5 do plano (overlap com `/tdd-workflow`):** resistir a explicar ciclo RED-GREEN-REFACTOR ou princípios gerais de TDD — esses estão em `/tdd-workflow`. Aqui é **stack-specific**: Vitest vs Jest vs `node:test`, fast-check, StrykerJS, Pact, fake timers do runner.
- **G6 do plano:** frontmatter `sources:` lista apenas compass-id (`ab2553f8`). Sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **Local — diferenciar runners por trade-off concreto:** "Vitest é mais moderno" é vago. Cada runner precisa de critério decisivo (ESM-first, HMR, ecossistema, zero-dep). Vagueza falha auditoria.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo (sem RED→GREEN):

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/testing-strategy.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: testing-strategy` (literal, kebab-case)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: both` (testing aplica a backend e frontend TS)
- [ ] `tier: 2` (context-dependent, conforme `_topic-plan.md:143`)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 2 anti-padrões com correção
- [ ] `wc -l` retorna entre 110 e 150 (alvo ~130)
- [ ] `grep -c '\[A DEFINIR\]' atoms/testing-strategy.md` retorna 0
- [ ] Triggers contém pelo menos: `vitest`, `jest`, `node:test`, `mock`, `fast-check`, `pact`, `stryker`, `mutation testing`
- [ ] Citação de `/tdd-workflow` em "Referências externas" para deixar claro o limite cross-stack
- [ ] `bun run harness:validate` verde
- [ ] Cada pattern tem trade-off concreto (não "Vitest é melhor" — "Vitest = ESM-first, HMR")

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` retorna número entre 110 e 150
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` retorna 0
- `grep -E '^(topic|stack|layer|sources|tier|triggers|related_skills|updated):' docs/knowledge/nodejs-typescript/atoms/testing-strategy.md | wc -l` retorna 8
- `bun run harness:validate` exit 0

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção (Vitest pra ESM, fast-check pra invariantes, StrykerJS pra módulos críticos)
- Cada runner (Vitest/Jest/node:test) tem critério decisivo, não preferência subjetiva
- Anti-padrões refletem armadilhas reais (overmocking, flakiness por tempo, snapshot gigante)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
