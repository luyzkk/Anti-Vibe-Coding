<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 03: Pre-popular `Lessons Captured` em `PLAN.md.tpl` (SH-3)

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 45min
**Depende de:** Plano 02 fase-01 (`PLAN.md.tpl` criado em `skills/init/assets/templates/exec-plan/`)
**Visual:** false

---

## O que esta fase entrega

Pre-popular a secao `## Lessons Captured` do template `skills/init/assets/templates/exec-plan/PLAN.md.tpl` (criado em Plano 02 fase-01) com **6 licoes genericas** extraidas do referencial Andre + lessons-learned consolidados do nosso plugin. Marcar com comentario HTML como "remover ou substituir apos primeira customizacao real do projeto" — sinaliza ao subagente que sao seeds, nao verdades imutaveis do projeto especifico.

Andre tem 10 secoes obrigatorias com `Lessons Captured` vazia ("Link compound notes..."). Nossa decisao "nunca diminuir" + "copiar literal + melhorar" implica em **pre-popular com seeds genericos** — projetos novos comecam com licoes ja capturadas, e o `/execute-plan` pode confirmar/substituir conforme o contexto especifico do projeto.

Sub-assert no `populate-plan-parity.test.ts` valida que o `PLAN.md` gerado pelo Step 91 contem pelo menos 4 das 6 licoes — tolera 2 customizacoes reais ja realizadas em projetos no comeco do ciclo de vida.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/exec-plan/PLAN.md.tpl` | Modify | Localizar bloco `## Lessons Captured` (criado em Plano 02 fase-01). Substituir conteudo placeholder por 6 bullets pre-populados + comentario HTML data-marcado antes do bloco. |
| `tests/e2e/populate-plan-parity.test.ts` | Modify | Adicionar 1 it: "PLAN.md gerado tem Lessons Captured pre-populadas (SH-3)". Sub-assert: regex extrai bullets do bloco, count >= 4. |

Estado esperado apos esta fase: PLAN.md gerado pelo Step 91 inclui as 6 licoes pre-populadas + comentario HTML alertando que devem ser revistas apos primeira customizacao real.

---

## Implementacao

### Passo 1: Reler estado do `PLAN.md.tpl` apos Plano 02 fase-01

```powershell
Get-Content skills/init/assets/templates/exec-plan/PLAN.md.tpl | Select-String -Pattern "^## Lessons Captured" -Context 0,5
```

Esperado: secao existe com placeholder vazio ou comentado (estilo Andre: `Link compound notes, checklist updates, smoke flows, specs, scripts, or state why no new capture was needed.`). Se nao existir, **parar** — fase-03 depende de Plano 02 fase-01.

### Passo 2: Identificar as 6 licoes pre-populadas

Selecao baseada em:
- 3 licoes do plano real do Andre `2026-05-13-customizar-docs-harness-restantes...` (referencia em `tmp/andre-skills/`).
- 3 licoes destiladas do nosso compound atual (`docs/compound/2026-05-*.md`) + memory globais (`feedback_copy-then-improve`, `feedback_stack_knowledge_native`).

Lista canonica:

1. **Anti-pattern**: heuristica + LLM podem ambos errar pelo mesmo motivo se o input mecanico (lista de docs canonicos) estiver errado. Validar lista de docs primeiro antes de melhorar qualidade da geracao.
2. **Principio universal**: ao portar de ferramenta validada externa, copiar literalmente primeiro, melhorar em cima — nunca "adaptar para baixo". (`feedback_copy-then-improve` da memory global).
3. **Padrao compound**: gate "nunca diminuir" deve ser teste, nao doc — docs decaem, testes nao. Aplicar a outros pontos onde "paridade com referencia" importa.
4. **Trade-off observado**: LLM_INSTRUCTIONS imperativas custam mais tokens no `/execute-plan` — aceito porque principio "nunca diminuir" precede custo. Documentar trade-off em qualquer recusa futura de imperatividade.
5. **Honestidade > marketing**: cada afirmacao no doc canonico rastreia a um arquivo lido — quando nao rastreia, marca `TODO(<contexto>):`. Doc populado com placeholder generico degrada todo o pipeline downstream.
6. **Audit antes de scaling**: Step 91 emite contagens (docsCobertos, docsSemEvidencia, fasesCriadas) antes de qualquer scaling de cobertura — observabilidade primeiro, cobertura depois.

