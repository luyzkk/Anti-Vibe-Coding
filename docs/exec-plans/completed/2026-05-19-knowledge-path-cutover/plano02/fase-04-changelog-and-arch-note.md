<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 04: Changelog e Nota Arquitetural

**Plano:** 02 — Reentrada, Migracao V5 e Validator Pos-Init
**Sizing:** ~45min
**Depende de:** fase-01, fase-02, fase-03 (todos os CAs devem estar verdes antes de fechar)
**Visual:** false

---

## O que esta fase entrega

Entry `[6.6.0]` no `CHANGELOG.md` documentando os tres outcomes principais. Nota arquitetural opcional em `ARCHITECTURE.md` consolidando a convencao "docs/ = dog-food humano; runtime assets DEVEM viver fora de docs/". Closing checklist manual verificando todos os CAs do PRD. Hand-off para `/anti-vibe-coding:lessons-learned`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `CHANGELOG.md` | Modify | Adicionar entry `[6.6.0]` no topo (acima de `[6.5.1]`) |
| `ARCHITECTURE.md` | Modify | (CH-01, opcional) Adicionar nota sobre convencao `docs/` vs runtime assets |

---

## Implementacao

### Passo 1: Verificar que todos os CAs de fase-01/02/03 passam

Antes de escrever CHANGELOG, executar:

```bash
bun run test -- --grep "passes refresh"
bun run test -- --grep "migrateKnowledgePathStep"
bun run test -- --grep "90-final-validation: knowledge checks"
bun run test
bun run lint
```

Se qualquer teste falhar, retornar para a fase correspondente antes de prosseguir.

### Passo 2: Entry CHANGELOG.md

Inserir no topo do CHANGELOG.md (acima de `## [6.5.1] - 2026-05-19`):

```markdown
## [6.6.0] - 2026-05-20

> **Minor release — Knowledge Path Cutover (docs/knowledge → knowledge/)**
> Runtime assets do plugin agora vivem em `knowledge/` na raiz (fora de `docs/`),
> corrigindo o bug onde `/init` emitia warning "Knowledge não foi copiado" ao rodar
> contra o cache global (`~/.claude/plugins/cache/`). Inclui refresh automático de
> atoms em re-populate, migração de artefatos v5 e validator pós-init com dois níveis.

### Changed

- **Path cutover `docs/knowledge/` → `knowledge/`** —
  `docs/knowledge/` era runtime asset coabitando com metadocumentação do plugin (dog-food não
  distribuível). Movido para `knowledge/` na raiz via `git mv` com linhagem git preservada
  (`git log --follow knowledge/{stack}/INDEX.md` mostra histórico completo).
  `sync-to-global.sh` agora copia `knowledge/` para o cache global e valida presença de
  `nodejs-typescript/INDEX.md` E `rails/INDEX.md` pós-sync (exit 1 se incompleto).

- **Refresh automático de atoms em re-populate** —
  Quando `/init` roda em modo re-populate (`manifest pluginVersion < 6.6.0` ou re-run
  explícito) e `.claude/knowledge/` já existe no projeto alvo, os atoms são sobrescritos com
  o conteúdo atual da matrix do plugin. Elimina drift entre versões silencioso.
  **Atenção:** re-populate sobrescreve `.claude/knowledge/` integralmente. Customizações
  locais devem viver em `.claude/knowledge/_overrides/` (convenção a estabelecer em PRD futuro).

- **Migração automática de artefatos init-v5** —
  Projetos que rodaram `/init` v5 têm `docs/knowledge/legacy-claude-knowledge/`. Em modo
  re-populate, o novo step `13_1-migrate-knowledge-path` move esse artefato para
  `docs/_legacy/knowledge/` (agrupa com `docs/_legacy/pre-6.5.0/`). Guard de colisão:
  aborta com mensagem clara se destino já existe (migração manual necessária).

### Added

- **Validator pós-init com 2 níveis** (`Step 90 final-validation`):
  - Check primário (bloqueante): stack detectada sem `.claude/knowledge/{stack}/INDEX.md` → `AbortError`.
  - Check secundário (warning, sunset v7.0.0): `docs/knowledge/` órfão remanescente → `console.warn`
    não-bloqueante com instrução de re-run.
- **Constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'`** inline em `00_2-reentry-guard.ts` —
  threshold de re-populate atualizado de `6.5.0` para `6.6.0`.

