# Plan: Portar a estrutura de populate-plan do Andre (harness + compound) para `/init`

**PRD:** ./PRD.md
**Planos:** 5 planos, 19 fases total
**Created:** 2026-05-19

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | MH-1 Lista completa de docs (Tracer Bullet) | 3 | ~4.5h | — |
| 02 | MH-2 PLAN.md / fase.md templates estilo Andre | 4 | ~6h | Plano 01 |
| 03 | MH-3 Instrucoes imperativas (Fontes + Secoes + Honestidade) | 3 | ~3h | Plano 01 |
| 04 | MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido | 3 | ~4.5h | Plano 01 |
| 05 | Gate completo + Should Haves + compound + goldens | 6 | ~6h | Plano 02, 03, 04 |

Total estimado: ~24h (3 dias).

---

## Grafo de Dependencias

```
Plano 01 (Lista completa de docs — Tracer Bullet)
    |
    |  TEMPLATE_MANIFEST + CanonicalDoc + EXCLUDED_FROM_POPULATION_V2
    |  + test fixture minimo (CA-01 + CA-04)
    |
    +----------+----------+----------+
    |          |          |
    v          v          v
Plano 02   Plano 03   Plano 04
(templates) (instrucoes) (discovery
                          stack+doc)
    |          |          |
    +----------+----------+
               |
               v
         Plano 05 (gate completo + SH + compound + goldens)
               |
               v
       [pos-merge] /anti-vibe-coding:lessons-learned
       ("paridade Andre via test, nao via doc")
```

**Paralelismo possivel:** Planos 02, 03 e 04 podem ser executados em paralelo apos Plano 01 — tocam arquivos majoritariamente disjuntos (`assets/templates/exec-plan/` + renderer vs. `LLM_INSTRUCTIONS` map vs. `stack-aware-input-paths.ts`). O parity test em `tests/e2e/` recebe sub-asserts incrementais (Plano 02 fase-04, Plano 03 fase-03, Plano 04 fase-03), mas o arquivo principal e criado em Plano 01 fase-02.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-lista-completa-de-docs + fase-02-parity-test-minimo
**Descricao:** O slice mais fino que prova end-to-end o principio "nunca diminuir":
1. Remover `docs/PRODUCT_SENSE.md` e `README.md` de `EXCLUDED_FROM_POPULATION_V2` (`populate-plan-generator.ts:60-64`).
2. Estender `CanonicalDoc` em `stack-aware-input-paths.ts` para incluir `docs/PRODUCT_SENSE.md` e `README.md`.
3. Confirmar (e adicionar se faltar) entries em `TEMPLATE_MANIFEST` para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md`.
4. Criar `tests/e2e/populate-plan-parity.test.ts` minimo asserta `phases.length >= 12` e quebra se alguem readicionar entry em `EXCLUDED_FROM_POPULATION_V2`.

Sem esse cutover de lista, qualquer melhoria de template/instrucao/discovery cai em vazio porque o gerador continua emitindo o subconjunto antigo. O parity test valida o gate "nunca diminuir" mecanico ANTES de investir nos refinamentos.

---

## Resumo por Plano

### Plano 01: MH-1 Lista completa de docs (Tracer Bullet)
> Estabelece a lista canonica de docs populaveis (>= 12) e o gate "nunca diminuir" como teste automatizado. Sem este plano, todos os outros sao no-op.

Fases:
- fase-01-lista-completa-de-docs: Remover exclusions PRODUCT_SENSE/README; estender `CanonicalDoc` type; confirmar/adicionar entries `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md` em `TEMPLATE_MANIFEST`. Anular D14 com comentario datado. [~1.5h, MH-1, CA-01, D5, D6]
- fase-02-parity-test-minimo: Criar `tests/e2e/populate-plan-parity.test.ts` com 2 asserts iniciais — `phases.length >= 12` e `EXCLUDED_FROM_POPULATION_V2` nao contem PRODUCT_SENSE/README. Setup pre-popula stub `.claude/knowledge/{stack}/INDEX.md` para evitar abort do Step 90 (Risco PRD). [~1.5h, MH-1, CA-01, CA-04, CA-07]
- fase-03-fix-testes-existentes: Atualizar `populate-plan-generator.test.ts` linha 50-54 (`'does NOT include excluded files'`) — flippar para esperar PRODUCT_SENSE/README PRESENTES e COMPOUND_ENGINEERING ausente. Confirmar suite ainda verde. [~1h, sem CA — fix de regressao]

### Plano 02: MH-2 PLAN.md / fase.md templates estilo Andre
> Cria templates em `skills/init/assets/templates/exec-plan/` com 11 secoes obrigatorias (10 do Andre + Observability) + 3 opcionais, e refatora o renderer para consumir. Step 91 continua PURO (zero LLM).

Fases:
- fase-01-plan-md-tpl: Criar `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com 11 secoes obrigatorias (Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria, Observability) + 3 opcionais (Follow-up Plans, Final Report, Pre-GO) como placeholders comentados. Frontmatter title/mode/status/created/project. [~1.5h, MH-2, CA-03, D4]
- fase-02-fase-md-tpl: Criar `skills/init/assets/templates/exec-plan/fase.md.tpl` com sub-secoes Goal (local da fase), Inputs (docs), Inputs (codigo), Instrucao LLM, Criterio de done. Substitui o render programatico inline para fases. [~1h, MH-2]
- fase-03-refatorar-renderer: Modificar `renderPlanIndex()` e `renderPhase()` em `populate-plan-generator.ts` para ler tpls de `TEMPLATES_ROOT/exec-plan/` e injetar variaveis (`{{PROJECT_NAME}}`, `{{DATE}}`, `{{PHASES_TABLE}}`, `{{DOC_CANONICO}}`, etc). Testes existentes em `populate-plan-generator.test.ts` permanecem verdes. [~2h, MH-2]
- fase-04-parity-assert-secoes: Adicionar sub-assert no `populate-plan-parity.test.ts`: regex de header valida 11 secoes obrigatorias presentes no PLAN.md gerado; 3 opcionais ausentes ou marcadas com `<!-- opcional -->`. [~1.5h, CA-03]

