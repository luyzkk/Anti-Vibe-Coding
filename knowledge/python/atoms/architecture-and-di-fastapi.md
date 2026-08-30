---
topic: architecture-and-di-fastapi
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-24cad57e-dcd9-5717-bc61-b184f420ce5e_text_markdown.md
tier: 2
triggers: [arquitetura, estrutura de pastas, src layout, camadas, router, service, repository, unit of work, dependency injection, Annotated, Depends, yield, APIRouter, lifespan, import-linter, tach, ADR, fat router]
related_skills: [/architecture, /design-patterns]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Arquitetura e DI — FastAPI

## Quando consultar

- Ao estruturar um projeto FastAPI novo ou decidir entre organizar por domínio e por tipo de arquivo
- Ao decidir se formaliza uma camada de service/repository ou deixa o router acessar o banco direto
- Ao declarar dependências (`Annotated`, `yield`, cache por request) ou avaliar uma lib de DI externa
- Ao decidir onde criar um recurso global de vida longa do app (ex.: HTTP client)
- Ao isolar um SDK ou API de fornecedor externo atrás de um adapter
- Ao configurar enforcement de arquitetura (import-linter, tach, Ruff) no CI
- Ao revisar código de alguém migrando de Django, Spring, Flask ou Node para FastAPI
- Ao documentar por escrito uma decisão que quebra a convenção do time (ADR)

## Padrões sênior

### Pattern: Organizar por domínio, não por tipo de arquivo

- **Problema:** dividir por tipo (`crud/`, `routers/`, `models/`) força saltos constantes entre pastas num monolito com muitos domínios e favorece imports circulares.
- **Padrão:** agrupar por domínio (`src/auth/`, `src/posts/`), cada pacote com `router.py`, `schemas.py` (Pydantic), `models.py` (DB), `service.py`, `dependencies.py`, `constants.py`, `exceptions.py`, `utils.py`; import cross-package com nome de módulo explícito (`from src.auth import constants as auth_constants`) evita colisões e deixa a origem clara.
- **Quando usar:** monolito com múltiplos domínios/bounded contexts — mantém coesão e reduz o raio de mudança.
- **Quando NÃO usar:** microserviços pequenos ou projetos de poucos escopos, onde dividir por tipo é aceitável e mais simples — o próprio template oficial `full-stack-fastapi-template` do FastAPI usa layout por tipo, adequado ao escopo dele; domínios pequenos no layout de 8 arquivos por pacote também geram arquivos vazios ou quase vazios, e ter `models.py` (DB) e `schemas.py` (Pydantic) lado a lado pode confundir quem não conhece a convenção.

### Pattern: src layout para pacotes publicáveis ou reusáveis

- **Problema:** flat layout roda testes contra o código de desenvolvimento, não contra o pacote de fato instalado — erros de empacotamento (arquivo faltando no wheel) só aparecem depois, com o usuário final.
- **Padrão:** manter o código importável num subdiretório `src/` separado da raiz do projeto — recomendado pelo PyPA, sem ser obrigatório; `uv init` usa src layout por padrão para pacotes.
- **Quando usar:** código que será instalado, publicado ou reusado (biblioteca, monorepo).
- **Quando NÃO usar:** scripts pequenos e demos — flat layout é aceitável e mais simples; o src layout exige instalação editável no fluxo de desenvolvimento.

### Pattern: Camadas router → service → data access, formalizadas sob demanda

- **Problema:** lógica de negócio ou queries SQL dentro do path operation dificultam reuso e teste isolado sem levantar a stack HTTP.
- **Padrão:** o router orquestra — valida entrada, chama o service, retorna a resposta; a lógica de negócio e as queries vivem no service (`await service.get_posts(creator_id)` em vez de query inline no router).
- **Quando usar:** endpoints com lógica de negócio não trivial, ou que precisam de reuso fora do contexto HTTP.
- **Quando NÃO usar:** apps genuinamente pequenos e CRUD simples — router falando direto com o banco é aceitável; formalizar a camada de serviço cedo demais é overengineering.

### Pattern: DI com `Annotated`, `yield` e cache por request

