# Plano 03: Gerador LLM-driven do PLAN populate

**Feature:** init-llm-driven-harness-population ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~8h
**Depende de:** Plano 02 (CODE_STYLE.md + TEMPLATE_MANIFEST com >=10 docs populaveis + AGENTS.md.tpl linkando ambos + Step 10 backup leve)
**Desbloqueia:** Plano 04 (reentrada + validator allowlist pode reusar discovery-manifest) e Plano 05 (E2E novo valida pasta gerada + SKILL.md aponta comando exato)

---

## O que este plano entrega

Coracao LLM-driven da init: discovery-manifest leve (so paths + 100 primeiras linhas, sem regex
de classificacao), helper de paths candidatos por stack detectado (com validacao `fs.access`
para mitigar LLM-hallucination), renderer v2 do PLAN populate emitindo 1 fase por doc canonico
com 4 blocos obrigatorios (`Inputs (docs)` / `Inputs (codigo)` / `Instrucao LLM` /
`Criterio done`), output em pasta `plano-populate-harness/` com PLAN.md indice + 1 arquivo por
fase, e Step 91 reescrito orquestrando tudo. Resultado: greenfield gera >= 10 fases reais
(CA-01), projeto Next.js+Supabase tem >= 3 paths concretos por fase (CA-02).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com Step 91 ANTES de Step 90 (Bug C resolvido) | Plano 01 fase-01 | pronto |
| Steps 07/08/09/11 removidos do registry | Plano 01 fase-02/03 | pronto |
| Step 10 reduzido a backup leve (`10-backup-pre-mutation.ts`) | Plano 01 fase-04 + Plano 02 fase-03 | pronto |
| `CODE_STYLE.md.tpl` + entry em `TEMPLATE_MANIFEST` | Plano 02 fase-01 | pronto |
| `AGENTS.md.tpl` linka `CODE_STYLE.md` ao lado de `DESIGN.md` | Plano 02 fase-02 | pronto |
| `TEMPLATE_MANIFEST` exportado de `template-manifest.ts` com >= 10 docs populaveis | base + Plano 02 fase-01 | pronto |
| `detectStack()` + `DetectedStack` (multi-stack contract D22) | base (`skills/init/lib/detect-stack.ts`) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `discoveryManifestLight()` helper (lista paths + first100Lines) | Plano 04 fase-03 (validator allowlist pode reusar manifest para warnings agrupados) |
| `stackAwareInputPaths()` helper (mapa DocCanonico -> string[] validado por `fs.access`) | (potencialmente Plano 04 se validator quiser checar refs) |
| Step 91 reescrito gerando pasta `plano-populate-harness/` em vez de PLAN.md monolitico | Plano 05 fase-04 (E2E novo valida pasta com >= 10 arquivos) |
| Pasta `plano-populate-harness/` consumida por `/execute-plan` | Plano 05 fase-03 (SKILL.md aponta comando exato apontando para a pasta) |
| Arquitetura "gerador semantico" — base para Plano 04 reentrada | Plano 04 fase-01 (reentry guard precisa saber que init agora gera plano em pasta) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-discovery-manifest-light.md | Helper `discoveryManifestLight()` em `skills/init/lib/discovery-manifest-light.ts` — lista `*.md` com path + size + 100 primeiras linhas, sem classificacao | 1.5h | — |
| 02 | fase-02-stack-aware-input-paths.md | Helper `stackAwareInputPaths()` em `skills/init/lib/stack-aware-input-paths.ts` — mapa DocCanonico -> string[] por stack, validado com `fs.access` (mitiga LLM-hallucination) | 1.5h | — |
| 03 | fase-03-populate-plan-renderer-v2.md | Reescreve `skills/init/lib/populate-plan-generator.ts` para emitir markdown com 4 blocos por fase + glossario de instrucoes LLM | 2h | fase-01, fase-02 |
| 04 | fase-04-folder-structure-plano-populate-harness.md | Cria `skills/init/lib/populate-plan-writer.ts` — separa render (fase-03) de write em pasta `plano-populate-harness/` com PLAN.md indice + 1 arquivo por fase (D4 do CONTEXT) | 1.5h | fase-03 |
| 05 | fase-05-step91-wires-everything.md | Reescreve `skills/init/lib/steps/91-generate-populate-plan.ts` orquestrando discovery + stack-aware + renderer + writer. Garante CA-01 (>= 10 fases) e CA-02 (>= 3 paths reais) | 1.5h | fase-01, fase-02, fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (discovery-manifest-light)      fase-02 (stack-aware-input-paths)
        \                                       /
         \                                     /
          v                                   v
          fase-03 (populate-plan-renderer-v2)
                          |
                          v
          fase-04 (folder-structure-plano-populate-harness)
                          |
                          v
          fase-05 (step91-wires-everything)  <-- entrega final do plano
