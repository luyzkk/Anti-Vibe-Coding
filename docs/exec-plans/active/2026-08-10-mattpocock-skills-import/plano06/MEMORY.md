# Memory: Plano 06 — Loop-First no `incident-response`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** in-progress — fase-01 concluida
**Depende de:** plano01 fase-01 (a lente) · plano02 fase-01 (vocabulario de `seam`, so a fase-03)

Precondicoes reconferidas em 2026-08-13: lente presente (`skills/writing-for-agents/`), `seam` no
`tdd-workflow/references/deep-modules.md` (15 ocorrencias), `incident-response` com 176 linhas —
este numero o plano acertou.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Reenquadrar + a fase do loop | **done** | 5/5 |
| 02 | O miolo | planned | 0/1 |
| 03 | A saida | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano06-faseNN-<slug>: <o que mudou e por que>`.

### fase-01 (2026-08-13)

- `DI-Plano06-fase01-posicao-do-loop`: o loop ficou em **Etapa 2**, entre a ingestao de logs e a
  hipotese — nao "antes de tudo", como o Passo 3 do fase doc escreve. Tres razoes: (a) o criterio de
  fechamento exige asseverar **o sintoma exato do usuario**, e o sintoma so se conhece depois dos
  logs; (b) a arvore de flakiness da Etapa 1 e insumo do desenho do loop — ela diz qual taxa de
  reproducao precisa ser elevada, que e exatamente o que a secao de nao-determinismo do satelite
  trata (o Passo 7 pede essa costura, e ela so fecha nesta ordem); (c) o gate e contra pular para
  **hipotese**, e morde igual em posicao 2. A enfase da fonte ("This is the skill") entrou no texto
  da etapa, nao na posicao. Colocar o loop em 1o exigiria duplicar a coleta do sintoma dentro dele.
- `DI-Plano06-fase01-acoplamento-4-nao-2`: o plano nomeia `iterate:108` e `:243`. **Os reais sao
  `:83` e `:222`** — e existem **duas referencias internas** por numero dentro do proprio
  `incident-response` que o plano nao menciona: `Voltar a Etapa 2` (no Regression Test) e
  `Fix sem teste | Voltar a Etapa 3` (em Sinais de Alerta). Renumerar quebraria as quatro. Todas
  viraram ancora nomeada, e o `SKILL.md` ganhou comentario no topo avisando que os titulos de secao
  sao ponteiros externos.
- `DI-Plano06-fase01-description-pt-br`: a `description` continua em pt-BR (240 chars). DI-03 pede
  EN, mas vale para material **portado**; esta e skill pre-existente sendo reenquadrada, e trocar a
  lingua seria churn sem ganho de invocacao.
- `DI-Plano06-fase01-sh-fora-do-manifest`: `generate:manifest` **nao indexa `.sh`** — o total foi de
  419 para 420 com dois arquivos novos. Nao e regressao: `skills/wizard/template.sh` (plano03)
  tambem esta fora. Exec bit garantido no index via `git update-index --add --chmod=+x` (`100755`,
  igual ao do wizard).

## Descricoes do fluxo que ficaram desatualizadas (resolver no fim do plano)

A sequencia antiga — "logs brutos -> hipotese -> regression test -> fix" — aparece descrita em tres
lugares fora da skill. Com o loop entrando no meio, ficam **incompletas, nao falsas**; nenhuma e link
quebrado:

| Onde | O que diz |
|---|---|
| `README.md:157` | "Investigação disciplinada: raw logs → hipótese → regression test → fix" |
| `README.md:358` | mesma sequencia, no bloco de comandos |
| `skills/tdd-workflow/SKILL.md:346` | "fluxo completo pos-deploy (logs brutos -> hipotese -> ...)" |

Deixadas para depois da fase-03 de proposito: as fases 02 e 03 ainda mexem nas etapas, e reescrever
a descricao duas vezes seria trabalho dobrado. `README.md:279` (diagrama de pipeline) e
`README.md:590` (lista de skills) nao descrevem etapas — nao precisam mudar.

## Estado do alvo antes da mudanca

`skills/incident-response/SKILL.md` — 176 linhas, 6 etapas:

1. Ingestao de logs brutos (+ arvore de flakiness: timing/ambiente/estado/aleatorio)
2. Formular hipotese (+ arvore de camada: UI/API/DB/build/externo/o-proprio-teste)
3. Regression test ANTES do fix (RED obrigatorio)
4. Fix cirurgico
5. Hardening como habito (+ rubrica de instrumentacao temporaria)
6. Commit

Mais: secao de defesa contra injecao via log · tabela Sinais de Alerta · Autopsia pos-fix (3 perguntas).

**O que e nosso e nao existe na fonte (INV-01):** arvore de flakiness · arvore de camada (em especial
"o proprio teste — falso negativo") · defesa contra injecao via log · autopsia, com a pergunta
*"por que passou pela revisao e pelos testes existentes?"*

## Acoplamento fragil (reparar na fase-01, PRIMEIRO)

`skills/iterate/SKILL.md` referencia `incident-response` **por numero de etapa**:

| Linha | Aponta para |
|---|---|
| 108 | "Etapa 1" (diagnostico completo) |
| 243 | "Etapa 5" (rubrica de hardening) |

Inserir a fase do loop no inicio renumera tudo. **Quebra em silencio** — sem erro, sem teste
falhando; o leitor cai na secao errada. Trocar por ancora nomeada.

## Custo aceito em DI-20

O nome `incident-response` deixa de descrever o escopo (que passa a incluir bug em dev e regressao
de perf). Aceito. Mitigacao parcial: a `description` carrega o escopo novo, e e ela que dirige a
invocacao — nao o nome.

Se o nome incomodar depois, renomear e trabalho separado: toca `iterate`, `commands/`, e o hook
SessionStart.

## Ponteiro que nao existe ainda

A fonte encaminha o post-mortem arquitetural para `improve-codebase-architecture`, que **nao esta
portada**. A fase-03 aponta para `architecture` ou `code-simplification`.

**Se `improve-codebase-architecture` entrar, este ponteiro muda de destino.** Anotado aqui para nao
virar link morto.

## Teto de tamanho

176 linhas hoje. Teto de ~220 apos as tres fases. Satelites previstos:
`references/feedback-loops.md` (fase-01, obrigatorio) e, se estourar, o branch de perf da fase-02.

## Gates entre fases

- **fase-01 -> fase-02:** o loop precisa existir para ser minimizado.
- **fase-02 -> fase-03:** o repro minimizado alimenta o regression test.
- **fase-03** tambem depende de **plano02 fase-01** — usa `seam` no sentido tecnico. Sem isso, o
  teste do seam correto vira prosa.
