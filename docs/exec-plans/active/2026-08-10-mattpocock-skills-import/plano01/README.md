# Plano 01: Porte da `writing-for-agents` + Auditoria das 39 Skills

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 4
**Sizing total:** ~7h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** todos os planos seguintes — cada skill portada depois passa pela referencia criada aqui
**Branch:** `feat/writing-for-agents-port` (DI-05)

---

## O que este plano entrega

Ao fim do Plano 01 o repo tem uma **referencia canonica de escrita para agentes** que dispara
sozinha ao editar qualquer `SKILL.md`, `AGENTS.md` ou `CLAUDE.md`, um **script que mede** o custo
dos documentos do plugin, e um **relatorio de auditoria** das 39 skills existentes com achados
ranqueados.

A ordem nao e acidental: portamos a lente antes de portar qualquer outra skill, porque toda skill
portada depois — `codebase-design`, `wizard`, `diagnosing-bugs`, o que for — sera escrita contra ela.
Porta-la por ultimo significaria reescrever tudo.

**Nada e cortado das 39 skills neste plano sem aprovacao explicita por achado (DI-04).**

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES)

| O que | De onde vem | Status |
|---|---|---|
| Repo-fonte lido e triado | `../CONTEXT.md` | pronto |
| Decisoes DI-01..DI-05 | `../CONTEXT.md` §Decisoes tomadas | pronto |
| Baseline medido (15.149 chars, 36/39, system-design 1.497) | `../CONTEXT.md` §Achado medido | pronto |
| Convencao de frontmatter do plugin (6 campos) | `skills/*/SKILL.md` (existentes) | pronto |
| 4 compound notes de armadilha de `SKILL.md` | `docs/compound/` | pronto |
| Padrao `Common Rationalizations` + `Red Flags` ja estabelecido (19 e 17 skills; exemplar: `decision-registry`) | `skills/decision-registry/SKILL.md` | pronto |

### Produz para

| O que | Quem consome |
|---|---|
| `skills/writing-for-agents/SKILL.md` — a referencia | Planos 02..N (toda skill portada e escrita contra ela) + qualquer edicao futura de `SKILL.md`/`AGENTS.md`/`CLAUDE.md` |
| `skills/writing-for-agents/references/SKILL-MECHANICS.md` — invocacao mapeada nos nossos 8 campos | Planos 02..N (decidir model- vs user-invoked de cada porte) |
| `scripts/audit-skill-docs.ts` + baseline JSON | fase-03 e fase-04 deste plano; regressao de context load em planos futuros |
| Relatorio de auditoria | fase-04 (define o escopo dos patches) |

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Porte do nucleo](./fase-01-porte-nucleo.md) | 2 novos | ~2.5h | — |
| 02 | [Instrumentacao + tracer bullet](./fase-02-instrumentacao-e-tracer.md) | 2 novos + 1 gerado | ~2h | fase-01 |
| 03 | [Auditoria fan-out (5 subagentes)](./fase-03-auditoria-fanout.md) | 1 novo (relatorio) | ~1.5h | fase-01, fase-02 |
| 04 | [Aplicacao dos patches aprovados](./fase-04-aplicacao-patches.md) | escopo definido pela fase-03 | ~1h+ | fase-03 |

**Tracer bullet:** fase-02. Antes de espalhar para 39 skills, a skill portada e aplicada a **uma**
skill — `system-design`, o pior ofensor medido — e precisa produzir um achado real e acionavel.
Se nao produzir, a fase-03 nao roda: o problema esta na skill portada, nao na escala.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | A description da `writing-for-agents` fica **abaixo de 250 chars** | A skill precisa passar no proprio teste. Uma referencia sobre custo de contexto que custa 1.500 chars de description se auto-refuta |
| INV-02 | Leading words permanecem em ingles: `tight`, `red`, `seam`, `sprawl`, `sediment`, `leverage`, `locality`, `no-op` | DI-03. Traduzidas nao recrutam o prior pre-treinado |
| INV-03 | Zero edicao em `skills/*/SKILL.md` existentes nas fases 01–03 | DI-04. Auditoria observa; nao muta |
| INV-04 | Toda secao "Invocation" e **reescrita** para os 6 campos do nosso frontmatter, nunca traduzida | CO-03. Traduzir literalmente entrega conselho errado |
| INV-05 | Atribuicao MIT em `THIRD-PARTY-NOTICES.md` antes do merge | Obrigacao de licenca |

---

## Como este plano pode falhar

**A skill portada vira mais um doc que ninguem le.** Mitigacao: e model-invoked com trigger em
`SKILL.md`/`AGENTS.md`/`CLAUDE.md` (DI-01) — dispara no momento exato de uso, sem depender de
memoria humana.

**A auditoria produz 200 achados genericos e nada acontece.** Mitigacao: a fase-02 exige um achado
real numa skill real antes de fanout; a fase-03 ranqueia por delta mensuravel (chars economizados,
duplicacoes fechadas), nao por contagem.

**Cortamos algo que era load-bearing.** Mitigacao: INV-03 + DI-04 + o teste do no-op e comportamental
("delete a linha, o comportamento mudou?"), resolvido rodando o documento. Nenhum patch sem aprovacao.
