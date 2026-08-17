# Memory: Plano 11 — Absorcoes Finais

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fases 01 e 02 concluidas (2026-08-14) — fase 03 pendente
**Branch:** `feat/absorcoes-finais` (a partir da `main` em `14b28d4`)

## Progresso

| Fase | Nome | Status | Arquivos | Depende de |
|---|---|---|---|---|
| 01 | `code-review` — 8 smells, direcao dupla, ponto fixo | **done** | 4/3 (+ notices) | plano01 fase-01 |
| 02 | `tdd` — tautologico, seams, divergencia | **done** | 3/2 (+ notices) | plano01 fase-01 + **plano02 fase-01** |
| 03 | `grill-with-docs` — ponteiro | planned | 0/1 | **plano05** |

**As tres fases sao independentes entre si.** Podem rodar fora de ordem conforme os outros planos
entregarem.

## Decisoes de implementacao (DI)

Formato: `DI-Plano11-faseNN-<slug>: <o que mudou e por que>`.

Tres ja sao obrigatorias:

- `DI-Plano11-fase01-diff-input` — **RESOLVIDA: passar o diff.** Medido antes de decidir: o
  `code-smell-detector` tem `tools: Read, Grep, Glob` — **sem `Bash`**, entao nao consegue buscar o
  diff sozinho, e a terceira opcao (o agente se vira) nao existe. O `verify-work` ja calcula a lista
  a partir de um `git diff`, e o ponto fixo do Passo 4 faz ele calcular um diff de verdade — entao o
  dado ja esta na mao de quem invoca.
  O input virou "arquivos modificados **mais o diff, quando houver**". E a parte que evita a linha
  morta: quando **nao** houver diff (caminho `git status`, arquivo novo nao rastreado), o `#13`
  **reporta-se como nao avaliado** em vez de adivinhar. O smell se auto-limita em vez de mentir.
  O `#12 Shotgun Surgery` fica detectavel so com a lista, porque e sobre espalhamento pelo conjunto.

- `DI-Plano11-fase01-linhas-caducas`: a fase citava `verify-work:126-128` para a base do diff. Real:
  **`:101-103`**. E a prioridade `1. Argumento fornecido → usar como escopo` **ja existia** — o
  argumento era tratado como escopo de caminho, nunca como ref git. O ponto fixo virou o sub-ramo
  `1a` (ref que resolve) com `1b` preservando o comportamento antigo, entao o default fica intacto
  sem precisar de branch novo no topo.

- `DI-Plano11-fase01-notices-4o-arquivo`: a fase lista 3 arquivos; sairam **4**. O
  `THIRD-PARTY-NOTICES.md` nao estava previsto, mas o `CONTEXT.md` obriga atribuicao para **todo**
  material portado, e os 8 smells vem com a forma (o-que-e → como-corrigir) e as duas regras da
  skill `code-review` da fonte.
  **Conflito garantido com o PR #31 (plano10):** os dois adicionam um bloco imediatamente antes do
  `#### MIT License` da secao do Matt Pocock. A resolucao e **manter os dois blocos** — sao aditivos e
  nao se sobrepoem. Nao tentar regenerar: e prosa, nao artefato gerado.

## Teste retroativo (fase-01) — RODADO, e dois dos 8 dispararam

Alvo: `git diff main...feat/wayfinder` — o codigo do plano10, mudanca real de 1.735 linhas em 19
arquivos. A pergunta do checklist era *"algum dos 8 novos disparou?"*, com a instrucao de registrar o
motivo caso nenhum disparasse.