### Plano 03: MH-3 Instrucoes imperativas
> Reescrever `LLM_INSTRUCTIONS` map e `DEFAULT_INSTRUCTION` removendo brechas tipo "se nao houver, mantenha template". Cada instrucao com 3 elementos obrigatorios: Fontes especificas + Secoes obrigatorias + frase de honestidade.

Fases:
- fase-01-schema-imperative-instruction: Definir tipo `ImperativeInstruction = { fontes: string[]; secoes: string[]; honestidade: string }` em `populate-plan-generator.ts`. Helper `formatImperativeInstruction(instr): string` renderiza markdown. Helper `isImperativeInstruction(input)` valida 3 elementos (usado em runtime e no parity test). [~45min, MH-3]
- fase-02-reescrever-llm-instructions: Refatorar cada entry de `LLM_INSTRUCTIONS` (linhas 79-126) para `ImperativeInstruction`. Exemplo `ARCHITECTURE.md` referencia secao "Convencao: `docs/` vs Runtime Assets" como tipo de output esperado (PRD MH-3 exemplo). Cobertura: 12+ entries (uma por doc canonico). [~1.5h, MH-3]
- fase-03-default-imperative-assert-ca06: Reescrever `DEFAULT_INSTRUCTION` como `ImperativeInstruction`. Adicionar sub-assert no `populate-plan-parity.test.ts`: cada `LLM_INSTRUCTION` value satisfaz `isImperativeInstruction()`. [~45min, MH-3, CA-06]

### Plano 04: MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido
> Expande `stack-aware-input-paths.ts` para cobrir todos os 12+ docs canonicos em cada stack. Mantem validacao `fs.access` (invariante G2 do PRD anterior).

Fases:
- fase-01-expandir-nextjs-supabase: Adicionar entries `AGENTS.md`, `CLAUDE.md`, `docs/PRODUCT_SENSE.md`, `docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/STATE.md`, `docs/design-docs/core-beliefs.md`, `README.md` em `NEXTJS_CANDIDATES`. Em `NEXTJS_SUPABASE_EXTRA`: adicionar paths Supabase-especificos que ajudam SECURITY/ARCHITECTURE/RELIABILITY a chegar em >= 3 (CA-02). [~2h, MH-4, CA-02]
- fase-02-expandir-rails-node-ts: Cobertura analoga para `RAILS_CANDIDATES` e `NODE_TS_CANDIDATES`. Sem inventar paths — apenas os do scaffold padrao de cada stack (Gemfile, config/application.rb para Rails; tsconfig.json, src/index.ts para Node-TS). [~1.5h, MH-4]
- fase-03-parity-asserts-ca02-ca05: Adicionar sub-asserts no `populate-plan-parity.test.ts`: (a) projeto Next.js+Supabase tem >= 3 paths com `exists: true` em SECURITY/ARCHITECTURE/RELIABILITY (CA-02); (b) stack `unknown` gera `Inputs (codigo)` vazio + nota explicita "stack nao detectado" (CA-05) sem falhar build. [~1h, CA-02, CA-05]

### Plano 05: Gate completo + Should Haves + compound + goldens
> Polish final. Golden snapshot, mensagens de erro claras, Should Haves, compound note, regenerar goldens init-greenfield.

