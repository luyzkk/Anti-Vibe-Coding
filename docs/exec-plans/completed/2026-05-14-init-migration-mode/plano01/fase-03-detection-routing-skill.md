# Fase 03: SKILL.md Step 0 — Routing para Migration Mode

**Plano:** 01 — Fundação: Category Field + Detection + Tracer Bullet
**Sizing:** 1h
**Depende de:** fase-02 (migration-mode-detector.ts deve existir antes de referenciar no SKILL.md)
**Visual:** false

---

## O que esta fase entrega

Expande o `skills/init/SKILL.md` com um novo bloco de routing no "Passo 0" que chama
`detectInitMode` e roteia para o fluxo correto com base nos 4 modos. O 3rd state
(`migration`) dispara `AskUserQuestion` com estimativa de tokens (RF-MH-06) antes de
prosseguir. Nenhum código TS novo — apenas edição do markdown do SKILL.md.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Editar | Substituir "Passo 0 — Detectar Instalação Existente" com routing completo dos 4 modos |

---

## Implementacao

### Passo 1: Entender o fluxo atual antes de editar

O SKILL.md atual tem:
1. **Step 0.5:** detectV5Legacy → exit(1) se legacy, exit(2) se partial migration
2. **Step migrate.0 / migrate.all / etc.:** fluxo de migração v5
3. **Passo 0 — Detectar Instalação Existente:** checa manifest, vai para update ou install
4. **Passos 1–7:** scaffold greenfield

O problema é que "Passo 0" atual já usa `hasManifest` para bifurcar em update vs install,
mas o "install" vai direto para greenfield scaffold sem checar o 3rd state.

**Inserção correta:** O novo routing deve substituir o bloco do "Passo 0" (que atualmente
só detecta manifest vs não-manifest) por uma versão expandida que usa `detectInitMode`.
O Step 0.5 (v5 legacy) pode ser consolidado DENTRO do `detectInitMode` ou mantido separado —
por consistência com a fase-02 (que reutiliza `detectV5Legacy`), manter o Step 0.5 separado
e deixar que o routing do Passo 0 cubra v5-legacy também.

### Passo 2: Escrever o novo bloco do Passo 0

Substituir a seção `### Passo 0 — Detectar Instalação Existente e Invalidar Cache` inteira por:

```markdown
### Passo 0 — Detectar Modo de Inicialização (migration-mode-detector)

**ANTES de qualquer coisa**, detectar o modo de inicialização do projeto:

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { detectInitMode } = await import('./lib/migration-mode-detector.ts')

const { mode, signals } = await detectInitMode(process.cwd())
console.log(`## Anti-Vibe Coding — Inicialização\nModo detectado: ${mode}`)
signals.forEach((s) => console.log(`  [${s.type}] ${s.description}`))
```

#### Se mode === 'already-initiated' → Modo Atualização

O projeto já tem Anti-Vibe Coding instalado. Executar lógica de **atualização incremental**
(ver `skills/update/SKILL.md`). Não seguir para os passos seguintes.

#### Se mode === 'v5-legacy' → Migração v5

Equivalente ao exit(1) do Step 0.5 original. Prompt user com:
- Migrar / Dry-run / Skip (treat as new)

Seguir para `Step migrate.all` (usa `migrate-orchestrator.ts`). Não seguir para greenfield.

#### Se mode === 'migration' → Migration Mode (3rd State — novo RF-MH-01)

Repo populado com docs institucionais humanos — sem harness. Mostrar resumo:

```
## Anti-Vibe Coding — Migration Mode

Detectei N arquivos de documentação existentes em docs/:
  [lista dos primeiros 5 paths do signal 'populated-docs']

Este projeto não tem Anti-Vibe Coding instalado mas tem documentação institucional
que pode ser mapeada para o canon de André Prado (22 arquivos) + 4 extensões anti-vibe.

O pipeline de migração executa em 5 fases via subagentes LLM:
  Fase 0: Discovery (inventário automático) — ~0 tokens
  Fase 1: Exploração por subagente Explorer — ~12.000 tokens estimados
  Fase 2: Reconciliação por subagente Reconciler — ~8.000 tokens estimados
  Fase 3: Geração de planos de migração (~N planos) — ~15.000 tokens estimados
  Fase 4: Manifest + Orchestrator — ~0 tokens
  Total estimado: ~35.000 tokens (varia com tamanho dos docs)
