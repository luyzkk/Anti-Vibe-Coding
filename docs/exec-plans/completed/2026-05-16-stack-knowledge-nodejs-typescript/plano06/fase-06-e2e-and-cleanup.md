<!--
Princípio universal #5 — Comment Provenance.
Esta fase é gate de processo — executa E2E pré-existentes, rodam validações, e ao fim
executa cleanup destrutivo dos work artifacts. Comentários inline em qualquer fixture
nova de teste devem ter linhagem padrão.
-->

# Fase 06: E2E completo CA-01..CA-10 + harness:validate + cleanup destrutivo

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1-1.5h (E2E ~45min + auditoria humana CA-08 ~30min + cleanup ~10min, assumindo nenhum CA falhar)
**Depende de:** fase-01..05 deste plano + Plano 01 (tracer bullet + piloto + INDEX skeleton + init monostack + security wired) + Plano 02 (init multi-stack + telemetria) + Plano 03 (6 skills wired) + Plano 04 (5 átomos Batch A aprovados) + Plano 05 (5 átomos Batch B aprovados + RF8 primordials)
**Visual:** false (pode invocar /qa-visual em fluxo Claude Code se aplicável — nenhuma UI modificada nesta feature)

---

## O que esta fase entrega

Gate final de release v6.3.2: roda a matriz E2E completa cobrindo CA-01..CA-10 conforme PRD; executa `bun run test && bun run lint && bun run typecheck && bun run harness:validate`; conduz a auditoria humana CA-08 com a regra literal do PRD (1 tier 1 + 1 tier 2 + 1 tier 3); **só então** deleta os work artifacts `_catalog.md` e `_topic-plan.md` em `docs/knowledge/nodejs-typescript/`. Se algum gate falhar, registra falha em DI-4 do MEMORY.md e **bloqueia o cleanup destrutivo** — abre retrabalho na fase responsável.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-full-e2e.test.ts` | Create | E2E completo CA-01..CA-10 (pode reusar setup de `tests/e2e/stack-knowledge-tracer-bullet.test.ts` e helpers do Plano 02 fase-05) |
| `docs/knowledge/nodejs-typescript/_catalog.md` | Delete | Work artifact removido após gates verdes (G9 do plano) |
| `docs/knowledge/nodejs-typescript/_topic-plan.md` | Delete | Work artifact removido após gates verdes (G9 do plano) |
| `docs/exec-plans/active/2026-05-16-stack-knowledge-nodejs-typescript/plano06/MEMORY.md` | Modify | Registrar DI-1 (amostragem CA-08), DI-3 (veredito final v6.3.2), DI-4 (se houver falha) |

---

## Implementacao

### Passo 1: Setup do E2E completo (reusar fixtures dos planos anteriores)

Criar `tests/e2e/stack-knowledge-full-e2e.test.ts` reusando:
- Helpers de setup de projeto temp (`mkdtempSync`, `package.json` com TS, `Gemfile`, etc.) do `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (Plano 01 fase-05 + extensão Plano 02 fase-05)
- Helpers de invocação programática do `/init` (já existentes; CLAUDE.md "3+ usos justifica abstração" — esta é a 3ª reuso, então justifica extrair para `tests/e2e/helpers/` se ainda não foi)

### Passo 2: Asserts CA-01..CA-10 (matriz completa)

Para cada CA, escrever 1 teste (ou subtest `describe`):

**CA-01 — 14 átomos + INDEX válidos:**
```bash
# Conferir contagem + ausência de placeholders + frontmatter completo + cap de linhas
test "$(ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l)" -eq 14
for atom in docs/knowledge/nodejs-typescript/atoms/*.md; do
  grep -c '\[A DEFINIR\]' "$atom" | grep -q '^0$'
  test "$(wc -l < "$atom")" -le 200
  # Frontmatter completo: 8 campos
  for field in topic stack layer sources tier triggers related_skills updated; do
    grep -qE "^${field}:" "$atom"
  done
done
test "$(wc -l < docs/knowledge/nodejs-typescript/INDEX.md)" -le 100
```

