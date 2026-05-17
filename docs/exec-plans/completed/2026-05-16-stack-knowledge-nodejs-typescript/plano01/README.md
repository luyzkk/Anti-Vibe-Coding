# Plano 01: Tracer Bullet — matrix skeleton + pilot atom + minimal init + 1 skill wire

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~6.5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (estende init para multi-stack + telemetria), Plano 03 (replica preface em 6 skills cross-stack), Plano 04 / Plano 05 / Plano 06 (consomem matrix skeleton + frontmatter template)

---

## O que este plano entrega

Slice end-to-end mínimo do Stack Knowledge Layer: 1 átomo piloto (`type-system-idioms.md`) + INDEX skeleton + `/init` monostack (só caminho feliz Node+TS) + bloco `stack-aware-preface` em `/security`. Valida arquitetura ponta a ponta (matrix → init → projeto → skill) antes de escalar para os outros 5 planos. Encerra com E2E que prova CA-02, CA-05 e CA-09.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado com decisões D1, D2, D3, D11, D13, D14 | `../PRD.md` | pronto |
| `_topic-plan.md` com skeleton fixo do átomo (linhas 73-112) | `docs/knowledge/nodejs-typescript/_topic-plan.md` | pronto |
| `_catalog.md` com fontes do átomo piloto (`f8f4e50c`, `2230af87`) | `docs/knowledge/nodejs-typescript/_catalog.md` | pronto |
| `skills/init/lib/detect-stack.ts` existente (retorna id `node-ts`) | codebase | pronto |
| `skills/init/lib/state-md-init.ts` existente (escreve `detected_stack` em STATE.md) | codebase | pronto |
| Pattern `profile-aware-preface` em `skills/security/SKILL.md:10-30` como referência | codebase | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Frontmatter template + skeleton validados no átomo piloto | Planos 04, 05, 06 (escrita dos 13 átomos restantes — qualquer drift = regression) |
| Pasta `docs/knowledge/nodejs-typescript/` + INDEX.md skeleton | Plano 06 fase-04 (substitui INDEX skeleton pelo final consolidado) |
| `skills/init/lib/write-stack-json.ts` + `copy-knowledge.ts` (monostack) | Plano 02 fase-01..03 (estende para multi-stack + flag `--refresh-knowledge`) |
| Mapa de alias `'node-ts' → 'nodejs-typescript'` | Plano 02 (estende alias map para Rails/Python/Go quando chegarem) |
| Bloco `<!-- stack-aware-preface:start --> ... :end -->` em `/security` | Plano 03 (copia verbatim nas 6 skills cross-stack restantes) |
| E2E `tests/e2e/stack-knowledge-tracer-bullet.test.ts` como template de assert | Plano 02 fase-05 (estende para CA-03, CA-06, CA-07, CA-10) e Plano 06 fase-06 (CA-01..10 completo) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-scaffold-matrix-skeleton.md | `docs/knowledge/nodejs-typescript/INDEX.md` (esqueleto) + `atoms/` (pasta vazia) | 0.5h | — |
| 02 | fase-02-pilot-atom-type-system-idioms.md | átomo piloto `type-system-idioms.md` completo (~120-150 linhas) | 2h | fase-01 |
| 03 | fase-03-init-monostack-extension.md | `/init` estendido: escreve `.claude/stack.json` + copia knowledge (caminho Node+TS feliz) | 1.5h | fase-01 |
| 04 | fase-04-wire-security-stack-aware-preface.md | bloco `stack-aware-preface` adicionado em `skills/security/SKILL.md` | 1h | fase-03 |
| 05 | fase-05-tracer-bullet-e2e.md | E2E que prova CA-02 + CA-05 + CA-09 end-to-end | 1.5h | fase-02, 03, 04 |

---

## Grafo de Fases

```
fase-01 (scaffold matrix skeleton)
    |
    +-----------+-----------+
    |                       |
    v                       v
fase-02 (pilot atom)    fase-03 (init monostack)
    |                       |
    |                       v
    |                   fase-04 (wire /security)
    |                       |
    +-----------+-----------+
                |
                v
        fase-05 (tracer bullet E2E)
```

**Paralelismo possivel:** após fase-01, as fases 02 e 03 podem rodar em paralelo (não compartilham arquivos). Fase-04 depende exclusivamente de fase-03 (precisa de `.claude/knowledge/INDEX.md` para validar manualmente o preface). Fase-05 fecha o ciclo e exige as três anteriores.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01 e 02 são **content-only** (markdown puro, sem código TS novo): usam checklist de validação de conteúdo em vez de RED→GREEN. Fases 03, 04 e 05 seguem TDD rigoroso (cada uma tem cycle explícito na seção Verificação).

**Tracer Bullet deste plano:** fase-05 — o E2E é literalmente o tracer fechando o ciclo (matrix → init → projeto → skill preface). Se fase-05 verde, arquitetura validada; planos 02-06 podem prosseguir em paralelo com segurança.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Naming reconciliação `node-ts` ↔ `nodejs-typescript`:** `detectStack()` em `skills/init/lib/detect-stack.ts:8` define `StackId = 'node-ts'`. PRD/matrix usa `nodejs-typescript` como nome de pasta. **Resolver em fase-03 via alias map** (ex: `STACK_ID_TO_MATRIX_FOLDER: Record<StackId, string> = { 'node-ts': 'nodejs-typescript', ... }`). **NÃO modificar `detect-stack.ts`** em v6.3.2 — quebraria `writeStackToStateMd` (CA-10 regressão). Decisão documentada como DI-1 em MEMORY.md.
- **G2 — CA-10 regressão:** `skills/init/lib/state-md-init.ts` escreve `detected_stack: <id>` em `docs/STATE.md` desde v6.0.0. Esse comportamento **permanece intacto**. O novo `.claude/stack.json` é **aditivo** — não substitui STATE.md, vive paralelo. Qualquer mudança em `state-md-init.ts` é fora do escopo deste plano.
- **G3 — Pilot atom é gate de tamanho (D3):** átomo piloto **DEVE** cair entre 100-200 linhas (idealmente 120-150 conforme `_topic-plan.md:54`). Se <60 ou >200, granularidade dos 14 átomos está errada — parar e revisar antes de iniciar Planos 04-06. Consequência aceita no PRD §Riscos (linha 273).
- **G4 — Bloco `stack-aware-preface` é template para Plano 03:** o bloco adicionado em fase-04 vira **referência verbatim** para as outras 6 skills cross-stack no Plano 03. Manter o snippet curto, self-contained, com imports `node:fs` (que já são usados em outras skills — sem nova dependência). PRD §Mecanismo "Skill wire-up" (linhas 107-114) tem o snippet exato.
- **G5 — Performance da cópia (CA-02 ≤100ms) é SLA medível:** com 1 átomo a meta é trivial (~10ms esperado para markdown estático). E2E em fase-05 mede e registra como baseline. Extrapolação para 14 átomos no Plano 06 é linear na contagem de arquivos.
- **G6 — Aliases NÃO renomeiam pastas:** o alias map vive **só** em `copy-knowledge.ts` (resolve nome de pasta no matrix). Em STATE.md continua `detected_stack: node-ts`. Em `.claude/stack.json` o campo `primary` armazena o **id canônico do matrix** (`nodejs-typescript`) — alias aplicado no momento da escrita. Documentar essa dupla representação como DI-2 em MEMORY.md.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
