# Verifier Report — Plano 03 (Batch T2)

**Data:** 2026-08-30
**Protocolo:** refined (compound `2026-05-16-verifier-protocol-technical-sections-only`)
**Gate:** ≥80% (4/5 claims) por átomo
**Anti-drift:** cláusula verbatim em todos os 9 prompts de extrator, **mais** a cláusula de
preservação de hedge introduzida neste plano (calibração vinda do Plano 02)

| Átomo | v1 | v2 | v3 | Veredito final |
|---|---|---|---|---|
| architecture-and-di-fastapi | 5/5 | — | — | **PASS** |
| api-design-and-contracts | 5/5 | — | — | **PASS** |
| sqlalchemy-async-and-orm | 5/5 | — | — | **PASS** |
| migrations-and-schema-evolution | 5/5 | — | — | **PASS** |
| dependencies-and-packaging-uv | 5/5 | — | — | **PASS** |
| tooling-ruff-mypy-precommit | 5/5 | — | — | **PASS** |
| code-smells-and-refactoring | 5/5 | — | — | **PASS** |
| deployment-and-production | 5/5 | — | — | **PASS** |
| performance-and-profiling | 5/5 | — | — | **PASS** |

**9/9 em 5/5. Zero falhas de conteúdo. G12 não disparou. Zero ciclos v2.**

45 claims técnicas amostradas, 45 rastreadas.

---

## Comparação com o Plano 02 — a cláusula de hedge funcionou

| | Plano 02 (5 átomos) | Plano 03 (9 átomos) |
|---|---|---|
| Falhas de conteúdo | 1 (security, ID sem lastro) | **0** |
| Átomos com warn de tom | 4 de 5 (80%) | **2 de 9 (22%)** |
| Warns totais | 4 | 3 |
| Ciclos v2 | 0 | 0 |

O Plano 02 descobriu que amplificação de tom é um eixo de falha que a cláusula anti-drift não
cobre — ela resolve "não invente conteúdo", não "preserve o grau de certeza do conteúdo que
existe". A cláusula de hedge entrou nos 9 prompts deste plano e a incidência caiu de 80% para 22%
dos átomos. Não é prova causal — são batches, fontes e temas diferentes — mas é o sinal
disponível, e o custo da cláusula é um parágrafo por prompt.

---

## Warns (3) — dois corrigidos, um aceito

### Corrigidos: `performance-and-profiling`

| Fonte diz | Átomo dizia | Fix |
|---|---|---|
| "**potencial** divergência de freshness entre workers" (L619) | "divergência de freshness" | hedge restaurado |
| "versões anteriores **podem usar** script Lua equivalente" (L693) | "versões anteriores usam" | hedge restaurado |

### Aceito sem alteração: `migrations-and-schema-evolution` (pattern `ADD COLUMN`)

O verifier apontou que o átomo usa fraseado categórico ("é metadata-only", "é rápido") onde o
**título da Regra** da fonte hedgeia ("pode ser", "pode exigir"). Decisão: **não alterar.**

O átomo espelha quase verbatim a **Justificativa técnica** da mesma subárea (L106), que é
categórica: *"avalia o default na alteração e armazena o resultado em metadata, sem reescrever
imediatamente todas as linhas, tornando o `ALTER TABLE` rápido mesmo em tabela grande"*. Título e
justificativa são ambos a fonte; o extrator espelhou o parágrafo que explica o mecanismo.

E o que importa para segurança operacional está intacto: o átomo **preserva a distinção** entre
default não-volátil e volátil, que é o que evita o rewrite de tabela. Ele não afirma que
`ADD COLUMN ... DEFAULT` é sempre barato. Suavizar para "pode ser metadata-only" deixaria a
orientação mais vaga sem deixá-la mais correta — pioraria o átomo. O próprio verifier classificou
como cosmético e registrou o atenuante.

---

## Divergência cross-átomo: resolvida como compatível, não contraditória

O átomo `async-and-concurrency` (piloto do Plano 01) traz a fórmula de dimensionamento de pool
incluindo o eixo **× réplicas**; a regra `PERF-DB-02` da fonte do `performance-and-profiling` fala
apenas em **workers**. Fontes diferentes, formulações diferentes.

O verifier de performance leu as duas e concluiu: a formulação daqui é **fiel à própria fonte, mas
menos completa** que a do átomo irmão — não são contraditórias. Uma cobre um eixo a mais.

**Não harmonizado, de propósito.** "Consertar" significaria fazer o átomo afirmar algo que a sua
fonte declarada não diz — exatamente o que a regra de fidelidade proíbe, e o defeito que o gate
existe para pegar. Fica registrado para o audit humano decidir se vale uma nota de referência
cruzada no INDEX final (Plano 04 fase-04).

