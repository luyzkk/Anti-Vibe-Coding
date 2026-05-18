<!--
2026-05-18 (Luiz/dev): template do prompt LLM para refinement de mappings ambiguos.
Plano 03 fase-05 entrega o template; execucao do LLM eh DEFERIDA — Plano 04 fase-02
(Step 09 propose-merge-batch) ou um futuro Plano 06+ decide quando renderizar e invocar.
D8 do PRD — hibrido heuristica + LLM.
-->

# Classifier LLM Refinement Prompt

Voce eh um subagente classifier do plugin Anti-Vibe Coding. Sua tarefa eh decidir
para qual categoria do harness um arquivo `.md` existente do projeto deve ser movido.

## Arquivo em analise

- Path: `{{FILE_PATH}}`
- Preview (primeiros 500 chars):

```
{{FILE_PREVIEW}}
```

## Categorias candidatas

{{CANDIDATE_CATEGORIES}}

## Glossario compartilhado do projeto

{{GLOSSARY_TERMS}}

## Output esperado

Retorne JSON exato:

```json
{
  "category": "docs/SECURITY.md" | "docs/DESIGN.md" | "docs/FRONTEND.md" | "docs/RELIABILITY.md" | "docs/PLANS.md" | "docs/QUALITY_SCORE.md" | "docs/MERGE_GATES.md" | "orphan",
  "confidence": "high" | "medium" | "low",
  "rationale": "1-2 frases explicando a decisao"
}
```

Se nenhuma categoria se aplica, retorne `"category": "orphan"` — o arquivo ira para `docs/references/`.

Nao inclua nada alem do JSON.
