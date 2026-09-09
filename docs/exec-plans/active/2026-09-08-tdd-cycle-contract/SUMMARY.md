# Summary: Contrato Único do Ciclo TDD por Fase

**Escrito:** 2026-09-09
**Duração:** 2026-09-08 → 2026-09-09
**Status:** entregue e mergeado na `main`; **uma premissa do PRD segue em aberto** (ver §Em aberto)
**Planos:** 2 (01 completed 3/3; 02 com as fases de código 3/3, fase-04 parcial)
**Fases:** 7 (6 done, 1 parcial, 0 skipped, 0 blocked)
**Merge:** PR #79 (`1383881`) e PR #80 (`38765c4`), nesta ordem

---

## O problema que a feature atacou

O ciclo TDD tinha **três definições** no plugin — na skill `tdd-workflow`, no `fase-template.md` e no
`plan-executor.md` — que já divergiam entre si. Pior: nenhuma delas era executada. O `plan-verifier`
declarava, na própria seção `## Composition`, que o `execute-plan` o invocava no Step 5 pós-fase, e
**ninguém o spawnava**. O REFACTOR era "opcional". E 189 de 443 fases geradas não tinham RED nenhum.

---

## O que foi construído

### Plano 01 — Fonte e contrato (3/3 fases)

O ciclo passou a ter **uma** definição, em `skills/tdd-workflow/SKILL.md` §`## Contrato do Ciclo por
Fase`: os três tipos de fase (comportamento, risco, sem-comportamento) × RED / GREEN / RED-check /
REFACTOR, mais o mapa nível → gate. Os consumidores deixaram de parafrasear e passaram a apontar:

- `fase-template.md` bloco `### TDD` ganhou `Tipo de fase`, os quatro checkboxes, e os campos
  `Defesa a mutar` / `Teste que deve cair` que o RED-check consome
- `plan-readme-template.md` §TDD Strategy virou ponteiro — a terceira cópia do ciclo morreu
- `agents/plan-executor.md` §TDD incorporou stub-first, "teste que nasce verde exige mutação no mesmo
  passo" e REFACTOR em commit próprio
- `plan-feature` Step 9 passou a **obrigar** o planejador a nomear a defesa e a **proibir** prever a
  mensagem de erro
- `docs/references/tdd-cycle-checklist.md`: o REFACTOR deixou de ser "(opcional)"

### Plano 02 — O ciclo roda no execute-plan (fases 01–03)

O Step 4c do `execute-plan` virou uma sequência de sete passos, 0 a 6:

| # | Passo | O que produz |
|---|---|---|
| 0 | Resolver nível | `tdd_level` (argumento → `user_profile` → default Assistido) |
| 1 | RED | subagente isolado escreve o teste que falha |
| 2 | RED confirmado pelo orquestrador | `red_confirmed`, e o commit que preserva a evidência |
| 3 | Gate humano | `human_gate`, com `AskUserQuestion` |
| 4 | GREEN + REFACTOR | `refactor`, commit `refactor(` próprio ou motivo |
| 5 | RED-check por mutação | `red_check`, com defesa e teste nomeados |
| 6 | VERIFY | spawn do `plan-verifier`, `custo`, e o commit de fechamento |

Cada campo da linha do STATE log tem um passo que o escreve. O §Composition do `plan-verifier` deixou
de mentir: agora diz "Step 4c passo VERIFY", e a causa foi corrigida junto com o texto.

### O gate que protege tudo isso

`tests/fase-template-tdd-contract.test.ts` cresceu de **2 para 43 assertions**. É um gate "nunca
diminuir": cada assertion falha se a regra que ela guarda for removida, e a mensagem de falha explica
por que a regra existe e manda restaurá-la em vez de apagar o teste.

---

## Decisões de Implementação (consolidado)

As que valem além desta feature:

- **A defesa se prova por mutação, não por teste verde.** O RED-check nomeia um alvo de produção,
  aplica a mutação, exige que o teste nomeado caia, restaura e exige diff vazio. Um teste verde não
  distingue "a defesa existe" de "a assertion é vácua".
- **Quem verifica não é quem implementa (D3).** O orquestrador muta e restaura; o `plan-verifier`
  confere read-only. Mudar o contrato read-only do verifier custaria mais que o ganho de independência.
- **O gate humano default é Assistido (D2):** para em fase `[RISCO]` e no tracer bullet, não em toda
  fase. Guiado mata a autonomia; Direto deixa spec errada passar até o `verify-work`.
