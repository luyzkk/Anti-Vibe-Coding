# Legacy Detector — Algoritmo de Deteccao de Estrutura Legacy

Documento de referencia compartilhado. Consumido pelo Step 0 de `plan-feature/SKILL.md` e
`execute-plan/SKILL.md` para detectar artefatos de planejamento em formato anterior a v2
(pasta datada `YYYY-MM-DD-{slug}/`).

---

## O que e considerado legacy (Heuristica DUPLA)

A deteccao usa dois sinais primarios. Pelo menos UM deve disparar para que a estrutura seja
considerada legacy.

**Sinal A** — `PRD-*.md` solto na raiz de `.planning/`
- Arquivos no padrao `.planning/PRD-*.md` que NAO estejam dentro de `_archive/`
- Ex: `.planning/PRD-auth.md`, `.planning/PRD-notificacoes.md`

**Sinal B** — `plano*/` solto na raiz de `.planning/` contendo pelo menos 1 `fase-*.md`
- Diretorios no padrao `.planning/plano*/` que NAO estejam dentro de `_archive/`
- E que NAO sejam subpastas de `YYYY-MM-DD-*/` (nova estrutura)
- O diretorio deve conter pelo menos um arquivo `fase-*.md` dentro
- Ex: `.planning/plano01/fase-01-auth.md`

**Sinal C** — auxiliar (PLAN/STATE/CONTEXT soltos)
- So entra na lista de artefatos SE Sinal A ou Sinal B ja disparou
- Arquivos no padrao: `PLAN.md`, `PLAN-*.md`, `STATE.md`, `STATE-*.md`,
  `SUMMARY-*.md`, `CONTEXT-*.md` soltos na raiz de `.planning/`
- Nao triggering sozinho — nunca determina legacy por si so

---

## Resultado esperado (objeto de resposta)

```
{
  legacy: true | false,
  signals: ["A", "B", "C"?],       // C so aparece se A ou B presente
  artifacts: [
    { path: ".planning/PRD-auth.md",      type: "PRD" },
    { path: ".planning/plano01/",         type: "planoDir" },
    { path: ".planning/PLAN-auth.md",     type: "PLAN" },
    { path: ".planning/STATE-auth.md",    type: "STATE" },
    { path: ".planning/CONTEXT-auth.md",  type: "CONTEXT" }
  ],
  suggestedSlug: "auth" | null,
  ambiguous: true | false
}
```

Quando `legacy: false`, os campos `signals`, `artifacts`, `suggestedSlug` e `ambiguous`
podem ser omitidos.

---

## Pseudocodigo do detector

```
function detectLegacy(planningDir):
    signals   = []
    artifacts = []

    # Sinal A: PRD-*.md soltos na raiz (excluindo _archive/)
    prdsSoltos = glob(planningDir + "/PRD-*.md", excludeDirs=["_archive"])
    if prdsSoltos.length > 0:
        signals.push("A")
        for p in prdsSoltos:
            artifacts.push({ path: p, type: "PRD" })

    # Sinal B: plano*/ soltos na raiz, com fase-*.md dentro
    #          excluindo _archive/ e pastas YYYY-MM-DD-*/
    planoDirs = glob(planningDir + "/plano*/",
                     excludeDirs=["_archive"],
                     excludeInsideDirs=["????-??-??-*"])
    for dir in planoDirs:
        fases = glob(dir + "/fase-*.md")
        if fases.length > 0:
            if "B" not in signals:
                signals.push("B")
            artifacts.push({ path: dir, type: "planoDir" })

    # Se nem A nem B dispararam: nao e legacy
    if "A" not in signals and "B" not in signals:
        return { legacy: false }

    # Sinal C (auxiliar): PLAN/STATE/SUMMARY/CONTEXT soltos na raiz
    auxiliaryPatterns = [
        "PLAN.md", "PLAN-*.md",
        "STATE.md", "STATE-*.md",
        "SUMMARY-*.md",
        "CONTEXT-*.md"
    ]
    foundAuxiliary = false
    for pattern in auxiliaryPatterns:
        for f in glob(planningDir + "/" + pattern, excludeDirs=["_archive"]):
            artifacts.push({ path: f, type: inferType(pattern) })
            foundAuxiliary = true
    if foundAuxiliary:
        signals.push("C")

    # Inferencia de slug a partir de PRDs soltos
    prdArtifacts = artifacts.filter(a => a.type == "PRD")
    if prdArtifacts.length == 1:
        slug      = extractSlug(prdArtifacts[0].path)  # "PRD-auth.md" → "auth"
        ambiguous = false
    else if prdArtifacts.length > 1:
        slug      = null
        ambiguous = true
    else:  # Sinal B sozinho, sem PRD
        slug      = null
        ambiguous = true

    return {
        legacy:       true,
        signals:      signals,
        artifacts:    artifacts,
        suggestedSlug: slug,
        ambiguous:    ambiguous
    }
```

Funcoes auxiliares:

```
inferType(pattern):
    if pattern starts with "PLAN":    return "PLAN"
    if pattern starts with "STATE":   return "STATE"
    if pattern starts with "SUMMARY": return "SUMMARY"
    if pattern starts with "CONTEXT": return "CONTEXT"

extractSlug(path):
    # ".planning/PRD-auth.md" → "auth"
    filename = basename(path)             # "PRD-auth.md"
    return filename.replace("PRD-", "").replace(".md", "")
```

---

## Falsos-positivos conhecidos (NAO considerar legacy)

| Caminho | Motivo |
|---------|--------|
| `.planning/_archive/**` | Arquivado — nao migrar |
| `.planning/YYYY-MM-DD-*/plano*/` | Plano DENTRO da nova estrutura datada |
| `.planning/notas/`, `.planning/drafts/` | Pastas sem `fase-*.md` — Sinal B nao dispara |
| `.planning/CONTEXT-*.md` isolado | Artefato valido pre-`/write-prd` — Sinal C nao dispara sozinho |
| `.planning/PLAN.md` isolado sem PRD/plano | Sinal C nao dispara sozinho |
| `.planning/plano01/` sem `fase-*.md` | Pasta vazia ou so com README — Sinal B nao dispara |

Regra de ouro: `_archive/` e qualquer nivel de profundidade esta excluido. `????-??-??-*/` e
o prefixo da nova estrutura — planos dentro dela nao sao legacy.

---

## Regras de inferencia de slug

1. **PRD unico:** `PRD-{slug}.md` e o unico arquivo PRD solto →
   `suggestedSlug = "{slug}"`, `ambiguous = false`

2. **Multiplos PRDs:** dois ou mais `PRD-*.md` soltos →
   `suggestedSlug = null`, `ambiguous = true` —
   apresentar lista ao dev para escolha manual

3. **Sinal B sozinho (sem PRD):** plano solto sem `PRD-*.md` correspondente →
   `suggestedSlug = null`, `ambiguous = true` —
   dev DEVE fornecer o slug explicitamente para a migracao
