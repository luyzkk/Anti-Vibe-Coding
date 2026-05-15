# Fase 01: Detector de legacy com heuristica dupla

**Plano:** 02 — Deteccao legacy e migracao on-detect
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano; depende do Plano 01 inteiro ter concluido)
**Visual:** false

---

## O que esta fase entrega

Uma funcao compartilhada (descrita em prosa dentro das skills, ja que o plugin nao tem runtime
proprio) que inspeciona `.planning/` e retorna se ha estrutura legacy presente, com lista de
artefatos detectados e slug inferido. Usada pelo Step 0 de `plan-feature` (fase-03) e `execute-plan`
(fase-04).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/legacy-detector.md` | Create | Documento de referencia descrevendo o algoritmo do detector (skills do plugin sao prompts — a "funcao" eh uma secao procedural que as skills incluem via Read) |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Adicionar referencia a `lib/legacy-detector.md` na secao de Referencias |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Adicionar referencia a `lib/legacy-detector.md` na secao Referencias |

Nota: o plugin nao tem `.ts`/`.js`. As "funcoes" sao blocos procedurais descritos em Markdown
que as skills Read + seguem. `lib/legacy-detector.md` eh o ponto unico de verdade deste
algoritmo — outras fases dependem dele.

---

## Implementacao

### Passo 1 — Criar `lib/legacy-detector.md` com o algoritmo

Documento estruturado em 3 partes: (a) sinais aceitos como legacy, (b) falso-positivos a evitar,
(c) saida esperada.

Estrutura proposta do documento:

```markdown
# Legacy Detector — Algoritmo compartilhado

Consumido por: plan-feature (Step 0), execute-plan (Step 0).

## O que eh considerado legacy

Heuristica DUPLA — ambos os sinais sao aceitos independentemente, mas cada um deve ser
estritamente satisfeito. Se NENHUM for satisfeito, retornar `legacy: false`.

### Sinal A: PRD-*.md solto na raiz de .planning/
- Glob: `.planning/PRD-*.md` (nao recursivo; apenas raiz de .planning/)
- Exclui: `.planning/_archive/**` (arquivado nao conta)
- Se encontrar 1 ou mais arquivos: Sinal A presente

### Sinal B: planoNN/ solto na raiz de .planning/ CONTENDO fase-*.md
- Glob: `.planning/plano*/` (nao recursivo; apenas raiz)
- Exclui: `.planning/_archive/**`, `.planning/????-??-??-*/plano*/` (planos dentro de pastas
  datadas NAO sao legacy — sao a nova estrutura)
- Para cada candidato, verificar: tem pelo menos 1 arquivo `fase-*.md` dentro?
  - Sim: Sinal B presente
  - Nao: IGNORAR (pasta nao-anti-vibe com nome coincidente)

### Sinal C (auxiliar — nao dispara sozinho): PLAN.md / STATE.md flat solto
- Glob: `.planning/PLAN.md`, `.planning/PLAN-*.md`, `.planning/STATE.md`, `.planning/STATE-*.md`
- Exclui: `.planning/_archive/**`
- Sozinho NAO conta como legacy (pode ser v1 flat sendo gerado pelo write-prd novo em transicao).
- So conta se Sinal A ou B tambem estiver presente — entra na lista de artefatos a migrar.

## Resultado

Objeto de resposta:

  legacy: true | false
  signals: ["A", "B", "C"?]  -- quais sinais foram detectados
  artifacts: [
    { path: ".planning/PRD-auth.md", type: "PRD" },
    { path: ".planning/plano01/",   type: "planoDir" },
    { path: ".planning/PLAN-auth.md", type: "PLAN" },
    { path: ".planning/STATE-auth.md", type: "STATE" },
    { path: ".planning/CONTEXT-auth.md", type: "CONTEXT" }  -- se associado
  ]
  suggestedSlug: "auth" | null  -- extraido do PRD-{slug}.md; null se nenhum
  ambiguous: true | false       -- true se Sinal B sozinho (planoNN sem PRD)

