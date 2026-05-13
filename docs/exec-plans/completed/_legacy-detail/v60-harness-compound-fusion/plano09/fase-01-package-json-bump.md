<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem.
NÃO aplica nesta fase — apenas mudancas em campos JSON declarativos.
-->

# Fase 01: Package Version Bump (5.3.0 -> 6.0.0)

**Plano:** 09 — Versioning & Release
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase; entrada do plano)
**Visual:** false

---

## O que esta fase entrega

Tres arquivos JSON do plugin (package.json, .claude-plugin/plugin.json, plugin-manifest.json campo top-level `"version"`) migram de `"5.3.0"` para `"6.0.0"` sem quebrar nenhum script existente. CA-34 verbatim.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/package.json` | Modify | Campo `"version": "5.3.0"` → `"version": "6.0.0"` (linha 3). Nada mais muda — `name`, `type`, `scripts`, `devDependencies` permanecem. |
| `anti-vibe-coding/.claude-plugin/plugin.json` | Modify | Campo `"version": "5.3.0"` → `"version": "6.0.0"` (linha 3). Atualizar tambem `description` para refletir v6 (mencionar "Harness + Compound Fusion") em uma sentenca curta. |
| `anti-vibe-coding/plugin-manifest.json` | Modify | Apenas o campo top-level `"version": "5.3.0"` → `"version": "6.0.0"` (linha 2) **nesta fase**. Os 113+ checksums por-arquivo e campo `"generatedAt"` sao regenerados em fase-03 (separacao consciente — fase-01 faz mudanca minima, fase-03 regenera estado completo). |

---

## Implementacao

### Passo 1: Backup de seguranca dos 3 arquivos

Antes de qualquer mudanca, garantir snapshot recuperavel:

```bash
# Criar pasta de backup do release (idempotente)
mkdir -p anti-vibe-coding/.release-backup/v5.3.0/

cp anti-vibe-coding/package.json anti-vibe-coding/.release-backup/v5.3.0/package.json
cp anti-vibe-coding/.claude-plugin/plugin.json anti-vibe-coding/.release-backup/v5.3.0/plugin.json
cp anti-vibe-coding/plugin-manifest.json anti-vibe-coding/.release-backup/v5.3.0/plugin-manifest.json

# Verificacao: 3 arquivos no backup
ls -la anti-vibe-coding/.release-backup/v5.3.0/
```

Justificativa: G1 do CLAUDE.md global ("Limpar Antes de Construir") + G2 do README ("safety em acoes destrutivas"). Backup permite `git checkout` reverso se commit posterior corromper.

### Passo 2: Editar `package.json`

Estado atual (linhas 1-13):

```json
{
  "name": "anti-vibe-coding",
  "version": "5.3.0",
  "type": "module",
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/bun": "latest"
  }
}
```

Mudanca minima (apenas linha 3):

```json
{
  "name": "anti-vibe-coding",
  "version": "6.0.0",
  ...
}
```

NAO adicionar scripts `harness:validate` ou `compound:check` neste momento — esses entram em Plano 04 fase-05 (que **deve** ter executado antes deste plano via Plano 08 fase-08). Se nao estiverem la, **escopo de fase-01 NAO inclui adiciona-los** — sinalizar para o user e adicionar em fase-03 (idealmente) ou pedir revisao do Plano 04.

Use ferramenta Edit:

```
file_path: f:/Projetos/Claude code/anti-vibe-coding/package.json
old_string: "version": "5.3.0",
new_string: "version": "6.0.0",
```

### Passo 3: Editar `.claude-plugin/plugin.json`

Estado atual (linhas 1-43):

```json
{
  "name": "anti-vibe-coding",
  "version": "5.3.0",
  "description": "Plugin de desenvolvimento disciplinado com conhecimentos de programador sênior. Automatiza TDD, segurança, autorização, design patterns, SOLID, system design, infraestrutura, API protocols e qualidade de código usando hooks, skills, agents e rules. v5.3: Plugin Adaptativo — Architecture Detector (5 perfis), Modo Dual em skills estruturantes, Telemetria Passiva, 5 Princípios Universais.",
  ...
}
```

Duas mudancas:

1. **Versao:** `"version": "5.3.0"` → `"version": "6.0.0"`
2. **Descricao:** Atualizar para mencionar v6 highlights. Sugestao (≤ 250 chars para nao quebrar UI de marketplace):

```
"description": "Plugin de desenvolvimento disciplinado com conhecimentos de programador sênior. v6.0.0 — Harness + Compound Engineering Fusion: AGENTS.md institucional, docs/* layered, validadores TS+bun (harness:validate + compound:check), /todo-pick, exec-plans + compound notes."
```

Justificativa: descricao atual cita "v5.3" explicitamente; manter padrao mencionando a versao + tema principal.

Use ferramenta Edit (em 2 passos para evitar match ambiguity):

```
Edit 1:
file_path: f:/Projetos/Claude code/anti-vibe-coding/.claude-plugin/plugin.json
old_string: "version": "5.3.0",
new_string: "version": "6.0.0",

