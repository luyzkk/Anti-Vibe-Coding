<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 05: Atualizar `docs/PIPELINE.md` + criar compound note (SH-1)

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 45min
**Depende de:** Nenhuma (independente das outras fases — apenas docs)
**Visual:** false

---

## O que esta fase entrega

Duas entregas de documentacao que fecham o PRD `populate-plan-andre-port`:

1. **`docs/PIPELINE.md` atualizado** com secao nova "Step 91 — populate-plan" referenciando o novo `PLAN.md.tpl` (Plano 02 fase-01), as `LLM_INSTRUCTIONS` imperativas (Plano 03), o discovery expandido (Plano 04) e o gate "nunca diminuir" mecanico (Plano 01 fase-02) + claro (Plano 05 fase-01). Cumpre SH-1 do PRD.

2. **`docs/compound/2026-05-19-never-diminish-andre.md`** capturando o principio "paridade Andre via teste, nao via doc" como compound note formal. Conteudo: o problema observado (3a licao Pre-populada do PLAN.md.tpl — Plano 05 fase-03), a solucao adotada (parity test + mensagens claras + golden), e a regra durable extraida ("gate de paridade deve ser TESTE, nao doc"). Cumpre o "compound decision gate" obrigatorio pelo CLAUDE.md raiz do plugin: "Before reporting completion: did this work teach the repo something durable? If yes, capture in docs/compound/."

Sem esta fase, o PRD encerra com gate mecanico verde (CA-04) mas sem captura cultural — proximo dev que mexer em `populate-plan-generator.ts` nao tem onde encontrar o "por que" do gate.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/PIPELINE.md` | Modify | Adicionar secao nova "## Step 91 — Populate Plan (post-Plano populate-plan-andre-port)" apos a tabela de skills. NAO mexer no fluxo principal (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate). Adicionar referencias aos arquivos novos: `skills/init/assets/templates/exec-plan/PLAN.md.tpl`, `populate-plan-parity.test.ts`, `populate-plan-coverage.ts`. |
| `docs/compound/2026-05-19-never-diminish-andre.md` | Create | Compound note. Frontmatter com `title`, `category`, `tags`, `created`. Conteudo em 3 secoes: Problem (regressao silenciosa quando alguem readicionar entry em `EXCLUDED_FROM_POPULATION_V2`), Solution (teste mecanico CA-04 + mensagem clara CA-07 + golden snapshot CA-08), Rule (gate de paridade deve ser teste, nao doc). Linkar PRD + parity test + golden. |

Estado esperado apos esta fase: `bun run compound:check` valida o frontmatter do compound novo; `docs/PIPELINE.md` mantem link valido pela tabela "When to Read What" do CLAUDE.md raiz (linha 12).

---

## Implementacao

### Passo 1: Reler estado atual do `docs/PIPELINE.md`

```powershell
Get-Content docs/PIPELINE.md | Select-Object -First 50
```

Esperado: ~89 linhas (cabecalho + pipeline diagrama + artifact structure + key rules + alternative entry points). Identificar onde inserir secao "Step 91" — apos `## Alternative Entry Points` (final do arquivo) ou apos `## Skill Pipeline` mas antes de `## Artifact Structure`. **Decisao: inserir como ULTIMA secao do arquivo** — Step 91 e parte do `init` skill, nao do pipeline principal.

### Passo 2: Inspecionar formato de uma compound note de referencia

```powershell
Get-Content docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md | Select-Object -First 30
```

Frontmatter observado:
```yaml
---
title: "..."
category: processo
tags: [...]
created: "2026-05-19"
---
```

Sem campo `principle` ou `evidence` separado — esses ficam dentro do conteudo (secoes `## Problem` / `## Solution`). Copiar shape desta note.

### Passo 3: Validar shape esperado pelo `bun run compound:check`

```powershell
# Inspecionar o validator
Get-Content scripts/compound-check.* 2>/dev/null | Select-Object -First 30
# OU
Get-ChildItem scripts/ | Select-String -Pattern "compound"
```

