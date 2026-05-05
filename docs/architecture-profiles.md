# Architecture Profiles

Five profiles recognized by `/anti-vibe-coding:detect-architecture`.
Each profile shapes how structural skills adapt their output (Plano 04).

Links to specific profiles: `#clean-architecture-ritual`, `#mvc-flat`,
`#vertical-slice`, `#nextjs-app-router`, `#unknown-mixed`.

---

## clean-architecture-ritual

### Características

Projetos que seguem Clean Architecture de forma explícita e ritualística: camadas nomeadas
com nomes canônicos (domain, application, infrastructure, presentation — ou equivalentes
como core/ports/adapters), separação rigorosa entre entidades e casos de uso, inversão de
dependência implementada com interfaces explícitas, e geralmente DTOs de fronteira entre
camadas.

O traço definidor é a presença de convenção compartilhada da equipe sobre o que pertence
a cada camada — violações são visíveis como code smell.

### Sinais usados pelo detector

- Diretórios de primeiro nível: `domain/`, `application/`, `infrastructure/`, `presentation/`
  (ou `core/`, `adapters/`, `ports/` como variantes aceitas)
- Interfaces com sufixo `Repository`, `Gateway`, `UseCase`, `Service` agrupadas em camada
  separada de implementação
- Pasta `entities/` ou `models/` sem decorators de framework (ex: sem `@Entity` do TypeORM
  diretamente na entidade de domínio)
- `usecases/` ou `application/services/` com classes orquestradoras
- Ausência de imports de framework nas camadas internas (domain/application)
- Presença de barrel files (`index.ts`) por camada

Confiança aumenta com co-ocorrência: projeto que tem `domain/entities/`, `application/usecases/`
e `infrastructure/repositories/` ao mesmo tempo recebe confiança alta.

### Como as skills adaptam

- **architecture**: enfatiza coesão de camada; alerta sobre dependências cruzadas
  (infrastructure importando domain diretamente sem inversão); sugere revisar se entidades
  de domínio estão livres de acoplamento a frameworks antes de propor mudanças estruturais.
- **plan-feature**: organiza fases por camada (1 fase = 1 camada tocada); explicita qual
  interface de porta é necessária antes de implementar o adaptador; propõe entidade/caso de
  uso antes de infraestrutura.
- **write-prd**: template inclui campo "camadas afetadas" e "contrato de porta" por requisito
  funcional; solicita descrição explícita de como o caso de uso orquestra o domínio.
- **execute-plan**: cada passo de implementação nomeia a camada destino; rejeita sugestão de
  colocar lógica de negócio em controlador mesmo que "mais rápido"; mantém ordem de
  dependência (domain → application → infrastructure → presentation).
- **verify-work**: verifica que nenhuma camada interna importa camada externa; checa que
  interfaces de repositório estão em `application/` ou `domain/`, não em `infrastructure/`;
  mede drift de convenção.

### Exemplo canônico

Backend NestJS com Clean Architecture explícita: `src/domain/entities/`, `src/domain/repositories/`
(interfaces), `src/application/use-cases/`, `src/infrastructure/database/repositories/`
(implementações), `src/presentation/http/controllers/`. Cada camada em módulo separado com
barrel file.

### Recomendações

- Antes de adicionar uma nova abstração, pergunte se ela pertence a domain ou application.
- Evitar herança entre entidades de domínio e entidades de ORM — são responsabilidades distintas.
- "Repository" em `domain/` é interface; implementação em `infrastructure/` — não inverter.
- Overhead de camadas é real: avaliar se a equipe tem maturidade para manter a convenção antes
  de adotar em projetos pequenos.

---

## mvc-flat

### Características

Estrutura flat organizada por tipo de artefato: todos os controllers juntos, todos os services
juntos, todos os repositories juntos, todas as entities juntas. Sem separação por feature ou
camada estratégica. Comum em projetos Express, Fastify ou NestJS que cresceram incrementalmente
sem arquitetura explícita, e em projetos Rails-like.

O traço definidor é a ausência de subpastas por domínio de negócio — um controller de `users`
e um controller de `orders` coexistem no mesmo diretório `controllers/`.

### Sinais usados pelo detector

- Diretórios de primeiro nível: `controllers/`, `services/`, `repositories/`, `entities/`
  (ou `models/`) — todos no mesmo nível