- **O REFACTOR é do mesmo subagente do GREEN (D4)**, em commit separado — ele tem código e testes
  frescos no contexto, e um terceiro spawn por fase custaria tokens e perderia esse contexto.
- **Fase sem comportamento não é isenta (D5):** ganha gate textual com o mesmo RED-check (remover o
  alvo, ver o gate cair, restaurar).
- **O planejador nomeia a defesa, nunca a mensagem de erro (D6).** Em três ocasiões o real divergiu do
  previsto, e o incentivo era reportar o esperado.
- **RF-05 fica sempre ligado (DI-8).** O `plan-verifier` custou entre 17% e 33% da fase conforme a
  unidade contada, medido em quatro fases — mas todas menores ou iguais ao tracer bullet, o denominador
  mínimo. Como o custo do verifier por fase é quase fixo, essa fatia é **teto**, não valor típico.

---

## O argumento que a feature provou nela mesma

**Três defeitos reais do Step 4c passaram por escrita, revisão, dezenas de assertions de paridade e
três RED-checks por fase sem aparecer. Os três só apareceram quando o ciclo rodou num projeto real.**

| # | Defeito | Como apareceu |
|---|---|---|
| 1 | A pré-condição do passo 5 era **inatingível**: o passo 2 grava o STATE antes do gate, o STATE vive no repo do projeto, então `git diff --stat` nunca ficava vazio | r1, travando no fixture |
| 2 | A evidência do `red_check` **nunca entrava no histórico** — o 4c escrevia no STATE e não mandava commitar | apontado pelo **próprio `plan-verifier`** que a fase-03 mandou spawnar |
| 3 | O passo 6 spawna o verifier **antes** de commitar a linha que manda ele ler, então o verifier lê sempre uma linha que só existe na working tree | r2 e r3, reproduzido **3× em 3 verificações**, com verdict `request_changes` e severidade `high` |

O terceiro é o mais instrutivo: é a mesma classe do segundo, um nível acima. O fix do segundo fez a
evidência **chegar** ao histórico; não fez chegar **antes de quem a lê**. E nenhuma das 40 assertions
pegava isso, porque todas provam que o texto existe e **nenhuma prova em que ordem**.

Gate de paridade prova texto. Dogfood prova execução. O PRD estava certo em exigir os dois.

---

## Bugs e Gotchas (consolidado)

Os generalizáveis, que valem para qualquer feature deste plugin:

- **Antes de confiar num `toContain`, conte as ocorrências do token na seção alvo.** Três assertions
  nasceram vácuas na fase-01 do Plano 02 porque o token asserido aparecia duas vezes: na regra e dentro
  da mensagem de erro que a própria regra emite. Auditar primeiro, mutar depois — mutação sozinha só
  acha o que você lembrou de mutar.
- **A contagem de ontem não vale amanhã.** No próprio fix final, `docs(state)` passou de 2 para 4
  ocorrências no bloco. Uma fase seguinte que escrevesse `toContain('docs(state)')` nasceria vácua.
- **Quando várias fases asseram sobre o mesmo bloco, o RED-check de cada uma tem de re-rodar TODAS as
  defesas do bloco.** O GREEN da fase-03 resgatou, em silêncio, duas assertions da fase-02 que estavam
  corretas quando escritas. Rodar só as da fase corrente teria fechado a fase com o gate mudo em dois
  pontos.
- **`[\s\S]*?` sem limite envelhece mal em bloco que cresce.** Não-guloso não significa "próximo": ele
  vai até onde precisar para casar. Use limite explícito e **calcule** N.
- **Número escrito em doc de fase é chute.** Sete previsões erradas nesta feature — linhas, contagens de
  pass/fail, contagens de grep. E vale também para número que a **sua própria ferramenta** produz: a
  primeira leitura da varredura final acusou 7 assertions "sem cobertura" que eram falso positivo do
  enumerador.
- **Num prompt que manda escrever e depois manda ler, a ordem dos bullets é o contrato.** Sempre que um
  passo produz um artefato e um passo seguinte o consome, confira se a instrução de **persistir** vem
  antes da instrução de **consumir**.
- **Ferramenta:** `diff`/`cmp` bruto mente sobre arquivo do repo (CRLF); o `generate:manifest` bumpa
  `lastModified` de arquivo não tocado, então o manifest se confere por **checksum**; e barra invertida
  dobrada dentro de heredoc entregue ao Python por stdin chega colapsada, virando TAB e BEL.

---

## Uma mudança de método que vale carregar adiante