**Verificar manualmente** que `compound:check` espera apenas frontmatter `title`, `category`, `tags`, `created` (mesmas keys que a note de referencia). Se exigir mais, adicionar.

### Passo 4: Criar `docs/compound/2026-05-19-never-diminish-andre.md`

```markdown
---
title: "Gate de paridade com referencia externa deve ser TESTE, nao doc"
category: processo
tags: [parity, gate, regression-test, andre-port, populate-plan, anti-drift]
created: "2026-05-19"
---

## Problem

PRD `populate-plan-andre-port` (2026-05-19) revelou que o `/init` antigo produzia
populate-plans com fases ausentes para docs criticos (PRODUCT_SENSE, README, AGENTS,
.claude/CLAUDE.md) — exclusao silenciosa em `EXCLUDED_FROM_POPULATION_V2` + cobertura
incompleta no `TEMPLATE_MANIFEST`. Comparativo com `harness-engineering` + `compound-engineering`
do Andre rodando lado-a-lado no projeto Carreirarte mostrou que o output dele cobria
13 docs ricos enquanto o nosso parava em 7 docs com stubs `TBD`.

Diagnostico foi mecanico (lista de docs, instrucoes LLM, paths candidatos), mas o
risco real e RECORRENCIA: alguem futuro pode readicionar entry em
`EXCLUDED_FROM_POPULATION_V2` por "limpeza", ou esquecer de adicionar instrucao
imperativa para novo doc canonico, e a regressao passa silenciosa porque doc-only
gates (ex: "siga o checklist em docs/PRODUCT_SENSE.md") sao ignorados em PR review.

**Custo do gate-em-doc:** docs decaem. Comentario `<!-- nunca diminuir -->` no
`populate-plan-generator.ts` daria sinal fraco — primeira pessoa que precisar
remover entry para fix urgente comenta o comentario e segue. Ninguem ve.

**Padrao observado em outros pontos do plugin:**
- D14 do PRD anterior mantinha `docs/PRODUCT_SENSE.md` em `EXCLUDED_FROM_POPULATION_V2`
  com comentario `// D14 mantem filosoficos sem populate`. Comentario fica, decisao envelhece,
  resultado e doc vazio quando deveria ter sido populado.
- Golden snapshot do `init-greenfield.stdout.txt` referenciava steps removidos do PRD
  `knowledge-path-cutover` — MEMORY.md raiz registrava "regenerar golden no Plano 05 fase-04"
  como TODO informal. Esqueceu por 2 sprints.

## Solution

PRD `populate-plan-andre-port` adotou gate **mecanico + claro + revisao humana** em 3 camadas:

1. **Gate mecanico (CA-04 do PRD):** `tests/e2e/populate-plan-parity.test.ts` assertando
   `plan.phases.length >= 12` + `EXCLUDED_FROM_POPULATION_V2` nao contem PRODUCT_SENSE/README +
   cada `LLM_INSTRUCTION` satisfaz `isImperativeInstruction()` + Next.js+Supabase tem >= 3 paths
   reais em SECURITY/ARCHITECTURE/RELIABILITY. Build quebra se qualquer assert falhar.

2. **Mensagem clara (CA-07 do PRD):** quando o gate quebra, o assert emite mensagem
   `... esperado X, encontrado Y. Verifique {causa provavel}. Ver PRD secao MH-N.`
   em vez de `Expected 12, got 11`. Regressor le exatamente o que removeu + onde
   encontrar o "por que" original.

3. **Aprovacao humana explicita (CA-08 do PRD):** `tests/e2e/__golden__/populate-plan-andre-parity.md`
   captura estrutura minima. Mudancas no output exigem `UPDATE_GOLDENS=1` para regerar — o diff
   aparece no PR e precisa de approve humano explicito. Nao tem auto-update silencioso.

## Rule

