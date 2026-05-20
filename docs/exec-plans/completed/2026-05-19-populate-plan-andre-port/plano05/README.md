# Plano 05: Gate completo + Should Haves + compound + goldens

**Feature:** populate-plan-andre-port ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~6h
**Depende de:** Plano 02 (`PLAN.md.tpl` + renderer refatorado), Plano 03 (`LLM_INSTRUCTIONS` imperativas + `isImperativeInstruction`), Plano 04 (`NEXTJS_CANDIDATES`/`NEXTJS_SUPABASE_EXTRA`/`RAILS_CANDIDATES`/`NODE_TS_CANDIDATES` expandidos + parity asserts CA-02/CA-05)
**Desbloqueia:** merge final do PRD `populate-plan-andre-port` + lessons-learned compound ("paridade Andre via test, nao via doc") + reativacao dos E2E `init-cutover-greenfield` skipados desde Plano 01 fase-05 do PRD anterior

---

## O que este plano entrega

Polish final do PRD `populate-plan-andre-port`. Cinco entregas distintas, cada uma fechando um cabo solto deixado pelos planos anteriores:

1. **Golden snapshot + mensagem clara** (fase-01): `tests/e2e/__golden__/populate-plan-andre-parity.md` espelha a estrutura minima esperada; quando o parity test falha, a mensagem aponta exatamente o que foi removido (CA-07) e o snapshot diff exige aprovacao humana (CA-08).
2. **Cobertura Laravel + Python** (fase-02): `LARAVEL_CANDIDATES` e `PYTHON_CANDIDATES` no `stack-aware-input-paths.ts` cobrem paths do scaffold padrao de cada stack. `pickStaticMap()` para de cair em `GENERIC_CANDIDATES` para esses 2 stacks (SH-2).
3. **Lessons Captured pre-populado** (fase-03): `PLAN.md.tpl` ganha 6 licoes genericas (extraidas do plano real do Andre em `tmp/andre-skills/.../first-use-customization`) com comentario "remover apos primeira customizacao real" (SH-3).
4. **Audit log detalhado** (fase-04): Step 91 (`91-generate-populate-plan.ts`) emite `docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected` no audit log. Test em `91-generate-populate-plan.test.ts` valida (SH-4).
5. **Compound + pipeline doc** (fase-05): `docs/PIPELINE.md` referencia o novo populate-plan; `docs/compound/2026-05-19-never-diminish-andre.md` captura o principio "paridade via teste, nao via doc" linkando o gate (SH-1 + compound capture obrigatoria pelo CLAUDE.md do plugin).
6. **Goldens regenerados** (fase-06): `tests/e2e/__golden__/init-greenfield.stdout.txt` e `init-greenfield.tree.json` regenerados; 2 tests skipados em `init-cutover-greenfield.test.ts` reativados; `bun run harness:validate` verde. Fecha o ciclo registrado em MEMORY.md raiz desde Plano 01 fase-05 do PRD anterior.

