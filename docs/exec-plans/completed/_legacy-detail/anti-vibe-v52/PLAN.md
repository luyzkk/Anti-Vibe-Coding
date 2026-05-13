# Plan: Anti-Vibe Coding v5.2 — Princípios Akita

**PRD:** ./PRD.md
**Planos:** 6 planos, 16 fases total
**Created:** 2026-04-21

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Infraestrutura — Hooks Novos | 2 | ~2h | — |
| 02 | Política Core — Rules + CLAUDE.md | 3 | ~2.5h | — |
| 03 | Skills Standalone Pós-Deploy | 4 | ~4h | Plano 02 |
| 04 | Skill /iterate + Pipeline Integration | 3 | ~3h | Plano 03 |
| 05 | /init e /update — Template Akita | 2 | ~2.5h | Plano 02 |
| 06 | Auditores, Advisor e Multi-lang | 3 | ~3h | Plano 02, 03, 04 |

---

## Grafo de Dependencias

```
Plano 01 (Hooks)         Plano 02 (Política)
                               |
              +----------------+-------------------+
              |                |                   |
              v                v                   v
         Plano 03         Plano 05            Plano 06
       (Skills Solo)    (/init+/update)     (Auditores+)
              |
              v
         Plano 04
       (/iterate+pipeline)
              |
              v
         Plano 06
       (Auditores+)
```

**Paralelismo possível:**
- Plano 01 e Plano 02 podem rodar em paralelo (independentes)
- Plano 03 e Plano 05 podem rodar em paralelo (ambos dependem só do Plano 02)
- Plano 06 só após Plano 02, 03 e 04 concluídos

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-file-size-guard-hook
**Descrição:** Criar `file-size-guard.cjs` em `anti-vibe-coding/hooks/` + adicionar entry no `hooks.json` (PostToolUse Write|Edit). Verificável imediatamente: editar arquivo >500 linhas e confirmar warning no formato `[FILE-SIZE] arquivo.ts (523 linhas) excede limite de 500.`

---

## Resumo por Plano

### Plano 01: Infraestrutura — Hooks Novos
> Cria os 2 hooks novos do v5.2 integrados ao hooks.json. Beneficia todas as fases seguintes ao estabelecer infraestrutura de guardrails automáticos durante edição.

Fases:
- fase-01-file-size-guard-hook: criar hook PostToolUse que detecta arquivo >500L ou função >40L
- fase-02-grepping-names-hook: criar hook PreToolUse Bash (git commit) que detecta nomes genéricos com >10 hits

### Plano 02: Política Core — Rules + CLAUDE.md
> Resolve o conflito de política de comentários (D3) e hardcoda os thresholds de cobertura (D7). Fundação semântica para todas as skills e regras seguintes.

Fases:
- fase-01-politica-comentarios-rules: update `rules/code-quality.md` — WHY/WHAT comments + limites 500L/40L
- fase-02-thresholds-tdd: update `rules/testing-standards.md` — thresholds ≥95%/≥80%/≥70% + ratio 1.2x–1.5x
- fase-03-claude-md-global: update `C:\Users\luizf\.claude\CLAUDE.md` — política comentários D3

### Plano 03: Skills Standalone Pós-Deploy
> Cria 4 skills standalone focadas na vida pós-produção e dinâmica humano-agente. Cada skill funciona isolada e alimenta o /iterate (Plano 04).

Fases:
- fase-01-incident-response-skill: skill `/anti-vibe-coding:incident-response` (raw logs → regression test → fix)
- fase-02-defensive-patterns-skill: skill `/anti-vibe-coding:defensive-patterns` (categorias defensive code)
- fase-03-centralize-config-skill: skill `/anti-vibe-coding:centralize-config` (padrão de centralização)
- fase-04-pair-programming-skill: skill `/anti-vibe-coding:pair-programming-with-agent` (dinâmica humano navega/agente pilota)

### Plano 04: Skill /iterate + Pipeline Integration
> Cria a skill /iterate (pós-deploy completo) e integra regression-fix + hardening como sugestões no verify-work. Fecha o ciclo "software nunca está pronto".

