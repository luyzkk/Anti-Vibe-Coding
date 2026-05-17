<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 05: Átomo `code-smells-catalog.md`

**Plano:** 04 — Atom Batch A
**Sizing:** 1.5-2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 `docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md` (~150 linhas), condensando os 8-12 code smells mais agudos em Node+TS extraídos do catálogo de 52 smells da fonte `98973791`. Agrupados em 5 categorias (type, async, boundary, error, structure), cada smell com problema → fix. Cobre o ângulo Node+TS-specific (type assertion overuse, `any` leak, forgotten `await`, fire-and-forget) que `/design-patterns` (smells cross-stack) não cobre.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~150 linhas) |

---

## Implementacao

### Passo 1: Frontmatter (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: code-smells-catalog
stack: nodejs-typescript
layer: both
sources:
  - research: 98973791
tier: 2
triggers: [code smell, refactor, any, enum, await, fire-and-forget, god module]
related_skills: [/design-patterns]
updated: 2026-05-16
---
```

Origem (de `_catalog.md`):
- `98973791` — Catálogo de Code Smells (1004 linhas, 52 smells específicos Node+TS com caminhos de refactor)

### Passo 2: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem — **adaptação para catálogo:** a seção "Padrões sênior" aqui contém **padrões de refactor** (problema → smell → padrão limpo), não Pattern/Anti-pattern clássico. O atom é em si um catálogo de smells, então "Anti-padrões" é breve (smells de meta-nível) e "Critérios de decisão" lista "quando o smell é tolerável".

1. `# Code Smells Catalog — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets (code review, refactor, onboarding de junior)
3. `## Padrões sênior` — 5-7 smells agrupados em sub-seções `### Smell: {nome}` com Sintoma / Por que dói / Refactor / Quando tolerar
4. `## Anti-padrões` — 2-3 meta-smells (ex: "smells em massa via auto-fix sem entender contexto")
5. `## Critérios de decisão` — tabela "smell → severidade → urgência"
6. `## Referências externas` — skill `/design-patterns` + path da fonte

### Passo 3: Smells recomendados (guia editorial — executor expande)

Condensar 52 smells da fonte em **8-12 mais agudos** agrupados nas 5 categorias:

**Type smells (2-3):**
- **Smell: `any` leak via `JSON.parse`/`Response.json()`** — input externo não validado vira `any` propagando pelo código. Refactor: Zod/Valibot no boundary, retorna tipo narrow.
- **Smell: `enum` numérico em union literal-friendly** — overhead runtime, mal interop com type-only. Refactor: `as const` union ou `Record<K, V>` map.
- **Smell: type assertion (`as Foo`) sem type guard** — perde garantia em runtime. Refactor: type predicate function (`isFoo(x): x is Foo`) ou Zod parse.

**Async smells (2-3):**
- **Smell: forgotten `await`** — `someAsync()` sem await; Promise pending vira floating, erro silencioso. Refactor: ESLint `@typescript-eslint/no-floating-promises`; `void someAsync()` se intencional.
- **Smell: fire-and-forget sem error boundary** — `worker.queue(job)` sem catch; falhas somem. Refactor: queue wrapper que captura + log + DLQ.
- **Smell: sequential `await` em loop quando paralelo era seguro** — `for (const x of xs) { await op(x) }`. Refactor: `Promise.all(xs.map(op))` ou batch com `p-limit`.

**Boundary smells (2-3):**
- **Smell: no DTO validation at input** — handler HTTP/queue consome `req.body` direto como tipo de domínio. Refactor: parse com Zod, tipo de domínio só após validação.
- **Smell: ORM model vazando para response** — `res.json(user)` expondo `passwordHash`. Refactor: DTO de saída explícito + mapper.
- **Smell: env var lida em runtime (não no boot)** — `process.env.X` em hot path; lento + sem validação. Refactor: parse + validate no boot (Zod schema do env), passa objeto config.

**Error smells (1-2):**
- **Smell: `try/catch` swallowing** — captura + return null. Refactor: re-throw com `cause:` chain, ou retornar `Result.err(...)` explícito.
- **Smell: `console.error` em handler de produção** — sem nível, sem correlation. Refactor: Pino logger (ver átomo `error-handling-observability`).

