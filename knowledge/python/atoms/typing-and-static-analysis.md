---
topic: typing-and-static-analysis
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report (3).md
  - Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md
tier: 1
triggers: [mypy, strict, tipagem, type hints, TypeIs, TypeGuard, cast, NewType, value object, discriminated union, Protocol, ParamSpec, variance, dmypy, autospec, spec_set, pydantic.mypy, ty, Pyrefly, warn_unreachable]
related_skills: [/design-patterns, /architecture, /tdd-workflow]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Tipagem e Análise Estática

## Quando consultar

- Ao configurar `[tool.mypy]`/`pyproject.toml` de um projeto novo, ou ao assumir que `strict = true` já cobre tudo que o time espera
- Ao decidir entre `cast`, `isinstance` e um predicate `TypeGuard`/`TypeIs` para estreitar um tipo
- Ao modelar um ID ou valor que não pode ser confundido com outro primitivo do mesmo tipo runtime (ex.: `UserId` vs `OrderId`, ambos `int`)
- Ao desenhar um campo `status`/`kind`/`type` com vários `Optional` interdependentes
- Ao tipar uma dependência interna (repository, gateway, clock), um decorator/wrapper genérico, ou decidir entre mock e fake num teste tipado

## Padrões sênior

### Pattern: `strict = true` no mypy — o que liga e o que fica de fora

- **Problema:** assumir que `strict = true` "liga todo check útil" sozinho — `warn_unreachable` não faz parte do conjunto de `strict`, e `exhaustive-match` é opt-in; além disso a própria documentação do mypy alerta que o conjunto exato de flags incorporadas por `strict` pode mudar entre versões.
- **Padrão:** ativar `strict = true` em código novo e tornar explícito o que strict não cobre. `strict` liga (entre outras) `warn-unused-configs`, `disallow-any-generics`, `disallow-subclassing-any`, `disallow-untyped-calls`, `disallow-untyped-defs`, `disallow-incomplete-defs`, `check-untyped-defs`, `disallow-untyped-decorators`, `warn-redundant-casts`, `warn-unused-ignores`, `warn-return-any`, `no-implicit-reexport`, `strict-equality` e `extra-checks` (mais `strict-bytes` em versões recentes).
- **Quando usar:** todo `pyproject.toml` novo, novo pacote/bounded context, CI de typing — fixe também a versão do mypy no CI, porque upgrade de checker não é semanticamente neutro.
- **Quando NÃO usar strict globalmente de uma vez:** legacy grande — o guia oficial recomenda migrar por ilhas (um diretório/pacote por vez) que ficam permanentemente verdes, em vez de abaixar o gate para toda a base.

```toml
[tool.mypy]
python_version = "3.13"
strict = true
warn_unreachable = true
enable_error_code = ["exhaustive-match"]
plugins = ["pydantic.mypy"]
```

### Pattern: plugin `pydantic.mypy` para modelos Pydantic v2

- **Problema:** sem o plugin, o mypy não entende o `__init__` sintetizado dinamicamente do `BaseModel` e gera erros espúrios nesse construtor.
- **Padrão:** declarar `plugins = ["pydantic.mypy"]` em `[tool.mypy]` e configurar `[tool.pydantic-mypy]` — o plugin sintetiza a assinatura correta do `__init__` e adiciona checagens específicas do framework.
- **Quando usar:** todo projeto com Pydantic v2 sob mypy (plugin compatível com mypy >=0.910).
- **Quando NÃO usar assim:** modelos `pydantic.v1` usam o plugin `pydantic.v1.mypy`; e nem `ty` nem `Pyrefly` têm sistema de plugins, então nenhum dos dois substitui o mypy nesse ponto.

```toml
[tool.mypy]
plugins = ["pydantic.mypy"]

[tool.pydantic-mypy]
init_forbid_extra = true
init_typed = true
warn_required_dynamic_aliases = true
```

### Pattern: `TypeIs` vs `TypeGuard` vs `cast`

