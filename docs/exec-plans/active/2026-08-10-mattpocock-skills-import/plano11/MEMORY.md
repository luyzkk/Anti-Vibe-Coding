# Memory: Plano 11 — Absorcoes Finais

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada

## Progresso

| Fase | Nome | Status | Arquivos | Depende de |
|---|---|---|---|---|
| 01 | `code-review` — 8 smells, direcao dupla, ponto fixo | planned | 0/3 | plano01 fase-01 |
| 02 | `tdd` — tautologico, seams, divergencia | planned | 0/2 | plano01 fase-01 + **plano02 fase-01** |
| 03 | `grill-with-docs` — ponteiro | planned | 0/1 | **plano05** |

**As tres fases sao independentes entre si.** Podem rodar fora de ordem conforme os outros planos
entregarem.

## Decisoes de implementacao (DI)

Formato: `DI-Plano11-faseNN-<slug>: <o que mudou e por que>`.

Tres ja sao obrigatorias:

- `DI-Plano11-fase01-diff-input`: `Divergent Change` precisa saber **o que** mudou em cada arquivo,
  nao so que mudou. Passar o diff alem da lista de arquivos, ou deixar o smell de fora ate o input
  mudar? Adicionar a descricao sem mudar o input e adicionar linha morta.
- `DI-Plano11-fase02-tautologico-canonico`: a definicao afiada entra em `tdd-verifier` (pegar depois)
  **e** em `tdd-workflow` (evitar enquanto escreve). Onde fica a canonica, e quem cita?
- `DI-Plano11-fase03-gate`: o registro no glossario cabe no gate de sintetizar-e-confirmar (Passo 4.5
  do `grill-me`), ou precisa de confirmacao propria?

## Estado verificado (2026-08-10)

### Smells — 9 nossos vs 12 da fonte

| | Smells |
|---|---|
| So nossos (5) | Funcoes Longas · God Objects · Condicionais Gigantes · Numeros Magicos · Comentarios Inuteis |
| Comuns (4) | Feature Envy · Data Clumps · Primitive Obsession · Duplicated Code |
| So dele (8) | Mysterious Name · Repeated Switches · **Shotgun Surgery** · **Divergent Change** · **Speculative Generality** · Message Chains · Middle Man · Refused Bequest |

Resultado: detector vai de **9 para 17**.

### O eixo Spec ja existia (TR-03)

`agents/code-reviewer.md:18` — *"o codigo faz o que a spec ou task diz?"*
`agents/code-reviewer.md:35` — *"leia a spec, task ou PRD relacionados antes de revisar"*

Falta so a **direcao inversa**: comportamento que a spec **nao** pediu.

### Base do diff

`verify-work:126-128` — `git diff --name-only HEAD~1` → staged → `git status`. Cobre "o que acabei
de fazer". Nao cobre "revise esta branch inteira".

### `tdd-workflow` — o que nao tem

Grep em `skills/tdd-workflow/SKILL.md`: zero hits para `tautolog`, `seam`, `acordad`, `horizontal`.
`refactor` so aparece na description, como parte de RED-GREEN-REFACTOR.

`agents/tdd-verifier.md:82` tem tautologia — **so a versao trivial** (`expect(true).toBe(true)`,
snapshot vazio).

## DI-36 — a divergencia consciente

A fonte poe refactoring fora do ciclo, na etapa de review. **Rejeitamos e mantemos
RED-GREEN-REFACTOR.**

Argumento: refatorar com teste verde na mao **e** a rede de seguranca que torna o refactor seguro, e
e o momento em que o codigo esta mais fresco. Empurrar para a review separa o momento em que voce
entende o codigo do momento em que voce o melhora.

Observacao honesta que entra junto: a preocupacao da fonte e legitima — refactor grande escondido
num commit de feature. Mas nosso remedio e outro: `git-workflow-and-versioning` ja pede atomicidade.
**E problema de granularidade de commit, nao de posicao no ciclo.**

**Registrar como divergencia, nunca omitir.** Sem isso, quem comparar as duas skills vai achar que
passou batido.

## Testes que podem dar resposta inconveniente

| Fase | Teste | Se der negativo |
|---|---|---|
| 01 | Rodar o detector com 17 smells num PR real. Algum dos 8 novos disparou? | ou o repo e limpo nessas dimensoes, ou a descricao nao esta acionavel — registrar qual |
| 02 | Construir um teste tautologico-por-recomputacao que **passaria** no `tdd-verifier` atual | se nao conseguir construir, a versao trivial ja cobria e a afiacao nao se paga |

## Gates

- **fase-03 nao roda antes do plano05.** `domain-modeling` precisa existir e `docs/GLOSSARY.md`
  precisa estar no scaffold, senao o ponteiro e link morto e o `harness:validate` quebra.
- **fase-02 precisa do plano02 fase-01.** Sem o vocabulario, `seam` vira sinonimo vago de "lugar
  onde testar".
