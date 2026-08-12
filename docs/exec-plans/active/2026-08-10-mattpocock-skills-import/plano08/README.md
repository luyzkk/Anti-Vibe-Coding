# Plano 08: `prototype` — Codigo Descartavel que Responde uma Pergunta

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~6h
**Depende de:** plano01 fase-01 (a lente)
**Branch:** `feat/prototype-skill`

---

## O que este plano entrega

A capacidade de **construir para descobrir**, em vez de decidir no abstrato.

Verificado por conceito: os 7 hits de "prototipo" no repo sao qualificadores de contexto
(*"em prototipos ou MVPs, SOLID nao se aplica"*) e os 4 de "spike" sao pico de trafego. Nenhuma
skill constroi codigo descartavel para responder uma pergunta.

---

## A tese, e por que a escolha de ramo e o passo mais importante

*Um prototipo e codigo descartavel que responde uma pergunta. A pergunta decide a forma.*

Errar o ramo desperdica o prototipo inteiro — por isso a skill identifica a pergunta antes de
escolher a forma, e se a pergunta for genuinamente ambigua com o usuario ausente, escolhe pelo
contexto do codigo em volta e **declara a suposicao no topo do prototipo**.

**LOGIC** — *"esse modelo de estado parece certo?"* Um HTML unico, sem instalar nada, que um
nao-desenvolvedor dirige clicando. Free-play mais walkthroughs guiados em abas, cada cenario
resetando para estado conhecido. Rotulos em linguagem de dominio.

O detalhe que da vida apos a morte ao prototipo: **a logica fica num modulo puro e liftavel dentro
do arquivo**; a pagina em volta e descartavel. Sem DOM, sem `document`, sem handler alcancando pra
dentro. Respondida a pergunta, o reducer validado sobe para o codigo real sozinho.

**UI** — *"como isso deveria parecer?"* N variantes (padrao 3, teto 5) na mesma rota via
`?variant=`, com barra flutuante. Sub-forma A (embutir na pagina existente) e **fortemente
preferida** sobre rota nova: *uma rota vazia esconde problemas de design que uma populada exporia*.

E as variantes precisam ser **estruturalmente diferentes** — *tres grades de card levemente
ajustadas nao e prototipo, e papel de parede*.

---

## Onde encaixa

| Skill | Relacao |
|---|---|
| `design-twice` | gera 3 propostas **em texto**; `prototype` torna uma delas **executavel**. Ciclo explorar → sentir |
| `qa-visual` | dirige browser via Playwright em UI existente. Tres variantes numa rota e exatamente o que ele percorre |
| `tdd-workflow` | oposto e complementar: TDD constroi o que fica; prototipo constroi o que se joga fora |

---

## Analise de Dependencias

| O que | De onde vem | Status |
|---|---|---|
| `SKILL.md` (26 linhas) + `LOGIC.md` (67) + `UI.md` (112) | repo-fonte | pronto |
| Convencao de branch para a captura | `skills/git-workflow-and-versioning/SKILL.md` | pronto |
| A lente de escrita | plano01 fase-01 | pendente |

Sem dependencia de outros planos. Auto-contido.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Roteador de ramo + LOGIC + dogfood](./fase-01-logic.md) | 2 novos + 1 modificado | ~2.5h | — |
| 02 | [O ramo UI](./fase-02-ui.md) | 1 novo + 1 modificado | ~2h | fase-01 |
| 03 | [Ponteiros e captura](./fase-03-ponteiros-e-captura.md) | 3 modificados | ~1.5h | fase-01 |

Fase 03 depende so da fase-01 — o ponteiro do `qa-visual` menciona o ramo UI, mas nao precisa dele
entregue para ser escrito.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | O modulo de logica e **puro e liftavel** | E o que separa prototipo util de codigo jogado fora. Se referencia DOM, deixou de ser liftavel |
| INV-02 | Zero teste, zero abstracao, zero persistencia no prototipo | *Um prototipo que precisa de teste deixou de ser prototipo.* Persistencia e o que o prototipo **checa**, nao do que ele depende |
| INV-03 | Variantes estruturalmente diferentes | Diferenca so de cor ou copy e ajuste, nao prototipo |
| INV-04 | A barra de troca some em producao | Gate por `NODE_ENV`. Merge acidental nao pode mandar a barra para o usuario |
| INV-05 | O prototipo nunca vai para a `main` | Vai para branch descartavel como **fonte primaria**, com ponteiro de contexto. A `main` fica so com a decisao validada |

---

## Como este plano pode falhar

**A skill vira gerador de demo bonito sem pergunta.** Mitigacao: o passo 1 dos dois ramos exige
escrever a pergunta **de forma visivel no proprio prototipo**, nao em comentario. Prototipo que
responde a pergunta errada e desperdicio puro.

**O ramo UI nao da para dogfoodar aqui.** Este repo e plugin CLI, sem rotas. Mitigacao: o dogfood da
fase-01 cobre LOGIC end-to-end; a fase-02 declara explicitamente que UI fica verificada so por
leitura ate ser usada num projeto-alvo. **Declarar, nao omitir.**

**O prototipo vaza para producao.** Mitigacao: INV-04 e INV-05, e a regra da fonte de que o codigo
de variante foi escrito sob restricao de prototipo (sem teste, sem tratamento de erro) — quando
vencer, **reescrever direito**, nao promover.