- **Problema:** `cast()` não valida nem converte nada em runtime — apenas instrui o checker a confiar num tipo, então usar `cast` no lugar de narrowing real "mente" para o checker sem checagem nenhuma por trás.
- **Padrão:** prefira narrowing provado por fluxo (`isinstance`, comparação de tag, `is None`) ou um predicate dedicado. `TypeIs` — 3.13+ (PEP 742); em 3.11/3.12 use `TypeGuard`. A diferença é o contrato: `TypeIs` estreita tanto o branch verdadeiro quanto o falso, mas só é seguro quando a função retorna `True` se e somente se o valor pertence ao tipo — um predicate parcial (ex.: checar `int` **e** positivo) quebra essa semântica, porque o branch falso não pode negar `int`.
- **Quando usar `TypeIs`:** predicate booleano onde a negação exclui completamente o tipo (`is_str(value) -> TypeIs[str]`).
- **Quando NÃO usar narrowing e aceitar `cast`:** existe uma invariante real que o checker não consegue provar (ex.: garantia de um framework); nesse caso o cast deve ficar estreito e colado à prova, não espalhado pela função.

```python
from typing import TypeIs

def is_str(value: object) -> TypeIs[str]:
    return isinstance(value, str)
```

### Pattern: `NewType` vs value object

- **Problema:** um alias (`UserId = int`) só muda o nome da annotation — não cria identidade estática distinta, então dois IDs do mesmo primitivo podem ser trocados numa chamada sem o checker acusar nada.
- **Padrão:** use `NewType` quando dois valores têm a mesma representação runtime mas não podem se misturar semanticamente (`UserId = NewType("UserId", int)`) — cria um subtipo nominal só para o checker, idêntico ao tipo base em runtime. Quando o tipo carrega invariantes (range, normalização, relação entre campos), promova para um value object validado (`Annotated[int, Field(ge=0, le=100)]`, dataclass frozen com `__post_init__`, ou model Pydantic).
- **Quando usar `NewType`:** impedir troca acidental de parâmetros com o mesmo primitivo (IDs, centavos, tokens) — é mais barato que criar uma classe.
- **Quando NÃO usar `NewType` sozinho:** quando a validade depende de invariante runtime — `NewType` não valida nada (`PositiveCents = NewType(...)` não verifica positividade).

### Pattern: Discriminated unions e exaustividade

- **Problema:** um objeto com vários campos `Optional` interdependentes admite estados impossíveis (ex.: `state="pending"` com `receipt_id` já preenchido); e sem checagem de exaustividade, uma nova variante pode manter o código compilando e cair silenciosamente num caminho antigo.
- **Padrão:** modele estados mutuamente exclusivos como union de variantes com tag `Literal` (`Pending | Paid | Failed`), permitindo ao checker fazer narrowing pelo discriminador — Pydantic recomenda isso em vez de unions sem tag porque a variante fica previsível e só ela precisa ser validada. Trave a exaustividade do `match` sobre essa union com `assert_never(...)` no fim (portátil) ou com `enable_error_code = ["exhaustive-match"]` (mypy 1.17+, dispensa o `assert_never` explícito).
- **Quando usar:** `status`/`kind`/`type` com grupos de campos válidos só em certos estados; toda closed union/state machine onde uma variante nova deve forçar decisão explícita no código observador.
- **Quando NÃO usar union fechada:** conjunto aberto/extensível por plugins — editar o tipo central a cada variante nova não escala; um `_` proposital no `match` também é correto quando o contrato realmente diz "estado desconhecido recebe o mesmo tratamento".

```python
from typing import assert_never

def label(payment: Payment) -> str:
    match payment:
        case Pending():
            return "aguardando"
        case Paid():
            return "pago"
        case Failed():
            return "falhou"
    assert_never(payment)
```

### Pattern: `Protocol` para dependências internas por capacidade

- **Problema:** forçar uma classe-base nominal só para "dar um tipo" a uma dependência (repository, gateway, clock) acopla implementação e fake a uma hierarquia que existe só para o typing.
- **Padrão:** `Protocol` implementa structural subtyping — uma classe satisfaz o contrato se tiver membros compatíveis, sem herdar dele; é o equivalente estático do duck typing.
- **Quando usar:** repository/gateway/clock/publisher/unit of work e fakes de teste que precisam ser verificados contra a mesma interface que a implementação real.
- **Quando NÃO usar:** quando identidade, `isinstance` em runtime, estado ou implementação-base compartilhada fazem parte do design — o próprio FAQ do mypy usa a regra de bolso "nominal onde possível, protocol onde necessário", não "Protocol sempre".

### Pattern: `ParamSpec` em decorators/wrappers que preservam assinatura