### Fixed

- **Warning "Knowledge não foi copiado" em cache global** — causa raiz era `sync-to-global.sh`
  não copiar `docs/knowledge/` (por design: `docs/` é dog-food não distribuível). Resolvido com
  path cutover para `knowledge/` fora de `docs/`.
- **`copy-knowledge.ts` promove warning para `AbortError`** quando stack detectada mas matrix
  ausente no plugin (`primary !== null` E `sourceDir` ausente). Antes: warning não-bloqueante
  que permitia init completar com `.claude/knowledge/` vazio, silenciosamente quebrando skills downstream.
```

### Passo 3: Nota arquitetural em ARCHITECTURE.md (CH-01 — opcional)

Verificar se `ARCHITECTURE.md` tem secao sobre convencoes de estrutura de pastas. Adicionar (ou criar secao) apos a ultima secao de estrutura:

```markdown
### Convencao: `docs/` vs Runtime Assets

> Registrado em: 2026-05-20 — PRD knowledge-path-cutover (D1, D2). Decisao confirmada pos-merge.

`docs/` e **dog-food humano** — metadocumentacao do plugin (exec-plans, compound notes, design-docs,
ADRs). `sync-to-global.sh` propositalmente NAO copia `docs/` para o cache global.

**Runtime assets** (consumidos por skills durante `/init` no projeto alvo) DEVEM viver **fora de `docs/`**:

| Diretorio | Tipo | Distribuivel? |
|-----------|------|---------------|
| `knowledge/` | Matrix por stack (atoms) consumida por `copy-knowledge.ts` | Sim (`sync-to-global.sh` copia) |
| `skills/` | Skills (commands) do plugin | Sim |
| `hooks/` | Hooks do plugin | Sim |
| `agents/` | Subagent prompts | Sim |
| `docs/` | Metadocumentacao interna | **Nao** |

Se um novo asset for criado e precisar chegar ao projeto alvo via `/init`, ele NAO deve ficar em `docs/`.
```

### Passo 4: Closing Checklist — verificar todos os CAs do PRD

Executar cada item da lista abaixo (CAs do PRD que sao responsabilidade do Plano 02):

**CA-06 (refresh em re-populate):**
- [ ] `bun run test -- --grep "passes refresh=true to runner when __reentryMode is re-populate"` passa

**CA-07 (greenfield NAO faz refresh):**
- [ ] `bun run test -- --grep "passes refresh=false to runner"` passa (ambos os testes)

**CA-08 (migracao v5):**
- [ ] `bun run test -- --grep "moves docs/knowledge/legacy-claude-knowledge"` passa

**CA-09 (guard de colisao):**
- [ ] `bun run test -- --grep "aborts with AbortError when destination"` passa

**CA-11 (validator primario bloqueia):**
- [ ] `bun run test -- --grep "throws AbortError when stack detected"` passa

**CA-12 (validator secundario so avisa):**
- [ ] `bun run test -- --grep "emits WARN when docs/knowledge/ orphan exists"` passa

**Suite completa:**
- [ ] `bun run test` — zero failures
- [ ] `bun run lint` — zero warnings/errors
- [ ] `bun run harness:validate` — passa (Plano 01 fase-06 ja atualizou)

**CAs do Plano 01 (verificar que nao foram quebrados por Plano 02):**
- [ ] `knowledge/nodejs-typescript/INDEX.md` existe no repo do plugin (CA-01)
- [ ] `docs/knowledge/` ausente no repo do plugin (CA-01)
- [ ] `grep -r '"version": "6.6.0"' package.json .claude-plugin/` retorna match (CA-14)

### Passo 5: Commit e hand-off

Commit convencional descritivo:

```
feat: complete knowledge path cutover — refresh on reentry, v5 migration, validator checks