- **Problema:** `def endpoint(x = Depends(dep))` — Depends como valor default — perde informação de tipo para editor/mypy e não é reutilizável como alias; dependências sem teardown explícito arriscam vazar conexões e outros recursos.
- **Padrão:** declare dependências como `Annotated[X, Depends(y)]`, reutilizável via alias (`CurrentUser = Annotated[User, Depends(get_user)]`); para recursos com teardown (sessão de DB, cliente por request) use dependência com `yield` — o código antes do `yield` roda na entrada do request e o de depois roda na saída, inclusive em exceção; FastAPI cacheia o resultado de uma dependência dentro do escopo do request por padrão (`use_cache=True`), permitindo decompor em funções pequenas e reutilizáveis sem custo de recomputação.
- **Quando usar:** toda dependência nova desde FastAPI 0.95/Python 3.9+; `yield` para qualquer recurso que precisa fechar ou liberar algo; o cache implícito ajuda ao compor sub-dependências que repetem a mesma dependência de base.
- **Quando NÃO usar:** `Depends()` como valor default é forma legada — o Ruff sinaliza via regra FAST002, não use em código novo; desative o cache (`Depends(dep, use_cache=False)`) só quando precisar de reexecução explícita dentro do mesmo request.

### Pattern: Convenção do FastAPI é parcial — nem tudo é prescrito

- **Problema:** tratar FastAPI como framework batteries-included (nos moldes do Django) leva a assumir ORM, estrutura de projeto ou camada de serviço que o framework não define.
- **Padrão:** FastAPI adota convenção em Pydantic para validação, type hints como fonte de verdade (parâmetros, corpo e resposta derivam dos tipos) e geração automática de OpenAPI/Swagger; NÃO adota convenção para ORM, estrutura de projeto nem camada de serviço — essas três decisões são do time e devem ser explícitas.
- **Quando usar:** ao avaliar o que é "o jeito FastAPI" antes de gerar código ou desenhar estrutura — confiar na convenção só onde ela de fato existe.
- **Quando NÃO usar:** não gere scaffolding assumindo padrão tipo Django (ORM embutido, módulo de auth, session management) — decida e documente a escolha do time.

### Pattern: `APIRouter` para modularizar rotas; lifespan para recursos globais

- **Problema:** grupos de endpoints repetindo `prefix`/`tags`/dependências de auth em cada rota; recurso global de vida longa (ex.: HTTP client) recriado por request ou amarrado aos eventos deprecated `on_event("startup"/"shutdown")`.
- **Padrão:** `APIRouter` — equivalente aos Blueprints do Flask — agrupa endpoints com `prefix`, `tags` e `dependencies=[...]` aplicados a todo o grupo, composto via `include_router` aninhado; o lifespan context manager é o local arquitetural correto para criar uma única instância de um recurso de vida longa (ex.: `httpx.AsyncClient`) e expô-la via `app.state`, injetando-a nas rotas por dependência em vez de recriar por request ou acoplar rotas ao objeto `app` — a mecânica de context manager e teardown fica no átomo `async-and-concurrency`.
- **Quando usar:** `APIRouter` sempre que houver múltiplos grupos de endpoints ou necessidade de aplicar auth a um grupo inteiro; lifespan para qualquer singleton do app, substituindo os eventos `on_event` (deprecated desde a versão 0.93+).
- **Quando NÃO usar:** recriar o cliente (`async with httpx.AsyncClient() as c:`) dentro de cada rota — mata o reuso de conexões e repete o handshake TLS a cada request.

### Pattern: uv workspaces para monorepo com múltiplos pacotes

- **Problema:** biblioteca compartilhada consumida por vários apps/serviços no mesmo repositório, sem gestão unificada de dependências, duplica lockfiles e ambientes.
- **Padrão:** uv workspaces — inspirado no Cargo do Rust — dão um único `uv.lock` e uma única `.venv` para todos os membros, com dependências cross-package editáveis via `{ workspace = true }` em `[tool.uv.sources]`.
- **Quando usar:** monorepo com múltiplos pacotes ou serviços que compartilham uma lib interna — prática de consenso emergente (2026); mais leve que Pants/Bazel para essa necessidade.
- **Quando NÃO usar:** builds muito complexos, onde Pants/Bazel ainda cobrem mais; e mesmo usando, ter em mente as limitações — um único `requires-python` vale para todo o workspace (interseção dos membros), e uv não impede um membro de importar dependência declarada por outro (Python não isola dependências).

### Pattern: Repository e Unit of Work sobre SQLAlchemy — decisão consciente, não reflexo

- **Problema:** criar um `UserRepository` que só envolve `session.query`/`select` adiciona complexidade local e "fator WTF" para quem nunca viu o padrão, sem ganho se não há intenção real de inverter a dependência.
- **Padrão:** a `Session` do SQLAlchemy já implementa Unit of Work e o ORM já é um Data Mapper; introduza repository apenas quando quiser manter o domínio puro (sem infra) e conseguir fakear a persistência em testes — decisão consciente, não default. Tema contestado na fonte: um lado defende o repository para inverter a dependência e purificar o domínio; o outro lado — incluindo a própria fonte que documenta o padrão — reconhece que ele adiciona complexidade local e o "fator WTF" para quem nunca viu esse padrão antes, e nota que a Session já cobre boa parte do papel do repository.
- **Quando usar:** lógica de negócio vazando para dentro de queries; impossibilidade de testar uma regra sem banco; intenção concreta de trocar de persistência.
- **Quando NÃO usar:** app que só faz query/filtro/exibição, sem domínio rico, e cujos testes já rodam bem contra um DB de teste.

