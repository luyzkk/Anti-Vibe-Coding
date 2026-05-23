<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-22 (Luiz/dev): cross-model OPCIONAL — DT-5 do PRD`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 02: Portar doubt-driven-development

**Plano:** 03 — Skills Novas (source-driven, doubt-driven, git-workflow)
**Sizing:** 1.5h
**Depende de:** Nenhuma (independente das outras fases deste plano)
**Visual:** false

---

## O que esta fase entrega

Skill `doubt-driven-development` portada de `Infos/agent-skills-main/skills/doubt-driven-development/SKILL.md` (243 linhas) para `skills/doubt-driven-development/SKILL.md` com copy-then-improve: frontmatter padrao do plugin, telemetria passiva, cross-refs explicitos para `design-twice` e `verify-work`, sequencia CLAIM->EXTRACT->DOUBT->RECONCILE->STOP preservada integralmente, STOP rule de 3 ciclos preservada, e secao "Cross-model escalation" mantida como documentacao OPCIONAL (DT-5 do PRD — CH-04 cumprido com snippet shell-escape seguro).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/doubt-driven-development/` | Create | Diretorio da skill (mkdir) |
| `skills/doubt-driven-development/SKILL.md` | Create | Copy literal + frontmatter + telemetria + cross-refs |

---

## Implementacao

### Passo 1: Copy literal do arquivo fonte (G1 do README)

```bash
# 2026-05-22 (Luiz/dev): copy-then-improve — feedback do MEMORY global
mkdir -p skills/doubt-driven-development
cp Infos/agent-skills-main/skills/doubt-driven-development/SKILL.md \
   skills/doubt-driven-development/SKILL.md
```

Verificacao imediata:

```bash
diff Infos/agent-skills-main/skills/doubt-driven-development/SKILL.md \
     skills/doubt-driven-development/SKILL.md
# Esperado: zero diff (copy literal de 243 linhas)
```

### Passo 2: Substituir o frontmatter do fonte pelo frontmatter padrao do plugin

Frontmatter original (linhas 1-4 do fonte) tem `name` + `description` apenas. Substituir por:

```yaml
---
name: doubt-driven-development
description: "Doubt-Driven Development: submete cada decisao nao-trivial a uma revisao adversarial fresh-context antes de ela 'ficar de pe'. Use quando correcao importa mais que velocidade, em codigo desconhecido, ou pre-deploy production. Sequencia CLAIM->EXTRACT->DOUBT->RECONCILE->STOP com 3 ciclos maximo. Diferente de design-twice (gera N alternativas), DDD ataca UMA escolha; diferente de verify-work (pos-impl), DDD e in-flight. Cross-model escalation OPCIONAL e documentada — usuario decide invocar."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Task
argument-hint: "[decisao ou artefato a submeter a doubt cycle]"
---
```

**Por que `allowed-tools` inclui `Task`:** Step 3 (DOUBT) requer spawn de fresh-context reviewer via subagente. `Task` (Agent) e o tool canonico. Sem ele, a skill nao executa seu mecanismo central.

**Por que `description` longa:** doubt-driven tem mecanica nao-obvia. Description que apenas diz "submits decisions to review" e generica e nao diferencia de `/review` ou `/verify-work`. Mencao explicita das diferencas cumpre G2 do README.

### Passo 3: Injetar bloco de telemetria passiva no TOPO

Padrao `code-simplification` (G3 do README):

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin
import { writeTelemetryStart } from "../../lib/telemetry-utils";
writeTelemetryStart("doubt-driven-development");
```

Localizacao: imediatamente apos o frontmatter de fechamento (`---`), antes do `# Doubt-Driven Development`.

### Passo 4: Injetar secao "Differs from / Compose with" logo apos o titulo H1

Cumpre G2 do README (R-04 do PRD). Inserir DEPOIS de `# Doubt-Driven Development` e ANTES de `## Overview`:

```markdown
## Differs from / Compose with

- **`/design-twice`**: gera **N** alternativas arquiteturais paralelas; DDD ataca **UMA** escolha em profundidade. Compoem: `/design-twice` propoe alternativas; DDD submete a vencedora a um doubt cycle antes de implementar.
- **`/verify-work`**: pos-implementacao, audita o que ja foi feito; DDD e **in-flight**, antes de comprometer. Compoem: DDD durante decisoes; `/verify-work` apos PR pronto. DDD reduz o numero de issues que `/verify-work` precisa pegar tarde.
- **`/consultant`**: ensina trade-offs uma vez; DDD ataca a escolha resultante para checar se ela sobrevive a fresh-context. Compoem: `/consultant` da o mapa; DDD testa se a rota escolhida tem buraco.
- **`source-driven-development`**: SDD verifica fatos sobre frameworks contra docs; DDD verifica raciocinio sobre o artefato. SDD checa que API existe; DDD checa que voce a usou corretamente sob o contract.
- **Subagentes em `agents/`**: o Step 3 (DOUBT) usa um subagente fresh-context. Personas em `agents/` (code-reviewer, security-auditor) sao candidatas naturais — invocar com o prompt adversarial verbatim para override do shape padrao da persona.
```

### Passo 5: Preservar a sequencia CLAIM->EXTRACT->DOUBT->RECONCILE->STOP integralmente

O corpo do arquivo fonte (linhas 50-191) descreve a sequencia em 5 passos. NAO alterar texto, NAO reordenar, NAO encurtar. Esta sequencia e o mecanismo central da skill — qualquer alteracao destroi o valor.

**Validacao explicita apos paste:**

```bash
grep -E "^### Step [1-5]:" skills/doubt-driven-development/SKILL.md | wc -l
# Esperado: 5 (CLAIM, EXTRACT, DOUBT, RECONCILE, STOP)
```

### Passo 6: Validar secao "Cross-model escalation" preservada com shell-escape seguro (CH-04 + DT-5)

A secao "Cross-model escalation" do fonte (linhas 112-166) ja documenta:

- Como pedir autorizacao ao usuario antes de invocar
- Como verificar binario com `which` + `--version`
- Snippet shell-escape SEGURO usando `heredoc`/`stdin` ao inves de `-p "..."` (linhas 138-149)
- Sandbox read-only para `codex exec`

Validacao explicita:

```bash
# CH-04: cross-model documentado com snippet shell-escape seguro
grep -F "codex exec --sandbox read-only" skills/doubt-driven-development/SKILL.md
grep -F "gemini --approval-mode plan" skills/doubt-driven-development/SKILL.md
grep -F "< /tmp/doubt-prompt.md" skills/doubt-driven-development/SKILL.md
# Esperado: cada grep retorna a linha (1 hit cada)
```

**DT-5 reforco:** se durante o copy aparecer tentacao de simplificar a secao (remover sandbox, remover stdin), NAO simplificar. O snippet shell-escape com stdin/heredoc e a defesa contra prompt injection — load-bearing.

**Decisao explicita:** NAO implementar wrapper shell para Gemini/Codex. NAO criar comando `/doubt-driven` que invoca CLI externo. A skill apenas DOCUMENTA o pattern; usuario com CLI configurado segue manualmente.

### Passo 7: Validar STOP rule de 3 ciclos preservada

```bash
grep -E "3 cycles? completed|3 unresolved cycles|3 cycles is" skills/doubt-driven-development/SKILL.md
# Esperado: pelo menos 1 hit (STOP rule presente)
```

A regra de bounded loop e crucial — sem ela, doubt vira recursao infinita. NAO afrouxar.

### Passo 8: Injetar bloco de telemetria passiva no FINAL

```typescript
// 2026-05-22 (Luiz/dev): telemetria passiva padrao plugin — fim da skill
import { writeTelemetryEnd } from "../../lib/telemetry-utils";
writeTelemetryEnd("doubt-driven-development");
```

Localizacao: ULTIMO bloco do arquivo, apos a secao `## Verification`.

---

## Gotchas

- **G1 do plano (copy-then-improve):** comecar com `cp` literal. Editar APENAS frontmatter, telemetria, cross-refs.
- **G2 do plano (cross-refs):** Passo 4 cumpre — 5 cross-refs concretas com diferenciacao clara.
- **G3 do plano (telemetria):** padrao `code-simplification`.
- **G7 do plano (cross-model NAO implementar):** Passo 6 reforca. DT-5 explicito. Secao preservada como DOCS.
- **Local — Loading Constraints preservada:** linhas 42-47 do fonte descrevem que esta skill NAO deve ser adicionada a `skills:` frontmatter de personas. CRUCIAL preservar — viola orchestration-patterns se removida.
- **Local — adversarial prompt verbatim:** Step 3 (linhas 86-104 do fonte) tem um prompt adversarial em bloco markdown. NAO alterar o texto do prompt — ele e o load-bearing artifact da skill.
- **Local — "Doubt theater (checkable signal)" preservar:** Red Flags inclui um sinal checavel (linhas 215). NAO remover — e a defesa contra a skill virar ritual.
- **Local — interaction com TDD:** "Interaction with Other Skills" (linha 226) menciona que TDD's RED step satisfaz doubt para behavioral claims. PRESERVAR — e a forma honesta de evitar over-doubt em codigo testavel.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** `skills/doubt-driven-development/SKILL.md` nao existe antes do Passo 1
  - Comando: `test ! -f skills/doubt-driven-development/SKILL.md && echo "RED: skill ausente"`
