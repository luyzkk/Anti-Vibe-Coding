# Mudanças Recentes do Plugin Anti-Vibe Coding

**Período analisado:** 14 Mar 2026 - 23 Mar 2026 (9 dias)
**Versão atual:** v4.0.0

---

## 📅 Linha do Tempo

### 🔵 14 Mar 2026 — Progressive Disclosure (COMMITADO)

**Commit:** `16976ad` - "refactor: split skills into progressive disclosure with reference files"

**O que mudou:**
- Skills divididas em `SKILL.md` (resumo) + `references/*.md` (detalhes completos)
- **44 arquivos de referência criados** em 6 domínios técnicos
- Reduz consumo de contexto ao invocar skills

**Arquivos criados:**
```
skills/
├── api-design/references/
│   ├── api-concurrency.md
│   ├── api-protocols.md
│   ├── communication-patterns.md
│   ├── database-selection.md
│   ├── dtos.md
│   ├── graphql-patterns.md
│   ├── idempotency.md
│   ├── n-plus-one.md
│   └── rest-advanced.md (9 arquivos)
├── architecture/references/
│   ├── api-architecture.md
│   ├── cqrs-event-sourcing.md
│   ├── dependency-injection.md
│   ├── design-principles.md
│   ├── monolith-vs-microservices.md
│   └── solid-principles.md (6 arquivos)
├── design-patterns/references/
│   ├── code-smells.md
│   ├── domain-types.md
│   ├── error-handling.md
│   ├── gof-patterns.md
│   ├── javascript-patterns.md
│   ├── race-conditions.md
│   └── structured-logging.md (7 arquivos)
├── react-patterns/references/
│   ├── data-fetching.md
│   └── useeffect-patterns.md (2 arquivos)
├── security/references/
│   ├── application-security.md
│   ├── auth-methods.md
│   ├── authentication.md
│   ├── authorization-models.md
│   ├── cryptography.md
│   └── webhook-security.md (6 arquivos)
└── system-design/references/
    ├── cache-strategies.md
    ├── cap-theorem.md
    ├── cdn-mechanics.md
    ├── database-selection.md
    ├── load-balancing.md
    ├── replication-sharding.md
    ├── scalability.md
    └── serverless-vs-serverfull.md (8 arquivos)
```

**Total:** 44 arquivos de referência + 6 SKILL.md refatorados
**Impacto:** 9545 linhas adicionadas, 2312 removidas

---

### 🔵 14 Mar 2026 — Hooks + Infrastructure Skill (COMMITADO)

**Commits:**
- `fe69bc8` - "feat: add TDD gate and skill advisor hooks for automated enforcement"
- `f69f61c` - "feat: add infrastructure auditor agent and domain-specific rules"
- `2fc110e` - "feat: add infrastructure and enhance-prompt skills"

**Hooks criados/atualizados:**
- `hooks/tdd-gate.cjs` — Bloqueia código sem testes
- `hooks/user-prompt-gate.cjs` — Classificador de mensagens
- `hooks/hooks.json` — Configuração dos hooks

**Skills criadas:**
- `skills/infrastructure/SKILL.md` + 2 referências (DNS, deployment)
- `skills/enhance-prompt/SKILL.md` — Otimiza prompts de execução

**Agent criado:**
- `agents/infrastructure-auditor.md`

**Rules criadas:**
- `rules/infrastructure-patterns.md`
- Atualizações em `rules/api-standards.md` e `rules/security-patterns.md`

---

### 🔵 14 Mar 2026 — Version Bump + Skills Refinement (COMMITADO)

**Commit:** `4062ef6` - "chore: bump version to 4.0.0 and update remaining skills and CLAUDE.md"

