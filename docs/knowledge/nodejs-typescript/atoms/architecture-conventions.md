---
topic: architecture-conventions
stack: nodejs-typescript
layer: backend
sources:
  - research: 3f1af213
  - skill: nodejs-best-practices/SKILL.md
  - skill: nodejs-backend-patterns/SKILL.md
tier: 2
triggers: [layered, modular, dependency injection, DI, ports, adapters, monorepo, conventions]
related_skills: [/architecture]
updated: 2026-05-16
---

# Architecture Conventions — Node.js + TypeScript

## Quando consultar

- Decidir entre layered clássico, modular por feature ou vertical slices para um novo serviço Node.
- Escolher se um DI container (Awilix, InversifyJS, tsyringe) se justifica ou se constructor injection basta.
- Definir onde colocar interfaces de repositório e suas implementações (ports & adapters em TS).
- Organizar monorepo com workspaces e decidir quando adicionar Turborepo ou Nx.
- Estabelecer convenções de barrel files e path aliases sem criar importações circulares.

## Padrões sênior

### Pattern: Feature folders (modular) vs type folders (layered Rails-style)

- **Problema:** organizar por tipo técnico (`controllers/`, `services/`, `models/`) força mudanças em 4 pastas por feature e oculta o que o sistema *faz* quando o projeto cresce.
- **Padrão:** use `src/modules/<bounded-context>/` com 3 subpastas internas: `entry-points/` (HTTP handlers, consumers), `domain/` (lógica pura), `data-access/` (repos, clientes externos). Cada módulo expõe uma única `index.ts` como API pública; cross-module imports batem apenas no barrel.
- **Quando usar:** projetos com ≥3 contextos de negócio ou ≥25 arquivos em `src/`. Estrutura anunciada por Shopify como "Screaming Architecture" — a pasta revela o domínio.
- **Quando NÃO usar:** ≤10 arquivos — mantenha flat em `src/`. Protótipos de 1 recurso CRUD podem usar type folders por até 2 semanas.

---

### Pattern: Fastify plugins vs NestJS modules vs Express + routers

- **Problema:** escolher o mecanismo de modularização errado amarra lógica de negócio ao framework.
- **Padrão:**
  - **Express:** rotas em `src/http/routes/<module>.ts`, módulos expõem funções puras, HTTP é detalhe.
  - **Fastify:** cada módulo é um plugin registrado sob prefixo; `@fastify/autoload` carrega `src/routes/`. O sistema de encapsulamento do Fastify *é* o mecanismo de DI — plugins filhos herdam hooks e decorators do pai sem vazar para cima.
  - **NestJS:** use `@Module()` e `@Injectable()` apenas na camada de apresentação; a camada de domínio fica em TypeScript puro sem decorators NestJS para permitir testes sem `Test.createTestingModule`.
- **Quando usar NestJS:** time migrando de Angular/Spring, benefício real do ecossistema (Swagger, CRUD generators), trade-offs aceitos.
- **Quando NÃO usar NestJS:** serviço novo sem legado — o overhead de cold start e `experimentalDecorators` raramente se paga.

---

### Pattern: Constructor/closure injection sem container (default)

- **Problema:** containers DI com decorators (`@Injectable`, `reflect-metadata`) adicionam latência de cold start, exigem flags não-padrão do TS (`experimentalDecorators`, `emitDecoratorMetadata`) e obscurecem o grafo de dependências em metadata de runtime.
- **Padrão:** passe dependências como argumentos de constructor (classes) ou parâmetros de fábrica (funções). Wire tudo em um único `src/main.ts` (composition root). O `tsc` verifica dependências faltando em compile time — sem surpresa em runtime.
  ```ts
  type Deps = { users: UserRepo; emailer: Emailer; clock: Clock };
  export const registerUser = (deps: Deps) => async (input: RegisterInput) => { /* ... */ };
  // composition root
  const registerUser = makeRegisterUser({ users, emailer, clock: realClock });
  ```
- **Quando usar container:** ≥30 services com grafos transitivos profundos E lifetime scoping por request E time que se beneficia de auto-wiring. Nesse caso, prefira **Awilix** (sem decorators, usa proxy injection, suporta `createScope()`).
- **Quando NÃO usar InversifyJS/tsyringe:** dependem de `emitDecoratorMetadata`, que o TC39 Stage 3 standard decorators torna incompatível sem caminho de migração.

---

### Pattern: Ports & adapters — interface no domain, impl no data-access

- **Problema:** use cases importando diretamente `pg.Pool` ou cliente HTTP acoplam a lógica de negócio à infra — uma migração de banco quebra o domínio.
- **Padrão:** defina a interface em `domain/` (`UserRepo`); implemente em `data-access/` (`createPgUserRepo`, `createInMemoryUserRepo`). Use cases dependem da interface. A dependência aponta para dentro (Dependency Rule).
  ```ts
  // domain/user.repo.ts
  export interface UserRepo { byId(id: UserId): Promise<User | null>; save(u: User): Promise<void>; }
  // data-access/user.repo.pg.ts
  export const createPgUserRepo = (pool: Pool): UserRepo => ({ byId: ..., save: ... });
  ```