**CA-02 — `/init` em Node+TS cria `stack.json` + copia 14 átomos em ≤100ms:**
```typescript
// Fixture: projeto temp com package.json contendo "typescript" em devDependencies
// Rodar /init programaticamente
// Asserts:
expect(existsSync(join(projectDir, '.claude/stack.json'))).toBe(true)
const stack = JSON.parse(readFileSync(join(projectDir, '.claude/stack.json'), 'utf-8'))
expect(stack.primary).toBe('nodejs-typescript')
expect(readdirSync(join(projectDir, '.claude/knowledge/atoms')).filter(f => f.endsWith('.md')).length).toBe(14)
expect(existsSync(join(projectDir, '.claude/knowledge/INDEX.md'))).toBe(true)
expect(durationMs).toBeLessThan(100)
```

**CA-03 — Rails puro: `primary: rails`, sem cópia Node:**
```typescript
// Fixture: projeto temp com Gemfile apenas
// Rodar /init
expect(stack.primary).toBe('rails')
expect(stack.secondary).toEqual([])
// .claude/knowledge/atoms/ não deve ter arquivos Node+TS (vazio em v6.3.2 — Rails knowledge ainda não existe)
const atomsDir = join(projectDir, '.claude/knowledge/atoms')
if (existsSync(atomsDir)) {
  expect(readdirSync(atomsDir).length).toBe(0)
}
```

**CA-04 — `.claude/knowledge/` pré-existente: skip + mensagem:**
```typescript
// Fixture: projeto temp com .claude/knowledge/ já criado com 1 arquivo dummy
// Rodar /init sem --refresh-knowledge
expect(output).toContain('Knowledge já existe em .claude/knowledge/')
expect(output).toContain('--refresh-knowledge')
// O arquivo dummy ainda deve existir (não overwritten)
expect(existsSync(join(projectDir, '.claude/knowledge/dummy.md'))).toBe(true)
```

**CA-05 — Skills cross-stack citam INDEX.md quando presente:**
```typescript
// Fixture: projeto temp com .claude/knowledge/INDEX.md populado
// Rodar /security (mockando ou via harness de skill test)
// Asserir que a resposta começa com preface citando .claude/knowledge/INDEX.md
expect(skillResponse).toMatch(/\.claude\/knowledge\/INDEX\.md/)
// Repetir para as outras 6 skills cross-stack: /api-design, /system-design, /design-patterns, /architecture, /infrastructure, /tdd-workflow
```

**CA-06 — Sem anchor: `primary: null`, sem crash:**
```typescript
// Fixture: projeto temp vazio (sem package.json, Gemfile, pyproject.toml, go.mod)
// Rodar /init
expect(exitCode).toBe(0)  // não crasha
expect(stack.primary).toBeNull()
expect(stack.secondary).toEqual([])
expect(stack.anchor_files).toEqual([])
expect(output).toContain('Stack não detectada')
```

**CA-07 — Multi-stack Rails+Node: `primary: rails, secondary: [nodejs-typescript]`:**
```typescript
// Fixture: projeto temp com Gemfile + package.json (com TS); maioria de .rb files
// Rodar /init
expect(stack.primary).toBe('rails')
expect(stack.secondary).toEqual(['nodejs-typescript'])
// Knowledge de Rails copiado (vazio em v6.3.2); knowledge de Node+TS NÃO copiado
// Tipicamente .claude/knowledge/atoms/ vazio ou ausente (Rails knowledge não existe)
```

**CA-08 — Auditoria humana com regra literal do PRD: 1 tier 1 + 1 tier 2 + 1 tier 3:**

Esta é a parte humana — não automatizada. Procedimento:

1. **Tier 3 (obrigatório, originário deste plano):** abrir `docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` (sugestão DI-1 do MEMORY.md; alternativas: `operations-and-deploy.md`, `tooling.md`)
2. **Tier 1 (reusar amostra do Batch A ou piloto):** confirmar com DI-4 do Plano 04 MEMORY.md qual tier 1 já foi amostrado lá. Escolher um DIFERENTE para alargar cobertura. Candidatos: `async-concurrency-streams.md`, `error-handling-observability.md`, `type-system-idioms.md` (piloto)
3. **Tier 2 (reusar amostra do Batch A ou B):** confirmar com DI-4 Plano 04 + DI-5 Plano 05. Escolher um DIFERENTE. Candidatos: `state-and-caching.md`, `data-persistence.md`, `code-smells-catalog.md`, `dependencies-supply-chain.md`
4. Rodar checklist humano (~10min cada átomo):
   - Skeleton respeitado (5 seções na ordem)
   - Frontmatter com 8 campos na ordem do piloto
   - Zero placeholders `[A DEFINIR]`
   - `wc -l` dentro da faixa esperada por tier (1: ~140; 2: ~130; 3: 120-180)
   - Patterns têm Problema + Padrão + Quando usar/NÃO
   - Triggers do frontmatter são keywords realistas
   - Audit-trail-path absoluto em "Referências externas" e/ou `sources:` (RF11)
   - Para tier 3 amostrado: claims sobre V8/libuv/internals são rastreáveis para passagem específica das rules citadas (≥80%)