**`#12 Shotgun Surgery` — achado real e acionavel.** O commit `430363f` ("distribui
wayfinder-frontier") e **uma mudanca logica** — adicionar um arquivo ao scaffold — e forcou edicao em
**4 lugares a mao**: `template-manifest.ts` (a entrada), `template-manifest.test.ts` (a contagem
`14 → 15`, hardcoded), `package.json.tpl` (o script) e `tests/package-json-scripts.test.ts` (o
assert). A contagem hardcoded e a peca que garante o espalhamento: derivar de `TEMPLATE_MANIFEST` em
vez de fixar o numero mataria uma das quatro edicoes. **Candidato a follow-up** — nao corrigido aqui,
que e escopo do plano10 e vive noutro PR.

**`#14 Speculative Generality` — achado menor, verificado.** `export const STALE_CLAIM_MS` em
`scripts/wayfinder-frontier.ts` nao tem **nenhum** caller externo (grep na branch inteira, fora do
proprio arquivo, volta vazio). Exportado para um consumidor hipotetico.

**`#13 Divergent Change` — limitrofe, registrado como tal.** O mesmo commit editou
`wayfinder-frontier.ts` por dois motivos (tirar `js-yaml`; traduzir a saida), mas ambos descendem da
unica decisao "distribuir". Nao reportado como achado.

**Conclusao:** as descricoes sao acionaveis — dois dos oito dispararam num diff real, ambos
confirmados por medicao e nao por leitura. O checklist previa o caso contrario; nao foi necessario.
- `DI-Plano11-fase02-tautologico-canonico` — **RESOLVIDA: canonica no `tdd-workflow`, o agente cita.**
  A secao `## Assertions Tautologicas` da skill carrega a definicao, as duas formas, os exemplos e o
  remedio; o `tdd-verifier` ganha a **Regra 3b** com so a *forma de deteccao* e um ponteiro de volta.
  Razao: sao trabalhos diferentes, nao o mesmo texto duas vezes — a skill **previne** (e prevenir
  exige o raciocinio), o agente **reconhece** (e reconhecer exige a forma inline, porque ele roda
  isolado). E a direcao do ponteiro agente → doc ja e a estabelecida no repo: o `tdd-verifier` ja
  cita `docs/design-docs/subagent-contract-v1.md`. O inverso (skill apontando para as regras internas
  de um agente) inverteria a hierarquia.

## Teste da afiacao (fase-02) — RODADO, e a afiacao se paga

O checklist pedia construir um tautologico-por-recomputacao que **passaria** no `tdd-verifier` de
hoje — com a instrucao de registrar, caso nao fosse possivel, que a versao trivial ja cobria.

**Foi possivel, e o exemplo veio de codigo real deste repo** (`scripts/wayfinder-frontier.ts`):

```ts
expect(normalizeId('7')).toBe('7'.padStart(3, '0'))
```

**Por que passa na Regra 3 atual:** ela proibe uma lista fechada (`expect(true).toBe(true)`, snapshot
vazio, `expect(undefined).toBeUndefined()` sem setup) e exige *"assertion sobre resultado concreto do
codigo em teste"*. O exemplo **satisfaz a exigencia** — assere sobre o retorno concreto de
`normalizeId` — e nao esta na lista. Passa limpo.

**E por que e tautologico mesmo assim:** o esperado e produzido pela mesma operacao que a
implementacao usa. Trocar `padStart(3)` por `padStart(4)` no codigo muda o teste junto e ele
**continua verde**. Nenhum bug de `normalizeId` sobrevive a esse teste — porque nenhum bug o quebra.

**Conclusao: a afiacao se paga.** A Regra 3b entrou com o alerta que a distingue da Regra 3 —
*isto parece um teste legitimo; procurar deliberadamente, nao esperar saltar aos olhos.*

- `DI-Plano11-fase02-termo-acordad`: o MEMORY listava `acordad` entre os termos ausentes a preencher.
  O texto ficou com **`confirmado`** ("nenhum teste e escrito num seam nao confirmado") e **`acordar`**
  ("acordar os seams antes"), entao um grep por `acordad` volta 0. O conceito esta la; o termo do
  plano era proxy. Nao re-abrir por causa do grep.

- `DI-Plano11-fase02-notices`: terceiro arquivo de novo, pela mesma razao da fase-01 — atribuicao
  obrigatoria. Inclui a **divergencia** do DI-36 na secao `Not ported`, para que o registro exista
  tambem no doc de licenca, e nao so dentro da skill.
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
