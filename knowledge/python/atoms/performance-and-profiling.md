---
topic: performance-and-profiling
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report (1).md
tier: 2
triggers: [performance, profiling, py-spy, cProfile, perf_jit, tracemalloc, memray, importtime, gc.freeze, COW, serialização, orjson, streaming, compressão, sizing, benchmark, cache stampede, stale-while-revalidate, PERF, orçamento de latência]
related_skills: [/system-design, /infrastructure]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Performance e Profiling

## Quando consultar

- Ao investigar `p95`/`p99` alto, queda de throughput ou CPU alta antes de tocar em código
- Ao decidir se um "vazamento de memória" é RSS crescente real ou um cache sem limite
- Ao medir se uma otimização realmente funcionou, separando benchmark de profiling
- Ao dimensionar workers, connection pool ou escopo de cache diante de múltiplos processos
- Ao decidir entre streaming, compressão e serialização de resposta JSON
- Ao proteger uma chave de cache popular contra stampede no miss
- Ao investigar cold start/import time, ou decidir se vale tunar o GC

## Padrões sênior

### Pattern: PERF-PROFILE-01 — Localizar a classe do gargalo antes de otimizar código

- **Problema:** otimizar implementação (reescrever uma comprehension, trocar uma estrutura) antes de saber se o tempo está em CPU, espera de downstream, alocação ou multiplicação de queries — nenhuma dessas trocas ajuda um endpoint que está esperando banco.
- **Padrão:** siga a ordem rota/trace → downstream → CPU → alocações → query count; só edite implementação depois de identificar qual componente explica parte relevante do tempo ou do crescimento de memória; encadeie `cProfile` (tempo interno e cumulativo) com o instrumentador OpenTelemetry para FastAPI (spans por request) — são visões complementares, não alternativas.
- **Quando usar:** qualquer investigação de `p95`/`p99`, timeout de downstream ou CPU alta, antes de tocar em implementação.
- **Quando NÃO usar:** num microserviço CPU-puro com reprodução determinística pode ser aceitável iniciar direto com o profiler — mesmo assim, compare antes/depois com um benchmark separado do profiler.

### Pattern: PERF-PROFILE-02 + PERF-PROFILE-03 — Escolher o profiler pelo contexto: tráfego real, reprodução ou request específico

- **Problema:** anexar um profiler pesado a 100% do tráfego indefinidamente, ou tratar os números de qualquer profiler como se fossem benchmark.
- **Padrão:** para uma primeira captura em processo real, use um sampling profiler como `py-spy` — executa fora do processo alvo, anexa por PID e produz `top`/dumps/flamegraphs sem instrumentar o código; para atribuição determinística de chamadas, use `cProfile` numa reprodução local; para associar stacks a um request específico, ligue profiling request-scoped (ex.: Pyinstrument, que trata stacks async) só nesse fluxo, ajustando o intervalo de sampling — intervalos menores aumentam overhead e volume de dados.
- **Quando usar:** `py-spy` para regressão global de CPU em produção; `cProfile` para reprodução controlada; profiling request-scoped para uma única request complicada e reproduzível.
- **Quando NÃO usar:** sampling entrega estimativas — funções muito curtas ou raras podem não aparecer com precisão suficiente; deterministic profiling alcança granularidade maior mas distorce mais a execução; em código async, wall-clock entre amostras pode incluir espera de I/O, não CPU real.

### Pattern: PERF-HOTPATH-01 — Otimizar somente o que aparece repetido no perfil

- **Problema:** trocar sintaxe Python ("comprehensions são mais rápidas") sem o loop ter aparecido em nenhum perfil.
- **Padrão:** considere uma função candidata a otimização quando ela concentra tempo interno relevante, aparece como antecessora de grande tempo cumulativo, ou está num caminho multiplicado pela cardinalidade do request — use as ordenações por `tottime`/`cumtime` do profiler para achar essas funções.
- **Quando usar:** função no topo do flamegraph, chamada milhões de vezes, proposta de micro-otimização.
- **Quando NÃO usar:** a regra muda quando a evidência é outra — cauda extrema (p99), pico de memória ou o custo de uma operação rara mas crítica também justificam otimizar fora do maior hot path médio.

### Pattern: PERF-BENCH-01 — Separar profiling de benchmarking, com warm-up e GC explícitos

