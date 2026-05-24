<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): mudou base de resolução src — D21 + Plano 02 fase-01`
-->

# Fase 01: `git mv` templates + conteúdo literal André + P3 inlinado

**Plano:** 02 — Reestruturação Física + Goldens
**Sizing:** 2h
**Depende de:** Plano 01 completo (skill stub + `getCompoundManifest()` + template-manifest consome manifest + bug MH-01 fechado em `compound/README.md.tpl`)
**Visual:** false

---

## O que esta fase entrega

10 templates `.tpl` movidos fisicamente via `git mv` (preserva linhagem D15) de `skills/init/assets/templates/` para `skills/compound-engineering/assets/`, com conteúdo substituído pela versão literal do André (D14) + schema canônico (D3) + P3 inlinado em `compound-check.ts.tpl` (D8). `getCompoundManifest()` aponta para o novo local (D21). Nenhum import quebrado (validado via grep pré-mv).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/docs/COMPOUND_ENGINEERING.md.tpl` | Move (git mv) | → `skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl`, conteúdo substituído pelo do André |
| `skills/init/assets/templates/docs/compound/README.md.tpl` | Move (git mv) | → `skills/compound-engineering/assets/docs/compound/README.md.tpl`, conteúdo do André (já tem schema canônico — overrides MH-01 do Plano 01 fase-03; ver DI-Plano02-fase01-readme-overrides-plano01) |
| `skills/init/assets/templates/docs/review-checklists/README.md.tpl` | Move (git mv) | → `skills/compound-engineering/assets/docs/review-checklists/README.md.tpl` + conteúdo André |
| `skills/init/assets/templates/docs/review-checklists/security.md.tpl` | Move (git mv) | → mesma localização sob `compound-engineering/` + conteúdo André |
| `skills/init/assets/templates/docs/review-checklists/reliability.md.tpl` | Move (git mv) | idem |
| `skills/init/assets/templates/docs/review-checklists/agent-api.md.tpl` | Move (git mv) | idem |
| `skills/init/assets/templates/docs/review-checklists/frontend-ui.md.tpl` | Move (git mv) | idem |
| `skills/init/assets/templates/docs/review-checklists/production-readiness.md.tpl` | Move (git mv) | idem |
| `skills/init/assets/templates/docs/smoke-flows/README.md.tpl` | Move (git mv) | → `skills/compound-engineering/assets/docs/smoke-flows/README.md.tpl` + conteúdo André |
| `skills/init/assets/templates/scripts/compound-check.ts.tpl` | Move (git mv) | → `skills/compound-engineering/assets/scripts/compound-check.ts.tpl`, conteúdo: tradução literal do `compound-check.mjs` do André para TS + Bun + P3 inlinado |
| `skills/compound-engineering/lib/manifest.ts` | Modify | Atualiza string base de resolução de `src` de `'../../init/assets/templates'` para `'../assets'` (D21, G7) |

**Lista canônica das 10 entradas:** ver `plano01/MEMORY.md` → DI-Plano01-fase01-10-entradas. **Reconciliação 9-vs-10:** ver `plano02/MEMORY.md` → DI-Plano02-fase01-10-vs-9-templates.

---

## Implementacao

### Passo 1: Grep prévio obrigatório (R7 do PRD/CONTEXT)

Antes de qualquer `git mv`, capturar callsites que apontam aos paths antigos. Pelo menos o `template-manifest.ts` do init e seus testes; possivelmente goldens E2E que referenciam o path como string.

```bash
# 2026-05-23 (Luiz/dev): grep pré-mv — R7 mitigation
grep -rn "skills/init/assets/templates/\(docs/compound\|docs/review-checklists\|docs/smoke-flows\|docs/COMPOUND_ENGINEERING\|scripts/compound-check\)" \
  skills/ tests/ scripts/ --include='*.ts' --include='*.json' --include='*.md' \
  > /tmp/grep-pre-mv-fase01.txt
```