### Passo 3: Aplicar a edicao em `PLAN.md.tpl`

Localizar a secao Lessons Captured atual e substituir. Esperado apos Plano 02 fase-01:

```markdown
## Lessons Captured

<!-- Plano 02 fase-01 placeholder — preencher durante /execute-plan -->
- Link compound notes, checklist updates, smoke flows, specs, scripts, or state why no new capture was needed.
```

Substituir por:

```markdown
## Lessons Captured

<!--
2026-05-19 (Luiz/dev): Plano 05 fase-03 do PRD populate-plan-andre-port (SH-3).
6 licoes genericas pre-populadas extraidas do plano referencia do Andre +
compound notes consolidadas. Sao SEEDS — remover ou substituir apos primeira
customizacao real do projeto (subagente do /execute-plan confirma ou edita).
-->

- **Anti-pattern detectado:** heuristica e LLM podem ambos errar pelo mesmo motivo se o input mecanico (lista de docs canonicos no TEMPLATE_MANIFEST ou EXCLUDED) estiver errado. Validar lista de docs primeiro, antes de qualquer melhoria de qualidade na geracao.
- **Principio universal — copy-then-improve:** ao portar de ferramenta validada externa (Andre, libs maduras), copiar literalmente primeiro, melhorar em cima. Nunca "adaptar para baixo".
- **Padrao compound:** gate "nunca diminuir" deve ser TESTE, nao doc — docs decaem, testes nao. Aplicar a qualquer ponto onde paridade com referencia importa.
- **Trade-off:** instrucoes imperativas (Fontes + Secoes + Honestidade) custam mais tokens no /execute-plan, mas o principio "nunca diminuir" precede custo. Documentar qualquer recusa futura de imperatividade.
- **Honestidade > marketing:** cada afirmacao no doc canonico rastreia a um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. Doc com placeholder generico degrada todo o pipeline downstream.
- **Audit antes de scaling cobertura:** Step 91 emite contagens (docsCobertos, docsSemEvidencia, fasesCriadas vs esperadas) antes de qualquer expansao — observabilidade primeiro, cobertura depois.
```

**Decisao consciente:** comentario HTML `<!-- ... -->` antes do bloco e parte do contrato — sinaliza ao subagente que sao seeds. Sub-assert do parity test (Passo 4) verifica presenca tanto dos bullets quanto do comentario com data-marker.

### Passo 4: Adicionar sub-assert no `populate-plan-parity.test.ts`

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-03 do PRD populate-plan-andre-port (SH-3).
// Sub-assert: PLAN.md gerado tem Lessons pre-populadas. Tolerancia: >= 4 das 6
// porque /execute-plan pode ter editado/removido algumas em projetos no meio do ciclo.