Apos Plano 05 o PRD `populate-plan-andre-port` esta pronto para merge — todos os 4 Must Haves + 4 Should Haves cobertos, gate "nunca diminuir" mecanico (CA-04) + claro (CA-07) + protegido por revisao humana (CA-08), compound capturado.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status apos Planos 01-04 |
|-------|-------------|--------------------------|
| `tests/e2e/populate-plan-parity.test.ts` com sub-asserts MH-1/MH-2/MH-3/MH-4 acumulados | Plano 01 fase-02 + Plano 02 fase-04 + Plano 03 fase-03 + Plano 04 fase-03 | pronto |
| `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com 11 secoes obrigatorias | Plano 02 fase-01 | pronto |
| `LLM_INSTRUCTIONS` map com 12+ `ImperativeInstruction` entries; `DEFAULT_INSTRUCTION` imperativa | Plano 03 fase-02 + fase-03 | pronto |
| `NEXTJS_CANDIDATES` + `NEXTJS_SUPABASE_EXTRA` cobrem 12+ docs canonicos; `RAILS_CANDIDATES` + `NODE_TS_CANDIDATES` espelhados | Plano 04 fase-01 + fase-02 | pronto |
| Fixture `tests/fixtures/stack-aware/nextjs-supabase/` com stubs para CA-02 mecanico | Plano 04 fase-01 | pronto |
| `pickStaticMap()` em `stack-aware-input-paths.ts` (switch-case com 5 cases) | feature anterior + Plano 04 (sem modificar) | pronto — esta fase reescreve |
| `populate-plan-generator.ts` emite plano via `generatePopulatePlanV2()` | feature anterior | pronto |
| Step 91 (`91-generate-populate-plan.ts`) ja registra audit log basico (linhas 69-83) | feature anterior | pronto |
| `INIT_SUBAGENT_IDS.populatePlanGen` exportado | feature anterior | pronto |
| Goldens antigos referenciam steps removidos (linhas 4-7 + 19 do `init-greenfield.stdout.txt`) | feature anterior (registrado em MEMORY.md raiz) | precisa regenerar — fase-06 |

### Produz para (outros planos que dependem deste)

Plano 05 e o ultimo do PRD. Nenhum plano subsequente dentro deste PRD consome o output. Consumidores externos (pos-merge):

| O que | Quem consome |
|-------|-------------|
| Golden snapshot `populate-plan-andre-parity.md` | Iteracoes futuras que mexam em `populate-plan-generator.ts` (snapshot diff exige aprovacao explicita — CA-08) |
| `LARAVEL_CANDIDATES` + `PYTHON_CANDIDATES` | Proxima iteracao que cobrir conteudo dos docs em projetos Laravel/Python (Follow-up Plans do PRD) |
| `docs/compound/2026-05-19-never-diminish-andre.md` | Comando `/anti-vibe-coding:lessons-learned` (citado em compound decision gate do CLAUDE.md do plugin) |
| `init-greenfield.stdout.txt` regenerado | E2E `init-cutover-greenfield.test.ts` reativado — protege regressao do `/init` greenfield |
| Audit log detalhado | Observability futura (PRD "auditabilidade do plugin") + dashboard de cobertura por stack |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-golden-snapshot.md | `tests/e2e/__golden__/populate-plan-andre-parity.md` (espelho minimo da estrutura esperada); mensagem clara no parity test apontando o que foi removido + link para PRD (CA-07); 1 sub-assert novo no `populate-plan-parity.test.ts` validando diff contra golden (CA-08) | 1.5h | — |
| 02 | fase-02-sh2-laravel-python.md | `LARAVEL_CANDIDATES` (composer.json, app/, routes/web.php, config/, database/migrations/, resources/views/, .env.example) e `PYTHON_CANDIDATES` (pyproject.toml, src/, requirements.txt, alembic/versions/, app/, tests/) em `stack-aware-input-paths.ts`; `pickStaticMap()` ganha branches para `'laravel'` e `'python'` (sai do default generic); 2 unit tests novos validam cobertura minima | 1h | — |
| 03 | fase-03-sh3-lessons-prepopulado.md | Pre-popular bloco `## Lessons Captured` em `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com 6 licoes genericas extraidas do plano `2026-05-13-customizar-docs-harness-restantes...` do Andre. Comentario HTML `<!-- 2026-05-19: remover apos primeira customizacao real -->` antes do bloco. Sub-assert no parity test: nova licao genericaN encontrada >= 4 vezes (tolera 2 customizacoes ja realizadas) | 45min | Plano 02 fase-01 (PLAN.md.tpl criado) |
| 04 | fase-04-sh4-audit-log-detalhado.md | Estender `91-generate-populate-plan.ts` linhas 70-83: adicionar `docsCoveredByStack` (count de docs em `stackPaths` com >= 1 path `exists:true`), `docsWithoutCodeEvidence` (count com 0 paths reais), `phasesCreatedVsExpected` (`plan.phases.length` vs minimo 12). Helper `computeAuditCoverage(stackPaths, plan)` para isolar logica. 2 testes novos em `91-generate-populate-plan.test.ts` validam metricas | 1h | — |
| 05 | fase-05-pipeline-compound-note.md | `docs/PIPELINE.md` ganha secao "Step 91 — populate-plan" referenciando o tpl novo, instrucoes imperativas e gate "nunca diminuir"; criar `docs/compound/2026-05-19-never-diminish-andre.md` capturando 3 elementos: (a) principio "paridade Andre via test, nao via doc"; (b) link para `populate-plan-parity.test.ts`; (c) link para CA-04/CA-07/CA-08 do PRD | 45min | — |
| 06 | fase-06-regenerar-goldens.md | Rodar test runner em modo `--update-snapshots` (ou regen manual) para `tests/e2e/__golden__/init-greenfield.stdout.txt` (linhas 4-7 + 19 referenciam steps removidos do PRD anterior) e `init-greenfield.tree.json`. Reativar 2 testes skipados em `init-cutover-greenfield.test.ts`. Rodar `bun run harness:validate`. Confirmar que `MEMORY.md` raiz pode remover entrada "Plano 05 fase-04" do PRD anterior (substituida por este plano) | 1h | fase-01 a fase-05 (snapshots so estabilizam apos demais fases verdes) |

