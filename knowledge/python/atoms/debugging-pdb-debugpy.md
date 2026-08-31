---
topic: debugging-pdb-debugpy
stack: python
layer: both
sources:
  - Infos/knowledge/Python/python-debugpy/SKILL.md
tier: 3
triggers: [debug, debugging, pdb, breakpoint, PYTHONBREAKPOINT, debugpy, DAP, remote debug, attach, post-mortem, post_mortem, pytest --pdb, --trace, --showlocals, remote-pdb, set_trace, ptrace, deadlock, step, stack trace]
related_skills: [/tdd-workflow, /design-patterns]
updated: 2026-08-30
python_versions: ['>=3.11']
flagged_for_human_audit: true
---

# Debugging: pdb e debugpy

> **Audit humano obrigatório (D11):** este átomo será revisado por Luiz contra a fonte antes da aprovação do batch final.

## Quando consultar

- Ao ler um traceback que não explica por que um valor está errado
- Ao precisar percorrer uma função passo a passo e observar uma coleção sendo mutada
- Ao lidar com um processo de longa duração que está se comportando mal e não pode ser reiniciado do zero
- Ao fazer post-mortem de uma exceção já disparada, para inspecionar as variáveis locais no ponto da falha
- Ao suspeitar que o bug real está dentro de um subprocesso/processo filho
- Ao decidir entre debugar localmente (`breakpoint()` / `python -m pdb`) ou remotamente (`debugpy` / `remote-pdb`)
- Antes de abrir um debugger: se `print()`/`logging.debug` resolve em menos de um minuto, ou se `pytest -vv --tb=long --showlocals` já revela o problema, comece por aí

## Padrões sênior

### Pattern: Escolha da ferramenta certa — `breakpoint()`/pdb, `python -m pdb` ou `debugpy`

- **Problema:** sem critério, é fácil montar debug remoto pra um caso que só precisava de um `breakpoint()` local, ou perder tempo tentando debugar localmente um processo que já está rodando e não pode ser reiniciado.
- **Padrão:** três ferramentas, uma por situação — `breakpoint()` + pdb: local, interativo, o mais simples (adicione `breakpoint()` no código-fonte, rode normalmente, cai num REPL naquela linha); `python -m pdb`: lança um script existente sob pdb sem editar o código-fonte, bom para investigação rápida; `debugpy`: remoto/headless/"anexar a um processo já em execução" — fala DAP, scriptável a partir do terminal, funciona para processos de longa duração (daemons, processos filhos via PTY). Comece por `breakpoint()` — é a opção mais barata que já resolve.
- **Quando usar:** comece sempre por `breakpoint()`; troque para `python -m pdb` quando não quiser tocar no código-fonte; troque para `debugpy` quando o processo é remoto, headless, ou já está rodando e não pode ser reiniciado.
- **Quando NÃO usar nenhum debugger:** quando `print()`/`logging.debug` resolve em menos de um minuto, ou quando `pytest -vv --tb=long --showlocals` já revela o problema.

### Pattern: Comandos essenciais do prompt `(Pdb)`

- **Problema:** sem conhecer o vocabulário do pdb, é fácil ficar preso reiniciando o programa toda vez que se quer inspecionar algo diferente.
- **Padrão:** dentro de qualquer prompt `(Pdb)`, um conjunto pequeno de comandos cobre a maior parte dos casos:

| Comando | Ação |
|---|---|
| `h` / `h cmd` | ajuda |
| `n` | próxima linha (step over) |
| `s` | step into |
| `r` | retorna da função atual |
| `c` | continua |
| `unt N` | continua até a linha N |
| `j N` | pula para a linha N (mesma função) |
| `l` / `ll` | lista o código ao redor da linha atual / a função inteira |
| `w` | pilha de chamadas (where) |
| `u` / `d` | sobe / desce na pilha |
| `a` | imprime os args da função atual |
| `p expr` / `pp expr` | imprime / pretty-print de uma expressão |
| `display expr` | reimprime a expressão a cada parada |
| `b file:line` | define breakpoint |
| `b func` | breakpoint na entrada da função |
| `b file:line, cond` | breakpoint condicional |
| `cl N` | remove o breakpoint N |
| `tbreak file:line` | breakpoint de disparo único |
| `!stmt` | executa Python arbitrário, inclusive atribuições |
| `interact` | REPL Python completo no escopo atual (Ctrl+D para sair) |
| `q` | sai |

`interact` é o comando mais poderoso — dá pra importar qualquer coisa, inspecionar objetos complexos, até chamar métodos que mutam estado. Por padrão os locals são só-leitura; use `!x = 42` a partir do próprio prompt `(Pdb)` para mutar.