- [ ] **GREEN apos Passo 8:** harness:validate verde para a skill
  - Comando: `bun run harness:validate 2>&1 | grep -E "doubt-driven|FAIL|ERROR"`
  - Resultado esperado: nenhuma linha com `FAIL` ou `ERROR` para a skill

### Checklist

- [ ] Diretorio criado: `test -d skills/doubt-driven-development`
- [ ] Arquivo criado: `test -f skills/doubt-driven-development/SKILL.md`
- [ ] Frontmatter `name` presente: `grep -E "^name: doubt-driven-development" skills/doubt-driven-development/SKILL.md`
- [ ] Frontmatter `user-invocable: true`: `grep -E "^user-invocable: true" skills/doubt-driven-development/SKILL.md`
- [ ] Frontmatter `allowed-tools` inclui Task: `grep -E "^allowed-tools:.*Task" skills/doubt-driven-development/SKILL.md`
- [ ] Telemetria topo: `grep -F 'writeTelemetryStart("doubt-driven-development")' skills/doubt-driven-development/SKILL.md`
- [ ] Telemetria fim: `grep -F 'writeTelemetryEnd("doubt-driven-development")' skills/doubt-driven-development/SKILL.md`
- [ ] Secao "Differs from / Compose with": `grep -F "## Differs from / Compose with" skills/doubt-driven-development/SKILL.md`
- [ ] Sequencia 5 passos preservada: `grep -cE "^### Step [1-5]:" skills/doubt-driven-development/SKILL.md` retorna 5
- [ ] STOP rule 3 ciclos preservada: `grep -E "3 cycles? completed|3 unresolved cycles|3 cycles is" skills/doubt-driven-development/SKILL.md`
- [ ] Cross-model shell-escape seguro: `grep -F "< /tmp/doubt-prompt.md" skills/doubt-driven-development/SKILL.md`
- [ ] Sandbox read-only mencionado: `grep -F "codex exec --sandbox read-only" skills/doubt-driven-development/SKILL.md`
- [ ] Loading Constraints preservada: `grep -F "Do NOT add this skill to a persona" skills/doubt-driven-development/SKILL.md`
- [ ] Secoes obrigatorias: `grep -cE "^## (Overview|When to Use|Common Rationalizations|Red Flags|Verification)$" skills/doubt-driven-development/SKILL.md` retorna >= 5
- [ ] Harness validate verde: `bun run harness:validate`
- [ ] Tests verdes: `bun run test`
- [ ] Lint verde: `bun run lint`

---

## Criterio de Aceite

**Por maquina (CA-06 + CH-04 do PRD):**

```bash
test -f skills/doubt-driven-development/SKILL.md \
  && grep -q "^name: doubt-driven-development" skills/doubt-driven-development/SKILL.md \
  && grep -q "^user-invocable: true" skills/doubt-driven-development/SKILL.md \
  && grep -q "writeTelemetryStart" skills/doubt-driven-development/SKILL.md \
  && grep -q "writeTelemetryEnd" skills/doubt-driven-development/SKILL.md \
  && grep -q "## Differs from / Compose with" skills/doubt-driven-development/SKILL.md \
  && [ "$(grep -cE '^### Step [1-5]:' skills/doubt-driven-development/SKILL.md)" = "5" ] \
  && grep -q "< /tmp/doubt-prompt.md" skills/doubt-driven-development/SKILL.md \
  && grep -q "codex exec --sandbox read-only" skills/doubt-driven-development/SKILL.md \
  && bun run harness:validate
```

Retorno esperado: exit code 0 + harness:validate verde para a skill.

**Por humano:**
- Sequencia CLAIM->EXTRACT->DOUBT->RECONCILE->STOP lida ponta a ponta sem perda de fidelidade vs o fonte.
- Cross-model escalation documentada como OPCIONAL — nenhuma tentativa de invocacao automatica.
- Loading Constraints + Doubt theater signal + STOP rule de 3 ciclos preservados.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
