# Memoria: Plano 01 — Foundation + Tracer Bullet

**Feature:** refactor-init-skill-rails
**Iniciado:** 2026-05-17
**Status:** concluido (2026-05-17)
**Commits:** 59edb88 (fase-01), 405d9c5 (fase-02), 42f94d5 (fase-03), da416c5 (fase-04)

---

## Decisoes de Implementacao

- **DI-1:** Lint script ausente — usar apenas `bun run typecheck` (tsc --noEmit)
  - Por que: `package.json` nao tem script `lint`. PRD/PLAN ja sinalizaram. Confirmado em fase-01.
  - Impacto: checklists das fases que pedem `bun run lint` devem ser entendidos como typecheck. Atualizar wording nas proximas fases ao escrever no plan.
- **DI-2:** DI-06 centralizado via helper `lazyImport<T>` em `skills/init/lib/lazy-import.ts`
  - Por que: pattern `await import` ja estava aplicado no dispatcher (fase-02), mas duplicar inline em cada step seria divergente. Helper exporta uma assinatura unica para todos os Planos 02/03 usarem.
  - Impacto: planos 02/03 importam `import { lazyImport } from '../lazy-import'` quando precisam carregar modulos lazily. Comment provenance no helper documenta o workaround para auditores.

---

## Bugs Descobertos

(nenhum nesta fase)

---

## Gotchas

- **GT-1:** `import type` e apagado pelo compilador em runtime — types.test.ts NAO falha em RED por modulo nao encontrado
  - Descoberto em: fase-01
  - Impacto: para testes que validam APENAS shape de tipos (sem runtime), o ciclo RED tradicional nao se aplica. abort-error.test.ts (runtime real) cobriu o RED. Planos 02/03 devem usar testes runtime quando quiserem garantir RED real.
- **GT-2:** Typecheck do projeto tem errors pre-existentes em `skills/lib/subagent-contract.ts` (AnySchema/instancePath)
  - Descoberto em: fase-01
  - Impacto: rodar `bun run typecheck` retorna falha mesmo sem culpa da fase. Verificar apenas os arquivos da fase atual via tsc isolado ou aceitar baseline. Nao bloquear fases por isso.
- **GT-3:** `.planning/` esta no `.gitignore` da raiz do repo
  - Descoberto em: fase-03
  - Impacto: fixtures de teste com `.planning/` precisam `git add -f`. Para os Planos 02/03 que vao portar steps de migracao tocando em `.planning/`, fixtures devem ser commitadas com `-f` ou colocadas em subpasta nao-ignorada (preferivel: manter sob `__fixtures__/` e usar `-f`).

---

## Desvios do Plano

(nenhum nesta fase)

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que Planos 02, 03 e 04 PRECISAM saber.

### Tipos e contratos (fase-01)
- **Interface `Step`:** `skills/init/lib/steps/types.ts`. Shape minimo: `{ id: string; run(ctx: StepContext): Promise<StepReport> }`.
- **`StepContext`:** `{ cwd: string; args: readonly string[]; flags: Readonly<Record<string, boolean | string>> }`. **NAO AMPLIE** este shape — steps que precisam de mais (ex: leitor de FS injetavel) recebem via parametro proprio, nao via context.
- **`StepReport`:** `{ mutated: boolean; summary: string }`. `mutated: true` quando o step escreve em disco; o dispatcher loga isso explicitamente.
- **`StepResult`:** `{ kind: 'ok'; report } | { kind: 'aborted'; code; reason }`. Para uso em testes do dispatcher.

### Gates (fase-01)
- **AbortError:** `skills/init/lib/steps/abort-error.ts`. Use `throw new AbortError({ code, reason })` em gates de validacao (NUNCA `process.exit()`). O dispatcher captura, escreve `reason` em stdout via `log()` e retorna `{ kind: 'aborted', code, reason }`.
- **Codigos usados ate agora:** 1=needs-migration. Reserve 2=conflict para Plano 03 (migrate.2).
- **Wording:** `reason` deve ser BYTE-IDENTICO ao bloco inline original do SKILL.md (PRD R1, G1). Scripts/humanos fazem grep no stdout.

