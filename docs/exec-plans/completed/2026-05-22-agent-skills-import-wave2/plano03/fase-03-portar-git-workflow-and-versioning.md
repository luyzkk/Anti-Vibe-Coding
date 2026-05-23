<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-22 (Luiz/dev): commit-msg hook OPCIONAL — DT-6 do PRD`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 03: Portar git-workflow-and-versioning

**Plano:** 03 — Skills Novas (source-driven, doubt-driven, git-workflow)
**Sizing:** 1h
**Depende de:** Nenhuma (independente das outras fases deste plano)
**Visual:** false

---

## O que esta fase entrega

Skill `git-workflow-and-versioning` portada de `Infos/agent-skills-main/skills/git-workflow-and-versioning/SKILL.md` (300 linhas) para `skills/git-workflow-and-versioning/SKILL.md` com copy-then-improve: frontmatter padrao do plugin, telemetria passiva, cross-refs para CLAUDE.md global (fonte de verdade para Conventional Commits) e para `/iterate` + `/incident-response` (consumidores de commit history limpo), antipadrao `git commit -m "Fix bug"` mantido com exemplo explicito, commit-msg hook documentado como APENDICE OPCIONAL (DT-6 do PRD, NAO bloqueante).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/git-workflow-and-versioning/` | Create | Diretorio da skill (mkdir) |
| `skills/git-workflow-and-versioning/SKILL.md` | Create | Copy literal + frontmatter + telemetria + cross-refs |

---

## Implementacao

### Passo 1: Copy literal do arquivo fonte (G1 do README)

```bash
# 2026-05-22 (Luiz/dev): copy-then-improve — feedback do MEMORY global
mkdir -p skills/git-workflow-and-versioning
cp Infos/agent-skills-main/skills/git-workflow-and-versioning/SKILL.md \
   skills/git-workflow-and-versioning/SKILL.md
```

Verificacao imediata:

```bash
diff Infos/agent-skills-main/skills/git-workflow-and-versioning/SKILL.md \
     skills/git-workflow-and-versioning/SKILL.md
# Esperado: zero diff (copy literal de 300 linhas)
```

### Passo 2: Substituir o frontmatter do fonte pelo frontmatter padrao do plugin

Frontmatter original (linhas 1-4 do fonte) tem `name` + `description` apenas. Substituir por:

```yaml
---
name: git-workflow-and-versioning
description: "Git Workflow e Versioning: codifica conventional commits, atomicidade, commits como save points, branches curtas (1-3 dias), PR description como contrato historico. Complementa CLAUDE.md global (fonte de verdade para tipos `feat`/`fix`/`chore`/etc). Vetado: 'Fix bug' como commit message. Hook commit-msg documentado como OPCIONAL (opt-in, nao bloqueante). Integra com /iterate e /incident-response que dependem de commit history limpo para post-mortem."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[escopo: commit, branch, ou pr]"
---
```

**Por que `allowed-tools` inclui `Bash`:** git workflow envolve invocar `git commit`, `git diff --staged`, `git log`, `git bisect`. Sem `Bash`, a skill so pode ENSINAR sem demonstrar. Bash permite demonstracoes interativas (`git diff --staged` antes do commit, conforme Pre-Commit Hygiene).

**Por que `description` longa:** explicita relacao com CLAUDE.md global (R-09 do PRD — risco de colisao com conventional commits do CLAUDE.md). Explicita DT-6 (hook opcional). Explicita integracao com `/iterate` e `/incident-response`.

### Passo 3: Injetar bloco de telemetria passiva no TOPO

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin
import { writeTelemetryStart } from "../../lib/telemetry-utils";
writeTelemetryStart("git-workflow-and-versioning");
```

Localizacao: imediatamente apos o frontmatter de fechamento (`---`), antes do `# Git Workflow and Versioning`.

### Passo 4: Injetar secao "Differs from / Compose with" + nota sobre CLAUDE.md global

Cumpre G2 do README + R-09 do PRD. Inserir DEPOIS de `# Git Workflow and Versioning` e ANTES de `## Overview`:

```markdown
## Differs from / Compose with

- **CLAUDE.md global (`~/.claude/CLAUDE.md`)** e a **fonte de verdade** para "use conventional commits". Esta skill **complementa** com tecnicas adicionais: atomicidade, save point pattern, branch hygiene, PR description como contrato historico, change summary structure. Se houver conflito, CLAUDE.md global vence.
- **`/iterate`** (pos-deploy): depende de commit history limpo para regression tests e hardening. Commits "Fix bug" tornam `/iterate` cego — esta skill veta esse antipadrao na origem.
- **`/incident-response`**: post-mortem precisa de commit history navegavel (`git log --grep`, `git bisect`). Esta skill garante que cada commit seja recuperavel via mensagem descritiva.
- **`/lessons-learned`**: extrai aprendizado de bugs reais. Quando o bug foi introduzido por commit "update auth.ts", a lesson e essa: commits opacos cegam debugging futuro.
- **`code-simplification`**: refactor commits SEPARADOS de feature commits — esta skill obriga; `code-simplification` aplica refactor. Compoem: refactor em commit dedicado seguindo `refactor:` prefix.
```