- **Problema:** afirmar "X ficou 15% mais rápido" com uma única execução de `time.perf_counter`, ou confiar no wall-clock medido dentro do próprio profiler.
- **Padrão:** rode um benchmark independente do profiler, com múltiplos processos/runs e warm-up; use `pyperf` quando a decisão depender de poucos pontos percentuais — calibra loops, cria processos independentes, descarta warm-up e oferece `system tune`, `check`, histogramas e dump dos valores para diagnosticar ruído (ASLR, hash randomization, scheduler, frequência de CPU).
- **Quando usar:** qualquer mudança que será vendida como ganho de performance, ou comparação entre versões/JIT.
- **Quando NÃO usar sem ressalva:** `timeit` serve para perguntas locais simples, mas desliga o GC por padrão — a própria documentação alerta que isso pode esconder custo legítimo quando GC faz parte do workload real; o JIT de Python 3.13 é experimental, desabilitado por padrão, com ganhos ainda descritos pelo projeto como modestos — não assuma um warm-up de JIT estilo JVM.

### Pattern: PERF-MEM-01 — Provar retenção de memória comparando snapshots

- **Problema:** declarar "vazamento de memória" só porque o RSS do processo subiu, sem isolar a alocação Python responsável.
- **Padrão:** inicie `tracemalloc` antes do workload suspeito, tire um snapshot de baseline, repita o fluxo e use `Snapshot.compare_to()` para localizar linhas cujas alocações sobrevivem — `tracemalloc` só observa alocações ocorridas depois de o tracing começar; guardar mais frames (`tracemalloc.start(NFRAME)`) aumenta memória/CPU do próprio tracing, então comece com profundidade pequena.
- **Quando usar:** RSS crescente, OOMKill, worker que "engorda", heap suspeito.
- **Quando NÃO usar tracemalloc sozinho:** RSS é memória residente do processo e `tracemalloc` rastreia alocações Python — grandezas diferentes; quando o RSS continua crescendo mas os snapshots não explicam, use Memray, que rastreia alocações Python e nativas (C/C++/Rust) com flamegraphs.

### Pattern: PERF-MEM-02 — Nunca usar cache sem limite em keyspace controlado por request

- **Problema:** usar `@cache`/`lru_cache(maxsize=None)` com `user_id`, `tenant_id`, token ou outro input arbitrário de request como chave, num processo long-lived — cada chave nova retém argumento e resultado até evicção ou clear.
- **Padrão:** use cache ilimitado só quando o conjunto de chaves for comprovadamente pequeno/finito; para dados indexados por input arbitrário, imponha limite/expiração numa camada adequada.
- **Quando usar:** `lru_cache(maxsize=1)` para settings — padrão documentado inclusive pelo FastAPI, onde a chave efetiva é estável e a intenção é evitar recarregar configuração a cada request.
- **Quando NÃO usar:** `lru_cache` não tem TTL — resolve limite por quantidade/recência, não freshness temporal; a própria documentação não recomenda `lru_cache` para funções assíncronas, com side effects, ou que precisam retornar um objeto novo a cada chamada.

### Pattern: PERF-MEM-03 — Dar lifetime de aplicação a pools/clientes reutilizáveis

- **Problema:** criar `httpx.AsyncClient()` dentro de um endpoint/hot loop a cada request — HTTPX alerta que múltiplas instâncias dentro de loops impedem o melhor aproveitamento do connection pooling.
- **Padrão:** instancie clientes HTTP compartilháveis uma vez por lifecycle de aplicação e feche-os no shutdown, usando o `lifespan` do FastAPI para adquirir recursos antes de servir requests e liberá-los depois de parar — os handlers separados `startup`/`shutdown` aparecem na documentação atual como alternativa depreciada.
- **Quando usar:** qualquer pool/cliente reutilizável com `.close()`/`.aclose()` cujo lifetime deve acompanhar o processo.
- **Quando NÃO usar singleton único:** clientes com credenciais, proxies ou políticas totalmente diferentes podem exigir escopos distintos — o princípio é alinhar o lifetime do pool ao lifetime em que ele pode ser reutilizado, não tornar todo recurso um singleton.

### Pattern: PERF-BOOT-01 — Medir import time separado de startup/lifespan

