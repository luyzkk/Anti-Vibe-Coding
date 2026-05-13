# Plano 03: Migration v5→v6 (.planning/ → docs/, backup, dry-run)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 7
**Sizing total:** ~12.5h
**Depende de:** Plano 02 (Full Scaffold — templates 14+ docs, `lib/scaffold-full-tree.ts`, `lib/detect-stack.ts`, manifest)
**Desbloqueia:** Plano 08 (Dog-fooding — reusa migration para o próprio plugin)

---

## O que este plano entrega

`/init` passa a detectar a estrutura v5.x (`.planning/`, `lessons-learned.md`, `decisions.md`, `senior-principles.md`) num projeto existente e oferece migração **idempotente** para o layout v6 (`docs/exec-plans/`, `docs/compound/`, `docs/design-docs/`). Toda a operação é precedida de **backup atômico** em `.planning.v5-backup/` (R2, R14) e suporta flag global `--dry-run` (CA-10) que mostra o diff completo sem mutar disco. Conversões cobrem 4 fontes:

- `.planning/CONTEXT-*.md` + `.planning/{date-slug}/PRD.md` + `.planning/{date-slug}/PLAN.md` → `docs/exec-plans/active/` + `docs/product-specs/`
- `lessons-learned.md` → N arquivos `docs/compound/YYYY-MM-DD-{slug}.md` com YAML frontmatter (CA-29 contract)
- `decisions.md` → N arquivos `docs/design-docs/ADR-NNNN-{slug}.md` (CA-15 contract)
- `senior-principles.md` → `docs/design-docs/core-beliefs.md` (CA-38, validado tematicamente por Plano 08)

Atende **D3** (migração total), **D9 + D15** (`/init` absorve e detecta), **M8** (oferta + backup + dry-run + ≤120s), **R2/R14** (backup + dry-run + E2E). Gating do plano é fase-07 — fixture `legacy-v5` passa de v5.x → v6 válido (CA-09).

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Helper `lib/scaffold-full-tree.ts` (cria árvore `docs/` completa) | Plano 02 fase-02 | pendente |
| Manifest de templates (`TEMPLATE_MANIFEST`) com paths v6 (`docs/exec-plans/active/README.md`, `docs/compound/README.md`, etc.) | Plano 02 fase-01 | pendente |
| Helper `lib/detect-stack.ts` (reusado em produção, não por este plano diretamente — mas o detector v5 herda padrão de probes funcionais) | Plano 02 fase-06 | pendente |
| Skill `/init` esqueleto com integração de scaffold + symlink-fallback | Plano 01 fase-02 + Plano 02 fase-02 | pendente |
| Fixture `tests/fixtures/empty-dir/` (base para variante `legacy-v5/`) | Plano 01 fase-05 | pendente |
| PRD com CAs CA-09, CA-10, M8, R2, R14, D3, D15 | `../PRD.md` | pronto |
| Fontes reais para perfilar parsing: `anti-vibe-coding/lessons-learned.md`, `anti-vibe-coding/decisions.md`, `.planning/*/PRD.md`, `.planning/CONTEXT-*.md` | repo atual | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| Helper `lib/detect-v5-legacy.ts` (heurística de "isto é projeto v5.x") | Plano 08 fase-01 (dog-food usa em si próprio) |
| Helper `lib/backup-planning.ts` (backup atômico idempotente) | Plano 08 (mesma operação no plugin) |
| Helpers `lib/migrate-planning.ts`, `lib/migrate-lessons.ts`, `lib/migrate-decisions.ts` | Plano 08 fase-04/05/06/07 (executa contra o próprio repo `anti-vibe-coding/`) |
| Helper `lib/dry-run.ts` (`DryRunMode` + virtual FS overlay) | Plano 06 (CRUD de lessons/ADRs em soft-delete pode reusar diff renderer) |
| Fixture `tests/fixtures/legacy-v5/` (snapshot canônico de projeto v5.x) | Plano 08 fase-04 (smoke contra repo plugin), CA-36 (rollback test) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-detector-v5.md | Helper `detectV5Legacy(targetDir)` + `LegacyState` type | 1h | — |
| 02 | fase-02-backup-idempotente.md | Helper `backupPlanning(targetDir)` cria `.planning.v5-backup/` atomicamente | 1.5h | fase-01 |
| 03 | fase-03-migrate-planning-to-exec-plans.md | Converte `.planning/CONTEXT-*.md` + `PRD.md` + `PLAN.md` → `docs/exec-plans/active/` + `docs/product-specs/` | 3h | fase-02 |
| 04 | fase-04-migrate-lessons-para-compound.md | Divide `lessons-learned.md` em compound notes individuais com frontmatter | 2h | fase-02 |
| 05 | fase-05-migrate-decisions-para-adrs.md | Converte `decisions.md` em `ADR-NNNN-*.md` | 1.5h | fase-02 |
| 06 | fase-06-dry-run-mode.md | Flag `--dry-run` propagada a fase-02/03/04/05 (renderer de diff, zero IO) | 1.5h | fase-03, 04, 05 |
| 07 | fase-07-e2e-migration-test.md | Fixture `legacy-v5` → `/init migrate` → estado v6 válido (`harness:validate` exit 0) | 2h | fase-06 |

