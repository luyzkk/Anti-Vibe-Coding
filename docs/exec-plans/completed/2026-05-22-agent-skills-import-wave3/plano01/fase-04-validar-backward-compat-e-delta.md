# Fase 04: Validar Backward-Compat (CA-10) e Delta Absorvido (CA-02)

**Plano:** 01 — Consolidacao /anti-vibe-review -> /verify-work
**Sizing:** 0.5h
**Depende de:** fase-03 (estado final de ambos os arquivos + manifest regenerado)
**Visual:** false

---

## O que esta fase entrega

Relatorio `validation-report.md` confirmando: (1) `/anti-vibe-review` continua executando fluxo completo durante grace period (CA-10 backward-compat); (2) `verify-work/SKILL.md` contem todo conteudo nao-duplicado conforme Bucket A do gap-analysis (CA-02). Fecha o Plano 01 com checklist auditavel para Exit Criteria do PLAN overview.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano01/validation-report.md` | Create | Relatorio de validacao dos 2 criterios cobertos pelo plano |

**Nao toca:** nenhum arquivo de skill, agente ou config. Esta fase e validacao pura — testes de aceite + documentacao do estado final.

---

## Implementacao

### Passo 1: Validar CA-10 (anti-vibe-review continua funcional)

**Estrategia:** ler `anti-vibe-review/SKILL.md` apos edicao do fase-02 e confirmar que TODOS os elementos pre-existentes estao intactos (apenas o notice foi adicionado).

Checks via grep batch:

```bash
# Frontmatter (linhas 4-13) intacto
grep -c "^name: anti-vibe-review$" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^user-invocable: true$" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^allowed-tools: Read, Grep, Glob, Agent, Bash$" skills/anti-vibe-review/SKILL.md  # esperado: 1

# Secoes pre-existentes presentes
grep -c "^## Modos de Invocacao$" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^## Resolucao de Modelo via Model Profiles$" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^## Relatorio Anti-Vibe Review$" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^## Estrategia de Revisao Eficiente" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^## Delegacao Opcional a Auditores" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "^## Modulo a revisar$" skills/anti-vibe-review/SKILL.md  # esperado: 1

# Tags XML pre-existentes intactas
grep -c "<instructions>" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "<checklist>" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "<report-template>" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "<context>" skills/anti-vibe-review/SKILL.md  # esperado: 1

# Notice presente (fase-02)
grep -c "^## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md  # esperado: 1
```

Se qualquer count divergir do esperado: REGRESSAO detectada — investigar e corrigir antes de fechar a fase.

### Passo 2: Validar CA-02 (delta absorvido em verify-work)

Checks via grep batch (baseados em Bucket A do gap-analysis):

```bash
# Marcadores de proveniencia
grep -c "Consolidado de anti-vibe-review" skills/verify-work/SKILL.md  # esperado: ≥3

# Conceitos absorvidos
grep -c "Staged/Unstaged" skills/verify-work/SKILL.md  # esperado: ≥1
grep -c "nomes grepáveis" skills/verify-work/SKILL.md  # esperado: ≥1
grep -c "Deep Modules\|deep-modules" skills/verify-work/SKILL.md  # esperado: ≥1

# Telemetria preservada (G4)
grep -c "writeTelemetryStart" skills/verify-work/SKILL.md  # esperado: 1
grep -c "writeTelemetryEnd" skills/verify-work/SKILL.md  # esperado: 1

# Steps estruturais intactos
grep -c "^## Step 1 — Rodar Testes e Lint$" skills/verify-work/SKILL.md  # esperado: 1
grep -c "^## Step 2 — Audit Pipeline$" skills/verify-work/SKILL.md  # esperado: 1
grep -c "^## Step 3 — Compilar Relatorio$" skills/verify-work/SKILL.md  # esperado: 1
grep -c "^## Step 4 — Apresentar ao Dev e Decidir$" skills/verify-work/SKILL.md  # esperado: 1
grep -c "^## Step 5 — Learn Point$" skills/verify-work/SKILL.md  # esperado: 1
```

### Passo 3: Validar harness verde

```bash
bun run harness:validate
bun run test
bun run lint
```

Todos devem retornar exit code 0. Capturar output completo para anexar ao relatorio.

### Passo 4: Teste funcional opt-in de `/anti-vibe-review` (CA-10)

**Recomendado, nao bloqueante:** invocar `/anti-vibe-coding:anti-vibe-review` em modulo pequeno e confirmar que:
- Skill carrega sem erro
- Notice aparece no inicio da resposta da skill (ou no proprio SKILL.md exibido)
- Fluxo de checklist roda normalmente apos o notice
- Relatorio final segue formato `<report-template>` esperado

Este teste e manual e qualitativo — se o tempo apertar, pode ser registrado em MEMORY como "validacao funcional pendente para post-merge".

### Passo 5: Gerar `validation-report.md`

Estrutura:

```markdown
# Validation Report — Plano 01 Wave 3