- **Problema:** culpar o FastAPI por cold start alto sem medir separadamente quanto do tempo é import e quanto é inicialização de recursos no `lifespan`.
- **Padrão:** rode `python -X importtime` contra o módulo real da aplicação e trate os maiores tempos self/cumulative antes de culpar o framework; meça separadamente os recursos inicializados pelo `lifespan`.
- **Quando usar:** cold start alto, container demora a ficar ready, Lambda/serverless-like, import de SDK/ML pesado.
- **Quando NÃO usar carregamento no topo do módulo:** carregar um modelo caro direto no topo do módulo faz até testes que só importam o código pagarem o custo; mover para `lifespan` torna a aquisição/liberação explícita, mas não elimina o custo antes do readiness — só tira do import genérico e estabelece ownership correto.

### Pattern: PERF-GC-01 + PERF-GC-02 — Não tunar o GC sem evidência; gc.freeze() só em pre-fork real

- **Problema:** `gc.disable()`/`gc.set_threshold()` aplicado por reflexo ("GC é lento"), ou `gc.freeze()` + preload aplicado a `uvicorn --workers` esperando memória compartilhada via copy-on-write.
- **Padrão:** mantenha o comportamento padrão do GC até observar coletas e correlacioná-las com o workload, usando `gc.callbacks`/profiling como evidência antes de alterar thresholds; `gc.freeze()` é otimização documentada especificamente para evitar alterar páginas de memória de objetos antigos em cenários `fork()`/copy-on-write, aplicada antes do fork.
- **Quando usar gc.freeze():** só numa arquitetura pre-fork deliberada (ex.: Gunicorn) — verifique o process manager concreto antes de aplicar.
- **Quando NÃO usar:** nos workers internos do Uvicorn — o process manager built-in usa `spawn`, não pre-fork, então `gc.freeze()` não produz o COW esperado (o módulo `uvicorn.workers` para Gunicorn também está depreciado, em favor do pacote `uvicorn-worker`); e não existe threshold universal documentado para workload FastAPI, então tunar sem medição não tem base.

### Pattern: PERF-JSON-01 — Deixar o response model/Pydantic serializar o JSON tipado

- **Problema:** forçar `response_class=JSONResponse`/`ORJSONResponse`/`UJSONResponse` numa rota cuja resposta já é representável por Pydantic — os dados passam pelo `jsonable_encoder` e depois pela serialização da própria response class, em vez do caminho direto.
- **Padrão:** declare o tipo de retorno ou `response_model` e não force uma `response_class` JSON — desde a versão 0.130.0 (22 fev. 2026), quando há tipo/response model Pydantic o FastAPI pode serializar pela implementação Rust do Pydantic; a documentação atual chama essa combinação de opção de "maximum performance".
- **Quando usar:** qualquer rota JSON quente cuja resposta é representável por Pydantic.
- **Quando NÃO usar:** retornar um `Response` diretamente continua correto quando o código já possui bytes serializados e quer pular conversão/validação conscientemente — o FastAPI não converte os dados automaticamente e pode deixar de inferir OpenAPI se não for declarado à parte; `ORJSONResponse`/`UJSONResponse` foram depreciadas na 0.131.0, no mesmo dia — não as introduza em código novo só por performance.

### Pattern: PERF-STREAM-01 — Streaming quando o problema é buffering do payload, não ritual

- **Problema:** montar o corpo inteiro (`b"".join(...)`) e só então embrulhar num `StreamingResponse` — o corpo já foi materializado, chamar a response de "streaming" não recupera a memória consumida.
- **Padrão:** use `StreamingResponse` quando o corpo pode ser produzido incrementalmente e materializar tudo antes criaria pico de memória ou atrasaria o primeiro chunk — o ganho só existe quando a origem dos dados e a response permanecem incrementais.
- **Quando usar:** arquivos grandes, exportações, SSE/JSONL, resposta produzida progressivamente com pico de heap proporcional ao payload.
- **Quando NÃO usar:** para JSONs pequenos, streaming aumenta complexidade sem necessariamente ajudar; para SSE, respeite a semântica específica do protocolo — a série 0.140.x do FastAPI recebeu correções recentes de streaming, incluindo `status_code` ignorado em SSE/JSONL corrigido na 0.140.13.