### Passo 5: Reforcar antipadrao `git commit -m "Fix bug"` com exemplo expandido

A secao "Red Flags" (linhas 282-289 do fonte) ja menciona `Commit messages like "fix", "update", "misc"`. Adicionar APOS a tabela "Common Rationalizations" (logo antes de Red Flags) um bloco explicito:

```markdown
### Antipattern: "Fix bug" Commit Messages

This is the canonical example of what NOT to write:

```bash
# WRONG — opaque to future debugging
git commit -m "Fix bug"
git commit -m "update"
git commit -m "wip"
git commit -m "misc changes"
```

These messages destroy the value of `git log --grep`, `git bisect`, and any post-mortem analysis. A commit message is documentation written for your future self and your colleagues. Three weeks later, `git log` showing 40 "Fix bug" entries is indistinguishable from no log at all.

```bash
# RIGHT — explains the why
git commit -m "fix: prevent race condition in cache invalidation"
git commit -m "feat: add email validation to registration endpoint"
git commit -m "refactor: extract validation logic to shared utility"
```

This antipattern is veto-level. If you find yourself typing `-m "Fix bug"`, stop and rewrite. Cost of writing a real message: 30 seconds. Cost of debugging an unlabeled commit 6 months later: hours.
```

**Por que reforcar:** PRD menciona explicitamente como antipadrao a vetar. Sem exemplo concreto, vira aviso generico que ignoramos. Bloco com exemplo "wrong vs right" cumpre R-04 (diferenciacao) e R-09 (alinhamento com CLAUDE.md global que tambem cita conventional commits).

### Passo 6: Adicionar APENDICE opcional: commit-msg hook (DT-6 + G8 do README)

Apos a secao `## Verification` (ultima do fonte), adicionar:

```markdown
## Appendix: Optional commit-msg Hook (opt-in)

This hook is **OPTIONAL** and **NOT installed by default**. The plugin does not enforce commit message format — you do, via this skill. Install only if you want machine-level enforcement.

**Why opt-in (not default):**
- Coercion over git workflow generates friction. Education first; automation only if ROI confirms.
- Some teams use mob commits or co-author commits with non-conforming messages legitimately.
- Forcing a format breaks legitimate use cases (squash merges, revert commits with auto-generated messages).

**Install (if you want it):**

```bash
# .git/hooks/commit-msg (chmod +x)
#!/usr/bin/env bash
# Validates conventional commit format: <type>(<scope>): <description>
pattern='^(feat|fix|refactor|test|docs|chore|perf|style|build|ci|revert)(\(.+\))?: .{1,}$'
if ! grep -qE "$pattern" "$1"; then
  echo "ERROR: commit message must follow conventional commits"
  echo "       <type>(<scope>): <description>"
  echo "       types: feat|fix|refactor|test|docs|chore|perf|style|build|ci|revert"
  echo ""
  echo "Your message: $(cat "$1")"
  exit 1
fi
```

**Bypass (when needed):** `git commit --no-verify -m "..."` skips the hook. Use sparingly (auto-generated messages, emergency fixes); document the reason.

**Note:** if your project also has `lint-staged` or `husky`, integrate this hook via `husky` instead of writing to `.git/hooks/` directly — `.git/hooks/` is not version-controlled and lost on clone.
```

**Por que como APENDICE no fim:** opt-in nao deve aparecer no fluxo principal — leitor que so quer aprender o pattern nao precisa atropelar instalacao de hook. Apendice no fim e descobrivel sem ser impositivo.

