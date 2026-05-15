# Memoria: Plano 04 — Manifest + Harness Validate: Fase 4

**Feature:** /init Migration Mode
**Iniciado:** —
**Status:** completed (3/3 fases)

---

## Decisoes de Implementacao

**DI-01 (fase-01):** `AGENTS.md`, `ARCHITECTURE.md` e `CLAUDE.md` não estão no `TEMPLATE_MANIFEST` (são arquivos user-owned, não scaffolded pelo plugin). O `VALID_SLOTS` derivado de `TEMPLATE_MANIFEST` não os cobria, mas `SLOT_TIERS` os referencia (Tier 1: ARCHITECTURE.md, CLAUDE.md; Tier 5: AGENTS.md). Solução: adicionado `EXTRA_SLOTS` Set com esses 3 arquivos + union com `VALID_SLOTS` no `inferSlotFromPlanFile`. Planos seguintes que validem slots devem usar a mesma abordagem: `VALID_SLOTS | EXTRA_SLOTS`.

## Decisoes de Implementacao (fase-02)

**DI-02 (fase-02):** `_projectRoot` marcado como parâmetro com underscore em `checkMigrationConsistency` porque a implementação atual opera apenas sobre `manifest.migrationPlans` (Set lookup). O param existe para extensibilidade futura (leitura de plan files), sem uso real agora.

**DI-03 (fase-02):** Regex de extração de slot em `main()` usa `match(/Missing required file: (.+)/)` sobre a mensagem de warning. Frágil mas intencional (script standalone sem estrutura tipada de Failure). Se a mensagem de `checkRequiredFiles` mudar, atualizar o regex aqui.

## Decisoes de Implementacao (fase-03)

**DI-04 (fase-03):** Plano 01 fase-03 (SKILL.md routing com detectInitMode) foi marcado "concluído" no STATE.md mas nunca commitado. O commit `955ce79` (fase-04) não inclui SKILL.md. Backfill feito aqui: Passo 0 substituído integralmente, incluindo detectInitMode + 4 branches + autoFlipIfComplete no branch migration.

**DI-05 (fase-03):** `autoFlipIfComplete` retorna `AutoFlipResult` em vez de mutar in-place para permitir que o caller (SKILL.md) decida o que fazer com base no resultado sem efeitos colaterais inesperados.

## Bugs Descobertos

Nenhum.

## Gotchas

**G-fase-02-01:** `harness:validate` já falhava antes de fase-02 (broken links em plano05 que referenciam arquivos ainda não criados). Não é regressão.

## Desvios do Plano

**DEV-01 (fase-01):** Spec não previa que `AGENTS.md`/`ARCHITECTURE.md`/`CLAUDE.md` estão fora do `TEMPLATE_MANIFEST`. O `VALID_SLOTS` set precisou ser expandido com `EXTRA_SLOTS`. Impacto: lógica de validação de slot correta, sem impacto funcional.

**DEV-02 (fase-02):** Sem desvios. Implementação seguiu spec exatamente.

**DEV-03 (fase-03):** Backfill de Plano 01 fase-03 feito junto com fase-03. O Passo 0 do SKILL.md nunca havia sido atualizado com detectInitMode — o commit `955ce79` (fase-04) não incluiu SKILL.md. A fase-03 entregou ambas as mudanças: SKILL.md routing + autoFlipIfComplete.

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 2 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

## Notas para Planos Seguintes

<!-- Insights capturados aqui que o Plano 05 deve saber -->

<!-- Atualizado automaticamente durante execucao -->
