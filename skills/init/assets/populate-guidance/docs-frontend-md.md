# Guidance: docs/FRONTEND.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/FRONTEND.md documenta as **convencoes tecnicas da camada de apresentacao**: como o routing funciona, como os componentes sao organizados, qual sistema de estilo o projeto adota, e qual o nivel de acessibilidade que o projeto almeja. Eh o guia de referencia para um engenheiro adicionando uma nova pagina ou componente.

O publico primario sao engenheiros frontend (humanos e agentes) tomando decisoes de implementacao no dia-a-dia.

## Espirito do doc (tom esperado)

Tecnico e especifico para o stack. "Usamos App Router do Next.js 14 com server components por default — use `'use client'` apenas quando necessario" eh bom. "Temos um frontend moderno" eh ruim. Cada afirmacao deve ser verificavel no codebase. Avoid aspiracoes — descreva o que existe.

## Sinais a procurar no codebase

- `src/app/` — confirma App Router (Next.js 14+). Presenca de `page.tsx`, `layout.tsx`, `loading.tsx`.
- `src/components/` — biblioteca de componentes. A estrutura interna (ui/, features/, shared/) revela a convencao de organizacao.
- `app/views/` — confirma ERB/Rails. Presenca de `.html.erb` e Hotwire/Turbo revela a convencao de interatividade.
- `jsx`, `tsx` — componentes React. Verifica se tem `.jsx` misturado com `.tsx` (pode ser problema de tipagem).
- `hotwire`, `stimulus` — framework de interatividade no Rails moderno.

## Por H2 — o que escrever

### Routing
Descreve como o sistema de routing funciona: file-based (Next App Router, Nuxt) vs config-based (Rails routes.rb, React Router). Inclui convencoes de nomenclatura de rotas e como rotas protegidas (autenticadas) sao tratadas. Se existe middleware de auth no routing, menciona aqui.

**Cubra:** abordagem de routing (file-based vs config), nomenclatura de rotas, rotas protegidas
**NAO escreva:** implementacao detalhada de cada rota individual (pertence ao codigo)

### Components
Descreve a hierarquia de componentes: onde ficam os componentes compartilhados, como diferenciar componentes de UI genericos de componentes especificos de feature, e a convencao de nomenclatura. Se o projeto segue Atomic Design ou similar, explica brevemente e aponta para onde ver exemplos reais.

**Cubra:** hierarquia (shared vs page-specific), convencao de nomenclatura, onde ficam os componentes
**NAO escreva:** documentacao de cada componente individual (vive em Storybook ou no proprio componente)

### Styling System
Qual abordagem de estilo o projeto usa (Tailwind, CSS Modules, styled-components, SCSS) e como os design tokens se integram. Inclui a convencao para evitar valores hardcoded (ex: "use sempre classes Tailwind, nao CSS inline"). Se tem ESLint rule ou similar para enforcar isso, mencione.

**Cubra:** framework ou abordagem CSS, como tokens de design sao usados, regras de estilo criticas
**NAO escreva:** tutorial de como usar Tailwind (link para docs oficiais), lista de classes utilitarias

### Accessibility
O nivel WCAG que o projeto mira (2.0 A, 2.1 AA, etc.), como o time verifica acessibilidade (manual, axe, Lighthouse), e as regras criticas que devem ser seguidas (alt em imagens, labels em formularios, contraste minimo). Se existe teste automatico de a11y, mencionar aqui.

**Cubra:** nivel WCAG alvo, ferramentas de verificacao de a11y, regras de acessibilidade criticas
**NAO escreva:** tutorial de WCAG completo — citar nivel e link para spec eh suficiente

## Stack-specific

### Rails
Hotwire/Turbo eh o framework de interatividade default. `app/views/` contem templates ERB. Componentes de UI reusaveis ficam em `app/components/` se usando ViewComponent, ou em partials em `app/views/shared/`. Stimulus controllers adicionam comportamento JavaScript localizado sem SPA.

### Next + React
App Router com Server Components por default. `'use client'` apenas quando necessario (event handlers, hooks, acesso ao browser). `src/components/ui/` para primitivos de UI, `src/components/` por feature para componentes compostos. Tailwind via CSS classes — nao inline styles.

### Node + TypeScript
Geralmente React SPA ou SSR. Layout de componentes em `src/components/` sem App Router. State management via Context ou biblioteca externa (Zustand, Jotai) dependendo da complexidade. Verificar package.json para identificar o framework exato.

## Links obrigatorios

`ARCHITECTURE.md` — o frontend eh uma camada no mapa de arquitetura. O link ajuda o leitor a entender como a camada de apresentacao se conecta com as APIs e servicos do backend.

## Quando deixar TODO

Se o projeto usa framework de componentes (Shadcn, Radix, MUI) mas sem documentacao clara de como customizar, deixe `TODO(<component-library-docs needed>): biblioteca de componentes identificada mas sem guia de customizacao — verificar com dev frontend`. NAO assuma convencoes que nao foram confirmadas no codigo.

## Anti-patterns

- NAO descrever o frontend como "React moderno" sem especificar versao e paradigma (hooks vs classes, App Router vs Pages Router)
- NAO omitir acessibilidade — mesmo que a implementacao atual seja basica, documente o nivel atual honestamente
- NAO listar componentes individuais aqui — isso pertence a Storybook ou documentacao inline
- NAO misturar convencoes de frontend com design tokens (tokens pertencem a docs/DESIGN.md)
