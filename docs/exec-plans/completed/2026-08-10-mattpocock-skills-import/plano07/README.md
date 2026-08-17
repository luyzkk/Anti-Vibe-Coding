# Plano 07: `improve-codebase-architecture` — Varredura Periodica de Arquitetura

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 2
**Sizing total:** ~5h
**Depende de:** plano01 fase-01 (a lente) · **plano02 fase-01** (o vocabulario — dependencia dura)
**Desbloqueia:** resolve o ponteiro pendurado do plano06 fase-03
**Branch:** `feat/improve-codebase-architecture`

---

## O que este plano entrega

A primeira skill **proativa e periodica** do plugin.

Tudo que temos hoje e reativo a uma mudanca que voce acabou de fazer: `verify-work` (executei um
plano), `anti-vibe-review` (implementei), `code-simplification` (este arquivo esta complexo),
`detect-architecture` (classificar, one-shot).

Esta varre o codebase inteiro procurando **deepening opportunities** sem que nada tenha acontecido.
*Rode a cada poucos dias.*

E ela e honesta sobre o proprio limite, e isso entra no porte: **e um levantamento, nao um resgate.**
Num codebase velho de verdade ela acha candidatos reais, mas nao desemaranha a lama por voce.

---

## As tres coisas que a fazem funcionar

**Escopar antes de varrer — YAGNI.** Aprofundar um modulo se paga tornando mudancas *futuras* nele
mais faceis. Logo, peso extra no que mudou recentemente. Sem direcao dada pelo usuario, caminhar o
`git log --oneline` para achar os hot spots e deixar esses caminhos puxarem a atencao primeiro.
Mudancas espalhadas sem hot spot claro → abrir a rede.

**O relatorio visual.** Card por candidato: arquivos · problema · solucao em portugues claro ·
beneficios em termos de *locality* e *leverage* · **diagrama before/after** · selo de forca
(`Strong` / `Worth exploring` / `Speculative`). Fecha com a recomendacao principal.

**Conflito com ADR.** Candidato que contradiz ADR existente so aparece quando o atrito e real o
bastante para justificar reabrir a decisao — e marcado no card. Nao listar todo refactor teorico que
um ADR proibe.

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| Vocabulario: `seam`, `depth`, `leverage`, `locality`, deletion test | **plano02 fase-01** | pendente — **dependencia dura** |
| ADRs para deteccao de conflito | `docs/design-docs/ADR-*.md` + `decision-registry` | pronto |
| Dominio 5 (interface de modulo) no `design-twice` | plano02 fase-03 | pendente — destino do encaminhamento |
| A lente de escrita | plano01 fase-01 | pendente |

Sem o plano02 esta skill nao tem lingua para falar — todo card diria "componente" e "boundary", que
e exatamente o que o vocabulario existe para evitar.

### Resolve uma pendencia registrada

`plano06/fase-03` encaminha o post-mortem arquitetural para `architecture`/`code-simplification`,
com nota de que o destino muda se esta skill entrar. **Entrou.** A fase-01 daqui atualiza aquele
ponteiro.

### Adiado deliberadamente (DI-25)

O **loop de grilling** sobre o candidato escolhido — com efeitos colaterais inline (atualizar
glossario, oferecer ADR) — depende de plano04 (frontier) e plano05 (`domain-modeling`). Fica para
fase futura. Esta entrega termina em *"qual voce quer explorar?"* e encaminha para `/design-twice`.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Escopar, varrer, detectar conflito](./fase-01-varredura.md) | 1 novo + 2 modificados | ~2.5h | plano02 fase-01 |
| 02 | [O relatorio HTML](./fase-02-relatorio-html.md) | 1 novo + 1 modificado | ~2.5h | fase-01 |

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | Vocabulario do plano02, exato, em todo card | Deriva no card ("componente", "servico", "boundary") anula o motivo de existir o vocabulario |
| INV-02 | Nenhum arquivo do relatorio entra no repo | DI-24. Relatorio e efemero; o que sobrevive e o candidato escolhido |
| INV-03 | A skill nao propoe interface na varredura | Propor cedo mata a exploracao. Ela **levanta candidatos** e para em "qual voce quer explorar?" |
| INV-04 | Nao encaminhar para skill inexistente | O loop de grilling esta adiado (DI-25). Encaminhar para `/design-twice`, que existe |

---

## Como este plano pode falhar

**A varredura devolve 30 candidatos genericos.** Mitigacao: o escopo por hot spot de git (nao varrer
o que ninguem toca) + o **deletion test** como filtro obrigatorio por candidato — deletar concentra
complexidade, ou so a move?

**Skills de dominio viram falso positivo.** `security`, `system-design` e `api-design` sao longas por
design — sao referencia consultavel. Mesma armadilha registrada no plano01 fase-03 G4. A varredura
precisa saber disso.

**O relatorio fica bonito e ninguem age.** Mitigacao: selo de forca + secao de recomendacao
principal. Um relatorio que trata 12 candidatos como equivalentes nao ajuda a escolher.

**Vira ritual sem retorno.** "Rode a cada poucos dias" pode virar cerimonia. Mitigacao: o proprio
porte carrega a honestidade da fonte — e levantamento, nao resgate — e a fase-01 exige rodar uma vez
neste repo antes de declarar pronta.
