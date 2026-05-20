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
