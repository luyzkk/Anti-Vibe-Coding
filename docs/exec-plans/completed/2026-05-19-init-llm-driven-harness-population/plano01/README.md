# Plano 01: Refactor de Registry (Tracer Bullet)

**Feature:** init-llm-driven-harness-population ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~6h
**Depende de:** Nenhum (primeiro plano — Tracer Bullet)
**Desbloqueia:** Plano 02 (Scaffold expandido + Backup pre-mutacao)

---

## O que este plano entrega

Registry da init reordenado para resolver Bug C (Step 91 antes do Step 90), com steps heuristicos
07/08/09-propose-merge/11 removidos do pipeline e Step 10 renomeado para `10-backup-pre-mutation`
preservando linhagem git. Resultado: pipeline limpo, sem heuristica regex residual, pronto para
o gerador LLM-driven dos Planos 02-05.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado com MH-01, MH-04, MH-05 | `../PRD.md` | pronto |
| CONTEXT com D3 (renomear preservando git mv) | `../CONTEXT.md` | pronto |
| Registry atual com Steps 07-11 + Step 91 na ultima posicao | `skills/init/lib/registry.ts` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Registry sem Steps 07/08/09-propose-merge/11 | Plano 02 (adiciona logica de backup em 10-backup-pre-mutation) |
| Step 91 antes do Step 90 (Bug C resolvido) | Plano 03 (Step 91 vira coracao LLM-driven) |
| `10-backup-pre-mutation.ts` (arquivo renomeado) | Plano 02 fase-03 (preenche logica do backup leve) |
| `registry.test.ts` atualizado para nova ordem | Plano 05 fase-04 (E2E reescrito) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-reorder-step91-before-90.md | Tracer Bullet: swap Step 91 antes do Step 90 + smoke test | 1h | — |
| 02 | fase-02-remove-step-07-discover-docs.md | Remove Step 07 do registry + deleta arquivos + imports | 1h | fase-01 |
| 03 | fase-03-remove-steps-08-09-11.md | Remove classify-blocks-hybrid, propose-merge-batch, move-docs-with-stub + libs orfas | 1.5h | fase-01 |
| 04 | fase-04-rename-step-10-backup-pre-mutation.md | `git mv` Step 10 preservando linhagem + reduz escopo a backup leve | 1.5h | fase-03 |
| 05 | fase-05-update-registry-tests.md | Atualiza `registry.test.ts` + marca quais E2E quebram | 1h | fase-02, fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (reorder Step 91 antes do Step 90)  <-- Tracer Bullet
    |
    +-------------+----------------+
    |                              |
    v                              v
fase-02 (remove Step 07)     fase-03 (remove 08/09/11)
    |                              |
    |                              v
    |                       fase-04 (rename Step 10 via git mv)
    |                              |
    +-------------+----------------+
                  |
                  v
        fase-05 (update registry tests + flag E2E quebrados)
```

**Paralelismo possivel:** fase-02 e fase-03 podem rodar em paralelo apos fase-01 (tocam arquivos
independentes). fase-04 entra depois da fase-03 para garantir que o contexto do Step 10 (que
referenciava modulos removidos em fase-03) esteja limpo antes do rename. fase-05 fecha
sincronizando todas as anteriores.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-01 (reorder Step 91 antes do Step 90 + smoke test minimo).

**Nota TDD especifica:** fases 02/03/04 sao majoritariamente DELETE (remocao de steps).
O ciclo TDD vira: RED = `registry.test.ts` falha apontando step removido referenciado por
teste antigo; GREEN = atualiza teste para refletir ausencia; REFACTOR = remove import morto.
fase-05 e a unica que executa o ciclo TDD classico de forma plena (modifica testes ativos).

---

## Gotchas Conhecidos

- **G1:** Cuidado para nao quebrar E2E tracer-bullet existente (`tests/e2e/init-tracer-bullet.test.ts`,
  `tests/e2e/init-cutover-greenfield.test.ts`, `tests/e2e/ca12-greenfield-populate-validate.test.ts`,
  `tests/e2e/ca13-dry-run-parity.test.ts`). Os testes E2E que assumem Steps 07-11 ainda no
  pipeline VAO quebrar nesta refactor — Plano 05 fase-04 reescreve formalmente. Aqui apenas
  documentamos quais E2E quebram e marcamos `test.skip` com motivo apontando para Plano 05
  fase-04. NUNCA deletar testes E2E nesta refactor — apenas skipar.
- **G2:** Ordem importa — Step 91 deve ficar ANTES de Step 90, NAO no final.
  O PRD MH-01 e CA-07 sao explicitos: Step 91 precisa rodar antes de Step 90 para
  garantir que `PLAN.md` seja gerado mesmo quando Step 90 emite warning/abort.
  O comentario atual em `registry.ts` linhas 69-71 esta INCORRETO ("Step 91 SEMPRE apos
  finalValidationStep") — esta fase corrige.
- **G3:** `git mv` preserva linhagem mas requer commit antes do rename (caso contrario
  o git pode interpretar como delete+create no mesmo commit, perdendo o follow).
  fase-04 detalha o protocolo: (a) commit fase-03 (deletes) primeiro; (b) `git mv`; (c) commit
  do rename isolado; (d) commit do conteudo novo. Tres commits separados para historico limpo.
- **G4:** Libs orfas — apos remover Step 07/08/09/11, varios modulos em `skills/init/lib/`
  ficam sem callers: `blocks-classifier.ts`, `doc-mover-stub.ts`, `merge-proposal-types.ts`,
  `preview-renderer.ts`. `discovery-store.ts` PODE ainda ser usado pelo Step 06 (secrets-scan
  escreve `secrets-scan-result` via writeDiscoveryArtifact). Verificar callers antes de deletar
  qualquer lib — fase-03 descreve a checagem com `grep` exato.
- **G5:** `registry.test.ts` linha 3-7 importa `proposeMergeBatchStep`, `classifyBlocksHybridStep`,
  `applyMergeDestructiveStep`, `moveDocsWithStubStep`, `linkClaudeAgentsStep`. fase-05 limpa
  imports orfaos e remove os testes "positions propose-merge-batch immediately after..." e
  "positions apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents".

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
