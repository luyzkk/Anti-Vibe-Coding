---
topic: pytest-and-testing-strategy
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-1d7424ba-c0bb-5ddb-956f-82d43118195f_text_markdown.md
  - Infos/knowledge/Python/python-testing/SKILL.md
tier: 1
triggers: [pytest, fixture, conftest, TestClient, AsyncClient, ASGITransport, dependency_overrides, patch, mock, monkeypatch, factory, polyfactory, respx, time-machine, testcontainers, savepoint, Hypothesis, schemathesis, property-based, mutation testing, test smell, suíte de IA]
related_skills: [/tdd-workflow, /api-design]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Pytest e Estratégia de Testes

## Quando consultar

- Ao escolher entre `TestClient` síncrono e `AsyncClient`+`ASGITransport` para testar FastAPI
- Ao decidir como substituir uma dependência injetada em teste (`dependency_overrides` vs `patch`)
- Ao escolher o tipo certo de test double (stub, mock, fake ou spy) para um colaborador
- Ao gerar dados de teste (fixture fixa vs factory) ou definir escopo/teardown de fixture
- Ao mockar chamadas HTTP externas (`respx`) ou lógica dependente de tempo (`time-machine`)
- Ao isolar testes que tocam banco de dados real (testcontainers + rollback por savepoint)
- Ao testar lógica com muitos casos de borda ou validar conformidade de uma API com seu OpenAPI
- Ao revisar (ou gerar) uma suíte de testes com IA — antes de aceitar coverage alto como sinal de qualidade
- Seguindo o ciclo TDD (vermelho → verde → refactor) para escrever código Python novo

## Padrões sênior

### Pattern: `TestClient` síncrono como padrão; `AsyncClient`+`ASGITransport` sob demanda

- **Problema:** `AsyncClient(app=app)` foi removido em httpx 0.28.0 e levanta `TypeError`; migrar toda a suíte para cliente async sem necessidade só adiciona complexidade de event loop.
- **Padrão:** use `TestClient` (Starlette, síncrono) para o caminho comum; troque para `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` quando o teste precisa de `await` ou do mesmo event loop de uma fixture async (ex.: engine SQLAlchemy async).
- **Quando usar `TestClient`:** maioria dos endpoints — API síncrona simples, sem precisar de `pytest.mark.anyio`.
- **Quando NÃO usar `ASGITransport` sem ressalva:** quando o teste depende de eventos de lifespan (startup/shutdown) — `ASGITransport` não os dispara; use `LifespanManager` (asgi-lifespan) ou `TestClient` como context manager.

```python
from httpx import ASGITransport, AsyncClient

async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
    r = await ac.get("/")
```

### Pattern: `dependency_overrides` para trocar dependências injetadas, não `patch`

- **Problema:** `patch("app.services.x")` acopla o teste ao caminho de import interno e quebra quando o módulo é refatorado.
- **Padrão:** sobrescrever no ponto de resolução do FastAPI — `app.dependency_overrides[get_repository] = get_mock_repo` — e limpar com `.clear()` em teardown (fixture com `yield`).
- **Quando usar:** qualquer dependência resolvida via `Depends(...)` (DB, repositório, usuário atual).
- **Quando NÃO usar patch aqui:** reserve `patch` para colaboradores fora do sistema de DI do FastAPI; nesses casos, use `autospec=True` para detectar uso incorreto da API.

### Pattern: Taxonomia de test doubles — use o mais fraco que resolve

- **Problema:** suíte cheia de `Mock()`/`MagicMock()` com asserções sobre chamadas internas acopla o teste à implementação.
- **Padrão:** distinga stub (respostas prontas), mock (verifica interação), fake (implementação leve funcional, ex.: repositório in-memory) e spy (embrulha o real e registra chamadas); prefira fake para colaboradores com estado e reserve mock para quando a interação em si é o contrato.
- **Quando usar fake:** repositório in-memory implementando a mesma interface para testar um serviço.
- **Quando NÃO usar mock:** para verificar que uma query SQL é válida — mockar `db.execute()` só prova que a função foi chamada, esconde erro de schema e type mismatch.

### Pattern: Fixtures pytest para recursos; factories (polyfactory) para dados variáveis