Fases:
- fase-01-iterate-skill: skill `/anti-vibe-coding:iterate` (incident response + regression fix + hardening)
- fase-02-verify-work-integration: update `verify-work/SKILL.md` — sugestões de regression-fix + hardening pós-verify
- fase-03-plugin-manifest-update: atualizar `plugin-manifest.json` + CLAUDE.md do plugin com skills novas

### Plano 05: /init e /update — Template Akita
> Integra template CLAUDE.md de Akita ao /init (novos projetos) e implementa mecanismo de upgrade gerenciado com diff + confirmação por seção no /update.

Fases:
- fase-01-init-template-akita: update `skills/init/SKILL.md` — merge sections Akita (code style, comments, tests, deps, logging)
- fase-02-update-gerenciado: update `skills/update/SKILL.md` — diff por seção + confirmação antes de aplicar

### Plano 06: Auditores, Advisor e Multi-lang
> Finaliza com auditoria de nomes grepáveis no anti-vibe-review, tabela "faz bem/mal" no advisor hook, e exemplos multi-linguagem nas rules.

Fases:
- fase-01-anti-vibe-review-grepping: update `skills/anti-vibe-review/SKILL.md` — novo checklist item: nomes grepáveis
- fase-02-advisor-hook-tabela: update `hooks/hooks.json` advisor (SessionStart) — integrar tabela Akita faz bem/mal
- fase-03-multi-lang-rules: update `rules/*.md` — adicionar exemplos Python + Ruby onde só há TS/JS

---

## Risks

- **hooks.json tem comando bash inline complexo** — novos hooks devem seguir padrão .cjs externo (como context-monitor.cjs, tdd-gate.cjs). Não colocar lógica inline.
  - Mitigação: Plano 01 cria hooks como arquivos .cjs separados, entry no hooks.json invoca via node.
- **CLAUDE.md global está fora do repo do plugin** — modificar `C:\Users\luizf\.claude\CLAUDE.md` requer atenção especial no Plano 02 fase-03.
  - Mitigação: Ler arquivo antes de editar; editar apenas a seção de comentários sem tocar outras seções.
- **Skills novas precisam de frontmatter no plugin-manifest.json** — não há auto-registro.
  - Mitigação: Plano 04 fase-03 dedicada a atualizar manifesto + CLAUDE.md do plugin.
- **grepping-names threshold de 10 hits pode dar falso positivo em codebases pequenos** — warning não-blocking mitiga, mas calibração pode ser necessária.
  - Mitigação: Documentar threshold como heurístico; dev pode ignorar warning.
- **anti-vibe-coding/ é repositório git independente** — commits devem ser feitos dentro do diretório anti-vibe-coding/ (descoberto em GT-1 da refatoracao-prd-folders).
  - Mitigação: Subagentes devem fazer git add/commit dentro de anti-vibe-coding/.

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D3: WHY comments sim, WHAT não, não podar comentários do agente | Plano 02, fases 01 e 03 |
| D6: file-size-guard warning não-blocking (>500L arquivo, >40L função) | Plano 01, fase-01 |
| D7: thresholds 95%/80%/70% hardcoded em testing-standards.md | Plano 02, fase-02 |
| D4: /iterate como skill standalone (não estender execute-plan) | Plano 04, fase-01 |
| D5: regression-fix + hardening integrados ao pipeline via verify-work | Plano 04, fase-02 |
| D8: pair-programming-with-agent como skill tutorial dedicada | Plano 03, fase-04 |
| D9: /init merge template Akita (code style, comments, tests, deps, logging) | Plano 05, fase-01 |
| D10: /update com diff + confirmação por seção (breaking gerenciado) | Plano 05, fase-02 |
| D12: tabela "faz bem/mal" integrada ao advisor hook | Plano 06, fase-02 |
| D13: nomes grepáveis — hook pré-commit + checklist anti-vibe-review | Plano 01 fase-02 + Plano 06 fase-01 |
| D14: multi-linguagem TS/JS + Python + Ruby nos exemplos de rules | Plano 06, fase-03 |
| D11: ordem hooks → política → skills → iterate → init/update → auditores | Planos 01→02→03→04→05→06 |

---

<!-- Gerado por /plan-feature em 2026-04-21 -->
