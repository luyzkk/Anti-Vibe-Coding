---
title: "Suite verde nao diz nada sobre o validador que o plugin distribui — o cap que mordia estava no .tpl"
category: armadilha
tags: [init, templates, scaffold, harness-validate, gate-duplicado, artefato-distribuido, falso-verde]
created: 2026-08-13
---

## Problem

Na fase-02 do plano05 (import `mattpocock/skills`) adicionei **uma linha** ao `AGENTS.md.tpl`: o
ponteiro para `docs/GLOSSARY.md`. A suite acusou 1 fail em `tests/agents-md-template.test.ts` — cap
de 40 linhas. Subi para 41, rodei tudo de novo: **1722 pass / 0 fail**, `typecheck` limpo,
`harness:validate` verde.

Estava incompleto, e o que faltava era o unico que chega ao usuario. Existem **tres** caps de linha
do `AGENTS.md`, nao um:

| Onde | Valor | Vale para | Exercitado pela suite? |
|---|---|---|---|
| `scripts/harness-validate.ts:43` | 70 | **este** repo | sim |
| `tests/agents-md-template.test.ts` | 40 | o template | sim — e o proprio teste |
| `skills/init/assets/templates/scripts/harness-validate.ts.tpl:43` | **40** | **o projeto do usuario** | **nao** |

O terceiro e o que roda no `bun run harness:validate` de todo projeto que rodou `/init`. Nenhum teste
deste repo scaffolda um projeto e roda o validador **dele**: `scaffold-full-tree.test.ts` verifica
que os arquivos chegam, nao que o projeto resultante passa na propria validacao. Os E2E de golden que
cobririam isso estao `test.skip` desde 2026-05-21 (init-refactor-v7), e nao sao regeneraveis sem
`detect-architecture` pre-rodado.

So apareceu porque scaffoldei um tmpdir a mao e rodei o validate de la:

```
[agents-line-count] AGENTS.md should stay short; keep it at 40 lines or fewer (current: 41)
```

Agravante: o `AGENTS.md.tpl` estava **exatamente** no teto — 40 de 40, zero folga. A proxima linha
adicionada por qualquer motivo ia estourar, e o gotcha da fase mandava "conferir folga antes de
adicionar". Eu conferi — o de 70, que tinha folga de sobra.

Sem a verificacao manual, o merge entregaria `bun run harness:validate` quebrado em **todo projeto
novo**, com a suite do plugin verde o tempo inteiro.

## Solution

Cap para 41 nos tres, mais os dois testes que asseravam a string `'40 lines or fewer'`
(`harness-validate.test.ts`, `harness-validate-advanced.test.ts`) e `PLANS.md.tpl:64`, que anunciava
"AGENTS.md max 40 lines" ao projeto-alvo — doc que envelheceria calado.

A regra que sai disso: **arquivo sob `skills/init/assets/templates/` nao e fixture, e codigo que roda
na maquina de outra pessoa.** Quando o `.tpl` e ele proprio um validador, ele carrega as proprias
constantes, e a suite deste repo valida **este** repo — nunca o produto do scaffold.

Dois gotchas do caminho, ambos capazes de produzir verificacao falsamente tranquilizadora:

- **`scripts/harness-validate.ts:10` usa `process.cwd()` e ignora argumentos.** O `.` do
  `package.json` e decorativo. Rodar `bun scripts/harness-validate.ts <outro-path>` valida
  silenciosamente **este** repo e imprime "passed" — a contagem de arquivos e a unica pista. Para
  validar outro projeto: `sh -c "cd <proj> && bun scripts/harness-validate.ts ."`.
- **`scaffoldFullTree` sozinho nao produz o `CLAUDE.md` da raiz** — quem faz e `linkClaudeToAgents`.
  Um scaffold puro sempre falha em `[required-files] Missing required file: CLAUDE.md`. E o teste
  sendo parcial, nao regressao; nao va consertar o manifest por causa disso.

## Prevention

- **Ao tocar qualquer `.tpl` sob `skills/init/assets/templates/`, procurar a cópia do outro lado.**
  `grep` o nome da constante ou da regra nos dois validadores antes de assumir que o valor
  encontrado e o que morde. Aqui `AGENTS_MAX_LINES` existe em 3 arquivos com 2 valores diferentes.
- **Suite verde nao e evidencia sobre o artefato distribuido.** Para mudanca que atravessa o
  scaffold, a verificacao minima e: scaffoldar tmpdir -> rodar o gate do projeto la -> ler a saida.
  Custa um comando e e a unica coisa que fala pelo usuario final.
- **Antes de adicionar linha a arquivo com cap, medir a folga.** Nao presumir que "cap alto" e o cap
  que vale; medir o arquivo e comparar com o menor cap que o alcanca.
- Le junto com `docs/compound/2026-05-20-validation-gate-path-drift.md`: la o teste que pegaria
  existia e foi skipado; aqui **nunca existiu**. Mesmo desfecho — gate quebrado invisivel por
  semanas — por dois mecanismos diferentes.

## Affected files

- `skills/init/assets/templates/scripts/harness-validate.ts.tpl:43` — o cap que roda no projeto-alvo
- `skills/init/assets/templates/AGENTS.md.tpl` — estava em 40/40 antes da linha do glossario
- `skills/init/assets/templates/docs/PLANS.md.tpl:64` — anunciava "max 40 lines" ao projeto-alvo
- `tests/agents-md-template.test.ts:16` · `tests/harness-validate.test.ts:41` ·
  `tests/harness-validate-advanced.test.ts:91` — os tres gates do lado do repo
- `scripts/harness-validate.ts:10` — `process.cwd()`, ignora argv
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano05/MEMORY.md` — DI da fase-02