Edit 2:
file_path: f:/Projetos/Claude code/anti-vibe-coding/.claude-plugin/plugin.json
old_string: "description": "Plugin de desenvolvimento disciplinado com conhecimentos de programador sênior. Automatiza TDD, segurança, autorização, design patterns, SOLID, system design, infraestrutura, API protocols e qualidade de código usando hooks, skills, agents e rules. v5.3: Plugin Adaptativo — Architecture Detector (5 perfis), Modo Dual em skills estruturantes, Telemetria Passiva, 5 Princípios Universais.",
new_string: "description": "Plugin de desenvolvimento disciplinado com conhecimentos de programador sênior. v6.0.0 — Harness + Compound Engineering Fusion: AGENTS.md institucional, docs/* layered, validadores TS+bun (harness:validate + compound:check), /todo-pick, exec-plans + compound notes.",
```

NAO mexer em `keywords[]` neste momento — adicionar 2-3 keywords novas em fase-03 quando regenerar manifest completo (e.g., `harness-engineering`, `compound-engineering`, `agents-md`). Fase-01 fica minima.

### Passo 4: Editar campo top-level de `plugin-manifest.json`

Estado atual (linhas 1-4):

```json
{
  "version": "5.3.0",
  "generatedAt": "2026-05-05T17:57:26.107Z",
  "description": "Manifest de arquivos gerenciados pelo plugin Anti-Vibe Coding",
  "files": { ... 113+ entradas ... }
}
```

**APENAS** alterar `"version": "5.3.0"` → `"version": "6.0.0"` no top-level. NAO tocar em:
- `"generatedAt"` (sera atualizado em fase-03 pelo script `generate-manifest.js`)
- Nenhum dos 113+ entries em `"files"` (versao por-arquivo + checksum SHA-256 sao regenerados em fase-03)

Use ferramenta Edit com primeiro match (top-level eh a linha 2):

```
file_path: f:/Projetos/Claude code/anti-vibe-coding/plugin-manifest.json
old_string: {
  "version": "5.3.0",
  "generatedAt":
new_string: {
  "version": "6.0.0",
  "generatedAt":
```

Justificativa para a divisao fase-01 vs fase-03: minimizar superficie de mudanca por commit. Fase-01 produz 1 commit pequeno e auditavel (`chore(release): bump version to 6.0.0`). Fase-03 produz outro commit logico (`chore(manifest): regenerate plugin-manifest.json for 6.0.0`). Em caso de rollback parcial (CA-36), reverter apenas fase-03 mantem o version bump trivial — comportamento esperado pelo PRD.

### Passo 5: Validacao imediata pos-edit

Conferir que as 3 mudancas pegaram E nada mais mudou:

```bash
# Versao em cada arquivo deve ser exatamente "6.0.0"
cat anti-vibe-coding/package.json | jq -r .version
# Esperado: 6.0.0

cat anti-vibe-coding/.claude-plugin/plugin.json | jq -r .version
# Esperado: 6.0.0

cat anti-vibe-coding/plugin-manifest.json | jq -r .version
# Esperado: 6.0.0

# Confirmar que outros campos NAO foram tocados
diff anti-vibe-coding/package.json anti-vibe-coding/.release-backup/v5.3.0/package.json
# Esperado: APENAS linha 3 (version) muda
```

### Passo 6: Rodar scripts existentes para confirmar nao-regressao

CA-34 exige que "todos scripts ainda funcionam" apos bump:

```bash
cd anti-vibe-coding

# Testes existentes ainda passam
bun test 2>&1 | tail -20
# Esperado: exit 0 (todos testes passam)

# Type-check ainda passa
bun run typecheck
# Esperado: exit 0 (zero erros TS)
```

Se algum script falhar, ROLLBACK imediato:

```bash
cp anti-vibe-coding/.release-backup/v5.3.0/package.json anti-vibe-coding/package.json
cp anti-vibe-coding/.release-backup/v5.3.0/plugin.json anti-vibe-coding/.claude-plugin/plugin.json
cp anti-vibe-coding/.release-backup/v5.3.0/plugin-manifest.json anti-vibe-coding/plugin-manifest.json
```

E investigar — version field puro nao deveria quebrar scripts; se quebrou, ha lock por versao em algum lugar inesperado (cache, hook).

### Passo 7: Commit isolado

```bash
cd anti-vibe-coding

# Adicionar APENAS os 3 arquivos modificados (NAO `git add -A`)
git add package.json .claude-plugin/plugin.json plugin-manifest.json

# Verificar diff staged eh minimo
git diff --staged

# Commit semantico
git commit -m "chore(release): bump version to 6.0.0"
```

**NAO incluir** `.release-backup/` no commit — adicionar a `.gitignore` se nao estiver:

```bash
grep -q "^\.release-backup/" anti-vibe-coding/.gitignore || \
  echo ".release-backup/" >> anti-vibe-coding/.gitignore
```

---

## Gotchas

- **G9 do plano (commit granularity):** Esta fase produz **1 commit isolado** (`chore(release): bump version to 6.0.0`) para permitir `git revert` cirurgico em fase-05. NAO consolidar com mudancas posteriores.

- **G2 do plano (Plano 07 sequencing):** Esta fase NAO depende de Plano 07 (so muda version field). Pode rodar mesmo se /todo-pick ainda nao existir. Apenas fase-03 (regenerate manifest) depende.

- **G8 do plano (CA-37 fora de escopo):** NAO validar fixtures do plugin nesta fase. Apenas confirmar que `bun test` (testes existentes) e `bun run typecheck` passam. CA-37 (fixtures novas) eh gate de fase-05.

- **Local: 3 arquivos vs 4 (`.anti-vibe-manifest.json` LOCAL no projeto-alvo):** O arquivo `.claude/.anti-vibe-manifest.json` gerado pelo `/init` em projeto-alvo NAO eh parte deste plano — eh recriado por cada usuario via `/init`. Apenas os 3 arquivos no repo do plugin precisam mudar.

- **Local: campo `"description"` em plugin.json eh livre-form:** A descricao sugerida no Passo 3 eh inicial — se o user preferir outra sentenca, ajustar. Importante manter ≤250 chars e mencionar "v6.0.0".

- **Local: timestamp `generatedAt` em plugin-manifest.json — NAO atualizar agora:** Fase-01 deixa intencionalmente o timestamp antigo (`2026-05-05T17:57:26.107Z`). Fase-03 regenera. Documentar no commit message para evitar confusao em code review.

---

## Verificacao

### TDD

NAO aplica — mudanca declarativa de version field. Sem RED/GREEN.

### Checklist

- [ ] Backup criado em `anti-vibe-coding/.release-backup/v5.3.0/` (3 arquivos)
- [ ] `cat anti-vibe-coding/package.json | jq -r .version` retorna `6.0.0`
- [ ] `cat anti-vibe-coding/.claude-plugin/plugin.json | jq -r .version` retorna `6.0.0`
- [ ] `cat anti-vibe-coding/plugin-manifest.json | jq -r .version` retorna `6.0.0`
- [ ] `cat anti-vibe-coding/.claude-plugin/plugin.json | jq -r .description` menciona "v6.0.0" e "Harness"
- [ ] `diff anti-vibe-coding/package.json anti-vibe-coding/.release-backup/v5.3.0/package.json` mostra **apenas** linha de version
- [ ] `bun test` (rodado em `anti-vibe-coding/`) retorna exit 0
- [ ] `bun run typecheck` retorna exit 0
- [ ] `git diff --staged` mostra **apenas** os 3 arquivos esperados
- [ ] Commit criado: `chore(release): bump version to 6.0.0` (1 commit, nao squashed)
- [ ] `git log --oneline -1` mostra o commit no topo
- [ ] `.release-backup/` adicionado a `.gitignore` (nao versionado)

---

## Criterio de Aceite

**Por maquina (CA-34 verbatim):**

```bash
test "$(cat anti-vibe-coding/package.json | jq -r .version)" = "6.0.0" && \
test "$(cat anti-vibe-coding/.claude-plugin/plugin.json | jq -r .version)" = "6.0.0" && \
test "$(cat anti-vibe-coding/plugin-manifest.json | jq -r .version)" = "6.0.0" && \
(cd anti-vibe-coding && bun test && bun run typecheck) && \
echo "PASS"
```

Esperado: `PASS` printado e exit code 0. SemVer sem warnings — bun aceita `6.0.0` como valido (major.minor.patch).

**Referencia ao CA:**
- **CA-34 (PRD §438):** "Dado `package.json` do plugin, quando inspecionar, então `"version": "6.0.0"`."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
