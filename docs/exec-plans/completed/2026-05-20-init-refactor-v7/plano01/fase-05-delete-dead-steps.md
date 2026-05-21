<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: Delete dos 18 Steps Obsoletos

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 1.5h
**Depende de:** fase-04 (registry novo nao importa nenhum dos steps a deletar), fase-01 (AUDIT.md confirma 0 behaviors validos sem destino) E uma execucao verde da fase-06 antes do delete (ver G1)
**Visual:** false

---

## O que esta fase entrega

Remocao fisica via `git rm` dos 18 steps obsoletos + seus testes + libs orfas dependentes.
Apos esta fase: `skills/init/lib/steps/` contem apenas os 10 novos + helpers compartilhados +
testes destes.

**Nota DV-1:** o step antigo `06-secrets-scan.ts` eh DELETADO nesta fase. A logica eh portada
para o novo `03-secrets-scan.ts` (stub criado em fase-04, real implementado no Plano 02).
Reclassificado de "decisao em fase-01" para "delete confirmado + recriado".

---

## Arquivos Afetados

### Steps a deletar (e seus .test.ts)

> **Confirmar lista exata via Glob na execucao** — esta lista vem do escopo do plano +
> registry.ts atual + tabela do PRD. Pode haver pequenas diferencas de naming.

| # | Arquivo step | Arquivo teste |
|---|--------------|---------------|
| 1 | `skills/init/lib/steps/00-detect-legacy.ts` | `00-detect-legacy.test.ts` |
| 2 | `skills/init/lib/steps/00_1-reuse-discovery.ts` | `00_1-reuse-discovery.test.ts` |
| 3 | `skills/init/lib/steps/00_2-reentry-guard.ts` | `00_2-reentry-guard.test.ts` |
| 4 | `skills/init/lib/steps/00_3-backup-pre-6_5_0.ts` | `00_3-backup-pre-6_5_0.test.ts` |
| 5 | `skills/init/lib/steps/13-import-progress-txt.ts` | `13-import-progress-txt.test.ts` |
| 6 | `skills/init/lib/steps/06-secrets-scan.ts` (DV-1 — recriado como `03-secrets-scan.ts` no Plano 02) | `06-secrets-scan.test.ts` |
| 7 | `skills/init/lib/steps/10-backup-pre-mutation.ts` | `10-backup-pre-mutation.test.ts` |
| 8 | `skills/init/lib/steps/09-migrate-0-parse-dry-run.ts` | `09-migrate-0-parse-dry-run.test.ts` |
| 9 | `skills/init/lib/steps/09_1-migrate-all-orchestrate.ts` | `09_1-migrate-all-orchestrate.test.ts` |
| 10 | `skills/init/lib/steps/10-migrate-1-backup.ts` | `10-migrate-1-backup.test.ts` |
| 11 | `skills/init/lib/steps/11-migrate-2-planning.ts` | `11-migrate-2-planning.test.ts` |
| 12 | `skills/init/lib/steps/12-migrate-3-lessons.ts` | `12-migrate-3-lessons.test.ts` |
| 13 | `skills/init/lib/steps/13-migrate-4-decisions.ts` | `13-migrate-4-decisions.test.ts` |
| 14 | `skills/init/lib/steps/13_1-migrate-knowledge-path.ts` | `13_1-migrate-knowledge-path.test.ts` |
| 15 | `skills/init/lib/steps/03-detect-stack-and-register.ts` | `03-detect-stack-and-register.test.ts` |
| 16 | `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | `03_1-persist-stack-and-knowledge.test.ts` |
| 17 | `skills/init/lib/steps/04-customize-architecture.ts` | `04-customize-architecture.test.ts` |
| 18 | `skills/init/lib/steps/15-capabilities-discovery.ts` | `15-capabilities-discovery.test.ts` |

**Steps a NAO deletar nesta fase** (sao mantidos como `_legacy-ref` para Plano 02/03/05 portarem logica):
- `01-scaffold-full-tree.ts` (vira parte do novo Step 3 — Plano 03)
- `02-link-claude-agents.ts` (vira parte do novo Step 3 — Plano 03)
- `05-install-gh-files.ts` (vira novo Step 6 — Plano 03)
- `14-delivery-loop.ts` (vira novo Step 8 — Plano 05)
- `90-final-validation.ts` (vira novo Step 10 — Plano 05)
- `91-generate-populate-plan.ts` (vira novo Step 7 — Plano 04, CORE — total reescrita)

> **Decisao:** estes 6 arquivos antigos vao continuar no disco apos fase-05. Planos 02-05 os
> deletam ao implementarem os novos. Anotar em MEMORY.md como `Notas para Planos Seguintes`.

### Libs orfas dependentes a investigar

Apos delete dos steps, libs que so eram chamadas por eles ficam orfas. Lista preliminar:
- `skills/init/lib/detect-v5-legacy.ts` — REUTILIZADA pelo Step 1 novo, MANTER
- `skills/init/lib/manifest-writer.ts` — usado por Plano 02, MANTER (Plano 02 reescreve)
- `skills/init/lib/state-md-init.ts` — chamada por `03-detect-stack-and-register` (deletado).
  STATE.md vira plano populate (D18) — pode ser deletada. CONFIRMAR via grep.
- `skills/init/lib/dry-run.ts`, `skills/init/lib/dry-run-mode.ts` — Plano 05 final remove
  (escopo deste plano: NAO mexer, mas marcar em MEMORY.md como candidate-to-delete)
- `skills/init/lib/audit-log-writer-factory.ts` — usado por run-init.ts ainda, MANTER
- `skills/init/lib/cross-upgrade-detector.ts` — usado por run-init.ts, MANTER (Plano 05 final remove)

### registry.test.ts

Confirmar que reescrita da fase-04 nao deixou ref a step deletado.

### Outros consumers a checar

`grep -r "from '\\./steps/00-detect-legacy'" skills/` — qualquer hit antes do delete sinaliza
import perdido nao removido na fase-04 (regressao de R6).

---

## Implementacao

### Passo 1: Pre-condicoes obrigatorias

```bash
# 1. tracer da fase-06 verde COM os 15 steps ainda presentes (mas nao importados)
bun test tests/e2e/init-v7-tracer-bullet.test.ts
# Esperado: pass