**Total:** 12.5h.

---

## Grafo de Fases

```
                  Plano 02 (Full Scaffold)
                          |
                          v
                fase-01 (detector-v5)
                          |
                          v
                fase-02 (backup-idempotente) ← GATING: nada muta sem backup
                          |
       +----------+---------------+---------------+
       |          |               |               |
       v          v               v               v
   fase-03   fase-04          fase-05           (paralelas)
   (planning) (lessons)       (decisions)
       |          |               |
       +----------+---------------+
                          |
                          v
                fase-06 (dry-run-mode)  ← envelopa 03/04/05
                          |
                          v
                fase-07 (e2e-migration-test) ← TRACER do plano (CA-09)
```

**Paralelismo possível:** após fase-02 concluída, **fase-03 ‖ fase-04 ‖ fase-05** são independentes (escrevem em sub-árvores disjuntas de `docs/`: `exec-plans/`, `compound/`, `design-docs/`). Sub-agentes podem ser disparados em paralelo (5-8 arquivos por agente conforme CLAUDE.md global). **fase-06 (dry-run) precisa ser pensada como cross-cutting**: instrumenta os 3 helpers de fase-03/04/05 — implementar depois deles existirem é mais barato que retro-fit. **fase-07** é gating; só roda após dry-run funcionar.

### Decisão de ordem: fase-06 (dry-run) cross-cutting

Dry-run podia ser fase-01 do plano (definir contrato antes de implementar mutações). Optei por **deixar para fase-06** porque:

1. As 3 migrations (03/04/05) já são naturalmente puras-ish — leem, transformam, escrevem. Refactor para `DryRunMode` é mecânico: trocar `fs.writeFile` por `recordWrite(path, body)`.
2. Implementar dry-run primeiro força definir uma abstração de virtual FS que talvez nem o uso real precisa — over-engineering.
3. fase-06 vira **gate de qualidade**: se uma das migrations não consegue ser feita dry-run, é cheiro de side effect mal isolado.

Trade-off: precisa tocar 3 arquivos de helper em fase-06. Aceitável porque está documentado.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, não compilation error)
2. GREEN: código mínimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**TDD natural neste plano:**