Fases:
- fase-01-golden-snapshot: Criar `tests/e2e/__golden__/populate-plan-andre-parity.md` espelhando estrutura minima esperada. Implementar mensagem clara no parity test quando assert falha — apontar o que foi removido + linkar PRD. [~1.5h, CA-07, CA-08]
- fase-02-sh2-laravel-python: Adicionar `LARAVEL_CANDIDATES` e `PYTHON_CANDIDATES` em `stack-aware-input-paths.ts` cobrindo paths do scaffold padrao de cada stack (composer.json, app/, routes/web.php para Laravel; pyproject.toml, src/, pyproject.toml para Python). Atualizar `pickStaticMap()` para nao cair em `GENERIC_CANDIDATES`. [~1h, SH-2]
- fase-03-sh3-lessons-prepopulado: Pre-popular `Lessons Captured` do `PLAN.md.tpl` com 6 licoes genericas extraidas do plano real do Andre (`tmp/andre-skills/.../first-use-customization`). Comentario marca como "remover apos primeira customizacao real". [~45min, SH-3]
- fase-04-sh4-audit-log-detalhado: Estender audit log do Step 91 (`91-generate-populate-plan.ts:69-83`) para emitir contagem detalhada: `docsCoveredByStack` (numero de docs com `>= 1` path real), `docsWithoutCodeEvidence` (count), `phasesCreatedVsExpected`. Test em `91-generate-populate-plan.test.ts`. [~1h, SH-4]
- fase-05-pipeline-compound-note: Atualizar `docs/PIPELINE.md` com nova estrutura do populate-plan (referenciar CLAUDE.md do plugin). Criar `docs/compound/2026-05-19-never-diminish-andre.md` capturando o principio + link para teste gate. [~45min, SH-1, compound capture]
- fase-06-regenerar-goldens: Regenerar `tests/e2e/__golden__/init-greenfield.stdout.txt` e `init-greenfield.tree.json` (MEMORY.md raiz ja registra como "Plano 05 fase-04" do plano antigo — esta fase fecha o ciclo). Reativar tests skipados em `init-cutover-greenfield.test.ts` se conteudo bater. Rodar `bun run harness:validate`. [~1h, fecho]

---

## Risks

- **CA-02 abortar no Step 90 antes do Step 91 rodar (V6.6.0 knowledge gate):** Plano 01 fase-02 pre-popula stub `.claude/knowledge/{stack}/INDEX.md` no test setup. Alternativa: chamar `generatePopulatePlanV2()` isolado, sem o pipeline `/init` inteiro. Documentar a escolha no commit do teste (Risco do PRD: alta probabilidade, medio impacto).
- **Golden `init-greenfield.stdout.txt` rota antiga:** Plano 05 fase-06 regenera explicitamente. MEMORY.md raiz ja registra que esse golden precisa regenerar — esta feature absorve a tarefa.
- **`TEMPLATE_MANIFEST` nao incluir `.claude/CLAUDE.md` por design antigo:** Decisao do dev (D6 do PRD): sempre incluir, sem opt-out. Plano 01 fase-01 verifica no inicio; se ausente, adiciona entry; se filtrado, remove filtro. Parity test asserta presenca obrigatoria — build quebra se omitida.
- **Custo extra de tokens com `LLM_INSTRUCTIONS` imperativas em `/execute-plan`:** Aceito por PRD — principio "nunca diminuir" precede custo. Trade-off documentado no commit do Plano 03 fase-02.
- **Paths novos em `stack-aware-input-paths.ts` com `exists: false` poluindo output:** Lib ja marca com nota; renderer ja exibe `(_nao encontrado_)`. Filtragem fica para iteracao futura (nao bloqueia este PRD).
- **`exec-plan-template.ts → renderExecPlan({ mode: 'full' })` ja existe e impoe 10 secoes:** Plano 02 fase-01 reusa contrato (importa `EXEC_PLAN_SECTIONS_FULL`) e adiciona Observability como 11a. Evita duplicacao de fonte de verdade.
- **Plano populate gerado pelo `/init` (`docs/exec-plans/active/{date}-populate-harness/PLAN.md`) e plan-overview do `/plan-feature` confundem-se em nome:** sao artefatos distintos (populate-plan dispara conteudo dos docs; plan-feature dispara plano de execucao). PRD escopo e o primeiro. Sem mitigacao adicional — naming claro nos commits.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (template estatico 11 obrigatorias + 3 opcionais, LLM preenche corpo em /execute-plan) | Plano 02, fase-01 |
| D2 (hash map `(stack-id + doc-canonico) -> paths` expandido) | Plano 04, todas as fases |
| D3 (gate "nunca diminuir" via test fixture + regra escrita em compound) | Plano 01 fase-02 + Plano 05 fase-01 + Plano 05 fase-05 |
| D4 (localizacao `skills/init/assets/templates/exec-plan/`) | Plano 02, fase-01 e fase-02 |
| D5 (remover PRODUCT_SENSE e README de EXCLUDED, manter COMPOUND_ENGINEERING) | Plano 01, fase-01 |
| D6 (`.claude/CLAUDE.md` obrigatorio, sem opt-out) | Plano 01, fase-01 + Plano 04, fase-01 |
| SH-1 (atualizar docs/PIPELINE.md) | Plano 05, fase-05 |
| SH-2 (Laravel + Python candidates) | Plano 05, fase-02 |
| SH-3 (Lessons Captured pre-populado) | Plano 05, fase-03 |
| SH-4 (audit log detalhado) | Plano 05, fase-04 |
| Princípio "copiar literal + melhorar" (feedback_copy-then-improve memory) | Todos os planos — referencia `tmp/andre-skills/harness-engineering/` |

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