Na correção final, a regressão do "re-rodar todas as defesas" deixou de ser uma **lista de mutações
escolhidas a dedo** e virou uma **varredura**: apagar uma linha por vez das 118 do bloco, rodando o gate
a cada deleção, com `git restore` entre elas.

Resultado: das 16 assertions cujo corpo lê o bloco, **as 16 caem por pelo menos uma deleção**. Nenhuma
vácua.

A diferença importa. A lista prova que as defesas **de que você lembrou** estão guardadas. A varredura
prova que **nenhuma** assertion do bloco sobrevive a toda deleção de linha — que é exatamente o buraco
que a auditoria de multiplicidade descreve. Custou um script de quinze linhas e cerca de quatro minutos.

---

## Desvios dos Planos

- **DEV-1:** o Plano 02 foi para branch própria, empilhada sobre a do Plano 01, para que os commits não
  caíssem na PR do Plano 01. No merge, a #80 precisou ser **retargetada para a `main`** depois que a #79
  entrou — sem isso o Plano 02 teria ficado só na branch intermediária.
- **DEV-2:** um commit a mais na fase-01 do Plano 02, para consertar as três assertions vácuas em diff
  legível isolado.
- **DEV-3:** a rodada r2 do dogfood nasceu com a mutação inofensiva já aplicada, em vez de editar o
  template entre rodadas — tira um passo manual do meio e elimina o risco de esquecer de restaurar.

---

## Métricas Consolidadas

| Métrica | Valor |
|---------|-------|
| Planos | 2 |
| Fases | 7 (6 done, 1 parcial) |
| Assertions no gate de paridade | 2 → **43** |
| Suite | 2144 (baseline) → **2187 pass, 0 fail** |
| RED-checks executados | 13 no Plano 01 (3 + 5 + 5). No Plano 02, dezenas entre nomeados e re-provas, mais três regressões completas do bloco: 15 defesas duas vezes, 19 defesas uma vez, e a varredura de 118 deleções |
| RED-checks que FALHARAM | **5**, todos no gate de paridade — assertions nascidas ou tornadas vácuas. Todos corrigidos e re-provados |
| Bugs de código | 0 |
| Defeitos do 4c achados **só** pelo dogfood | **3** |
| Retries | 0 |
| Rodadas de dogfood | 3 (r1, r2, r3), todas contaminadas para a Premissa 1 |

---

## Em aberto

**A Premissa 1 do PRD segue sem resposta:** *"o orquestrador do execute-plan segue o SKILL.md como
prompt, então mudar o 4c muda o comportamento real."*

As três rodadas de dogfood foram executadas por agentes que já sabiam o desfecho — a r1 pelo agente que
escreveu o 4c, a r2 e a r3 por um que tinha lido o roteiro, e o roteiro lista o resultado esperado de
cada rodada. Elas valem para o mecânico, e nesse plano entregaram: a fase bloqueia quando a defesa não
é provada, a fase dependente não inicia, o nível `direto` pula o gate sem desligar o RED-check nem o
verifier, e o CA-SEC de uma fase de risco se confirma por mutação. Não valem como resposta à Premissa 1.

Para respondê-la é preciso uma **sessão limpa**: cwd numa cópia nova do fixture-template em `F:\tmp\`,
e nada colado na sessão além do comando. Os três fixtures existentes estão consumidos.

Duas outras coisas ficam registradas e não foram feitas:

- **Quatro lacunas menores do 4c** (DI-9): o texto não diz se o passo 6 roda quando `red_check: fail`;
  `blocked` não existe no vocabulário do STATE que o Step 2 define; `human_gate: stopped` é ambíguo para
  o verifier, que não recebe o 4c; e os checkboxes do bloco `### TDD` da fase nunca são marcados por
  ninguém.
- **Um bug fora do escopo**, achado no dogfood: `hooks/tdd-gate-bash.cjs` resolve o caminho do
  teste-irmão contra o cwd original da sessão, não contra o cwd do comando. Merece PRD próprio.

---

## Referências

- PRD: [./PRD.md](./PRD.md) — premissas, decisões técnicas D1–D6, critérios de aceite
- Plano overview: [./PLAN.md](./PLAN.md)
- Memória do Plano 01: [./plano01/MEMORY.md](./plano01/MEMORY.md) — DI-1..DI-5, GT-1..GT-7
- Memória do Plano 02: [./plano02/MEMORY.md](./plano02/MEMORY.md) — DI-1..DI-10, GT-1..GT-9
- Log do ciclo por fase, com a evidência literal: [./STATE.md](./STATE.md)