it('PLAN.md tem Lessons Captured pre-populadas (SH-3)', async () => {
  const cwd = path.resolve('tests/fixtures/stack-aware/nextjs-supabase')
  const stackPaths = await stackAwareInputPaths(cwd, 'nextjs')
  const plan = await generatePopulatePlanV2({
    cwd,
    projectName: 'fixture-nextjs-supabase',
    manifest: [],
    stackPaths,
    clock: () => new Date('2026-05-19T00:00:00Z'),
  })

  // Identifica bloco Lessons Captured no PLAN.md gerado.
  // OBS: pos-Plano 02 fase-03, planIndexMarkdown vem do tpl com 11 secoes Andre — incluindo Lessons.
  const lessonsMatch = plan.planIndexMarkdown.match(
    /## Lessons Captured([\s\S]*?)(?=\n## |\Z)/,
  )
  expect(
    lessonsMatch,
    'PLAN.md gerado nao contem secao "## Lessons Captured". Verifique PLAN.md.tpl ' +
    'em skills/init/assets/templates/exec-plan/. PRD secao MH-2 + SH-3.',
  ).not.toBeNull()

  const lessonsBlock = lessonsMatch![1]

  // Conta bullets (linhas iniciando com `- ` apos o header).
  const bullets = (lessonsBlock.match(/^- /gm) ?? []).length
  expect(
    bullets,
    `Lessons Captured tem ${bullets} bullets pre-populadas (esperado >= 4). ` +
    `Verifique PLAN.md.tpl — bloco deve ter 6 seeds com comentario "remover apos customizacao real". ` +
    `PRD secao SH-3.`,
  ).toBeGreaterThanOrEqual(4)

  // Confirma data-marker do comentario HTML alertando que sao seeds.
  expect(
    lessonsBlock,
    'Lessons Captured nao tem comentario HTML data-marcado. Esperado: ' +
    '`<!-- 2026-05-19 ... seeds — remover apos primeira customizacao real ...-->`. PRD secao SH-3.',
  ).toContain('seeds')
})
```

### Passo 5: Rodar parity test

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** N+1 it's pass (N do Plano 01-04 + 1 do CA-08 da fase-01 + 1 novo SH-3 — total +2 desde Plano 04 fase-03).

### Passo 6: Validar formato do PLAN.md gerado manualmente

```powershell
# Gerar PLAN.md no fixture para inspecao visual
$env:UPDATE_GOLDENS = "1"
bun test tests/e2e/populate-plan-parity.test.ts
Remove-Item env:UPDATE_GOLDENS

# Inspeciona golden regenerado
Get-Content tests/e2e/__golden__/populate-plan-andre-parity.md | Select-String -Pattern "Lessons" -Context 0,8
```

**Verificar manualmente** que o golden agora reflete as 6 licoes. Se o golden da fase-01 ja foi gravado antes desta fase, regerar — diff esperado: secao Lessons antes vazia, agora com 6 bullets.

### Passo 7: Suite completa

```powershell
bun test
```

**Esperado:** verde.

### Passo 8: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** limpos.

### Passo 9: Registrar em MEMORY.md

- `DI-Plano05-fase03-lessons-seeds`: 6 licoes pre-populadas no `PLAN.md.tpl`. Subagente do `/execute-plan` deve revisar e substituir conforme contexto do projeto especifico. Comentario HTML `<!-- ... seeds — remover apos primeira customizacao real ... -->` sinaliza.
- `DI-Plano05-fase03-parity-tolerancia`: sub-assert tolera 2 customizacoes ja realizadas (`>= 4 bullets`, nao `>= 6`). Razao: gate quer detectar quando o tpl foi readicionado vazio, nao quando o projeto customizou organicamente.

---

## Gotchas

- **G6 do plano (data-marker obrigatorio):** sem o comentario HTML antes do bloco, fica ambiguo se sao licoes do template ou do projeto. Sub-assert verifica presenca da palavra `seeds` no bloco — minimo verificavel. Manter exato.
- **G-tpl-format-from-plano-02:** `PLAN.md.tpl` apos Plano 02 fase-01 pode usar Handlebars-like syntax `{{PROJECT_NAME}}`, `{{DATE}}`, `{{PHASES_TABLE}}`. As 6 licoes sao **estaticas** — nao precisam interpolacao. Inserir como markdown puro, sem `{{...}}` placeholders. Se Plano 02 fase-01 escolheu outro formato (ex: Mustache, Liquid), confirmar que markdown puro funciona — eh o caso default em todos os engines comuns.
- **G-renderer-pos-plano-02-fase-03:** apos Plano 02 fase-03, `renderPlanIndex()` em `populate-plan-generator.ts` le do tpl e injeta variaveis. As 6 licoes ficam **inalteradas no plan gerado** — apenas o cabecalho (`# Plan: Populate Harness — {{PROJECT_NAME}}`) e a tabela de fases ficam injetados. Confirmar em rodada inicial que `Lessons Captured` aparece no output sem mutilacao.
- **G-tolerance-parity-test:** o assert `>= 4 bullets` e intencional. Se a gente exigir `=== 6`, qualquer projeto em execucao que apague 1 licao quebra o gate (falso positivo). Apos primeira customizacao real, projetos podem ter qualquer numero — gate cobre apenas o template, nao o output customizado. Mas o test roda contra fixture greenfield, entao na pratica esperamos 6. `>= 4` da margem para refator do tpl.
- **G-overlap-com-PRD-lessons:** o PRD tem secao `## Lessons Captured (pré-populado para o plan-feature usar)` com 3 licoes (Anti-pattern, Principio universal, Padrao compound). As 3 primeiras licoes deste tpl espelham essas 3 do PRD — `feedback_copy-then-improve` aplicado a si mesmo. Esperado e intencional.

