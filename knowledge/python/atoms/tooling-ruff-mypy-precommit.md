---
topic: tooling-ruff-mypy-precommit
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md
tier: 2
triggers: [ruff, lint, extend-select, B008, ruff format, import sorting, pre-commit, mypy hook, deptry, coverage, branch coverage, exclude_also, vulture, dead code, ruff server, guardrail]
related_skills: [/design-patterns, /tdd-workflow]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Tooling — Ruff, mypy e Pre-commit

## Quando consultar

- Ao configurar `[tool.ruff.lint]` num projeto novo ou migrar de Flake8 + isort + Black
- Ao ver `B008` disparar em endpoints com `Depends`/`Query`/`Header` como valor default
- Ao montar ou revisar a ordem dos hooks do `.pre-commit-config.yaml` (Ruff e mypy)
- Ao configurar `deptry`, branch coverage ou `exclude_also` no `pyproject.toml`
- Ao avaliar um alerta de dead code (`F401`/`F841`, `ERA`, Vulture) antes de remover algo
- Ao escrever ou revisar as regras de tooling que um agente de IA deve seguir num `CLAUDE.md`/`AGENTS.md`

## Padrões sênior

### Pattern: `select` vs `extend-select` no Ruff

- **Problema:** confundir `select` (que reescreve o conjunto default de regras) com `extend-select` (que soma aos defaults) faz regras "sumirem" silenciosamente — `select = ["I"]` liga só import sorting e apaga `E`/`F` sem aviso.
- **Padrão:** em projeto novo, use `extend-select` para herdar o baseline curado do Ruff e somar regras; em migração de uma ferramenta antiga, use `select` para reproduzir exatamente o conjunto anterior.
- **Quando usar `extend-select`:** projeto novo somando famílias de regras (`I`, `B`, `UP`, `SIM`, `C4`, `PTH`, `RUF`) aos defaults `E`/`F`.
- **Quando NÃO usar `select = ["ALL"]` sem cuidado:** liga regras novas automaticamente a cada upgrade do Ruff — a doc oficial recomenda usá-lo "com discrição".

### Pattern: B008 em `Depends`/`Query` — `extend-immutable-calls` ou migrar para `Annotated`

- **Problema:** `B008` (não fazer chamadas de função em defaults de argumento) dispara em `def endpoint(x: str = Query(...))` porque previne o bug clássico de default mutável avaliado uma única vez — mas o FastAPI usa esse padrão intencionalmente como marcador de injeção, gerando falso positivo.
- **Padrão:** configure `extend-immutable-calls` com os callables do FastAPI usados como default, ou ative a família `FAST` e migre para `Annotated[...]` via autofix de `FAST002` — a doc do FastAPI recomenda `Annotated` porque a função fica reutilizável fora do framework. `FAST001` detecta `response_model` redundante.
- **Quando usar `extend-immutable-calls`:** solução rápida sem tocar em endpoints existentes.
- **Quando NÃO usar o autofix do `FAST002` sem revisar:** o autofix é sempre unsafe — pode alterar comportamento em runtime, com falsos positivos históricos em params que têm `default` (ex.: `Query("")`); dentro de `Annotated`, use o default real do parâmetro, não o `default` do `Query`.

```toml
[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query", "fastapi.Header"]
```

### Pattern: `S` + `ASYNC` — segurança e blocking calls em código async

- **Problema:** codebase FastAPI async sem verificação de chamadas bloqueantes dentro de corrotinas nem checagem de segurança estática básica.
- **Padrão:** inclua `S` (flake8-bandit, subconjunto do Bandit) e `ASYNC` (flake8-async) no `select`/`extend-select`.
- **Quando usar `ASYNC`:** pega chamadas bloqueantes dentro de corrotinas — a fonte descreve isso como o erro nº 1 de agentes de IA em FastAPI.
- **Quando NÃO usar `S` sozinho como substituto do Bandit dedicado:** `S` cobre o núcleo do Bandit (ex.: `S104` bind em `0.0.0.0`, `S105`/`S106` secrets hardcoded) mas não reimplementa 100% dos plugins/checagens; libere `S101` (assert) em `tests/` via `per-file-ignores`.

### Pattern: `ruff format` + regra `I` — substituindo Black e isort separados

