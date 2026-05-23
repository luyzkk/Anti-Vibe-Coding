<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-22 (Luiz/dev): manifest regerado apos 3 skills novas — SH-05`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 04: Regenerar manifest + plugin.json (3 skills novas)

**Plano:** 03 — Skills Novas (source-driven, doubt-driven, git-workflow)
**Sizing:** 0.5h
**Depende de:** fase-01, fase-02, fase-03 (as 3 skills precisam existir em disco antes de regerar manifest)
**Visual:** false

---

## O que esta fase entrega

`plugin-manifest.json` regenerado com entries para as 3 skills novas (`source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning`) tanto no indice top-level `skills` quanto no mapa `files` com checksums SHA-256 calculados pelo `scripts/generate-manifest.js`. `.claude-plugin/plugin.json` validado — analise da estrutura atual confirma se requer adicao manual de campo `skills` ou se manifest sozinho ja cobre (descobrir no Passo 1). Tudo verde apos `bun run harness:validate && bun run test && bun run lint`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `plugin-manifest.json` | Modify | Regenerado via `node scripts/generate-manifest.js` (auto-inclui as 3 skills novas + checksums SHA-256) |
| `.claude-plugin/plugin.json` | Modify (se necessario) | Bump de `description` ou adicao das 3 skills no array (descobrir em Passo 1 — `plugin.json` atual NAO lista skills explicitamente; provavel SEM mudanca) |

---

## Implementacao

### Passo 1: Inspecionar estrutura atual e descobrir se `plugin.json` requer alteracao

```bash
# 2026-05-22 (Luiz/dev): inspecionar antes de tocar — verificar campo skills em plugin.json
cat .claude-plugin/plugin.json | head -50
```

**Estado atual conhecido** (lido em planejamento):
- `.claude-plugin/plugin.json` tem `name`, `version: "7.1.0"`, `description`, `author`, `license`, `keywords`. **NAO tem campo `skills` explicito** — descoberta automatica via filesystem.
- `plugin-manifest.json` (gerado por `scripts/generate-manifest.js`) tem mapa `skills` top-level + mapa `files`.

**Decisao:**
- Se `plugin.json` continua sem campo `skills`: NAO modificar `plugin.json`. Manifest sozinho cumpre SH-05.
- Se aparecer campo `skills` em algum momento da Wave 2 (improvavel — fora do escopo deste plano): adicionar entries `source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning` no array.

**Inspecao final antes de prosseguir:**

```bash
grep -E '"skills"|skills:' .claude-plugin/plugin.json
# Se retornar 0 hits: NAO tocar plugin.json (passo 2 e direto)
# Se retornar hits: ler e adaptar manualmente — fora do escopo padrao desta fase
```

### Passo 2: Regenerar `plugin-manifest.json` (G4 do README)

```bash
# 2026-05-22 (Luiz/dev): regerar manifest — captura 3 skills novas + recalcula SHA-256
PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js
```

**Por que `PLUGIN_VERSION=7.1.0`:** o script tem default `'6.0.0'` (linha 14). Sem exportar a env var, manifest sai com versao errada. Versao atual e `7.1.0` (do `plugin.json` linha 3).

**Output esperado (sucesso):**

```
✓ plugin-manifest.json gerado com sucesso
✓ Versão: 7.1.0
✓ Total de arquivos: <N + 3>
✓ Skills indexadas: <M + 3>

Estratégias de atualização:
  - Merge: ...
  - Replace: ...
  - Never: ...
