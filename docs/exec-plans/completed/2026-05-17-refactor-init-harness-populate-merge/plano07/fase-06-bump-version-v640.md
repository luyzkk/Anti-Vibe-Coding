<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 06: Verificacao Final + Release v6.4.0 (tag local)

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 0.5h
**Depende de:** fase-01, fase-02, fase-03, fase-04, fase-05 (todas verdes); gate cross-plano: Plano 06 fase-04 (CHANGELOG `### Breaking Changes (Behavior)` registrado) + fase-05 (init-rationale.md atualizado)
**Visual:** false

---

## O que esta fase entrega

Gate final de release v6.4.0: confirma que `package.json.version === '6.4.0'`, roda `bun run harness:validate && bun run compound:check` com exit 0, cria tag git **local** `v6.4.0` (sem push automatico) e move a pasta da feature de `docs/exec-plans/active/` para `docs/exec-plans/completed/`. Comando para `git push origin v6.4.0` eh documentado mas NAO executado — dev decide o momento da publicacao.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Verify | Confirmar `"version": "6.4.0"` (commit `5c4e4b2` ja bumpou — fase eh verificacao, nao mutacao). Se regrediu durante execucao dos planos anteriores, **reaplicar** bump destrutivo |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/` | Move | Mover para `docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge/` ao final da fase |
| `CHANGELOG.md` | Verify | Confirma presenca de `### Breaking Changes (Behavior)` no bloco `## [6.4.0]` (Plano 06 fase-04 ja escreveu) + mencao a "limitacao conhecida do rollback v6.4.0" (G8/TODO-HERANCA-5) |
| git tag local `v6.4.0` | Create | `git tag -a v6.4.0 -m "Release v6.4.0 ..."` — annotated tag (DI-5 do MEMORY) |

**Total:** 0 arquivos novos. Mutacoes: 1 mv (pasta), 1 git tag (local).

---

## Implementacao

### Passo 1: Verificar versao do `package.json`

Conforme **G11 do README**: commit `5c4e4b2` ja bumpou para 6.4.0. Esta fase eh primariamente verificacao.

```bash
# Confirma versao atual.
bun --print "require('./package.json').version"
# Esperado: 6.4.0

# Caso regrediu para 6.3.2 durante execucao dos planos anteriores, REAPLICAR bump:
# (passo destrutivo somente se regrediu — confirmar antes)
# node -e "const p=require('./package.json'); p.version='6.4.0'; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\n')"
```

### Passo 2: Confirmar CHANGELOG e ADR

Conforme **G8 do README + TODO-HERANCA-5 do MEMORY**:

```bash
# CHANGELOG tem o bloco 6.4.0 com Breaking Changes (Behavior)
grep -c '^### Breaking Changes (Behavior)' CHANGELOG.md
# Esperado: >= 1 (Plano 06 fase-04 entregou)

# CHANGELOG menciona limitacao do rollback move (G8 / GT-CROSS-3 do plano06)
grep -F 'limitacao conhecida do rollback v6.4.0' CHANGELOG.md
# Esperado: 1+ match. Se ZERO, abrir DEV-N e voltar para Plano 06 fase-04
# (NAO fix manual nesta fase — refletir back).

# ADR-NNNN-destructive-merge-default.md existe
ls docs/design-docs/ADR-*-destructive-merge-default.md
# Esperado: 1 arquivo (NNNN inferido em runtime por Plano 06 fase-03)
```

### Passo 3: Rodar `harness:validate` e `compound:check`

Conforme **G9 do README** + **TODO-HERANCA-6 do MEMORY**:

```bash
bun run harness:validate
# Esperado: exit 0. Falha bloqueia release.

bun run compound:check
# Esperado: exit 0. Falha bloqueia release.
# Se falhar com lessons obsoletas, abrir DEV-N em MEMORY e resolver manualmente
# (WH-02 do PRD — auto-fix nao permitido).
```

