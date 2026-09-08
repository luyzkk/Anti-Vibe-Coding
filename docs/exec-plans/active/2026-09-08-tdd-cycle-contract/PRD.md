---
slug: tdd-cycle-contract
date: 2026-09-08
status: approved
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): default Assistido — PRD tdd-cycle-contract D2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Contrato Único do Ciclo TDD por Fase

**Status:** Approved
**Author:** Luiz + AI
**Date:** 2026-09-08
**Context:** conversation (análise de 2026-09-08; memória `project_tdd-pipeline-gaps_2026-09-08.md`)

---

## Problema

O plugin tem **duas definições de TDD** que não batem.

A skill `/anti-vibe-coding:tdd-workflow` define o ciclo completo: RED com stub-first e falha por
assertion, aprovação humana dos testes antes do GREEN (`SKILL.md:460`), GREEN isolado sem ver os
requisitos, REFACTOR como passo 5, e a posição registrada "Refactor Fica no Ciclo — Divergência
Consciente". A referência `references/ia-tdd-workflow.md` é, passo a passo, o ciclo de 10 passos
do André Darcie, com audit crítico e refactor nos passos 7 e 8.

O pipeline `/execute-plan` usa **outra** definição. O bloco `### TDD` de
`skills/plan-feature/templates/fase-template.md` tem só dois checkboxes, RED e GREEN. O Step 4c de
`skills/execute-plan/SKILL.md` spawna um subagente RED e um subagente GREEN, e acabou: não há
REFACTOR, o orquestrador não roda o teste entre os dois para confirmar que a falha é por assertion,
não há gate humano sobre o teste, e o `plan-verifier` é parseado no 4d mas nunca é spawnado no 4b/4c.
O template cita a skill zero vezes.

O efeito é mensurável nas fases já geradas neste repositório:

| Fases geradas (ativas + concluídas) | 443 |
|---|---|
| Com checkbox RED | 254 |
| Com checkbox GREEN | 245 |
| Com passo REFACTOR | 46 |
| Com RED-check ou mutação explícita | 37 |

O REFACTOR aparece em uma fase a cada cinco, sempre por iniciativa do subagente planejador. O
RED-check só existe nas fases recentes do `route-auth-matrix`, escrito à mão depois da lição
`docs/compound/2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md`.

Por que importa: o ciclo RED→GREEN prova que o código faz o que o teste pede. Ele **não** prova que
o teste pede a coisa certa, e não prova que o teste testa a defesa que diz testar. Quando a spec
codifica uma permissão errada, o RED a transcreve, o GREEN a implementa, e o pipeline fica verde.
Nada no execute-plan mostra o teste ao humano antes de ele virar contrato, e nada prova por mutação
que a defesa existe. O SUMMARY do shift-left registra "verificação que passa pelo motivo errado" três
vezes numa só feature; o handoff do route-auth-matrix diz que vários testes passaram pelo motivo
errado até o RED-check ser feito.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- Toda fase gerada por `/plan-feature` carrega o **mesmo ciclo** que `/tdd-workflow` define: RED,
  GREEN, RED-check e REFACTOR, e o tipo da fase decide a variante.
- O ciclo tem **uma** definição, na skill `tdd-workflow`; template e executor apontam para ela em
  vez de parafraseá-la.
- O `/execute-plan` **para para o humano aprovar o teste RED** exatamente onde o nível manda.
  Default Assistido: fase `[RISCO]` e tracer bullet. É onde a spec errada morre barato.
- Depois do GREEN, a defesa é **provada por mutação nomeada** pelo orquestrador: muta, vê o teste
  cair, restaura, prova diff vazio. Teste que não cai bloqueia a fase.
- O `plan-verifier` roda por fase, read-only, e confere o que já sabe conferir mais a evidência do
  RED-check.
- Um **teste de paridade** impede que o template diminua ("gate de paridade é teste, não doc").

### Mecanismo (algorítmico — o COMO)

**1. Fonte única.** `skills/tdd-workflow/SKILL.md` ganha a seção `## Contrato do Ciclo por Fase`.
Ela define os três tipos de fase e o que cada um exige:

| Tipo | RED | GREEN | RED-check | REFACTOR | Gate humano |
|---|---|---|---|---|---|
| comportamento | stub-first, falha por assertion | isolado, sem PRD | muta a defesa nomeada, teste cai, restaura | commit próprio ou "sem mudança: motivo" | conforme nível |
| risco `[RISCO]` | Abuse-It primeiro, depois o resto | idem | idem, obrigatoriamente sobre a defesa do abuso | idem | sempre em Assistido e Guiado |
| sem comportamento | gate textual (grep/estrutura) visto falhando | aplicar | remover o alvo, gate cai, restaurar | n/a | conforme nível |