- **Problema:** manter Black e isort como ferramentas separadas do Ruff duplica configuração e reintroduz o conflito histórico de ordenação isort×Black.
- **Padrão:** padronize `ruff format` — compatível com o estilo do Black por padrão (line-length 88, aspas duplas, magic trailing comma respeitado) — e ative a regra `I` para import sorting nativo, dispensando o `--profile=black`.
- **Quando usar:** sempre que o Ruff já estiver instalado — consolida lint, format e import sorting numa única ferramenta.
- **Quando NÃO assumir compatibilidade total com Black:** existem "known deviations from Black" documentadas; equipes muito sensíveis a diffs de formatação às vezes preferem manter Black por estabilidade. Se `target-version`/`requires-python` estiverem ausentes, o Ruff assume `py310` — declare um dos dois.

### Pattern: Pre-commit — `ruff-check` sempre antes de `ruff-format`

- **Problema:** hooks na ordem errada fazem o linter aplicar fixes que exigem reformatação depois, obrigando a rodar o pre-commit duas vezes.
- **Padrão:** configure os hooks do `ruff-pre-commit` na ordem `ruff-check` (com `--fix`) → `ruff-format`.
- **Quando usar:** sempre — fixar o `rev` é obrigatório para reprodutibilidade, e `pre-commit autoupdate` deve rodar periodicamente.
- **Quando NÃO usar o id antigo:** o id `ruff` foi renomeado para `ruff-check`; configs antigas com `id: ruff` precisam ser atualizadas.

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.16.5
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
```

### Pattern: mypy no pre-commit — ambiente isolado do hook

- **Problema:** o hook `mirrors-mypy` roda num venv próprio, sem as dependências do projeto — o mypy não resolve os imports corretamente e/ou usa stubs errados.
- **Padrão:** declare os stubs e libs necessárias em `additional_dependencies` do hook (ex.: `additional_dependencies: ["pydantic", "types-requests"]`); para bases maiores, considere rodar mypy só em CI/local em vez de a cada commit.
- **Quando usar `additional_dependencies`:** ao manter mypy no pre-commit mesmo assim — mypy 2.0 mudou defaults e exige Python 3.10+, então pin o `rev` do hook de acordo.
- **Quando NÃO usar mypy no pre-commit:** quando o custo de manter as deps do hook sincronizadas não compensa — é um ponto de fricção reconhecido, e os times divergem se mypy deve rodar no pre-commit ou só em CI. Para as flags que `strict = true` liga no mypy, ver o atom `typing-and-static-analysis` — aqui o escopo é só a integração no pre-commit.

### Pattern: `deptry` — dependências não usadas, faltantes, transitivas ou mal-colocadas

- **Problema:** usar uma dependência transitiva diretamente é uma "bomba-relógio" — se a dependência intermediária mudar ou for removida, o import quebra sem aviso; dependências declaradas e nunca importadas também passam despercebidas.
- **Padrão:** rode `deptry .` para detectar `DEP001` (import de pacote não declarado), `DEP002` (dependência declarada e nunca usada), `DEP003` (transitiva usada direto) e `DEP004` (dev dependency usada em código de produção).
- **Quando usar:** deptry escaneia imports, inclusive dentro de funções, e compara com o `pyproject.toml`; suporta uv, Poetry, PDM e PEP 621.
- **Quando NÃO usar sem o venv do projeto:** deptry precisa rodar dentro do venv do projeto para resolver os imports corretamente; ele também não roda `DEP002` para dev dependencies.

### Pattern: Branch coverage, `exclude_also` e a armadilha do código async

- **Problema:** 100% de line coverage pode esconder branches nunca exercitados (um `if` cujo `else` nunca roda); blocos idiomáticos (`if TYPE_CHECKING:`, `@overload`, `...`) contam como "missing" e incentivam testes cosméticos; e importar um módulo async já executa as linhas de definição (o decorator da rota), inflando a cobertura sem testar o corpo da função.
- **Padrão:** ligue `branch = true` em `[tool.coverage.run]` e `fail_under = N` em `[tool.coverage.report]`; prefira `exclude_also` (que soma à lista built-in) a `exclude_lines` (que a sobrescreve) para as exclusões idiomáticas — a partir do coverage 7.10.0, `if TYPE_CHECKING:` e corpos `...` já são excluídos por padrão em branch coverage. Para endpoints async, garanta que sejam exercitados por um teste real (`TestClient`/`httpx.AsyncClient`), não só importados.
- **Quando usar:** todo projeto com `pytest-cov` e qualquer endpoint/corpo `async def`.
- **Quando NÃO usar `exclude_lines` isolado:** ele sobrescreve a lista built-in de exclusões em vez de somar a ela.

```toml
[tool.coverage.run]
branch = true

