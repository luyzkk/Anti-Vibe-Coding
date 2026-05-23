<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): regeracao final do manifest captura delta de fase-01`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 02: Regenerar manifest final + validacao consolidada da Wave 2

**Plano:** 04 — Pedagogia ADR + Validacao Final (Wave 2)
**Sizing:** 1h
**Depende de:** fase-01 deste plano + Plano 02 fase-04 + Plano 03 fase-04
**Visual:** false

---

## O que esta fase entrega

`plugin-manifest.json` regenerado pela ULTIMA vez na Wave 2, capturando todos os deltas acumulados: 13 agentes refinados via Plano 02 (contract v2.0.0 + 5 patterns), 3 skills novas via Plano 03 (`source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning`), e pedagogia ADR adicionada via fase-01 deste (checksum de `decision-registry/SKILL.md` muda). Pipeline canonico `bun run harness:validate && bun run test && bun run lint` verde. CA-11 confirmado mecanicamente (`git diff` sobre `skills/verify-work/SKILL.md` vazio). Exit Criteria do PLAN.md validados ponto-a-ponto (8 checkpoints). Wave 2 encerrada.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `plugin-manifest.json` | Modify | Regenerado via `PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js` — captura checksums atualizados de todos os agentes + 3 skills novas + `decision-registry/SKILL.md` (pos-fase-01) |
| `.claude-plugin/plugin.json` | Modify (se necessario) | Provavel SEM mudanca — `plugin.json` atual NAO lista skills explicitamente (descoberta automatica). Validar no Passo 1; se mudou em algum plano anterior, ajustar |

---

## Implementacao

### Passo 1: Inspecao pre-regerar — confirmar que TODOS os bloqueadores estao prontos

```bash
# 2026-05-23 (Luiz/dev): porta de entrada da fase — sem isso, a regeneracao captura estado inconsistente