E o mapa nível → onde o orquestrador para:

| Nível | Para antes do GREEN em |
|---|---|
| Guiado | toda fase |
| Assistido (default) | fase `[RISCO]` e fase 01 do plano 01 (tracer bullet) |
| Direto | nunca; só RED-check automático |

**2. Template.** O bloco `### TDD` de `fase-template.md` passa a ter `**Tipo de fase:**` e quatro
checkboxes. O RED-check carrega dois campos que o planejador preenche: `Defesa a mutar:` (qual
linha/condição remover ou inverter) e `Teste que deve cair:` (nome do teste). O planejador **não**
escreve a mensagem de erro esperada: número e mensagem previstos são chute, o que vale é qual
assertion quebra (compound 2026-09-06). Comentário HTML no bloco aponta para a seção-fonte.

**3. Execute-plan 4c.** O ciclo por fase passa a ser:

```
resolver nível: --tdd-level | user_profile na memória | default Assistido
RED   (subagente, contexto isolado, como hoje)
      orquestrador roda o teste da fase
        falha por assertion        → segue
        module-not-found / compila → bloqueia: "falta stub-first" (tdd-cycle-checklist)
      se o nível manda parar nesta fase → AskUserQuestion mostrando o teste: "este é o contrato; confirma?"
GREEN (subagente, recebe só os testes, como hoje)
      no mesmo subagente, passo 2: REFACTOR com testes verdes, commit refactor(...) separado
      ou relatório "sem refactor: {motivo}"
RED-CHECK (orquestrador)
      aplica `Defesa a mutar` → roda `Teste que deve cair` → exige falha
      restaura → `git diff --stat` vazio → registra no STATE log
      teste não caiu → fase blocked, DI "teste não prova a defesa", não avança
VERIFY (spawn plan-verifier, read-only)
      acceptance_met, tests_pass, tdd-red-commit-found, red-check-evidence (lê o STATE log)
      4d já parseia o envelope; nada muda lá
```

**4. Executor.** `agents/plan-executor.md` seção "TDD no Ciclo Red-Green-Refactor" passa a
referenciar o contrato e incorpora o que hoje só vive em compound: stub-first, "teste que nasce
verde exige mutação no mesmo passo", REFACTOR em commit próprio. O executor **não** faz o RED-check
final (é do orquestrador); ele reporta no envelope qual defesa implementou, para o orquestrador mutar.

**5. Paridade.** `tests/fase-template-tdd-contract.test.ts`, no molde de
`tests/write-prd-contract.test.ts`: lê os arquivos do repo e exige os quatro checkboxes e o campo de
tipo no template, a seção-fonte na skill, o RED-check e o mapa de nível no 4c, o REFACTOR em commit
próprio no executor. Remover qualquer um deles derruba o teste.

---

## Requisitos Funcionais

### Must Have (maximo 40% do total)
- [ ] RF-01: `skills/tdd-workflow/SKILL.md` tem a seção `## Contrato do Ciclo por Fase` com os três
      tipos de fase e o mapa nível → gate, e é a única definição do ciclo no plugin.
- [ ] RF-02: `fase-template.md` bloco `### TDD` tem `Tipo de fase` e os checkboxes RED, GREEN,
      RED-check (com `Defesa a mutar` e `Teste que deve cair`) e REFACTOR, apontando para RF-01.
- [ ] RF-03: `execute-plan` Step 4c: orquestrador confirma a falha do RED por assertion, para para o
      humano conforme o nível (default Assistido), executa o RED-check por mutação com restauração
      provada, e trata "teste não caiu" como blocker.
- [ ] RF-04: teste de paridade que falha se qualquer item de RF-01, RF-02 ou RF-03 for removido.

### Should Have
- [ ] RF-05: `plan-verifier` spawnado por fase no 4c, read-only, com o check `red-check-evidence`.
- [ ] RF-06: `plan-executor.md` referencia o contrato e incorpora stub-first, "nasce verde → muta no
      mesmo passo" e REFACTOR em commit próprio; reporta a defesa implementada no envelope.
- [ ] RF-07: `plan-feature` Step 9 (regras do subagente de planejamento) exige preencher `Defesa a
      mutar` e `Teste que deve cair` em toda fase de comportamento ou risco, e proíbe prever a mensagem.
- [ ] RF-08: argumento `--tdd-level guiado|assistido|direto` no `/execute-plan`.

### Could Have
- [ ] RF-09: nível persistido em `user_profile` na memória do projeto (a skill já prevê esse sinal).
- [ ] RF-10: learn point no execute-plan sobre "por que mutação, e não teste verde, prova a defesa".

