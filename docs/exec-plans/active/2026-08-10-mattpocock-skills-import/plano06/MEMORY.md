# Memory: Plano 06 — Loop-First no `incident-response`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente) · plano02 fase-01 (vocabulario de `seam`, so a fase-03)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Reenquadrar + a fase do loop | planned | 0/5 |
| 02 | O miolo | planned | 0/1 |
| 03 | A saida | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano06-faseNN-<slug>: <o que mudou e por que>`.

(vazio — nada executado ainda)

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