[tool.coverage.report]
fail_under = 90
exclude_also = [
  "if TYPE_CHECKING:",
  "raise NotImplementedError",
]
```

### Pattern: `F401`/`F841` + `ERA` — dead code dentro de um arquivo

- **Problema:** imports não usados, variáveis atribuídas e nunca lidas, e blocos grandes de código comentado poluem o repositório e o code review.
- **Padrão:** ligue `F` (inclui `F401` unused import e `F841` unused variable) e `ERA` (eradicate, remove código morto comentado) no Ruff.
- **Quando usar:** são detecções estáticas confiáveis dentro de um único arquivo — baseline para todo projeto.
- **Quando NÃO usar como única defesa contra dead code:** não cobrem dead code entre módulos (função nunca chamada de outro arquivo) — ver o pattern de Vulture a seguir.

### Pattern: Vulture — dead code entre módulos, com falsos positivos conhecidos em FastAPI

- **Problema:** detecção estática só vê chamadas diretas; o FastAPI registra handlers via decorator e o framework os invoca sem call-site direto, o que gera falsos positivos em endpoints, validators Pydantic, models e background tasks marcados como "unused". Num benchmark citado na fonte (@duriantaco, autor do Skylos, "Python Dead Code: I Scanned Flask, FastAPI, and 7 Other Popular Repos", DEV Community), no repositório fastapi/fastapi o Vulture reportou 102 falsos positivos (100+ campos de model OpenAPI) contra 30 do Skylos; somando os 9 repositórios do benchmark, Vulture teve 644 falsos positivos (precisão 6,4%) vs 220 do Skylos (18,8%), com recall 84,6% vs 98,1%.
- **Padrão:** rode `vulture --min-confidence 80` e/ou `deadcode`, configurando `ignore_decorators` para as rotas (`app.route`, `app.get`, `router.post` etc.); gere uma whitelist (`vulture --make-whitelist`) na adoção inicial.
- **Quando usar:** dead code entre módulos que `F401`/`F841` não cobrem — sempre revisando com `--dry-run` antes de remover.
- **Quando NÃO usar sem whitelist/dry-run:** nunca auto-remova sugestões do Vulture sem `--dry-run` — dead code em Python é, no limite, indecidível, e os números acima vêm de um benchmark específico, não de uma medição universal; ferramentas framework-aware como o Skylos citado ainda são emergentes.

### Pattern: IDE — `ruff server` nativo

- **Problema:** sem formatter definido no editor, a formatação fica inconsistente entre desenvolvedores.
- **Padrão:** instale a extensão oficial `charliermarsh.ruff`, configure Ruff como formatter default e ative fix-on-save/organize-imports; o servidor nativo `ruff server` substituiu o antigo `ruff-lsp` e integra lint, format e import sorting num só LSP, com paridade em relação ao CLI.
- **Quando usar:** todo editor compatível (ex.: VS Code via a extensão oficial) rodando Ruff.
- **Quando NÃO usar para type checking:** Ruff não faz inferência de tipos — use Pylance/basedpyright (Pyright) ou `ty` no editor para isso.

### Pattern: Lint como guardrail determinístico para código gerado por IA

- **Problema:** agentes de IA não têm os defaults do projeto e "adivinham" — rodam `pip install` num projeto uv, criam `requirements.txt`, escrevem `def` onde deveria ser `async def`, omitem tipos ou usam `Any` só para calar o checker; um falso positivo de análise estática consumido por um agente vira um bug introduzido com confiança.
- **Padrão:** declare no `CLAUDE.md`/`AGENTS.md` o tooling exato (ex.: `uv run ruff check --fix .`, `uv run mypy .`) e proíba `# noqa`/`# type: ignore` sem o código específico do erro; ligue `ANN` (flake8-annotations), considerando `ANN401` para proibir `Any` explícito, combinando com mypy strict.
- **Quando usar:** todo repo com código gerado por agente — regras de estilo pertencem ao Ruff/pre-commit (determinístico), não à prosa do `CLAUDE.md`, que custa tokens e é não-determinístico; a fonte resume o princípio como "Do not use CLAUDE.md as a linter". Um hook `PostToolUse` rodando Ruff a cada edição é mais eficaz que só a instrução.
- **Quando NÃO usar `ANN` irrestrito:** é ruidoso em legado — libere em `tests/`; historicamente `ANN101`/`ANN102` (self/cls) foram removidos. Quanto endurecer essas regras varia por time (contestado).