**Critério:** revisar `/tmp/grep-pre-mv-fase01.txt`. Os únicos hits ACEITÁVEIS são:
- O próprio `skills/compound-engineering/lib/manifest.ts` (passo 4 atualiza)
- Possíveis goldens E2E (`tests/e2e/__golden__/init-greenfield.tree.json` ou `.stdout.txt`) — esses regeneram em fase-03; deixar passar nesta fase
- Documentação histórica em `docs/exec-plans/completed/` (não tocar — histórico)
- Memórias deste próprio plano (`plano01/MEMORY.md`, `plano02/`) — não tocar

Qualquer outro hit (código de runtime, test ativo) é um callsite a atualizar no MESMO commit.

### Passo 2: Criar estrutura de diretório destino

```bash
# 2026-05-23 (Luiz/dev): mkdir antes do git mv — destino precisa existir
mkdir -p skills/compound-engineering/assets/docs/compound
mkdir -p skills/compound-engineering/assets/docs/review-checklists
mkdir -p skills/compound-engineering/assets/docs/smoke-flows
mkdir -p skills/compound-engineering/assets/scripts
```

### Passo 3: `git mv` das 10 entradas

Executar EM ORDEM (ordem não tem efeito funcional, mas estabiliza diff):

```bash
# 2026-05-23 (Luiz/dev): git mv preserva linhagem — D15
git mv skills/init/assets/templates/docs/COMPOUND_ENGINEERING.md.tpl \
       skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl

git mv skills/init/assets/templates/docs/compound/README.md.tpl \
       skills/compound-engineering/assets/docs/compound/README.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/README.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/README.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/security.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/security.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/reliability.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/reliability.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/agent-api.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/agent-api.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/frontend-ui.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/frontend-ui.md.tpl

git mv skills/init/assets/templates/docs/review-checklists/production-readiness.md.tpl \
       skills/compound-engineering/assets/docs/review-checklists/production-readiness.md.tpl

git mv skills/init/assets/templates/docs/smoke-flows/README.md.tpl \
       skills/compound-engineering/assets/docs/smoke-flows/README.md.tpl

git mv skills/init/assets/templates/scripts/compound-check.ts.tpl \
       skills/compound-engineering/assets/scripts/compound-check.ts.tpl
```

**Verificação imediata:**
```bash
git status --short | grep -E "^R" | wc -l   # esperado: 10
git log --follow --oneline skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl | head -5
# deve mostrar commits anteriores no path antigo (linhagem preservada — D15)
```

### Passo 4: Atualizar `getCompoundManifest()` para novo path base (D21, G7)

Editar `skills/compound-engineering/lib/manifest.ts`. Esperado estado anterior (Plano 01 fase-01 + DI-Plano01-fase01-src-resolution):

```typescript
// 2026-05-23 (Luiz/dev): cutover físico — D21 + Plano 02 fase-01
// (estado anterior apontava para skills/init/assets/templates — transitório do Tracer Bullet)
src: path.resolve(import.meta.dir, '../assets', dst),
```

Antes era `'../../init/assets/templates'`. Mudar EXATAMENTE essa string. `dst` permanece relativo ao target root (não muda). Atualizar comentário inline com data + razão (linhagem).

### Passo 5: Substituir conteúdo dos 10 templates pela versão literal do André (D14)

Para cada uma das 10 entradas (exceto `compound-check.ts.tpl` — passo 6), copiar conteúdo de:
`Infos/package/skills/compound-engineering/assets/compound-template/{path}`

Para o destino correspondente em `skills/compound-engineering/assets/{path}.tpl`. Manter sufixo `.tpl` no destino.

Mapping completo em `plano02/MEMORY.md` → DI-Plano02-fase01-andre-source.

**Importante:** `git mv` registra o move; subsequente edição de conteúdo entra como mesmo commit ou commit subsequente — preferir SINGLE COMMIT contendo `git mv` + content replace (mantém histórico navegável conforme D15: "mesmo commit registra move + content change").