5. Registrar amostragem + veredito em DI-1 e DI-3 do MEMORY.md.

**CA-09 — Skills cross-stack mantêm comportamento sem `.claude/knowledge/`:**
```typescript
// Fixture: projeto temp sem .claude/knowledge/ (greenfield)
// Rodar cada uma das 7 skills cross-stack
// Asserir: preface está vazio (string '' literal, não null, não undefined, não warning, não log)
// Comportamento da skill = v6.3.1 intacto (corpo original aparece, sem mudanças além do preface vazio)
expect(skillResponse).not.toMatch(/\.claude\/knowledge/)
expect(stderr).not.toContain('WARN')
expect(stderr).not.toContain('ERROR')
```

**CA-10 — Regressão `/init` (UX preservada):**
```typescript
// Fixture: projeto temp limpo (sem nenhuma mudança esperada — testa "UX atual além do output novo")
// Capturar output completo do /init
// Comparar contra snapshot de baseline pré-v6.3.2 (criar baseline na primeira run + commitar)
// Delta aceitável: apenas LINHAS ADICIONADAS sobre stack/knowledge:
//   - "Stack detected: nodejs-typescript"
//   - ".claude/stack.json created"
//   - "Knowledge copied: 14 atoms"
//   - "Knowledge cobre: event loop, prisma, ..." (RF10)
// Linhas removidas ou alteradas do baseline pré-v6.3.2 = REGRESSÃO. Falha CA-10.
expect(outputDiff.removed).toEqual([])
expect(outputDiff.altered).toEqual([])
```

**Detalhe CA-10:** se baseline pré-v6.3.2 não existir, **criar agora** capturando output de `/init` em fixture limpa COM as mudanças deste PRD desabilitadas (ou via git checkout em commit pré-v6.3.2 + capture + commit baseline + checkout volta). Sem baseline, CA-10 não é verificável e o gate falha.

### Passo 3: Rodar scripts de validação global

Em sequência:

```bash
bun run test && bun run lint && bun run typecheck && bun run harness:validate
```

Cada um deve sair com exit 0. Se algum falhar, registrar em DI-4 do MEMORY.md e bloquear cleanup.

### Passo 4: Verificar Review Checklist do PLAN.md

Abrir `../PLAN.md` e marcar cada item da seção "Review Checklist":
- [ ] CA-01..CA-10 (cobertos pelos asserts do Passo 2)
- [ ] `bun run test && bun run lint && bun run typecheck` verdes (Passo 3)
- [ ] `bun run harness:validate` verde (Passo 3)
- [ ] Work artifacts removidos (próximo passo — só marcar APÓS Passo 6)
- [ ] Telemetria emite `stack_detected` e `knowledge_copied` quando `/init` roda (verificável via inspeção do JSONL em `.claude/metrics/<YYYY-MM>.jsonl` durante CA-02 — Plano 02 fase-04 já implementou)

### Passo 5: Registrar veredito final em MEMORY.md (DI-3)

Adicionar entrada em `MEMORY.md > Decisoes de Implementacao`:

```
- **DI-3:** Feature v6.3.2 {aprovada | reprovada} em {YYYY-MM-DD} por {auditor}
  - E2E CA-01..CA-10: {10/10 PASS | N/10 PASS, falhas em <CAs>}
  - Auditoria humana CA-08 (regra literal PRD): 1 tier 1 (<slug>) + 1 tier 2 (<slug>) + 1 tier 3 (<slug>) — {OK | falha em <slug>: <motivo>}
  - Scripts globais: {test PASS | lint PASS | typecheck PASS | harness:validate PASS}
  - RF10 (preview keywords): {implementado e verificado | falha}
  - RF11 (audit-trail paths): {todos os 14 átomos OK | N átomos sem path}
  - Próximo passo: {cleanup destrutivo desbloqueado | retrabalho em fase-NN}
```