### Won't Have (desta versao)
- Âncora `.claude/.tdd-phase.json` escrita por hook, chaves mortas de `config/tdd-gate.json`
  (`max_tests_per_cycle`, `require_assertion_failure`, AI Judge) e pré-commit morto em
  `hooks/hooks.json`. É outro problema (honestidade de config) e vira PRD próprio.
- Ligar `doubt-driven-development` ao Step 4 do `write-prd`. Ataca a spec, não o ciclo.
- Mutation testing automático do `verify-work` ligado por default. O RED-check nomeado cobre a fase;
  mutação ampla continua opt-in.
- Mudar o contrato read-only do `plan-verifier`. Quem muta é o orquestrador (D3).

---

## Requisitos Nao-Funcionais

- **Performance:** custo extra por fase de comportamento: uma rodada de teste no RED, uma no
  RED-check, um spawn de `plan-verifier`. Registrar no diagnóstico pós-fase (Step 5) para o dev ver o
  preço. Nível Direto e `--tdd-level` são a válvula.
- **Seguranca:** nenhum gatilho de risco disparado — seção Ameaças & Dados omitida. A feature toca
  markdown de skill, template e um teste; sem auth, PII, input externo, upload, pagamento ou terceiro.
- **Acessibilidade:** não se aplica, sem UI.
- **Observabilidade:** o `STATE.md` log registra por fase: `red_confirmed: assertion|blocked`,
  `human_gate: stopped|skipped(nivel)`, `red_check: pass|fail (defesa: X, teste: Y)`,
  `refactor: commit <hash>|none (motivo)`. Falha de RED-check vira DI no `MEMORY.md` do plano.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Onde mora a definição do ciclo | Seção na skill `tdd-workflow` | Arquivo novo `skills/lib/tdd-cycle-contract.md` importado por todos | A skill já é onde o ciclo vive e onde o humano o lê; um arquivo lib seria a terceira cópia, não a fonte |
| 2 | Nível default do gate humano | Assistido: para em `[RISCO]` e tracer bullet | Guiado (toda fase) / Direto (nunca) | Guiado mata a autonomia do execute-plan; Direto deixa spec errada só para o verify-work. Assistido para onde o erro custa caro. Decisão de Luiz, 2026-09-08 |
| 3 | Quem executa o RED-check | Orquestrador muta e restaura; `plan-verifier` confere read-only | `plan-verifier` muta | O verifier tem contrato "nunca modifica código" e não tem Write/Edit; mudar isso custa mais que o ganho de independência. Orquestrador não é o implementador, então a regra "quem verifica, não quem implementa" é respeitada. Decisão de Luiz, 2026-09-08 |
| 4 | Quem faz o REFACTOR | O mesmo subagente GREEN, como segundo passo, em commit separado | Subagente REFACTOR dedicado | O GREEN tem os testes e o código frescos no contexto; um terceiro spawn por fase custa tokens e perde esse contexto. A skill já diz que refactor com teste verde na mão é o momento certo |
| 5 | Fase sem comportamento | Gate textual com o mesmo RED-check (remover alvo, gate cai, restaurar) | Isentar fases de doc/config do ciclo | 189 de 443 fases não tinham RED; isentar deixa 40% das fases sem verificação falsificável. O route-auth-matrix já pratica o gate textual |
| 6 | O que o planejador escreve no RED-check | `Defesa a mutar` + `Teste que deve cair` | Mensagem de erro esperada (`Expected 3, Received 0`) | Em três ocasiões o real divergiu do previsto e o incentivo era reportar o esperado (compound 2026-09-06) |

---

## Premissas a Validar

| # | Premissa (o que estamos apostando ser verdade) | Tier (Must/Should/Might) | Como validar |
|---|---|---|---|
| 1 | O orquestrador do execute-plan segue o SKILL.md como prompt, então mudar o 4c muda o comportamento real | Must | Dogfood: executar a primeira fase deste próprio plano com o 4c novo e ler o STATE log |
| 2 | `AskUserQuestion` no meio do 4c não quebra o fluxo de subagentes | Must | O execute-plan já usa AskUserQuestion no 3c e no 6a; confirmar que uma parada entre RED e GREEN preserva o STATE |
| 3 | Nenhum teste existente trava o bloco `### TDD` de `fase-template.md` | Must | Corrigida no planejamento (2026-09-08): `tests/` não tem, mas `skills/lib/__tests__/universal-principles.test.ts:50-57` lê o template e exige "Comment Provenance" + um comentário `// YYYY-MM-DD (x):`. Ambos vivem fora do bloco `### TDD`; toda fase que toca o template roda esse teste no checklist |
| 4 | Um spawn de `plan-verifier` por fase custa menos que o retrabalho que evita | Should | Medir tokens e tempo em 3 fases; se >30% do custo da fase, ligar só por nível |
| 5 | A mudança no checkout só vale depois do sync do cache do plugin | Must | `scripts/sync-to-global.sh` após merge; premissa 1 só é testável no cache sincronizado (memória `project_plugin-cache-stale-hooks`) |

