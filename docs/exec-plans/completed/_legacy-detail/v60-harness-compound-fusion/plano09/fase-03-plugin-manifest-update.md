<!--
Princípio universal #5 — Comment Provenance.
NÃO aplica nesta fase — JSON gerado por script existente.
-->

# Fase 03: Regenerate `plugin-manifest.json` para 6.0.0

**Plano:** 09 — Versioning & Release
**Sizing:** 1h
**Depende de:** fase-01 (campo top-level `"version": "6.0.0"` ja gravado) + **Plano 07 concluido** (skill `skills/todo-pick/SKILL.md` deve existir — G2 do plano)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/plugin-manifest.json` regenerado integralmente: 113+ entradas existentes ganham `"version": "6.0.0"` e checksums SHA-256 recalculados, novos arquivos do v6 (skill /todo-pick, hooks pre-mutation-gate + state-md-hook, scripts harness-validate.ts + compound-check.ts + state-regenerate.ts, libs novas em skills/lib/, templates harness em skills/init/templates/harness/) sao registrados com `updateStrategy` apropriada, campo `generatedAt` reflete ISO timestamp do release.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/plugin-manifest.json` | Modify (full regenerate) | Saida do `scripts/generate-manifest.js` rodado contra a arvore completa do plugin pos-Plano 08. Top-level `"version": "6.0.0"` (ja gravado em fase-01 mas re-escrito pelo script — verificar que script preserva), `"generatedAt"`: timestamp ISO atual, `"files": { ... }` com entradas para TODOS os arquivos versionaveis. |
| `anti-vibe-coding/scripts/generate-manifest.js` | (Possivel) Modify | SE script atual nao detectar diretorios novos (e.g., `skills/init/templates/harness/`, `scripts/*.ts`) ou nao aceitar `PLUGIN_VERSION` env var, ajustar antes de rodar. Mudanca minima. |

---

## Implementacao

### Passo 1: Inventario dos arquivos novos a registrar

Antes de rodar o script, **listar os arquivos novos** que devem aparecer no manifest pos-regeneracao. Baseado em PLAN.md + paths declarados em planos 01-08:

```bash
cd anti-vibe-coding

# Skills novas
ls skills/todo-pick/SKILL.md 2>/dev/null && echo "✓ /todo-pick" || echo "✗ /todo-pick MISSING (Plano 07 nao concluiu)"

# Hooks novos
ls hooks/pre-mutation-gate.cjs 2>/dev/null && echo "✓ pre-mutation-gate" || echo "✗ pre-mutation-gate MISSING (Plano 05)"
ls hooks/state-md-hook.cjs 2>/dev/null && echo "✓ state-md-hook" || echo "✗ state-md-hook MISSING (Plano 06)"

# Scripts novos
ls scripts/harness-validate.ts 2>/dev/null && echo "✓ harness-validate.ts" || echo "✗ harness-validate.ts MISSING (Plano 01/04)"
ls scripts/compound-check.ts 2>/dev/null && echo "✓ compound-check.ts" || echo "✗ compound-check.ts MISSING (Plano 04)"
ls scripts/state-regenerate.ts 2>/dev/null && echo "✓ state-regenerate.ts" || echo "✗ state-regenerate.ts MISSING (Plano 06)"

# Templates harness
ls -d skills/init/templates/harness/ 2>/dev/null && echo "✓ harness templates dir" || echo "✗ harness templates MISSING (Plano 01/02)"

# Libs novas (formato .md em skills/lib/)
for lib in completion-signal path-resolver-v6 state-md-generator lessons-learned-crud decision-registry-revoke todo-utils backup-planning migrate-planning migrate-lessons migrate-decisions; do
  if ls skills/lib/${lib}.md 2>/dev/null > /dev/null; then
    echo "✓ skills/lib/${lib}.md"
  else
    echo "✗ skills/lib/${lib}.md MISSING"
  fi
done
```

**Decisao de gating:**
- Se TODOS os arquivos esperados existem → seguir para Passo 2.
- Se algum eh MISSING → confirmar com user qual plano nao concluiu. **NAO** seguir cegamente; manifest sem skill /todo-pick representa release diferente.

### Passo 2: Auditar `scripts/generate-manifest.js` existente

O script ja existe (linha do CHANGELOG v4.0.0: "scripts/generate-manifest.js: Gera plugin-manifest.json automaticamente"). Conferir se:

```bash
# Ler header do script para ver assinatura
head -30 anti-vibe-coding/scripts/generate-manifest.js

# Conferir se aceita PLUGIN_VERSION env var ou argumento
grep -n "PLUGIN_VERSION\|argv\|process.env" anti-vibe-coding/scripts/generate-manifest.js | head -10

# Conferir quais diretorios scan
grep -nE "skills|hooks|agents|rules|scripts|templates|lib" anti-vibe-coding/scripts/generate-manifest.js | head -20
```

**Ajustes possiveis (apenas se necessario — mudanca minima):**

| Cenario | Acao |
|---------|------|
| Script hardcoda versao | Adicionar leitura de `process.env.PLUGIN_VERSION || readFromPackageJson()` |
| Script nao escana `scripts/` (so `agents/`, `hooks/`, `rules/`, `skills/`) | Adicionar `scripts/` ao array de diretorios escaneados |
| Script nao escana `skills/init/templates/harness/` | Verificar se o glob existente `skills/**/*.md` ja captura (provavel) |
| Script nao escana `skills/lib/*.md` | Idem |

Se script precisa de ajuste maior, **PARAR e abrir sub-fase de bug-fix** (`scripts/__tests__/generate-manifest.test.ts` ja existe — adicionar caso de teste pro novo path antes de mudar). Nao misturar com fase-03.

### Passo 3: Backup do manifest atual

```bash
mkdir -p anti-vibe-coding/.release-backup/v5.3.0/
cp anti-vibe-coding/plugin-manifest.json anti-vibe-coding/.release-backup/v5.3.0/plugin-manifest.json.fase01
# (Backup ja existe se fase-01 rodou; este eh apenas snapshot pos-fase-01, antes-fase-03)
```

### Passo 4: Rodar gerador

```bash
cd anti-vibe-coding

# Versao via env var (assumindo script suporta — confirmar em Passo 2)
PLUGIN_VERSION=6.0.0 bun scripts/generate-manifest.js

# Validar que arquivo foi escrito
test -f plugin-manifest.json && echo "OK"
test -s plugin-manifest.json && echo "Non-empty OK"

# Validar JSON eh parseavel
cat plugin-manifest.json | jq -e . > /dev/null && echo "Valid JSON"

# Validar version top-level
test "$(cat plugin-manifest.json | jq -r .version)" = "6.0.0" && echo "Version 6.0.0 OK"

# Validar generatedAt foi atualizado (deve estar dentro dos ultimos 5min)
generated_at=$(cat plugin-manifest.json | jq -r .generatedAt)
echo "generatedAt: $generated_at"
```

### Passo 5: Validar novos arquivos registrados

```bash
# Verificar que skill /todo-pick foi adicionada
cat plugin-manifest.json | jq -r '.files | keys[] | select(. | contains("todo-pick"))'
# Esperado: "skills/todo-pick/SKILL.md"

# Verificar hooks novos
cat plugin-manifest.json | jq -r '.files | keys[] | select(. | startswith("hooks/")) | select(. | contains("pre-mutation") or contains("state-md"))'
# Esperado: 2 linhas — pre-mutation-gate.cjs, state-md-hook.cjs

# Verificar scripts TS
cat plugin-manifest.json | jq -r '.files | keys[] | select(. | startswith("scripts/")) | select(. | endswith(".ts"))'
# Esperado: harness-validate.ts, compound-check.ts, state-regenerate.ts (+ qualquer analyze-metrics.ts existente)

# Verificar libs novas
cat plugin-manifest.json | jq -r '.files | keys[] | select(. | startswith("skills/lib/"))' | wc -l
# Esperado: >= 16 (8 existentes + ~8 novos)

# Verificar checksums sao todos SHA-256 (64 hex chars)
cat plugin-manifest.json | jq -r '.files | to_entries[] | .value.checksum' | awk '{ if (length($0) != 64) print "BAD: " $0 }'
# Esperado: nenhuma saida (todos checksums OK)
```

### Passo 6: Validar updateStrategy coerencia

PRD §170 (CHANGELOG v4.0.0) define semantica:
- `merge` — preserva modificacoes do usuario (e.g., CLAUDE.md, rules, config)
- `replace` — substitui sem perguntar (hooks, agents, skills oficiais, scripts)
- `never` — nunca toca (decisions.md — porque legacy)

