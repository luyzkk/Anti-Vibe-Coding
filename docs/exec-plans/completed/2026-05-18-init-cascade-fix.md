---
mode: quick
created: 2026-05-18
owner: Luiz/dev
---

# Quick Plan: Fix `/init` cascade — lessons + self-protection + migrate-mode + `.claude/*` migration

## Goal

Prevenir reocorrência do desastre que corrompeu o cache global do plugin v6.4.1 (init rodou contra o próprio diretório do plugin) E destravar migração de projetos v5 modernos cujos artefatos vivem em `.claude/*` (caso real: Carreirarte).

## Scope

- **Frente 1 (lições):** 3 lições aprendidas em `docs/compound/` documentando as 3 falhas em cascata que causaram a corrupção.
- **Frente 2 (self-protection):** guard no `run-init.ts` que aborta se cwd está dentro do plugin cache do próprio anti-vibe-coding.
- **Frente 3 (migrate-mode):** `detectLegacyStep` honra `args[0]==='migrate'` (bypass do AbortError) + `orchestrateMigration` cobre os 11 artefatos `.claude/*` detectáveis em [detect-v5-legacy.ts:7-23](../../skills/init/lib/detect-v5-legacy.ts#L7-L23).

Fora de escopo: refatorar arquitetura do dispatcher, mudanças no contrato de Step, validação de schemas dos arquivos migrados, sync automático para cache global pós-fix.

### Mapeamentos `.claude/*` → `docs/` (Step 4)

| Artefato origem | Destino |
|---|---|
| `.claude/decisions.md` | `docs/decisions/legacy-claude-decisions.md` |
| `.claude/senior-principles.md` | `docs/design-docs/legacy-claude-senior-principles.md` |
| `.claude/architecture-profile.md` | `docs/design-docs/legacy-claude-architecture-profile.md` |
| `.claude/PROJECT_MAP.md` | `docs/legacy-claude-project-map.md` |
| `.claude/plans/*` | `docs/exec-plans/legacy-claude-plans/*` (preserva subestrutura) |
| `.claude/tasks/*` | `docs/exec-plans/legacy-claude-tasks/*` (preserva subestrutura) |
| `.claude/knowledge/*` | `docs/knowledge/legacy-claude-knowledge/*` (preserva subestrutura) |
| `.claude/rules/*` | `docs/design-docs/legacy-claude-rules/*` (preserva subestrutura) |
| `.claude/prompts/*` | `docs/legacy-claude-prompts/*` (preserva subestrutura) |
| `.claude/.anti-vibe-manifest.json` (v5) | renomear para `.claude/.anti-vibe-manifest.json.backup-v5.{ISO-timestamp}` |
| `.claude/.anti-vibe-manifest.json.backup-v5.*` | preservar in-place (já é backup) |

Estratégia: copy-not-move (idempotente, preserva originais para rollback manual). Audit log entry por migração.

## Execution Steps

1. Registrar 3 lições em `docs/compound/` (bash env-var scope, path escape cascade, init self-protection) → verify: `bun run compound:check` passa com 3 novos arquivos.
2. TDD self-protection guard no `run-init.ts` — RED test que invoca `runInit([], { cwd: '<plugin cache path>' })` espera `{ kind: 'aborted', code: 3 }`; GREEN adiciona guard antes do dispatcher loop → verify: `bun test skills/init/lib/run-init.test.ts` passa com novo teste verde.
3. TDD `detectLegacyStep` honra `args[0]==='migrate'` — RED test com fixture `.claude/decisions.md` + `args: ['migrate']` espera sucesso (não AbortError); GREEN checa `ctx.args[0]==='migrate'` antes do throw → verify: `bun test skills/init/lib/steps/00-detect-legacy.test.ts` passa com novo teste verde.
4. TDD estender `orchestrateMigration` para os 11 artefatos `.claude/*` — RED tests cobrem mapeamentos (tabela acima); GREEN implementa cada mapping em `migrate-orchestrator.ts` ou novo módulo `migrate-claude-artifacts.ts` → verify: `bun test skills/init/lib/migrate-orchestrator.test.ts` passa com novos testes verdes.
5. Validação final: `bun run test && bun run harness:validate && bun run compound:check` → verify: tudo verde end-to-end.

## Validation Log

(a preencher durante execução)

## Compound Opportunity

Pattern: "dispatchers que mutam o cwd precisam de path-introspection guard". Outros skills do plugin que escrevem em disco (sync, update, scaffold-*) deveriam herdar a mesma proteção. Sinalizar em ADR após este plano.

## Lessons Captured

(serão registradas no Step 1)

- `bash-env-var-scope.md` — Why: corrupção do cache rodando init contra si mesmo (env var não exportada via `VAR=x && cmd`). How to apply: ao passar env var para `bun -e`, sempre inline `VAR=x bun -e` ou `export VAR=x; bun -e`.
- `path-escape-cascade.md` — Why: criação literal de pasta `UsersluizfVideosCarreirarte - ANTI VIBE CODING/`. How to apply: paths Windows entre shells via arquivo intermediário ou JSON.stringify, nunca string com escapes empilhados (`\\\\`).
- `init-self-protection.md` — Why: `runInit` aceitou cwd=plugin cache e fez scaffold destrutivo de si mesmo. How to apply: dispatchers que mutam disco precisam validar que cwd NÃO é o próprio plugin antes de qualquer escrita.

## Exit Criteria

- 3 lessons-learned em `docs/compound/` com `compound:check` verde
- `run-init.test.ts`: +1 test (cache-guard) passando
- `00-detect-legacy.test.ts`: +1 test (migrate-arg bypass) passando
- `migrate-orchestrator.test.ts`: +11 tests (mapeamentos `.claude/*`) passando
- `bun run test` verde end-to-end
- `bun run harness:validate` verde
- Cache global re-sincronizado via `bash scripts/sync-to-global.sh`