```

**Paralelismo possivel:** fase-01 e fase-02 sao totalmente independentes (helpers em arquivos
distintos, sem overlap de tipos) e podem rodar em paralelo. fase-03 espera as duas pois
importa os tipos `DiscoveryManifestEntry` e `StackAwareInputPaths`. fase-04 e fase-05 sao
sequenciais (fase-04 cria o writer; fase-05 orquestra todos).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Tracer Bullet ja entregue no Plano 01 fase-01).

**Nota TDD especifica:**
- fase-01: ciclo TDD pleno — RED com fixture `tests/fixtures/discovery-manifest-light/`
  contendo 5 docs `.md` + assertion `expect(entries).toHaveLength(5)`. GREEN: implementacao
  do glob + `slice(0, 100)`. Bordas: arquivos vazios, sem newline final, `node_modules/` excluido.
- fase-02: ciclo TDD com tabela de stacks. RED: teste parametrizado
  `it.each([['nextjs', 4], ['rails', 3], ['node-ts', 2]])` falha por helper ausente.
  GREEN: mapa estatico stack -> docCanonico -> paths candidatos. Validacao `fs.access`
  ja testada com `tests/fixtures/stack-nextjs-supabase/` (paths reais) e
  `tests/fixtures/stack-fake-paths/` (todos falham `fs.access` -> array vazio com nota).
- fase-03: maior ciclo TDD do plano. RED: novo teste
  `populate-plan-generator-v2.test.ts` valida 4 blocos obrigatorios por fase
  (`expect(rendered).toContain('### Inputs (docs candidatos)')` x4 assertions por doc).
  GREEN: refactor do `populate-plan-generator.ts` substituindo template antigo. REFACTOR:
  extrair helpers `renderInputsDocsBlock`, `renderInputsCodeBlock`, `renderLLMInstructionBlock`,
  `renderDoneCriteriaBlock`. Teste verde quando snapshot do output bate.
- fase-04: ciclo TDD para writer. RED: `populate-plan-writer.test.ts` valida que
  apos `writePopulatePlanFolder(plan, cwd)` existe `PLAN.md` (indice) + N arquivos `fase-*.md`
  na pasta. GREEN: `fs.mkdir` + loop de `fs.writeFile`. Bordas: pasta ja existe (sobrescreve),
  permission denied (warning, nao aborta).
- fase-05: ciclo TDD E2E. RED: `91-generate-populate-plan.test.ts` com greenfield mockado
  + stack Next.js fixture; assertion `expect(filesInPlanFolder.length).toBeGreaterThanOrEqual(10)`.
  GREEN: orquestracao das chamadas. CA-02 verificado via assertion adicional
  `expect(contentOfFase('ARCHITECTURE')).toMatch(/src\/app|supabase\/migrations/)`.

---

## Gotchas Conhecidos

Indexados para referencia nas fases. Cada fase declara quais G* sao relevantes.

- **G1:** `TEMPLATE_MANIFEST` precisa estar com entry `CODE_STYLE.md` ANTES do Plano 03 rodar
  (dependencia explicita do Plano 02 fase-01). Se nao estiver, fase-05 gera apenas 9 fases
  (CA-01 falha — exige >= 10). Verificacao previa: `grep -n "CODE_STYLE.md" skills/init/lib/template-manifest.ts`
  antes de iniciar fase-05.

- **G2:** Stack-aware paths nao podem ser ESPECULATIVOS — todo path emitido no PLAN.md tem
  que passar por `fs.access` (mitigacao do risco LLM-hallucination do PRD — secao Riscos).
  Falha silenciosa: paths inexistentes viram nota `// candidato nao encontrado` no markdown,
  nao erro lancado. fase-02 implementa esse filtro; fase-05 verifica que o filtro foi aplicado
  via assertion no E2E.

- **G3:** Chamada LLM acontece no momento do `/execute-plan` (subagent por fase consome
  `Inputs (docs candidatos)` + `Inputs (codigo)` + `Instrucao LLM` e gera conteudo do doc).
  Step 91 NAO chama LLM — apenas RENDERIZA o plano. Importante para CA-07 (Step 91 pre-Step 90
  sem dependencia de rede). fase-03 deve ter zero `fetch` / zero import de SDK Anthropic.

- **G4:** Renderer v2 nao usa `assets/snippets/populate-plan-template.md` antigo (template
  com placeholders `{{TASKS_BLOCK}}`). fase-03 substitui por geracao programatica direta.
  Considerar deletar o snippet apos fase-03 verde — registrar em `MEMORY.md` como item
  para Plano 05 ou cleanup separado. Nao deletar dentro deste plano (cleanup fora de escopo).

- **G5:** Estrutura de pasta `plano-populate-harness/` deve ser compativel com `/execute-plan`
  — verificar Step 1 de `skills/execute-plan/SKILL.md` se enumera pastas `YYYY-MM-DD-*` ou
  `*-populate-harness` especificamente. Se incompativel (ex: regex exige sufixo exato), fase-04
  registra como follow-up em `MEMORY.md` e Plano 05 fase-03 atualiza SKILL.md `execute-plan`
  (ou plano de cutover separado). Nao quebrar `execute-plan` aqui.

- **G6:** Filtro de docs populaveis ja existe em `populate-plan-generator.ts`
  (`EXCLUDED_FROM_POPULATION` set + `EXCLUDED_PATTERNS` array). Preservar logica em fase-03,
  apenas adicionar os 4 blocos por fase. NAO repopular filosoficos
  (`COMPOUND_ENGINEERING.md`, `PRODUCT_SENSE.md`) — D14 do PRD os mantem template canonico.
  Verificar contagem: `TEMPLATE_MANIFEST.filter(isPopulatable).length >= 10` apos Plano 02.

- **G7:** Codigo gerado deste plano e codigo de RUNTIME do plugin (`skills/init/lib/`).
  Universal Principle #5 (Comment Provenance) NAO se aplica em runtime — usar JSDoc nas
  exports publicas, ja suficiente. Comentarios inline com data so quando documentam decisao
  nao-obvia (ex: ordem de filtros, mitigacao de risco PRD).

- **G8:** Performance do discovery-manifest-light: greenfield (zero docs) deve completar
  em < 50ms; projeto com 100 docs `.md` deve completar em < 500ms. Sem cache. Se passar
  desses limites, profilar antes de adicionar memoizacao (premature optimization).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