- **Quando usar:** `p`/`pp` para uma expressão pontual (ex.: `KeyError` num dict — `breakpoint()` antes da linha, depois `pp d`, `pp list(d.keys())` e `w` pra ver como chegou ali); `display` pra não repetir o mesmo `p` a cada parada; `n`/`s` pra navegar linha a linha; `w`/`u`/`d` pra navegar a pilha.
- **Quando NÃO usar `interact` para tudo:** para uma expressão única, `p`/`pp` já bastam — reserve `interact` para múltiplas instruções, imports, ou mutar estado com `!x = 42`.

### Pattern: `breakpoint()` local, `python -m pdb` sem editar, e controle via `PYTHONBREAKPOINT`

- **Problema:** `breakpoint()` é a via mais rápida pra debugar localmente, mas exige editar (e depois limpar) o código-fonte; às vezes você só quer rodar um script já existente sob pdb sem tocar nele.
- **Padrão:** `breakpoint()` no meio do código pro caso comum (ex.: `result = some_helper(x); breakpoint(); return result + y`, cai no pdb naquela linha); `python -m pdb caminho/script.py arg1 arg2` pra lançar um script existente sob pdb, pousando na primeira linha, de onde dá pra setar breakpoint (`b arquivo:linha`) e continuar (`c`); a variável de ambiente `PYTHONBREAKPOINT` controla globalmente as chamadas `breakpoint()` (`PYTHONBREAKPOINT=0` desativa todas).
- **Quando usar `breakpoint()`:** você pode editar o arquivo e vai lembrar de tirar a linha antes do commit — use um grep de pré-commit como rede de segurança (ver Anti-padrões).
- **Quando usar `python -m pdb` em vez de `breakpoint()`:** quando não quer (ou não pode) editar o código-fonte, só quer investigar rapidamente um script já pronto.

### Pattern: Debug de um teste pytest (`--pdb` / `--trace` / `--showlocals`)

- **Problema:** um teste falha (ou lança uma exceção) e o traceback padrão não é suficiente pra entender por quê.
- **Padrão:** pytest aceita as mesmas flags de debug diretamente — `--pdb` cai no pdb na falha (ou em qualquer exceção levantada); `--trace` cai no pdb já no início do teste; `--showlocals` (combinado com `--tb=long`) mostra os locals no traceback sem precisar entrar no pdb.

```bash
source <repo>/.venv/bin/activate
python -m pytest tests/caminho/test_arquivo.py::test_nome --pdb       # cai no pdb na falha
python -m pytest tests/caminho/test_arquivo.py::test_nome --trace     # cai no pdb no início do teste
python -m pytest tests/caminho/test_arquivo.py --showlocals --tb=long # mostra locals sem pdb
```

- **Quando usar:** qualquer teste pytest cujo traceback sozinho não explica a causa; se o teste só falha rodando junto com outros (estado/ordem), `python -m pytest tests/ -x --pdb` para exatamente no primeiro teste que falhar, já com o estado acumulado pelos testes anteriores.
- **Quando NÃO usar sem ajustar:** sob um runner que executa em paralelo ou captura o output por subprocesso (ex.: pytest-xdist) — o prompt `(Pdb)` não aparece e o teste só trava; rode pytest direto, sem paralelismo, no arquivo/teste específico (ver Anti-padrões).

### Pattern: Post-mortem numa exceção que já aconteceu

- **Problema:** a exceção já aconteceu (ou só se manifesta esporadicamente) e não havia `breakpoint()` plantado antes da linha que falhou.
- **Padrão:** três formas de cair em post-mortem — capturar a exceção e chamar `pdb.post_mortem(sys.exc_info()[2])`; rodar o script inteiro sob `python -m pdb -c continue script.py` (ao crashar, o pdb assume no frame da exceção); ou registrar um hook global via `sys.excepthook` num REPL/notebook. Pra um crash dentro de um subprocesso/entrypoint, `PYTHONFAULTHANDLER=1 python -m pdb -c continue caminho/entrypoint.py` também pousa no frame da exceção com os locals completos.

```python
import pdb, sys
try:
    run_the_thing()
except Exception:
    pdb.post_mortem(sys.exc_info()[2])
```

- **Quando usar:** você precisa reproduzir um crash específico e quer os locals exatamente no ponto da falha, sem reexecutar tudo sob step-by-step manual.
- **Quando NÃO usar:** se já se sabe de antemão qual linha é suspeita, plantar um `breakpoint()` ali é mais direto do que instrumentar post-mortem.