- Nomes de arquivo seguem padrão `{entidade}.controller.ts`, `{entidade}.service.ts`,
  `{entidade}.repository.ts`
- Ausência de subdiretórios organizados por feature ou domínio dentro dessas pastas
- Presença de `middlewares/` ou `interceptors/` como pasta flat também
- Número de arquivos por pasta tende a crescer linearmente com o número de entidades

### Como as skills adaptam

- **architecture**: alerta sobre risco de acoplamento horizontal à medida que o projeto
  cresce; apresenta a opção de migração incremental para vertical-slice sem prescrever; aponta
  arquivos com mais de 300 linhas como candidatos a extração.
- **plan-feature**: gera fases separadas por tipo de artefato (1 fase = adicionar ao service,
  1 fase = adicionar ao controller, 1 fase = adicionar ao repository); nomeia arquivos
  existentes que serão modificados.
- **write-prd**: template solicita descrição de qual service é responsável pela feature e se
  há risk de colisão com service existente de mesmo nome.
- **execute-plan**: executa em ordem controller → service → repository (ou inverso, conforme
  convenção do projeto); não cria subpastas por feature.
- **verify-work**: verifica que nenhum controller importa outro controller diretamente; checa
  que services não acessam banco sem passar por repository; mede crescimento de arquivos por
  pasta como proxy de complexidade.

### Exemplo canônico

Backend Express com TypeScript: `src/controllers/users.controller.ts`,
`src/controllers/orders.controller.ts`, `src/services/users.service.ts`,
`src/services/orders.service.ts`, `src/repositories/users.repository.ts`,
`src/models/user.model.ts`. Rota em `src/routes/` ou diretamente no controller.

### Recomendações

- Funciona bem até ~5-8 entidades; além disso, considerar migração incremental para
  vertical-slice (por feature, não big-bang).
- Nomear arquivos consistentemente (`{entidade}.{tipo}.ts`) torna busca por arquivo mais
  previsível do que busca por conteúdo.
- Evitar imports circulares entre services — sinal de que o domínio precisa ser reorganizado.
- Se um service está com mais de 400 linhas, extrair casos de uso específicos antes de
  adicionar nova funcionalidade.

---

## vertical-slice

### Características

Estrutura organizada por feature ou módulo de negócio: cada slice contém todos os artefatos
necessários para aquela feature (controller, service, repository, types, tests). Reduz
acoplamento horizontal — cada feature é relativamente autossuficiente. Compartilhamento
explícito via `shared/` ou `common/` só ocorre após repetição confirmada (regra de três).

O traço definidor é a co-localização: `src/features/users/` contém tudo sobre users, sem
dispersão por tipo de artefato.

### Sinais usados pelo detector

- Diretório `src/features/{nome}/` ou `src/modules/{nome}/` com múltiplos tipos de arquivo
  dentro de cada subdiretório
- Cada subdiretório de feature contém arquivos com responsabilidades mistas (ex: `users/`
  tem `users.controller.ts`, `users.service.ts`, `users.types.ts`)
- `shared/` ou `common/` presente mas proporcionalmente menor que as features individuais
- Testes co-localizados com código (`users.service.test.ts` ao lado de `users.service.ts`)
- Barrel files por feature (`features/users/index.ts`)

### Como as skills adaptam

- **architecture**: recomenda manter feature-cohesion sobre layer-cohesion; alerta contra
  extração prematura de `shared/` antes da terceira repetição (rule of three); sugere que
  dependências entre features passem por interface explícita, não import direto.
- **plan-feature**: gera fases organizadas por feature vertical (1 fase = 1 slice
  end-to-end), não por camada; cada fase entrega comportamento testável completo antes de
  avançar para a próxima feature.
- **write-prd**: template sugere campo "feature boundary" explícito — o que pertence a este
  slice e o que é responsabilidade de outro slice ou de `shared/`.
- **execute-plan**: cada fase entrega slice testável end-to-end (rota funcionando com teste
  integrado); não divide feature em fases separadas por tipo de artefato.
- **verify-work**: mede coesão da feature (todos os artefatos de uma feature dentro do slice
  correto); verifica que imports entre features são explícitos e intencionais; sem prescrever
  extração prematura para `shared/`.

