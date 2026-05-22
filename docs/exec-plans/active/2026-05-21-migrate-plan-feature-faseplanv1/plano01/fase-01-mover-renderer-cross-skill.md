# Fase 01: Mover Renderer Cross-Skill (Tracer Bullet)

**Plano:** 01 — Renderer Cross-Skill + Builder
**Sizing:** ~1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

`renderFasePlan`, `extractH2Sections`, `FasePlanInput` e tipos auxiliares vivem em
`skills/lib/render-fase-plan.ts` (cross-skill); o arquivo original em `skills/init/lib/` e
deletado; `populate-plan-generator.ts` importa do novo path; suite completa de testes verde.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/lib/render-fase-plan.ts` | Create (git mv) | Destino do renderer apos move |
| `skills/lib/render-fase-plan.test.ts` | Create (git mv) | Destino dos testes apos move |
| `skills/lib/__golden__/fase-plan-sample.md` | Create (git mv) | Golden movido junto com o teste |
| `skills/init/lib/render-fase-plan.ts` | Delete (git mv) | Removido apos move |
| `skills/init/lib/render-fase-plan.test.ts` | Delete (git mv) | Removido apos move |
| `skills/init/lib/__golden__/fase-plan-sample.md` | Delete (git mv) | Removido apos move do golden |
| `skills/init/lib/populate-plan-generator.ts` | Modify | Linha 19: `from './render-fase-plan'` → `from '../../lib/render-fase-plan'` |

---

## Implementacao

### Passo 1: Grep obrigatorio — mapear todos os importadores

Antes de qualquer movimentacao, confirmar que `populate-plan-generator.ts` e o UNICO
importador de `render-fase-plan` em `skills/`.

```bash
grep -r "render-fase-plan" f:/Projetos/Anti-Vibe-Coding/skills/ --include="*.ts"
```

Resultado esperado: apenas 2 linhas:
- `skills/init/lib/populate-plan-generator.ts` (import de producao)
- `skills/init/lib/render-fase-plan.test.ts` (import de teste — sera movido junto)

Se aparecer qualquer outro arquivo: **PARAR e sinalizar como blocker** antes de prosseguir.

### Passo 2: Verificar path do golden no teste

Antes de mover, ler `skills/init/lib/render-fase-plan.test.ts` e confirmar o path do golden:

```typescript
// linha 91 do arquivo atual:
const goldenPath = path.join(import.meta.dir, '__golden__', 'fase-plan-sample.md')
```

`import.meta.dir` em bun resolve para o diretorio do arquivo fonte. Quando o teste for movido
para `skills/lib/render-fase-plan.test.ts`, o path do golden deve ser atualizado para:

```typescript
const goldenPath = path.join(import.meta.dir, '__golden__', 'fase-plan-sample.md')
```

O path relativo `'__golden__'` continua correto — o golden sera movido junto para
`skills/lib/__golden__/fase-plan-sample.md`. Nenhuma alteracao de string necessaria.

### Passo 3: git mv dos 3 arquivos

```bash
# Criar o diretorio destino se nao existir
mkdir -p "f:/Projetos/Anti-Vibe-Coding/skills/lib/__golden__"

# Mover o renderer
git mv "f:/Projetos/Anti-Vibe-Coding/skills/init/lib/render-fase-plan.ts" \
       "f:/Projetos/Anti-Vibe-Coding/skills/lib/render-fase-plan.ts"

# Mover o teste
git mv "f:/Projetos/Anti-Vibe-Coding/skills/init/lib/render-fase-plan.test.ts" \
       "f:/Projetos/Anti-Vibe-Coding/skills/lib/render-fase-plan.test.ts"

# Mover o golden
git mv "f:/Projetos/Anti-Vibe-Coding/skills/init/lib/__golden__/fase-plan-sample.md" \
       "f:/Projetos/Anti-Vibe-Coding/skills/lib/__golden__/fase-plan-sample.md"
```

**Verificacao pos-mv:** `git status` deve mostrar 3 pares de `renamed:` — nenhum `deleted:` solto.

### Passo 4: Atualizar import em `populate-plan-generator.ts`

Editar linha 19 de `skills/init/lib/populate-plan-generator.ts`:

```typescript
// ANTES:
import { renderFasePlan, type FasePlanInput, type Wave } from './render-fase-plan'