### Passo 4: Rodar suite completa de testes

Confirma que nenhuma fase do Plano 07 quebrou testes existentes nem regressao surgiu:

```bash
bun run test
# Esperado: 0 falhas. Inclui:
#   - tests/e2e/ca12-greenfield-populate-validate.test.ts (fase-03)
#   - tests/e2e/ca13-dry-run-parity.test.ts (fase-04)
#   - tests/e2e/ca15-performance.test.ts (fase-05)
#   - tests/e2e/init-tracer-bullet.test.ts (Plano 02 fase-04)
#   - testes de todos os Planos 01-06
```

### Passo 5: Criar tag git local (annotated)

Conforme **G10 do README** e **DI-5 do MEMORY**: annotated tag com referencia ao PRD + CHANGELOG. NAO push automatico.

```bash
# Pre-check: tag ja existe?
git tag --list v6.4.0
# Se output nao-vazio, abrir DEV-N (ja foi taggeada — situacao anomala).

# Criar tag annotated.
git tag -a v6.4.0 -m "Release v6.4.0 — Refactor /init: populate plan + invert CLAUDE.md merge + adapt existing docs

PRD: docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge/PRD.md
CHANGELOG: ver bloco [6.4.0] no CHANGELOG.md

Breaking Changes (Behavior):
- merge default agora eh destrutivo (CLAUDE.md > 40 linhas vira espelho).
- escape hatch: /anti-vibe-coding:init --additive-merge (comportamento v6.3.x).
- backup automatico em .anti-vibe/backup/{ts}/; rollback via --rollback.

Limitacoes conhecidas:
- rollback de action: 'move' deixa stub residual no path movido (v6.5+ resolve).

Refs: ADR-NNNN-destructive-merge-default.md (NNNN substituido por numero real do ADR escrito pelo Plano 06 fase-03)"

# Verificar criacao.
git tag --list v6.4.0
# Esperado: v6.4.0
```

**Comando para push manual (NAO executar nesta fase):**

```bash
# Quando dev decidir publicar:
git push origin v6.4.0
```

Documentar este comando em comentario destacado no log da fase + na MEMORY.

### Passo 6: Mover pasta da feature para `completed/`

Passo final do Plano 07. Conforme **Notas para Planos Seguintes** do MEMORY:

```bash
# Confirmar que todas as fases do Plano 07 estao marcadas como concluidas
# em MEMORY.md (Metricas -> Fases concluidas == 6).

# Mover pasta:
mv docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge docs/exec-plans/completed/

# Confirmar:
test -d docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge
# Esperado: exit 0 (diretorio existe em completed/)
test ! -d docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge
# Esperado: exit 0 (diretorio NAO existe mais em active/)
```

### Passo 7: Commit final da fase

```bash
git add docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge \
        docs/exec-plans/active

git commit -m "chore(release): v6.4.0 — feature refactor-init-harness-populate-merge concluida

- 7 planos / ~38 fases entregues (Planos 01-07).
- 8 novos steps no registry (06/07/08/09/10/11/12/91) + comando --rollback.
- 3 novas flags (--dry-run, --rollback, --additive-merge).
- 4 fixtures E2E novos + 3 testes E2E (CA-12, CA-13+CA-14, CA-15).
- Tag local v6.4.0 criada. Dev decide quando fazer git push origin v6.4.0.

Feature movida de active/ -> completed/.
"
```

NAO incluir `git push` automaticamente. Documentar no log que dev faz `git push origin v6.4.0` quando confirmar.

---

## Gotchas