### Pattern: `debugpy` remoto — setup e modos de conexão

- **Problema:** pra debug remoto/headless ainda falta decidir como o processo alvo fica disponível pra um cliente DAP — editar o código-fonte, lançar por fora, ou anexar a algo que já está rodando.
- **Padrão:** depois de instalar (`pip install debugpy` dentro do venv do projeto), três modos — (A) editar o código-fonte pra chamar `debugpy.listen(...)` + `debugpy.wait_for_client()`, o processo já nasce esperando o cliente; (B) sem editar nada, lançar com `python -m debugpy --listen host:porta --wait-for-client script.py` (ou `-m modulo`); (C) anexar a um processo já em execução com `python -m debugpy --listen host:porta --pid <pid>` — exige o PID e o debugpy pré-instalado no ambiente do alvo. Depois de instalar, confirme com `python -c "import debugpy; print(debugpy.__version__)"`; e, se for o caso, confirme que a porta está de fato ouvindo (Linux) com `ss -tlnp | grep <porta>`.

```python
# Modo A — o processo espera o cliente
import debugpy
debugpy.listen(("127.0.0.1", 5678))
debugpy.wait_for_client()
debugpy.breakpoint()       # opcional: pausa assim que o cliente conectar
```

```bash
# Modo B — sem editar o código-fonte
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client seu_script.py arg1

# Modo C — anexar a um processo já rodando
python -m debugpy --listen 127.0.0.1:5678 --pid <pid>
```

- **Quando usar cada modo:** (A) quando dá pra editar o código-fonte e o processo deve esperar sozinho por um cliente; (B) quando não quer tocar no código-fonte, só lançar já sob debugpy; (C) quando o processo já está rodando e não pode ser reiniciado.
- **Quando NÃO usar (C) sem checar antes:** em kernels/configurações de segurança endurecidas (Linux), a injeção baseada em ptrace usada pelo attach por PID é bloqueada (`/proc/sys/kernel/yama/ptrace_scope`); corrija com `echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope` (precisa root) ou lance o processo já sob `debugpy` desde o início (modo B) em vez de anexar depois.

### Pattern: `debugpy` (DAP/editor) vs `remote-pdb` (terminal) pra debug remoto interativo

- **Problema:** `debugpy` fala DAP (Debug Adapter Protocol) — ótimo pra anexar de um editor, mas pesado só pra um prompt de terminal; escrever um cliente DAP manual (socket + framing `Content-Length` + JSON) é possível mas verboso pra uma sessão pontual.
- **Padrão:** pra anexar de um editor (VS Code, Cursor, Zed) com suporte a DAP, use `debugpy` com uma configuração `attach` no `launch.json` apontando `host`/`port` e mapeando o caminho local pro caminho remoto via `pathMappings`; pra debug interativo simples via terminal, use `remote-pdb` — `set_trace(host, port)` no código e `nc host porta` no terminal cai num prompt `(Pdb)` igual ao debug local.

```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)   # bloqueia até alguém conectar
```

```bash
nc 127.0.0.1 4444
# Cai num prompt (Pdb) igual ao debug local
```

- **Quando usar:** anexar de um editor com DAP → `debugpy`; debug interativo via terminal, sem IDE, → `remote-pdb` (ex.: handler que trava/deadlock — `set_trace` na entrada, `nc host porta`, depois `w` pra ver o frame suspenso e `!import asyncio; asyncio.all_tasks()` pra listar o que mais está pendente).
- **Quando NÃO usar `debugpy` (preferir `remote-pdb`):** quando o objetivo é só cair num prompt `(Pdb)` a partir do terminal — a fonte trata `remote-pdb` como a escolha mais limpa quando o protocolo DAP do `debugpy` é overhead desnecessário, reservando `debugpy` pra quando a integração com IDE é realmente necessária.

### Pattern: Limitações do pdb com threads e asyncio

- **Problema:** `pdb` só debuga a thread corrente — num processo multithread, as outras threads seguem rodando enquanto uma está parada no prompt; em asyncio, dar `await` dentro do próprio prompt `(Pdb)` não funciona nas versões mais antigas do Python.
- **Padrão:** pra multithread, use `debugpy` (DAP, thread-aware) ou registre `threading.settrace()` por thread; pra `await` dentro do pdb, Python 3.13+ suporta diretamente — em 3.11/3.12, use o modo `interact` ou contorne com truques como `asyncio.run_coroutine_threadsafe` ou `await`s baseados em `!stmt` via `asyncio.ensure_future`.
- **Quando usar:** multithread → `debugpy`/`threading.settrace()`; asyncio em 3.11/3.12 → `interact` ou os truques citados; em 3.13+, `await` direto no `(Pdb)` já funciona.
- **Quando NÃO usar:** não conte com um `breakpoint()`/pdb comum pra pausar todas as threads ao mesmo tempo — ele só enxerga a thread que o executou; não espere `await` funcionar direto no prompt `(Pdb)` padrão em 3.11/3.12 sem um dos contornos citados.