Para os novos arquivos do v6, applicar coerencia:

```bash
# Skills novas devem ser "replace"
cat plugin-manifest.json | jq -r '.files["skills/todo-pick/SKILL.md"].updateStrategy'
# Esperado: "replace"

# Hooks novos devem ser "replace"
cat plugin-manifest.json | jq -r '.files["hooks/pre-mutation-gate.cjs"].updateStrategy'
# Esperado: "replace"

cat plugin-manifest.json | jq -r '.files["hooks/state-md-hook.cjs"].updateStrategy'
# Esperado: "replace"

# Scripts novos devem ser "replace"
cat plugin-manifest.json | jq -r '.files["scripts/harness-validate.ts"].updateStrategy'
# Esperado: "replace"

# Libs novas devem ser "replace"
cat plugin-manifest.json | jq -r '.files["skills/lib/completion-signal.md"].updateStrategy'
# Esperado: "replace"

# Templates harness novos devem ser "replace"
cat plugin-manifest.json | jq -r '.files | keys[] | select(. | contains("templates/harness"))' | head -3
# Esperado: ate 3 paths. Para cada, conferir:
for f in $(cat plugin-manifest.json | jq -r '.files | keys[] | select(. | contains("templates/harness"))'); do
  strat=$(cat plugin-manifest.json | jq -r ".files[\"$f\"].updateStrategy")
  echo "$f: $strat"
done
# Esperado: todos "replace"
```

Se `generate-manifest.js` aplicou strategy errada (e.g., `merge` para skill nova), corrigir manualmente via `jq`:

```bash
# Exemplo: forcar strategy para skill /todo-pick
jq '.files["skills/todo-pick/SKILL.md"].updateStrategy = "replace"' plugin-manifest.json > plugin-manifest.json.new
mv plugin-manifest.json.new plugin-manifest.json
```

### Passo 7: Validar contagem total de arquivos

```bash
# Comparar com baseline v5.3.0 (113 entradas conforme leitura inicial)
old=$(cat anti-vibe-coding/.release-backup/v5.3.0/plugin-manifest.json | jq '.files | length')
new=$(cat anti-vibe-coding/plugin-manifest.json | jq '.files | length')
echo "Old (5.3.0): $old files"
echo "New (6.0.0): $new files"
echo "Delta: $((new - old))"
```

Esperado: delta >= 10 (crescimento por adicao de skill, hooks, scripts, libs novas + templates harness). Se delta = 0 ou negativo, script nao detectou paths novos — investigar Passo 2.

### Passo 8: Commit isolado

```bash
git add anti-vibe-coding/plugin-manifest.json
# Possivelmente tambem scripts/generate-manifest.js se foi ajustado
git diff --staged --stat
git commit -m "chore(manifest): regenerate plugin-manifest.json for 6.0.0"
```

---

## Gotchas

- **G2 do plano (Plano 07 sequencing):** Esta fase **bloqueia** se `skills/todo-pick/SKILL.md` nao existe. Passo 1 detecta — abortar se MISSING.

- **G5 do plano (manifest regeneration usa ferramenta existente):** NAO reescrever `generate-manifest.js`. Apenas ajustar SE necessario, em mudanca minima. Lib pesada de SHA-256 + JSON ja esta testada via `scripts/__tests__/generate-manifest.test.ts`.

- **G9 do plano (commit granularity):** 1 commit isolado. NAO consolidar com fase-04 mesmo que sejam relacionados.

- **Local: drift entre `package.json:version` e `plugin-manifest.json:version`:** Apos fase-01 + fase-03, ambos devem ser `6.0.0`. Se gerador re-le `package.json` para obter versao, fase-01 ja garantiu. Se nao, env var `PLUGIN_VERSION=6.0.0` sobrescreve. Validar via diff entre os 2 jq.

- **Local: paths Windows com backslashes:** `generate-manifest.js` deve emitir paths POSIX (forward slash) mesmo em Windows — `path.posix.join` ou `.replace(/\\/g, '/')`. Conferir no output: NAO deve haver `\\` em chaves do `.files`.

- **Local: arquivos efemeros em `.release-backup/`:** O script NAO deve incluir `.release-backup/` em scan. Conferir ignorar lista — provavelmente `.gitignore`-style mas talvez hardcoded. Se aparece, adicionar `'.release-backup'` ao array de ignored prefixes do gerador.

