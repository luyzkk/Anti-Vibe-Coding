---
title: "test.skip com 'ate decidirmos' e afirmacao datada — o motivo morre antes do skip, e o teste apodrece por dentro"
category: processo
tags: [testes, test-skip, divida-tecnica, verificacao, exec-plans, cobertura-fantasma]
created: 2026-08-17
---

## Problem

Skip neste repo quase nunca e "este teste e ruim". E um bilhete condicional: *"skipado ate decidirmos
golden v7 vs delecao"*, *"mantido como `it.skip` ate Plano 04 mergeado"*, *"reescrita ocorre em Plano
04 fase-04"*. A condicao e escrita para ser reconferida. Ninguem reconfere, porque suite verde nao
reclama de teste desligado — ele nao falha, ele **some**.

Varredura de 2026-08-17: **12 sites de skip, 14 testes desligados, ZERO com motivo ainda valido.**

| Motivo escrito | O que a medicao mostrou |
|---|---|
| "greenfield aborta com `code=20` (DR-2)" — 3 sites | o hard abort virou gate **7 dias depois** do skip (`07-generate-populate-plans.ts:45`). O skip durou 90 |
| "mantido ate Plano 04 mergeado" | Plano 04 mergeado ha meses |
| "reescrita para V3 em Plano 04 fase-05" — 4 sites | a reescrita aconteceu: `init-v7-populate-plans-*.test.ts`, 9 testes ativos e verdes |
| "validador nao foi desenhado para init greenfield" | `package.json` e `scripts/harness-validate.ts` entraram no `TEMPLATE_MANIFEST`; scaffold os cria. Exit 0 |
| "`--dry-run` deletado inteiramente" | o flag existe, e lido em `run-init.ts:49` **e anunciado** em `skills/init/SKILL.md:35` |
| "so passa quando `harness-validate.ts` estiver pronto" | errado **desde o dia em que foi escrito** — ver abaixo |

O caso do `migration.test.ts` e o mais instrutivo porque nao e envelhecimento: e diagnostico errado
congelado. Reativado, falhou. A causa nao era validador ausente — `orchestrateMigration` **sozinho
nunca poderia** satisfazer o gate, porque migra `.planning/` e mais nada; quem cria os 28 required
files e o scaffold, outro step. Medido: so-migracao deixa 23 arquivos faltando. O skip escondeu por
meses um teste cuja premissa era falsa na origem.

**O apodrecimento e em duas camadas, e a segunda e a que fecha o ciclo.** Enquanto o teste esta no
escuro, as assercoes dentro dele envelhecem junto — ninguem as executa. Dos 3 testes que reativei,
**2 tinham assercao caduca por dentro**:

- `ca12` esperava `## Execution Steps` no `PLAN.md` de overview. Sao dois artefatos: as **fases** usam
  esse heading (pinado por teste vivo), mas o overview e gerado por
  `populate-harness-plan-overview.ts:43`, que emite `## Como executar` por design.
- `init-tracer-bullet` esperava os 4 blocos do formato V2 (`Inputs (docs`, `Instrucao LLM`...). As
  fases migraram para o formato canonico.

Alem de uma assercao morta: `progress.txt -> docs/compound/_imported/`, cujo step
`13-import-progress-txt` saiu do registry — o guard `if` passava e o `readdir` estourava ENOENT.

Isso e um catraca. Quem reativa confiando no bilhete leva um vermelho, le como **confirmacao de que o
skip estava certo**, e re-skipa. O bilhete se auto-valida e a cobertura nunca volta.

## Solution

Tratar cada `skip` como afirmacao datada, igual a numero de linha em doc de fase
(`docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md`): **medir a
precondicao escrita antes de decidir qualquer coisa.**

O metodo que resolveu os 12, em ordem:

1. **Ler o motivo e transformar em pergunta binaria.** "aborta com code=20" -> rodar e ver se aborta.
   "ate Plano X mergear" -> `git log`. "step Y foi deletado" -> `ls` + grep no registry.
2. **Se a condicao caiu, reativar e DEIXAR FALHAR.** O vermelho e informacao, nao veredito. Foi assim
   que apareceram as assercoes caducas da segunda camada — e o diagnostico errado do `migration`.
3. **Ler cada falha antes de mexer.** Aqui a distincao que decide tudo: assercao caduca se **corrige**
   contra o artefato gerado; assercao sobre comportamento **removido** se deleta.
4. **Sem motivo vivo e sem comportamento a cobrir, deletar o teste — nao re-skipar.** Placeholder com
   zero `expect` (4 dos 12) nao e divida a reativar; e peso morto que finge cobertura.

Resultado: 4 reativados, 8 deletados, 4 arquivos removidos, suite de **1764 testes com zero skip**.

## Prevention

- **Skip com prazo condicional (`ate X`) e um TODO sem dono.** Ao escrever, registrar tambem **como
  verificar** que X aconteceu — o comando, nao a intencao. Sem isso o bilhete nao e reconferivel.
- **O motivo do skip nao e evidencia; e hipotese datada.** Vale exatamente o que valia no dia. Antes de
  reativar OU deletar, re-medir — ambas as decisoes erram se a premissa mudou.
- **Reativar antes de julgar.** Nunca decidir pelo comentario. O vermelho da reativacao carrega o que
  o comentario nao sabe: assercao caduca por dentro, premissa errada na origem.
- **Vermelho na reativacao nao confirma o skip.** E o inicio do diagnostico. Re-skipar sem ler a falha
  e o que transforma divida temporaria em permanente.
- **Teste sobre comportamento deletado se deleta, nao se skipa.** Se o step/modulo nao existe, nao ha
  o que reativar — verificar com `ls` + grep no registry, e apagar.
- **Inventario de skip nao pode filtrar so `*.test.ts`.** O meu perdeu
  `tests/perf/capabilities-writer.bench.ts`; so o controle positivo do grep negativo o pegou
  (`docs/compound/2026-08-12-grep-negativo-exige-controle-positivo.md`). Aquele, medido, e skip
  **legitimo**: o runner (`scripts/run-tests.ts:20`) coleta so `*.test.{ts,tsx}`, entao bench nunca
  entra no CI — o lugar certo para budget de wall-clock.
- **Suite verde nao cobre teste desligado.** Nenhum gate deste repo conta skips. Enquanto nao houver,
  a varredura periodica e a unica defesa.

## Affected files

- `tests/e2e/migration.test.ts` — o skip cujo motivo era falso na origem; corrigido para `/init`
  completo em projeto legacy
- `tests/e2e/ca12-greenfield-populate-validate.test.ts` · `tests/e2e/init-tracer-bullet.test.ts` — os
  2 com assercao caduca por dentro
- `skills/init/lib/steps/07-generate-populate-plans.ts:45` — a mudanca de 2026-05-28 que invalidou 3
  skips e ninguem reconferiu
- `docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md` — a irma: o mesmo
  mecanismo aplicado a numero em doc de fase
- `docs/compound/2026-08-13-suite-verde-nao-exercita-validador-distribuido.md` — outra forma de suite
  verde nao significar cobertura