---

## Criterios de Aceite

- [ ] CA-01: Dado `fase-template.md`, quando lido, então o bloco `### TDD` contém `Tipo de fase` e
      os checkboxes RED, GREEN, RED-check (com `Defesa a mutar` e `Teste que deve cair`) e REFACTOR.
- [ ] CA-02 (edge, RED-check do próprio gate): Dado o teste de paridade verde, quando um dos quatro
      checkboxes é removido do template, então o teste falha; restaurado, volta a passar.
- [ ] CA-03: Dado `skills/tdd-workflow/SKILL.md`, quando lido, então existe `## Contrato do Ciclo
      por Fase` com os três tipos e o mapa nível → gate, e `fase-template.md` e `plan-executor.md`
      apontam para ela pelo caminho.
- [ ] CA-04: Dado uma fase de comportamento, quando o subagente RED termina, então o orquestrador
      roda o teste e só spawna o GREEN se a falha é por assertion; `Cannot find module` bloqueia com
      mensagem apontando stub-first.
- [ ] CA-05: Dado nível Assistido e uma fase `[RISCO]`, quando o RED é confirmado, então o
      orquestrador apresenta o teste ao dev antes do GREEN; dado uma fase sem marca, então não para.
- [ ] CA-06: Dado o GREEN verde, quando o orquestrador aplica `Defesa a mutar`, então `Teste que
      deve cair` falha; restaurado, `git diff --stat` é vazio; o STATE log tem `red_check: pass`.
- [ ] CA-07 (edge): Dado o RED-check em que o teste **não** cai, então a fase fica `blocked`, o
      MEMORY recebe DI "teste não prova a defesa" e o plano não avança para a fase dependente.
- [ ] CA-08: Dado o GREEN verde, quando o REFACTOR roda, então existe commit `refactor(...)` separado
      do `feat(...)`, ou o envelope registra `refactor: none` com motivo.
- [ ] CA-09: Dado uma fase sem comportamento, quando executada, então o checklist tem gate textual
      com "remover alvo → gate cai → restaurar" e o STATE log recebe o mesmo `red_check`.
- [ ] CA-10 (Should): Dado uma fase concluída, quando o `plan-verifier` retorna, então o envelope
      tem o check `red-check-evidence` e o 4d o consolida sem mudança no parser.

---

## Out of Scope

- Honestidade de config do TDD Gate (âncora por hook, chaves mortas, pré-commit): PRD próprio.
- `doubt-driven-development` no `write-prd`: ataca a spec antes do plano, é outro eixo.
- Mutation testing amplo no `verify-work` por default: continua opt-in.
- Reescrever o `plan-verifier` para mutar: contrato read-only fica.
- Fases já geradas em `docs/exec-plans/`: não se retroalimenta; só fases novas.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Lib/pacote | `bun:test` (teste de paridade) | ja no projeto |
| Feature pre-requisito | `skills/lib/subagent-contract.ts` (parse do envelope do verifier no 4d) | pronta |
| Feature pre-requisito | `docs/references/tdd-cycle-checklist.md` (stub-first, referenciado no 4c) | pronta |
| Tooling | `AskUserQuestion` no orquestrador (gate humano) | disponivel |
| Processo | `bun run generate:manifest` no mesmo commit de arquivo rastreado | a executar por fase |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Orquestrador ignora a instrução de mutação (é só prompt; paridade não cobre runtime) | media | alto | STATE log com campo `red_check` obrigatório; Step 5 mostra ao dev; `verify-work` lê o log |
| Custo por fase sobe e o dev desliga o ciclo | alta | medio | Nível Direto e `--tdd-level`; medir em 3 fases (premissa 4) antes de fechar RF-05 |
| Fase de doc vira teatro de TDD | media | medio | Tipo `sem comportamento` com gate textual; planejador obrigado a nomear o alvo (RF-07) |
| Cache do plugin desatualizado: checkout muda, sessão roda a versão velha | alta | medio | `scripts/sync-to-global.sh` após merge; dogfood só no cache sincronizado |
| Mutação deixa resíduo se o orquestrador falhar entre mutar e restaurar | baixa | alto | Restaurar o arquivo pelo git (`git restore <arquivo>`); exigir `git diff --stat` vazio; nunca commitar entre os dois passos |
| Planejador volta a prever a mensagem de erro em vez de nomear a defesa | media | baixo | RF-07 no Step 9 + exemplo preenchido no template |