- **Problema:** dicts hardcoded grandes e repetitivos nos testes; `factory_boy` não suporta modelos Pydantic nativamente.
- **Padrão:** usar fixture pytest (`yield` com setup/teardown; escopo padrão `function`, ou `module`/`session` para recursos caros; `autouse=True` quando todo teste do escopo precisa; centralizar fixtures compartilhadas em `conftest.py`) para recursos; usar **polyfactory** (`class UserFactory(ModelFactory[User])`) para gerar dados a partir de type hints, respeitando validadores Pydantic v2 — `UserFactory.build(is_active=True)` fixa só o campo relevante.
- **Quando usar polyfactory:** modelos Pydantic v2, dataclasses, TypedDict, msgspec.
- **Quando NÃO usar fixture própria:** para arquivo temporário, use o fixture nativo `tmp_path` (limpeza automática); para ORM SQLAlchemy tradicional, `factory_boy` com `SQLAlchemyModelFactory` continua idiomático.

### Pattern: `respx` para HTTP; `time-machine` para tempo — nunca rede/relógio real

- **Problema:** teste que toca a rede real é caro e flaky; `datetime.now()` espalhado pelo código dificulta testar expiração/TTL; `freezegun` escaneia todos os módulos importados, com custo proporcional ao tamanho do projeto.
- **Padrão:** interceptar httpx com `@respx.mock` + `respx.get(url).mock(return_value=httpx.Response(...))` — requisição não registrada falha por padrão; substituir `datetime.now()` por clock injetável ou mockar com `time-machine`, que opera no nível C.
- **Quando usar `time-machine`:** suítes que congelam tempo em muitos testes — benchmark do autor mediu ~100x mais rápido que `freezegun` (6,4ms vs 16µs por chamada) e runtime constante em vez de crescente com o projeto.
- **Quando NÃO usar sem fixture central:** serviço externo chamado em muitos testes sem um router `respx` pré-configurado e compartilhado — duplica setup e esconde a intenção de cada teste.

### Pattern: `testcontainers` com Postgres real + isolamento por savepoint

- **Problema:** SQLite não replica JSONB, full-text nem o comportamento de locks/transações do Postgres — o teste passa e a query quebra em produção; recriar o schema a cada teste é lento e pode vazar estado entre testes.
- **Padrão:** subir Postgres real via `PostgresContainer` (`scope="session"`); isolar cada teste numa transação com `begin_nested()` (savepoint) e um listener `after_transaction_end` que reabre o savepoint, dando rollback total ao final.
- **Quando usar:** teste de integração que depende de comportamento real do Postgres (JSONB, full-text, locks, constraints).
- **Quando NÃO usar:** quando a integração é só "meu código chama a lib X" sem tocar schema real — o custo de subir Docker pode não valer a pena.

```python
@pytest.fixture(scope="session")
def pg():
    with PostgresContainer("postgres:16-alpine") as c:
        yield c

@pytest.fixture()
def session(engine):
    conn = engine.connect()
    tx = conn.begin()
    s = Session(bind=conn)
    nested = conn.begin_nested()
    yield s
    s.close(); tx.rollback(); conn.close()
```

### Pattern: Hypothesis para invariantes; schemathesis para fuzzar contra o OpenAPI

- **Problema:** exemplos fixos não cobrem o espaço de entradas de uma validação complexa; "schema válido" é uma garantia mais fraca que "API compatível com o spec".
- **Padrão:** usar Hypothesis para gerar dados que satisfazem a especificação e encolher contraexemplos em lógica de parsing/validação; usar schemathesis (construído sobre Hypothesis) para ler o OpenAPI do FastAPI e checar propriedades universais — o servidor nunca deve retornar 500, e a resposta deve conformar ao schema.
- **Quando usar:** lógica com muitos casos de borda; endpoint com schema OpenAPI publicado — schemas de produção tipicamente revelam de 5 a 15 problemas na primeira execução.
- **Quando NÃO usar no PR:** property tests são mais lentos — rode um subset no PR e a suíte completa em nightly; para contrato consumer-driven entre serviços (o consumidor define a interação, não o provider), use Pact em vez de schemathesis.

### Pattern: Mutation testing (`mutmut`) como auditoria pontual, não gate de CI

- **Problema:** coverage alto não prova asserção forte — uma linha pode ser executada sem que nenhum teste verifique o resultado dela.
- **Padrão:** rodar `mutmut` sobre módulos críticos pontualmente; um mutante "sobrevivente" (ex.: `>` vira `>=`, `a+b` vira `a-b` e a suíte continua verde) expõe um teste que executa mas não assegura nada.
- **Quando usar:** dúvida sobre a qualidade de uma suíte com coverage alto e suspeita de asserções fracas.
- **Quando NÃO usar:** como gate obrigatório de todo CI — o custo é N mutantes × tempo da suíte inteira; comece por módulos de alto valor, não pela codebase toda.

## Anti-padrões

### Testar implementação em vez de comportamento

- **Sintoma:** `assert mock.called` ou asserção sobre método privado como única verificação — uma refatoração legítima quebra o teste mesmo sem mudar o comportamento observável.
- **Correção:** assertar sobre o resultado observável (retorno, estado, efeito colateral externo); reservar asserção de chamada para os poucos casos em que a interação em si é o contrato.