### Exemplo canônico

Backend com Fastify ou NestJS módulos: `src/features/auth/`, `src/features/users/`,
`src/features/orders/`, cada um com `*.controller.ts`, `*.service.ts`, `*.repository.ts`,
`*.types.ts`, `*.test.ts`. `src/shared/` contém apenas utilitários usados por 3+ features.

### Recomendações

- Default recomendado para projetos greenfield (sem convenção estabelecida) por minimizar
  acoplamento horizontal desde o início.
- Quando uma feature crescer acima de ~8 arquivos, considerar subslices internos
  (`orders/create/`, `orders/cancel/`) antes de mover para arquitetura de camadas.
- Resistir à tentação de criar `shared/` cedo — compartilhar por duplicação deliberada até
  a terceira ocorrência.
- Imports entre features devem passar por barrel file (`import { X } from '../users'`),
  nunca import direto de submodule interno.

---

## nextjs-app-router

### Características

Projetos Next.js usando App Router (Next 13+): convenção de roteamento baseada em sistema de
arquivos com `app/`, componentes em `components/`, lógica compartilhada em `lib/` ou `utils/`,
e separação implícita entre Server Components e Client Components. O framework dita a estrutura
— a distinção arquitetural relevante é se o projeto organiza features dentro de `app/` por
route groups ou mistura lógica de negócio com components de apresentação.

O traço definidor é a pasta `app/` com `page.tsx`, `layout.tsx` e opcionalmente `loading.tsx`,
`error.tsx` seguindo convenção Next.js.

### Sinais usados pelo detector

- Presença de `app/` com `page.tsx` e/ou `layout.tsx` na raiz
- Diretório `app/` contém subdiretórios que são rotas (sem extensão de arquivo especial no nome)
- `components/` separado de `app/` no nível raiz ou em `src/`
- `lib/` ou `utils/` para helpers compartilhados
- Ausência de `pages/` (distingue App Router de Pages Router)
- `next.config.js` ou `next.config.ts` presente
- `public/` para assets estáticos

### Como as skills adaptam

- **architecture**: distingue Server Components de Client Components como fronteira
  arquitetural principal; alerta sobre uso de `"use client"` em componentes que não precisam
  de interatividade; recomenda que lógica de negócio fique em `lib/` ou Server Actions, não
  em componentes.
- **plan-feature**: organiza fases por rota/page (1 fase = 1 route completa com layout e
  page), seguindo convenção de sistema de arquivos do Next.js; nomeia explicitamente se o
  trabalho é em Server ou Client Component.
- **write-prd**: template inclui campo "routes afetadas" e "Server vs Client" por requisito;
  solicita descrição de data fetching (Server Component fetch ou React Query no cliente).
- **execute-plan**: respeita convenção de nomes de arquivo do Next.js (`page.tsx`,
  `layout.tsx`, `loading.tsx`); não coloca lógica de negócio em `page.tsx` — extrai para
  `lib/` ou Server Actions.
- **verify-work**: verifica que componentes com `"use client"` são folhas da árvore de
  componentes sempre que possível; checa que dados sensíveis não passam por Client
  Components desnecessariamente; mede proporção Server/Client como proxy de performance.

### Exemplo canônico

SaaS com Next.js 14: `app/(auth)/login/page.tsx`, `app/(dashboard)/dashboard/page.tsx`,
`app/api/webhook/route.ts`, `components/ui/Button.tsx`, `lib/auth.ts`, `lib/db.ts`.
Server Actions em `app/actions/` ou co-localizadas com o page que as usa.

### Recomendações

- Prefer Server Components por default; adicionar `"use client"` apenas quando necessário
  (event handlers, browser APIs, hooks de estado).
- Data fetching em Server Components com `fetch()` ou ORM direto — evitar React Query no
  servidor.
- Route groups `(nome)/` para organizar sem afetar URL — útil para layouts compartilhados
  entre rotas relacionadas.
- Server Actions substituem a maioria dos API routes para mutations — avaliar antes de criar
  `app/api/` para cada operação.

---

## unknown-mixed

### Características

Fallback honesto para projetos que não se encaixam claramente em nenhum dos quatro perfis
acima, ou que misturam convenções de múltiplos perfis. Inclui projetos em estágio inicial
(greenfield sem estrutura ainda definida), projetos legados com acumulação de dívida técnica,
migrações inacabadas entre arquiteturas, e monolitos que cresceram sem convenção explícita.

