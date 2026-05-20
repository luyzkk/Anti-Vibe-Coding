<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: fase.md.tpl com 4 sub-blocos por fase

**Plano:** 02 — MH-2 PLAN.md / fase.md templates estilo Andre
**Sizing:** 1h
**Depende de:** Nenhuma (paralela a fase-01 — arquivos disjuntos)
**Visual:** false

---

## O que esta fase entrega

`skills/init/assets/templates/exec-plan/fase.md.tpl` estatico com header
`# Fase {{FASE_NUM}}: Popular {{DOC_CANONICO}}`, sub-secoes `Goal (local)`, `Inputs (docs
candidatos)`, `Inputs (codigo)`, `Instrucao LLM`, `Criterio de done` — cada uma com marcador
`{{BLOCO}}` que o renderer (fase-03) injeta via helpers existentes
(`renderInputsDocsBlock`, etc).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/exec-plan/fase.md.tpl` | Create | template estatico de fase individual do populate (4 marcadores de bloco) |

Pre-requisito: o diretorio `skills/init/assets/templates/exec-plan/` ja foi criado em fase-01
(ou nao — fase-02 pode rodar em paralelo, entao precisa criar o dir se ausente).

---

## Implementacao

### Passo 1: Garantir diretorio existe

Se rodando em paralelo a fase-01, o dir pode nao existir ainda. Verificar e criar se faltar:

```bash
mkdir -p skills/init/assets/templates/exec-plan
```

(Operacao idempotente — `mkdir -p` nao falha se ja existir.)

### Passo 2: Inspecionar `renderPhase` atual em `populate-plan-generator.ts:195-212`

Para garantir paridade estrutural com o renderer atual, abrir o arquivo e ler a ordem dos
blocos:

1. Header: `# Fase NN: Popular \`doc\``
2. Meta: `**Doc canonico:** \`doc\``
3. Meta: `**Subagente:** harness-populator`
4. Separador `---`
5. `renderInputsDocsBlock` (gera `### Inputs (docs candidatos)`)
6. `renderInputsCodeBlock` (gera `### Inputs (codigo)`)
7. `renderLLMInstructionBlock` (gera `### Instrucao LLM`)
8. `renderDoneCriteriaBlock` (gera `### Criterio de done`)

O tpl novo deve preservar essa ordem; helpers continuam emitindo o `### NOME` interno — o tpl
NAO duplica o header da sub-secao.

### Passo 3: Criar `fase.md.tpl`

Path exato: `skills/init/assets/templates/exec-plan/fase.md.tpl`.

```markdown
<!--
2026-05-19 (Luiz/dev): fase.md.tpl — template de fase individual do populate-harness.
Decisao: D1 e D4 do PRD populate-plan-andre-port (MH-2).
Adiciona sub-secao "Goal (local)" que o renderer atual nao tinha — alinhamento com Andre
(cada fase declara seu objetivo local antes dos inputs).
Step 91 PURO: renderer le este tpl e faz replace dos {{BLOCOS}} pelos helpers existentes
em populate-plan-generator.ts (renderInputsDocsBlock, renderInputsCodeBlock,
renderLLMInstructionBlock, renderDoneCriteriaBlock). ZERO LLM aqui.

Variaveis interpoladas pelo renderer (applyVars):
  {{FASE_NUM}}              — numero da fase (zero-padded "01", "02", ...)
  {{DOC_CANONICO}}          — path do doc canonico (ex: `docs/SECURITY.md`)
  {{INPUTS_DOCS_BLOCK}}     — bloco "### Inputs (docs candidatos)" ja renderizado
  {{INPUTS_CODE_BLOCK}}     — bloco "### Inputs (codigo)" ja renderizado
  {{INSTRUCAO_LLM_BLOCK}}   — bloco "### Instrucao LLM" ja renderizado
  {{CRITERIO_DONE_BLOCK}}   — bloco "### Criterio de done" ja renderizado

Atencao: nao colocar `{{` ou `}}` literal no corpo — applyVars usa replaceAll, entao apenas
as 6 chaves declaradas sao substituidas; um literal `{{XYZ}}` ficaria intacto no output
(parece bug pro leitor humano).
-->
# Fase {{FASE_NUM}}: Popular `{{DOC_CANONICO}}`

**Doc canonico:** `{{DOC_CANONICO}}`
**Subagente:** harness-populator

---

### Goal (local)

Popular `{{DOC_CANONICO}}` com base nos inputs declarados abaixo — sem placeholder, sem
conteudo generico. Cada afirmacao referencia um arquivo lido (path validado em `Inputs
(codigo)` ou `Inputs (docs candidatos)`).

---

{{INPUTS_DOCS_BLOCK}}

{{INPUTS_CODE_BLOCK}}

{{INSTRUCAO_LLM_BLOCK}}

{{CRITERIO_DONE_BLOCK}}
```