**Mudanças:**
- `.claude-plugin/plugin.json` → v4.0.0
- Refinamento de 6 skills principais:
  - `skills/consultant/SKILL.md` (230 linhas adicionadas)
  - `skills/init/SKILL.md` (271 linhas adicionadas - **incluindo extração de progress.txt**)
  - `skills/anti-vibe-review/SKILL.md`
  - `skills/decision-registry/SKILL.md`
  - `skills/lessons-learned/SKILL.md`
  - `skills/tdd-workflow/SKILL.md`
- Atualização de `CLAUDE.md` com mapeamento completo de skills e agents

**Destaque - Extração de Conhecimento (progress.txt):**
- `skills/init/SKILL.md` ganhou **Passo 2.5** — Extração de Conhecimento
- Busca arquivos: `progress.txt`, `PROGRESS.md`, `.claude/memory/*.md`, `notes.md`, `gotchas.md`
- Filtra com critério sênior (não-deduzível, específico, custoso se repetido)
- Classifica em: Lições Aprendidas, Decisões Arquiteturais, Regras de Projeto
- Arquiva originais em `.claude/archive/`

---

### 🔵 22 Mar 2026 — Senior Principles + Learn Skill (COMMITADO)

**Commit:** `b55778e` - "feat: sync v4.0 with latest improvements"

**🌟 GRANDE UPDATE — 739 linhas adicionadas**

**Arquivos criados:**
1. **`senior-principles.md`** — 67 linhas
   - Conhecimento extraído de 60+ documentos técnicos
   - Resumo always-on de:
     - Segurança (criptografia, auth, webhooks, IDOR)
     - Qualidade de Código (9 code smells, Result Pattern, logging)
     - Arquitetura de Dados (CAP, cache, N+1, escalabilidade)
     - API Design (idempotência, DTOs, REST vs GraphQL)
     - JavaScript/TypeScript (closures, React, race conditions)
     - Infraestrutura (load balancer, CDN, serverless)
     - Design & SOLID (SRP, LSP, Lei de Demeter)

2. **`skills/learn/SKILL.md`** — 297 linhas
   - Skill de aprendizado adaptativo
   - 3 níveis: básico, intermediário, avançado
   - Integra com senior-principles.md

**Arquivos atualizados:**
- `CLAUDE.md` — Simplificado (86 linhas removidas)
  - Moveu detalhes técnicos para senior-principles.md
  - Adicionou referência ao knowledge base
- `README.md` — Reescrito (194 linhas simplificadas)
- `skills/consultant/SKILL.md` — 21 linhas refinadas
- `skills/anti-vibe-review/SKILL.md` — 28 linhas adicionadas (checklist ampliado)
- `skills/lessons-learned/SKILL.md` — 24 linhas adicionadas
- `skills/security/SKILL.md` — 235 linhas refatoradas
- `skills/tdd-workflow/SKILL.md` — 85 linhas adicionadas

**Hooks atualizados:**
- `hooks/user-prompt-gate.cjs` — 41 linhas adicionadas (classificador melhorado)
- `hooks/tdd-gate.cjs` — 1 linha adicionada
- `hooks/hooks.json` — 26 linhas (configuração atualizada)

**Impacto total:** 739 linhas adicionadas, 366 removidas

---

### 🔴 23 Mar 2026 — Sistema de Versionamento (NÃO COMMITADO)

**Status:** ⚠️ **Implementado mas não commitado**

**🌟 MAIOR UPDATE DO PLUGIN — Sistema de atualização automática**

**Arquivos NOVOS criados:**
1. `plugin-manifest.json` (1300 linhas) — Manifest com 39 arquivos rastreados
2. `scripts/generate-manifest.js` (150 linhas) — Gerador de checksums
3. `skills/update/skill.md` (370 linhas) — Skill de atualização incremental
4. `skills/lib/manifest-utils.md` (220 linhas) — Biblioteca de utilitários
5. `CHANGELOG.md` (150 linhas) — Histórico de mudanças
6. `IMPLEMENTACAO-VERSIONAMENTO.md` (600 linhas) — Documentação técnica
7. `docs/versionamento-exemplo.md` (450 linhas) — Exemplos práticos
8. `docs/versionamento-resumo.md` (250 linhas) — Resumo executivo