- **G8 do README (limitacao do rollback move):** `grep` confirma que CHANGELOG cita a limitacao. Se ausente, refletir back para Plano 06 fase-04.
- **G9 do README (`compound:check` pode falhar):** falha bloqueia release. NAO auto-fix. Abrir DEV-N e dev resolve.
- **G10 do README (tag local sem push):** explicitamente nao executar `git push origin v6.4.0`. Comando documentado em log/comment apenas.
- **G11 do README (versao ja bumpada):** verificacao, nao mutacao. Se regrediu, reaplicar bump.
- **Local — Bun no harness:validate:** `package.json` define `harness:validate` como `bun scripts/harness-validate.ts .`. O `.` indica cwd canonico. Rodar da raiz do plugin.
- **Local — `move` da pasta pode falhar em Windows se algum editor tem arquivo aberto:** `mv` falha com `EBUSY`. Fechar editores antes. Se persistir, rodar `git mv` em vez de `mv`.
- **Local — annotated tag mensagem multiline em Windows shell:** PowerShell trata heredoc diferentemente. Considerar `git tag -a v6.4.0 -F tag-message.txt` (escrever mensagem em arquivo temporario), depois `rm tag-message.txt`.
- **Local — commit final inclui mv da pasta:** `git mv` preserva history. Se foi feito `mv` raw, git detecta como rename via similarity threshold mas pode mostrar como delete+add em diff. Usar `git mv` quando possivel.

---

## Verificacao

### TDD

Esta fase eh **verification + release ceremony**. Sem TDD codigo. Cada step do checklist mapeia para um comando com exit code esperado.

### Checklist

- [ ] `bun --print "require('./package.json').version"` retorna `'6.4.0'` (G11/TODO-HERANCA-7).
- [ ] `grep -c '^### Breaking Changes (Behavior)' CHANGELOG.md` retorna `>= 1` (Plano 06 fase-04).
- [ ] `grep -F 'limitacao conhecida do rollback v6.4.0' CHANGELOG.md` retorna `1+` match (G8/TODO-HERANCA-5).
- [ ] `ls docs/design-docs/ADR-*-destructive-merge-default.md` retorna `1` arquivo (Plano 06 fase-03).
- [ ] `bun run harness:validate` exit 0 (TODO-HERANCA-6).
- [ ] `bun run compound:check` exit 0 (G9/TODO-HERANCA-6).
- [ ] `bun run test` exit 0 (todos os testes E2E + unit verdes).
- [ ] `bun run lint` exit 0.
- [ ] `git tag --list v6.4.0` retorna `v6.4.0`.
- [ ] **NAO foi feito** `git push origin v6.4.0` (auditoria visual: `git log origin/main..HEAD --oneline` mostra commits locais nao publicados; nao ha push de tag).
- [ ] Pasta `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/` NAO existe (foi movida para completed/).
- [ ] Pasta `docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge/` existe.
- [ ] Commit final criado com mensagem `chore(release): v6.4.0 ...`.
- [ ] MEMORY.md atualizado: matriz CA → fase com 15/15 ratificados (12/13/14/15 direto via testes deste plano; 1-11 indireto via suite full).

---

## Criterio de Aceite

**Por maquina:**

```bash
# Suite full de comandos que DEVE rodar com exit 0:
bun --print "require('./package.json').version" | grep -q '^6\.4\.0$'
bun run harness:validate
bun run compound:check
bun run test
bun run lint
git tag --list v6.4.0 | grep -q '^v6\.4\.0$'
test -d docs/exec-plans/completed/2026-05-17-refactor-init-harness-populate-merge
test ! -d docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge
```

Cada comando deve retornar exit 0. Falha em qualquer um bloqueia o release.

**Por humano:**

- Apos `git tag v6.4.0`, dev faz auditoria visual:
  - Tag `v6.4.0` aparece em `git tag --list`.
  - Tag NAO aparece em `git ls-remote --tags origin` (nao foi pushed — esperado).
  - CHANGELOG.md tem bloco `## [6.4.0]` completo com Breaking Changes (Behavior) + Added + Changed.
  - Feature em `completed/` esta com README/MEMORY de cada plano preservados como historico.
- Dev decide quando fazer `git push origin v6.4.0` (comando documentado no commit message + log da fase). NAO acao do plugin nesta fase.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