## Regras de inferencia de slug

1. Se houver `PRD-{slug}.md`: suggestedSlug = "{slug}", ambiguous = false
2. Se houver multiplos PRD-*.md: suggestedSlug = null, ambiguous = true (dev escolhe qual
   migrar primeiro — uma migracao por vez, por seguranca)
3. Se houver so planoNN/ sem PRD: suggestedSlug = null, ambiguous = true. Dev DEVE fornecer
   slug explicitamente (CA-09 do PRD).

## Falso-positivos conhecidos (nao considerar legacy)

- `.planning/_archive/**` — arquivado, nao migrar
- `.planning/YYYY-MM-DD-*/plano*/` — plano DENTRO da nova estrutura, nao eh legacy
- `.planning/notas/`, `.planning/drafts/`, `.planning/qualquer-outra/` sem fase-*.md dentro
- `.planning/CONTEXT-*.md` isolado (sem PRD/plano associado) — eh um artefato valido
  pre-write-prd; nao disparar migracao sozinho
- `.planning/PLAN.md` isolado sem PRD/plano — idem Sinal C acima
```

### Passo 2 — Pseudocodigo do detector (para referencia nas skills)

Incluir no `lib/legacy-detector.md` um bloco de pseudocodigo que a skill segue literalmente:

```
function detectLegacy(planningDir):
    signals = []
    artifacts = []

    # Sinal A
    prdsSoltos = glob(planningDir + "/PRD-*.md", excludeDirs=["_archive"])
    if prdsSoltos.length > 0:
        signals.push("A")
        for p in prdsSoltos: artifacts.push({path: p, type: "PRD"})

    # Sinal B
    planoDirs = glob(planningDir + "/plano*/", excludeDirs=["_archive", "????-??-??-*"])
    for dir in planoDirs:
        fases = glob(dir + "/fase-*.md")
        if fases.length > 0:
            if "B" not in signals: signals.push("B")
            artifacts.push({path: dir, type: "planoDir"})

    # Se nem A nem B: nao eh legacy. Para aqui.
    if "A" not in signals and "B" not in signals:
        return { legacy: false }

    # Sinal C (auxiliar): PLAN/STATE/SUMMARY/CONTEXT soltos entram na lista de migracao
    for pattern in ["PLAN.md","PLAN-*.md","STATE.md","STATE-*.md","SUMMARY-*.md","CONTEXT-*.md"]:
        for f in glob(planningDir + "/" + pattern, excludeDirs=["_archive"]):
            artifacts.push({path: f, type: inferType(pattern)})
    if any artifact.type == "PLAN" | "STATE": signals.push("C")

    # Inferencia de slug
    prdMatches = artifacts.filter(a => a.type == "PRD")
    if prdMatches.length == 1:
        slug = extractSlug(prdMatches[0].path)   # "PRD-auth.md" → "auth"
        ambiguous = false
    elif prdMatches.length > 1:
        slug = null
        ambiguous = true
    else:  # sinal B sozinho
        slug = null
        ambiguous = true

    return { legacy: true, signals, artifacts, suggestedSlug: slug, ambiguous }
```

### Passo 3 — Registrar referencia nas duas skills

Em `plan-feature/SKILL.md` e `execute-plan/SKILL.md`, adicionar ao final, na secao
`## Referencias` (criar a secao se nao existir):

```
- `lib/legacy-detector.md` — Algoritmo de deteccao de estrutura legacy (consumido pelo Step 0)
```

NAO modificar o Step 0 nesta fase — isso eh fase-03 e fase-04. Aqui so o arquivo + referencia.

---

## Gotchas

- **G1 do plano (R1 falso positivo):** A heuristica DUPLA eh a mitigacao central. Um unico sinal
  fraco (so uma pasta `plano01/` vazia) NAO dispara. Testar especificamente com fixtures
  adversarias: `.planning/plano01/` vazia; `.planning/drafts/fase-01.md` (fora de planoNN);
  `.planning/plano-qualquercoisa/` (nome nao-estrito). Nenhum deve disparar.