- **Local: tamanho do manifest:** 113 entradas atuais com checksum + version + lastModified + updateStrategy = ~1100 linhas de JSON. Pos-v6 esperado ~130+ entradas = ~1300 linhas. Se output for 200 linhas, gerador silenciosamente travou.

- **Local: `lastModified` field:** Cada entry tem `"lastModified": "YYYY-MM-DD"`. Gerador pode preencher com `fs.statSync().mtime` OU com data ISO atual. Para arquivos novos, usar data atual (release date). Para arquivos existentes, **preservar** lastModified original (o file nao mudou — apenas sua versao registrada subiu). Conferir comportamento; se sobrescreveu tudo com hoje, eh visualmente quebrado mas funcionalmente OK (checksum detecta diff verdadeira).

---

## Verificacao

### TDD

NAO aplica diretamente — gerador eh ferramenta existente. Mas `scripts/__tests__/generate-manifest.test.ts` ja existe; rodar:

```bash
cd anti-vibe-coding
bun test scripts/__tests__/generate-manifest.test.ts
# Esperado: exit 0
```

Se quebrar, eh sinal de que mudanca em `scripts/generate-manifest.js` (Passo 2) introduziu regressao.

### Checklist

- [ ] Backup criado: `anti-vibe-coding/.release-backup/v5.3.0/plugin-manifest.json.fase01`
- [ ] `cat anti-vibe-coding/plugin-manifest.json | jq -r .version` = `6.0.0`
- [ ] `cat anti-vibe-coding/plugin-manifest.json | jq -r .generatedAt` retorna ISO timestamp recente (ultimos 5min)
- [ ] `cat anti-vibe-coding/plugin-manifest.json | jq -e .files | length` >= 123 (delta esperado: +10 de skill/hooks/scripts/libs novos)
- [ ] Skill /todo-pick registrada: `jq '.files["skills/todo-pick/SKILL.md"]'` retorna objeto valido
- [ ] Hook pre-mutation-gate registrado: `jq '.files["hooks/pre-mutation-gate.cjs"]'` retorna objeto valido
- [ ] Hook state-md-hook registrado: `jq '.files["hooks/state-md-hook.cjs"]'` retorna objeto valido
- [ ] Script harness-validate registrado: `jq '.files["scripts/harness-validate.ts"]'` retorna objeto valido
- [ ] Script compound-check registrado: `jq '.files["scripts/compound-check.ts"]'` retorna objeto valido
- [ ] Todos os novos arquivos tem `updateStrategy = "replace"` (verificado via loop)
- [ ] Todos os checksums sao SHA-256 de 64 chars hex (validacao via awk no Passo 5)
- [ ] Paths sao POSIX (forward slash) — `grep -c '\\\\' plugin-manifest.json` = 0
- [ ] `bun test scripts/__tests__/generate-manifest.test.ts` exit 0
- [ ] Commit criado: `chore(manifest): regenerate plugin-manifest.json for 6.0.0`

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding

# Manifest version
test "$(jq -r .version plugin-manifest.json)" = "6.0.0" && \
# Skill /todo-pick presente
jq -e '.files["skills/todo-pick/SKILL.md"]' plugin-manifest.json > /dev/null && \
# Hooks novos
jq -e '.files["hooks/pre-mutation-gate.cjs"]' plugin-manifest.json > /dev/null && \
jq -e '.files["hooks/state-md-hook.cjs"]' plugin-manifest.json > /dev/null && \
# Scripts novos
jq -e '.files["scripts/harness-validate.ts"]' plugin-manifest.json > /dev/null && \
jq -e '.files["scripts/compound-check.ts"]' plugin-manifest.json > /dev/null && \
# Todos checksums SHA-256
test "$(jq -r '.files | to_entries[] | .value.checksum' plugin-manifest.json | awk 'length != 64' | wc -l)" = "0" && \
# Todas versoes per-file sao 6.0.0
test "$(jq -r '.files | to_entries[] | .value.version' plugin-manifest.json | sort -u)" = "6.0.0" && \
echo "PASS"
```

Esperado: `PASS`.

**Referencia ao CA:**
- **PRD §470:** "plugin-manifest.json — ATUALIZADO — refletir nova skill /todo-pick"
- Suporta CA-34 (versao consistente) e indiretamente CA-35 (CHANGELOG menciona arquivos novos cujos paths vem deste manifest).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