## Anti-padrões

### `breakpoint()` esquecido no código-fonte

- **Sintoma:** `breakpoint()` commitado sem querer; em CI ou qualquer contexto sem TTY, o processo trava esperando input no ponto da chamada.
- **Correção:** nunca commitar `breakpoint()`; usar um grep de pré-commit como rede de segurança (`rg -n 'breakpoint\(\)' --type py`). Depois de uma sessão de debug remoto, rodar o grep mais amplo `rg -n 'breakpoint\(\)|set_trace\(|debugpy\.listen' --type py` pra pegar também `set_trace()` e `debugpy.listen()` esquecidos.

### `PYTHONBREAKPOINT=0` silenciando os breakpoints

- **Sintoma:** `breakpoint()` não pausa a execução em lugar nenhum, sem erro nem aviso.
- **Correção:** checar a variável de ambiente (`echo $PYTHONBREAKPOINT`) — o valor `0` desativa todas as chamadas `breakpoint()` do processo.

### `debugpy.listen()` sem `wait_for_client()`

- **Sintoma:** o processo não espera o cliente conectar — a execução continua e o primeiro breakpoint pode disparar antes de qualquer client estar anexado.
- **Correção:** `debugpy.listen(...)` só bloqueia se for seguido de uma chamada explícita a `debugpy.wait_for_client()`.

### pdb sob um runner de testes paralelo ou que captura output

- **Sintoma:** o prompt `(Pdb)` nunca aparece — o teste simplesmente trava (comportamento conhecido de pytest-xdist e de qualquer execução que capture o output de subprocessos por arquivo).
- **Correção:** pra debug interativo, rodar pytest direto num único arquivo/teste, sem paralelismo (`python -m pytest tests/arquivo_test.py::test_nome --pdb`).

### Forking/multiprocessing sem debug por processo

- **Sintoma:** `pdb` não segue forks — um processo filho criado por fork/multiprocessing roda sem debug mesmo com um `breakpoint()` ativo no processo pai.
- **Correção:** cada processo filho precisa do próprio `breakpoint()`/`set_trace()`; ao investigar múltiplos processos, debugar um de cada vez.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Debug local, pode editar o código-fonte | `breakpoint()` + pdb |
| Debug local, script existente, sem editar | `python -m pdb script.py` |
| Processo remoto/headless ou já em execução | `debugpy` ou `remote-pdb` |
| Anexar de um editor (VS Code/Cursor/Zed) com DAP | `debugpy` + `launch.json` (`request: attach`) |
| Debug remoto só via terminal, sem IDE | `remote-pdb` (`set_trace` + `nc host porta`) |
| Teste pytest falha e o traceback não explica por quê | `pytest --pdb` (para na falha) ou `--trace` (para no início) |
| Ver locals no traceback sem entrar em pdb | `pytest --showlocals --tb=long` |
| Teste só falha rodando junto com outros | `python -m pytest tests/ -x --pdb` |
| Exceção já ocorreu, quer o estado no momento da falha | Post-mortem (`pdb.post_mortem`, `-m pdb -c continue`, ou hook em `sys.excepthook`) |
| `breakpoint()` não está sendo acionado | Checar `PYTHONBREAKPOINT` — `0` desativa tudo |
| Multithread precisa pausar todas as threads | `debugpy` (thread-aware) — pdb comum só vê a thread atual |
| `await` dentro do pdb em código asyncio | 3.13+ funciona direto; em 3.11/3.12 use `interact` ou os truques citados |
| Anexar por PID falha em kernel endurecido (Linux) | corrigir `ptrace_scope` (precisa root) ou lançar já sob `debugpy` desde o início |

## Referências externas

- Skill: `/tdd-workflow` — ciclo vermelho-verde-refactor; pdb/debugpy entram quando o teste falha e o traceback sozinho não explica o valor errado
- Skill: `/design-patterns` — debug interativo (post-mortem, `interact`) como técnica complementar, não um padrão de design em si
- Source path (audit trail): Infos/knowledge/Python/python-debugpy/SKILL.md