### Pattern: Extrair fat router para dependências reutilizáveis e services

- **Problema:** path operation com dezenas de linhas, validação "existe no DB?" repetida em vários endpoints, queries inline — a mesma checagem e o mesmo teste reescritos N vezes.
- **Padrão:** validações que exigem DB (ex.: "post existe e pertence ao usuário?") viram dependências reutilizáveis (`valid_post_id`, `valid_owned_post`) em vez de código copiado em cada endpoint; a lógica de negócio vai para o service — o router só orquestra.
- **Quando usar:** validação de existência ou posse repetida em mais de um endpoint.
- **Quando NÃO usar:** o gatilho do padrão é justamente a repetição entre endpoints — sem esse cenário, extrair a dependência com antecedência não tem o mesmo racional.

### Pattern: Enforce contratos de camada com import-linter, tach e regras Ruff

- **Problema:** sem enforcement automatizado, regras como "router não importa DB direto" ou "domínio não importa infra" são violadas silenciosamente, inclusive por imports indiretos (cadeias via outros módulos).
- **Padrão:** import-linter define "contracts" em arquivo próprio e falha o CI quando um import viola a arquitetura — um contrato `type=layers` (ex.: `presentation > application > domain`) garante que camadas superiores dependam das inferiores e nunca o contrário, mesmo indiretamente; tach declara as dependências permitidas por pacote e, com `strict: true`, só permite import via interface pública do pacote, rodando como lint em CLI sem impacto em runtime; Ruff TID252 sinaliza imports relativos de módulos pais (PEP 8 recomenda absolutos) e TID251 (`banned-api`) proíbe imports específicos entre camadas (ex.: bloquear `sqlalchemy.dialects` fora da camada de dados).
- **Quando usar:** arquitetura em camadas que precisa de enforcement automatizado no CI, ou monorepo com pacotes que precisam de fronteira modular e interface pública explícita.
- **Quando NÃO usar:** tach é menos difundido que import-linter — para times sem monorepo/pacotes formais, import-linter já cobre o caso de camadas sozinho; as regras Ruff resolvem casos pontuais de import banido, não substituem um contrato de arquitetura completo.

### Pattern: Isolar SDKs e HTTP clients atrás de adapters

- **Problema:** chamada direta a SDK de um fornecedor (pagamento, cloud) espalhada pelos services acopla o domínio ao fornecedor e obriga reescrever tudo ao trocar de fornecedor.
- **Padrão:** um módulo `client.py` por serviço externo concentra a comunicação e o mapeamento de dados; o service chama esse cliente, não o SDK bruto — ex.: `src/payments/client.py` expõe `charge(...)`.
- **Quando usar:** qualquer integração com SDK ou API de fornecedor externo (pagamento, cloud, terceiros).
- **Quando NÃO usar:** a fonte não descreve uma exceção explícita para este padrão — trate isolar SDKs atrás de adapter como prática consistente em toda integração externa.

### Pattern: Documentar decisões arquiteturais com ADRs (Nygard ou MADR)

- **Problema:** decisão de quebrar convenção (adotar repository, trocar ORM, escolher estrutura de pastas atípica, introduzir lib de DI) fica só na cabeça de quem decidiu, sem registro rastreável.
- **Padrão:** um ADR no formato Nygard captura título, status, contexto, decisão e consequências — a seção de consequências força listar trade-offs negativos junto dos positivos; MADR acrescenta as opções consideradas com prós/contras, útil quando a alternativa rejeitada importa tanto quanto a escolhida; a verdade da arquitetura é a cadeia de ADRs (com status "Superseded by ADR-XXXX"), não o último documento isolado.
- **Quando usar:** toda decisão que quebra a convenção do time ou introduz uma abstração/dependência nova (repository, lib de DI, troca de ORM, estrutura de pastas atípica).
- **Quando NÃO usar:** a fonte não descreve uma exceção — trata ADR como prática consolidada e recomendada de forma geral (AWS, Azure Well-Architected e arc42 endossam a prática).

## Anti-padrões

### Tell de Django: `models.py` monolítico e ORM sync em `async def`

