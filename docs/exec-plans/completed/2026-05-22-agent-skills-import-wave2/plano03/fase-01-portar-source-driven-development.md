<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-22 (Luiz/dev): allowed-tools inclui WebFetch — SDD exige fetch de docs oficiais`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 01: Portar source-driven-development

**Plano:** 03 — Skills Novas (source-driven, doubt-driven, git-workflow)
**Sizing:** 1.5h
**Depende de:** Nenhuma (independente das outras fases deste plano; conceitualmente Plano 01 fase-02 e bloqueador frouxo)
**Visual:** false

---

## O que esta fase entrega

Skill `source-driven-development` portada de `Infos/agent-skills-main/skills/source-driven-development/SKILL.md` (194 linhas) para `skills/source-driven-development/SKILL.md` com copy-then-improve: frontmatter padrao do plugin, telemetria passiva, cross-refs explicitos para `consultant` e `references/`, pattern `UNVERIFIED:` preservado, e pelo menos 1 reference real citada de `docs/references/` (CH-03 do PRD).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/source-driven-development/` | Create | Diretorio da skill (mkdir) |
| `skills/source-driven-development/SKILL.md` | Create | Copy literal + frontmatter + telemetria + cross-refs |

---

## Implementacao

### Passo 1: Copy literal do arquivo fonte (G1 do README)

```bash
# 2026-05-22 (Luiz/dev): copy-then-improve — feedback do MEMORY global
mkdir -p skills/source-driven-development
cp Infos/agent-skills-main/skills/source-driven-development/SKILL.md \
   skills/source-driven-development/SKILL.md
```

Verificacao imediata:

```bash
diff Infos/agent-skills-main/skills/source-driven-development/SKILL.md \
     skills/source-driven-development/SKILL.md
# Esperado: zero diff (copy literal)
```

### Passo 2: Substituir o frontmatter do fonte pelo frontmatter padrao do plugin

O frontmatter original (linhas 1-4 do fonte) tem apenas `name` + `description`. Substituir pelo bloco abaixo (padrao do plugin, ver `skills/code-simplification/SKILL.md` linhas 1-8):

```yaml
---
name: source-driven-development
description: "Source-Driven Development: ancora cada decisao de implementacao em documentacao oficial. Use para codigo framework-especifico onde correcao importa. Diferente de consultant (que ensina trade-offs), SDD CITA fontes canonicas. Usa hierarquia docs oficiais > changelog > MDN; Stack Overflow nunca primaria; pattern UNVERIFIED quando doc nao encontrada."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebFetch
argument-hint: "[arquivo ou modulo a verificar contra docs oficiais]"
---
```

**Por que `allowed-tools` inclui `WebFetch`:** SDD fundamentalmente precisa buscar docs oficiais. Sem `WebFetch`, a skill nao tem como cumprir Step 2 (Fetch Official Documentation). `Read/Grep/Glob` para inspecionar `package.json`, `requirements.txt`, etc.

**Por que `description` em PT-BR:** padrao do plugin (`code-simplification`, `plan-feature` etc). Mencionar diferenciacao vs `consultant` cumpre G2 do README (cross-refs explicitos no frontmatter para mitigar R-04).

### Passo 3: Injetar bloco de telemetria passiva no TOPO (logo apos o frontmatter)

Padrao `code-simplification` (simples, suficiente para skills declarativas; G3 do README):

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin — ver skills/code-simplification/SKILL.md
import { writeTelemetryStart } from "../../lib/telemetry-utils";
writeTelemetryStart("source-driven-development");
```

Localizacao: imediatamente apos o frontmatter de fechamento (`---`), antes do `# Source-Driven Development`.

### Passo 4: Injetar secao "Differs from / Compose with" logo apos o titulo H1

Cumpre G2 do README (R-04 do PRD — diferenciacao vs skills existentes). Inserir DEPOIS de `# Source-Driven Development` e ANTES de `## Overview`:

```markdown
## Differs from / Compose with

- **`/consultant`** (irma): SDD **cita** docs oficiais; `/consultant` **ensina** trade-offs. Use SDD ao escrever codigo framework-especifico (precisa de pattern correto); use `/consultant` ao decidir entre patterns (precisa de criterios). Compoem: invocar `/consultant` para escolher abordagem, depois SDD para implementar com fonte.
- **`/design-twice`**: gera N alternativas arquiteturais; SDD valida UMA implementacao contra documentacao. Compoem: `/design-twice` propoe -> SDD verifica cada proposta contra docs antes de escolher.
- **`docs/references/`** (Wave 1): catalogo de referencias canonicas locais. SDD pode CITAR uma reference (`docs/references/testing-patterns.md`) quando o pattern recomendado ja esta documentado internamente — evita re-fetch de fontes externas estaveis.
- **Exemplo de cross-ref para reference local:** ao implementar testes que seguem AAA + Test Sizes, citar `docs/references/testing-patterns.md` ao inves de re-fetch do Google Engineering Practices.
```

### Passo 5: Tradutir pontualmente para PT-BR mantendo termos tecnicos em ingles

NAO traduzir o conteudo tecnico do corpo para baixo (G6 do README). Manter em ingles:

- Nomes de etapas: `DETECT`, `FETCH`, `IMPLEMENT`, `CITE`
- Pattern: `UNVERIFIED:`
- Termos da industria: `source hierarchy`, `deprecation warning`, `migration guide`

Traduzir APENAS:

- Descricoes introdutorias longas se ajudar leitura PT-BR
- Decisao: se a maioria dos exemplos for em ingles e funcionar, MANTER ingles. Modificacao minima e melhor que traducao agressiva.

**Decisao recomendada:** preservar 100% do corpo em ingles (como `code-simplification` que tambem manteve corpo majoritario em ingles). Description PT-BR ja cumpre orientacao do leitor brasileiro. Documentar essa decisao em MEMORY como DI se for adotada.

### Passo 6: Garantir reference real citada no corpo (CH-03 do PRD — G9 do README)

Editar a secao "Step 2: Fetch Official Documentation" para adicionar bloco antes da hierarquia:

```markdown
**Local references first (when applicable):**

Before fetching external sources, check `docs/references/` for canonical local references already curated by the team. Exemplos disponiveis no Anti-Vibe Coding:

- `docs/references/testing-patterns.md` — patterns canonicos de testing (AAA, Test Sizes)
- `docs/references/security-checklist.md` — OWASP Top 10 + threat modeling baseline
- `docs/references/accessibility-checklist.md` — WCAG 2.0 essentials

Local references **complement** external docs — they NEVER replace fetching the framework's official documentation, but they DO reduce redundant fetches for stable, well-curated team patterns.
```

**Por que isso cumpre CH-03:** o PRD exige "skill `source-driven-development` cita pelo menos 1 reference em `docs/references/`". Citamos 3 — ja existem (Wave 1 mergeada ou nao, o diretorio foi confirmado presente). Sem TODO, sem placeholder.

### Passo 7: Injetar bloco de telemetria passiva no FINAL (logo antes do EOF)

Padrao `code-simplification` (linhas finais do arquivo):

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin — fim da skill
import { writeTelemetryEnd } from "../../lib/telemetry-utils";
writeTelemetryEnd("source-driven-development");
```

Localizacao: ULTIMO bloco do arquivo, apos a secao `## Verification`.

---

## Gotchas

- **G1 do plano (copy-then-improve):** comecar com `cp` literal. Editar APENAS frontmatter, adicionar blocos de telemetria, adicionar secao "Differs from / Compose with", adicionar bloco "Local references first" no Step 2. NAO mexer no conteudo das outras secoes.
- **G2 do plano (cross-refs):** Passo 4 cumpre — cita 3 skills/diretorios concretos com diferenciacao clara.
- **G3 do plano (telemetria):** Passos 3 + 7 usam padrao `code-simplification`. NAO copiar o padrao complexo de `plan-feature`.
- **G6 do plano (PT-BR):** description em PT-BR, corpo majoritariamente preservado em ingles (decisao senior: traducao agressiva destroi precisao tecnica).
- **G9 do plano (reference real):** Passo 6 cita 3 references reais existentes em `docs/references/`. Se por algum motivo o diretorio nao tiver os arquivos no momento da execucao, RE-VERIFICAR e adaptar — mas o estado atual confirmou: testing-patterns.md + security-checklist.md + accessibility-checklist.md existem.
- **Local — frontmatter sintaxe:** `description` em uma unica linha (sem quebra) ou usando aspas duplas para permitir caracteres especiais. Ver `code-simplification/SKILL.md:3` como modelo.
- **Local — `allowed-tools` ordem:** segue convencao do plugin (`Read, Grep, Glob, WebFetch`) — alfabetica nao e obrigatoria, mas WebFetch e o tool "extra" alem do trio padrao.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** `skills/source-driven-development/SKILL.md` nao existe antes do Passo 1
  - Comando: `test ! -f skills/source-driven-development/SKILL.md && echo "RED: skill ausente"`
  - Resultado esperado: imprime `RED: skill ausente`
