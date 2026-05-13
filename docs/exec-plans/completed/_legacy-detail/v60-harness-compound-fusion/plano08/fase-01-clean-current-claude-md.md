<!--
Principio universal #5 — Comment Provenance.
Esta fase NAO gera codigo de runtime. Provenance comments NAO aplicam.
Artefatos sao audit/stub markdowns para o usuario final (Camadas 2/5 da D29).
-->

# Fase 01: Auditoria + Distribuicao D29 do `anti-vibe-coding/CLAUDE.md` atual

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~3h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false (sem UI)

---

## O que esta fase entrega

Auditoria linha-a-linha do `anti-vibe-coding/CLAUDE.md` atual (346 linhas), aplicacao da Distribuicao D29 do PRD (tabela §333-365 — 20 itens mapeados em 5 camadas) e geracao de **stubs vazios** dos arquivos de destino. CLAUDE.md original **permanece intacto** ate fase-08 confirmar validacao verde — esta fase apenas prepara o terreno (audit table + stubs + backup atomico).

Atende **D29** (5-layer distribution) e **D20** (dog-food) — pre-requisito de CA-01, CA-38.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/CLAUDE.md` | Read only | Audit das 346 linhas; NAO modificado nesta fase (G2 — live file) |
| `anti-vibe-coding/.planning.v5-backup/CLAUDE.md.original` | Create | Backup atomico antes de qualquer mutacao futura |
| `anti-vibe-coding/.planning.v5-backup/lessons-learned.md.original` | Create | Backup paralelo (fase-05 vai mover este) |
| `anti-vibe-coding/.planning.v5-backup/senior-principles.md.original` | Create | Backup paralelo (fase-06 vai mover) |
| `anti-vibe-coding/.planning.v5-backup/decisions.md.original` | Create | Backup paralelo (fase-07 vai mover) |
| `anti-vibe-coding/docs/PIPELINE.md` | Create (stub) | Stub para Camada 2 (D29 item 12 — 50 linhas de Pipeline) |
| `anti-vibe-coding/docs/MODEL_PROFILES.md` | Create (stub) | Stub Camada 2 (D29 item 17 — 25 linhas de Model Profiles) |
| `anti-vibe-coding/docs/AGENTS_LIST.md` | Create (stub) | Stub Camada 2 (D29 item 16 — 15 linhas de Agents Disponiveis) |
| `anti-vibe-coding/docs/UPGRADE.md` | Create (stub) | Stub Camada 2 (D29 item 11 — 30 linhas de Versionamento) |
| `anti-vibe-coding/docs/design-docs/core-beliefs.md` | Create (stub) | Stub Camada 5 (D29 itens 4, 9, 10 — fase-06 sobrescreve com conteudo de senior-principles.md) |
| `anti-vibe-coding/.planning/plano08-audit-D29.md` | Create | Tabela de auditoria executavel (artefato unico desta fase — preserva trail) |
| `.gitignore` do plugin | Modify | Adicionar `.planning.v5-backup/` (backup nao vai pro repo do plugin) |

---

## Implementacao

### Passo 1: Snapshot inicial via git

Antes de qualquer toque no filesystem:

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git status   # verificar arvore limpa OU stashed
git add -A && git commit -m "wip: pre-plano08-snapshot" --allow-empty
git rev-parse HEAD   # anotar SHA para rollback de emergencia
```

Se algo der errado em qualquer fase deste plano: `git reset --hard {SHA}`.

### Passo 2: Backup atomico dos arquivos legacy

Criar `.planning.v5-backup/` (idempotente — se ja existe, no-op):

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Idempotencia: skip se backup ja existe
if [ ! -d .planning.v5-backup ]; then
  mkdir -p .planning.v5-backup
  cp CLAUDE.md .planning.v5-backup/CLAUDE.md.original
  cp lessons-learned.md .planning.v5-backup/lessons-learned.md.original
  cp senior-principles.md .planning.v5-backup/senior-principles.md.original
  cp decisions.md .planning.v5-backup/decisions.md.original
  echo "Backup criado em .planning.v5-backup/"