**Arquivos MODIFICADOS:**
1. `CLAUDE.md` — + seção "Versionamento e Atualizações" (30 linhas)
2. `README.md` — + seções de instalação/atualização (35 linhas)
3. `decisions.md` — + decisão arquitetural do versionamento (70 linhas)
4. `skills/init/SKILL.md` — + Passo 0 (detecção) e Passo 5 (manifest)

**Funcionalidades implementadas:**
- ✅ Rastreamento de 39 arquivos com checksums SHA-256
- ✅ Detecção automática de atualizações
- ✅ Detecção de modificações do usuário
- ✅ Merge inteligente (preserva customizações)
- ✅ Backup automático em `.claude/backups/YYYY-MM-DD/`
- ✅ Escolha seletiva de arquivos
- ✅ Retrocompatibilidade total

**Estratégias de atualização:**
- **Merge (9 arquivos)**: CLAUDE.md + 8 rules
- **Replace (30 arquivos)**: Skills, agents, hooks, senior-principles.md
- **Never**: decisions.md

**Impacto:** ~3500 linhas de código/documentação adicionadas

---

## 📊 Resumo Consolidado

### Commits Realizados (JÁ SINCRONIZADOS)

| Data | Commit | Descrição | Linhas |
|------|--------|-----------|--------|
| 14 Mar | 16976ad | Progressive disclosure + references | +9545 -2312 |
| 14 Mar | fe69bc8 | TDD gate + skill advisor hooks | - |
| 14 Mar | f69f61c | Infrastructure auditor + rules | - |
| 14 Mar | 2fc110e | Infrastructure + enhance-prompt skills | - |
| 14 Mar | 4062ef6 | Version bump + skills refinement | +555 -204 |
| 14 Mar | 9e38b9d | README rewrite | - |
| 22 Mar | b55778e | Senior principles + learn skill | +739 -366 |

**Total commitado:** ~10.839 linhas adicionadas, ~2.882 removidas

### Mudanças NÃO Commitadas (HOJE - 23 Mar)

| Tipo | Arquivos | Linhas |
|------|----------|--------|
| Novos | 8 arquivos | ~3.540 |
| Modificados | 4 arquivos | ~135 |

**Total não commitado:** ~3.675 linhas

---

## 🎯 Principais Features Implementadas

### 1. ✅ Progressive Disclosure (14 Mar)
- Skills divididas em resumo + referências detalhadas
- 44 arquivos de referência técnica
- Reduz consumo de contexto

### 2. ✅ Extração de Conhecimento (14 Mar)
- `/anti-vibe-coding:init` extrai de `progress.txt`, `notes.md`, etc.
- Filtro de qualidade sênior
- Popula Lições Aprendidas e Decisões Arquiteturais
- Arquiva originais em `.claude/archive/`

### 3. ✅ Senior Principles Knowledge Base (22 Mar)
- Arquivo `senior-principles.md` com 60+ conceitos
- Always-on reference para o Claude
- Organizado por domínio (segurança, arquitetura, APIs, etc.)

### 4. ✅ Learn Skill (22 Mar)
- Ensino adaptativo (básico/intermediário/avançado)
- Integra com senior-principles.md
- `/anti-vibe-coding:learn <tópico> [nível]`

### 5. ✅ Hooks Automáticos (14 Mar)
- `tdd-gate.cjs` — Bloqueia código sem testes
- `user-prompt-gate.cjs` — Classifica mensagens
- Automated enforcement zero-touch

### 6. ✅ Infrastructure Skill (14 Mar)
- DNS, hosting, deploy, CDN, serverless
- References: deployment-patterns.md, dns-hosting.md
- Agent: infrastructure-auditor

### 7. ✅ Enhance Prompt Skill (14 Mar)
- Otimiza prompts de execução (start.md)
- Integra Anti-Vibe em tasks/planos
- Lê `progress.txt` para gotchas