**Structure smells (1-2):**
- **Smell: god module (>500 linhas, múltiplas responsabilidades)** — difícil navegar, alto risco de regression. Refactor: extract por responsabilidade (parser/validator/persister/notifier).
- **Smell: deep nesting (callbacks ou ifs aninhados >4 níveis)** — pirâmide. Refactor: early return + extract function.

### Passo 4: Anti-padrões (meta-smells — 2-3)

- **Auto-fix em massa sem revisar** — ESLint `--fix` em PR grande quebra comportamento (ex: remoção de `await` floating sem entender). Correção: rodar fixes em PRs pequenos por categoria.
- **Cobrir todos os 52 smells de uma vez** — backlog impossível. Correção: priorizar 3-5 smells por sprint, tag em tickets.
- **Confundir smell com bug** — smell é sinal de risco, não erro confirmado. Correção: code review decide se vale o refactor agora ou backlog.

### Passo 5: Critérios de decisão (tabela)

| Smell | Severidade | Urgência |
|---|---|---|
| `any` leak via input externo | Alta | Refactor agora (bug em potencial) |
| Forgotten `await` | Alta | Refactor agora (data race / unhandled rejection) |
| Fire-and-forget sem error boundary | Alta | Refactor agora (perde falha) |
| Sequential `await` em loop paralelo-seguro | Média | Refactor quando hot path |
| God module >500 linhas | Média | Refactor quando tocar de novo |
| `enum` numérico | Baixa | Refactor oportunista |
| Type assertion sem guard | Média | Refactor se input não trustável |

### Passo 6: Referências externas

- Skill: `/design-patterns` para smells cross-stack (long method, feature envy, primitive obsession) e refactoring catalog (Fowler)
- Source: `claude-code/knowledge/Nodejs/wf-98973791.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md
```

Resultado esperado: entre 100 e 200 linhas. Alvo: ~150 (átomo mais denso por ter mais sub-seções de smells).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim. `topic: code-smells-catalog`.
- **G2 do plano:** cap de 200 linhas. Fonte tem 52 smells; **condensar para 8-12 mais agudos**. Resistir a transcrever tudo — match conceitualmente smells similares e linkar à fonte para o catálogo completo.
- **G5 do plano:** overlap com `/design-patterns`. Não duplicar Fowler smells (long method, primitive obsession) — focar nos Node+TS-specific (forgotten await, any leak, ORM vazando).
- **G6 do plano:** `sources: [{research: 98973791}]`.
- **Local — formato adaptado:** seção "Padrões sênior" usa sub-seções `### Smell:` em vez de `### Pattern:`. Manter sub-bullets consistentes (Sintoma / Por que dói / Refactor / Quando tolerar) — análogo ao piloto.
- **Local — agrupamento por categoria é gate de qualidade:** se >12 smells, sinal de que algumas categorias estão inchadas; revisar.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md`
- [ ] Frontmatter contém os 8 campos na ordem
- [ ] `topic: code-smells-catalog` (literal)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: both`
- [ ] `tier: 2`
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem
- [ ] Entre 8 e 12 smells listados (não 52 — condensação)
- [ ] Smells agrupados nas 5 categorias: type, async, boundary, error, structure
- [ ] Sub-seções `### Smell:` com Sintoma / Por que dói / Refactor / Quando tolerar
- [ ] Pelo menos 2 meta-anti-padrões (auto-fix em massa, cobrir tudo de uma vez)
- [ ] Tabela severidade × urgência presente em "Critérios de decisão"
- [ ] `wc -l` retorna entre 100 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]' atoms/code-smells-catalog.md` retorna 0
- [ ] Triggers contém pelo menos: `code smell`, `refactor`, `any`, `enum`, `await`, `fire-and-forget`, `god module`
- [ ] Citação de `/design-patterns` em "Referências externas" para evitar duplicação de Fowler smells

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md` exit 0
- `wc -l` retorna entre 100 e 200
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos idêntica ao piloto

**Por humano:**
- Sênior reconhece os smells como "já vi isso em PR semana passada", não bullets de tutorial
- Cada smell tem refactor concreto (não "melhorar o código")
- Categorias não vazam (smell async não está em type)
- Diferencial vs `/design-patterns` claro (Node+TS-specific: forgotten await, any leak, ORM vazando)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