# 1) 13 agentes refinados (Plano 02 fase-04 entregou contract v2.0.0 uniforme)
grep -l 'contract_version: "2.0.0"' agents/*.md | wc -l
# Esperado: 13. Se < 13, voltar para Plano 02 e completar.

# 2) 3 skills novas existem (Plano 03 fases 01/02/03 entregaram)
ls skills/source-driven-development/SKILL.md \
   skills/doubt-driven-development/SKILL.md \
   skills/git-workflow-and-versioning/SKILL.md
# Esperado: 3 arquivos listados, nenhum ENOENT. Se faltar algum, voltar para Plano 03.

# 3) Pedagogia ADR adicionada (fase-01 deste plano)
grep -c "## When to Write an ADR" skills/decision-registry/SKILL.md
# Esperado: 1. Se 0, voltar para fase-01.

# 4) plugin.json continua sem campo "skills" explicito (descoberta automatica)
grep -E '"skills"' .claude-plugin/plugin.json | head -3
# Esperado: 0 hits (estado atual confirmado no planejamento)

# 5) Snapshot do manifest atual para diff posterior (REFACTOR check)
cp plugin-manifest.json /tmp/manifest-pre.json
```

**Estado esperado dos bloqueadores:**
- 13/13 agentes com `contract_version: "2.0.0"`
- 3 skills novas presentes
- Pedagogia ADR adicionada
- `plugin.json` sem campo `skills` (descoberta automatica)
- Snapshot pre-regeracao salvo

Se qualquer um falhar, ABORTAR a fase e registrar em MEMORY como bloqueador.

### Passo 2: Regenerar manifest com PLUGIN_VERSION explicita (G3 do README)

```bash
# 2026-05-23 (Luiz/dev): SEGUNDA regeracao da Wave 2 — captura delta de fase-01 (decision-registry)
PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js
```

**Por que `PLUGIN_VERSION=7.1.0`:** script tem default `'6.0.0'` (linha 14 de `scripts/generate-manifest.js`). Sem env var, manifest sai com versao errada. Versao atual confirmada em `.claude-plugin/plugin.json` linha 3.

**Output esperado (sucesso):**

```
✓ plugin-manifest.json gerado com sucesso
✓ Versão: 7.1.0
✓ Total de arquivos: <N> (consistente com plano03 fase-04 + delta pequeno se algum arquivo mudou)
✓ Skills indexadas: <M> (incluindo as 3 novas + decision-registry com checksum NOVO)
```

### Passo 3: Verificar checksums das 4 skills criticas (3 novas + decision-registry refrescada)

```bash
# 2026-05-23 (Luiz/dev): validar que manifest tem entries para as 4 skills com SHA-256 valido
node -e "
const m = require('./plugin-manifest.json');
const skills = ['source-driven-development', 'doubt-driven-development', 'git-workflow-and-versioning', 'decision-registry'];
skills.forEach(s => {
  const fp = 'skills/' + s + '/SKILL.md';
  const entry = m.files[fp];
  if (!entry || !/^[a-f0-9]{64}$/.test(entry.checksum)) { console.error('FAIL', s); process.exit(1); }
  if (!m.skills[s]) { console.error('MISSING skills index', s); process.exit(1); }
  console.log('OK', s, '->', entry.checksum.slice(0,12) + '...');
});
console.log('All 4 skills validated (3 new + decision-registry refreshed).');
"
```

Saida esperada: 4 linhas `OK ... -> <hash>...` + `All 4 skills validated`.

**Diff de checksum esperado em `decision-registry`:** comparar com snapshot pre-regeracao:

```bash
node -e "
const pre = require('/tmp/manifest-pre.json');
const post = require('./plugin-manifest.json');
const fp = 'skills/decision-registry/SKILL.md';
const ck_pre = pre.files[fp] ? pre.files[fp].checksum : 'MISSING';
const ck_post = post.files[fp] ? post.files[fp].checksum : 'MISSING';
console.log('pre:  ' + ck_pre);
console.log('post: ' + ck_post);
if (ck_pre === ck_post) { console.error('FAIL: checksum did NOT change — fase-01 nao efetiva?'); process.exit(1); }
console.log('OK: checksum mudou — pedagogia ADR refletida no manifest.');
"
```

### Passo 4: Verificar checksums dos 13 agentes refinados (Plano 02 entregou contract v2.0.0)

```bash
# 2026-05-23 (Luiz/dev): garantir que os 13 agentes estao indexados no manifest com checksums validos
node -e "
const m = require('./plugin-manifest.json');
const fs = require('fs');
const agents = fs.readdirSync('agents').filter(f => f.endsWith('.md'));
if (agents.length !== 13) { console.error('Expected 13 agents, got', agents.length); process.exit(1); }
agents.forEach(a => {
  const fp = 'agents/' + a;
  const entry = m.files[fp];
  if (!entry || !/^[a-f0-9]{64}$/.test(entry.checksum)) { console.error('FAIL', fp); process.exit(1); }
});
console.log('All 13 agents have valid SHA-256 checksums in manifest.');
"
```

Saida esperada: `All 13 agents have valid SHA-256 checksums in manifest.`

### Passo 5: CA-11 — confirmar que `verify-work` continua intocado (compatibilidade backward por adicao-only)

```bash
# 2026-05-23 (Luiz/dev): CA-11 do PRD — refactor da Wave 2 NAO pode quebrar callers
# skills/verify-work/SKILL.md e o caller principal dos 13 agentes; nao tocado nesta wave

git diff --name-only origin/main..HEAD -- skills/verify-work/SKILL.md
# Esperado: vazio (zero linhas)
```

**Se voltar com diff (qualquer linha):** INVESTIGAR. Pode indicar:
- Subagente do Plano 02 editou `verify-work` por engano (fora do escopo)
- Edit acidental durante validacao manual
- Outro plano da wave tocou indevidamente

Acoes:
- Inspecionar o diff: `git diff origin/main..HEAD -- skills/verify-work/SKILL.md`
- Decidir: reverter (`git checkout origin/main -- skills/verify-work/SKILL.md`) ou registrar como DI consciente no MEMORY se a mudanca for legitima e necessaria.

### Passo 6: Validacao final consolidada — pipeline canonico Wave 2

```bash
# 2026-05-23 (Luiz/dev): GATE FINAL da Wave 2 — sem este verde, wave nao encerra
bun run harness:validate && bun run test && bun run lint
```

**Se algum dos 3 falhar:**

1. **harness:validate falha:**
   - Revisar mensagem de erro. Provavel causa: frontmatter incompleto em alguma skill nova, ou broken-link no markdown da fase-01.
   - Se for fence aninhado em `decision-registry/SKILL.md` (G4 do README local), aplicar alternativa de codeblock indentado.
2. **test falha:**
   - Identificar suite quebrada. Padrao comum: `tests/e2e/init-cutover-greenfield.test.ts` (goldens de manifest). Precedente: Plano 05 fase-06 do PRD populate-plan-andre-port regerou goldens — MEMORY global tem o procedimento.
   - Se for teste de agente (validador do schema v2.0.0), pode ser que algum agente do Plano 02 nao siga o gold standard — voltar e corrigir.
3. **lint falha:**
   - Tipicamente lint de markdown (TS/JS nao foi tocado nesta fase). Ler erro e corrigir.

### Passo 7: Validar Exit Criteria do PLAN.md ponto-a-ponto

Abrir [PLAN.md](../PLAN.md) secao `## Exit Criteria` (linhas ~144-153) e marcar cada checkpoint:

- [ ] **CA-01 a CA-12 do PRD verificados (12 criterios de aceite)** — validados ao longo de Planos 01/02/03/04. Confere via grep batch dos agentes (Plano 02 fase-04) + harness:validate (Plano 03 fase-04 + fase-02 deste).
- [ ] **13/13 agentes refinados com 5 patterns aplicados** — Passo 1 deste fase ja contou 13. Confirmar adicionalmente:
  ```bash
  for a in agents/*.md; do
    has_oc=$(grep -c "## Output Contract" "$a")
    has_ad=$(grep -c "## Anti-Degeneration Rules" "$a")
    has_cp=$(grep -c "## Composition" "$a")
    if [ "$has_oc" -lt 1 ] || [ "$has_ad" -lt 1 ] || [ "$has_cp" -lt 1 ]; then echo "FAIL $a"; fi
  done
  # Esperado: zero linhas de output (todos os 13 tem as 3 secoes)
  ```
- [ ] **>=52 regras anti-degeneracao catalogadas no plugin (13 x >=4)** — Plano 02 fase-04 entrega grep batch oficial. Re-checar:
  ```bash
  # Contar bullets sob "## Anti-Degeneration Rules" em cada agente (heuristica)
  for a in agents/*.md; do
    count=$(awk '/^## Anti-Degeneration Rules/,/^## /{ if (/^- /) print }' "$a" | wc -l)
    echo "$a: $count rules"
  done
  # Esperado: cada agente >=4. Soma total >=52.
  ```
- [ ] **3 skills novas existem e validam** — Passo 1 confirma existencia; Passo 3 confirma checksums + indexacao no manifest.
- [ ] **`decision-registry` tem `## When to Write an ADR` com tabela "Common Rationalizations"** — fase-01 deste entrega; Passo 1 confirma.
- [ ] **`contract_version: "2.0.0"` em schema doc + 13 agentes + migration guide presente** — Plano 01 fase-02 entrega schema + migration guide; Plano 02 fase-04 valida nos 13 agentes via grep. Re-confirmar:
  ```bash
  grep -c "contract_version.*2.0.0" docs/design-docs/subagent-contract-v1.md  # esperado: >=1
  test -f docs/design-docs/subagent-contract-v2-migration.md && echo "migration OK"
  grep -l 'contract_version: "1.0"' agents/*.md | wc -l  # esperado: 0
  ```
- [ ] **`bun run harness:validate && bun run test && bun run lint` verde na branch final** — Passo 6 entrega.
- [ ] **CA-11 verificado: verify-work continua funcionando sem mudanca de codigo** — Passo 5 entrega via `git diff`.

Apos marcar TODOS os 8 checkpoints [x], a Wave 2 esta formalmente encerrada.

---

## Gotchas

- **G2 do plano (manifest regerado, NUNCA manual):** heranca direta do G4 do Plano 03. Repetido aqui porque esta e a SEGUNDA regeracao da wave — tentacao de "so editar a linha do decision-registry" e armadilha. Sempre rodar o script completo.

- **G3 do plano (PLUGIN_VERSION=7.1.0 obrigatorio):** o script tem default `'6.0.0'`. Sem env var, manifest sai com versao errada e Passo 3 falha indiretamente (campo `version` no manifest divergira de `plugin.json`).

- **G4 do plano (CA-11 backward-compat — `verify-work` nao deve aparecer em git diff):** Passo 5 e o gate mecanico. Se o diff aparecer, NAO ignorar — verificar se foi edit consciente ou acidental.

- **G5 do plano (idempotencia do generate-manifest.js):** Re-rodar o script e seguro. A diferenca esperada vs Plano 03 fase-04 e APENAS o checksum de `skills/decision-registry/SKILL.md`. Se outros arquivos mudarem entre rodadas, investigar — pode indicar edits acidentais fora do escopo (subagente que tocou em coisa errada, hook que reescreveu arquivo, etc).

- **G6 do plano (`harness:validate` e gate canonico final da Wave 2):** Passo 6. Sem este verde, wave NAO encerra. Mesmo principio do G5 do Plano 03 — repetido aqui para reforco.

- **G7 do plano (Exit Criteria do PLAN.md — nao pular):** Passo 7 e LITERAL. Percorrer cada checkpoint com comandos verificadores. Pular essa varredura deixa a wave em estado "aparentemente concluida mas nao auditada" — quem abrir o repo daqui-a-6-meses nao sabe se a wave realmente terminou.

- **Local — goldens de E2E:** `tests/e2e/init-cutover-greenfield.test.ts` pode comparar contra um golden de manifest. Adicionar 3 skills novas + 1 com checksum atualizado pode quebrar o golden. Precedente: Plano 05 fase-06 do PRD populate-plan-andre-port regerou goldens nesta situacao (registrado no MEMORY global do projeto). Se quebrar: registrar como DI no MEMORY desta fase e regerar conforme procedimento. NAO ignorar a quebra — sinal de drift real.

- **Local — `.claude-plugin/plugin.json` provavelmente nao precisa mudanca:** estado atual NAO lista skills no array (descoberta e automatica via filesystem). Decisao confirmada no Passo 1. Se aparecer campo `skills` ali em algum momento, adicionar entries para as 3 skills novas + nada para decision-registry (que ja existia).

- **Local — `bun run harness:validate` executa `bun scripts/harness-validate.ts .` (do package.json):** se o script de validacao mudar, sincronizar com este doc.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** antes do Passo 2, checksum de `decision-registry` no manifest e o ANTIGO (pre-fase-01)
  - Comando: snapshot via `cp plugin-manifest.json /tmp/manifest-pre.json` (Passo 1) — depois diff no Passo 3
- [ ] **GREEN apos Passo 2:** checksum de `decision-registry` MUDOU + 3 skills novas presentes
  - Comando: node inline do Passo 3 (parte do diff) — espera "OK: checksum mudou"
- [ ] **REFACTOR:** Passos 3-5 verdes (checksums validos, 13 agentes indexados, `verify-work` intocado)
- [ ] **VERIFY:** Passo 6 verde (`bun run harness:validate && bun run test && bun run lint`) + Passo 7 com todos os 8 checkpoints em [x]

### Checklist

- [ ] Passo 1: 13/13 agentes com contract v2.0.0, 3 skills novas presentes, pedagogia ADR adicionada, plugin.json sem campo `skills`, snapshot pre-regeracao em `/tmp/manifest-pre.json`
- [ ] Passo 2: `PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js` executou sem erro, versao no manifest = 7.1.0
- [ ] Passo 3: 4 skills criticas (3 novas + decision-registry) tem checksums SHA-256 validos e estao indexadas; checksum de decision-registry MUDOU vs snapshot
- [ ] Passo 4: 13/13 agentes tem checksums SHA-256 validos no manifest
- [ ] Passo 5: `git diff --name-only origin/main..HEAD -- skills/verify-work/SKILL.md` retorna vazio
- [ ] Passo 6: `bun run harness:validate && bun run test && bun run lint` verde (exit 0)
- [ ] Passo 7: 8 checkpoints do Exit Criteria do PLAN.md todos em [x]
- [ ] Nenhum arquivo fora do escopo modificado: `git status --short` so mostra arquivos das fases anteriores da wave + `plugin-manifest.json`

---

## Criterio de Aceite

**Por maquina (gate canonico final da Wave 2):**

```bash
# 2026-05-23 (Luiz/dev): comando atomico que valida regeneracao + checksums + pipeline verde
PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js && \
node -e "
const m = require('./plugin-manifest.json');
const fs = require('fs');
const agents = fs.readdirSync('agents').filter(f => f.endsWith('.md'));
if (agents.length !== 13) process.exit(1);
['source-driven-development','doubt-driven-development','git-workflow-and-versioning','decision-registry'].forEach(s => {
  const e = m.files['skills/' + s + '/SKILL.md'];
  if (!e || !/^[a-f0-9]{64}$/.test(e.checksum)) process.exit(1);
});
agents.forEach(a => {
  const e = m.files['agents/' + a];
  if (!e || !/^[a-f0-9]{64}$/.test(e.checksum)) process.exit(1);
});
console.log('OK');
" && \
bun run harness:validate && bun run test && bun run lint
```

Retorno esperado: exit code 0 + linha final `OK` + pipeline verde.

**Por humano:**
- `git diff plugin-manifest.json` mostra mudanca no checksum de `skills/decision-registry/SKILL.md` (e nada mais inesperado).
- Exit Criteria do PLAN.md com todos os 8 checkpoints em [x] (Passo 7 manual).
- Diretorio `docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/` pronto para ser movido para `completed/` apos confirmacao do dev (acao fora do escopo desta fase).

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
