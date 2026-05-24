# Plano 02: Reentrada, Migracao V5 e Validator Pos-Init

**Feature:** Knowledge Path Cutover (docs/knowledge → knowledge/) ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4.5h
**Depende de:** Plano 01 (Cutover Foundation + Distribuicao — path `knowledge/` estabelecido, sync distribuindo, AbortError em copy-knowledge, goldens regenerados)
**Desbloqueia:** Pos-merge lessons-learned hand-off

---

## O que este plano entrega

Completa o caminho de upgrade: re-populate forca refresh dos atoms existentes (sem drift entre cache e projeto), migra artefatos de init v5 (`docs/knowledge/legacy-claude-knowledge/` → `docs/_legacy/knowledge/`) com guard de colisao, e adiciona validacao pos-init com dois niveis de severidade (bloqueante para stack sem matrix; warning sunset v7.0.0 para `docs/knowledge/` orfao remanescente). Encerra com entry 6.6.0 no CHANGELOG e nota arquitetural opcional.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `knowledge/` na raiz do plugin (git mv executado) | Plano 01, fase-01 | pendente |
| Bump 6.6.0 propagado em 7 arquivos | Plano 01, fase-02 | pendente |
| Mensagens `copy-knowledge.ts` apontando para `knowledge/` (nao `docs/knowledge/`) | Plano 01, fase-03 | pendente |
| `sync-to-global.sh` copiando `knowledge/` + exit 1 pós-sync | Plano 01, fase-04 | pendente |
| `copy-knowledge.ts` lancando AbortError quando `primary !== null` e source ausente | Plano 01, fase-05 | pendente |
| Fixtures e goldens regenerados; `harness-validate.ts:659` apontando para `knowledge/` | Plano 01, fase-06 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Plano 02 completo (todos os CAs do PRD cobertos) | Pos-merge: `/anti-vibe-coding:lessons-learned` |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-refresh-on-reentry.md | Refresh automatico dos atoms quando `__reentryMode='re-populate'` e `.claude/knowledge/` existe | ~1.5h | Plano 01 completo |
| 02 | fase-02-migrate-knowledge-path-step.md | Step `13_1-migrate-knowledge-path.ts` que move `docs/knowledge/legacy-claude-knowledge/` → `docs/_legacy/knowledge/` com guard de colisao | ~1.5h | Plano 01 completo |
| 03 | fase-03-validator-post-init-checks.md | 2 checks em `90-final-validation.ts`: primario bloqueante (stack sem matrix) + secundario warning (orphan `docs/knowledge/`) | ~1.5h | Plano 01 completo |
| 04 | fase-04-changelog-and-arch-note.md | Entry CHANGELOG 6.6.0 + nota arquitetural ARCHITECTURE.md + closing checklist + lessons-learned hand-off | ~45min | fase-01, fase-02, fase-03 |

---

## Grafo de Fases

```
[Plano 01 completo]
        |
        v
fase-01 (refresh-on-reentry)    fase-02 (migrate-knowledge-path-step)    fase-03 (validator-post-init-checks)
        |                                       |                                       |
        +---------------------------------------+-----------------------+---------------+
                                                |
                                                v
                                    fase-04 (changelog-and-arch-note)
```

**Paralelismo possivel:** fase-01, fase-02 e fase-03 podem rodar em paralelo apos Plano 01 estar completo — nao ha dependencias mutuas entre elas. fase-04 depende das tres anteriores (CHANGELOG fecha todos os CAs).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Plano 02 constroi sobre foundation do Plano 01)

---

## Decisoes do PRD Aplicadas neste Plano

| Decisao | Fase |
|---------|------|
| D5 (refresh em re-populate: `__reentryMode='re-populate'` E destExists) | fase-01 |
| D3 (destino v5 = `docs/_legacy/knowledge/`) | fase-02 |
| D7 (step dedicado `migrate-knowledge-path`, numbering `13_1-`) | fase-02 |
| D8 (validator 2 checks: primario bloqueante + secundario warning sunset) | fase-03 |
| AR-01 (backupPre650 idempotente — sem colisao com migrate-knowledge-path) | fase-02 |
| AR-03 (numbering `13_1-migrate-knowledge-path` confirmado, posicao entre migrate4DecisionsStep e scaffoldFullTreeStep) | fase-02 |
| AR-04 (constante inline, sem constants.ts central — padrao ja estabelecido em reentry-guard) | fase-01 |
| AR-05 (DOIS validadores: Step 90 final-validation = alvo deste plano; harness-validate.ts ja atualizado no Plano 01 fase-06) | fase-03 |

---

## Gotchas Conhecidos

- **G1 (caller `03_1` vs `runStackKnowledgeInit`):** `persistStackKnowledgeStep` nao chama `copyKnowledge` diretamente — delega para `runStackKnowledgeInit`. O `refresh` flag precisa ser propagado por toda a cadeia: `03_1` → `runStackKnowledgeInit` → `copyKnowledge`. Verificar assinatura de `RunStackKnowledgeInitOpts` antes de adicionar o campo.

- **G2 (dry-run guard em `03_1`):** O step ja tem guard `if (ctx.flags['dry-run'] === true) return ...`. A logica de `refresh` so deve ser derivada quando nao for dry-run — nao ha colisao, mas verificar que o early-return ocorre ANTES da derivacao de `refresh`.

- **G3 (AR-01 — sequencia de steps):** O `backupPre650Step` roda antes do `migrate-claude-artifacts` (que popula `docs/knowledge/legacy-claude-knowledge/`). `migrate-knowledge-path` roda APOS `migrate4DecisionsStep`. A sequencia correta no registry e: (1) backupPre650 copia tudo defensivamente → (2) migrate-claude-artifacts popula `docs/knowledge/legacy-claude-knowledge/` → (3) migrate-knowledge-path move para `docs/_legacy/knowledge/`. Sem overlap.

- **G4 (guard de colisao — `docs/_legacy/knowledge/` vs `docs/_legacy/pre-6.5.0/`):** `backupPre650Step` cria `docs/_legacy/pre-6.5.0/` (ou `pre-6.5.0-{ts}` em 2a execucao). O destino do migrate-knowledge-path e `docs/_legacy/knowledge/` — pasta diferente, sem overlap. Mas se o usuario tiver rodado `/init` antes com um step que ja criou `docs/_legacy/knowledge/`, o guard de colisao aborta corretamente.

- **G5 (validator `90-final-validation.ts` — modo warning atual):** O validator atual nao lanca AbortError. O check PRIMARIO deste Plano 02 fase-03 e BLOQUEANTE — deve lanar AbortError. Isso muda o comportamento do Step 90 para casos especificos (stack detectada sem matrix). Os demais checks existentes continuam nao-bloqueantes. Garantir que o try/catch externo nao engula o novo AbortError.

- **G6 (leitura de stack no validator):** O validator precisa saber qual stack foi detectada. `STATE.md` ou manifest sao as fontes. Verificar se `STATE.md` esta disponivel em `ctx.cwd` e qual campo contem a stack. Alternativa: ler `.claude/stack.json` (escrito por `03-detect-stack-and-register`).

- **G7 (warning sunset v7.0.0 — comentario com data):** O PRD especifica a data `2026-05-19` no comentario inline. O PLAN.md usa `2026-05-19`. Usar `2026-05-20` (data real da execucao do Plano 02) para consistencia com provenance real, OU manter `2026-05-19` para alinhar com o PRD. Decisao: usar `2026-05-20` (data de implementacao real).

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
