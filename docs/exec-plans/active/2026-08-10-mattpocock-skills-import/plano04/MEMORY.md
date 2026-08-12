# Memory: Plano 04 — Modelo de Frontier no `grill-me`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (o conceito de *premature completion* que justifica DI-15)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Absorver design tree / frontier / rounds | planned | 0/1 |
| 02 | Teste de paridade do contrato | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano04-faseNN-<slug>: <o que mudou e por que>`.

(vazio — nada executado ainda)

## Estado do alvo antes da mudanca

`skills/grill-me/SKILL.md` — **463 linhas, zero teste.**

Estrutura atual: Loading Constraints · Objetivo · Passo 1 (descricao) · Passo 1.5 (hipotese +
confianca) · Passo 2 (explorar codebase) · Passo 3 (perguntas, min 5 / max 20) · Guia por categoria
(7) · Priorizacao por tipo de feature · Passo 4 (respostas vagas) · Passo 4.5 (sintetizar e
confirmar) · Condicao de Parada (95%) · Passo 5 (gerar CONTEXT.md) · Passo 6 (proximo passo) ·
Passo 7 (learn point) · Pipeline Integration.

Consumidores da saida (nao podem quebrar — INV-01):
- `skills/write-prd/SKILL.md` — le e importa as decisoes indexadas
- `skills/design-twice/SKILL.md:50` — importa para reaproveitar decisoes

Padrao de teste a seguir: `tests/plan-feature-template.test.ts` e `tests/quick-plan-template.test.ts`
— paridade de secoes com gate "nunca diminuir".

## Contagem de consumidores (para reavaliar DI-14)

Hoje, mencoes a entrevista por skill:

| Skill | Mencoes |
|---|---|
| `grill-me` | 17 |
| `write-prd` | 6 |
| `consultant` | 2 |
| `quick-plan` | 1 |

DI-14 adiou a extracao do primitivo porque 2 consumidores pesados nao pagam uma description
permanente. **Reavaliar quando `wayfinder` ou `improve-codebase-architecture` entrarem** — a fonte
tem 5 consumidores, e com esses dois nos teriamos 4-6.

## Riscos a observar na execucao

- **Fronteira que nao esvazia.** Sem teto de 20, feature mal escopada gera fronteira crescente. A
  fase-01 exige instrucao de parar apos 2 rodadas que produzam mais fronteira do que resolvem, e
  nomear o problema de escopo ao usuario.
- **Categorias virando decorativas.** Design tree conduzindo pode nunca ramificar para seguranca.
  Por isso as 7 entram como **sementes** da arvore, nao como lista paralela.
- **Sprawl.** 463 linhas ja e muito. A reescrita substitui a varredura sequencial pelo modelo
  estrutural — deveria sair no maximo neutra em tamanho, nunca maior.

## Gates entre fases

- **fase-01 -> fase-02:** o teste e escrito contra o comportamento novo. Escrever antes travaria o
  comportamento antigo.
- **dentro da fase-02:** RED validado a mao (remover uma secao, ver falhar, restaurar) antes de
  declarar o teste pronto. Registrar aqui que foi feito.
