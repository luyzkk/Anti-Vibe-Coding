---
title: "Strict YAML parsers expose silent data corruption hidden by lenient ones"
category: armadilha
tags: [yaml, parser, frontmatter, validator, hidden-corruption]
created: 2026-05-13
---

## Problem

`scripts/compound-check.ts` e `scripts/generate-manifest.js` usavam parsers de YAML hand-rolled (`parseYamlInline`, `stripQ`) — varredura de regex linha-a-linha, sem tabela de tipos completa. Esses parsers eram tolerantes: aceitavam frontmatter sintaticamente invalido e coerciavam para algo parseavel.

Ao migrar ambos para `js-yaml` (`yaml.load(..., { schema: CORE_SCHEMA })`) — TODO entries L12 e L14 — dois `SKILL.md` quebraram imediatamente:

- `skills/todo-pick/SKILL.md` — `description:` continha `:` literal sem aspas.
- `skills/centralize-config/SKILL.md` — `description:` continha placeholder `{n}` (interpretado como flow-mapping incompleto pelo parser estrito).

O parser antigo nao reclamava; gerava strings "quase certas" e o pipeline seguia. O parser estrito recusou os dois arquivos com erro de sintaxe.

## Solution

1. Trocar `parseYamlInline` por `js-yaml` em `scripts/compound-check.ts` — quaisquer erros de parsing viram `frontmatter` rule failure em vez de coercao silenciosa.
2. Trocar parser hand-rolled equivalente em `scripts/generate-manifest.js` (que tambem le SKILL.md para indexar — 1 → 32 skills indexados apos a fix).
3. Corrigir os dois `SKILL.md` afetados: aspas em volta do valor de `description:`.
4. Aceitar que parsers estritos sao validadores de fato — eles encontram corrupcao que parsers lenientes mascararam.

## Prevention

- **Parsers tolerantes nao sao "robustos" — sao "silenciosamente errados".** Se um parser aceita YAML que outro parser rejeita, o primeiro esta coerciando, nao validando.
- Hand-rolling de YAML/JSON em script de quality-gate eh anti-pattern. Mesmo que `js-yaml` ja esteja em `dependencies`, o instinto de "parser inline pra evitar dep" produz bypass surface — o oposto do objetivo de um gate.
- Antes de aceitar um parser custom, perguntar: "que entrada ele aceitaria que `js-yaml` rejeitaria, e isso eh feature ou bug?". Se a resposta nao for clara, usar o parser canonico.
- Migrar de parser leniente para estrito requer um ciclo de fix dos dados que estavam invalidos o tempo todo. Esperar isso e nao reverter o parser por causa do barulho inicial.
- Aplicavel a outros formatos: TOML, JSON5, regex-based markdown parsing. Mesma armadilha.

## Affected files

- `scripts/compound-check.ts` (parser swap)
- `scripts/generate-manifest.js` (parser swap + auto-index skills)
- `skills/todo-pick/SKILL.md` (description quoting)
- `skills/centralize-config/SKILL.md` (description quoting)
- Surfaced em: sessao 2026-05-13 (TODO.md L12 + L14, paralelizadas via subagentes)