> Quando o codigo importa paridade com uma referencia externa (Andre, biblioteca madura,
> protocolo, contrato API), o gate de paridade DEVE ser teste mecanico, nao comentario nem doc.
>
> - Doc-only gate: 0/3 protecoes. Confia em PR review consistente — improvavel.
> - Schema lint: 1/3 protecoes. Cobre estrutura, nao cobertura.
> - Teste mecanico + mensagem clara + golden com diff humano: 3/3 protecoes.
>
> Aplicar a qualquer ponto do plugin onde "paridade com referencia" importa: portagens
> de skills externas, espelhamento de schemas, compatibilidade com upstream APIs.

## Evidencia

- Test gate mecanico: `tests/e2e/populate-plan-parity.test.ts`
- Golden snapshot com diff humano: `tests/e2e/__golden__/populate-plan-andre-parity.md`
- Audit log de cobertura (observability): `skills/init/lib/populate-plan-coverage.ts` (`docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected`)
- PRD original com CA-04/CA-07/CA-08: `docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md`

## Pontos do plugin onde a regra deve ser aplicada (gaps conhecidos)

- **`tests/e2e/__golden__/init-greenfield.stdout.txt`**: golden ja existe. Reativar testes
  skipados em `init-cutover-greenfield.test.ts` (feito em Plano 05 fase-06). Protege regressao
  da estrutura do `/init` greenfield.
- **Subagent contract validators**: `tests/e2e/subagent-contract.test.ts` deveria ter golden
  do output esperado por subagent_id. Hoje verifica estrutura — nao cobertura.
- **Stack knowledge format** (`.claude/knowledge/{stack}/INDEX.md`): contrato definido em
  V6.6.0 `knowledge-path-cutover` PRD. Test parity equivalente seria valioso — iteracao futura.
```

### Passo 5: Adicionar secao "Step 91" ao `docs/PIPELINE.md`

Inserir no final do arquivo (apos `## Alternative Entry Points`):

```markdown

---

## Step 91 — Populate Plan (init skill internal)

Apos `/anti-vibe-coding:init` rodar Steps 01-90, **Step 91 (`91-generate-populate-plan`)** emite um plano executavel
que dispara a populacao dos docs canonicos (ARCHITECTURE, AGENTS, README, PRODUCT_SENSE,
QUALITY_SCORE, SECURITY, RELIABILITY, DESIGN, FRONTEND, PLANS, CODE_STYLE, STATE,
design-docs/core-beliefs, .claude/CLAUDE.md).

```
init Step 91 (puro — zero LLM)
        |
        |  emite docs/exec-plans/active/{date}-populate-harness/PLAN.md
        |  + fase-XX-{slug}.md (1 fase por doc canonico)
        v
/anti-vibe-coding:execute-plan (1 subagent por fase — paralelo)
        |
        |  cada subagent le Inputs (codigo + docs), gera doc canonico
        v
PR review humano + merge
```

### Contrato do PLAN.md gerado

`skills/init/assets/templates/exec-plan/PLAN.md.tpl` define **11 secoes obrigatorias**:
Goal / Scope / Assumptions / Risks / Execution Steps / Review Checklist / Validation Log /
Compound Opportunity / Lessons Captured / Exit Criteria / Observability.

Mais 3 opcionais (Follow-up Plans / Final Report / Pré-GO) marcadas com `<!-- opcional -->`
quando vazias.

### Contrato das instrucoes LLM (`LLM_INSTRUCTIONS`)

Cada doc canonico tem entry em `LLM_INSTRUCTIONS` (em `populate-plan-generator.ts`) seguindo
o tipo `ImperativeInstruction = { fontes: string[]; secoes: string[]; honestidade: string }`.

Tres elementos obrigatorios por entry:
1. **Fontes:** lista especifica de arquivos a ler.
2. **Secoes:** sub-secoes obrigatorias do output.
3. **Honestidade:** frase do tipo "Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`."

Validado por `isImperativeInstruction()` em runtime e no parity test (CA-06 do PRD).