```

O numero de skills deve ter aumentado em 3 vs baseline pre-fase.

### Passo 3: Verificar entries das 3 skills no manifest gerado

```bash
# 2026-05-22 (Luiz/dev): verificar que as 3 skills entraram no manifest
grep -E '"(source-driven-development|doubt-driven-development|git-workflow-and-versioning)"' plugin-manifest.json
# Esperado: 6+ hits (cada skill aparece em "skills" top-level e em "files")
```

Validacao de checksums SHA-256 nao-vazios:

```bash
# Cada skill deve ter um checksum SHA-256 valido (64 chars hex)
node -e "
const m = require('./plugin-manifest.json');
const skills = ['source-driven-development', 'doubt-driven-development', 'git-workflow-and-versioning'];
skills.forEach(s => {
  const filePath = 'skills/' + s + '/SKILL.md';
  const entry = m.files[filePath];
  if (!entry) { console.error('MISSING in files map:', filePath); process.exit(1); }
  if (!/^[a-f0-9]{64}$/.test(entry.checksum)) { console.error('INVALID checksum for', filePath, '->', entry.checksum); process.exit(1); }
  if (!m.skills[s]) { console.error('MISSING in skills index:', s); process.exit(1); }
  console.log('OK', s, '->', entry.checksum.slice(0,12) + '...');
});
console.log('All 3 new skills validated.');
"
```

Saida esperada: 3 linhas `OK ... -> <hash>...` + `All 3 new skills validated.`

### Passo 4: Confirmar nenhum arquivo fora de escopo foi modificado

```bash
# 2026-05-22 (Luiz/dev): garantia de escopo — so plugin-manifest.json (e talvez plugin.json) tocado
git status --short
# Esperado:
# M plugin-manifest.json
# (opcional) M .claude-plugin/plugin.json
# (das fases 01/02/03) ?? skills/source-driven-development/SKILL.md
# (das fases 01/02/03) ?? skills/doubt-driven-development/SKILL.md
# (das fases 01/02/03) ?? skills/git-workflow-and-versioning/SKILL.md
```

Se aparecer qualquer outro arquivo modificado nesta fase, INVESTIGAR — `generate-manifest.js` so deveria tocar `plugin-manifest.json`.

### Passo 5: Validacao final — harness + tests + lint

```bash
# 2026-05-22 (Luiz/dev): pipeline canonico de validacao
bun run harness:validate && bun run test && bun run lint
```

**Se algum dos 3 falhar:**

1. **harness:validate falha:** revisar mensagem — provavel frontmatter de alguma skill nova esta incompleto (volta para fase-01/02/03 e corrige).
2. **test falha:** identificar suite quebrada. Se for `tests/e2e/init-*` ou similar que testa manifest, pode ser que goldens precisem regeneracao — registrar em MEMORY como `DI` e regerar conforme padrao do projeto (ver Plano 05 fase-06 do PRD populate-plan-andre-port no MEMORY do projeto).
3. **lint falha:** tipicamente lint de markdown ou de scripts. Ler erro e corrigir.

---

## Gotchas

- **G4 do plano (manifest regerado, nao manual):** NUNCA editar `plugin-manifest.json` a mao. Sempre rodar `scripts/generate-manifest.js`. Edit manual gera divergencia entre checksum no manifest e conteudo real do disco — proxima execucao do script vai "desfazer" o edit.
- **G5 do plano (harness:validate e gate):** Passo 5 e o gate canonico. NAO marcar fase como concluida com harness falhando.
- **Local — PLUGIN_VERSION env var:** o script tem default `'6.0.0'` (linha 14 do generate-manifest.js). Sempre exportar `PLUGIN_VERSION=7.1.0` antes de rodar nesta fase. Outras versoes em waves futuras ajustam.
- **Local — `plugin.json` provavelmente nao precisa mudanca:** estado atual NAO lista skills no array — descoberta e automatica via filesystem. Decisao confirma no Passo 1.
- **Local — goldens de E2E:** se `tests/e2e/init-cutover-greenfield.test.ts` ou similar comparar contra um golden de manifest, adicionar 3 skills pode quebrar o golden. MEMORY do projeto tem precedente: Plano 05 fase-06 do PRD populate-plan-andre-port regerou goldens nesta situacao. Se quebrar, regerar e registrar em MEMORY como DI.
- **Local — `bun run harness:validate` executa `bun scripts/harness-validate.ts .` (do package.json linha 11):** se mudar o script, sincronizar com docs.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** `plugin-manifest.json` NAO contem entries das 3 skills novas antes do Passo 2
  - Comando: `grep -cE '"(source-driven-development|doubt-driven-development|git-workflow-and-versioning)"' plugin-manifest.json`
  - Resultado esperado: 0 hits (antes da regeneracao)
- [ ] **GREEN apos Passo 2:** entries presentes com checksums validos
  - Comando: o node inline do Passo 3
  - Resultado esperado: `All 3 new skills validated.`

### Checklist

- [ ] `plugin-manifest.json` contem as 3 skills no indice `skills`: `node -e "const m=require('./plugin-manifest.json'); ['source-driven-development','doubt-driven-development','git-workflow-and-versioning'].forEach(s=>{if(!m.skills[s]){console.error('MISSING',s);process.exit(1)}}); console.log('OK')"` retorna `OK`
- [ ] `plugin-manifest.json` contem as 3 skills no mapa `files`: idem para `m.files['skills/<name>/SKILL.md']`
- [ ] Cada uma das 3 entries tem `checksum` SHA-256 nao-vazio (64 chars hex)
- [ ] `version` no manifest corresponde a `7.1.0` (do plugin.json)
- [ ] `.claude-plugin/plugin.json` continua intacto OU foi atualizado conforme decisao do Passo 1 (sem campo skills no estado atual = sem mudanca)
- [ ] Nenhum outro arquivo modificado alem do esperado: `git status --short` so mostra os arquivos das fases 01/02/03 + `plugin-manifest.json`
- [ ] Harness validate verde: `bun run harness:validate`
- [ ] Tests verdes: `bun run test`
- [ ] Lint verde: `bun run lint`

---

## Criterio de Aceite

**Por maquina (SH-05 do PRD):**

```bash
# Valida atomicamente: 3 skills no manifest + checksums validos + pipeline verde
node -e "
const m = require('./plugin-manifest.json');
const skills = ['source-driven-development', 'doubt-driven-development', 'git-workflow-and-versioning'];
const allOk = skills.every(s => {
  const filePath = 'skills/' + s + '/SKILL.md';
  return m.skills[s] && m.files[filePath] && /^[a-f0-9]{64}$/.test(m.files[filePath].checksum);
});
process.exit(allOk ? 0 : 1);
" \
  && bun run harness:validate \
  && bun run test \
  && bun run lint
```

Retorno esperado: exit code 0.

**Por humano:**
- `git diff plugin-manifest.json` mostra as 3 novas entradas com checksums SHA-256 + recalculacao de quaisquer outros arquivos que mudaram entre rodadas (esperado: apenas as 3 novas; se houver mais, investigar).
- `.claude-plugin/plugin.json` consistente com plano (sem mudanca ou com mudanca controlada conforme Passo 1).

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
