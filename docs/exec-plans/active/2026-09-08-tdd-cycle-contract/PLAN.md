# Plan: Contrato Único do Ciclo TDD por Fase

**PRD:** ./PRD.md
**Planos:** 2 planos, 7 fases total
**Created:** 2026-09-08

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fonte e contrato | 3 | ~3h | — |
| 02 | O ciclo roda no execute-plan | 4 | ~5.5h | Plano 01 |

---

## Grafo de Dependencias

```
Plano 01 (fonte e contrato)
    |
    v
Plano 02 (o ciclo roda no execute-plan)
```

**Paralelismo possivel:** nenhum entre planos. O Step 4c do execute-plan (Plano 02) cita a seção-fonte
pelo caminho e lê os campos `Defesa a mutar` / `Teste que deve cair` do template, que o Plano 01 cria.
Dentro de cada plano as fases também são **sequenciais**: todas editam o mesmo teste de paridade
(`tests/fase-template-tdd-contract.test.ts`), que cresce a cada fase — contrato compartilhado, pela
taxonomia de paralelismo, exige acordo antes, não corrida. No Plano 02, fase-01 e fase-02 editam o
mesmo Step 4c.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-tracer-fonte-e-gate
**Descricao:** A fatia mais fina que atravessa as três camadas desta feature — fonte (skill), consumidor
(template) e gate (teste). Um teste de paridade novo, RED, com duas assertions: a skill
`tdd-workflow` tem a seção `## Contrato do Ciclo por Fase`, e o bloco `### TDD` do `fase-template.md`
tem o checkbox `**REFACTOR:**`. GREEN escreve a seção mínima (tabela dos três tipos de fase + mapa
nível → gate) e acrescenta o checkbox. RED-check do próprio gate: remover o checkbox derruba o teste;
restaurar, volta a passar. Se isso fecha, "gate de paridade é teste, não doc" está provado antes de
escrever o resto do bloco, o executor ou o 4c.

---

## Resumo por Plano

### Plano 01: Fonte e contrato
> O ciclo passa a ter UMA definição, na skill `tdd-workflow`, e os dois consumidores de planejamento
> (template de fase e executor) apontam para ela em vez de parafraseá-la. Ao final, toda fase gerada
> por `/plan-feature` carrega RED, GREEN, RED-check e REFACTOR, e o planejador nomeia a defesa a mutar.

Fases:
- fase-01-tracer-fonte-e-gate: teste de paridade RED → seção-fonte mínima na skill + checkbox REFACTOR no template; `tdd-cycle-checklist` passo 7 deixa de chamar REFACTOR de opcional (RF-01 parcial, RF-04 parcial)
- fase-02-bloco-tdd-completo-no-template: `Tipo de fase`, RED-check com `Defesa a mutar` e `Teste que deve cair`, variantes por tipo, exemplo preenchido, comentário apontando para a fonte; `plan-readme-template` §TDD Strategy alinhado (RF-02, D5, D6)
- fase-03-executor-e-planejador-apontam-para-a-fonte: `plan-executor.md` §TDD referencia o contrato e incorpora stub-first, nasce-verde→muta, REFACTOR em commit próprio, defesa reportada no envelope; `plan-feature` Step 9 obriga o planejador a nomear a defesa e proíbe prever mensagem (RF-06, RF-07)

### Plano 02: O ciclo roda no execute-plan
> O orquestrador deixa de só spawnar RED e GREEN: confirma o RED por assertion, para no gate humano
> conforme o nível, prova a defesa por mutação nomeada, exige REFACTOR e confere por fase com o
> `plan-verifier`. Ao final, o STATE log de cada fase carrega `red_confirmed`, `human_gate`,
> `red_check` e `refactor`, e um dogfood humano prova que o prompt novo muda o comportamento real.