# 2. AUDIT.md sem behaviors validos sem destino
grep -c "_(preencher)_" docs/exec-plans/active/2026-05-20-init-refactor-v7/plano01/AUDIT.md
# Esperado: 0

# 3. Registry novo nao importa nenhum dos 15
for step in detectLegacyStep reuseDiscoveryStep reentryGuardStep backupPre650Step importProgressTxtStep secretsScanStep backupPreMutationStep migrate0ParseDryRunStep migrateAllOrchestrateStep migrate1BackupStep migrate2PlanningStep migrate3LessonsStep migrate4DecisionsStep migrateKnowledgePathStep detectStackAndRegisterStep persistStackKnowledgeStep customizeArchitectureStep capabilitiesDiscoveryStep; do
  count=$(grep -c "$step" skills/init/lib/registry.ts || echo 0)
  echo "$step: $count"
done
# Esperado: todos 0
```

Se algum dos 3 checks falhar, NAO prosseguir.

### Passo 2: git rm dos arquivos confirmados

```bash
# Confirmar lista via Glob (output esperado: 18 .ts + 18 .test.ts ou similar)
ls skills/init/lib/steps/{00-detect-legacy,00_1-reuse-discovery,00_2-reentry-guard,00_3-backup-pre-6_5_0,06-secrets-scan,09-migrate-0-parse-dry-run,09_1-migrate-all-orchestrate,10-backup-pre-mutation,10-migrate-1-backup,11-migrate-2-planning,12-migrate-3-lessons,13-import-progress-txt,13-migrate-4-decisions,13_1-migrate-knowledge-path,15-capabilities-discovery,03-detect-stack-and-register,03_1-persist-stack-and-knowledge,04-customize-architecture}.ts 2>/dev/null

# Delete via git rm (preserva linhagem)
git rm skills/init/lib/steps/00-detect-legacy.ts skills/init/lib/steps/00-detect-legacy.test.ts
# ... repetir para cada
```

Recomendo um pequeno script shell para iterar — evita typo:

```bash
STEPS=(
  "00-detect-legacy"
  "00_1-reuse-discovery"
  "00_2-reentry-guard"
  "00_3-backup-pre-6_5_0"
  "06-secrets-scan"  # DV-1: logica portada para 03-secrets-scan.ts no Plano 02
  "09-migrate-0-parse-dry-run"
  "09_1-migrate-all-orchestrate"
  "10-backup-pre-mutation"
  "10-migrate-1-backup"
  "11-migrate-2-planning"
  "12-migrate-3-lessons"
  "13-import-progress-txt"
  "13-migrate-4-decisions"
  "13_1-migrate-knowledge-path"
  "15-capabilities-discovery"
  "03-detect-stack-and-register"
  "03_1-persist-stack-and-knowledge"
  "04-customize-architecture"
)
for s in "${STEPS[@]}"; do
  git rm "skills/init/lib/steps/${s}.ts" "skills/init/lib/steps/${s}.test.ts"