- **fase-01 (detector-v5)** — RED: fixture com `.planning/` retorna `LegacyState.isLegacy === false` (heurística trivial inicial); GREEN: heurística detecta `.planning/` OR `lessons-learned.md` OR `decisions.md`.
- **fase-02 (backup)** — RED: chamar `backupPlanning` duas vezes corrompe (sobrescreve backup); GREEN: detecta backup existente, no-op e retorna `{ status: 'already-exists' }`.
- **fase-03 (planning)** — RED: fixture com `.planning/CONTEXT-foo.md` espera `docs/exec-plans/active/foo.md`; falha porque destino não existe. GREEN: implementar `parsePlanningEntry` + writer.
- **fase-04 (lessons)** — RED: fixture com 3 lições em `lessons-learned.md` espera 3 arquivos em `docs/compound/`; falha porque só 1 é criado (parser quebra em primeira heading H2). GREEN: split em `## YYYY-MM-DD:` ou `### [Categoria]` corretamente.
- **fase-05 (decisions)** — RED: fixture com 2 decisões espera `ADR-0001-*.md` + `ADR-0002-*.md` numeradas; falha porque numbering colide. GREEN: counter monotônico + slug do título.
- **fase-06 (dry-run)** — RED: rodar `/init migrate --dry-run` em fixture legacy escreve em disco; GREEN: virtual FS, `recordWrite` em vez de `fs.writeFile`.
- **fase-07 (E2E)** — RED: fixture `legacy-v5/` rodado contra `/init migrate` falha em `harness:validate`; GREEN: amarração end-to-end.

**Tracer Bullet deste plano:** fase-07 (CA-09 verbatim — prova D3, D15, M8, R2 funcionando juntos).

---

## Gotchas Conhecidos

- **G1 (D3 / R2 — fontes de verdade durante migração):** O backup `.planning.v5-backup/` (fase-02) é a fonte de verdade enquanto a migração roda. Helpers de fase-03/04/05 **devem ler do backup**, não da pasta original — assim, mesmo que a migration falhe no meio, o estado original está intacto e a operação é retomável. Documentar isso em SKILL.md do `/init migrate` ("Cor azul: lê do backup; cor vermelha: escreve em docs/").

- **G2 (idempotência herdada de Plano 02):** Cada fase 03/04/05 precisa detectar "já migrado" e ser no-op:
  - fase-03: se `docs/exec-plans/active/{slug}.md` já existe **e** tem mesmo `slug` no frontmatter → skip + log "already migrated".
  - fase-04: se `docs/compound/{date}-{slug}.md` já existe → skip.
  - fase-05: se ADR com mesmo `title` (slug) já existe em `docs/design-docs/` → skip + numbering pula.
  - Rodar `/init migrate` 2x = mesmo resultado (M8 explicitamente exige).

- **G3 (cross-platform paths — herdado Plano 01 G4 / Plano 02 G2):** Sempre `path.join`. `.planning/` no Windows pode ter timestamps com `:` que quebram em alguns FS; ao copiar para backup, normalizar nome do arquivo se contiver chars proibidos (`<>:"/\|?*`). Heurística: se `fs.copyFile` falha com `EINVAL`, renomear no destino para `__sanitized-{n}.md`.

- **G4 (encoding UTF-8 BOM):** Editores Windows às vezes salvam `.md` com BOM. Parser de fase-03/04/05 precisa strip BOM (`body.replace(/^\uFEFF/, '')`) antes de regex match — senão frontmatter parsing falha silenciosamente. Documentar.

- **G5 (slug collision — D3 + CA-29):** Dois `.planning/` planos diferentes podem virar `docs/exec-plans/active/migracao.md` se ambos tiverem slug "migracao". Política de desempate: sufixar com data (`migracao-2026-04-21.md`). Mesma regra para lições com mesmo título.

- **G6 (frontmatter contract — CA-29 herdado, alinhado com Plano 05 fase-01):** Compound notes (fase-04) MUST emitir YAML com chaves obrigatórias `title` (string), `category` (string), `tags` (array), `created` (YYYY-MM-DD). Migration **não inventa** valores — usa heurística do arquivo original (tag do título `[Armadilha]/[Arquitetura]/[Plugin Development]` → `category`; data do header `## 2026-XX-XX:` → `created`; se ausente, usa data do mtime do arquivo origem como fallback documentado). `compound:check` (Plano 04 fase-02) valida.

- **G7 (ADR numbering — CA-15 herdado):** `ADR-NNNN` é numeração monotônica por **diretório de destino**, NÃO global por projeto. Fase-05 precisa ler `docs/design-docs/ADR-*.md` existentes (caso seja re-execução), achar maior NNNN e continuar a partir dali. Atende idempotência (G2) e CA-15.