### Pattern: PERF-COMPRESS-01 — Tratar compressão como troca explícita de CPU por bytes

- **Problema:** usar `compresslevel` máximo e `minimum_size` mínimo como default arquitetural, sem medir CPU, payload nem latência.
- **Padrão:** ajuste `minimum_size` e `compresslevel` do `GZipMiddleware` com dados do payload real — níveis menores são mais rápidos e comprimem menos, níveis maiores consomem mais CPU para produzir respostas menores.
- **Quando usar:** payload JSON/texto grande, CPU alta na resposta, egress alto.
- **Quando NÃO usar sem medir:** comprimir payloads pequenos pode gastar CPU sem reduzir bytes suficientes para compensar; em streaming, a implementação do `GZipMiddleware` pode bufferizar chunks para comprimir adequadamente, alterando a latência do primeiro dado; se um CDN/reverse proxy já comprime, duplicar o trabalho na aplicação pode não ser desejável.

### Pattern: PERF-SERVER-01 + PERF-SERVER-02 — Dimensionar servidor por medição, não por fórmula

- **Problema:** aplicar "workers = 2 × CPU + 1" como lei universal sem medir memória/downstream/pool, ou culpar o código FastAPI por overhead de servidor sem antes confirmar qual event loop/parser HTTP o ambiente realmente usa.
- **Padrão:** trate o número de workers como candidato a benchmarkar (1, 2, 4...) sob a mesma carga e limite de memória da produção, não como fórmula; confirme que a instalação usa `uvicorn[standard]` — que instala `uvloop`/`httptools` quando suportado — antes de comparar contra benchmarks feitos com essas otimizações.
- **Quando usar:** throughput baixo com múltiplos cores disponíveis, ou divergência entre benchmark local e produção.
- **Quando NÃO usar sem contexto de deploy:** em Kubernetes normalmente é preferível um processo Uvicorn por container com replicação pela plataforma; numa VM simples, vários workers no mesmo process manager podem ser a opção direta — recomendações não contraditórias, o contexto de deploy muda; o Uvicorn built-in usa `spawn`, não pre-fork, para seus workers.

### Pattern: PERF-CACHE-01 — Escolher o escopo do cache pela topologia de processos

- **Problema:** assumir que um `lru_cache` com `maxsize` grande compartilha hits/invalidação entre workers Uvicorn — memória process-local não é mecanismo de coerência distribuída.
- **Padrão:** use `lru_cache`/memória local para estado que pode legitimamente existir de forma independente em cada processo (ex.: settings imutáveis); se todos os workers/réplicas precisam compartilhar hits, invalidação ou capacidade, coloque essa cache num serviço compartilhado, como Redis.
- **Quando usar local:** `lru_cache(maxsize=1)` para settings — cada processo pode ter sua própria cópia sem problema.
- **Quando NÃO usar local:** dados que precisam de coerência entre workers — a consequência de usar cache local nesse caso é multiplicação de RAM e potencial divergência de freshness entre workers; um cache local ainda pode servir deliberadamente como L1 na frente de um cache distribuído, se stale data e invalidação independente forem toleráveis.

### Pattern: PERF-CACHE-02 + PERF-CACHE-04 — HTTP caching/CDN e invalidação por semântica, não TTL cego

- **Problema:** reconstruir na aplicação uma cache de respostas públicas que o protocolo HTTP já resolve, ou colocar um TTL arbitrário em tudo sem definir antes qual staleness é aceitável.
- **Padrão:** para representações públicas reutilizáveis, expresse freshness com `Cache-Control` e uma cache key correta — `s-maxage` para shared caches, `Vary` sempre que um header de request altera a representação; defina o máximo de staleness aceitável antes de escolher o TTL, e invalide representações relacionadas quando uma operação insegura (`POST`/`PUT`) modifica o recurso, em vez de esperar o TTL expirar sozinho.
- **Quando usar:** `GET` público, resposta idempotente/cacheável, CDN/reverse proxy.
- **Quando NÃO usar public sem revisar:** respostas associadas a `Authorization`, dados personalizados ou muito voláteis exigem diretiva explícita antes de um shared cache poder reutilizá-las — um shared cache não deve reutilizar arbitrariamente respostas autenticadas.