- **Problema:** tipar um wrapper como `Callable[..., Any]` elimina a checagem dos argumentos e do retorno da função envolvida (retry, transaction, tracing, authorization wrapper).
- **Padrão:** usar `ParamSpec` para encaminhar a lista de parâmetros de uma callable genericamente, preservando a assinatura original para quem chama o wrapper.
- **Quando usar:** decorator que não muda a assinatura da função decorada.
- **Quando NÃO usar:** decorator que deliberadamente altera a assinatura — force `Concatenate`/overloads nesse caso; não finja "signature preserving" numa transformação que não preserva.

```python
from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

def traced(fn: Callable[P, R]) -> Callable[P, R]:
    @wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return fn(*args, **kwargs)
    return wrapper
```

### Pattern: Variance — covariante para leitura, contravariante para parâmetro de callable

- **Problema:** pedir um container mutável (`list[Animal]`) quando a função só lê barra a passagem de `list[Dog]`, mesmo `Dog` sendo `Animal`.
- **Padrão:** aceite interfaces read-only covariantes (`Sequence[Animal]`) quando a função só itera/lê — `Sequence`/`FrozenSet` são tipicamente covariantes. Para `Callable`, o parâmetro varia no sentido contrário ao retorno (contravariante): um handler que aceita `Animal` pode ser passado onde se espera `Callable[[Dog], None]`; não "conserte" um erro de variance com `cast(Callable[[Dog], None], handler)` — revise a relação entre os parâmetros em vez de mascará-la.
- **Quando usar covariante:** a função só lê a coleção — não faz `append`/`sort`/substituição de elementos.
- **Quando NÃO usar covariante:** a função realmente muta a coleção (insere, ordena in-place) — aí uma abstração mutável/invariante é o contrato correto.

### Pattern: `dmypy` (daemon) antes de enfraquecer strictness por performance

- **Problema:** lentidão do mypy em bases grandes tenta justificar desligar strictness (ex.: `follow_imports = "skip"`) só para "ficar mais rápido", sem medir quanta informação de tipos se perde.
- **Padrão:** use o cache incremental (default) e o daemon (`dmypy run`) no loop local — a documentação afirma que o daemon pode rodar 10x ou mais rápido que invocações CLI normais em bases grandes quando reusado após pequenas edições; no mypy 2.x o daemon requer `local_partial_types`, que já é default desde mypy 2.0.
- **Quando usar:** bases grandes, edições pequenas e repetidas, loop local de desenvolvimento.
- **Quando NÃO usar dmypy sozinho:** CI com cold start muito grande — considere remote cache e o extra `faster-cache` (usa `orjson`, disponível desde mypy 1.13) antes de fragmentar a análise de tipos; CI ainda pode preferir execução limpa e reproduzível a manter estado de daemon.

### Pattern: `autospec`/`spec_set` em mocks tipados; fake concreto via `Protocol`

- **Problema:** `Mock()`/`MagicMock()` irrestritos fabricam atributos dinamicamente — uma chamada com nome de método errado (typo) continua "funcionando" no teste, porque o mock cria outro mock na hora.
- **Padrão:** use `create_autospec`/`autospec=True` (introspecta assinaturas e levanta `TypeError` numa chamada incompatível) ou ao menos `spec_set` (proíbe ler/definir atributos fora da spec). Para dependências de domínio pequenas onde a segurança estática importa mais que introspecção de chamadas, um fake concreto que satisfaça o mesmo `Protocol` é verificado estruturalmente pelo checker tanto quanto a implementação real.
- **Quando usar autospec/spec_set:** qualquer mock de uma dependência com contrato conhecido (service/repository mockado).
- **Quando preferir fake em vez de mock:** teste orientado a estado de um collaborator pequeno, em strict mode, onde o mock exigiria casts/`Any`; mocks continuam melhores quando o teste precisa afirmar ordem/frequência de chamadas ou provocar exceções.

### Pattern: `ty`/`Pyrefly` como complementares, não substitutos de CI

- **Problema:** propor trocar o checker canônico de CI por `ty` ou `Pyrefly` ainda em beta/recém-1.0.
- **Padrão:** em 2026, mantenha mypy ou Pyright como checker canônico de CI; use `ty` (Astral) ou `Pyrefly` (Meta, 1.0 em 12/05/2026) só para feedback rápido no editor — nenhum dos dois tem sistema de plugins, então não rodam o plugin do Pydantic/SQLAlchemy.
- **Quando usar `ty`/`Pyrefly`:** feedback rápido no editor, checagem complementar ao gate de CI — o próprio autor do FastAPI roda `ty` ao lado do mypy, não no lugar.
- **Quando NÃO tratar como gate único:** `ty` checa corpos de função não anotados por padrão — uma codebase mypy-clean pode gerar erros novos na primeira execução; trate os números de conformance como sinal de benchmarks de terceiros, não como métrica oficial estável.