- **G8 (dry-run não escreve — CA-10 + R14):** `DryRunMode` é um type-flag passado a TODOS os helpers que tocam disco. Trocar `fs.*` por um wrapper `recordOrWrite(mode, op)` é obrigatório — testes unitários precisam **provar** zero side effect em dry-run (assertar `fs.stat(targetDir/docs)` rejeita com ENOENT após dry-run). Atende R14 (delete acidental impossível em dry-run).

- **G9 (provenance comments — D2 + memo template):** Toda linha TS gerada em `lib/migrate-*.ts`, `lib/backup-planning.ts`, `lib/detect-v5-legacy.ts`, `lib/dry-run.ts` leva header `// 2026-05-11 (Luiz/dev): por que isto existe`. Templates `.md` (output user-facing — compound notes geradas, ADRs gerados) **não** levam provenance — são para o usuário final.

- **G10 (idioma do output gerado — D2):** Arquivos gerados por migration vão para `docs/` (estrutura institucional) e portanto **deveriam estar em EN** (D2). MAS: conteúdo de origem (`lessons-learned.md` do plugin, `decisions.md`) está em PT. **Política decidida nesta fase:** preservar idioma original do conteúdo (não traduzir), só estrutura/frontmatter em EN. Plano 08 (dog-food) tem opção futura de traduzir manualmente. Documentado em CA-09 implicitamente (estado válido = `harness:validate` passa; validador não checa idioma).

- **G11 (M8 sizing — ≤120s):** Migração precisa rodar em ≤120s em projeto v5 médio (~50 entries em lessons, ~10 ADRs, ~5 planos). Para isso, fase-03/04/05 devem usar `Promise.all` em escritas independentes (não loop sequencial). Documentar como gotcha de implementação.

### Ambiguidades sinalizadas (precisa resposta antes de executar)

- **Ambiguity G-A1:** PRD CA-09 cita "estrutura v6 válida" mas não detalha **se** `.planning/` original deve ser **deletada** após migração (backup já existe). **Decisão assumida em fase-03:** deletar `.planning/` original ao fim da migração de sucesso (backup permanece). Justificativa: D3 ("migração total") implica fonte única; backup cobre rollback (R14). Se rejeitado, mudar para "renomear `.planning/` → `.planning.migrated/` e instruir usuário a deletar manualmente". Reverter envolve só fase-03 e fase-07.

- **Ambiguity G-A2:** PRD não especifica como migrar `STATE.md` v5 (que existia em `.planning/{date-slug}/STATE.md` como estado de execução por plano) — destino seria `docs/exec-plans/active/{slug}-STATE.md`? Ou só ignorar (STATE de v6 é dinâmico, gerado pelo hook PostToolUse — D32)? **Decisão assumida em fase-03:** copiar `STATE.md` legado para `docs/exec-plans/active/_archived-state/{slug}-STATE.md` como referência histórica. NÃO populates o `docs/STATE.md` raiz (que é dinâmico em v6). Se rejeitado, simplificar para "ignorar STATE.md legado, deixar só no backup".

- **Ambiguity G-A3:** PRD descreve migração de `senior-principles.md` apenas em contexto de dog-food (Plano 08), não como conversão genérica em /init para projetos do usuário. **Decisão assumida em fase-05:** SE existir `senior-principles.md` no projeto-alvo (raro fora do plugin), copiar para `docs/design-docs/core-beliefs.md` (move + rename, mantendo conteúdo intacto). Se não existir, fase-05 só processa `decisions.md`. Documentado como step extra em fase-05.

- **Ambiguity G-A4:** PRD CA-10 (`--dry-run`) não especifica formato do diff renderizado. **Decisão assumida em fase-06:** diff estilo `git diff --stat` (lista de arquivos com `+/-` por linhas), mais detalhe textual quando o usuário responder "show details". Renderiza em stdout com cores se TTY, plain text se redirecionado. Reverter envolve só `lib/dry-run-renderer.ts`.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