// DEPOIS:
import { renderFasePlan, type FasePlanInput, type Wave } from '../../lib/render-fase-plan'
```

Confirmar que nenhum outro import no mesmo arquivo referencia `render-fase-plan`.

### Passo 5: Rodar typecheck e testes

```bash
cd "f:/Projetos/Anti-Vibe-Coding"
bun run typecheck
bun test skills/lib/render-fase-plan.test.ts
bun test
```

Resultado esperado: zero erros de typecheck, todos os testes passam (incluindo o snapshot golden).

### Passo 6: Verificar CA-B-02 — grep de import orfo

```bash
grep -r "render-fase-plan" f:/Projetos/Anti-Vibe-Coding/skills/init/ --include="*.ts"
```

Resultado esperado: apenas a linha em `populate-plan-generator.ts` apontando para
`../../lib/render-fase-plan`. Zero referencias para `./render-fase-plan` (path legado).

---

## Gotchas

- **G1 do plano (git mv):** Usar `git mv` para preservar linhagem. Write+Delete perde historia.
  Se o ambiente nao suportar `git mv` diretamente, usar `cp` + `git add` + `git rm` — equivalente.
- **G2 (golden path):** `import.meta.dir` resolve para o diretorio do arquivo fonte em runtime
  (bun-specific). O golden deve estar em `skills/lib/__golden__/fase-plan-sample.md` apos o move —
  o path relativo `'__golden__'` no teste continua correto sem alteracao de string.
- **G3 (grep antes de deletar):** Passo 1 e mandatorio. Se houver importador nao-mapeado
  (ex: `populate-harness-plan-overview.ts` importando diretamente), o delete vai quebrar a suite.
- **Local:** `skills/lib/__golden__/` pode ja existir com outros goldens. Criar o diretorio com
  `mkdir -p` (flag para nao falhar se ja existe).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/lib/render-fase-plan.test.ts` falha com "Cannot find module"
  antes do `git mv` (arquivo nao existe em `skills/lib/` ainda)
- [ ] **GREEN:** apos `git mv` + atualizar import em `populate-plan-generator.ts`,
  `bun test skills/lib/render-fase-plan.test.ts` passa todos os 5 testes (incluindo snapshot)
- [ ] **REFACTOR:** nao necessario nesta fase — move puro sem alteracao de logica

### Checklist

- [ ] `git status` mostra 3 `renamed:` (ts + test.ts + golden) e 1 `modified:` (populate-plan-generator.ts)
- [ ] `grep -r "from './render-fase-plan'" f:/Projetos/Anti-Vibe-Coding/skills/init/` retorna vazio
- [ ] `grep -r "render-fase-plan" f:/Projetos/Anti-Vibe-Coding/skills/init/lib/populate-plan-generator.ts` mostra `../../lib/render-fase-plan`
- [ ] `skills/lib/render-fase-plan.ts` existe com mesmo conteudo do original
- [ ] `skills/init/lib/render-fase-plan.ts` nao existe mais
- [ ] Testes passam: `bun test skills/lib/render-fase-plan.test.ts`
- [ ] Suite completa passa: `bun test`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**

- `bun test` retorna `0 failed` (CA-B-02: zero quebras cross-skill)
- `ls f:/Projetos/Anti-Vibe-Coding/skills/lib/render-fase-plan.ts` existe
- `ls f:/Projetos/Anti-Vibe-Coding/skills/init/lib/render-fase-plan.ts` nao existe (exit code 1)
- `grep -r "render-fase-plan" f:/Projetos/Anti-Vibe-Coding/skills/init/ --include="*.ts"` retorna apenas a linha de `populate-plan-generator.ts` com `../../lib/render-fase-plan`

---

## Final Report Contract

Quando esta fase for executada, o relatorio final DEVE listar:
- **Files added** — `skills/lib/render-fase-plan.ts`, `skills/lib/render-fase-plan.test.ts`, `skills/lib/__golden__/fase-plan-sample.md`
- **Files customized** — `skills/init/lib/populate-plan-generator.ts` (linha 19: path do import)
- **Files unchanged** — paths inspecionados mas nao modificados (com razao)
- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc
- **Validation result** — output de `bun test`
- **First plan path** — fase-02-criar-fase-builder.md