### Passo 4: Confirmar marcadores

Apos criar, confirmar que os 6 marcadores estao presentes:

```powershell
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{FASE_NUM\}\}'
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{DOC_CANONICO\}\}'
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{INPUTS_DOCS_BLOCK\}\}'
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{INPUTS_CODE_BLOCK\}\}'
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{INSTRUCAO_LLM_BLOCK\}\}'
Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{CRITERIO_DONE_BLOCK\}\}'
```

Cada chamada deve retornar pelo menos 1 match.

---

## Gotchas

- **G2 do plano (Step 91 PURO):** o `{{INSTRUCAO_LLM_BLOCK}}` recebe uma string ja construida
  pelo helper `renderLLMInstructionBlock(phase.instrucaoLLM)` — `phase.instrucaoLLM` vem do
  mapa `LLM_INSTRUCTIONS` em `populate-plan-generator.ts:79-126` (estatico). NAO ha chamada
  de LLM na pipeline desta fase nem da fase-03.
- **G5 do plano (`{{VAR}}` escape):** os helpers existentes (`renderInputsDocsBlock` etc)
  retornam strings que podem ter caracteres especiais (backticks, pipes). `applyVars` usa
  `replaceAll(key, value)` sem regex, entao backticks no `value` nao colidem com sintaxe.
- **Local (Goal local novo):** a sub-secao `### Goal (local)` NAO existe no `renderPhase`
  atual. Adicao alinhada ao canon Andre (cada fase Andre tem Goal proprio). Texto fixo no
  tpl — nao precisa de variavel injetada porque o conteudo e generico ("popular `{{DOC}}` com
  base nos inputs"). O tpl ja referencia `{{DOC_CANONICO}}` para personalizar.
- **Local (separadores `---`):** o tpl tem 1 separador entre meta inicial e `Goal (local)`,
  e 1 separador entre `Goal (local)` e os 4 blocos de inputs/instrucao. Helpers emitem
  blocos sem separador entre si — o markdown final fica legivel sem hr extras (validar em
  fase-03 com bun test).
- **Local (ordem dos blocos):** preservar EXATAMENTE: `INPUTS_DOCS_BLOCK` -> `INPUTS_CODE_BLOCK`
  -> `INSTRUCAO_LLM_BLOCK` -> `CRITERIO_DONE_BLOCK`. Trocar ordem quebra os testes existentes
  de `populate-plan-generator.test.ts:20-32` que checam substrings nessa ordem implicita.

---

## Verificacao

### TDD

- **RED/GREEN: N/A — tpl estatico, validado por integracao em fase-03** (testes existentes
  de `populate-plan-generator.test.ts` continuam batendo as substrings `### Inputs (docs
  candidatos)`, `### Inputs (codigo)`, `### Instrucao LLM`, `### Criterio de done`).

### Checklist

- [ ] Arquivo `skills/init/assets/templates/exec-plan/fase.md.tpl` existe.
- [ ] Header `# Fase {{FASE_NUM}}: Popular` presente.
- [ ] Sub-secao `### Goal (local)` presente.
- [ ] Os 6 marcadores `{{VAR}}` presentes (`FASE_NUM`, `DOC_CANONICO`,
      `INPUTS_DOCS_BLOCK`, `INPUTS_CODE_BLOCK`, `INSTRUCAO_LLM_BLOCK`, `CRITERIO_DONE_BLOCK`).
- [ ] Comentario HTML de Provenance no topo datado 2026-05-19 com link para PRD MH-2 / D4.
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` continua verde (2 asserts MH-1).
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` continua verde (renderer
      ainda nao foi refatorado, tpl ainda nao e lido).

### Comandos verificaveis

```powershell
ls skills/init/assets/templates/exec-plan/fase.md.tpl
(Select-String -Path skills/init/assets/templates/exec-plan/fase.md.tpl -Pattern '\{\{').Count  # >= 6

bun test tests/e2e/populate-plan-parity.test.ts
bun test skills/init/lib/populate-plan-generator.test.ts
```

---

## Criterio de Aceite

**Por maquina:**
- `skills/init/assets/templates/exec-plan/fase.md.tpl` existe.
- Contem os 6 marcadores `{{VAR}}` listados.
- Contem sub-secao literal `### Goal (local)`.
- Contem `**Subagente:** harness-populator`.
- Nao contem `{{XYZ}}` orfao alem dos 6 declarados (`Select-String` por `\{\{[A-Z_]+\}\}`
  retorna apenas os 6 nomes acima).

**Por humano:**
- Diff legivel; ordem dos blocos coerente com `renderPhase` atual.
- Comentario Provenance no topo datado 2026-05-19, link PRD MH-2 / D4.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