---

## Checks calibrados por átomo — o que cada um pagou

Cada verifier recebeu um check desenhado para o risco do seu átomo, em vez de um prompt genérico.
O que isso rendeu:

- **`api-design`:** confirmou por grep zero conteúdo de GraphQL/gRPC/tRPC (exclusão D6) — o
  material existe na fonte e não foi importado. E confirmou que os **três números que a fonte
  declara não ter** (threshold offset-vs-cursor, TTL de idempotency key, status de chave pendente)
  continuam ausentes. A fonte é explícita: *"qualquer threshold numérico seria fabricado"*.
- **`sqlalchemy`:** reconfirmou de forma independente que `Mike Bayer` só aparece na fonte em
  contexto de Alembic, e que a atribuição do conflito de repository está correta — o erro do plano
  não se propagou para o átomo.
- **`tooling`:** grep por nomes de flags do mypy retornou zero; o dedup com
  `typing-and-static-analysis` é referência real, não reexplicação.
- **`dependencies`:** grep por termos das seções fora da §18 da fonte complementar retornou zero;
  sem vazamento do território do `security-fastapi-owasp`.
- **`deployment`:** grep confirmou ausência dos quatro números que a fonte declara não ter
  (threadpool AnyIO, tempo de boot, imagem Chainguard, threshold de canary).
- **`performance`:** o check foi o **conteúdo por trás do ID**, não a existência dele — a
  existência dos 24 IDs eu já havia confirmado por comparação de conjuntos. É a distinção que
  pegou a única falha real do Plano 02.
- **`architecture`:** confirmou que os tells fracamente atestados da §12 não viraram prescrição —
  incluindo o sub-tell que a própria fonte admite, em Lacunas #7, não ter sustentação.
- **`code-smells`:** amostrou as refatorações canônicas passo a passo, onde um passo errado é mais
  danoso que uma imprecisão conceitual.
- **`migrations`:** verificou o hedge do pattern adicionado durante a execução (ver abaixo).

---

## Lacuna fechada durante a execução

O extrator de `migrations` sinalizou uma subárea da fonte que ele excluiu por julgar ser runtime
("constraints do banco vs validação da aplicação", L260-296), avisando que **não pôde confirmar**
se o átomo irmão a cobria — ler o irmão estava fora do escopo dele.

Verificação: não estava em nenhum dos dois. O `sqlalchemy-async-and-orm` só toca `IntegrityError`
num contexto de retry de deadlock. A subárea inteira — constraint como árbitro atômico contra o
race de check-then-insert — ficaria de fora dos 18 átomos.

É o modo de falha típico de duas fases dividindo uma fonte: cada extrator assume que o outro
pegou, e o plano não atribuiu a subárea a ninguém. Alocada em `migrations` (dono do tema
constraints, com folga de cap) e escrita pelo próprio extrator, que ainda tinha a fonte em
contexto. O hedge sobreviveu literalmente: *"a validação duplicada é útil; a validação
exclusivamente na aplicação é o problema"*.

---

## Achado sobre o escopo do plano (não sobre os átomos)

O extrator de `deployment` reportou que as seções **11** (smoke test + diff de `openapi.json` antes
de liberar tráfego) e **17** (paridade dev/prod, `docs_url=None` em produção) são tagueadas pela
própria fonte como *previne incidente* — a tag de maior impacto — mas **não estavam nas 18 seções
que o plano enumerou**. Ficaram de fora por limite de escopo, não por prioridade.

O plano sub-escopou essa fase. Registrado no TODO.md para avaliação no Plano 04.

---

## Observações de calibração para o Plano 04

1. **Manter a cláusula de hedge** — ver a comparação acima.
2. **Manter os checks calibrados por átomo.** Um prompt genérico nos 9 teria custado menos para
   escrever e teria verificado menos.
3. **Números que eu forneço no prompt são conveniência, não evidência.** Três verifiers remediram
   a contagem de linhas por conta própria; um discordou do meu número (198 vs 199). Comportamento
   correto — manter o incentivo.
4. **Dois átomos no teto:** `api-design-and-contracts` e `performance-and-profiling` em 199/200;
   `code-smells` e `deployment` em ~198. Com os do Plano 02 (`security` em 200/200, `typing` em
   197), são **seis** átomos sem margem. Qualquer edição no Plano 04 nesses arquivos exige remoção
   antes de adição — vale sobretudo para os que passam pelo audit humano.
