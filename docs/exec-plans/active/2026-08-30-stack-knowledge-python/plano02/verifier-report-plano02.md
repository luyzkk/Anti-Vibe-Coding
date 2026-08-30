# Verifier Report — Plano 02 (Batch T1)

**Data:** 2026-08-30
**Protocolo:** refined (compound `2026-05-16-verifier-protocol-technical-sections-only`)
**Gate:** ≥80% (4/5 claims) por átomo
**Anti-drift:** cláusula verbatim (compound `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source`) em todos os 5 prompts de extrator

| Átomo | v1 | v2 | v3 | Veredito final |
|---|---|---|---|---|
| python-idioms-and-antipatterns | 5/5 | — | — | **PASS** |
| typing-and-static-analysis | 5/5 | — | — | **PASS** |
| errors-logging-observability | 5/5 | — | — | **PASS** |
| pytest-and-testing-strategy | 5/5 | — | — | **PASS** |
| security-fastapi-owasp | 4/5 | — | — | **PASS** |

**G12 não disparou** (gate de loop: ≥2 átomos falhando a v1). Um único átomo abaixo de 5/5, e ainda
assim acima do gate. Zero ciclos v2 — nenhum rework foi cego.

---

## Claims reprovadas e rework aplicado

### Falha de conteúdo (1) — `security-fastapi-owasp`

| Claim | Motivo | Fix |
|---|---|---|
| Linha da tabela de Critérios de decisão agrupava `CVE-2024-24762` e `CVE-2024-53981` sob a correção "Regex de complexidade linear + validar tamanho antes do parse" | O ID existe na fonte, mas o **conteúdo não sustenta a claim**: a fonte atribui a CVE-2024-53981 a *logging por byte em loop guiado por entrada externa*, não a backtracking de regex. Só a primeira CVE é sobre regex. | Linha separada em duas, cada CVE com a sua causa-raiz e o seu fix. Rework cirúrgico — nenhuma outra linha tocada. |

Este é exatamente o modo de falha **"ID como fachada de rastreio"** que o prompt do verifier deste
átomo mandava vigiar: citar `(regra N.N)` dá aparência de rastreabilidade, e conferir só a
*existência* do ID passaria batido. O verifier conferiu o conteúdo por trás do ID e pegou.

### Warns de amplificação de tom (4) — eixo novo, não previsto no protocolo original

Nenhum conta no score X/5 (a substância é rastreável em todos), mas os 4 foram corrigidos:

| Átomo | O que a fonte diz | O que o átomo dizia | Fix |
|---|---|---|---|
| python-idioms | *Fluent Python*: herança para reuso "**can often be replaced** by composition and delegation" | "troque por composição e delegação" / "Composição/delegação — **não** herança/mixin" | Hedge restaurado nos dois pontos |
| pytest | fonte ES: `autospec` serve para "detectar mal uso de API" | "para o mock **falhar se a assinatura da API real mudar**" (mecanismo mais específico que a fonte) | Reduzido ao que a fonte afirma |
| errors-logging | overhead `<1ms` **com ressalva** sobre serverless/Lambda (flush síncrono adiciona latência) | `<1ms` sem a ressalva | Ressalva restaurada |
| security | fonte lista "aplicar por IP e/ou por conta" | "a fonte **recomenda** ...; **combine as duas** quando possível" | Reduzido a "orienta aplicar por IP e/ou por conta" |

---

## Observações de calibração para Planos 03-04

**1. A amplificação de tom é um eixo de falha distinto — e o mais frequente deste batch.**
Zero falhas de rastreabilidade em 24 das 25 claims amostradas, mas 4 dos 5 átomos tinham pelo menos
uma claim com o grau de certeza inflado além da fonte. A cláusula anti-drift resolve bem *"não
invente conteúdo"*; ela **não diz nada sobre preservar o grau de confiança** do conteúdo que existe.
São modos de falha diferentes: um fabrica, o outro endurece.

As 4 ocorrências tomaram formas distintas — o que sugere que é um viés de destilação, não um bug de
formulação:
- converter hedge de frequência em diretiva binária (`can often be replaced` → `troque por`)
- especificar um mecanismo além do que a fonte descreve (`autospec`)
- **omitir uma ressalva** que a fonte anexa a um número correto (serverless/Lambda)
- transformar uma opção listada em recomendação (`e/ou` → `combine as duas`)

**Ação para os Planos 03-04:** acrescentar ao prompt do extrator uma cláusula de preservação de
hedge, e manter a checagem no prompt do verifier (ela já vinha do piloto do Plano 01 e pagou-se
neste batch).

**2. Não é drift sistemático de prompt.** `typing-and-static-analysis` veio com **zero** warns e
preservou o hedge nos 4 pontos que suas fontes marcam como contestado — inclusive recusando
explicitamente o enquadramento absoluto ("não 'Protocol sempre'"). A diferença plausível é que
aquela fonte sinaliza os próprios hedges de forma mais explícita. Ou seja: a cláusula de hedge é
**melhoria**, não conserto de causa raiz identificada. Não vale reescrever o prompt inteiro.

**3. Checks calibrados por átomo valeram mais que um prompt genérico.** Cada verifier recebeu um
check extra desenhado para o risco daquele átomo, e foi justamente um desses que pegou a única falha
real: "confira o conteúdo por trás do ID, não só a existência". Os outros também pagaram —
a auditoria numérica confirmou 30/30 valores em `errors-logging` (incluindo os 10 asteriscos do
`SecretStr`, contados por `grep -o`, não por leitura visual), e o check de conflito entre fontes
confirmou que `pytest` não adotou nenhum lado da divergência sobre metas de coverage.

**4. Extratores descartaram claims verdadeiras por conta própria.** Comportamento correto e
repetido: `dataclasses.replace()` (idioms), Redlock/`SET NX PX` (piloto), ranking mypy-vs-Pyright e
benchmark de mutation testing (typing/pytest — ambos declarados como lacuna nas próprias fontes).
A cláusula anti-drift está funcionando como projetada.

**5. Dois átomos estão no teto do cap e precisam de vigilância no Plano 04.**
`security-fastapi-owasp` está em **200/200** (o rework somou 1 linha) e `typing-and-static-analysis`
em **197/200**. Qualquer adição futura nesses dois exige remoção equivalente antes — vale
especialmente para o `security`, que ainda passa pelo audit humano (D11) e pode receber pedido de
mudança.

---

## Nota de processo

A estrutura de commits do README previa rework no commit 3. Como os 5 extratores e os 5 verifiers
rodaram antes de qualquer commit (waves lançadas em paralelo), o rework já entrou nos commits das
waves. O resultado em disco é idêntico; muda só onde o diff aparece no histórico.