### Passo 7: Injetar bloco de telemetria passiva no FINAL

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin — fim da skill
import { writeTelemetryEnd } from "../../lib/telemetry-utils";
writeTelemetryEnd("git-workflow-and-versioning");
```

Localizacao: ULTIMO bloco do arquivo, apos o Apendice opcional do Passo 6.

---

## Gotchas

- **G1 do plano (copy-then-improve):** comecar com `cp` literal. Editar APENAS frontmatter, telemetria, cross-refs, antipattern reforco, apendice opcional.
- **G2 do plano (cross-refs):** Passo 4 cumpre — 5 cross-refs concretas com CLAUDE.md global como autoridade.
- **G3 do plano (telemetria):** padrao `code-simplification`.
- **G8 do plano (commit-msg hook opt-in):** Passo 6 cumpre. Hook como APENDICE no fim, marcado OPTIONAL, NAO bloqueante. DT-6 explicito. R-09 mitigado.
- **Local — Conventional Commits sintaxe:** o fonte usa `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`. CLAUDE.md global menciona "use conventional commits" sem listar tipos. Esta skill expande — alinhamento garantido por nao divergir, mas expandir nao colide.
- **Local — Trunk-Based Development:** o fonte recomenda trunk-based (linhas 18-32). Validar que isso e compativel com o workflow do projeto — Anti-Vibe-Coding usa main + feature branches curtas, esta alinhado.
- **Local — Worktrees:** secao "Working with Worktrees" (linhas 148-170) descreve pattern para AI agents paralelos. PRESERVAR — alinha com guideline do CLAUDE.md global sobre sub-agentes Worktree.
- **Local — Pre-Commit Hygiene secao:** usa exemplos `npm test` no fonte. Considerar adaptar para `bun run test` ou deixar agnostic. **Decisao recomendada:** trocar para `bun test` + `bun run lint` + `bun run typecheck` em UM exemplo, mantendo `npm test` como exemplo alternativo. Plugin usa bun (CLAUDE.md global "Sempre use bun em vez de npm"). Documentar como DI se feito.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** `skills/git-workflow-and-versioning/SKILL.md` nao existe antes do Passo 1
  - Comando: `test ! -f skills/git-workflow-and-versioning/SKILL.md && echo "RED: skill ausente"`
- [ ] **GREEN apos Passo 7:** harness:validate verde para a skill
  - Comando: `bun run harness:validate 2>&1 | grep -E "git-workflow|FAIL|ERROR"`
  - Resultado esperado: nenhuma linha com `FAIL` ou `ERROR` para a skill

### Checklist

- [ ] Diretorio criado: `test -d skills/git-workflow-and-versioning`
- [ ] Arquivo criado: `test -f skills/git-workflow-and-versioning/SKILL.md`
- [ ] Frontmatter `name`: `grep -E "^name: git-workflow-and-versioning" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Frontmatter `user-invocable: true`: `grep -E "^user-invocable: true" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Frontmatter `allowed-tools` inclui Bash: `grep -E "^allowed-tools:.*Bash" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Telemetria topo: `grep -F 'writeTelemetryStart("git-workflow-and-versioning")' skills/git-workflow-and-versioning/SKILL.md`
- [ ] Telemetria fim: `grep -F 'writeTelemetryEnd("git-workflow-and-versioning")' skills/git-workflow-and-versioning/SKILL.md`
- [ ] Secao "Differs from / Compose with": `grep -F "## Differs from / Compose with" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Referencia CLAUDE.md global presente: `grep -F "CLAUDE.md global" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Antipattern `Fix bug` reforcado: `grep -F 'git commit -m "Fix bug"' skills/git-workflow-and-versioning/SKILL.md`
- [ ] Apendice commit-msg hook presente: `grep -F "## Appendix: Optional commit-msg Hook" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Apendice marcado como OPCIONAL: `grep -E "OPTIONAL|opt-in|NOT installed by default" skills/git-workflow-and-versioning/SKILL.md`
- [ ] Conventional commit types presentes: `grep -cE "^- \`(feat|fix|refactor|test|docs|chore)\`" skills/git-workflow-and-versioning/SKILL.md` retorna >= 6
- [ ] Secoes obrigatorias: `grep -cE "^## (Overview|When to Use|Common Rationalizations|Red Flags|Verification)$" skills/git-workflow-and-versioning/SKILL.md` retorna >= 5
- [ ] Harness validate verde: `bun run harness:validate`
- [ ] Tests verdes: `bun run test`
- [ ] Lint verde: `bun run lint`

---

## Criterio de Aceite

**Por maquina (CA-07 do PRD):**

```bash
test -f skills/git-workflow-and-versioning/SKILL.md \
  && grep -q "^name: git-workflow-and-versioning" skills/git-workflow-and-versioning/SKILL.md \
  && grep -q "^user-invocable: true" skills/git-workflow-and-versioning/SKILL.md \
  && grep -q "writeTelemetryStart" skills/git-workflow-and-versioning/SKILL.md \
  && grep -q "writeTelemetryEnd" skills/git-workflow-and-versioning/SKILL.md \
  && grep -q "## Differs from / Compose with" skills/git-workflow-and-versioning/SKILL.md \
  && grep -qF "CLAUDE.md global" skills/git-workflow-and-versioning/SKILL.md \
  && grep -qF 'git commit -m "Fix bug"' skills/git-workflow-and-versioning/SKILL.md \
  && grep -qF "## Appendix: Optional commit-msg Hook" skills/git-workflow-and-versioning/SKILL.md \
  && bun run harness:validate
```

Retorno esperado: exit code 0 + harness:validate verde para a skill.

**Por humano:**
- Antipattern "Fix bug" sai vetado com exemplo expandido (wrong vs right).
- Apendice commit-msg hook lido como OPCIONAL/opt-in — nenhuma instalacao automatica disparada.
- Cross-ref para CLAUDE.md global deixa claro quem e fonte de verdade.
- Integracao com `/iterate` e `/incident-response` documentada (commit limpo habilita post-mortem).

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
