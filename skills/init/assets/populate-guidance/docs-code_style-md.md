# Guidance: docs/CODE_STYLE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/CODE_STYLE.md documenta as **convencoes de estilo de codigo do projeto**: nomenclatura, formatacao, patterns preferidos, e anti-patterns com rationale. Eh complementar ao linter — o linter enforca automaticamente o que pode ser verificado mecanicamente; este doc cobre as convencoes que requerem julgamento humano ou contexto adicional.

O publico primario sao engenheiros e agentes adicionando codigo novo, e revisores verificando se codigo submetido segue as convencoes do projeto.

## Espirito do doc (tom esperado)

Pragmatico e ancorado em exemplos concretos do proprio codebase. "Arquivos TypeScript usam kebab-case (user-service.ts, auth-middleware.ts)" com um link para o diretorio onde voce pode confirmar isso eh util. "Use nomes descritivos" nao eh — qualquer desenvolvedor intermediario ja sabe isso. Cada regra deve ter ou um link para o config que a enforca automaticamente, ou um exemplo do porque ela existe.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `.eslintrc`, `biome.json` — regras de linter. O que ja eh enforced automaticamente nao precisa ser repetido aqui — apenas regras que requerem julgamento adicional.
- `.rubocop.yml` — regras RuboCop para projetos Rails. Estilo Ruby declarado.
- `.editorconfig` — regras de formatacao basica (indent size, line endings). Base que todos os editores seguem.
- `prettier.config` ou `prettier` em package.json — formatador automatico. O que o Prettier decide nao precisa de documentacao manual.

## Por H2 — o que escrever

### Naming Conventions
Convencoes de nomenclatura que nao sao enforced automaticamente ou que tem justificativa de contexto. Inclui: convencao de nome de arquivo (kebab-case? PascalCase para componentes?), nome de variaveis em casos ambiguos, e convencoes especificas por tipo de modulo (controllers, services, hooks, models). Se o projeto tem um pattern consistente observavel no codebase, documente-o — nao invente.

**Cubra:** nomenclatura de arquivos, convencoes por tipo de modulo (controller/service/hook), casos onde a convencao nao e obvio
**NAO escreva:** regras basicas de lowercase/uppercase sem contexto do projeto especifico

### Formatting Rules
A separacao entre o que o formatador (Prettier, Biome, RuboCop) decide automaticamente e o que requer convencao manual. Inclui: como lidar com imports (ordenacao automatica ou convencao manual?), quando quebrar linha em argumentos longos, convencao de trailing comma. O objetivo eh eliminar debate em code review sobre formatacao.

**Cubra:** o que o formatador cuida (link para config), o que requer convencao manual, como rodar o formatador localmente
**NAO escreva:** regras que o formatador ja decide — link para o config do formatador

### Preferred Patterns
Os patterns que o projeto prefere em situacoes onde existem multiplas abordagens validas. Exemplos concretos: hash maps sobre switch-case para dispatch, early returns sobre else aninhado, funcoes puras sobre side effects implicitos. Cada preferencia deve ter um "por que" — preferencias sem justificativa sao arbitrarias.

**Cubra:** hash maps vs switch, early returns, patterns funcionais vs imperativo (no contexto do projeto)
**NAO escreva:** lista de todos os patterns de programacao existentes — foque nos que sao relevantes para o codebase atual

### Anti-Patterns
Os patterns que o projeto explicitamente evita, com rationale. Diferentes de "Preferred Patterns" (onde ha escolha), anti-patterns sao proibidos porque causaram problemas reais ou tem risco alto. Exemplos: `any` em TypeScript porque elimina o valor do type system, `console.log` em producao porque polui logs operacionais, strings de SQL interpoladas porque abre SQL injection.

**Cubra:** patterns proibidos com justificativa tecnica, exemplos concretos do que NAO fazer
**NAO escreva:** lista de anti-patterns genericos sem relevancia para este codebase especifico

## Stack-specific

### Rails
RuboCop enforces most Ruby style. Convencoes manuais tipicas: `snake_case` para metodos e variaveis, `PascalCase` para classes, nomes de controller no plural (`UsersController`), nomes de model no singular (`User`). Evitar callbacks do ActiveRecord para logica de negocio — preferir service objects.

### Next + React
Biome ou ESLint enforces basico. Convencoes: componentes em PascalCase, hooks com prefixo `use`, utilitarios em camelCase, paginas em kebab-case no filesystem. TypeScript `strict: true` — zero `any`. Server Components por default, `'use client'` com comentario justificando.

### Node + TypeScript
Similar ao Next mas sem convencoes de routing. Arquivos de modulo em kebab-case, classes em PascalCase, funcoes exportadas em camelCase. TypeScript `strict: true`. Preferencia por modulos ESM sobre CommonJS em projetos novos.

## Links obrigatorios

`docs/QUALITY_SCORE.md` — a dimensao de manutenibilidade no quality score eh parcialmente derivada das convencoes deste documento. O link garante que revisores entendam como CODE_STYLE.md alimenta a pontuacao de review.

## Quando deixar TODO

Se o projeto tem linter configurado mas sem regras customizadas documentadas alem do default, deixe `TODO(<style-decisions needed>): apenas regras default do linter identificadas — verificar se ha convencoes estabelecidas nao documentadas`. NAO assuma que "default do linter" eh documentacao suficiente de estilo.

## Anti-patterns

- NAO repetir regras que o linter ja enforces — link para o config do linter
- NAO documentar estilo sem exemplos do proprio codebase — regras abstratas sao menos uteis do que exemplos concretos
- NAO misturar convencoes de estilo com decisoes arquiteturais — arquitetura vai em ARCHITECTURE.md
- NAO deixar anti-patterns sem rationale — "nao use switch" sem "porque hash maps sao mais seguros de refatorar" nao ensina ninguem
