# Plano 01: Fundacao + Discovery do execute-plan

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h (0.5h + 1.5h + 1h)
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Tracer Bullet), Plano 03 (Discovery Pipeline)

---

## O que este plano entrega

Base operacional para os planos seguintes: (1) auditoria documentada do `/anti-vibe-coding:execute-plan` validando que ele suporta wave-based paralelo + glossario compartilhado opcional (ou abrindo PRD paralelo se nao suportar); (2) helper canonico de backup com manifest checksum-validado pronto para uso por Step 10 (apply-merge) e pelo rollback; (3) detector early-return da flag `--rollback` no dispatcher, garantindo que o pipeline destrutivo seja sempre revogavel desde o dia zero.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato `Step` + `StepResult` | `skills/init/lib/steps/types.ts` | pronto |
| Dispatcher `runInit` | `skills/init/lib/run-init.ts` | pronto |
| `parseFlags` | `skills/init/lib/parse-flags.ts` | pronto |
| Skill `/anti-vibe-coding:execute-plan` | `skills/execute-plan/SKILL.md` + `index.ts` | pronto (auditar) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `EXECUTE_PLAN_AUDIT.md` (relatorio fase-01) | Plano 02 fase-02 (populate-plan-generator decide se injeta glossario) |
| `lib/backup-anti-vibe.ts` (createBackup, readBackupManifest, getLatestBackupDir, computeSha256) | Plano 04 fase-03 (apply-merge-destructive), Plano 05 fase-04 (rollback completo) |
| `lib/rollback.ts` (stub) | Plano 05 fase-04 (impl completa preenche o stub) |
| Flag `--rollback` reconhecida em `parseFlags` + early-return em `runInit` | Plano 05 fase-04 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-discovery-execute-plan.md` | `EXECUTE_PLAN_AUDIT.md` documentando capacidades + decisao de prosseguir ou abrir PRD paralelo (D25) | 0.5h | — |
| 02 | `fase-02-backup-anti-vibe-helper.md` | `lib/backup-anti-vibe.ts` + testes (manifest schema D29, idempotencia RNF-04, sha256 verificavel) | 1.5h | fase-01 |
| 03 | `fase-03-rollback-stub-dispatcher.md` | Flag `--rollback` no `parseFlags`, early-return em `runInit`, `lib/rollback.ts` stub + testes | 1h | fase-02 |

---

## Grafo de Fases

```
fase-01 (discovery-execute-plan)
    |
    v
fase-02 (backup-anti-vibe-helper)
    |
    v
fase-03 (rollback-stub-dispatcher)
```

**Paralelismo possivel:** Nenhum dentro deste plano. fase-02 depende do GO/NO-GO da fase-01 (se NO-GO, abre PRD paralelo e congela o plano); fase-03 importa tipo do helper criado na fase-02 para validar contrato.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Plano 02 e o tracer bullet feature-wide).

A fase-01 e read-only (sem TDD — entrega artefato de relatorio).
fase-02 e fase-03 seguem RED-GREEN-REFACTOR rigoroso.

---

## Gotchas Conhecidos

- **G1 (D21 dispatcher imutavel):** Adicionar `--rollback` NUNCA pode mudar a assinatura de `runInit({argv, opts})`. A flag e detectada DENTRO do `runInit` como early-return ANTES do loop do registry. Nenhum step de rollback no registry.
- **G2 (D24 flag, nao skill separada):** Rollback e UMA flag do mesmo comando `/anti-vibe-coding:init --rollback`. Nao criar `skills/init-rollback/` nem manifest separado.
- **G3 (D29 manifest schema canonico):** O schema do manifest e contrato com o Plano 05 fase-04 (rollback completo). NAO renomear campos sem atualizar PRD. Schema: `{ timestamp: ISO 8601, files: ReadonlyArray<{ originalPath, backupPath, sha256, action: 'overwrite' | 'move' | 'transform' }>, gitSha: string | null }`.
- **G4 (RNF-04 idempotencia do backup):** Se o estado atual ja foi capturado em um backup anterior com checksum identico, `createBackup` deve detectar e fazer no-op (retornar o backup existente). Garante que cross-runs nao inflam `.anti-vibe/backup/`.
- **G5 (R-04 / DI-06 Windows safety):** Helpers usam `await import()` quando ha imports dinamicos. Path joins via `path.join` — nunca concatenacao de strings com `/`. Datas formatadas via `toISOString()` removendo `:` para path-safe (Windows nao aceita `:` em pastas): `2026-05-18T14:30:00Z` -> `2026-05-18-143000`.
- **G6 (gitSha opcional):** Repos sem `.git` sao validos. `getGitSha()` deve retornar `null` silenciosamente, nao lancar erro.
- **G7 (audit log nao se aplica ainda):** Plano 06 fase-01 padroniza `subagent_id`. Aqui apenas garantir que estrutura do backup nao impede futura integracao com `AuditLogWriter`.
- **G8 (fase-01 e read-only mas mandatoria):** D25 elevou a auditoria a fase obrigatoria. Se execute-plan NAO suporta wave-based paralelo, este plano PAUSA: ate Plano 02 nao tem como gerar PLAN.md de populacao compativel.

---

## Criterios de Exit (plano completo quando)

- [ ] `EXECUTE_PLAN_AUDIT.md` existe em `plano01/` com veredito GO ou NO-GO documentado, evidencias (path/linha) e lista de pelo menos 3 capacidades avaliadas.
- [ ] `skills/init/lib/backup-anti-vibe.ts` cria e le backup conforme schema D29, com testes verdes para os 6 casos da fase-02.
- [ ] `skills/init/lib/rollback.ts` (stub) existe e e invocado pelo `runInit` quando `--rollback` esta presente — registry NAO e iterado nesse caso (verificado por teste com registry mockado).
- [ ] `bun test skills/init/lib/backup-anti-vibe.test.ts skills/init/lib/rollback.test.ts skills/init/lib/run-init-rollback.test.ts skills/init/lib/parse-flags.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean em `skills/init/lib/backup-anti-vibe.ts`, `skills/init/lib/rollback.ts`, `skills/init/lib/run-init.ts`, `skills/init/lib/parse-flags.ts`.
- [ ] `MEMORY.md` deste plano registra qualquer DI/BUG/GT descoberto durante execucao.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
