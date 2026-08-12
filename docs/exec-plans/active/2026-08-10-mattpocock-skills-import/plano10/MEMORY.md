# Memory: Plano 10 — `wayfinder`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Formato + modo chart | planned | 0/3 |
| 02 | Script de fronteira | planned | 0/3 |
| 03 | Modo work + pipeline | planned | 0/4 |

Linear: o script precisa do formato; o modo work precisa da fronteira.

## Decisoes de implementacao (DI)

Formato: `DI-Plano10-faseNN-<slug>: <o que mudou e por que>`.

Uma ja e obrigatoria:

- `DI-Plano10-fase01-claim`: como reivindicar um ticket em markdown local? Na fonte e atribuir a
  issue a si mesmo, para sessoes concorrentes pularem. Opcoes: campo com timestamp + identificador
  de sessao · flag booleana · nada. **Voce roda sessoes paralelas as vezes**, entao "nada" tem custo
  real.

## Verificacao do gap (2026-08-10)

Nao e "planejar coisa grande" — isso ja temos:

| Ja temos | Onde |
|---|---|
| Decomposicao hierarquica | `plan-feature` — PRD → planos → fases |
| DAG entre fases | `plan-feature:721` — *"Depende de: fase-01" ou "Independente"* |
| Dependencia entre requisitos Must Have | `plan-feature:501` |
| Estado multi-sessao | `STATE.md` + `MEMORY.md` por plano |

Termos ausentes, verificados: `fog` (1 hit, sentido diferente) · `frontier` (0) · `decision ticket`
(0) · `multi-session` (0). `fronteira` (10) e `blocking` (9) nao aparecem em nenhum `SKILL.md` no
sentido relevante.

**O gap e o estagio de descoberta** — quando o destino e visivel mas o caminho nao, e voce ainda nao
sabe quais sao as perguntas.

## As tres adaptacoes

| DI | Adaptacao | O que se perde, e como recupera |
|---|---|---|
| DI-32 | mapa e tickets em markdown local, na pasta datada do esforco | perde a UI do tracker; a fonte preve esse fallback |
| DI-33 | `scripts/wayfinder-frontier.ts` computa a fronteira | recupera o que a query do tracker dava — **e e testavel, o que a query nao era** |
| DI-34 | 4 tipos de ticket com degradacao | `prototype` e `grilling` degradam para conversa ate plano08 e plano04 |

## Pendencia explicita: religar os tipos degradados

Quando os planos entregarem, os ponteiros de tipo de ticket precisam ser atualizados:

| Tipo | Hoje | Religar quando |
|---|---|---|
| `prototype` | degrada para conversa | **plano08** entregar `/prototype` |
| `grilling` | degrada para conversa | **plano04** (frontier no `grill-me`) e **plano05** (`domain-modeling`) |
| `research` | subagente + `source-driven-development` | — ja funciona |
| `task` | disponivel | — ja funciona |

**Nao e TODO solto** — cada degradacao carrega no doc o ponteiro exato do plano que a religa.

## Layout dos artefatos (DI-32)

```
docs/exec-plans/active/{data}-{slug}/
├── MAP.md
└── tickets/
    ├── 001-{slug}.md
    └── 002-{slug}.md
```

Convive com `CONTEXT.md`, `PRD.md`, `PLAN.md`, `STATE.md` e `planoNN/` — sao estagios diferentes da
mesma pasta, e wayfinder vem antes deles.

## Teste em papel (fase-01)

**Este proprio esforco de import** — 10 planos, decidido ao longo de varias sessoes, com colisoes
descobertas no meio e escopo se revelando aos poucos — foi um caso de wayfinder feito a mao.

Se o formato nao der conta de representa-lo retroativamente, **o formato esta errado.**

## O modo de falha mais provavel

Virar burocracia para trabalho que cabia numa sessao.

A defesa esta no passo 3 do modo chart: **se a grelhagem breadth-first nao revelar nevoa, o caminho
ja esta claro — parar e dizer que nao precisa de mapa.** Se essa saida nao estiver afiada, a skill
vai gerar mapa para tudo.

## Gates entre fases

- **fase-01 -> fase-02:** o formato do ticket e o input do script.
- **fase-02 -> fase-03:** o modo work comeca rodando a fronteira.