## Anti-padrões

### `cast()` tratado como validação

- **Sintoma:** código assume que `cast(T, x)` verifica ou converte `x` em runtime (`x = cast(int, "123")`).
- **Correção:** `cast()` devolve a expressão inalterada — é só uma declaração de confiança ao checker; para validar de verdade, use narrowing real (`isinstance`, `TypeIs`) no ponto de entrada.

### Alias tratado como tipo de domínio distinto

- **Sintoma:** `UserId = int` e `OrderId = int` — uma chamada como `cancel_order(20, 10)` com os argumentos trocados passa despercebida porque o checker só vê `int, int`.
- **Correção:** use `NewType` para criar identidade estática separada — ver Pattern `NewType` vs value object.

### `strict = true` assumido como "liga tudo"

- **Sintoma:** time acredita que ligar `strict` no mypy já cobre unreachable code e exaustividade de `match`.
- **Correção:** declare `warn_unreachable = true` e `enable_error_code = ["exhaustive-match"]` explicitamente — nenhum dos dois está incluído em `strict`, e o conjunto de `strict` pode mudar entre versões do mypy.

### `ignore_missing_imports` global em vez de isolar por módulo

- **Sintoma:** `[tool.mypy] ignore_missing_imports = true` no root "para o mypy ficar verde" — símbolos importados viram `Any`, inclusive classes-base, e subclasses de uma base `Any` deixam de ser checadas de verdade.
- **Correção:** isole a lib sem tipos por módulo via `[[tool.mypy.overrides]] module = [...]` e adapte o retorno dela com uma função que valida antes de devolver um tipo concreto.

### Mock irrestrito para dependência com contrato conhecido

- **Sintoma:** `mailer = Mock()`; uma chamada com typo (`mailer.sned(...)`) continua "passando" no teste porque o mock cria outro mock dinamicamente para qualquer atributo.
- **Correção:** use `create_autospec`/`spec_set` — ver Pattern `autospec`/`spec_set` em mocks tipados.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Código novo, `pyproject.toml` do zero | `strict = true` + `warn_unreachable = true` + `enable_error_code = ["exhaustive-match"]` |
| Codebase legada grande | Migrar por ilhas que ficam permanentemente verdes — não abaixar o gate global |
| Projeto com Pydantic v2 sob mypy | `plugins = ["pydantic.mypy"]` — sem ele, o `__init__` sintetizado gera erros espúrios |
| Predicate "é T / não é T" nos dois branches | `TypeIs[T]` (3.13+) — `TypeGuard[T]` em 3.11/3.12 ou quando a negação não exclui `T` totalmente |
| Existe invariante real que o checker não consegue provar | `cast()` estreito, colado à prova — não como substituto de narrowing |
| Impedir troca acidental de parâmetros do mesmo primitivo | `NewType` |
| Tipo carrega invariante runtime (range, normalização, relação entre campos) | Value object validado (`Annotated` + `Field`, dataclass frozen, model Pydantic) |
| Estados mutuamente exclusivos com campos próprios por estado | Union discriminada com `Literal` + `match` exaustivo |
| Dependência interna definida por capacidade (repository, gateway, clock) | `Protocol` |
| Decorator/wrapper que precisa preservar a assinatura original | `ParamSpec` |
| Base grande no loop local vs. cold start de CI | `dmypy run` (cache incremental + daemon) localmente; remote cache/`faster-cache` no CI |
| Dependência mockada: contrato conhecido vs. collaborator pequeno em strict mode | `create_autospec`/`spec_set` (mock) vs. fake concreto via `Protocol` |
| Trocar o checker canônico de CI por `ty`/`Pyrefly` | Não — mantenha mypy/Pyright no CI; `ty`/`Pyrefly` só no editor |

## Referências externas

- Skill: `/design-patterns` — Protocol como equivalente estático de duck typing, discriminated unions como alternativa tipada a state com flags
- Skill: `/architecture` — fronteiras de confiança e contratos entre bounded contexts, plugin `pydantic.mypy` em bases com Pydantic v2
- Skill: `/tdd-workflow` — autospec/spec_set e fakes via Protocol em testes tipados
- Source paths (audit trail):
  - Infos/knowledge/Python/deep-research-report (3).md
  - Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md (§3 — Type checkers)