### Patch no lugar errado ("patch where it's used, not where it's defined")

- **Sintoma:** `patch("requests.get")` quando o módulo sob teste fez `from requests import get` — o mock "não pega", o código ainda chama a função original.
- **Correção:** aplicar o patch no namespace que importou o nome (`mocker.patch("app.services.orders.send_email")`), nunca no módulo de origem.

### Mockar o próprio código sob teste

- **Sintoma:** `patch` do mesmo módulo/função que o teste deveria exercitar, com `mock.assert_called` como única verificação.
- **Como o revisor detecta:** o alvo do `patch` coincide com o módulo do sistema sob teste, e a asserção principal é sobre a chamada ao mock, não sobre um resultado real.
- **Correção:** nunca faça patch do alvo do teste — mocke só os colaboradores externos, preservando real a unidade sob teste.

### `dependency_overrides` vazando ou escopo de event loop misto

- **Sintoma:** override não limpo contamina o teste seguinte; fixtures async com escopos diferentes entre testes vizinhos geram erro "attached to a different loop".
- **Correção:** limpar `app.dependency_overrides.clear()` em teardown (fixture com `yield`); manter testes vizinhos no mesmo escopo de event loop.

### Teste tautológico (comum em suítes geradas por IA)

- **Sintoma:** o valor `expected` é calculado pela mesma fórmula da implementação — o teste não pode falhar mesmo se o comportamento estivesse errado.
- **Como o revisor detecta:** perguntar "de onde veio o `expected`?" — se derivou do mesmo código, é tautológico; mutation testing é o teste decisivo, já que um mutante sobrevivente revela um teste que não assegura nada.
- **Correção:** derivar o valor esperado de uma fonte independente da implementação (spec, cálculo manual, fixture de domínio).

### Assertion Roulette / Magic Number Test (comum em suítes geradas por IA)

- **Sintoma:** múltiplas asserções sem mensagem no mesmo teste; números mágicos sem origem explicada; `assert result is not None` como única verificação — passa mesmo com lógica errada.
- **Como o revisor detecta:** contar asserções sem mensagem; rastrear cada literal até sua origem; checar se a asserção prova o comportamento, não só a ausência de exceção. Um estudo com testes LLM sobre o dataset HumanEval mediu Assertion Roulette em 23,8%–61,3% dos casos, contra 15% em ferramentas automáticas (EvoSuite) e 0% em testes manuais.
- **Correção:** uma asserção específica por comportamento, com mensagem/contexto; usar `@pytest.mark.parametrize(..., ids=[...])` para nomear cada caso e tornar a origem de cada valor explícita.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Testar endpoint comum, sem lifespan nem loop compartilhado | `TestClient` (síncrono) |
| Teste precisa de `await` ou do mesmo loop de uma fixture async | `AsyncClient(transport=ASGITransport(app=app))` |
| Teste depende de eventos de startup/shutdown | `LifespanManager` ou `TestClient` como context manager — não `ASGITransport` puro |
| Trocar dependência resolvida via `Depends` | `dependency_overrides`, não `patch` |
| Colaborador fora do sistema de DI do FastAPI | `patch(..., autospec=True)` |
| Colaborador com estado que precisa de comportamento real | fake (implementação leve funcional) |
| Gerar dados a partir de modelo Pydantic/dataclass | polyfactory |
| Gerar dados para modelo SQLAlchemy tradicional | factory_boy (`SQLAlchemyModelFactory`) |
| Mockar chamada HTTP para serviço externo | `respx.mock` |
| Congelar/mockar tempo em muitos testes | `time-machine` (não `freezegun`, ~100x mais rápido) |
| Teste de integração precisa de comportamento real do Postgres | `testcontainers` (`PostgresContainer`) + savepoint, não SQLite |
| Validar lógica com muitos casos de borda | Hypothesis (property-based) |
| Validar que a API conforma ao próprio OpenAPI | schemathesis |
| Contrato consumer-driven entre microsserviços | Pact |
| Auditar força de asserções com coverage alto suspeito | `mutmut`, pontual — não em todo CI |

## Referências externas

- Skill: `/tdd-workflow` — ciclo vermelho-verde-refactor aplicado ao código Python
- Skill: `/api-design` — contrato OpenAPI, versionamento e endpoints exercitados por schemathesis
- Source paths (audit trail):
  - Infos/knowledge/Python/compass_artifact_wf-1d7424ba-c0bb-5ddb-956f-82d43118195f_text_markdown.md
  - Infos/knowledge/Python/python-testing/SKILL.md
