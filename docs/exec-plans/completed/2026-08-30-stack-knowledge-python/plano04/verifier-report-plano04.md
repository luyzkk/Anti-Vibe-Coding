# Verifier Report — Plano 04 (Batch T3)

**Data:** 2026-08-31
**Protocolo:** refined (compound `2026-05-16-verifier-protocol-technical-sections-only`)
**Gate:** ≥80% (4/5 claims) por átomo

| Átomo | v1 | v2 | v3 | Veredito final |
|---|---|---|---|---|
| background-jobs-and-queues | 5/5 | — | — | **PASS** |
| debugging-pdb-debugpy | 5/5 | — | — | **PASS** |
| graphql-grpc-contracts | 5/5 | — | — | **PASS** |

**3/3 em 5/5. Zero falhas de conteúdo. Zero warns. G12 não disparou. Zero ciclos v2.**

---

## Resultado acumulado dos três batches

| | Plano 02 (5) | Plano 03 (9) | Plano 04 (3) | **Total (17)** |
|---|---|---|---|---|
| Átomos PASS | 5/5 | 9/9 | 3/3 | **17/17** |
| Falhas de conteúdo | 1 | 0 | 0 | **1** |
| Átomos com warn de tom | 4 (80%) | 2 (22%) | 0 (0%) | 6 |
| Ciclos v2 | 0 | 0 | 0 | **0** |

(O piloto do Plano 01 foi verificado à parte: 5/5 com 1 warn de tom. Total geral: 18 átomos.)

A cláusula de preservação de hedge entrou nos prompts a partir do Plano 03. A incidência de warn
de tom caiu de 80% para 22% e agora para 0%. Não é prova causal — são batches, fontes e temas
diferentes, e o Plano 04 tem só 3 átomos —, mas a direção é consistente em três medições.

---

## CA-10 — limpeza de contexto proprietário

O átomo `debugging-pdb-debugpy` vem de uma fonte MIT que mistura conteúdo genérico de pdb/debugpy
com contexto proprietário de um agente ("Hermes"). Gate de tolerância zero, verificado **três
vezes de forma independente**: pelo extrator, por mim, e pelo verifier.

- 9 strings proibidas → 0 matches em todas.
- Scan ampliado do verifier (`gateway`, `Ink`, `prod-ish`, `terminal agent`) → 0 matches.
- A seção "Debugging Hermes-specific Processes" inteira (L274-305 da fonte) foi omitida.

**Generalização honesta confirmada:** os recipes que citavam o runner proprietário foram
reescritos para o equivalente pytest puro — e o verifier confirmou que esse equivalente **está
literalmente na fonte** (L114), não foi inventado para preencher o buraco. O comando
`PYTHONFAULTHANDLER=1 python -m pdb -c continue` é idêntico ao da fonte (L371-372); só o nome do
framework proprietário virou "subprocesso/entrypoint".

O extrator descartou o **pitfall 8 inteiro** (credenciais stripadas, `HOME=<tmpdir>`) porque,
diferente do pitfall 1, a fonte **não mostrava** um equivalente genérico para o qual generalizá-lo.
Sem base, cortou em vez de inventar a versão genérica — a distinção certa.

**Plataforma:** a fonte declara `platforms: [linux, macos]`. O átomo não importa a restrição
(pdb funciona em Windows) mas também não inventa equivalentes: `ss -tlnp` e `ptrace_scope`
permanecem rotulados como Linux. O extrator listou explicitamente o que sabia e não escreveu.

---

## Lacuna declarada — `background-jobs-and-queues`

Este é o único dos 18 átomos cuja **principal contribuição é uma recusa.** A fonte registra
explicitamente que "qual fila é dominante/superior" não é demonstrável, e havia material
suficiente para um ranking plausível. O átomo não o produz.

A formulação ficou quase idêntica à da fonte:

> Átomo: "Sem vencedor demonstrável nas fontes — decida por modelo de execução e estado de
> manutenção; a única regra forte é não usar `BackgroundTasks` como substituto de fila durável"
>
> Fonte: "isso não demonstra que Celery é superior a Dramatiq, RQ, ARQ ou serviços de queue
> gerenciados para todo caso. A única regra forte aqui é não usar `BackgroundTasks` como
> substituto de durable/distributed jobs."

O verifier confirmou linha a linha que nenhum pattern, anti-padrão ou linha de tabela declara
vencedor.

**Brevidade endossada.** O átomo tem 84 linhas contra 137-199 dos irmãos, e isso é correto: o
piloto `async-and-concurrency` já é dono do ecossistema de filas (patterns completos de
BackgroundTasks, idempotência e scheduler, mais a tabela comparando TaskIQ/arq/Celery), porque a
fonte dele cobre as seções 4, 5, 14 e 15. O plano desenhou a fase-01 assumindo o contrário. O
extrator fez push-back, a verificação confirmou, e o dev decidiu nesta sessão aceitar como está —
mover texto já verificado introduziria risco de drift sem ganho de conteúdo. As 7 referências
cruzadas do átomo apontam corretamente para os irmãos, sem re-ensinar.