```

Usar `AskUserQuestion` com opções:
- 1: "Iniciar migration pipeline" → seguir para `Step migration.0`
- 2: "Dry-run (ver inventário sem executar)" → seguir para `Step migration.dry-run`
- 3: "Tratar como greenfield (ignorar docs existentes)" → seguir para Passo 1

**IMPORTANTE (RF-MH-06):** A confirmação humana via AskUserQuestion é OBRIGATÓRIA antes
de qualquer fase que consuma tokens. Nunca iniciar a migration pipeline sem confirmação.

#### Se mode === 'greenfield' → Instalação Normal

Primeira instalação em repo limpo. Seguir para Passo 1 normalmente.
```

### Passo 3: Adicionar Step migration.0 como stub (Tracer Bullet — fase-04 expande)

Logo após o bloco do Passo 0, adicionar um placeholder para o fluxo migration:

```markdown
### Step migration.0: Discovery stub (Plano 01 fase-04 — tracer bullet)

<!-- Stub: executa discovery.ts quando disponível (Plano 02). Por enquanto gera 1 migration plan
     com 10 seções usando o template do new-plan.ts como shape. -->

```javascript
// DI-06: import direto (GT-04).
// NOTA: discovery.ts ainda não existe (Plano 02). Este stub gera diretamente 1 plano
// com o shape correto para provar a arquitetura end-to-end (tracer bullet).
const { runMigrationTracer } = await import('./lib/migration-tracer.ts')

const result = await runMigrationTracer(process.cwd())
console.log('Migration tracer:', result.status)
console.log('Plan created:', result.planPath)
console.log('Manifest written:', result.manifestPath)
```

Se result.status === 'ok': mostrar ao usuário o path do plano gerado e instruir próximos passos.
```

### Passo 4: Não remover Step 0.5

O `Step 0.5` (detectV5Legacy) pode permanecer no arquivo — `detectInitMode` já internamente
delega para `detectV5Legacy`, mas o SKILL.md pode omiti-lo se o novo Passo 0 cobre todos os casos.
Se mantido, garantir que Step 0.5 não seja alcançado quando mode já foi determinado pelo Passo 0.
A solução mais limpa: marcar Step 0.5 como `<!-- DEPRECATED: coberto pelo Passo 0 via detectInitMode -->`.

---

## Gotchas

**G1 — Posicionamento correto na sequência de passos:** O novo Passo 0 deve vir ANTES do Step 0.5
no arquivo. Se o Step 0.5 ficar acima, o LLM pode executá-lo antes do routing completo. Inspecionar
a ordem atual do SKILL.md antes de editar para garantir que a inserção respeita a sequência de execução.

**G3 — AskUserQuestion é allowed-tool:** O SKILL.md tem `allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion`.
`AskUserQuestion` já está na lista — a confirmação humana (RF-MH-06) não requer mudança nos metadados do skill.

**Nenhum novo módulo TS nesta fase:** O `migration-tracer.ts` referenciado no stub é criado na fase-04.
Nesta fase apenas documenta a intenção no SKILL.md — o LLM não executará o step migration.0 até que
`migration-tracer.ts` exista.

---

## Verificacao

### TDD

Esta fase edita markdown — sem ciclo RED/GREEN TS. Verificação é por smoke test manual:

- [ ] Abrir SKILL.md e confirmar que "Passo 0" contém bloco `detectInitMode` + 4 branches
- [ ] Confirmar que `AskUserQuestion` aparece no branch `migration`
- [ ] Confirmar que Step 0.5 está marcado como `DEPRECATED` ou removido
- [ ] Confirmar que `Step migration.0` stub existe logo após o Passo 0

### Checklist
- [ ] SKILL.md tem novo "Passo 0" com 4 branches (already-initiated / v5-legacy / migration / greenfield)
- [ ] Branch `migration` inclui estimativa de tokens e AskUserQuestion com 3 opções
- [ ] Branch `migration` NÃO executa tokens antes da confirmação humana (RF-MH-06)
- [ ] `Step migration.0` stub referencia `migration-tracer.ts` (criado na fase-04)
- [ ] Lint limpo: `bun run lint` (o linter valida markdown se configurado)

---

## Criterio de Aceite

**Por humano:**
- Ler o Passo 0 do SKILL.md e confirmar que os 4 modos estão presentes com routing correto
- Confirmar que AskUserQuestion bloqueia execução antes de consumir tokens

**Por maquina:**
- `bun run harness:validate` retorna exit 0 (valida estrutura do plugin sem erros)

<!-- Gerado por /plan-feature em 2026-05-14 -->