else
  echo "Backup ja existe — skipping (idempotente)"
fi

# Adicionar ao .gitignore
grep -q '^\.planning\.v5-backup/' .gitignore 2>/dev/null || echo ".planning.v5-backup/" >> .gitignore
```

### Passo 3: Auditoria executavel das 346 linhas

Gerar `anti-vibe-coding/.planning/plano08-audit-D29.md` com tabela de auditoria. **Conferir item-a-item com o arquivo real** — a tabela do PRD (§333-365) eh um draft, esta fase confirma:

```markdown
# Auditoria D29 — CLAUDE.md plugin (346 linhas → 5 camadas)

| # | Range | Secao atual | Linhas | Camada | Destino | Status |
|---|-------|-------------|--------|--------|---------|--------|
| 1 | L7-L25 | Filosofia Anti-Vibe (XP, Navegador/Piloto, regras invioláveis) | 19 | C2 | `anti-vibe-coding/AGENTS.md` secao "Core Beliefs" | confirmed |
| 2 | L18-L24 | Anti-Sycophancy | 6 | C2+C1 | AGENTS.md + hook curto (user-prompt-gate.cjs ja existe) | confirmed |
| 3 | L29-L33 | Instrucoes Gerais (bun, TS) | 3 | C4 | Project AGENTS.md (template Plano 02) + user-level CLAUDE.md global | confirmed |
| 4 | L37-L72 | Padroes Core (naming, TS, codigo, hash-list) | 36 | C5 | `docs/design-docs/core-beliefs.md` (consolidado com senior-principles.md em fase-06) | confirmed |
| 5 | L76-L90 | Workflow Desenvolvimento (TDD Red/Green) | 14 | C3 | `skills/tdd-workflow/SKILL.md` (ja existe — verificar conteudo equivalente) | needs-check |
| 6 | L94-L104 | Modo Consultor (quando ativar Fase Zero) | 10 | C3+C1 | `skills/consultant/SKILL.md` + hook detecta "como deveria"/"melhor forma" | needs-check |
| 7 | L108-L114 | Modelo de Permissoes (rm -rf, DROP, migrations destrutivas) | 6 | C1 | Hook pre-tool-use bloqueante (NOVO — Plano 05? OU defer v6.1) | DEFER |
| 8 | L118-L121 | Auto-Correcao e Aprendizado (registrar licao) | 4 | C2+C1 | AGENTS.md + hook sugere /lessons-learned (existente: user-prompt-gate.cjs) | confirmed |
| 9 | L125-L132 | Anti-Patterns (Fat Controllers, etc.) | 7 | C5 | `docs/design-docs/core-beliefs.md` | confirmed |
| 10 | L136-L141 | Conhecimento Senior (pointer para senior-principles.md) | 4 | C5 | `docs/design-docs/core-beliefs.md` (absorve senior-principles.md em fase-06) | confirmed |
| 11 | L145-L181 | Versionamento e Atualizacoes (manifest, merge/replace) | 36 | C2 | `anti-vibe-coding/docs/UPGRADE.md` | confirmed |
| 12 | L185-L240 | Pipeline (grill-me → write-prd → ...) | 55 | C2 | `anti-vibe-coding/docs/PIPELINE.md` | confirmed |
| 13 | L223-L243 | Estrutura `.planning/` v2 (tree) | 20 | DEPRECATED+C2 | Removido (substituido por `docs/exec-plans/` doc em AGENTS.md) | confirmed |
| 14 | L246-L253 | IA-TDD niveis (Guiado/Assistido/Direto) | 7 | C3 | `skills/tdd-workflow/SKILL.md` | needs-check |
| 15 | L257-L284 | Skills Disponiveis (tabela) | 28 | C2 | `anti-vibe-coding/docs/AGENTS.md` (versao reduzida) ou `docs/AGENTS_LIST.md` | confirmed |
| 16 | L288-L304 | Agents Disponiveis (tabela) | 16 | C2 | `anti-vibe-coding/docs/AGENTS_LIST.md` | confirmed |
| 17 | L308-L334 | Model Profiles (quality/balanced/budget) | 26 | C2 | `anti-vibe-coding/docs/MODEL_PROFILES.md` | confirmed |
| 18 | L338-L341 | Git Workflow (conventional commits) | 3 | C4+global | Linha em project AGENTS.md + user-level CLAUDE.md global | confirmed |
| 19 | L345-L362 | Licoes Aprendidas (4 licoes inline) | 17 | C5 | 5 arquivos individuais em `docs/compound/` (fase-05) | confirmed |
| 20 | L365-L366 | Decisoes Arquiteturais (pointer) | 2 | C5 | `docs/design-docs/ADR-*.md` (fase-07) | confirmed |