Fases:
- fase-01-nivel-red-confirmado-e-gate-humano: 4c resolve o nível (`--tdd-level` | `user_profile` | Assistido), roda o teste do RED e bloqueia module-not-found, para no gate humano onde o nível manda; `wave-execution.md` §Ciclo Completo aponta para a fonte (RF-03 parte 1, RF-08, D2)
- fase-02-red-check-por-mutacao-e-refactor: orquestrador aplica `Defesa a mutar`, exige `Teste que deve cair` falhar, restaura com diff vazio, bloqueia a fase se o teste não cai; REFACTOR como segundo passo do GREEN em commit próprio (RF-03 parte 2, D3, D4)
- fase-03-verifier-por-fase-e-state-log: spawn do `plan-verifier` com o check `red-check-evidence`; os 4 campos no STATE log; Step 5 mostra o custo da fase (RF-05, observabilidade)
- fase-04-dogfood-por-humano: sync do cache do plugin, executar uma fase mínima de comportamento e uma `[RISCO]` num projeto-fixture, ler o STATE log — valida as premissas 1, 2 e 5 do PRD (critério por humano)

---

## Risks

- O orquestrador ignora a instrução de mutação: o 4c é prompt, e o teste de paridade só cobre o texto.
  - Mitigacao: STATE log com `red_check` obrigatório (Plano 02 fase-03) e o dogfood da fase-04 lê o log de verdade.
- Três cópias do ciclo já existem fora dos quatro arquivos do PRD: `plan-readme-template.md` §TDD Strategy,
  `execute-plan/references/wave-execution.md` §Ciclo Completo e `docs/references/tdd-cycle-checklist.md`
  passo 7 ("REFACTOR opcional"). Se ficarem, viram a divergência que este PRD existe para acabar.
  - Mitigacao: cada cópia é tocada na fase que muda a definição correspondente e passa a apontar para a fonte; o teste de paridade exige o ponteiro.
- Custo por fase sobe (uma rodada de teste no RED, uma no RED-check, um spawn de verifier).
  - Mitigacao: medir no dogfood; se estourar, RF-05 fica condicionado ao nível (Assistido/Guiado) em vez de sempre.
- Cache do plugin ≠ checkout: a mudança no repo não roda nesta sessão até o sync.
  - Mitigacao: fase-04 começa por `scripts/sync-to-global.sh`; nenhuma fase anterior promete comportamento em runtime.
- O teste de paridade pode ser enganado por texto dentro de comentário HTML ou de bloco cercado (compound `validator-regex-hits-comments`).
  - Mitigacao: reusar o helper `section()` de `tests/write-prd-contract.test.ts`, que rastreia fences, e asserir dentro da seção, não no arquivo inteiro.
- O guard destrutivo casa o TEXTO do comando inteiro, inclusive dentro de heredoc: em 2026-09-08 a
  escrita do PRD por `cat <<EOF` foi bloqueada porque a tabela de riscos citava `git checkout --`.
  A regex real (`hooks/pre-tool-use-destructive-guard.cjs:67`) casa `git checkout --`, `git checkout .`
  e `git restore .` — não `git checkout -b`.
  - Mitigacao: branch com `git switch -c`; restauração no RED-check com `git restore <arquivo>` (nunca
    `git restore .`); documentos que citam esses comandos são escritos pela tool Write, não por heredoc.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 — a fonte do ciclo é uma seção na skill `tdd-workflow` | Plano 01, fase-01 |
| D2 — nível default Assistido (para em `[RISCO]` e tracer bullet) | Plano 02, fase-01 |
| D3 — orquestrador muta e restaura; `plan-verifier` confere read-only | Plano 02, fase-02 e fase-03 |
| D4 — REFACTOR pelo mesmo subagente GREEN, em commit separado | Plano 01, fase-03 (executor); Plano 02, fase-02 (4c) |
| D5 — fase sem comportamento entra no ciclo com gate textual | Plano 01, fase-02 |
| D6 — planejador nomeia `Defesa a mutar`, nunca a mensagem | Plano 01, fase-02 (template) e fase-03 (Step 9) |

---

<!-- Gerado por /plan-feature em 2026-09-08 -->