### 8. ⏳ Sistema de Versionamento (23 Mar - NÃO COMMITADO)
- Rastreamento automático de 39 arquivos
- Checksums SHA-256
- Atualização incremental
- Merge inteligente
- Backup automático

---

## ⚠️ PROBLEMA: Repositórios Desatualizados

### Situação Atual

Você tem **outros repositórios** onde o plugin foi instalado **antes** dessas atualizações.

**Esses repositórios NÃO TÊM:**

1. ❌ **Progressive Disclosure** (14 Mar)
   - Arquivos `references/*.md` não existem
   - Skills invocam referências que não existem localmente
   - **RISCO:** Erro ao invocar skills

2. ❌ **Senior Principles** (22 Mar)
   - Arquivo `senior-principles.md` não existe
   - CLAUDE.md faz referência a ele
   - **RISCO:** Contexto incompleto

3. ❌ **Extração de progress.txt** (14 Mar)
   - Skill init não extrai conhecimento de arquivos existentes
   - `progress.txt` pode existir mas não foi processado
   - **RISCO:** Conhecimento perdido

4. ❌ **Learn Skill** (22 Mar)
   - Skill `/anti-vibe-coding:learn` não existe
   - **RISCO:** Comando não funciona

5. ❌ **Infrastructure Skill** (14 Mar)
   - Skill `/anti-vibe-coding:infrastructure` não existe
   - Agent `infrastructure-auditor` não existe
   - **RISCO:** Comando não funciona

6. ❌ **Enhance Prompt Skill** (14 Mar)
   - Skill `/anti-vibe-coding:enhance-prompt` não existe
   - **RISCO:** Comando não funciona

7. ❌ **Hooks Atualizados** (14-22 Mar)
   - `tdd-gate.cjs` pode estar desatualizado
   - `user-prompt-gate.cjs` sem classificador melhorado
   - **RISCO:** Comportamento inconsistente

8. ❌ **Sistema de Versionamento** (23 Mar)
   - `.claude/.anti-vibe-manifest.json` não existe
   - Skill `update` não existe
   - **RISCO:** Impossível atualizar automaticamente

### Impacto

**Se rodar `/anti-vibe-coding:init` em repositório antigo:**

❌ **Com código atual (não commitado):**
- Skill init espera manifest existir (Passo 0)
- Pode falhar ou se comportar incorretamente

✅ **Com código commitado (b55778e):**
- Funciona, mas não cria manifest
- Não rastreia versões
- Próxima atualização sobrescreve tudo

**Se invocar skills técnicas:**
- Skills tentam ler `references/*.md` que não existem
- Comportamento imprevisível

---

## 🔧 Plano de Sincronização

### Passo 1: Committar Sistema de Versionamento

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Adicionar todos os arquivos novos
git add plugin-manifest.json
git add scripts/
git add skills/update/
git add skills/lib/
git add CHANGELOG.md
git add IMPLEMENTACAO-VERSIONAMENTO.md
git add docs/

# Adicionar arquivos modificados
git add CLAUDE.md
git add README.md
git add decisions.md
git add skills/init/

# Commit
git commit -m "feat: add versioning system with auto-update and intelligent merge

- Add plugin-manifest.json tracking 39 files with SHA-256 checksums
- Add /anti-vibe-coding:update skill for incremental updates
- Update /anti-vibe-coding:init to detect existing installations
- Add manifest-utils.md library for version management
- Add automatic backup to .claude/backups/YYYY-MM-DD/
- Add merge strategies: merge (CLAUDE.md + rules), replace (hooks/agents), never (decisions.md)
- Add comprehensive documentation (CHANGELOG.md, implementation guide, examples)
- Update CLAUDE.md and README.md with versioning section
- Add architectural decision for checksums-based versioning

Breaking: None (backwards compatible)
Migration: Run /anti-vibe-coding:init in existing projects to create manifest
"