### Pattern: PERF-CACHE-03 — Proteger cache miss popular contra stampede

- **Problema:** o TTL de uma chave muito quente expira e centenas de requests simultâneos recebem miss, todos executando a mesma query/HTTP/computação cara ao mesmo tempo.
- **Padrão:** em resposta HTTP/CDN, prefira `stale-while-revalidate` quando a semântica tolerar stale temporário; em cache distribuída da aplicação, serialize a recomputação por chave com lease/expiração (ex.: `SET cache-lock:{key} <token> NX PX 30000`), deixando que só o vencedor reconstrua a entrada — a liberação precisa confirmar o token do dono, já que um `DEL` indiscriminado pode apagar um lock já reassumido por outro cliente (Redis 8.4 adiciona `DELEX ... IFEQ` para isso; versões anteriores podem usar script Lua equivalente).
- **Quando usar:** chave muito quente, pico periódico de backend, cache regenerada por operação cara.
- **Quando NÃO usar:** `stale-while-revalidate` muda a semântica de freshness e não cabe a saldo financeiro, autorização ou resposta que não tolere stale; locks distribuídos adicionam latência/failure modes — use-os só quando o custo do stampede justificar o mecanismo.

### Pattern: PERF-DB-01 + PERF-DB-02 — Medir e orçar banco antes de mudar ORM ou pool

- **Problema:** perceber N+1 só quando o número de queries já cresce com o número de entidades retornadas, ou só notar o estouro de conexões quando o banco já rejeita novas — em ambos os casos, sem ter medido antes de mudar código.
- **Padrão:** monitore contagem de queries por request e uso/timeout de checkout do pool como sinais antes de tunar; para o orçamento de conexões, calcule `(pool_size + max_overflow) × workers` contra o `max_connections` do banco — `pool_size=5`/`max_overflow=10` são defaults de biblioteca (`QueuePool`/`AsyncAdaptedQueuePool`), não sizing recomendado para todo sistema; a correção de N+1 (`selectinload`/`raiseload`) e o dimensionamento fino do pool ficam detalhados no átomo `sqlalchemy-async-and-orm`.
- **Quando usar:** todo repositório com SQLAlchemy, antes de bater em `QueuePool timeout` ou perceber queries N+1 em produção.
- **Quando NÃO usar como diagnóstico único:** `pool_pre_ping=True` evita entregar conexão morta com overhead pequeno, mas não recupera uma conexão que cai no meio de uma transação — não é substituto de um orçamento correto de conexões.

### Pattern: PERF-DB-03 — Preservar prepared-statement caching; batch em vez de linha a linha

- **Problema:** desativar `prepared_statement_cache_size` do dialect `asyncpg` por reflexo, ou fazer `session.add()` + `flush()` por item dentro de um loop de import/seed volumoso.
- **Padrão:** preserve o cache de prepared statements padrão — asyncpg mantém um cache por conexão com tamanho padrão 100 — salvo problema comprovado de compatibilidade ou invalidation; para inserções em massa, use um statement único (`insert()`/`update()` com lista de dicts) em vez do fluxo ORM linha a linha — técnica detalhada no átomo `sqlalchemy-async-and-orm`.
- **Quando usar:** dialect `postgresql+asyncpg`; DML em massa (import, seed, milhares de eventos).
- **Quando NÃO usar sem medir:** alterações DDL podem tornar entradas do cache stale e a invalidação local não coordena todos os processos; bulk APIs podem não reproduzir toda a semântica/eventos de uma sequência de operações ORM objeto a objeto.

### Pattern: PERF-OBS-01 — Instrumentar latência sem labels de alta cardinalidade

- **Problema:** usar `user_id`, e-mail ou URL concreta (`/users/123`) como label de métrica — cada combinação única cria uma série temporal nova, e Prometheus proíbe na prática dimensões ilimitadas como label.
- **Padrão:** instrumente FastAPI com OpenTelemetry (ou equivalente) e mantenha atributos/labels agregáveis por rota/operação (`/users/{user_id}`), nunca por identificador ilimitado; exclua health/readiness da instrumentação (`excluded_urls`) quando só geram ruído.
- **Quando usar:** qualquer diagnóstico de `p95`/`p99` via APM/Prometheus, ou setup de instrumentação nova.
- **Quando NÃO usar exclusão total:** identificadores individuais podem pertencer a logs/traces sob política apropriada — só não devem virar dimensão de série Prometheus.