### Dispatcher (fase-02)
- **Entry point:** `skills/init/lib/run-init.ts`, funcao `runInit(argv, opts?)`. Retorna `Promise<StepResult>`.
- **Opcoes injetaveis:** `{ registry?, cwd?, log? }`. Testes devem injetar `registry` e `log` (capture). NAO chame `process.exit` no dispatcher — quem chama eh o caller (futuro entrypoint do Plano 04).
- **Erros nao-Abort:** rethrow. Bugs ficam visiveis. Plano 03 deve respeitar isso.
- **Flags suportados:** parse simples via `parse-flags.ts` (`--flag`, `--flag=value`). Adicionar mais flags = atualizar `parseFlags` se necessario (mas YAGNI ate provar contrario).

### Registry (fase-02)
- **Path:** `skills/init/lib/registry.ts`. Array ordenado `readonly Step[]`.
- **Como adicionar step:** `import { mySte } from './steps/NN-meu-step'` + push na array, mantendo ordem do SKILL.md atual. Atualmente: `[detectLegacyStep]`.
- **Ordem importa:** primeiro step a executar = primeira entrada. Plano 02 adicionara entradas posteriores (Step 1, 2, 3...); Plano 03 inserira gates de migrate ANTES dos steps puros se a politica antiga mantinha essa ordem (consulte SKILL.md linhas atuais).

### Steps modulares (fase-03)
- **Naming:** `skills/init/lib/steps/NN-{slug}.ts` onde NN = ordem 2 digitos (00, 01, 02...). Atualmente: `00-detect-legacy.ts`.
- **Wrapper sobre helpers:** steps SAO WRAPPERS sobre helpers existentes em `skills/init/lib/*.ts`. NAO duplique logica. NAO modifique helpers (eles ja tem JSDoc Princípio #5).
- **Wording byte-identico:** copie strings literais do bloco inline correspondente do SKILL.md. Use grep para confirmar antes e depois (paranoia check).

### Golden tests (fase-03)
- **Estrutura:** `__fixtures__/{caso}/` (estado inicial) + `__golden__/{caso}.txt` (stdout esperado linha-a-linha) + `NN-step.test.ts` (compara via readFile + assertion strict).
- **Convencao:** 3 fixtures minimas por step com side-effect: greenfield, legacy (caso pivotal), partial (edge). Ajuste para o step especifico.
- **.planning/ em fixture:** `.planning/` esta no .gitignore — use `git add -f` ao commitar fixtures que dependem dessa pasta.

### DI-06 / Windows compat (fase-04)
- **Helper centralizado:** `skills/init/lib/lazy-import.ts`, funcao `lazyImport<T>(() => import('./module')): Promise<T>`.
- **Quando usar:** SEMPRE que precisar carregar um modulo dinamicamente (boundary de teste, registry, lazy plugin). NUNCA use `bun -e "..."` ou `child_process.exec('bun', ...)` com paths absolutos — quebra no Windows.
- **Por que helper e nao inline:** documentar o workaround uma vez, grepping (`grep lazyImport` revela todos os boundaries). Inline `await import` continua funcionando, mas a convencao do projeto eh usar o helper.

### Comandos uteis
- Rodar so testes do init: `bun test skills/init/`
- Rodar dispatcher standalone: `bun -e "import('./skills/init/lib/run-init').then(m => m.runInit([], { cwd: '/tmp' }).then(console.log))"`  (mas prefira testes para evitar DI-06)
- Validar harness: `bun run harness:validate`

- **2026-05-17 — cutover concluido pelo Plano 04:** os steps deste plano agora executam pelo dispatcher `skills/init/lib/run-init.ts`. `SKILL.md` reescrito como manifest (86 linhas). Rationale extraido para `docs/design-docs/init-rationale.md`. Snippets Akita em `skills/init/assets/snippets/akita-*.md`. E2E goldens em `tests/e2e/__golden__/init-{greenfield,legacy-v5}.{stdout.txt,tree.json}`.

---

<!-- Atualizado automaticamente durante execucao -->
