<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): cross-skill import — CA-15 + Plano 02 fase-02`
-->

# Fase 02: `git mv` libs canônicas + imports cross-skill

**Plano:** 02 — Reestruturação Física + Goldens
**Sizing:** 1.5h
**Depende de:** fase-01 (estrutura `skills/compound-engineering/` consolidada com `assets/` movido + `manifest.ts` atualizado)
**Visual:** false

---

## O que esta fase entrega

Move `compound-files-collector.ts/.test.ts` e `compound-frontmatter.ts/.test.ts` (4 arquivos) de `skills/init/lib/` para `skills/compound-engineering/lib/` via `git mv` (D19, D15), atualiza os 2 callsites cross-skill reais (D14 + DI-Plano02-fase02-cross-skill-imports do MEMORY) e valida CA-17 (one-way dependency — R8) via grep.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/compound-files-collector.ts` | Move (git mv) | → `skills/compound-engineering/lib/compound-files-collector.ts` |
| `skills/init/lib/compound-files-collector.test.ts` | Move (git mv) | → `skills/compound-engineering/lib/compound-files-collector.test.ts` (imports relativos `./compound-files-collector` movem juntos sem edição) |
| `skills/init/lib/compound-frontmatter.ts` | Move (git mv) | → `skills/compound-engineering/lib/compound-frontmatter.ts` |
| `skills/init/lib/compound-frontmatter.test.ts` | Move (git mv) | → `skills/compound-engineering/lib/compound-frontmatter.test.ts` (idem — relativo `./compound-frontmatter`) |
| `skills/lessons-learned/index.test.ts` | Modify | Linha 7: `from '../init/lib/compound-frontmatter'` → `from '../compound-engineering/lib/compound-frontmatter'` (CA-15) |
| `skills/lib/compound-note-writer.test.ts` | Modify | Linha 7: `from '../init/lib/compound-frontmatter'` → `from '../compound-engineering/lib/compound-frontmatter'` (CA-15) |

**Callsites NÃO afetados (decisão registrada em DI-Plano02-fase02-cross-skill-imports):**
- `skills/init/lib/compound-writer.ts` — NÃO importa `parseFrontmatter` (usa `CA29Frontmatter` próprio). PRD CA-15 cita esse arquivo como exemplo; grep do repo confirma que não há import real. Espírito de CA-15 cumprido pelos callsites reais.
- `skills/init/lib/compound-imported-writer.ts` — também NÃO importa. Idem.

---

## Implementacao

### Passo 1: Grep prévio dos callsites (R7 + CA-15 reconciliação)

```bash
# 2026-05-23 (Luiz/dev): grep pré-mv de libs — R7 + DI-Plano02-fase02-cross-skill-imports
grep -rn "from ['\"][./]*init/lib/compound-\(frontmatter\|files-collector\)['\"]" \
  skills/ --include='*.ts' \
  > /tmp/grep-pre-mv-fase02.txt
```

**Resultado esperado (validado em 2026-05-23 durante planejamento):**
1. `skills/lessons-learned/index.test.ts:7`
2. `skills/lib/compound-note-writer.test.ts:7`

Se aparecer hit adicional (callsite não previsto), atualizar no mesmo commit deste passo + documentar em MEMORY.md.

### Passo 2: Confirmar estrutura destino existe (criada em fase-01)

```bash
# 2026-05-23 (Luiz/dev): destino criado em fase-01 — só verificação
[ -d skills/compound-engineering/lib ] && echo "OK" || mkdir -p skills/compound-engineering/lib
```

### Passo 3: `git mv` dos 4 arquivos (D15, D19)

```bash
# 2026-05-23 (Luiz/dev): D19 — schema canônico move para skill compound
git mv skills/init/lib/compound-files-collector.ts \
       skills/compound-engineering/lib/compound-files-collector.ts

git mv skills/init/lib/compound-files-collector.test.ts \
       skills/compound-engineering/lib/compound-files-collector.test.ts

git mv skills/init/lib/compound-frontmatter.ts \
       skills/compound-engineering/lib/compound-frontmatter.ts

git mv skills/init/lib/compound-frontmatter.test.ts \
       skills/compound-engineering/lib/compound-frontmatter.test.ts
```

**Verificação imediata:**
```bash
git status --short | grep -E "^R" | wc -l   # esperado: 4 (deste passo)
git log --follow --oneline skills/compound-engineering/lib/compound-frontmatter.ts | head -5
```

### Passo 4: Atualizar imports cross-skill (CA-15)

**Arquivo 1: `skills/lessons-learned/index.test.ts`**

```diff
- import { parseFrontmatter } from '../init/lib/compound-frontmatter'
+ // 2026-05-23 (Luiz/dev): cross-skill import — D19 + CA-15 + Plano 02 fase-02
+ import { parseFrontmatter } from '../compound-engineering/lib/compound-frontmatter'
```

**Arquivo 2: `skills/lib/compound-note-writer.test.ts`**

```diff
- import { parseFrontmatter, findMissingRequiredSections } from '../init/lib/compound-frontmatter'
+ // 2026-05-23 (Luiz/dev): cross-skill import — D19 + CA-15 + Plano 02 fase-02
+ import { parseFrontmatter, findMissingRequiredSections } from '../compound-engineering/lib/compound-frontmatter'
```

Imports internos dos arquivos movidos (`./compound-frontmatter` em `compound-frontmatter.test.ts`, `./compound-files-collector` em `compound-files-collector.test.ts`) NÃO precisam edição — relativos viajam juntos com `git mv`.