---

## RF16 — avaliação de tier do `graphql-grpc-contracts`

**Duas avaliações independentes convergiram em manter `tier: 3`**, por caminhos diferentes.

O extrator argumentou pela aplicabilidade condicional: GraphQL/gRPC só entram quando o time já
decidiu adotar um segundo protocolo, e a fonte trata REST como a opção de consenso.

O verifier formulou melhor o critério:

> "Densidade de conteúdo não é o critério de tier; alcance de uso é, e aqui o alcance é estreito
> por design."

E observou que nenhum gatilho de "Quando consultar" é genérico o bastante para aparecer no fluxo
default de um backend FastAPI novo — ao contrário do irmão T2 `api-design-and-contracts`, cujos
triggers (REST, versionamento, paginação, idempotência) cobrem qualquer endpoint.

Frontmatter mantido em `tier: 3`; INDEX consistente. Decisão final é do dev.

---

## Fronteira espelhada (G15) — `graphql-grpc-contracts`

No Plano 03 a regra era "GraphQL/gRPC/tRPC **não** entram no `api-design-and-contracts`". Aqui é o
inverso: só GraphQL/gRPC/tRPC, **nada** de REST genérico. Mesma fonte, fronteira espelhada.

Verificado por grep, com triagem dos 3 hits de termos REST — nenhum é conteúdo:
- "offsets" aparece como **contraste** dentro do pattern de paginação por cursor do GraphQL,
  espelhando a própria fonte ("sem amarrar o cliente a offsets físicos")
- "tRPC OpenAPI" é o nome do pacote `trpc-openapi`
- a terceira ocorrência é a linha de referência cruzada em Referências externas

---

## Pontos levantados para o audit humano (D11)

Os verifiers dos três átomos flagados registraram o que recomendam ao revisor. Consolidado:

### `security-fastapi-owasp` (verificado no Plano 02)
1. A linha da tabela que pareava CVE-2024-53981 com fix de regex **já foi corrigida** — era a
   única falha de conteúdo dos três batches. Vale reler a correção.
2. O átomo está em **200/200 linhas**. Não há margem para adição sem remoção.
3. O anti-padrão de deserialização inclui a mitigação de "class pollution", que a fonte lista em
   **Lacunas declaradas** — apresentada com a mesma força das regras de consenso, porque o formato
   do átomo não tem gradiente de confiança.

### `sqlalchemy-async-and-orm` (verificado no Plano 03)
1. `pool_pre_ping=True` "contra conexões mortas": na fonte o parâmetro aparece **só dentro de um
   bloco de código**, sem justificativa textual. Fato correto sobre SQLAlchemy, mas a explicação é
   síntese do extrator a partir do exemplo. É a fronteira mais fina do projeto: onde termina "ler
   o código-exemplo da fonte" e começa "adicionar conhecimento próprio"?
2. `StreamingResponse`: a fonte trata como mudança específica do FastAPI 0.118.0 e destaca em
   "Mudanças recentes"; o átomo diz apenas "desde a mudança de lifecycle". Não é errado, mas perde
   precisão que a fonte considerava relevante.
3. A atribuição do conflito de repository foi corrigida (o plano dizia "Bayer", a fonte diz
   tutorial do FastAPI). Vale confirmar a versão final.

### `debugging-pdb-debugpy` (verificado neste plano)
1. **195/200 linhas** — margem apertada. Se a revisão pedir acréscimo, algo sai antes.
2. A fonte tem **duas variantes** do fix de `ptrace_scope` (`echo 0 | sudo tee` no Recipe 5;
   `echo 0 > ...` no Pitfall 5). O átomo unificou na forma `sudo tee`. Correto e não-inventado,
   mas é escolha editorial que vale confirmar.
3. A fonte lista `(gateway, daemon, PTY children)` como processos longevos; o átomo removeu
   "gateway" por ser proprietário no contexto e manteve os outros dois. Corte deliberado — vale
   confirmar se a perda do terceiro exemplo enfraquece o "Quando consultar".
4. `python_versions: ['>=3.11']` é **inferência do autor do átomo**, não declaração da fonte (que
   não define piso, só discute 3.11/3.12 vs 3.13+). É a convenção da matrix, mas merece
   confirmação de que é a política pretendida.
5. `related_skills` usa os slugs internos do projeto, não os da fonte — consistente com os demais
   17 átomos, mas vale o olho.

### Transversal
- **Divergência cross-átomo não harmonizada:** o piloto traz a fórmula de pool com `× réplicas`;
  a regra PERF-DB-02 do `performance-and-profiling` fala só em `workers`. Fontes diferentes. O
  verifier concluiu que são **compatíveis** (uma menos completa), não contraditórias. Não
  harmonizado de propósito — harmonizar faria um átomo afirmar o que a sua fonte não diz.
- **Seis átomos no teto do cap:** security 200, api-design 199, performance 199, code-smells 198,
  deployment 198, debugging 195, typing 197. Edição neles exige remoção antes de adição.