### Passo 6: Reescrever `compound-check.ts.tpl` com P3 inlinado (D8, DI-Plano02-fase01-p3-rules)

Esse arquivo NÃO é cópia direta — o André tem `.mjs`, nosso runtime é Bun + TS. Esqueleto:

```typescript
// 2026-05-23 (Luiz/dev): port do compound-check.mjs do André para TS+Bun — D8 + Plano 02 fase-01
// Inlina helpers (parseFrontmatter, listCompoundFiles) — RF-10: sem dep de lib externa no target.
// Schema espelhado em skills/compound-engineering/lib/compound-frontmatter.ts (sincronização manual).

import { promises as fs } from 'node:fs'
import path from 'node:path'

const STRICT = process.argv.includes('--strict')

// ... helpers parseFrontmatterInline + listCompoundFilesLocal (literais do estado atual do .tpl)

async function main() {
  const root = process.cwd()
  const errors: string[] = []

  // Regra 1 (atual): frontmatter válido em todas as notas em docs/compound/*.md
  // Regra 2 (atual): sections obrigatórias (Problem/Solution/etc)

  if (STRICT) {
    // 2026-05-23 (Luiz/dev): P3 — 3 regras --strict (D8, DI-Plano02-fase01-p3-rules)

    // P3.1 — AGENTS link
    const agentsLink = await checkAgentsLink(root)
    if (!agentsLink) errors.push('[agents-link] AGENTS.md: missing link to docs/COMPOUND_ENGINEERING.md')

    // P3.2 — Plan-generator sections
    const planSections = await checkPlanGeneratorSections(root)
    if (planSections.length) errors.push(`[plan-generator] missing sections: ${planSections.join(', ')}`)

    // P3.3 — Active-plan hygiene
    const planHygiene = await checkActivePlanHygiene(root)
    if (planHygiene.length) errors.push(`[active-plan] ${planHygiene.join('; ')}`)
  }

  if (errors.length) {
    for (const e of errors) console.error(e)
    process.exit(1)
  }
  console.log('compound:check OK')
}

main().catch((e) => { console.error(e); process.exit(2) })

// Helpers P3 (regex AGENTS — D23, etc.)
async function checkAgentsLink(root: string): Promise<boolean> {
  try {
    const body = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
    return /\[.*?\]\(\.?\/?docs\/COMPOUND_ENGINEERING\.md\)/.test(body)
  } catch { return false }
}
// (checkPlanGeneratorSections + checkActivePlanHygiene seguem padrão similar — detalhes em fase de implementação)
```

**Critério:** P3 ATIVA SÓ COM `--strict`. Sem flag, comportamento atual preservado (RNF-01, CA-09). Sincronização manual com `skills/compound-engineering/lib/compound-frontmatter.ts` documentada no header (RF-10).

### Passo 7: Atualizar callsites detectados no passo 1 (se houver fora dos esperados)

Para cada hit não-esperado do grep do passo 1, atualizar o path antigo para o novo. Goldens E2E são EXCEÇÃO (fase-03 regenera). Documentar cada update em `MEMORY.md` como DI se for não-trivial.

---

## Gotchas

- **G1 do plano (R7):** Grep prévio é OBRIGATÓRIO (passo 1). Pular = quebrar testes silenciosamente.
- **G2 do plano (R2):** Goldens E2E SÃO esperados a quebrar após esta fase — não regenerar aqui. fase-03 deste plano fecha o ciclo. Documentar baseline de quebras antes de fase-03.
- **G4 do plano (D14):** Conteúdo atual dos `.tpl` é descartado. `git mv` + edição = um commit (linhagem preservada via `git log --follow`).
- **G5 do plano (D15):** Verificar `git log --follow` após o mv — se histórico não preservar, refazer com `git mv` (não `mv` + `git add`).
- **G7 do plano (D21):** Mudança em `manifest.ts` é UMA string só (`'../../init/assets/templates'` → `'../assets'`). Plano 01 fase-02 confirmou que template-manifest do init consome `getCompoundManifest()` — esta troca de string é transparente para o init.
- **Local:** Ordem dos 10 entries em `getCompoundManifest()` NÃO muda nesta fase. Só a base de `src`. Goldens E2E não devem detectar mudança de ordem; só mudança de origem dos templates (que aparece em logs/audit do scaffold).