### Passo 5: Validar CA-17 (one-way dependency — R8)

CRÍTICO: ZERO imports de `init/` em `compound-engineering/`.

```bash
# 2026-05-23 (Luiz/dev): CA-17 grep — R8 mitigation. Resultado DEVE ser vazio.
grep -rnE "from ['\"]\.\.\/\.\.\/init\/" skills/compound-engineering/ --include='*.ts'
```

**Critério:** ZERO matches. Se houver match, abortar fase — refatorar import circular antes de prosseguir. Documentar resultado vazio em `## Validation Log` do PLAN.md.

```bash
# Saída esperada: vazio (exit code 1 — grep não achou nada, comportamento OK)
echo $?   # 1 (grep não-encontrou-nada)
```

### Passo 6: Confirmar testes verdes pós-mv

```bash
# 2026-05-23 (Luiz/dev): suite completa das libs movidas + callsites cross-skill
bun test \
  skills/compound-engineering/lib/compound-files-collector.test.ts \
  skills/compound-engineering/lib/compound-frontmatter.test.ts \
  skills/lessons-learned/index.test.ts \
  skills/lib/compound-note-writer.test.ts
```

Esperado: 4 arquivos de teste verdes, todos os asserts passam.

---

## Gotchas

- **G1 do plano (R7):** Grep prévio é OBRIGATÓRIO (passo 1). Spec CA-15 do PRD listou exemplo errado (`compound-writer.ts`); grep do repo encontra os 2 callsites reais.
- **G3 do plano (R8):** CA-17 grep (passo 5) é hard gate — sem isso, dependency circular pode passar despercebida. SEMPRE rodar antes de mergear.
- **G8 do plano (D14 + CA-15 ambiguidade):** Conferir DI-Plano02-fase02-cross-skill-imports em `MEMORY.md`. Spec CA-15 vs grep real = não-acoplados; cumprimos pelo espírito.
- **Local: paths relativos pós-mv:** Arquivos `.test.ts` movidos usam imports relativos `./` para o `.ts` co-located. Esses NÃO precisam edição — `git mv` preserva o diretório local. Único cuidado: se `compound-frontmatter.ts` ou `compound-files-collector.ts` importar algo de outro diretório (ex: `../../lib/...`), o caminho relativo MUDA (precisa atualizar). Validar com grep:
  ```bash
  grep -nE "from ['\"]\.\." skills/compound-engineering/lib/compound-frontmatter.ts skills/compound-engineering/lib/compound-files-collector.ts
  ```
  Se houver match, ajustar manualmente. Validado em planejamento: ambos os arquivos só usam `node:fs`, `node:path`, `js-yaml` (externos) e relativos co-located. Risco baixo.

---

## Verificacao

### TDD

- [ ] **RED (CA-17 inicial vazio garantido):** Antes do mv, confirmar que grep CA-17 já é vazio (não há circular dep pré-existente)
  - Comando: `grep -rnE "from ['\"]\.\.\/\.\.\/init\/" skills/compound-engineering/ --include='*.ts'`
  - Resultado esperado pré-mv: vazio (skill compound-engineering ainda só tem manifest.ts, SKILL.md — nada importando)

- [ ] **GREEN (testes movidos verdes):**
  - Comando: `bun test skills/compound-engineering/lib`
  - Resultado esperado: 2 arquivos de teste, todos verdes (mesmos do estado pré-mv — só mudou path físico)

- [ ] **GREEN (callsites cross-skill verdes):**
  - Comando: `bun test skills/lessons-learned/index.test.ts skills/lib/compound-note-writer.test.ts`
  - Resultado esperado: 2 arquivos verdes, mesmos asserts passando (só mudou import path)

### Checklist

- [ ] 4 arquivos com status `R` (renamed) em `git status --short` deste passo
- [ ] Linhagem preservada: `git log --follow --oneline skills/compound-engineering/lib/compound-frontmatter.ts` mostra histórico anterior
- [ ] 2 callsites cross-skill atualizados (passo 4) com comentário de linhagem
- [ ] CA-17 grep retorna vazio (passo 5)
- [ ] `bun test skills/compound-engineering/lib skills/lessons-learned skills/lib/compound-note-writer.test.ts` verde
- [ ] `bun test` (suite inteira) verde — qualquer falha pré-existente em init/ por imports antigos deve estar resolvida
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `find skills/compound-engineering/lib -name 'compound-*.ts' | wc -l` retorna exatamente 4
- `find skills/init/lib -name 'compound-frontmatter*' -o -name 'compound-files-collector*' | wc -l` retorna 0
- `grep -rnE "from ['\"]\.\.\/\.\.\/init\/" skills/compound-engineering/ --include='*.ts'` retorna 0 matches (CA-17)
- `grep -rn "from ['\"][./]*init/lib/compound-\(frontmatter\|files-collector\)" skills/ --include='*.ts'` retorna 0 matches (todos callsites atualizados)
- `bun test skills/compound-engineering/lib skills/lessons-learned/index.test.ts skills/lib/compound-note-writer.test.ts` retorna 0 falhas
- `git log --follow --oneline skills/compound-engineering/lib/compound-frontmatter.ts | wc -l` retorna ≥ N (histórico anterior visível)

**Por humano:**
- PR diff mostra 4 arquivos renomeados (não criados+deletados) + 2 arquivos com 1 linha de import alterada cada
- Comentários de linhagem (`// 2026-05-23 (Luiz/dev): cross-skill import — ...`) presentes nos 2 callsites editados

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