### Discovery `(stack-id + doc-canonico) -> paths`

`skills/init/lib/stack-aware-input-paths.ts` mapeia cada doc canonico aos paths candidatos por
stack detectado. Paths validados via `fs.access` (mitiga LLM-hallucination).

Stacks cobertos: Next.js, Next.js+Supabase, Rails, Node-TS, Laravel, Python. Fallback generico
para `unknown`/`null`.

### Gate "nunca diminuir"

`tests/e2e/populate-plan-parity.test.ts` impede regressao mecanica:
- `plan.phases.length >= 12` (CA-01).
- `EXCLUDED_FROM_POPULATION_V2` nao contem PRODUCT_SENSE/README (MH-1 + D5).
- Cada `LLM_INSTRUCTION` satisfaz contrato imperativo (CA-06).
- Next.js+Supabase tem >= 3 paths reais em SECURITY/ARCHITECTURE/RELIABILITY (CA-02).
- PLAN.md gerado tem as 11 secoes obrigatorias (CA-03).
- Golden `tests/e2e/__golden__/populate-plan-andre-parity.md` bate (CA-08).

Compound: `docs/compound/2026-05-19-never-diminish-andre.md` captura a regra durable
("gate de paridade deve ser teste, nao doc").

### Observability

Step 91 emite audit log com:
- `phaseCount`, `filesWritten`, `warnings`, `stackPrimary`, `discoveryEntries`.
- `docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected` (SH-4 — `populate-plan-coverage.ts`).
```

### Passo 6: Validar com `compound:check` e `harness:validate`

```powershell
bun run compound:check
```

**Esperado:** exit 0. Confirma frontmatter valido + sintaxe do compound. Se falhar com mensagem sobre campos obrigatorios, ajustar frontmatter conforme exigido (e atualizar este plano se for diferente do shape de `docs/compound/2026-05-16-...`).

```powershell
bun run harness:validate
```

**Esperado:** exit 0. Confirma estrutura `docs/` integra.

### Passo 7: Suite completa (zero regressao em tests)

```powershell
bun test
```

**Esperado:** verde.

### Passo 8: Validar links manualmente

```powershell
# Confirma que paths referenciados no compound existem
Test-Path tests/e2e/populate-plan-parity.test.ts
Test-Path tests/e2e/__golden__/populate-plan-andre-parity.md
Test-Path skills/init/lib/populate-plan-coverage.ts
Test-Path docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md
```

**Esperado:** todos True.

**OBSERVACAO:** `populate-plan-parity.test.ts` so existe apos Plano 01 fase-02. `populate-plan-andre-parity.md` so existe apos Plano 05 fase-01. `populate-plan-coverage.ts` so existe apos Plano 05 fase-04. Se algum desses ainda nao foi mergeado, **referenciar mesmo assim** — compound documenta o estado-final do PRD. Anotar em MEMORY.md como `DI-Plano05-fase05-links-forward-reference` se forem referencias antecipadas.

### Passo 9: Registrar em MEMORY.md

- `DI-Plano05-fase05-pipeline-final-section`: secao "Step 91" inserida no FINAL do `docs/PIPELINE.md`, apos `## Alternative Entry Points`. Razao: Step 91 e parte do `init` skill, nao do pipeline principal — manter visualmente separado.
- `DI-Plano05-fase05-compound-frontmatter`: shape de frontmatter copiado de `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (4 campos: title, category, tags, created). Se `compound:check` exigir mais, ajustar.
- `DI-Plano05-fase05-pontos-gaps`: secao "Pontos do plugin onde a regra deve ser aplicada" do compound enumera 3 gaps (init-greenfield golden, subagent-contract goldens, stack-knowledge format). Sao seeds para iteracoes futuras — nao bloqueiam merge deste PRD.

---

## Gotchas

- **G8 do plano (PIPELINE.md no CLAUDE.md raiz):** CLAUDE.md raiz linha 12 cita `docs/PIPELINE.md` como fonte de verdade para "Understanding the plugin pipeline". A secao nova "Step 91" e CADASTRO de comportamento existente — nao muda o fluxo principal documentado em `## Skill Pipeline`. Verificar manualmente apos editar que a tabela "When to Read What" do CLAUDE.md continua valida.
- **G10 do plano (compound frontmatter):** se `bun run compound:check` quebrar com mensagem "missing field X", ajustar frontmatter para incluir X. Notes recentes em `docs/compound/` sao o ground-truth do shape exigido — copiar a mais recente como referencia.
- **G-compound-link-paths:** o compound note usa paths absolutos do repo (`tests/e2e/...`, `skills/init/lib/...`). Sao relativos a root do repo — convencao do projeto. Confirmar lendo 1-2 notes existentes que usam mesmo padrao.
- **G-no-emoji-rule:** CLAUDE.md raiz da pasta usuario: "Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked." Confirmado tambem para arquivos. Compound note NAO deve ter emojis nem icones decorativos.
- **G-forward-reference-em-compound:** o compound referencia arquivos que so existem apos fase-01, fase-04 do Plano 05. Se este fase-05 for executado ANTES dos outros, criar o compound mesmo assim — paths existem como contrato planejado. Se algum nao for criado ate o merge final, ajustar referencia. Documentar em DI.