**Data:** {YYYY-MM-DD}
**Plano:** 01 — Consolidacao /anti-vibe-review -> /verify-work
**CAs cobertos:** CA-01, CA-02, CA-10 do PRD Wave 3

## Resultados

### CA-01 (Deprecation notice — coberto em fase-02)

| Check | Esperado | Atual | Status |
|-------|----------|-------|--------|
| `grep -c "^## ⚠️ Deprecation Notice" anti-vibe-review/SKILL.md` | 1 | {atual} | ✅/❌ |
| `grep -A 10 "## ⚠️ Deprecation Notice" anti-vibe-review/SKILL.md | grep -c "verify-work"` | ≥1 | {atual} | ✅/❌ |
| `grep -A 10 "## ⚠️ Deprecation Notice" anti-vibe-review/SKILL.md | grep -c "grace period"` | ≥1 | {atual} | ✅/❌ |

### CA-02 (verify-work absorve delta — coberto em fase-03)

| Check | Esperado | Atual | Status |
|-------|----------|-------|--------|
| `grep -c "Consolidado de anti-vibe-review" verify-work/SKILL.md` | ≥3 | {atual} | ✅/❌ |
| `grep -c "Staged/Unstaged" verify-work/SKILL.md` | ≥1 | {atual} | ✅/❌ |
| `grep -c "nomes grepáveis" verify-work/SKILL.md` | ≥1 | {atual} | ✅/❌ |
| `grep -c "Deep Modules" verify-work/SKILL.md` | ≥1 | {atual} | ✅/❌ |

### CA-10 (backward-compat — anti-vibe-review funcional)

| Check | Esperado | Atual | Status |
|-------|----------|-------|--------|
| Frontmatter intacto (3 campos checados) | 3/3 | {atual} | ✅/❌ |
| 6 secoes pre-existentes presentes | 6/6 | {atual} | ✅/❌ |
| 4 tags XML pre-existentes presentes | 4/4 | {atual} | ✅/❌ |
| Notice adicionado (fase-02) | 1 | {atual} | ✅/❌ |
| Teste funcional opt-in da skill | pass | {pass/skip/fail} | ✅/⚠/❌ |

### Harness e Lint

| Comando | Exit code esperado | Atual | Status |
|---------|--------------------|-------|--------|
| `bun run harness:validate` | 0 | {atual} | ✅/❌ |
| `bun run test` | 0 | {atual} | ✅/❌ |
| `bun run lint` | 0 | {atual} | ✅/❌ |

## Veredicto

{PASS / FAIL — descreve o que falhou se aplicavel}

## Observacoes

{Qualquer divergencia, desvio ou registro relevante para o MEMORY do plano ou para Plano 04}
```

Preencher cada coluna `{atual}` com o resultado real dos greps/comandos.

---

## Gotchas

- **Local — encoding em greps com `⚠️`:** o caractere de aviso e UTF-8 multi-byte. Em terminais com locale C ou ASCII, o grep pode nao matar. Confirmar `LANG=en_US.UTF-8` ou usar grep com regex menos especifica como fallback: `grep -c "Deprecation Notice (Wave 3"`.
- **Local — teste funcional opt-in:** Se nao for executavel automaticamente (skill requer dev humano para invocar), aceitar como "validacao manual pendente" e documentar em MEMORY. NAO bloquear a fase por isso — CA-10 e validado primariamente pelos greps estruturais.
- **Local — fase-04 e fechamento do plano:** Se todos os checks passam, atualizar STATE.md do PRD pai mudando `Plano 01: planejado` para `Plano 01: completo`. Comando: editar `../STATE.md` (path relativo a partir de plano01/).

---

## Verificacao

### Checklist

- [ ] `validation-report.md` existe em `plano01/`
- [ ] Todos os checks CA-01 marcados ✅
- [ ] Todos os checks CA-02 marcados ✅
- [ ] Todos os checks CA-10 marcados ✅ (ou ⚠ apenas para "teste funcional opt-in" se nao executavel)
- [ ] `bun run harness:validate` exit 0
- [ ] `bun run test` exit 0
- [ ] `bun run lint` exit 0
- [ ] Veredicto = PASS
- [ ] `../STATE.md` atualizado: Plano 01 status -> `completo`

---

## Criterio de Aceite

**CA-10 do PRD:** "Dado skill `/anti-vibe-review` durante grace period, quando invocada, entao executa fluxo completo normalmente (nao apenas exibe deprecation notice) — backward compatibility total."

**Por maquina:**
- `validation-report.md` existe e tem secao "Veredicto: PASS"
- Todos os greps estruturais (frontmatter, secoes, tags XML) retornam contagens esperadas
- Exit codes 0 em harness:validate, test, lint

**Por humano:**
- Validacao funcional opt-in: invocar `/anti-vibe-coding:anti-vibe-review` em modulo pequeno e confirmar que skill executa do inicio ao fim sem erro, com relatorio final completo.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
