<!--
Princípio universal #5 — Comment Provenance.
Esta fase refatora codigo TS de runtime. Comentarios inline em codigo novo seguem:
autor + papel, YYYY-MM-DD, razao (D22 / CA-06 / CA-07 / PRD secao).
Ex: `// 2026-05-18 (Luiz/dev): contrato multi-stack — D22 + CA-07 monorepo`
-->

# Fase 03: Refactor detectStack para contrato multi-stack (D22)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** Nenhuma (paralelizavel com fase-02 apos fase-01)
**Visual:** false

---

## O que esta fase entrega

Refactor de `detectStack` de single-stack `{ id, signalSource }` para multi-stack `{ primary: StackId | null, secondary: StackId[], signalSource: string, anchorFiles: string[] }` conforme **D22** (CONTEXT.md). Necessario para:

- **CA-07 monorepo (Rails+Node):** `primary='rails'`, `secondary=['nodejs-typescript']` baseado em arquivos majoritarios (`.rb` vs `.ts`)
- **CA-06 telemetria:** `anchor_files` lista manifests encontrados (Gemfile, package.json) mesmo no fallback `unknown`, dando visibilidade no log de telemetria
- **CA-03 fallback:** `primary=null` (nao mais `'unknown'`) quando nenhum probe positivo bate, com `anchorFiles` populado se algum manifest foi lido

Esta fase **bloqueia** fase-04 (regression test do detector — testa o novo contrato), fase-06 (E2E tracer — usa `.primary`), e Plano 03 fase-09 (E2E completo — usa `.primary` + `.secondary`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/detect-stack.ts` | Modify | Trocar tipo `DetectedStack` e funcao `detectStack` para o novo contrato; manter probes individuais inalterados |
| `skills/init/lib/detect-stack.test.ts` | Modify | Adaptar testes existentes (`result.id` → `result.primary`); novos casos cobrindo monorepo + `anchorFiles` |
| `skills/init/lib/run-stack-knowledge-init.ts` | Read + Modify | Atualizar callers que liam `stack.id` para usar `stack.primary` (provavel grep retorna 2-4 call sites) |
| `skills/init/lib/write-stack-json.ts` | Read + Modify | Idem — schema `.claude/stack.json` ja tem `primary`+`secondary` (v1), mas pode ler `stack.id` em algum ponto |
| `skills/init/lib/emit-stack-knowledge-events.ts` (se existir) | Read + Modify | Telemetria `stack_detected` agora emite `anchor_files` do novo campo |
| Outros call sites de `detectStack` ou `DetectedStack` | Modify | Grep amplo `detectStack\|DetectedStack` cobre tudo; atualizar caso a caso |

---

## Implementacao

### Passo 1: mapear call sites antes de refatorar

```bash
# Buscar todos os consumidores
bun run grep -rn 'detectStack\|DetectedStack\|\.id\s*===\?\s*[\x27"]rails\x27' skills/ tests/
```

Listar em MEMORY.md como `DI-Plano01-fase03-callsites`. Esperado: 3-6 arquivos (run-stack-knowledge-init, write-stack-json, talvez emit-stack-knowledge-events, alguns tests). NAO refatorar ainda — primeiro mapear.

### Passo 2 (RED): escrever testes do novo contrato ANTES de mudar o codigo

Adicionar em `skills/init/lib/detect-stack.test.ts`:

```typescript
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — RED antes de refactor
import { detectStack } from './detect-stack'

describe('detectStack (multi-stack contract D22)', () => {
  it('CA-02 happy: Rails moderno retorna { primary: "rails", secondary: [], anchorFiles: ["Gemfile"] }', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'rails', '~> 8.0'\n", 'utf8')
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBe('rails')
    expect(r.secondary).toEqual([])
    expect(r.anchorFiles).toContain('Gemfile')
  })

  it('CA-07 monorepo: Rails+Node retorna { primary: "rails", secondary: ["nodejs-typescript"], anchorFiles: ["Gemfile", "package.json"] }', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'rails', '~> 8.0'\n", 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'package.json'),
      JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }), 'utf8')
    // Maioria .rb para Rails ser primary
    await fs.mkdir(path.join(FIXTURE, 'app/models'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'app/models/post.rb'), 'class Post; end\n', 'utf8')
    await fs.mkdir(path.join(FIXTURE, 'frontend'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'frontend/index.ts'), 'export {}\n', 'utf8')

    const r = await detectStack(FIXTURE)
    expect(r.primary).toBe('rails')
    expect(r.secondary).toContain('nodejs-typescript')
    expect(r.anchorFiles).toEqual(expect.arrayContaining(['Gemfile', 'package.json']))
  })

  it('CA-03 fallback Sinatra: primary=null, anchorFiles=["Gemfile"] para visibilidade telemetria', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'sinatra'\n", 'utf8')
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBeNull()
    expect(r.secondary).toEqual([])
    expect(r.anchorFiles).toContain('Gemfile')
  })

  it('CA-21 zero signal: primary=null, anchorFiles=[]', async () => {
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBeNull()
    expect(r.anchorFiles).toEqual([])
  })
})
```

Rodar `bun run test -- detect-stack` — todos os 4 novos FALHAM por shape diferente (`r.primary` nao existe, hoje retorna `r.id`). RED confirmado.

### Passo 3 (GREEN): refatorar `detect-stack.ts`

```typescript
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — CA-06 + CA-07 do PRD
export type StackId = 'nextjs' | 'node-ts' | 'rails' | 'laravel' | 'python'