---

## Verificacao

### TDD

Esta fase nao tem TDD direto (entregas sao docs, nao codigo). Verificacao e via:

- [ ] **RED:** `bun run compound:check` falha porque o novo compound nao existe ainda.
- [ ] **GREEN:** apos criar `docs/compound/2026-05-19-never-diminish-andre.md` com frontmatter valido, `compound:check` passa.
- [ ] **REFACTOR:** N/A (sao docs).

### Checklist

- [ ] `docs/PIPELINE.md` tem secao nova `## Step 91 — Populate Plan (init skill internal)` com diagrama ASCII + 5 subsecoes (Contrato PLAN.md, Contrato LLM_INSTRUCTIONS, Discovery, Gate "nunca diminuir", Observability).
- [ ] `docs/PIPELINE.md` mantem a secao `## Skill Pipeline` original intacta.
- [ ] `docs/compound/2026-05-19-never-diminish-andre.md` criado com frontmatter valido (4 campos) + 4 secoes (Problem, Solution, Rule, Evidencia, Pontos gaps).
- [ ] Frontmatter do compound: `title`, `category: processo`, `tags: [parity, gate, regression-test, andre-port, populate-plan, anti-drift]`, `created: "2026-05-19"`.
- [ ] `bun run compound:check` exit 0.
- [ ] `bun run harness:validate` exit 0.
- [ ] `bun test` (suite completa) verde, zero regressao.
- [ ] MEMORY.md atualizada (3 DIs).

### Comandos verificaveis

```powershell
# Compound note existe
Test-Path docs/compound/2026-05-19-never-diminish-andre.md
# Esperado: True

# PIPELINE atualizado
Select-String -Pattern "^## Step 91" -Path docs/PIPELINE.md
# Esperado: 1 match

# Validadores
bun run compound:check
bun run harness:validate

# Suite completa
bun test
```

---

## Criterio de Aceite

**Por maquina:**
- `Test-Path docs/compound/2026-05-19-never-diminish-andre.md` retorna `True`.
- `Test-Path docs/PIPELINE.md` retorna `True` E `Select-String -Pattern "Step 91" -Path docs/PIPELINE.md` retorna >= 1 match.
- `bun run compound:check` exit 0.
- `bun run harness:validate` exit 0.

**Por humano:**
- Compound note tem 3 secoes claras (Problem / Solution / Rule) + Evidencia + Pontos gaps.
- Secao "Step 91" em PIPELINE.md tem diagrama ASCII inteligivel + 5 subsecoes.
- Frontmatter do compound bate com shape de outras notes em `docs/compound/`.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
