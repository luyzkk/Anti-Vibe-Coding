<!--
Esta fase NAO gera codigo de runtime. Provenance comments NAO aplicam.
Artefato unico (AGENTS.md) eh documento de usuario final em ingles (D2).
-->

# Fase 02: Criar `anti-vibe-coding/AGENTS.md` ≤40 linhas em EN

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~1.5h
**Depende de:** fase-01 (audit table + stubs em `docs/`)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/AGENTS.md` em **ingles** (D2), com **≤40 linhas** validadas mecanicamente (CA-27 → 27 limite por validador). Contem: Core Beliefs (1 sentenca), tabela "When to read what" mapeando situacoes a docs especificos, Compound Decision Gate convencional (D17), pointers para `docs/PIPELINE.md`, `docs/MODEL_PROFILES.md`, `docs/AGENTS_LIST.md`, `docs/UPGRADE.md`, `docs/design-docs/core-beliefs.md`. **Sem** copiar prosa filosofica do CLAUDE.md original — apenas referencias condicionais.

Atende **CA-01** (AGENTS.md existe), **CA-39** (modelo para projetos-alvo Camada 4), **CA-38** (parte da distribuicao D29).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/AGENTS.md` | Create | Indice condicional ≤40 linhas em EN |

---

## Implementacao

### Passo 1: Escrever AGENTS.md respeitando o limite

Template de referencia (32 linhas — deixa margem de 8 linhas para customizacao):

```markdown
# Anti-Vibe Coding Plugin — Agent Index

This plugin enforces XP discipline for AI-assisted development. Human navigates, agent pilots.

## Core Beliefs

Plan before code. Test before implement. Capture lessons after merge. Discipline beats speed.

## When to Read What

| Situation | Read |
|---|---|
| Understanding the plugin pipeline (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate) | `docs/PIPELINE.md` |
| Configuring model profiles per agent (quality/balanced/budget) | `docs/MODEL_PROFILES.md` |
| Listing available subagent auditors | `docs/AGENTS_LIST.md` |
| Versioning, manifest checksums, update strategies | `docs/UPGRADE.md` |
| Senior principles (security, quality, architecture defaults) | `docs/design-docs/core-beliefs.md` |
| Past architectural decisions with rationale | `docs/design-docs/ADR-*.md` |
| Lessons captured from real bugs | `docs/compound/*.md` |
| Active execution plans | `docs/exec-plans/active/` |
| Completed plans (historical reference) | `docs/exec-plans/completed/` |
| Plugin architecture (skills/hooks/scripts/lib layout) | `ARCHITECTURE.md` |

## Compound Decision Gate

Before reporting completion: did this work teach the repo something durable?
If yes, run `/anti-vibe-coding:lessons-learned` to capture in `docs/compound/`.
If no, log why no capture was needed in the plan's Lessons Captured section.

## Validation

Run `bun run harness:validate` before any commit that touches `docs/` structure.
Run `bun run compound:check` after adding/editing compound notes.
```

**Contagem:** ~32 linhas incluindo headers e linhas em branco. Margem para customizacao em fase-03/08.

### Passo 2: Validar imediatamente com harness:validate

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Conferir contagem
wc -l AGENTS.md
# Esperado: <= 40

# Rodar validador (depende de Plano 04 ja ter scripts/harness-validate.ts pronto)
bun scripts/harness-validate.ts .
# Esperado: exit 0 OU error apenas sobre arquivos ausentes que fase-03 vai criar
```

Se `wc -l` retornar >40: **encurtar imediatamente**. Estrategias (em ordem):
1. Comprimir 2-3 linhas adjacentes em uma so via concatenacao com virgula
2. Mover linhas da tabela "When to read what" para `docs/PIPELINE.md` como subindex
3. Remover Compound Decision Gate (defer para `docs/COMPOUND_ENGINEERING.md` em fase-03)

Se `harness:validate` reclamar de arquivos ausentes (`docs/ARCHITECTURE.md` etc.), eh esperado — fase-03 cria. Validar com flag `--strict false` se disponivel, ou ignorar erros sobre arquivos que fase-03 vai criar.

### Passo 3: Commit

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add AGENTS.md
git commit -m "feat(plano08-fase02): create AGENTS.md (32 lines, EN, D29 layer 4)"
```

---

## Gotchas

- **G1 do README (R4):** Se fase-02 quebrar (AGENTS.md inválido), `git reset --hard HEAD~1` recupera estado pos-fase-01. CLAUDE.md original sigue intacto (G2 do README).
- **G2 do README (CLAUDE.md live):** AGENTS.md eh CRIADO mas CLAUDE.md continua intacto. Symlink CLAUDE.md → AGENTS.md SO acontece em fase-08 (G3).
- **Local (linhas em branco contam):** `wc -l` conta linhas brancas. Se margem apertada, comprimir.
- **Local (ingles obrigatorio — D2):** AGENTS.md em PT viola D2. Validador NAO checa idioma; revisao humana necessaria. Citacoes/comandos em backticks OK (sao expressoes neutras de linguagem).
- **Local (tabela "When to read what" eh a alma do AGENTS.md):** Esta tabela substitui as 30 linhas de "Skills Disponiveis" + "Agents Disponiveis" do CLAUDE.md original — eh a interface condicional do D29. NAO empobrecer ate caber em 40 linhas; preferir mover Compound Gate para outro doc se necessario.

---

## Verificacao

### Checklist

- [ ] `wc -l anti-vibe-coding/AGENTS.md` retorna numero **≤ 40**
- [ ] `head -3 anti-vibe-coding/AGENTS.md` mostra titulo + 1 linha de intro em ingles
- [ ] `grep -c '^|' anti-vibe-coding/AGENTS.md` retorna ≥ 10 (tabela com 10+ rows)
- [ ] `grep -i 'core beliefs\|compound decision\|validation' anti-vibe-coding/AGENTS.md` retorna 3 matches (3 secoes presentes)
- [ ] `bun scripts/harness-validate.ts anti-vibe-coding/ 2>&1 | grep -i 'agents.md'` NAO retorna erro sobre tamanho
- [ ] AGENTS.md aponta para os 5 stubs criados em fase-01 (verificar `grep -c 'docs/' anti-vibe-coding/AGENTS.md` ≥ 6)

---

## Criterio de Aceite

**Por maquina:**
- `[ "$(wc -l < anti-vibe-coding/AGENTS.md)" -le 40 ]` retorna exit 0 (CA-01 + CA-27 invertido — limite 40)
- `bun scripts/harness-validate.ts anti-vibe-coding/` sobre AGENTS.md retorna **sem erro de tamanho** (pode reclamar de outros arquivos que fase-03 criara)

**Por humano:**
- Tabela "When to read what" cobre as 10 situacoes principais identificadas na auditoria D29
- AGENTS.md eh autocontido — agente que le APENAS isso entende o plugin em 2min de leitura

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
