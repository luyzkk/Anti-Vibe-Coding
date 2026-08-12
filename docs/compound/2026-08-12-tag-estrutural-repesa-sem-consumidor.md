---
title: "Tag estrutural em SKILL.md carrega peso retorico sem nenhum consumidor mecanico — o quarto papel"
category: processo
tags: [skills, skill-md, constraints, prompt-engineering, auditoria, load-bearing]
created: 2026-08-12
---

## Problem

No lote 5b do plano01, `qa-visual` e `tdd-workflow` entraram num lote de poda de secoes reprojetadas
— ambas com `## Regras Inviolaveis`, mesma forma das secoes que ja tinham sido podadas com sucesso
em `write-prd`, `plan-feature` e `execute-plan`.

Rodei o check padrao de `docs/compound/2026-08-11-skill-md-code-block-can-be-load-bearing.md`:

```bash
grep -rn "constraints>" scripts/ tests/ skills/ --include=*.ts --include=*.js   # → vazio
```

**Nenhum validator, nenhum teste.** Pelo criterio daquela nota, seguro cortar.

Mas nas duas skills a secao e o **conteudo unico** de um bloco `<constraints>`:

```
<constraints>
## Regras Inviolaveis
- NUNCA pular o Passo 1 (contexto) — testar sem saber o que testar e desperdicio
...
</constraints>
```

Cortar a secao esvazia o bloco. E a tag nao e decoracao: `<constraints>` e o marcador que diz ao
modelo "estes sao limites duros", diferente de prosa corrida. Restatement dentro de `<constraints>`
nao e duplicacao — e **re-peso**.

O que fechou a questao foi um documento, nao um teste: a `COMPARISON-MATRIX` de 2026-06 (auditoria
deste repo contra uma ferramenta de referencia) trata os blocos `<constraints>` como escolha de
design deliberada — "distribui regras equivalentes atraves de 8 blocos `<constraints>` de topico" —
e cita **especificamente** a regra "NUNCA pular o Passo 1" do `qa-visual` como ponto forte contra a
ferramenta comparada. Uma auditoria anterior ja tinha olhado para aquele texto e defendido ele.

## Solution

A taxonomia da nota de 2026-08-11 lista tres papeis para texto que nao executa em `SKILL.md`.
Falta um quarto:

| # | Papel | Consumidor | Como detectar |
|---|---|---|---|
| 1 | Runtime pretendido que falhou | nenhum | grep no hook/registry: zero |
| 2 | Spec que o agente simula | o proprio agente | prosa logo abaixo descreve a intencao |
| 3 | Contrato lido pelo harness | `harness-validate.ts` / `*.test.ts` | grep pelo marcador |
| **4** | **Marcador retorico que re-pesa** | **o modelo, em runtime de prompt** | **grep nao acha nada — procurar a convencao** |

O papel 4 e invisivel a todo grep de codigo, por definicao. O que o revela:

- a estrutura e **consistente entre skills** (`<constraints>`, `<instructions>`, `<context>`
  aparecem em 5 skills aqui) — convencao, nao acidente;
- existe documento de design ou auditoria anterior que a nomeia;
- remove-la deixaria um container vazio, o que e sinal de que o container tinha proposito.

Quando os tres batem, a secao sai de escopo ate alguem decidir mudar a **convencao**, nao o arquivo.

## Prevention

- **Grep vazio em `scripts/` e `tests/` nao libera corte.** Ele descarta os papeis 3 e 1; nao diz
  nada sobre o 4. Antes de cortar, perguntar: isso esta dentro de algum container estrutural? A
  mesma estrutura aparece em outras skills? Alguem ja documentou que ela faz trabalho?
- **Antes de propor delecao, procurar auditoria anterior sobre o mesmo texto.** Aqui a
  `COMPARISON-MATRIX` de dois meses antes ja tinha analisado exatamente aquela regra. Buscar em
  `docs/exec-plans/completed/` custa um grep e evita desfazer decisao tomada com mais contexto.
- Nao generalizar deste para "tudo sob tag e intocavel". Os itens **dentro** de um `<constraints>`
  ainda podem ser reprojecao; o que nao se faz e esvaziar o bloco. Poda dentro, sem matar o
  container, continua valida.
- Le junto com `docs/compound/2026-08-11-skill-md-code-block-can-be-load-bearing.md` (papeis 1-3) e
  `docs/compound/2026-05-12-skill-md-code-blocks-do-not-execute.md` (a premissa que as tres notas
  refinam). Cadeia: **nao-executa != nao-carrega-peso**, e agora **sem-consumidor != sem-funcao**.

## Affected files

- `skills/qa-visual/SKILL.md:372-385` — `<constraints>` com `## Regras Inviolaveis` como unico filho
- `skills/tdd-workflow/SKILL.md:404-417` — mesma forma
- `docs/exec-plans/completed/2026-06-04-skill-parity-refresh/COMPARISON-MATRIX.md:195,416` — a
  auditoria anterior que defende a convencao
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md` — §Descartados
