---
topic: code-smells-and-refactoring
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-7673ee63-9153-5e08-ac11-504af621c743_text_markdown.md
tier: 2
triggers: [code smell, refactoring, fat route, on_event, lifespan, Annotated, bump-pydantic, strangler fig, WSGIMiddleware, import-linter, radon, xenon, complexidade, churn, código de IA, response_model, Depends yield]
related_skills: [/design-patterns, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Code Smells e Refactoring

## Quando consultar

- Ao revisar uma path operation que cresceu para dezenas de linhas com query inline e regra de negócio
- Ao decidir se um endpoint que retorna objeto ORM/domínio precisa de `response_model` explícito
- Ao escopar uma sessão de banco ou outro recurso com cleanup via dependência do FastAPI
- Ao migrar `@app.on_event`, defaults de `Depends`/`Query`, ou modelos Pydantic v1 para as formas atuais
- Antes de refatorar rotas ou trocar loader de relacionamento sem rede de testes de contrato
- Ao planejar a migração incremental de um app WSGI legado (Flask/Django) para FastAPI
- Ao configurar gates de CI para complexidade, churn ou contratos de import
- Ao revisar em code review um PR com trechos de código gerados por IA

## Padrões sênior

### Pattern: `response_model` como filtro de segurança de saída

- **Problema:** retornar o objeto ORM/domínio direto (`return user`) sem `response_model` serializa o objeto inteiro e vaza campos internos como `hashed_password` ou tokens.
- **Padrão:** declare `response_model` (ou anotação de retorno Pydantic) em todo endpoint que retorna dado de domínio — é um filtro de segurança que roda em toda resposta; a anotação de retorno vira response model desde FastAPI 0.89.0, mas quando os dois são declarados, `response_model` tem prioridade. A filtragem funciona mesmo com herança: anotar o retorno como superclasse e devolver uma subclasse ainda corta os campos extras.

```python
class UserOut(BaseModel):
    id: int
    username: str

class UserInDB(UserOut):
    hashed_password: str  # nunca deve sair na resposta

@app.get("/u/{id}", response_model=UserOut)
def get(id: int) -> Any:
    return repo.get(id)  # UserInDB -> filtrado para UserOut
```

- **Quando usar:** qualquer handler que devolve um objeto interno (ex.: `UserInDB` com `hashed_password`) para uma promessa pública (`UserOut`).
- **Quando NÃO usar só a anotação:** quando o tipo de retorno anotado diverge do que a função de fato retorna, declare `response_model=` explicitamente (tem prioridade sobre a anotação) ou anote `-> Any`; para tipos de retorno não-Pydantic válidos, use `response_model=None`.

### Pattern: Lógica de negócio fora da path operation function

- **Problema:** path operation com dezenas de linhas, queries SQLAlchemy inline e regra de negócio acoplada ao decorator de rota não é reutilizável nem testável sem subir o app HTTP.
- **Padrão:** a rota orquestra — valida entrada, chama o service, monta a resposta; extraia a regra para uma service layer (e repository para persistência), injetados via `Depends`/Protocol, permitindo testar a regra com pytest puro.
- **Quando usar:** endpoint com lógica de negócio real, ou a mesma lógica copiada entre endpoints.
- **Quando NÃO usar:** em CRUD trivial, uma camada de service adiciona cerimônia sem ganho. A comunidade diverge aqui — parte defende service/repository sempre por testabilidade, outra corrente prefere rotas com dependências diretas em apps menores; não há fonte primária única que feche a questão.

### Pattern: Sessão de banco como dependência com `yield`, nunca global

- **Problema:** instanciar a sessão dentro do handler (`SessionLocal()` no corpo do endpoint) ou como variável de módulo não é thread/task-safe — uma `AsyncSession` não é segura para uso concorrente — e vaza conexões do pool sob carga.
- **Padrão:** escope a sessão por request via dependência com `yield` mais `try/except/finally`, deixando o FastAPI rodar o cleanup depois da resposta e propagar exceções do handler de volta à dependência para rollback.

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback(); raise
```

- **Quando usar:** toda sessão de banco (ou outro recurso com cleanup) escopada à request.
- **Quando NÃO usar cleanup só ao final:** se o recurso precisa fechar antes da resposta ser enviada — por padrão o exit da dependência roda depois — use `Depends(scope="function")`; evite também commit automático em middleware, que gera 500 genérico; prefira commit explícito no service.

### Pattern: Refatoração canônica — `on_event` para `lifespan`

- **Problema:** `@app.on_event("startup"/"shutdown")` está deprecado desde FastAPI 0.93.0 — não compõe, não trata exceções de forma limpa e pode vazar recursos sob sinais concorrentes de startup em múltiplos workers.
- **Padrão (mecânica passo-a-passo):** (1) crie `@asynccontextmanager async def lifespan(app)`; (2) mova o corpo do startup para antes do `yield`, o do shutdown para depois; (3) troque atribuições globais por `app.state.x`; (4) passe `FastAPI(lifespan=lifespan)`; (5) remova TODOS os `@app.on_event` — se sobreviverem ao lado de `lifespan=`, eles falham em silêncio; (6) nos testes, use `with TestClient(app) as client:` para disparar o lifespan.
- **Quando usar:** todo recurso de escopo de aplicação (pool DB, `httpx.AsyncClient`, modelo ML, cache) hoje criado em `on_event` ou em global mutável no top-level do módulo.
- **Quando NÃO deixar pela metade:** não deixe `lifespan=` e `@app.on_event` coexistindo — é a armadilha central desta migração.

### Pattern: Refatoração canônica — defaults de `Depends`/`Query` para `Annotated`

- **Problema:** `x: str = Query(...)` e `db=Depends(get_db)` usam o valor default do Python para carregar a dependência; a regra Ruff FAST002 sinaliza esse padrão.
- **Padrão (mecânica passo-a-passo):** (1) rode `ruff check --select FAST002 --fix`; (2) confira cada assinatura virar `x: Annotated[str, Query(...)]` ou `db: Annotated[Session, Depends(get_db)]`; (3) benefício: a função fica reutilizável fora do FastAPI (os mesmos defaults valem em CLI/Typer) e mypy passa a checar argumentos obrigatórios.
- **Quando usar:** toda dependência nova ou revisada — `Annotated` é a forma recomendada desde FastAPI 0.95.
- **Quando NÃO usar a forma antiga:** a fonte não aponta cenário em que vale manter `Depends()`/`Query()` como valor default em código novo — é a direção recomendada sem contrapartida documentada.

### Pattern: Refatoração canônica — `.dict()`/`@validator`/`Config` para API v2 (bump-pydantic)

- **Problema:** DeprecationWarnings do Pydantic acumulando indicam uso da API v1 (`.dict()`, `@validator`, `class Config`) que será removida.
- **Padrão (mecânica passo-a-passo):** (1) `pip install bump-pydantic`; (2) rode `bump-pydantic meu_pacote/`; (3) revise manualmente o que a ferramenta não cobre — assinatura de `@field_validator` muda (adicione `@classmethod` e ajuste tipos), `@root_validator` vira `@model_validator(mode="after") -> Self`, `class Config` vira `model_config = ConfigDict(...)`, `orm_mode` vira `from_attributes`; (4) `BaseSettings` migra para o pacote separado `pydantic-settings`; (5) rode a suíte de testes.
- **Quando usar:** big-bang de uma migração v1 para v2 num pacote inteiro.
- **Quando NÃO usar big-bang:** a própria doc apresenta `pydantic.v1` como ponte gradual sem prescrever um caminho único entre os dois — o trade-off é risco de PR gigante vs. conviver temporariamente com dois estilos; `pydantic.v1` embute o código real da v1.10 (não é shim), modelos das duas versões não interoperam entre si, e v1 não roda em Python 3.14 ou mais recente.

### Pattern: Rede de testes de contrato antes de refatorar rotas

- **Problema:** muito comportamento em FastAPI é implícito (validação Pydantic, filtragem de `response_model`, DI) — refatorar sem teste que exercite status code, shape de resposta e validação (422) é perigoso.
- **Padrão:** use `TestClient` (baseado em HTTPX) para a maioria dos testes — rápido, síncrono, cobre endpoints async em contexto sync; use `httpx.AsyncClient(transport=ASGITransport(app=app))` com `@pytest.mark.anyio` quando o teste precisa `await` outras corrotinas; substitua I/O real com `app.dependency_overrides[get_repo] = ...` em vez de mockar HTTP.
- **Quando usar:** antes de qualquer refactor perigoso — trocar `def` por `async def`, mudar loader de relacionamento, mexer em `response_model`, reescopar sessão DB, ou reordenar rotas (`/books/featured` deve vir antes de `/books/{id}`).
- **Quando NÃO precisa da mesma rede:** refactors mecânicos e ferramenta-assistida — renomear via rope/LibCST, `ruff --fix`, `pyupgrade`, `bump-pydantic`, extrair `APIRouter` — roteamento é lightweight, sem custo de performance por `include`.
- **Armadilha:** `AsyncClient` puro não dispara eventos de lifespan — use `TestClient` como context manager, ou `LifespanManager` (asgi-lifespan), para garantir startup/shutdown no teste.

### Pattern: Strangler fig — estrangular app WSGI legado sob FastAPI

- **Problema:** migrar de uma vez um app Flask/Django (WSGI) para FastAPI é arriscado; o caminho mais seguro é evoluir incrementalmente.
- **Padrão:** monte o app legado sob o FastAPI com `WSGIMiddleware` (`app.mount("/v1", WSGIMiddleware(flask_app))`) e escreva o código novo em rotas nativas ASGI; migre rota a rota e remova o mount quando esvaziar.
- **Quando usar:** migração incremental de um app WSGI (Flask/Django) para FastAPI sem big-bang.
- **Quando NÃO usar para o longo prazo:** `WSGIMiddleware` está marcado como deprecated e será removido quando o Starlette o remover — o futuro do reexport `fastapi.middleware.wsgi` é incerto; se a ponte precisa sobreviver por mais tempo, considere a lib `a2wsgi` como alternativa mantida.

### Pattern: import-linter como trava de refactor no CI

- **Problema:** sem um gate automatizado, um refactor pode reintroduzir um import proibido (ex.: repository importando router, domínio importando FastAPI) e isso só seria pego em code review — se for pego.
- **Padrão:** rode `lint-imports` no CI/pre-commit em todo PR que toca a estrutura de camadas; o contrato usa grafo de imports (grimp/NetworkX) e pega também imports indiretos, funcionando como rede de segurança mecânica para a forma do código, equivalente em espírito à rede de testes de contrato para o comportamento. A configuração dos contratos de camada (`type=layers`, `type=forbidden`) pertence ao átomo `architecture-and-di-fastapi`; aqui o ângulo é o gate no pipeline de CI como trava contra regressão durante refactor.
- **Quando usar:** todo repositório com arquitetura em camadas que passa por refactors frequentes.
- **Quando NÃO usar como única rede:** import-linter pega violação estrutural de import, não comportamento em runtime — mantenha também a rede de testes de contrato para o que ele não cobre.

### Pattern: Medir débito com radon/xenon e cruzar com churn

- **Problema:** sem medição, não dá para priorizar qual módulo refatorar primeiro — complexidade alta isolada não diz se o código é tocado com frequência.
- **Padrão:** `radon cc caminho/ -s -e` mede complexidade ciclomática por função (grades A a F; E=21 é ruim) e `radon mi caminho/` mede maintainability index (grade A a F) — ambos são reporting; `xenon --max-absolute B --max-modules A --max-average A` no CI falha (exit diferente de zero) quando os limiares são estourados — isso é monitoring/gate. Cruze complexidade alta com churn (git) para achar hotspots: arquivos complexos que também mudam muito são o débito prioritário.
- **Quando usar:** todo projeto que quer transformar "esse arquivo está complexo" em número rastreável e gate de CI, em vez de opinião de review.
- **Quando NÃO usar sem calibrar:** não compare limiares entre ferramentas sem ajustar — Ruff conta complexidade ciclomática (`C901`) de forma ligeiramente diferente de radon/mccabe (um caso real deu 16 no Ruff contra 18 no radon/mccabe); configure `lint.mccabe.max-complexity` no Ruff separadamente, com 10 ou menos geralmente aceitável.

### Pattern: Revisar código gerado por IA por smells característicos

- **Problema:** estudos empíricos sobre código gerado por LLM mostram tendência a centralizar lógica em classes "manager" únicas em vez de delegar (smells "Too Many Branches" e "High Response for a Class" mais prevalentes), e a resolver problemas acumulando profundidade lógica local ("Multi-Nested Containers" e "Long Parameter Lists" de alta frequência) — path dependency da geração probabilística; diferente de humanos, a IA tende a produzir menos blocos idênticos e mais complexidade estrutural.
- **Padrão:** em code review de código gerado por IA, sinalize: (a) reimplementação de recursos nativos do FastAPI/Pydantic (validação manual que o Pydantic já faz, filtragem manual que `response_model` já faz, wrapper de DI caseiro); (b) abstração especulativa ou camadas desnecessárias "just in case"; (c) `try/except` decorativo que engole exceção; (d) duplicação sutil de utilitário já existente.
- **Quando usar:** revisão de PR com trechos gerados por IA, ou ao auditar um histórico de commits de IA sem refactor humano.
- **Quando NÃO tratar como consenso maduro:** a confiança aqui é emergente, documentada em literatura acadêmica recente — não é ainda consenso maduro com ferramenta canônica para esta stack específica; trate os sinais como heurística de review, não regra automatizável.

## Anti-padrões

### Chamada bloqueante ou disputa pelo threadpool dentro de `async def`

- **Sintoma:** `time.sleep`, `requests`, driver de banco síncrono ou SDK síncrono chamado dentro de `async def`; ou muitos endpoints `def` competindo pelos 40 tokens default do threadpool sob carga.
- **Correção:** o mecanismo e os trade-offs completos estão no átomo `async-and-concurrency` (patterns "`async def` vs `def` — para onde vai o trabalho" e "Ajustar o limiter do threadpool"); aqui o smell é só reconhecido, não reexplicado.

### Acessar relação lazy depois de uma query em `AsyncSession`

- **Sintoma:** `obj.relacionamento` acessado depois de `await session.scalars(...)`, lançando `sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called`.
- **Correção:** o diagnóstico completo está no átomo `sqlalchemy-async-and-orm`, pattern "Lazy loading explícito em AsyncSession"; aqui é só o reconhecimento do smell.

### Retornar objeto ORM/domínio cru sem `response_model`

- **Sintoma:** `return user`, onde `user` é um `UserInDB` com `hashed_password`, sem `response_model` nem schema de saída separado.
- **Correção:** declarar `response_model` (ou anotação de retorno Pydantic) que promete só os campos públicos.

### Lógica de negócio ou query inline na path operation

- **Sintoma:** endpoint com dezenas de linhas, cálculo/regra de negócio e queries SQLAlchemy inline; a mesma lógica copiada entre endpoints.
- **Correção:** extrair para service (regra) e repository (persistência), injetados via `Depends`.

### Sessão de banco global ou instanciada dentro do handler

- **Sintoma:** `SessionLocal()` no corpo do endpoint, sessão guardada em variável de módulo, ausência de `finally: db.close()`.
- **Correção:** dependência com `yield` mais `try/except/finally`, propagando a exceção para permitir rollback.

### `lifespan` e `@app.on_event` coexistindo

- **Sintoma:** app define `lifespan=` e ainda mantém `@app.on_event("startup")` — o `on_event` passa a falhar em silêncio.
- **Correção:** remover todos os `@app.on_event` ao migrar para `lifespan`.

### Refatorar rota, loader de relacionamento ou `response_model` sem teste de contrato

- **Sintoma:** trocar `def` por `async def`, o loader de relacionamento, o `response_model` ou a ordem das rotas direto, sem `TestClient`/`AsyncClient` cobrindo status, shape e 422.
- **Correção:** construir a rede de testes de contrato antes de refatorar — ver pattern acima.

### Manter `WSGIMiddleware` como solução permanente

- **Sintoma:** a migração estrangulada nunca termina, e o app continua dependendo de `WSGIMiddleware` no longo prazo.
- **Correção:** migrar rota a rota até esvaziar o mount, ou trocar por `a2wsgi` se a ponte precisa sobreviver — `WSGIMiddleware` está marcado para remoção futura.

### Comparar limiar de complexidade entre ferramentas sem calibrar

- **Sintoma:** aplicar o mesmo número de corte (ex.: 10) tanto para `C901` do Ruff quanto para radon/mccabe, assumindo que contam complexidade do mesmo jeito.
- **Correção:** calibrar cada ferramenta separadamente — Ruff e radon/mccabe podem divergir no mesmo código (16 contra 18 num caso real relatado).

### Sinais de geração por IA sem refactor humano subsequente

- **Sintoma:** commits consecutivos de IA sem refactor humano; funções crescendo em comprimento; nomes genéricos (`data`, `temp`, `result`, `item`) se proliferando; razão comentário/código crescente; lógica duplicada com variações mínimas.
- **Correção:** tratar como sinal de review — aplicar refactor humano deliberado (extrair, renomear, deduplicar) antes de mesclar.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Endpoint retorna objeto ORM/domínio | Declarar `response_model` (ou anotação de retorno Pydantic) — nunca retornar o objeto cru |
| Tipo de retorno anotado diverge do que a função retorna | `response_model=` explícito (tem prioridade sobre a anotação) ou `-> Any` |
| Endpoint com regra de negócio real ou lógica reusada | Extrair service (e repository, se houver persistência) |
| CRUD trivial sem regra de negócio | Rota fala direto com o repositório — service seria cerimônia (tema em aberto na comunidade) |
| Sessão de banco por request | Dependência com `yield` mais `try/except/finally`, nunca global |
| Migrar `@app.on_event` | `lifespan` — removendo todos os `on_event`, que falham em silêncio ao lado dele |
| `Depends`/`Query` como valor default | `Annotated[T, Depends(...)]`, via `ruff check --select FAST002 --fix` |
| Sair de `.dict()`/`@validator`/`class Config` | `bump-pydantic` (big-bang) ou `pydantic.v1` (ponte gradual, sem suporte a Python 3.14+) |
| Refatorar `def` para `async def`, loader de relacionamento, `response_model` ou ordem de rotas | Só com teste de contrato (`TestClient`/`AsyncClient`) cobrindo status, shape e 422 antes |
| Renomear símbolo, `ruff --fix`, `pyupgrade`, extrair `APIRouter` | Seguro e mecânico — não exige a mesma rede de testes |
| Migrar app WSGI (Flask/Django) incrementalmente | `WSGIMiddleware` sob prefixo, rota a rota; para ponte de longo prazo, considerar `a2wsgi` |
| Travar arquitetura contra regressão de import durante refactor | `lint-imports` (import-linter) no CI/pre-commit |
| Medir e priorizar débito técnico | `radon cc`/`radon mi` (reporting) mais `xenon` no CI (gate), cruzado com churn do git |
| Comparar complexidade entre Ruff e radon/mccabe | Calibrar cada ferramenta — não usar o mesmo limiar, podem divergir no mesmo código |
| Revisar PR com código gerado por IA | Sinalizar manager classes, abstração especulativa, `try/except` decorativo, duplicação sutil |

## Referências externas

- Skill: `/design-patterns` — service/repository, adapters e a mecânica dos refactors canônicos
- Skill: `/architecture` — camadas router-service-repository e fronteiras de módulo
- Átomo `async-and-concurrency` (mesma stack) — bloqueio de event loop e limiter do threadpool; aqui o smell é só reconhecido, não reexplicado
- Átomo `sqlalchemy-async-and-orm` (mesma stack) — diagnóstico completo de `MissingGreenlet` e estratégias de eager loading
- Átomo `architecture-and-di-fastapi` (mesma stack) — configuração dos contratos de camada do import-linter; aqui o ângulo é métrica de débito e trava de refactor no CI
- Source path (audit trail): `Infos/knowledge/Python/compass_artifact_wf-7673ee63-9153-5e08-ac11-504af621c743_text_markdown.md`
