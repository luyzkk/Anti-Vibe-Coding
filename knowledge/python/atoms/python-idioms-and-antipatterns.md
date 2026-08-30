---
topic: python-idioms-and-antipatterns
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-90d75ffa-4fc1-50b4-bf6f-296a4fa55734_text_markdown.md
  - Infos/knowledge/Python/python-patterns/SKILL.md
tier: 1
triggers: [EAFP, LBYL, default mutável, mutable default, dataclass, frozen, imutabilidade, Protocol, ABC, duck typing, metaclass, class decorator, assert, PEP 695, PEP 702, PEP 696, idiomático, anti-padrão, Result tuple]
related_skills: [/design-patterns, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Idiomas e Anti-Padrões — Python

## Quando consultar

- Ao escolher entre `try/except` e checagem prévia (`if key in d`, `hasattr`) para tratar uma condição que pode falhar
- Ao definir um argumento default de função ou um campo de dataclass
- Ao decidir entre `Protocol`, `ABC` ou herança para modelar um contrato ou reusar código
- Ao criar um "value object" imutável ou uma config compartilhada entre threads/requests
- Ao revisar `assert` usado para validar entrada de usuário ou regra de negócio
- Ao portar hábitos de Java/C# (getters/setters, utility class, prefixo `I`) para Python
- Ao considerar metaclasse para registrar ou estender classes
- Ao decidir o tipo de retorno de uma função que pode falhar, não achar valor, ou precisar de generics/depreciação em 3.12+/3.13+

## Padrões sênior

### Pattern: EAFP vs LBYL para tratamento de erro

- **Problema:** LBYL — checar `if key in dictionary`, `hasattr(...)` ou existência de arquivo antes de usar — abre uma janela entre a checagem e o uso onde o estado pode mudar (TOCTOU)
- **Padrão:** tente a operação direto e capture a exceção (EAFP, "easier to ask forgiveness than permission") — é o estilo idiomático de Python
- **Quando usar:** a exceção é rara — EAFP não tem overhead relevante frente ao LBYL quando a falha é exceção, não regra
- **Quando NÃO usar:** a checagem é barata e a falha é esperada/frequente — nesse caso LBYL evita o custo de lançar exceção repetidamente

```python
try:
    return dictionary[key]
except KeyError:
    return default_value
```

### Pattern: `Protocol` vs `ABC` para modelar contratos

- **Problema:** herança `ABC` força uma relação "is-a" e acopla classes que não precisariam se conhecer; criar uma interface abstrata para uma única implementação é cerimônia sem ganho
- **Padrão:** use `typing.Protocol` (PEP 544) para duck typing verificado estaticamente, sem herança explícita; reserve `ABC` para frameworks que precisam de enforcement em runtime (`isinstance`) e de implementação default compartilhada
- **Quando usar `Protocol`:** contrato mínimo do qual o código depende, classes que você não controla, ou uma única implementação concreta
- **Quando NÃO usar `Protocol`:** precisa de verificação em runtime rigorosa ou de compartilhar implementação default entre subclasses — `@runtime_checkable` só confere existência de métodos, não assinatura

```python
class SupportsWrite(Protocol):
    def write(self, data: bytes) -> int: ...

def dump(sink: SupportsWrite, data: bytes) -> None:
    sink.write(data)   # qualquer objeto com .write() serve
```

### Pattern: `frozen=True` para value objects

- **Problema:** objetos usados como chave de dict/membro de set, ou config compartilhada entre threads/requests, precisam ser imutáveis e hasháveis
- **Padrão:** `@dataclass(frozen=True)` levanta exceção em atribuição pós-init; `ConfigDict(frozen=True)` no Pydantic v2 impede `__setattr__` (levanta `ValidationError` tipo `frozen_instance`) e ainda gera `__hash__()` quando todos os campos são hasháveis
- **Quando usar:** value objects (ex.: `Money`), configuração compartilhada, qualquer dado que deveria ser imutável por design
- **Quando NÃO usar como imutabilidade total:** congelar não protege campos mutáveis aninhados — uma `list` dentro do modelo congelado ainda pode ser mutada

```python
from pydantic import BaseModel, ConfigDict

class Money(BaseModel):
    model_config = ConfigDict(frozen=True)
    amount: int
    currency: str
```

### Pattern: class decorator / `__init_subclass__` em vez de metaclasse

- **Problema:** metaclasses não compõem — herança múltipla gera "metaclass conflict" — e são difíceis de rastrear e debugar
- **Padrão:** para estender ou registrar classes, use decorator de classe ou `__init_subclass__`; ambos resolvem os mesmos casos e compõem livremente
- **Quando usar:** extensão componível, registro de subclasses, aplicar comportamento a várias classes sem forçar herança
- **Quando NÃO usar metaclasse:** quase sempre — reserve `__getattr__`, descriptors e metaclasses para bibliotecas/frameworks; em código de aplicação, um caso único de transformação de atributo já é resolvido por `@property`

### Pattern: `X | None` + early return em vez de Result-tuple

- **Problema:** emular `Result`/`Either` ou retornar tupla `(value, err)` estilo Go vai contra o idioma — Python sinaliza erro com exceções — e obriga quem chama a checar a tupla manualmente
- **Padrão:** use `T | None` (PEP 604, 3.10+) para "opcional" e early return; sinalize erro de verdade com exceção
- **Quando usar:** função que pode legitimamente não achar um valor — retorne `None` e deixe quem chama decidir
- **Quando NÃO usar exceção como default:** pipelines de dados muito funcionais podem adotar `Result` deliberadamente — é nicho e deve ser decisão explícita do time, não o padrão

### Pattern: generics e depreciação modernas — PEP 695 / 702 / 696

- **Problema:** `TypeVar` module-level é uma variável global sem escopo bem definido, compartilhada entre funções; depreciar uma API só por docstring não é verificável por tooling nem avisa em runtime
- **Padrão:** PEP 695 (3.12+) embute generics na sintaxe — `class Box[T]:`, `def first[T]` com parâmetro `xs: list[T]` e retorno `T`, `type Alias = ...` — com escopo correto e variância inferida; PEP 702 (3.13+) — `@warnings.deprecated("mensagem")` integra a depreciação ao type checker e emite `DeprecationWarning` em runtime; PEP 696 (3.13+) permite default em type parameter (`class Box[T = int]`)
- **Quando usar:** todo código novo que já roda no piso mínimo de versão de cada PEP
- **Quando NÃO usar:** PEP 695 é sintaxe/grammar com piso 3.12 — não é backportável via `typing_extensions` (`SyntaxError` em ≤3.11); PEP 702 e PEP 696 são backportáveis via `typing_extensions` em versões antigas

## Anti-padrões

### Default mutável em argumento de função ou dataclass

- **Sintoma:** `def f(x, acc=[])`, ou `items: list = []` num dataclass — o default é avaliado uma única vez, na definição da função/classe; o mesmo objeto é reusado entre chamadas e acumula estado silenciosamente
- **Correção:** use `None` como sentinela e crie o objeto dentro da função; em `@dataclass`, use `field(default_factory=list)` — um default mutável literal já levanta `ValueError` na definição da classe

```python
def add(x, acc=None):
    acc = [] if acc is None else acc
    acc.append(x)
    return acc
```

### `assert` para validar entrada ou regra de negócio

- **Sintoma:** `assert user.is_admin`, `assert amount > 0` em código de aplicação — parece validação, mas depende de flag de execução
- **Correção:** rodando com `-O`/`-OO`/`PYTHONOPTIMIZE`, o interpretador remove todo `assert` do bytecode (`__debug__` vira `False`) — a checagem de segurança ou integridade some silenciosamente, junto de qualquer efeito colateral dentro do `assert`; use `if ...: raise ValueError(...)` (ou `HTTPException` na borda HTTP) — `assert` serve só para teste (pytest reescreve os asserts) e checagem de desenvolvimento

### Herança profunda e mixins para reuso de código

- **Sintoma:** cadeia de herança com vários níveis, mixins improvisados só para compartilhar método entre classes não relacionadas
- **Correção:** herança serve para "is-a" real (interface, via `ABC`); reuso de código é detalhe de implementação e, nas palavras da fonte, pode frequentemente ser substituído por composição e delegação

### Getters/setters e utility class ao estilo Java/C#

- **Sintoma:** `get_x()`/`set_x()` triviais sobre campo "privado"; `class StringUtils:`/`class Helpers:` só com `@staticmethod`; prefixo `IRepository` para nomear uma interface
- **Correção:** exponha o atributo direto — Python segue o *uniform access principle*, um atributo público pode virar `@property` depois sem quebrar a API; funções sem estado vão soltas no módulo, que já é o namespace natural; `Protocol`/`ABC` recebem nome normal (`Repository`), o prefixo `I` é convenção C#/.NET estranha ao Python

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Checar dict/atributo antes de usar vs tentar direto | EAFP (`try/except`) — LBYL só quando a checagem é barata e a falha é frequente |
| Contrato com múltiplas implementações e necessidade de enforcement em runtime | `ABC` |
| Contrato mínimo, implementação única, ou classes que você não controla | `Protocol` (duck typing estrutural) |
| Reuso de código entre classes não relacionadas | Preferir composição/delegação a herança/mixin |
| Objeto usado como chave de dict/membro de set, ou config compartilhada | `frozen=True` (dataclass) / `ConfigDict(frozen=True)` (Pydantic v2) |
| Validar entrada de usuário ou regra de negócio | `if ...: raise` — nunca `assert` |
| Estender ou registrar classes | Class decorator ou `__init_subclass__` — não metaclasse |
| Função sem estado | Função de módulo — não classe só com `@staticmethod` |
| Função que pode não achar um valor | `T \| None` + early return |
| Sinalizar erro real (não ausência de valor) | Exceção — não tupla `(value, err)`/`Result` |
| Generics em Python ≥3.12 | Sintaxe PEP 695 (`class Box[T]:`, `type Alias = ...`) — não `TypeVar`/`Generic[T]` |
| Depreciar API pública em Python ≥3.13 | `@warnings.deprecated("mensagem")` (PEP 702) |

## Referências externas

- Skill: `/design-patterns` — Protocol/ABC, composição vs herança, class decorator como alternativa a metaclasse
- Skill: `/architecture` — value objects imutáveis, contratos mínimos entre módulos
- Source paths (audit trail):
  - Infos/knowledge/Python/compass_artifact_wf-90d75ffa-4fc1-50b4-bf6f-296a4fa55734_text_markdown.md
  - Infos/knowledge/Python/python-patterns/SKILL.md