### Passo 6: CLEANUP DESTRUTIVO (G9 — só após TODOS os gates verdes)

**PRECONDIÇÃO INEGOCIÁVEL:** DI-3 do MEMORY.md marca "Feature v6.3.2 aprovada". Se DI-4 (falha) está aberta, **NÃO executar este passo** — abrir retrabalho.

Se aprovada:

```bash
# Confirmar uma última vez que o E2E está verde
bun run test -- stack-knowledge-full-e2e && bun run harness:validate

# Se exit 0, executar cleanup
rm docs/knowledge/nodejs-typescript/_catalog.md
rm docs/knowledge/nodejs-typescript/_topic-plan.md

# Verificar
ls docs/knowledge/nodejs-typescript/
# Esperado: apenas INDEX.md e atoms/ (sem _catalog.md, sem _topic-plan.md)
```

### Passo 7: Confirmar Exit Criteria do PLAN.md preenchidos

Abrir `../PLAN.md` §"Exit Criteria" e marcar:
- [ ] Todos os 10 itens do Review Checklist marcados ✓
- [ ] Plano 06 fase-06 concluído (E2E CA-01..CA-10 verde)
- [ ] PRD a mover de `docs/exec-plans/active/` para `docs/exec-plans/completed/` via `/iterate` ou manualmente (próximo passo do fluxo, fora desta fase)
- [ ] `compound/` atualizado se algum aprendizado emergir (gate da CLAUDE.md — discutir com humano se DI-3 registrou learnings)
- [ ] CHANGELOG/release-notes do plugin notam v6.3.2 com sumário do knowledge layer (próximo passo do fluxo, fora desta fase)

---

## Gotchas

- **G7 do plano (cobertura exata de 14 átomos):** asserção CA-01 começa por `ls atoms/*.md | wc -l == 14`. Se ≠ 14, gate falha automaticamente.
- **G8 do plano (verifier dos Planos 04+05 cobriu Batch A e B; Plano 06 cobre tier 3):** CA-08 aqui é a primeira oportunidade de cumprir a regra literal do PRD (1 tier 1 + 1 tier 2 + 1 tier 3). Reusar amostras dos batches anteriores para tier 1 e 2 NÃO é dispensa do gate — é alargamento de cobertura. Anotar em DI-1 que reuso é por amostragem cruzada (validação cross-batch), não por preguiça.
- **G9 do plano (cleanup destrutivo é FINAL):** `rm _catalog.md _topic-plan.md` só após `bun run test && bun run lint && bun run typecheck && bun run harness:validate` verdes E DI-3 marca aprovado. Se algum gate falhar, **NÃO deletar** — registrar em DI-4 e abrir retrabalho. Cleanup pode esperar; reescrever os work artifacts a partir do zero seria custoso.
- **G10 do plano (CA-10 exige baseline):** se baseline pré-v6.3.2 não foi capturado durante desenvolvimento (Planos 01 ou 02), capturar AGORA via git checkout em commit pré-v6.3.2 + run /init + capturar output + commit baseline + checkout volta. CA-10 não é verificável sem baseline.
- **Local — telemetria `stack_detected` e `knowledge_copied` verificável via JSONL:** Plano 02 fase-04 implementou. CA-02/CA-03/CA-06/CA-07 podem assertar adicionalmente que o JSONL contém os eventos esperados (`grep '"stack_detected"' .claude/metrics/<YYYY-MM>.jsonl | wc -l >= 1`). Não obrigatório (telemetria é Should Have), mas útil como prova adicional.
- **Local — paralelismo do E2E:** os 10 CAs podem rodar em paralelo (cada um em fixture temp isolada via `mkdtempSync`). Vitest `concurrent: true` ou `describe.concurrent`. Reduz tempo total de ~10min para ~2-3min.
- **Local — `/qa-visual` não aplicável aqui:** nenhuma UI foi modificada na feature. Mencionar explicitamente em DI-3 que `/qa-visual` foi skipped por não-aplicabilidade.
- **Local — se algum CA falhar:** identificar plano responsável (CA-01 → fase-04 deste plano OU Planos 04/05 átomos; CA-02 → Plano 01 fase-03 OU Plano 02 fase-03; CA-05 → Plano 01 fase-04 OU Plano 03 fase-01/02; CA-08 → fase-01/02/03 deste plano OU Planos 04/05 fases de átomos; etc.). Abrir retrabalho na fase responsável + re-rodar E2E após fix.