## Anti-padrões

### PERF-MEM-01 — RSS que nunca volta não é vazamento Python por si só

- **Sintoma:** RSS sobe de 400 MB para 700 MB e a conclusão é "vazamento na função X", sem heap diff e sem rastrear alocação nativa.
- **Correção:** compare snapshots com `Snapshot.compare_to()`; se os snapshots Python não explicam o crescimento, use Memray, que também rastreia alocações nativas (C/C++/Rust).

### PERF-MEM-02 — `@cache`/`lru_cache` não esperam o GC coletar

- **Sintoma:** assumir que o GC eventualmente remove entradas de `@cache` — `@cache` é explicitamente ilimitado e `lru_cache` mantém referências a argumentos e resultados até evicção ou `.clear()`.
- **Correção:** trate cache ilimitado como retenção deliberada; para keyspace controlado por request, imponha `maxsize` ou expiração numa camada adequada.

### PERF-SERVER-01 — Mais workers não é sinônimo de mais throughput

- **Sintoma:** aumentar `--workers` esperando ganho linear, sem checar memória, downstream ou limite do container — workers são processos separados que replicam estado process-local.
- **Correção:** valide o número de workers sob a mesma carga e limite de memória de produção; em Kubernetes, considere um processo por container e deixe a replicação para a plataforma.

### PERF-GC-02 — `gc.freeze()` não cria memória compartilhada nos workers built-in do Uvicorn

- **Sintoma:** aplicar preload + `gc.freeze()` esperando copy-on-write com `uvicorn --workers` — a otimização é documentada para `fork()`, mas o process manager built-in do Uvicorn usa `spawn`.
- **Correção:** verifique o process manager concreto antes de aplicar qualquer técnica de COW; `gc.freeze()` só se aplica a uma arquitetura pre-fork deliberada (ex.: Gunicorn).

### PERF-JSON-01 — `ORJSONResponse` deixou de ser o caminho mais rápido

- **Sintoma:** declarar `response_class=ORJSONResponse`/`UJSONResponse` em código novo "para ser mais rápido".
- **Correção:** desde o FastAPI 0.130.0, uma rota com tipo/response model Pydantic já serializa pela implementação Rust do Pydantic; `ORJSONResponse` e `UJSONResponse` foram depreciadas na 0.131.0.

### PERF-BENCH-01 + PERF-GC-01 — Desligar o GC no microbenchmark não autoriza desligar em produção

- **Sintoma:** usar um ganho medido com GC desligado (`timeit` desliga por padrão) como justificativa para `gc.disable()` no servidor.
- **Correção:** reative o GC no benchmark quando ele for parte real da operação; mantenha o comportamento padrão do GC em produção até medir coletas correlacionadas ao workload real via `gc.callbacks`.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Qual função está consumindo CPU? | `py-spy` em produção (sampling); `cProfile` em reprodução controlada (deterministic) |
| Qual request concentra esse custo? | OpenTelemetry FastAPI + profiler request-scoped, nessa ordem |
| Onde a memória está crescendo? | `tracemalloc` — comparar snapshots, não só RSS |
| RSS cresce mas tracemalloc não explica? | Memray — inclui alocações nativas C/C++/Rust |
| Qual import torna cold start caro? | `python -X importtime` |
| A otimização realmente melhorou? | `pyperf` para decisão de poucos %; `timeit` só para microcaso local |
| Endpoint lento por banco/downstream? | OTel/APM + contagem de queries antes de reescrever Python |
| Tenho distribuição de latência em produção? | Histogramas Prometheus/APM — observar cauda, não só média |

## Referências externas

- Skill: `/system-design` — dimensionamento de workers, pool de conexões e escopo de cache diante de topologia de processos
- Skill: `/infrastructure` — deploy (Kubernetes vs VM), CDN/reverse proxy e sizing de servidor
- Átomo `sqlalchemy-async-and-orm` (mesma stack) — correção de N+1 (`selectinload`/`raiseload`) e dimensionamento fino do connection pool; aqui o foco é medição e orçamento, não a correção
- Source path (audit trail): `Infos/knowledge/Python/deep-research-report (1).md`