export type DetectedStack = {
  /** Stack primaria (null quando nenhum probe bate) */
  primary: StackId | null
  /** Stacks secundarias detectadas (monorepo). Vazio se single-stack. */
  secondary: StackId[]
  /** Origem do sinal primario para STATE.md (ex: "package.json#dependencies.next") */
  signalSource: string
  /** Manifests encontrados — usado por telemetria CA-06 mesmo no fallback */
  anchorFiles: string[]
}

const MANIFEST_FILES: ReadonlyArray<string> = ['package.json', 'Gemfile', 'composer.json', 'pyproject.toml', 'requirements.txt']

async function collectAnchorFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const file of MANIFEST_FILES) {
    try {
      await fs.access(path.join(dir, file))
      found.push(file)
    } catch { /* ausente — ignora */ }
  }
  return found
}

export async function detectStack(targetDir: string): Promise<DetectedStack> {
  const anchorFiles = await collectAnchorFiles(targetDir)

  // Rodar todos os probes (nao parar no primeiro — precisamos de secondary)
  const hits: Array<{ id: StackId; signalSource: string }> = []
  for (const probe of PROBES) {
    const result = await probe(targetDir)
    if (result) hits.push({ id: result.id as StackId, signalSource: result.signalSource })
  }

  if (hits.length === 0) {
    return { primary: null, secondary: [], signalSource: 'no signal', anchorFiles }
  }

  // Primary = primeiro hit na ordem de PROBES (preserva precedencia historica: nextjs > node-ts > rails > ...)
  const [first, ...rest] = hits
  const secondary = rest.map((h) => h.id).filter((id) => id !== first.id)
  return {
    primary: first.id,
    secondary,
    signalSource: first.signalSource,
    anchorFiles,
  }
}
```

**Mudancas chave:**

1. Tipo `StackId` perde `'unknown'` (agora representado por `primary: null`).
2. Probes individuais NAO mudam — continuam retornando `{ id, signalSource } | null`.
3. `detectStack` agora roda TODOS os probes (nao para no primeiro hit) para popular `secondary`.
4. `anchorFiles` coletado independentemente dos probes (telemetria CA-06).
5. Precedencia preservada: ordem de `PROBES` define quem vira `primary` em conflito.

### Passo 4 (GREEN): atualizar call sites mapeados no Passo 1

Para cada call site:

```typescript
// ANTES
const stack = await detectStack(target)
if (stack.id === 'rails') { ... }
if (stack.id === 'unknown') { ... }

// DEPOIS
const stack = await detectStack(target)
if (stack.primary === 'rails') { ... }
if (stack.primary === null) { ... }
```

Cuidado especial:

- `run-stack-knowledge-init.ts`: assinatura aceita `primary?: StackId`. Quando chamado sem flag explicita, derivar de `(await detectStack(targetDir)).primary`.
- `write-stack-json.ts`: schema `.claude/stack.json` v1 ja tem campo `primary` — apenas confirmar que persiste `primary: null` corretamente (nao `"unknown"` literal).
- Tests que faziam `expect(stack.id).toBe('rails')` viram `expect(stack.primary).toBe('rails')`.

Rodar `bun run test` global — todos os tests passam (RED do Passo 2 + regressao zero em outras suites).

### Passo 5: confirmar precedencia (ordem dos probes)

A ordem em `PROBES = [probeNextjs, probeNodeTs, probeRails, probeLaravel, probePython]` define qual stack vira `primary` em monorepo. Para CA-07 (Rails+Node) o PRD espera `primary='rails'` — mas a ordem atual coloca Next.js e Node-TS ANTES de Rails.

**Decisao:** monorepo de teste CA-07 NAO tem `package.json#dependencies.next` nem `typescript` em deps (apenas devDeps). Verificar se isso e suficiente para Rails virar primary. Se ordem ainda priorizar Node-TS, considerar:

- **Opcao A:** reordenar `PROBES` para [rails, nextjs, nodeTs, ...] (quebra precedencia historica do Node).
- **Opcao B:** adicionar heuristica de "arquivos majoritarios" — contar `.rb` vs `.ts`/`.js` e usar como tie-break.
- **Opcao C:** aceitar que CA-07 da fixture monorepo precisa `package.json` MINIMO (sem `typescript` em devDeps) para Rails virar primary; secondary vira `[]`.

Discutir com dev antes de Passo 6 se test CA-07 falhar.

### Passo 6: atualizar JSDoc + comments inline

Adicionar JSDoc completo em `detectStack` mencionando o novo formato + exemplo de monorepo. Comentar `// 2026-05-18 (Luiz/dev): D22 multi-stack contract — pre-existing single-stack callers atualizados em Plano01 fase-03` proximo ao tipo.

---

## Gotchas

- **Local — quebra de API:** call sites que importam `DetectedStack` precisam compilar. Grep amplo no Passo 1 evita esquecer. `bun run typecheck` global e o gate final.

- **Local — `'unknown'` desapareceu como `StackId`:** se algum codigo externo (fora de skills/init) usa `'unknown'` como discriminante, agora deve usar `primary === null`. Provavel zero call sites externos — mas grep `'unknown'` em strings tambem (pode aparecer em telemetria string literal).

- **Local — precedencia em monorepo:** ordem dos probes ainda decide primary. CA-07 (Rails+Node) testa o caso esperado; se falhar, escalar decisao A/B/C do Passo 5.

- **Local — backwards compat NAO se aplica:** stack.json v1 ja tem `primary`+`secondary`. Nenhum stack.json em projeto user precisa de migracao — o schema persistido era compativel desde a v6.3.2 (so o detector retornava menos campos).

- **G1 do plano (detector ja existe):** continua valido — regex Rails inalterada. Refactor mexe na ORQUESTRACAO (forma do retorno), nao nos probes.

---

## Verificacao

### TDD

- [ ] **RED:** 4 testes novos (CA-02, CA-07, CA-03 fallback, CA-21 zero signal) FALHAM por `stack.primary` nao existir
  - Comando: `bun run test -- detect-stack`
  - Resultado esperado: `4 failed` (cada um com `expect(undefined).toBe(...)` ou TypeError)

- [ ] **GREEN:** Apos refactor + atualizacao de call sites, todos os tests passam
  - Comando: `bun run test`
  - Resultado esperado: full suite verde

### Checklist

- [ ] `skills/init/lib/detect-stack.ts` exporta novo tipo `DetectedStack` com 4 campos (`primary`, `secondary`, `signalSource`, `anchorFiles`)
- [ ] 4 test cases novos passam: CA-02 happy, CA-07 monorepo, CA-03 fallback Sinatra, CA-21 zero signal
- [ ] Call sites atualizados: `run-stack-knowledge-init.ts`, `write-stack-json.ts`, `emit-stack-knowledge-events.ts` (se aplicavel), tests legados
- [ ] `bun run typecheck` limpo (zero `Property 'id' does not exist on type 'DetectedStack'`)
- [ ] `bun run test` global zero regressoes
- [ ] `bun run lint` limpo
- [ ] MEMORY.md tem `DI-Plano01-fase03-callsites` com lista dos arquivos modificados
- [ ] Se Passo 5 escalou decisao A/B/C, registrar como `DI-Plano01-fase03-precedence` em MEMORY.md

---

## Criterio de Aceite

**Por maquina:**

- `bun run test -- detect-stack` retorna `12+ passed, 0 failed`
- `bun run test` global retorna 0 falhas
- `bun run typecheck` retorna 0
- `bun run lint` retorna 0
- `grep -rn 'stack\.id' skills/ tests/` retorna 0 matches (todos migrados para `.primary`)

**Por humano:**

- Tipo `DetectedStack` no codigo bate exatamente com D22 do CONTEXT.md
- JSDoc de `detectStack` inclui exemplo de monorepo
- Decisao A/B/C do Passo 5 (se necessaria) registrada em MEMORY.md com justificativa

---

<!-- Inserido por /grill-me (risk resolution D22) em 2026-05-18 -->