---

## Verificacao

### Conteúdo (gate de processo + E2E)

Esta fase é o último gate. Não há "TDD da fase" — TDD foi feita nos Planos 01-05; aqui é checagem agregada.

### Checklist

- [ ] `tests/e2e/stack-knowledge-full-e2e.test.ts` criado cobrindo CA-01..CA-10 (10 testes, 1 por CA)
- [ ] Helpers de fixture reusados de `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (ou extraídos para `tests/e2e/helpers/` se 3+ usos)
- [ ] CA-01 PASS — 14 átomos + INDEX válidos (frontmatter, sem placeholders, ≤200/≤100 linhas)
- [ ] CA-02 PASS — `/init` Node+TS cria `stack.json` + copia 14 átomos em ≤100ms
- [ ] CA-03 PASS — `/init` Rails puro: `primary: rails`, sem cópia Node+TS
- [ ] CA-04 PASS — `.claude/knowledge/` pré-existente: skip + mensagem `--refresh-knowledge`
- [ ] CA-05 PASS — 7 skills cross-stack citam `.claude/knowledge/INDEX.md` quando presente
- [ ] CA-06 PASS — Projeto sem anchor: `primary: null`, sem crash
- [ ] CA-07 PASS — Multi-stack Rails+Node: `primary: rails`, `secondary: [nodejs-typescript]`
- [ ] CA-08 PASS — Auditoria humana (1 tier 1 + 1 tier 2 + 1 tier 3) registrada em DI-1
- [ ] CA-09 PASS — Skills cross-stack graceful degradation sem `.claude/knowledge/`
- [ ] CA-10 PASS — `/init` UX preservada (snapshot diff = só adições)
- [ ] `bun run test && bun run lint && bun run typecheck && bun run harness:validate` todos exit 0
- [ ] DI-3 (veredito final) registrado em `MEMORY.md`
- [ ] (Se aprovado) `rm _catalog.md _topic-plan.md` executado — Passo 6
- [ ] (Se aprovado) `ls docs/knowledge/nodejs-typescript/` retorna apenas `INDEX.md` e `atoms/`
- [ ] Review Checklist do PLAN.md marcado completamente
- [ ] Exit Criteria do PLAN.md confirmados (preparado para `/iterate` mover PRD para `completed/`)
- [ ] (Se reprovado) DI-4 registrado com falha + plano de retrabalho; cleanup NÃO executado

---

## Criterio de Aceite

**Por maquina (cumulativo):**
- `bun run test -- stack-knowledge-full-e2e` retorna `10 passed, 0 failed` (CA-01..CA-10)
- `bun run test && bun run lint && bun run typecheck && bun run harness:validate` exit 0 (chain)
- `test -f docs/knowledge/nodejs-typescript/_catalog.md` exit 1 (deletado)
- `test -f docs/knowledge/nodejs-typescript/_topic-plan.md` exit 1 (deletado)
- `test -f docs/knowledge/nodejs-typescript/INDEX.md` exit 0 (preservado)
- `ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l` retorna 14
- `grep -q "DI-3.*Feature v6.3.2 aprovada" docs/exec-plans/active/2026-05-16-stack-knowledge-nodejs-typescript/plano06/MEMORY.md` exit 0

**Por humano:**
- Auditor confirma que os 3 átomos amostrados (1 tier 1 + 1 tier 2 + 1 tier 3) passam no checklist visual (skeleton + frontmatter + lem-como-sênior + claims rastreáveis ≥80%)
- Auditor confirma que CA-08 cumprido com regra literal do PRD (Plano 06 é o único momento onde isso é operacionalizável — DI-1)
- Dev rodando `/init` em projeto Node+TS real vê output completo (stack detection + knowledge copied + RF10 preview) sem regressão de UX (CA-10 humano-verificável complementa o snapshot diff automatizado)
- Nenhum link em outro doc ou skill aponta para `_catalog.md` ou `_topic-plan.md` após cleanup (`grep -r '_catalog.md\|_topic-plan.md' docs/ skills/` retorna apenas referências históricas em planos arquivados, se houver — sinalizar para revisão se aparecer em código ativo)
- Feature v6.3.2 pronta para `/iterate` mover PRD para `docs/exec-plans/completed/` + CHANGELOG/release notes

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
