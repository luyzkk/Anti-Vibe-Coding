# Memory: Plano 08 — `prototype`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente). Auto-contido no resto.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Roteador de ramo + LOGIC + dogfood | planned | 0/3 |
| 02 | O ramo UI | planned | 0/2 |
| 03 | Ponteiros e captura | planned | 0/3 |

Fase 03 depende so da fase-01.

## Decisoes de implementacao (DI)

Formato: `DI-Plano08-faseNN-<slug>: <o que mudou e por que>`.

(vazio — nada executado ainda)

## Verificacao do gap (2026-08-10)

| Termo | Hits | O que eram |
|---|---|---|
| `prototip` | 7 | qualificadores de contexto ("em prototipos ou MVPs, SOLID nao se aplica") |
| `spike` | 4 | pico de trafego, e 1 mencao solta em `assumption-audit` |
| `throwaway` | 1 | comentario em `code-simplification` |
| `descartável` | 2 | cache SQLite e telemetria |

**Nenhuma skill constroi codigo descartavel para responder uma pergunta.** Gap confirmado por
conceito, nao por nome.

## Divida de cobertura declarada (fase-02)

**O ramo UI nao da para dogfoodar neste repo** — plugin CLI, sem rotas, sem framework de UI, sem
pagina para hospedar variante.

A fase-02 fica **verificada so por leitura** ate o primeiro uso em projeto-alvo Next.js. Esse
primeiro uso e o teste de verdade.

Registrado por causa do compound `2026-05-12-skill-md-code-blocks-do-not-execute`: 224 testes
verdes, 10 skills "instrumentadas", 7 dias de uso e zero telemetria — porque a integracao nunca foi
testada end-to-end.

## Dogfood do ramo LOGIC (fase-01 Passo 8)

Criterio de alvo: modelo de estado com transicoes **legais e ilegais**, em que "isso deveria ser
possivel?" e pergunta honesta.

**Candidato principal — ciclo de vida do ADR** (`decision-registry`):
`PROPOSED → ACCEPTED → (SUPERSEDED por ADR-NNNN) ou DEPRECATED`

Perguntas que parecem resolvidas no papel:

- da para superseder um ADR `DEPRECATED`?
- ADR superseded por outro que depois vira deprecated — o primeiro volta a valer?
- da para ir de `PROPOSED` direto a `DEPRECATED`, sem passar por `ACCEPTED`?

**Alternativa:** estados de fase de plano (`planned` / `in_progress` / `completed`). Mais simples, e
talvez sem transicao ilegal interessante — o que o tornaria alvo fraco.

### Resultado a registrar

| Observacao | Resultado |
|---|---|
| Alvo escolhido, e por que | |
| O prototipo revelou transicao que o `decision-registry` nao trata? | |
| Se sim: virou ADR, ou correcao da skill? | |

"Nao revelou nada" tambem e resultado — registrar.

## Arquivo tocado por tres planos

`skills/design-twice/SKILL.md` recebe:

| Plano | Fase | O que |
|---|---|---|
| 02 | fase-02 | ponteiro para o vocabulario de deep modules |
| 02 | fase-03 | Dominio 5 — interface de modulo |
| 08 | fase-03 | ponteiro para `prototype` |

**Reler antes de cada edicao.** Edit falha em silencio contra contexto desatualizado.

## Gates entre fases

- **fase-01 -> fase-02:** o roteador de ramo precisa existir antes do segundo ramo.
- **fase-01 -> fase-03:** os ponteiros apontam para uma skill que precisa existir.