## Anti-padrões

### `select` reescrevendo os defaults sem perceber

- **Sintoma:** `[tool.ruff.lint] select = ["I"]` faz as regras `E`/`F` sumirem silenciosamente — só import sorting roda.
- **Correção:** use `extend-select` para somar regras aos defaults; reserve `select` só para reproduzir exatamente um conjunto de regras de uma ferramenta antiga.

### Black/isort mantidos ao lado do Ruff já instalado

- **Sintoma:** `[tool.black]` e isort configurados junto com o Ruff no `pyproject.toml`, dois formatters concorrendo no pre-commit, conflito de ordenação isort×Black.
- **Correção:** consolide em `ruff format` (compatível com o estilo do Black por padrão) e na regra `I` para import sorting; remova Black/isort/autopep8 do pre-commit.

### Ordem errada dos hooks no pre-commit

- **Sintoma:** `ruff-format` roda antes de `ruff-check` — o linter aplica fixes depois da formatação e força rodar o pre-commit de novo.
- **Correção:** sempre `ruff-check` (com `--fix`) antes de `ruff-format`, com `rev` fixado.

### Vulture sinalizando FastAPI inteiro como dead code

- **Sintoma:** `@app.get`, validators Pydantic e campos de model aparecem como "unused" porque o Vulture só enxerga chamadas diretas, não invocação via decorator do framework.
- **Correção:** configure `ignore_decorators` para as rotas, use `--min-confidence 80`, gere uma whitelist na adoção inicial e nunca remova sem `--dry-run`.

### `# noqa`/`# type: ignore` genérico em código gerado por IA

- **Sintoma:** o agente silencia um erro do linter/checker com `# noqa` ou `# type: ignore` sem o código específico, escondendo o problema real em vez de corrigi-lo.
- **Correção:** proíba no `CLAUDE.md`/`AGENTS.md` supressões sem o código do erro (ex.: `# noqa: E501`); reforce com um guardrail determinístico (pre-commit ou hook `PostToolUse`), não só com instrução em prosa.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Projeto novo configurando Ruff | `extend-select` (soma aos defaults) |
| Migrando de Flake8/isort/Black reproduzindo o set exato anterior | `select` explícito |
| `B008` falso positivo em `Depends`/`Query`/`Header` | `extend-immutable-calls` (rápido) ou migrar para `Annotated` + `FAST002`, revisando o autofix |
| FastAPI async sem checagem de blocking calls | Ligar `ASYNC` (+ `S` para padrões tipo Bandit) |
| Formatter e import sorting num projeto com Ruff | `ruff format` + regra `I` |
| Hooks do Ruff no pre-commit | `ruff-check --fix` sempre antes de `ruff-format` |
| mypy sem ver as deps do projeto no hook | `additional_dependencies` com stubs, ou mypy só em CI/local |
| Import faltando, dep nunca usada, transitiva usada direto | `deptry .` (`DEP001`-`DEP004`) |
| Medir cobertura além de linhas executadas | `branch = true` + `fail_under` |
| Excluir `TYPE_CHECKING`/`@overload`/`...` da cobertura | `exclude_also`, somando às exclusões built-in |
| Confirmar que um endpoint async foi de fato exercitado | Teste real via `TestClient`/`httpx.AsyncClient` — importar não basta |
| Dead code dentro de um único arquivo | `F401`/`F841` + `ERA` |
| Dead code entre módulos num projeto FastAPI | Vulture/deadcode com `ignore_decorators` + whitelist, nunca sem `--dry-run` |
| Guardrail de estilo para código gerado por agente | Regra determinística no Ruff/pre-commit/hook — não prosa no `CLAUDE.md` |

## Referências externas

- Skill: `/design-patterns` — guardrails determinísticos (pre-commit, hook `PostToolUse`) em vez de convenção em prosa
- Skill: `/tdd-workflow` — branch coverage e cobertura real de código async como sinal de teste efetivo, não cosmético
- Atom irmão: `typing-and-static-analysis` — flags que `strict = true` liga no mypy (este atom cobre só a integração do mypy no pre-commit)
- Source path (audit trail): Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md