- **G2 do plano (escopo de glob):** Os globs DEVEM excluir `_archive/` e pastas `YYYY-MM-DD-*/`.
  Se nao excluir, o detector ve `2026-04-20-feature/plano01/` como legacy e oferece migrar uma
  estrutura ja correta. Verificar exclusoes em todos os 3 globs.
- **G4 do plano (CONTEXT associado):** CONTEXT-{slug}.md sozinho NAO eh legacy, mas quando
  Sinal A ou B ja disparou, CONTEXT do mesmo slug deve entrar em `artifacts` para ser migrado
  junto. A logica aqui tem que distinguir os dois cenarios.
- **G7 do plano (slug ambiguo):** Se Sinal B disparar sem Sinal A, `suggestedSlug` tem que ser
  `null` e `ambiguous = true`. A fase-03/04 usa esse sinal para PERGUNTAR o slug ao dev, nunca
  inferir.
- **Local (performance):** globs recursivos em `.planning/` com muitas pastas podem ser lentos.
  Como o detector roda toda vez que `plan-feature`/`execute-plan` inicia, manter depth=1 ou
  depth=2 nos globs relevantes. Nao varrer o projeto inteiro.

---

## Verificacao

### TDD (dogfooding manual — projeto nao tem test framework)

- [ ] **RED:** criar 5 fixtures em `.planning-test/`:
  - fixture-A: `.planning-test/PRD-auth.md` + `.planning-test/plano01/fase-01.md` → deve detectar `{legacy: true, signals: ["A","B"], suggestedSlug: "auth", ambiguous: false}`
  - fixture-B: `.planning-test/plano01/fase-01.md` (sem PRD) → `{legacy: true, signals: ["B"], suggestedSlug: null, ambiguous: true}`
  - fixture-C: `.planning-test/plano01/` vazia (sem fase-*.md) → `{legacy: false}`
  - fixture-D: `.planning-test/2026-04-20-feature/plano01/fase-01.md` (nova estrutura) → `{legacy: false}`
  - fixture-E: `.planning-test/_archive/2026-01-10-old/plano01/fase-01.md` (arquivado) → `{legacy: false}`
- [ ] Simular o algoritmo manualmente contra cada fixture (via Bash: `ls`, `find`) e verificar que
  o resultado bate com o esperado
- [ ] Ajustar pseudocodigo / exclusoes ate todos os 5 casos passarem

### Checklist

- [ ] Arquivo `anti-vibe-coding/skills/lib/legacy-detector.md` criado com as 3 secoes (sinais,
  pseudocodigo, falso-positivos)
- [ ] Pseudocodigo inclui exclusao explicita de `_archive/` e `????-??-??-*/`
- [ ] Regras de inferencia de slug cobrem os 3 cenarios (1 PRD, N PRDs, sem PRD)
- [ ] Referencia adicionada em `plan-feature/SKILL.md` na secao Referencias
- [ ] Referencia adicionada em `execute-plan/SKILL.md` na secao Referencias
- [ ] Fixtures de teste removidas apos validacao

---

## Criterio de Aceite

**Por maquina:**
- `ls anti-vibe-coding/skills/lib/legacy-detector.md` retorna o arquivo
- `grep -l "legacy-detector" anti-vibe-coding/skills/plan-feature/SKILL.md anti-vibe-coding/skills/execute-plan/SKILL.md` retorna os 2 arquivos

**Por humano:**
- Rodando o pseudocodigo manualmente contra as 5 fixtures, todos os resultados batem com
  expectativas documentadas acima
- Nenhum falso-positivo em pastas nao-anti-vibe (`drafts/`, `notas/`)
- Nenhum falso-positivo em `_archive/` ou na nova estrutura datada

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
