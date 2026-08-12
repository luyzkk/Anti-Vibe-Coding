# Plano 05: `domain-modeling` — Glossario de Linguagem Ubiqua

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~6h
**Depende de:** plano01 fase-01 (a lente)
**Desbloqueia:** `wait-what` e `grill-with-docs` — as duas precisam de um glossario existindo
**Branch:** `feat/domain-modeling`

---

## O que este plano entrega

A skill `domain-modeling` e duas skills num arquivo so, e o veredito e **oposto** para cada metade.

**Metade glossario — gap total.** Zero conceito de linguagem ubiqua no plugin, verificado por grep.
Vira skill nova (DI-17).

**Metade ADR — nos ganhamos, e nao e perto.** Nosso `decision-registry` tem 260 linhas mais
`lib/adr-writer.ts`, numeracao automatica, template completo, ciclo de vida com `superseded_by`,
cross-link codigo→ADR, Common Rationalizations, Red Flags e checklist de verificacao. O dele diz
*"um ADR pode ser um unico paragrafo"*. Vira absorcao cirurgica de tres coisas (DI-17).

---

## O que a metade ADR ganha, mesmo perdendo no resto

**1. O filtro de 3 criterios.** Ele so oferece ADR quando os tres sao verdadeiros: dificil de
reverter · surpreendente sem contexto · resultado de trade-off real.

Nossa tabela lista **gatilhos por topico** (framework, schema, auth, arquitetura de API, build tool,
"qualquer decisao expensive to reverse") — temos 1 dos 3. Topico diz "esses assuntos"; propriedade
diz "essas caracteristicas". O filtro pega a escolha de framework que era obvia e nao merece ADR, e
pega o assunto fora da lista que **e** surpreendente.

**2. Tres categorias de "o que qualifica" ausentes da nossa tabela** — e sao as de maior valor:

- **Desvio deliberado do caminho obvio** — *"SQL manual em vez de ORM porque X"*. Impede o proximo
  de "consertar" o que foi intencional
- **Restricoes invisiveis no codigo** — *"nao podemos usar AWS por compliance"*
- **Decisoes de fronteira e escopo** — os **naos** explicitos valem tanto quanto os sins

**3. Um tier leve de ADR (DI-18).** Nossos Red Flags marcam como problema "ADR sem Alternatives" e
"sem Consequences". Mas o ADR do item 2 e uma frase — e hoje ele nao caberia no nosso formato sem
parecer incompleto. Ou seja: **o template pesado esta suprimindo exatamente os ADRs mais baratos e
uteis.** Passa a haver dois tiers, e o Red Flag de Alternatives passa a valer so no completo.

---

## Decisao de design resolvida aqui: scaffold vs criacao preguicosa

O Matt cria o glossario **lazily** — so quando o primeiro termo e resolvido. Nosso `/init` scaffolda
placeholders (PRD RF-03: 16+ placeholders).

Adotamos o **scaffold com semente**, nao a criacao preguicosa. Razoes:

- A linha em "When to Read What" do `AGENTS.md` (DI-12) aponta para o arquivo. `harness:validate`
  faz link-check — ponteiro para arquivo inexistente falha a validacao
- O scaffold do `/init` ja e feito de placeholders; um `GLOSSARY.md` semeado nao e arquivo morto,
  e um arquivo que se explica e convida preenchimento
- Criacao preguicosa exigiria a skill editar o `AGENTS.md` do projeto-alvo na primeira gravacao —
  mais superficie, mais chance de conflito

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| DI-12 (glossario em `docs/GLOSSARY.md`) | `../CONTEXT.md` — resolucao de CO-01 | pronto |
| Decisoes DI-17..DI-19 | `../CONTEXT.md` §Decisoes | pronto |
| `decision-registry` atual (260 linhas + `lib/adr-writer.ts`) | `skills/decision-registry/SKILL.md` | pronto |
| Convencao de template (`skills/init/assets/templates/docs/*.tpl` + `template-manifest.ts`) | verificado 2026-08-10 | pronto |
| A lente de escrita | plano01 fase-01 | pendente |

### Produz para

| O que | Quem consome |
|---|---|
| `skills/domain-modeling/` | `wait-what` e `grill-with-docs` (se portadas); o agente ao topar em termo ambiguo |
| `docs/GLOSSARY.md` no projeto-alvo | toda skill que precisa falar a lingua do projeto — `tdd`, `diagnosing-bugs`, `improve-codebase-architecture` quando portadas |
| Filtro de 3 criterios + tier leve no `decision-registry` | quem registra ADR |

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [A skill de glossario](./fase-01-skill-glossario.md) | 2 novos | ~2h | — |
| 02 | [Scaffold + ponteiro no AGENTS](./fase-02-scaffold-glossary.md) | 1 novo + 3 modificados | ~2h | fase-01 |
| 03 | [Absorcao no decision-registry](./fase-03-absorcao-decision-registry.md) | 1 modificado | ~1.5h | — |

Fase 03 e independente das outras duas.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | `GLOSSARY.md` e glossario e nada mais | Regra explicita da fonte: sem detalhe de implementacao, sem virar spec ou rascunho. Um glossario que vira spec deixa de ser consultavel |
| INV-02 | So termos especificos do dominio deste projeto | Conceito geral de programacao (timeout, retry, DTO) nao entra, mesmo que o projeto use muito. O teste: e unico deste contexto, ou e programacao em geral? |
| INV-03 | Nenhuma mudanca no template completo de ADR | DI-18 **adiciona** um tier; nao mexe no que existe. Nossos ADRs atuais continuam validos |
| INV-04 | Nada de multi-contexto (`CONTEXT-MAP.md`) | DI-19 |

---

## Como este plano pode falhar

**O glossario vira spec.** E o modo de falha que a propria fonte antecipa, e por isso INV-01 e
INV-02 sao invariantes e nao recomendacoes.

**O `GLOSSARY.md` scaffoldado nunca e preenchido.** Mitigacao: a skill e model-invoked e dispara nos
momentos em que o vocabulario esta sendo formado — termo conflitante, termo difuso, discussao de
modelo de dominio. Nao depende de o humano lembrar.

**O tier leve vira desculpa para nunca escrever o completo.** Mitigacao: o tier leve e restrito por
categoria — desvio deliberado e restricao invisivel, onde **nao ha alternativa a comparar**.
Decisao com alternativa real continua exigindo o template completo, e o Red Flag continua valendo la.