# Tag
git tag v4.1.0
```

### Passo 2: Atualizar Repositórios Antigos

Para **cada repositório** que tem o plugin instalado:

#### Opção A: Atualização Manual (Recomendada)

```bash
# 1. No repositório do plugin
cd "f:/Projetos/Claude code/anti-vibe-coding"
git push origin main
git push origin v4.1.0

# 2. No repositório do projeto
cd "/caminho/do/projeto"

# 3. Puxar updates do plugin (se instalado como submodule)
git submodule update --remote

# OU copiar arquivos manualmente se não for submodule
# (rsync ou cp do diretório do plugin)

# 4. Rodar init para criar manifest
# Via Claude Code:
/anti-vibe-coding:init
```

#### Opção B: Atualização via Script (Automatizada)

Criar `scripts/sync-projects.sh`:

```bash
#!/bin/bash

PLUGIN_DIR="f:/Projetos/Claude code/anti-vibe-coding"
PROJECTS=(
  "/caminho/projeto1"
  "/caminho/projeto2"
  "/caminho/projeto3"
)

for PROJECT in "${PROJECTS[@]}"; do
  echo "=== Sincronizando $PROJECT ==="

  # Copiar arquivos do plugin
  rsync -av --exclude='.git' "$PLUGIN_DIR/" "$PROJECT/.claude/plugins/anti-vibe-coding/"

  # Criar marker para rodar init
  touch "$PROJECT/.claude/.needs-plugin-update"

  echo "✓ $PROJECT marcado para atualização"
  echo ""
done

echo "Sincronização completa. Rodar /anti-vibe-coding:init em cada projeto."
```

### Passo 3: Validação

Para cada projeto atualizado:

1. ✅ Verificar se `.claude/.anti-vibe-manifest.json` foi criado
2. ✅ Verificar se `senior-principles.md` existe
3. ✅ Verificar se `skills/*/references/` existem
4. ✅ Rodar `/anti-vibe-coding:learn security` para testar
5. ✅ Rodar `/anti-vibe-coding:update` para confirmar que está atualizado

---

## 📋 Checklist de Ações

### Imediatas (Hoje)

- [ ] Committar sistema de versionamento
- [ ] Criar tag v4.1.0
- [ ] Push para origin
- [ ] Regenerar `plugin-manifest.json` final

### Esta Semana

- [ ] Identificar TODOS os repositórios com plugin instalado
- [ ] Criar lista de projetos: nome, path, versão instalada
- [ ] Para cada projeto:
  - [ ] Sincronizar arquivos do plugin
  - [ ] Rodar `/anti-vibe-coding:init`
  - [ ] Verificar manifest criado
  - [ ] Testar skills (learn, infrastructure, update)
  - [ ] Marcar como ✅ sincronizado

### Próxima Semana

- [ ] Criar script de sincronização automática
- [ ] Documentar processo de onboarding de novos projetos
- [ ] Adicionar notificação de nova versão (hook futuro)

---

## 🎯 Resumo Executivo

**Período:** 14-23 Mar 2026 (9 dias)
**Commits:** 7 commits
**Mudanças:** ~14.500 linhas adicionadas/modificadas

**Features Principais:**
1. ✅ Progressive Disclosure (44 references)
2. ✅ Senior Principles (60+ conceitos)
3. ✅ Extração de progress.txt
4. ✅ 3 novas skills (learn, infrastructure, enhance-prompt)
5. ✅ 2 hooks automáticos
6. ⏳ Sistema de versionamento (pronto, não commitado)

**Repositórios afetados:**
- ⚠️ **Múltiplos projetos** com plugin instalado **antes** dessas mudanças
- ❌ Não têm: references, senior-principles, novas skills, versionamento
- 🔧 **Ação necessária:** Sincronizar e rodar `/anti-vibe-coding:init`

**Próximo passo:**
Committar versionamento e sincronizar todos os repositórios antigos.