---

## Verificacao

### TDD

- [ ] **RED (grep pré-mv):** `bash` snippet do passo 1 executado, output em `/tmp/grep-pre-mv-fase01.txt` revisado manualmente
  - Resultado esperado: hits restritos a (a) `manifest.ts`, (b) goldens E2E, (c) docs históricos
  - Qualquer hit não-esperado é callsite a atualizar (passo 7)

- [ ] **GREEN (build verde pós-mv):**
  - Comando: `bun test skills/compound-engineering skills/init/lib/template-manifest.test.ts`
  - Resultado esperado: ✓ verde (manifest.ts retorna paths apontando para `skills/compound-engineering/assets/`, template-manifest do init continua consumindo OK)

- [ ] **GREEN (linhagem preservada):**
  - Comando: `git log --follow --oneline skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl | head -5`
  - Resultado esperado: lista 5 commits incluindo commits pré-`git mv` no path antigo

### Checklist

- [ ] 10 arquivos com status `R` (renamed) em `git status --short`
- [ ] Conteúdo de cada `.tpl` movido bate com versão literal do André (`diff` byte-a-byte com `Infos/package/skills/compound-engineering/assets/compound-template/{path}`, exceto `compound-check.ts.tpl` que é port TS)
- [ ] `skills/compound-engineering/assets/scripts/compound-check.ts.tpl` contém helpers inlinados + branch `--strict` com 3 regras P3
- [ ] `skills/compound-engineering/lib/manifest.ts` atualizado com `'../assets'` (mudança de 1 string)
- [ ] `bun test skills/init` verde (template-manifest do init continua consumindo OK)
- [ ] `bun test skills/compound-engineering` verde
- [ ] Testes E2E `init-cutover-greenfield.test.ts` podem FALHAR (esperado — fase-03 regenera goldens). Capturar baseline:
  ```bash
  bun test tests/e2e/init-cutover-greenfield.test.ts 2>&1 | tee /tmp/baseline-fase01.log
  ```
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `git log --follow --oneline skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl | wc -l` retorna ≥ N onde N = commits anteriores do path antigo + 1 (linhagem D15 preservada)
- `find skills/compound-engineering/assets -name '*.tpl' | wc -l` retorna exatamente 10
- `find skills/init/assets/templates -name 'compound-check.ts.tpl' -o -path '*compound*' -name '*.tpl' -o -path '*review-checklists*' -name '*.tpl' -o -path '*smoke-flows*' -name '*.tpl' -o -name 'COMPOUND_ENGINEERING.md.tpl' | wc -l` retorna 0 (nenhum dos 10 ficou no path antigo)
- `bun test skills/init/lib/template-manifest.test.ts skills/compound-engineering` retorna 0 falhas
- `grep -n "'\.\./\.\./init/assets/templates'" skills/compound-engineering/lib/manifest.ts` retorna 0 matches (string base atualizada)
- `grep -nE "from ['\"]\.\.\/\.\.\/init\/" skills/compound-engineering/` retorna 0 matches (já vale; CA-17 formal valida em fase-02)

**Por humano:**
- Conteúdo dos 9 templates `.md.tpl` movidos é o do André literal (sem "Replace this scaffold" do estado anterior)
- `compound-check.ts.tpl` tem 3 regras P3 sob `if (STRICT)` corretamente nomeadas (agents-link / plan-generator / active-plan)

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