- [ ] **GREEN apos Passo 7:** harness:validate verde para a skill
  - Comando: `bun run harness:validate 2>&1 | grep -E "source-driven|FAIL|ERROR"`
  - Resultado esperado: nenhuma linha com `FAIL` ou `ERROR` para a skill

### Checklist

- [ ] Diretorio criado: `test -d skills/source-driven-development`
- [ ] Arquivo criado: `test -f skills/source-driven-development/SKILL.md`
- [ ] Frontmatter `name` presente: `grep -E "^name: source-driven-development" skills/source-driven-development/SKILL.md`
- [ ] Frontmatter `user-invocable: true`: `grep -E "^user-invocable: true" skills/source-driven-development/SKILL.md`
- [ ] Frontmatter `allowed-tools` inclui WebFetch: `grep -E "^allowed-tools:.*WebFetch" skills/source-driven-development/SKILL.md`
- [ ] Telemetria topo presente: `grep -F 'writeTelemetryStart("source-driven-development")' skills/source-driven-development/SKILL.md`
- [ ] Telemetria fim presente: `grep -F 'writeTelemetryEnd("source-driven-development")' skills/source-driven-development/SKILL.md`
- [ ] Secao "Differs from / Compose with" presente: `grep -F "## Differs from / Compose with" skills/source-driven-development/SKILL.md`
- [ ] Pelo menos 1 reference real citada (CH-03): `grep -E "docs/references/(testing-patterns|security-checklist|accessibility-checklist)\.md" skills/source-driven-development/SKILL.md`
- [ ] Pattern UNVERIFIED preservado: `grep -F "UNVERIFIED:" skills/source-driven-development/SKILL.md`
- [ ] Secoes obrigatorias presentes: `grep -E "^## (Overview|When to Use|Common Rationalizations|Red Flags|Verification)$" skills/source-driven-development/SKILL.md | wc -l` retorna >= 5
- [ ] Harness validate verde: `bun run harness:validate`
- [ ] Tests verdes: `bun run test`
- [ ] Lint verde: `bun run lint`

---

## Criterio de Aceite

**Por maquina (CA-05 do PRD):**

```bash
# Comando unificado que valida tudo desta fase:
test -f skills/source-driven-development/SKILL.md \
  && grep -q "^name: source-driven-development" skills/source-driven-development/SKILL.md \
  && grep -q "^user-invocable: true" skills/source-driven-development/SKILL.md \
  && grep -q "writeTelemetryStart" skills/source-driven-development/SKILL.md \
  && grep -q "writeTelemetryEnd" skills/source-driven-development/SKILL.md \
  && grep -q "## Differs from / Compose with" skills/source-driven-development/SKILL.md \
  && grep -qE "docs/references/(testing-patterns|security-checklist|accessibility-checklist)\.md" skills/source-driven-development/SKILL.md \
  && bun run harness:validate
```

Retorno esperado: exit code 0 + `bun run harness:validate` sem `FAIL`/`ERROR` relativos a `source-driven-development`.

**Por humano:**
- Diff entre arquivo fonte e arquivo destino mostra APENAS: frontmatter substituido, 2 blocos TS adicionados, 1 secao "Differs from / Compose with" adicionada, 1 bloco "Local references first" adicionado. Corpo tecnico intacto.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