O traço definidor é a inconsistência: presença de sinais conflitantes de múltiplos perfis,
ou ausência de sinais suficientes para classificação confiante.

### Sinais usados pelo detector

- Confiança abaixo do threshold mínimo para qualquer perfil específico (ex: < 0.6)
- Sinais conflitantes: pasta `features/` coexistindo com `controllers/` flat no mesmo projeto
- Mix de convenções: alguns módulos com estrutura Clean Architecture e outros flat
- `src/` vazio ou quase vazio (greenfield — sem estrutura ainda)
- Presença de múltiplos padrões de nomenclatura sem consistência (camelCase e snake_case
  misturados, `.service.ts` e `Service.ts` coexistindo)
- Diretórios com nomes genéricos (`utils/`, `helpers/`, `misc/`) dominando a estrutura

**Greenfield mode:** quando `src/` existe mas está vazio ou contém apenas um arquivo de
entrada, o detector classifica como `unknown-mixed` com nota "greenfield" — nenhum padrão
estabelecido ainda. Skills em modo greenfield recomendam `vertical-slice` como ponto de
partida por minimizar acoplamento horizontal desde o início (D11).

### Como as skills adaptam

- **architecture**: adota tom exploratório; descreve o que observa sem prescrever o que
  deveria ser; apresenta os 4 perfis reconhecidos como opções, explicando trade-offs sem
  empurrar nenhum; em greenfield, sugere `vertical-slice` como default com justificativa.
- **plan-feature**: não assume convenção de estrutura de arquivos; pergunta explicitamente
  onde colocar o novo código antes de propor estrutura; em greenfield, propõe estrutura
  vertical-slice como sugestão, não como imposição.
- **write-prd**: template inclui campo "convenção atual" para o dev documentar o que existe;
  não assume nomenclatura de artefatos.
- **execute-plan**: cada passo nomeia o arquivo com caminho completo (sem assumir que o dev
  sabe onde vai); verifica existência de arquivo antes de modificar.
- **verify-work**: mede consistência interna do projeto (não conformidade com um padrão
  externo); identifica e lista inconsistências sem julgamento de valor; sugere padronização
  incremental.

### Exemplo canônico

Projeto Express que começou flat (`controllers/`, `services/`), depois alguém tentou
adicionar Clean Architecture (`domain/`, `usecases/`) para novas features, resultando em
mistura: metade do código em `controllers/orders.controller.ts` e outra metade em
`domain/order/order.entity.ts`. Dois padrões coexistindo sem migração completa.

### Recomendações

- Não tentar migrar toda a base de uma vez — escolher uma feature nova e aplicar o padrão
  desejado nela; repetir para a próxima.
- Documentar a decisão de padrão escolhido em `ARCHITECTURE.md` ou equivalente antes de
  começar a migração — sem registro, a inconsistência vai crescer.
- Em greenfield: começar com `vertical-slice` é a escolha de menor risco; pode ser
  reestruturado depois sem grandes migrações.
- Evitar criar `shared/` ou `utils/` como destino de "coisas sem lar" — é onde arquiteturas
  mixed acumulam mais entropia.

---

## Out of scope (Onda 2)

Os perfis abaixo não são reconhecidos pelo detector na Onda 1. Estão documentados aqui
apenas para indicar que não foram esquecidos — são candidatos explícitos para Onda 2:

- **ddd-strategic** — Domain-Driven Design estratégico com Bounded Contexts explícitos,
  Context Maps, Anti-Corruption Layers entre contextos. Requer heurística mais sofisticada
  que detecção de diretórios; envolve análise de linguagem ubíqua e fronteiras de domínio.
- **monorepo-multi-arch** — Repositório único com múltiplos projetos (ex: Turborepo, Nx),
  onde cada pacote/app pode ter arquitetura diferente. O detector de Onda 1 analisa apenas
  um projeto raiz; suporte a monorepo requer travessia de `packages/` e `apps/` com
  classificação por sub-projeto.

Tentativas de classificar projetos DDD ou monorepo na Onda 1 resultarão em `unknown-mixed`
com confiança baixa — comportamento esperado e honesto.