- **Quando usar:** toda camada de data-access com lógica de negócio real; testabilidade via in-memory impl.
- **Quando NÃO usar:** 1 única implementação sem plano de segunda — interface vira ruído. RULE 7.3: introduza a interface quando a segunda impl está no horizonte, não antes.

---

### Pattern: Monorepo com workspaces — pnpm puro vs Turborepo/Nx

- **Problema:** compartilhar types e utils entre apps sem duplicação, mantendo builds independentes.
- **Padrão:** layout `apps/` (deployáveis) + `packages/` (libs internas). Use `pnpm-workspace.yaml` com `"workspace:*"` para referências internas. TypeScript project references (`composite: true` + `tsc -b`) em cada package.
- **Quando usar pnpm workspaces puro:** ≤10 packages — funciona sem orchestração extra.
- **Quando adicionar Turborepo ou Nx:** CI ultrapassa ~5 minutos OU ≥10 packages — para remote caching, affected-graph testing e minimização de CI por PR.

---

### Pattern: Barrel files como API pública de módulo (1 nível)

- **Problema:** imports profundos (`from './module/internal/service'`) acoplam consumers ao layout interno; barrels recursivos impedem tree-shaking e causam circular imports.
- **Padrão:** `index.ts` reexporta apenas a surface pública do módulo (1 nível de profundidade). Cross-module imports sempre passam pelo barrel.
- **Quando usar:** módulos com >5 arquivos que têm consumers externos.
- **Quando NÃO usar:** módulo de 1-2 arquivos (overhead sem benefício). Nunca crie barrel recursivo que reexporta outros barrels.

---

### Pattern: Configuration tipada via Zod no startup

- **Problema:** `process.env.DATABASE_URL` lido diretamente dentro de use cases cria dependência de ambiente global, dificulta testes e falha silenciosamente em runtime.
- **Padrão:** parse e valide `process.env` uma vez no startup com Zod, produza objeto `Config` tipado, injete nos módulos que precisam.
  ```ts
  const Config = z.object({ DATABASE_URL: z.string().url(), JWT_SECRET: z.string().min(32) });
  export const config = Config.parse(process.env);
  ```
- **Quando usar:** todo projeto com variáveis de ambiente.
- **Quando NÃO usar:** scripts de 1 arquivo onde inline `process.env` é aceitável.

---

## Anti-padrões

- **Clean Architecture "ritual" em CRUD trivial:** 4 camadas + mapper duplo (entity → dto → viewmodel) para endpoint de 1 query. Camadas vazias são custo puro. Corrija começando com layered simples (controller → service → repo); promova para Clean Architecture só quando ≥3 inversões reais aparecem.

- **DI container global com decorators em serviço Node sem NestJS:** `@Injectable()` + `reflect-metadata` obscurece o grafo, aumenta cold start e amarra o código a flags não-padrão (`experimentalDecorators`, `emitDecoratorMetadata`) sem caminho de migração para TC39 Stage 3. Corrija com constructor injection + composition root em `main.ts`.

- **Barrel files recursivos (index.ts reexportando outros index.ts):** bundler não tree-shakea, cold start cresce, circular imports emergem. Corrija: barrels apenas no nível do módulo (1 nível), nunca encadeados.

- **God service agrupado por entidade:** `UserService` com 800 linhas fazendo auth + billing + email + notification. O nome do entity não é critério de coesão. Corrija: split por contexto de negócio (`BillingService`, `NotificationService`, `AuthService`).

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Serviço novo com 1-2 recursos CRUD | Flat `src/` + layered simples (controller → service → repo) |
| ≥3 contextos de negócio ou ≥25 arquivos | Feature folders: `src/modules/<context>/` |
| Framework de HTTP | Express: rotas thin + módulos framework-free; Fastify: plugins com encapsulamento |
| NestJS justificado | Domínio em TS puro sem decorators; NestJS só na camada de apresentação |
| DI padrão (qualquer escala) | Constructor/closure injection, composition root em `main.ts` |
| ≥30 services com request-scoped lifetime | Awilix (sem decorators, proxy injection) |
| Decorator-based DI (InversifyJS, tsyringe) | Evitar — incompatível com TC39 Stage 3 decorators |
| 2+ impls de repo (PG + in-memory) | Interface em `domain/`, impl em `data-access/` (ports & adapters) |
| 1 impl única sem segunda prevista | Sem interface — função concreta direto |
| Monorepo ≤10 packages | pnpm workspaces + TypeScript project references |
| Monorepo com CI lento ou ≥10 packages | Turborepo ou Nx |

---

## Referências externas

- Skill: `/architecture` — SOLID, monolith vs microservices, CQRS, event sourcing, ADRs, Law of Demeter, composition vs inheritance (princípios cross-stack; não duplicados aqui)
- Research: `3f1af213` — `claude-code/knowledge/Nodejs/compass_artifact_wf-3f1af213-e4f0-4600-ad65-88d1903bc4fe_text_markdown.md` (112 regras de arquitetura Node+TS)
- Skill: `claude-code/knowledge/Nodejs/nodejs-best-practices/SKILL.md`
- Skill: `claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md`
