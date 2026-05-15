# Memoria: Plano 01 — Fundação: Category Field + Detection + Tracer Bullet

**Feature:** /init Migration Mode
**Iniciado:** 2026-05-14
**Status:** em andamento

---

## Decisoes de Implementacao

<!-- Registrar aqui escolhas feitas durante execucao que desviam ou refinam o plano -->

**DI-01 (fase-01):** `template-manifest.test.ts` já existia antes desta fase — o plano dizia "Criar", mas o arquivo tinha 4 testes existentes. Os 4 novos testes de `category` foram adicionados sem remover os existentes. Total: 8 testes no arquivo.

**DI-02 (fase-01):** Contagem final calibrada: 22 `canon-andre` + 9 `anti-vibe-extension` = 31 total. Os candidatos `product-specs/index.md` e `references/README.md` foram classificados como `canon-andre` (existem no harness original de André Prado).

## Bugs Descobertos

<!-- Registrar bugs encontrados durante implementacao com causa raiz -->

## Gotchas

<!-- Registrar gotchas nao previstos no plano -->

## Desvios do Plano

<!-- Registrar qualquer desvio de escopo, sizing ou sequencia de fases -->

**DEV-01 (fase-01):** Plano dizia "Criar template-manifest.test.ts" mas o arquivo já existia com 4 testes. Testes de `category` foram apendados, não substituídos. Comportamento correto — sem impacto na entrega.

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

## Decisoes de Implementacao (cont.)

**DI-03 (fase-03):** Novo "Passo 0" inserido NO TOPO do SKILL.md (antes do Step 0.5), não na posição original do antigo "Passo 0". Gotcha G1 respeitado — LLM lê o arquivo sequencialmente e precisa ver o routing de detectInitMode antes do Step 0.5.

**DI-04 (fase-03):** Step 0.5 mantido no arquivo (não removido), apenas marcado `<!-- DEPRECATED: coberto pelo Passo 0 via detectInitMode -->`. Garante backward compat e rastreabilidade histórica sem risco de quebrar chamadas existentes.

**DI-05 (fase-03):** Step migration.0 adicionado como stub imediato após o Passo 0. Referencia `migration-tracer.ts` (a ser criado na fase-04). O LLM não executará este step até que o módulo exista.

**DI-06 (fase-04):** TypeScript discriminated union — o teste original do spec acessava `result.detectedMode` sem narrowing no branch `wrong-mode`. Corrigido com `if (result.status === 'wrong-mode')` guard. A função retorna 3 shapes (ok/wrong-mode/error) e somente `wrong-mode` tem `detectedMode` na union sem `error`.

**DI-07 (fase-04):** Smoke test do spec usa `/tmp/` (Unix) — no Windows, `bun` resolve como `\tmp\` relativo ao drive, que não existe. Os testes automatizados com `os.tmpdir()` passam corretamente. Não alterar o smoke test do spec — é um gotcha documentado (GT-04 na fase).

## Notas para Planos Seguintes

<!-- Insights capturados aqui que o Plano 02 / 03 / 04 devem saber -->

- `template-manifest.test.ts` existe e tem 8 testes (4 de category, 4 anteriores) — Plano 02 deve apender, não recriar.
- `product-specs/index.md` e `references/README.md` são `canon-andre` (existem no harness André Prado original).
- A contagem de 6 testes pré-existentes falhando na suite geral (`harness-validate`, `generate-manifest`, `plugin-manifest`) é pré-existente ao Plano 01 — não é regressão deste plano.
- `migration-mode-detector.ts` criado em `skills/init/lib/` — exporta `detectInitMode(targetDir)` retornando `InitModeResult`. Fixture pattern usa `__fixtures__/detect-init-mode` com `beforeEach`/`afterEach` reset. `detectV5Legacy` é importado de `./detect-v5-legacy`, não reimplementado.
- `HARNESS_MARKER_PATHS` exclui 6 READMEs do scaffold da contagem de migration (G2 resolvido).
- `MIN_POPULATED_DOCS = 5` é constante nomeada no módulo.
- `skills/init/SKILL.md` agora começa com "Passo 0 — Detectar Modo de Inicialização" (4 branches) + "Step migration.0" stub + "Step 0.5 DEPRECATED". Plano 02 não deve editar o Step 0.5.
- `bun run harness:validate` falha com links quebrados em plano04/plano05 (templates com `${relLink}`) e em refatoracao-prd-folders (PLAN.md movido). Pré-existente, não é regressão. Plano 04 deve corrigir ao implementar os templates reais.
- `migration-tracer.ts` criado em `skills/init/lib/` — exporta `runMigrationTracer(targetDir)` retornando `MigrationTracerResult`. Cria migration plan com 10 seções e manifest com `initMode: "migration"` + `tracerBullet: true`. O campo `tracerBullet` distingue manifests do tracer de manifests completos (Plano 04 deve expandir, não substituir).
- Smoke test `/tmp/` não funciona no Windows — usar `os.tmpdir()` em testes (padrão já adotado). Plano 02 deve criar fixtures com `os.tmpdir()`.
- `MigrationTracerResult` é union discriminada com 3 shapes: `ok`, `wrong-mode`, `error`. Acessar campos específicos requer narrowing via `if (result.status === ...)`.
- Plano 01 concluído em 2026-05-14 — todos os 4 fases entregues. Plano 02 pode prosseguir.

<!-- Atualizado automaticamente durante execucao -->