- **Sintoma:** dev espera framework batteries-included e concentra lógica num `models.py` gigante com todos os domínios, além de I/O bloqueante em rotas `async` usando ORM sync dentro de `async def` (a fonte marca a associação específica com `apps/`/`settings.py` como inferência a partir das convenções conhecidas do Django, não como algo diretamente atestado).
- **Correção:** organizar por domínio (ver Pattern acima); usar SQLAlchemy 2.0 async (`AsyncSession`).

### Tell de Java/Spring: interface para todo service e container de DI manual

- **Sintoma:** criar uma interface — padrão ilustrado em fontes como `FooServiceInterface` + implementação concreta — para todo service, e importar containers de DI (`dependency-injector`, `Lagom`) em vez de usar `Depends()`.
- **Correção:** `Annotated[T, Depends(...)]` cobre a maioria dos casos — não overengineer até ter uma boa razão para isso.

### Tell de Flask: globals (`g`, `current_app`, Session global) e mentalidade sync

- **Sintoma:** usar estado global e contexto implícito, com uma Session atrelada globalmente ao request (como em Flask-SQLAlchemy), e tentar traduzir Blueprints sem adotar `Depends()`.
- **Correção:** Session injetada por dependência com `yield`; `APIRouter` com `Depends()` em vez de replicar o registro global de Blueprint — a doc oficial confirma o mapeamento direto entre Blueprints e `APIRouter`.

### Tell de Node/Express: middleware para tudo, handlers sem tipos

- **Sintoma:** usar middleware `(req, res, next)` para auth ou validação por rota, quando o idiomático em FastAPI é usar dependências para guardas por rota — middleware é para cross-cutting que realmente precisa de request e response.
- **Correção:** guardas de auth por rota como dependências (`dependencies=[Depends(require_admin)]`), não middleware global.

### `@app.on_event("startup"/"shutdown")` para inicializar recursos

- **Sintoma:** código usando os decorators de evento — deprecated desde a versão 0.93+ — para criar e derrubar recursos globais; separa setup e teardown do mesmo recurso em dois callbacks distintos.
- **Correção:** lifespan context manager — mantém setup e teardown do mesmo recurso juntos e compõe melhor sob múltiplos workers.

### Validação de existência duplicada em cada endpoint

- **Sintoma:** cada endpoint refaz manualmente o lookup ("post existe? pertence ao usuário?") e o `raise PostNotFound()` — a mesma checagem e o mesmo teste reescritos em cada endpoint.
- **Correção:** extrair a checagem para uma dependência reutilizável (`valid_post_id`, `valid_owned_post`) injetada via `Annotated[Mapping, Depends(valid_post_id)]`.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Monolito com múltiplos domínios/bounded contexts | Organizar por domínio (`src/auth/`, `src/posts/`) |
| Microserviço pequeno ou projeto de escopo único | Organizar por tipo (`routers/`, `models/`) é aceitável |
| Pacote que será instalado, publicado ou reusado | src layout |
| Script pequeno ou demo | flat layout |
| Endpoint com lógica de negócio não trivial ou reuso fora do HTTP | Formalizar camada de service |
| App CRUD simples e pequeno | Router acessa o banco direto — service cedo demais é overengineering |
| Nova dependência desde FastAPI 0.95+ | `Annotated[X, Depends(y)]`, nunca `Depends()` como valor default |
| Recurso com teardown (sessão de DB, cliente por request) | Dependência com `yield` |
| Dezenas de dependências repetidas, precisa de registry central | Considere `svcs`/`dependency-injector` — fonte marca como contestado |
| Recurso global de vida longa (ex.: HTTP client) | Criar uma vez no lifespan, expor via `app.state`, injetar por dependência |
| Múltiplos pacotes/serviços compartilhando lib interna | uv workspaces |
| Domínio puro sem infra e necessidade real de trocar persistência | Repository/Unit of Work sobre SQLAlchemy — tema contestado na fonte |
| Apenas query/filtro/exibição, sem domínio rico | Sem repository — a Session já é Unit of Work |
| Validação de existência ou posse repetida entre endpoints | Extrair para dependência reutilizável |
| Regra de camadas (`presentation > domain`) enforced no CI | import-linter |
| Integração com SDK ou API de fornecedor externo | Isolar atrás de adapter (`client.py`) |
| Decisão que quebra a convenção do time | ADR (Nygard ou MADR) |

## Referências externas

- Skill: `/architecture` — camadas, fronteiras de módulo e ADRs
- Skill: `/design-patterns` — repository, Unit of Work e adapters como padrões clássicos
- Source path (audit trail): `Infos/knowledge/Python/compass_artifact_wf-24cad57e-dcd9-5717-bc61-b184f420ce5e_text_markdown.md`
