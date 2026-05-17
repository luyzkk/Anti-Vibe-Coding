<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 02: Pilot atom — `type-system-idioms.md`

**Plano:** 01 — Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-01 (precisa de `atoms/` existindo)
**Visual:** false

---

## O que esta fase entrega

Átomo piloto `docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` completo, ~120-150 linhas, seguindo o skeleton fixo de `_topic-plan.md:73-112`. Serve como **gate de granularidade (D3)** e como **template de formato** para os 13 átomos restantes (Planos 04-06).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, 100-200 linhas) |

---

## Implementacao

### Passo 1: Escrever frontmatter completo

Frontmatter **exato** (ordem dos campos importa — vira template para os outros átomos):

```yaml
---
topic: type-system-idioms
stack: nodejs-typescript
layer: both
sources:
  - research: f8f4e50c
  - research: 2230af87
tier: 1
triggers: [type, generic, branded, discriminated, satisfies, ESM, CJS]
related_skills: [/design-patterns]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `f8f4e50c` — TypeScript Type System (1503 linhas, branded/generics/discriminated/Result/exhaustiveness)
- `2230af87` — O Idioma do Node.js + TypeScript (951 linhas, features Node 20+/22+ + TS 5.x)

### Passo 2: Escrever corpo seguindo skeleton fixo

Seções obrigatórias na ordem (de `_topic-plan.md:87-111`):

1. **`# Type System Idioms — Node.js + TypeScript`** (título)
2. **`## Quando consultar`** — 3-5 bullets de cenários
3. **`## Padrões sênior`** — 3-7 patterns (subsections `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. **`## Anti-padrões`** — 2-5 armadilhas com correção
5. **`## Critérios de decisão`** — tabela ou bullets "se X, então Y"
6. **`## Referências externas`** — skills relacionadas + paths das fontes

### Passo 3: Conteúdo dos patterns (extração de `f8f4e50c` + `2230af87`)

Patterns recomendados (mínimo 3, máximo 7 — escolher os de maior alavancagem sênior em Node+TS, evitando duplicar `/design-patterns`):

- **Pattern: Branded types para identificadores opacos** — evitar `string` solto para `UserId`, `OrderId`, etc.
- **Pattern: Discriminated unions com `kind` literal** — exhaustiveness via `switch` + `never`
- **Pattern: `satisfies` operator (TS 4.9+)** — type narrowing sem perder literal type
- **Pattern: `Result<T, E>` ao invés de throws para domain errors** — citar `/design-patterns` para teoria geral, focar em integração com APIs Node (HTTP handlers, queue workers)
- **Pattern: ESM vs CJS interop em libs publicadas** — `"type": "module"`, `exports` field, dual packages

Anti-padrões (2-5):

- `any` como escape hatch em lugar de `unknown` + type guard
- `as` casting sem type guard (perde garantia em runtime)
- Generics que não constrangem (`<T>` sem `extends`) virando `any` efetivo
- `enum` ao invés de union literal (gera runtime overhead, mal interop com type-only contexts)

Critérios de decisão (exemplo de tabela):

| Cenário | Escolha |
|---|---|
| Modelar id de domínio que não pode ser confundido com outro id | Branded type (`type UserId = string & { readonly __brand: 'UserId' }`) |
| Modelar estado finito com handlers exhaustive | Discriminated union + switch + `assertNever(x: never)` |
| Modelar erro de domínio recuperável | `Result<T, DomainError>` |
| Modelar erro inesperado (programmer error) | `throw` (não capturar; deixar process crash + observability) |

Referências externas (mínimo):

- Skill: `/design-patterns` para Result Pattern, error handling cross-stack
- Source: `claude-code/knowledge/Nodejs/wf-f8f4e50c.md`
- Source: `claude-code/knowledge/Nodejs/wf-2230af87.md`

### Passo 4: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md
```

Resultado esperado: entre 100 e 200 linhas. Idealmente 120-150 (`_topic-plan.md:54`).

---

## Gotchas

- **G3 do plano:** este átomo é o **gate de granularidade (D3)**. Se ficar <60 linhas, granularidade está sobre-decomposta (merge alguns dos 14 átomos antes de Planos 04-06). Se >200, sub-decomposta (split). Resultado registra-se em MEMORY.md como `Métricas: pilot atom = N linhas`.
- **G4 do plano (preview):** este átomo vira **template de formato** para os 13 restantes. Frontmatter, ordem de seções, naming de Pattern/Anti-padrão — tudo será copiado verbatim em Planos 04/05/06. Cuidado redobrado com consistência.
- **Local — fontes vs paráfrase:** `f8f4e50c` e `2230af87` são pesquisas profundas (~2.500 linhas combinadas). Tentação de copiar parágrafos — **resistir**. Átomo é condensação sênior (~16× compressão alvo). Paráfrase + bullets curtos, não cópia.
- **Local — sem `[A DEFINIR]`:** CA-01 exige zero placeholders. Se faltar conteúdo para uma seção, **escrever conteúdo real** ou **omitir a seção** (raras vezes — corpo skeleton tem 5 seções obrigatórias).

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como fase-01, este átomo é markdown. Usar checklist de validação de conteúdo em vez de RED→GREEN.

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md`
- [ ] Frontmatter contém **todos** os 8 campos: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: type-system-idioms` (literal, kebab-case, igual ao filename sem `.md`)
- [ ] `stack: nodejs-typescript` (literal — alinha com nome da pasta)
- [ ] `layer: both` (este átomo aplica a backend e frontend TS)
- [ ] `tier: 1` (must-know, conforme `_topic-plan.md:142`)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 3 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 2 anti-padrões com correção
- [ ] `wc -l` retorna entre 100 e 200
- [ ] `grep -c '\[A DEFINIR\]' atoms/type-system-idioms.md` retorna 0
- [ ] `bun run harness:validate` continua verde

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` retorna número entre 100 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` retorna 0
- Frontmatter parseável como YAML (pode ser validado com `bun -e "import yaml from 'js-yaml'; ..."` ou inspeção manual)

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões reais, não como bullets genéricos de tutorial
- Nenhum pattern duplica conteúdo coberto cross-stack por `/design-patterns` (diferencial Node+TS-específico é claro)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