- 03_1: derive refresh from __reentryMode='re-populate' (D5.B.2, CA-06/CA-07)
- 13_1-migrate-knowledge-path: move docs/knowledge/legacy-claude-knowledge →
  docs/_legacy/knowledge with collision guard (D7.A.1, CA-08/CA-09)
- 90-final-validation: add primary blocking check + secondary sunset-v7.0.0 warn (D8.C, CA-11/CA-12)
- CHANGELOG: 6.6.0 entry documenting cutover, refresh, migration, validator
- ARCHITECTURE: docs/ = dog-food convention (CH-01)
```

Apos merge, executar `/anti-vibe-coding:lessons-learned` com o tema:
> "docs/ e dog-food humano (nao distribuivel); qualquer runtime asset consumido por skills durante /init DEVE viver fora de docs/. Convencao documentada em ARCHITECTURE.md."

---

## Gotchas

- **Local — CHANGELOG.md formato:** O CHANGELOG atual usa `## [X.Y.Z] - YYYY-MM-DD`. Manter o mesmo formato. A entry 6.6.0 vai no topo, acima de 6.5.1.

- **Local — CHANGELOG nota sobre refresh sobrescreve:** O risco "refresh sobrescreve atoms customizados" foi identificado no PRD. A entry CHANGELOG inclui o aviso (`Atenção: re-populate sobrescreve...`). Nao bloquear o merge por isso — e apenas documentacao.

- **Local — ARCHITECTURE.md pode nao existir ou ter formato diferente:** Verificar antes de adicionar. Se nao existir, criar apenas se CH-01 for decidido como Must (atualmente Could Have). Se a secao ja existir, apenas adicionar a tabela.

- **Local — lessons-learned hand-off e MANUAL:** O subagente nao invoca `/anti-vibe-coding:lessons-learned` automaticamente (feedback_suggest_dont_execute.md na memoria do usuario). Apenas sugerir ao usuario que rode o comando pos-merge.

---

## Verificacao

### TDD

Esta fase nao tem ciclo TDD proprio (e de closing/documentacao). Os testes verificados sao os das fases 01-03.

### Checklist

- [ ] CHANGELOG.md tem entry `[6.6.0]` acima de `[6.5.1]`
- [ ] Entry 6.6.0 tem 3 bullets principais (cutover, refresh, migracao v5) + Added (validator + constante) + Fixed (warning → AbortError)
- [ ] Nota em ARCHITECTURE.md adicionada (CH-01) com tabela de dirs distribuiveis vs nao-distribuiveis
- [ ] Todos os CAs do Plano 02 verificados (CA-06, CA-07, CA-08, CA-09, CA-11, CA-12)
- [ ] `bun run test` — zero failures
- [ ] `bun run lint` — zero warnings
- [ ] `bun run harness:validate` — passa
- [ ] Commit criado com mensagem convencional descritiva
- [ ] Sugestao de `/anti-vibe-coding:lessons-learned` comunicada ao usuario

---

## Criterio de Aceite

**Fecho do PRD:**

**Por maquina:**
- `bun run test` retorna zero failures
- `bun run lint` retorna zero errors/warnings
- `grep "\[6.6.0\]" CHANGELOG.md` retorna match

**Por humano:**
- CHANGELOG.md entry 6.6.0 legivel e descritiva (nao apenas lista de commits)
- ARCHITECTURE.md tem a nota sobre `docs/` vs runtime assets com tabela
- Nao ha referencias a `docs/knowledge/` no codigo de producao (exceto `migrate-claude-artifacts.ts` que representa target-side path)

**Lessons-learned hand-off (requer verificacao manual):**
- Usuario executou `/anti-vibe-coding:lessons-learned` apos merge
- Lesson capturada em `docs/compound/` com tema "docs/ = dog-food; runtime asset deve viver fora"

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
