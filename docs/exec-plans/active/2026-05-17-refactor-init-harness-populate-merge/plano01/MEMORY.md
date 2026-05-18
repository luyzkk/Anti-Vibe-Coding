# Memoria: Plano 01 — Fundacao + Discovery do execute-plan

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-2:** `readGitSha` usa `fs.readFile` direto em `.git/HEAD` + `.git/refs/heads/<branch>`, nao `child_process`
  - Por que: `child_process.exec('git rev-parse HEAD')` requer `git` no PATH, falha em ambientes CI sem git instalado (ex: Docker minimal). `fs.readFile` le o mesmo dado diretamente do filesystem.
  - Impacto: funciona sem `git` no PATH. Cobre detached HEAD (40-char hex) e ref normal (`ref: refs/heads/X`). Ausencia de `.git` retorna null silencioso (G6).

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **AUDIT: GO** — execute-plan suporta paralelismo wave-based (max 3 subagentes/fase hierarquico, max 5 flat) e isolamento de contexto por subagente. Glossario compartilhado (CH-03) MISSING nativamente — populate-plan-generator deve emitir glossario inline em cada prompt de subagente como workaround. Ver `plano01/EXECUTE_PLAN_AUDIT.md` para evidencias detalhadas.
- **DI-01:** Limite de paralelos difere por modo: hierarquico=3 (`SKILL.md:402`), flat=5 (`references/wave-execution.md:46`). Plano 02 deve respeitar limite=3 ao gerar PLAN.md hierarquico.
- **API publica final de `lib/backup-anti-vibe.ts`** (assinaturas exatas das 4 funcoes):
  ```typescript
  export async function computeSha256(filePath: string): Promise<string>
  export async function getLatestBackupDir(cwd: string): Promise<string | null>
  export async function readBackupManifest(backupDir: string): Promise<BackupManifest>
  export async function createBackup(input: CreateBackupInput): Promise<CreateBackupResult>
  ```
- **readGitSha usa `fs.readFile`, nao `child_process`** — funciona sem `git` no PATH.
- **GT-1 (grep check):** A verificacao `grep -E '^export (function|type|const) '` retorna 5 (so tipos) porque as funcoes sao `async function`. O total real de exports e 9 (5 tipos + 4 async functions). O criterio `>= 9` e satisfeito com o pattern correto `^export (async function|function|type|const)`.
- **Fase-03 concluida:** Stub `runRollback` em `lib/rollback.ts` retorna `{kind:'aborted', code:1, reason:'Rollback not yet implemented (Plano 05 fase-04)'}`. Plano 05 fase-04 substitui APENAS o corpo do stub — `run-init.ts` nao precisa mudar de novo (early-return ja esta em producao).
- **Confirmacao D21:** `registry.ts` NAO foi modificado (`git diff --stat` retorna vazio). O dispatcher recebe o early-return antes do loop `for (const step of reg)` — registry permanece imutavel.
- **Assinatura final de `runRollback`:**
  ```typescript
  export async function runRollback(opts: RunRollbackOptions): Promise<StepResult>
  // RunRollbackOptions = { cwd: string, log?: (line: string) => void, askUser?: (...) => Promise<string> }
  ```
- **Integracao em run-init.ts:** early-return usa `lazyImport(() => import('./rollback'))`, `ctx.flags.rollback === true` (strict equality), e repassa `askUser` apenas se definido.

---

<!-- Atualizado automaticamente durante execucao -->