done
```

### Passo 3: Re-rodar tracer (fase-06)

```bash
bun test tests/e2e/init-v7-tracer-bullet.test.ts
# Esperado: pass (mesmo resultado de antes do delete)
```

Se quebrar: revert imediato dos deletes (`git checkout HEAD -- skills/init/lib/steps/`) e investigar.

### Passo 4: Limpar imports orfaos em outros lugares

```bash
# Procurar refs aos nomes dos steps deletados em qualquer lugar do codebase
grep -rn "from '.*steps/00-detect-legacy'\|from '.*steps/00_1-reuse-discovery'\|from '.*steps/04-customize-architecture'" skills/ tests/ scripts/
# Esperado: vazio
```

Hits provaveis: testes e2e antigos em `tests/e2e/` que importavam steps deletados.
Para cada hit: decidir entre deletar o teste (se cobertura era obsoleta — D3/D4/D5) ou
adicionar `test.skip` com TODO referenciando o Plano que vai recriar (consistente com
padrao da MEMORY do feedback_copy-then-improve).

### Passo 5: typecheck + suite completa

```bash
bun run typecheck 2>&1 | head -50  # listar primeiros erros
bun test                            # suite completa
bun run lint
```

Erros aceitaveis nesta fase: testes e2e antigos que serao reescritos no Plano 05.
Listar todos em MEMORY.md como "Gotchas para Plano 05 fase-final".

---

## Gotchas

- **G1 (ordem critica R6):** delete SO depois de tracer verde com os arquivos ainda no disco
  (mas nao importados). Isso garante que o problema isolado eh "arquivos sobrando" (nao
  funcional), nao "logica perdida" (funcional).
- **G2 (libs orfas):** algumas libs (`state-md-init.ts`, `customize-architecture.ts` aux) podem
  ficar orfas mas sao Plano 04/05 problema. NAO deletar libs nesta fase — escopo do plano e
  apenas STEPS + testes.
- **G3 (snapshot golden):** testes e2e antigos podem ter goldens em `tests/e2e/__golden__/`.
  NAO deletar goldens — Plano 05 fase-final regenera. Anotar em MEMORY.md.
- **G4 (linhagem git):** usar `git rm` (nao `rm` simples) para preservar history. Cada arquivo
  deletado deve aparecer em `git log -- <path>` no commit desta fase.
- **G5 (run-init.ts vestiges):** este arquivo importa `dry-run.ts`, `audit-log-writer-factory.ts`,
  `cross-upgrade-detector.ts`, `parse-flags.ts`, `lazy-import.ts`. Nenhum desses esta no escopo
  de delete — sao adressados em Plano 05 final ou ficam como tech-debt.
- **G6 (commit segregado):** fazer commit so deste delete (mensagem `chore(init-v7): drop 15
  obsolete steps + tests (Plano 01 fase-05)`). Facilita revert se algo der errado.

---

## Verificacao

### TDD

N/A — esta fase deleta codigo. Validacao via testes existentes continuarem verdes.

### Checklist

- [ ] Pre-condicoes do Passo 1 todas atendidas (tracer verde, AUDIT limpo, registry sem refs)
- [ ] 15+ arquivos `.ts` deletados via `git rm` (linhagem preservada)
- [ ] 15+ arquivos `.test.ts` correspondentes deletados via `git rm`
- [ ] Tracer (fase-06) continua verde apos delete: `bun test tests/e2e/init-v7-tracer-bullet.test.ts`
- [ ] `grep -rn "from '.*steps/00-detect-legacy'" skills/ tests/ scripts/` retorna vazio (e equivalente para todos os 15)
- [ ] `bun test skills/init/lib/registry.test.ts` continua verde (3 pass)
- [ ] `bun test skills/init/lib/steps/01-reentry-gate.test.ts` continua verde (3 pass)
- [ ] `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts` continua verde (4 pass)
- [ ] `bun run lint` sem novos erros
- [ ] Quaisquer testes e2e quebrados pelo delete sao listados em MEMORY.md como input para Plano 05
- [ ] Commit isolado feito com mensagem `chore(init-v7): drop 15 obsolete steps + tests`

---

## Criterio de Aceite

**Por maquina:**
- `ls skills/init/lib/steps/00*.ts skills/init/lib/steps/04-customize-architecture.ts skills/init/lib/steps/15-capabilities-discovery.ts 2>/dev/null | wc -l` retorna `0`
- `bun test tests/e2e/init-v7-tracer-bullet.test.ts` retorna `1 pass, 0 fail`
- `bun test skills/init/lib/` retorna 0 falhas (somente passa o que ainda tem que passar — listado em MEMORY se algo skip)

**Por humano:**
- `git log --oneline -1` mostra commit `chore(init-v7): drop 15 obsolete steps + tests` (uno-atomico)
- Code review confirma que nenhuma logica `valido` listada no AUDIT.md ficou perdida

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