---

## Verificacao

### TDD

- [ ] **RED:** ANTES do Passo 3 (com o assert do Passo 4 ja adicionado mas sem editar o tpl), rodar `bun test tests/e2e/populate-plan-parity.test.ts` — falha porque `Lessons Captured` tem 1 bullet (placeholder) ou nenhum, e nao tem palavra `seeds`.
- [ ] **GREEN:** apos Passo 3 (tpl editado com 6 licoes + comentario data-marcado), pass.
- [ ] **REFACTOR:** N/A — sao 6 bullets estaticos. Sem oportunidade de refator.

### Checklist

- [ ] `skills/init/assets/templates/exec-plan/PLAN.md.tpl` tem secao `## Lessons Captured` com 6 bullets.
- [ ] Comentario HTML `<!-- 2026-05-19 (Luiz/dev): ... seeds — remover apos primeira customizacao real ... -->` antes do bloco.
- [ ] As 6 licoes refletem: Anti-pattern, Principio copy-then-improve, Padrao compound, Trade-off tokens, Honestidade > marketing, Audit antes de scaling.
- [ ] Sub-assert SH-3 no `populate-plan-parity.test.ts` verde.
- [ ] Golden snapshot (`populate-plan-andre-parity.md` da fase-01) atualizado para refletir as 6 licoes — se golden foi gravado antes de fase-03, regerar com `UPDATE_GOLDENS=1`.
- [ ] `bun test` (suite completa) — verde.
- [ ] `bun run lint` limpo.
- [ ] MEMORY.md atualizada (`DI-Plano05-fase03-lessons-seeds` e `DI-Plano05-fase03-parity-tolerancia`).

### Comandos verificaveis

```powershell
# Confirma 6 bullets no tpl
(Select-String -Pattern "^- \*\*" -Path skills/init/assets/templates/exec-plan/PLAN.md.tpl).Count
# Esperado: 6 (pode ser mais se outras secoes tambem usem bullets bold — refinar grep se precisar)

# Confirma comentario seeds
Select-String -Pattern "seeds" -Path skills/init/assets/templates/exec-plan/PLAN.md.tpl
# Esperado: 1 match

# Test
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: novo it pass + nao regrede outros

# Suite
bun test
```

---

## Criterio de Aceite

**Por maquina:**
- `Select-String -Pattern "seeds" -Path skills/init/assets/templates/exec-plan/PLAN.md.tpl` retorna >= 1 match.
- `bun test tests/e2e/populate-plan-parity.test.ts` — exit 0 com sub-assert `'PLAN.md tem Lessons Captured pre-populadas (SH-3)'` verde.
- `bun run lint` exit 0.

**Por humano:**
- Inspecao visual do `PLAN.md` gerado: secao Lessons Captured tem 6 bullets legivels + comentario HTML em portugues alertando que sao seeds.
- As 6 licoes nao parecem trivialidades — cada uma tem 1-2 linhas com conteudo acionavel.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