---

## Grafo de Fases

```
fase-01 (golden snapshot + mensagem clara CA-07/CA-08)
fase-02 (SH-2 Laravel + Python)
fase-03 (SH-3 Lessons Captured pre-populado)
fase-04 (SH-4 audit log detalhado)
fase-05 (PIPELINE.md + compound note)
       \      |     /
        \     |    /
         \    |   /
          v   v  v
       fase-06 (regenerar goldens — apos todas as outras estaveis)
```

**Paralelismo possivel:** fase-01, fase-02, fase-03, fase-04 e fase-05 sao independentes entre si — arquivos disjuntos (parity test + golden md / stack map / `PLAN.md.tpl` / Step 91 / `PIPELINE.md` + compound). Podem ser executadas em qualquer ordem ou em paralelo. fase-06 e estritamente sequencial — exige que todas as outras tenham estabilizado para o snapshot capturar o estado final.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste/assert que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: limpeza local, sem expandir escopo
4. VERIFY: bun run test && bun run lint && bun run typecheck
```

Por fase:

- **fase-01 (golden snapshot):** TDD com `populate-plan-parity.test.ts`. RED — adicionar `it('output bate com golden snapshot CA-08', ...)` que le `tests/e2e/__golden__/populate-plan-andre-parity.md` e diffa contra `generatePopulatePlanV2()` renderizado. Falha porque golden ainda nao existe. GREEN — gerar golden inicial via `bun test --update-snapshots` (Bun) OU escrever a mao com base no output atual. REFACTOR — extrair helper `assertMatchesGolden(actual, goldenPath)` se a logica de diff repetir.
- **fase-02 (Laravel + Python):** TDD direto. RED — escrever it "Laravel: ARCHITECTURE.md retorna `app/`, `config/`, `routes/web.php` com cobertura minima" antes de adicionar entries em `LARAVEL_CANDIDATES`. Hoje `pickStaticMap('laravel')` retorna `GENERIC_CANDIDATES` — assertion contra paths Laravel-especificos falha. GREEN — adicionar `LARAVEL_CANDIDATES` constante + branch no switch. REFACTOR — agrupar paths comuns entre Laravel e Python se houver (provavelmente nenhum — sao stacks distintos).
- **fase-03 (Lessons pre-populado):** TDD sutil. RED — sub-assert no `populate-plan-parity.test.ts`: `expect(planContent.match(/^- (Anti-pattern|Principio|Padrao|Trade-off|Honestidade|Audit)/gm)?.length).toBeGreaterThanOrEqual(4)`. Falha porque `PLAN.md.tpl` atual nao tem Lessons pre-populadas. GREEN — adicionar 6 bullets no tpl. REFACTOR — N/A.
- **fase-04 (audit log):** TDD direto em `91-generate-populate-plan.test.ts`. RED — mockar `AuditLogWriter`, rodar Step 91, assertar `output_struct.docsCoveredByStack >= 6` em fixture Next.js+Supabase. Falha porque hoje so existem `phaseCount`, `filesWritten`, `warnings`, `stackPrimary`, `discoveryEntries`. GREEN — adicionar `computeAuditCoverage` + 3 campos novos. REFACTOR — se a logica de count for repetitiva, extrair em helper isolado (provavelmente sim — 3 contagens similares).
- **fase-05 (PIPELINE + compound):** sem TDD — entrega e docs. Verificacao: `bun run compound:check` (validacao do compound note + frontmatter) + `bun run harness:validate` (estrutura). Mudancas em `PIPELINE.md` precisam preservar a tabela "When to Read What" do CLAUDE.md do plugin (referenciada por outros agents).
- **fase-06 (regenerar goldens):** TDD reverso. RED ja existe — os 2 testes skipados em `init-cutover-greenfield.test.ts` falham se reativados contra goldens antigos. GREEN — regenerar via `--update-snapshots`; reativar os 2 testes (remover `.skip`); rodar `bun test tests/e2e/init-cutover-greenfield.test.ts` — 4 pass. REFACTOR — N/A (goldens sao output, nao codigo).

**Tracer Bullet deste plano:** N/A — Tracer Bullet global da feature ja foi Plano 01 (Lista completa de docs). Plano 05 e polish final.

---

## Gotchas Conhecidos

- **G1 (golden snapshot diff em Windows — line endings):** Bun test em Windows pode emitir snapshots com CRLF. `assertMatchesGolden` deve normalizar `\r\n` → `\n` antes de comparar. Plano 04 fase-01 ja teve gotcha similar (G8 — posix paths). Aplicar `content.replace(/\r\n/g, '\n')` na leitura do golden e do actual.

- **G2 (Bun `--update-snapshots` vs Jest):** Bun test API e [diferente do Jest](https://bun.com/docs/test/snapshots). `toMatchSnapshot()` existe mas grava em `__snapshots__/` por default. Para usar `tests/e2e/__golden__/` (convencao ja existente neste repo), capturar manualmente: `await fs.writeFile(goldenPath, actual)` quando flag `UPDATE_GOLDENS=1` no env. Padrao usado em `tests/e2e/init-cutover-greenfield.test.ts` linha 87+ (referencia).

- **G3 (`pickStaticMap` switch-case — 5 cases hoje, 7 apos fase-02):** CLAUDE.md global diz "Preferir hash maps sobre switch-case". Apos fase-02 serao 7 cases (nextjs, rails, node-ts, laravel, python, unknown, null + default). Ainda nao precisa refator — switch continua legivel. Registrar como DI no MEMORY.md se for tentado. Refator pode virar Could Have de iteracao futura (nao bloqueia este PRD).

- **G4 (`LARAVEL_CANDIDATES` sem inventar paths):** Regra do PRD MH-4 herda para SH-2. Paths para Laravel sao do `composer create-project laravel/laravel` (output direto do scaffold). Lista enxuta: `composer.json`, `app/Http/Controllers/`, `app/Models/`, `app/Providers/`, `config/`, `routes/web.php`, `routes/api.php`, `database/migrations/`, `resources/views/`, `.env.example`. NAO adicionar `Modules/`, `app/Services/`, `app/Repositories/` (sao convencoes de equipes especificas, nao scaffold padrao). Em duvida, consultar `tmp/andre-skills/harness-engineering/assets/harness-template/` — Andre tem referencia para Rails/Node-TS; para Laravel/Python validar contra docs oficiais (`laravel/laravel` no GitHub para Laravel; `cookiecutter pypackage` ou `poetry new` para Python).

- **G5 (`PYTHON_CANDIDATES` sem assumir framework):** Python sem framework e diferente de Django/Flask/FastAPI. Lista neutra: `pyproject.toml`, `setup.py`, `requirements.txt`, `src/`, `app/`, `tests/`, `alembic/versions/`, `Makefile`. NAO adicionar `manage.py` (Django-especifico) nem `wsgi.py`/`asgi.py` (framework-especifico). Se SH-2 evoluir, criar `PYTHON_DJANGO_EXTRA`/`PYTHON_FASTAPI_EXTRA` no padrao de `NEXTJS_SUPABASE_EXTRA`. Iteracao futura — nao escopo deste plano.

- **G6 (`PLAN.md.tpl` pre-populated lessons — comentario data-marker obrigatorio):** D3 do PRD ("gate nunca diminuir via test fixture + regra escrita em compound") implica que o tpl deve ser auto-explicativo. Linha imediatamente antes do bloco Lessons no tpl: `<!-- 2026-05-19 (Luiz/dev): 6 licoes genericas pre-populadas — remover ou substituir apos primeira customizacao real do projeto. -->`. Sem este comentario, fica ambiguo se sao licoes do template ou do projeto. Sub-assert no parity test verifica presenca do comentario.

- **G7 (Step 91 `computeAuditCoverage` — entrada `stackPaths`):** `stackPaths` e `ReadonlyMap<CanonicalDoc, ReadonlyArray<{ path, exists, note? }>>`. Para `docsCoveredByStack` count: iterar e contar keys onde `values.some(v => v.exists)`. Para `docsWithoutCodeEvidence`: count keys onde `values.every(v => !v.exists)` OU `values.length === 0`. Decisao: tratar Map vazio como "covered" pois indicaria erro upstream — usar `length === 0 ? "covered" : "uncovered se nenhum exists"`. Inverso e mais defensivo. Documentar no JSDoc do helper.

- **G8 (`PIPELINE.md` referenciado pelo CLAUDE.md do plugin — tabela "When to Read What" linha 12):** CLAUDE.md raiz cita `docs/PIPELINE.md` como fonte de verdade para "Understanding the plugin pipeline (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate)". A fase-05 adiciona secao sobre Step 91 (populate-plan) mas NAO mexe no fluxo do pipeline principal — apenas adiciona referencia ao novo formato gerado. Preservar headers existentes para nao quebrar links externos.

- **G9 (`init-greenfield.stdout.txt` — escopo da regen):** golden tem ~30 linhas hoje, com linhas 4-7 + 19 referenciando steps removidos. A regen NAO e "reescrever do zero" — e capturar o output atual do `/init` greenfield apos os Planos 01-04 deste PRD. Comando: `INIT_TEST_MODE=stdout bun test tests/e2e/init-cutover-greenfield.test.ts > tests/e2e/__golden__/init-greenfield.stdout.txt.new`. Diffar `.new` vs antigo, validar manualmente que diferencas sao apenas dos steps removidos (e nao regressoes acidentais). Mesmo padrao para `init-greenfield.tree.json` (estrutura de pastas geradas).

- **G10 (compound note frontmatter — exigido por `compound:check`):** `bun run compound:check` valida que compound notes em `docs/compound/` tem frontmatter com `title`, `date`, `principle`, `evidence` (verificar formato ao olhar 2-3 notes existentes — ex: `docs/compound/2026-05-14-state-md-vs-git-log.md`). Sem frontmatter valido, o validator quebra. Copiar shape de uma note recente.

---

## Notas para Fase-06 (regenerar goldens)

- A reativacao dos 2 testes skipados em `init-cutover-greenfield.test.ts` (`'greenfield init generates expected file tree matching golden'` + `'greenfield init produces stdout matching golden (normalized)'`) so funciona apos goldens regenerados. Ordem obrigatoria: regenerar goldens → remover `.skip` → rodar test → confirmar 4 pass total.
- Apos sucesso, atualizar `MEMORY.md` raiz removendo a entrada "Plano 05 fase-04 do plano antigo" (linha ~63 do MEMORY.md raiz, secao "Notas para Planos Seguintes"). Substituida pelo fechamento deste plano.
- Validacao final: `bun run harness:validate` (referenciado no CLAUDE.md raiz) — confirma que estrutura `docs/exec-plans/active/` + `docs/compound/` esta integra. Esperado: exit 0.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