## Totais por camada (linhas absorvidas)
- **Camada 1 (hooks):** ~25 linhas → distribuidas em hooks existentes (skill-advisor, tdd-gate) + NOVOS hooks (defer ou Plano 05)
- **Camada 2 (plugin docs):** ~140 linhas → 4 stubs criados nesta fase + AGENTS.md em fase-02
- **Camada 3 (SKILL.md):** ~31 linhas → ja vivem em skills/ (verificar equivalencia)
- **Camada 4 (project AGENTS.md):** ~6 linhas → handled em template do Plano 02
- **Camada 5 (docs/compound/, docs/design-docs/):** ~63 linhas → fases 05, 06, 07

## Itens com `DEFER` ou `needs-check` (acao posterior)
- Item 7 (Permissoes destrutivas hook): **DEFER v6.1** — escrito como tracker em `TODO.md` da raiz do plugin
- Item 5, 6, 14 (`needs-check`): fase-08 confirma que conteudo equivalente esta em skills/*.SKILL.md

## Validacao mecanica final (fase-08)
- `wc -l anti-vibe-coding/AGENTS.md` ≤ 40
- `test -f anti-vibe-coding/docs/PIPELINE.md` (criado nesta fase como stub, finalizado em fase-03)
- `test -f anti-vibe-coding/docs/MODEL_PROFILES.md`
- `test -f anti-vibe-coding/docs/AGENTS_LIST.md`
- `test -f anti-vibe-coding/docs/UPGRADE.md`
- `test -f anti-vibe-coding/docs/design-docs/core-beliefs.md`
```

### Passo 4: Criar stubs vazios dos arquivos de destino

Criar **arquivos vazios** (so titulo + comentario `<!-- TBD: fase-XX preenche -->`) para que `harness:validate` em fase-02 nao falhe em links quebrados:

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

mkdir -p docs/design-docs

cat > docs/PIPELINE.md <<'EOF'
# Pipeline — Anti-Vibe Coding Plugin v6

> Stub gerado em fase-01 de Plano 08. Conteudo final em fase-03 (`docs/PIPELINE.md` completo com fluxo `grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate` adaptado para paths v6).

<!-- TBD fase-03 -->
EOF

cat > docs/MODEL_PROFILES.md <<'EOF'
# Model Profiles — Plugin Agents

> Stub gerado em fase-01 de Plano 08. Conteudo final em fase-03 (3 perfis: quality/balanced/budget + tabela por agente + como configurar `config/model-profiles.json`).

<!-- TBD fase-03 -->
EOF

cat > docs/AGENTS_LIST.md <<'EOF'
# Agents Disponiveis — Plugin

> Stub gerado em fase-01 de Plano 08. Conteudo final em fase-03 (tabela completa: tdd-verifier, security-auditor, database-analyzer, api-auditor, solid-auditor, code-smell-detector, react-auditor, infrastructure-auditor, plan-executor, plan-verifier, design-explorer, lesson-evaluator, documentation-writer).

<!-- TBD fase-03 -->
EOF

cat > docs/UPGRADE.md <<'EOF'
# Plugin Upgrade Guide — Versionamento e Atualizacoes

> Stub gerado em fase-01 de Plano 08. Conteudo final em fase-03 (manifest com checksums SHA-256, estrategias merge/replace por arquivo, comandos `/init`, `/update`, `/sync`, `.claude/backups/`).

<!-- TBD fase-03 -->
EOF

cat > docs/design-docs/core-beliefs.md <<'EOF'
# Core Beliefs — Anti-Vibe Coding

> Stub gerado em fase-01 de Plano 08. Conteudo final em fase-06 (substituido pelo conteudo de `senior-principles.md` + secoes Padroes Core/Anti-Patterns/Conhecimento Senior do CLAUDE.md atual — itens D29 #4, #9, #10).

<!-- TBD fase-06 -->
EOF
```

### Passo 5: Commit do snapshot da fase

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add .planning.v5-backup/ .gitignore .planning/plano08-audit-D29.md docs/
git commit -m "wip(plano08-fase01): audit D29 + backup + stubs Camadas 2/5"
git rev-parse HEAD   # SHA para rollback granular
```

---

## Gotchas

- **G1 do README (R4 — backup obrigatorio):** Esta fase NAO modifica `CLAUDE.md` ainda. Apenas cria backup. Mudanca real do CLAUDE.md (delete/symlink) acontece SO em fase-08 — quando validador confirma AGENTS.md verde. Trecho critico: live file (G2 do README).
- **G2 do README (CLAUDE.md live):** Mesmo terminada esta fase, a proxima sessao do Claude Code continuara lendo o `CLAUDE.md` original (346 linhas) ate fase-08. Isso eh intencional — preserva contexto durante o trabalho.
- **Local (audit accuracy):** A tabela do PRD §333-365 tem ranges de linha aproximados. Esta fase **verifica** lendo o CLAUDE.md real e ajustando ranges se necessario. Items marcados `confirmed` na audit table devem bater linha-a-linha; items `needs-check` exigem leitura do skill correspondente em fase posterior.
- **Local (stubs nao quebram harness:validate de AGENTS.md):** Stubs tem `# Titulo` + comentario HTML. Validador `harness:validate` (Plano 04) checa `arquivos obrigatorios existem` — nao checa conteudo. Stubs satisfazem requirement.

---

## Verificacao

### Checklist

- [ ] `git rev-parse HEAD` retorna SHA — snapshot pre-plano08 criado
- [ ] `ls anti-vibe-coding/.planning.v5-backup/` lista 4 arquivos `.original`
- [ ] `cat anti-vibe-coding/.gitignore | grep planning.v5-backup` retorna match
- [ ] `wc -l anti-vibe-coding/CLAUDE.md` ainda retorna **346** (nao toquei) — confirmacao G2
- [ ] `ls anti-vibe-coding/docs/PIPELINE.md docs/MODEL_PROFILES.md docs/AGENTS_LIST.md docs/UPGRADE.md docs/design-docs/core-beliefs.md` — todos 5 existem
- [ ] `cat anti-vibe-coding/.planning/plano08-audit-D29.md | grep -c '^|.*confirmed'` ≥ 16 (16 dos 20 items batem PRD; 4 marcados needs-check/DEFER)
- [ ] `git log --oneline -2` mostra 2 commits novos (wip pre-snapshot + wip fase-01)

---

## Criterio de Aceite

**Por maquina:**
- `test -d anti-vibe-coding/.planning.v5-backup/ && test -f anti-vibe-coding/.planning.v5-backup/CLAUDE.md.original` retorna exit 0
- `wc -l anti-vibe-coding/CLAUDE.md` retorna 346 (intocado)
- 5 stubs em `anti-vibe-coding/docs/` existem (PIPELINE, MODEL_PROFILES, AGENTS_LIST, UPGRADE, design-docs/core-beliefs)
- `anti-vibe-coding/.planning/plano08-audit-D29.md` existe e tem ≥16 rows `confirmed`

**Por humano:**
- Auditoria revisada: cada linha do CLAUDE.md de 346 linhas tem destino mapeado (sem orfaos)
- Decisao final sobre items `needs-check` registrada em `MEMORY.md`

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
