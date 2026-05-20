<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Lista completa de docs populaveis

**Plano:** 01 — MH-1 Lista completa de docs (Tracer Bullet)
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

A lista canonica de docs populaveis (>= 12) materializada no codigo: `EXCLUDED_FROM_POPULATION_V2`
reduzido a apenas `docs/COMPOUND_ENGINEERING.md`, `CanonicalDoc` estendido com
`docs/PRODUCT_SENSE.md` + `README.md`, e `TEMPLATE_MANIFEST` confirmado/expandido para
`ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | linhas 59-64: remover `'docs/PRODUCT_SENSE.md'` e `'README.md'` do Set; atualizar comentario datado anulando D14 |
| `skills/init/lib/stack-aware-input-paths.ts` | Modify | linhas 15-27: adicionar `'docs/PRODUCT_SENSE.md'` e `'README.md'` ao union `CanonicalDoc` |
| `skills/init/lib/template-manifest.ts` | Modify (condicional) | adicionar entries para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md` SE ausentes (verificar primeiro com Read; README.md ja esta presente linha 86) |
| `skills/init/assets/templates/ARCHITECTURE.md.tpl` | Create (condicional) | criar se entry foi adicionada e .tpl nao existe (stub minimo com header e secao Convencoes) |
| `skills/init/assets/templates/AGENTS.md.tpl` | Create (condicional) | criar se entry foi adicionada e .tpl nao existe (stub minimo com header e instrucao "espelhar CLAUDE.md") |
| `skills/init/assets/templates/.claude/CLAUDE.md.tpl` | Create (condicional) | criar se entry foi adicionada e .tpl nao existe (stub minimo com header e instrucao "espelhar AGENTS.md") |

---

## Implementacao

### Passo 1: Verificar TEMPLATE_MANIFEST atual

Antes de qualquer edicao, abrir `skills/init/lib/template-manifest.ts` e confirmar quais das 3
entries-alvo ja existem:

- `ARCHITECTURE.md` (dst raiz) — esperado AUSENTE (manifest atual so tem `README.md` na raiz +
  `TODO.md`)
- `AGENTS.md` (dst raiz) — esperado AUSENTE
- `.claude/CLAUDE.md` (dst dentro de `.claude/`) — esperado AUSENTE

Para cada AUSENTE: adicionar entry no array `TEMPLATE_MANIFEST`. Para cada PRESENTE: apenas
registrar no MEMORY.md como confirmacao (sem mudanca).

```typescript
// 2026-05-19 (Luiz/dev): D6 do PRD populate-plan-andre-port — ARCHITECTURE.md, AGENTS.md e
// .claude/CLAUDE.md sao docs canonicos do contrato Harness do Andre (espelhados). Sem opt-out:
// alguns agents externos so leem AGENTS.md, outros so CLAUDE.md, ambos devem coexistir.
{ src: 'ARCHITECTURE.md.tpl',          dst: 'ARCHITECTURE.md',          required: true,  category: 'canon-andre' },
{ src: 'AGENTS.md.tpl',                dst: 'AGENTS.md',                required: true,  category: 'canon-andre' },
{ src: '.claude/CLAUDE.md.tpl',        dst: '.claude/CLAUDE.md',        required: true,  category: 'anti-vibe-extension' },
```

Posicionar as 3 entries logo apos a linha 87 (`.github/pull_request_template.md.tpl`), antes do
fechamento do array. Categoria `canon-andre` para ARCHITECTURE e AGENTS (estao no canon do Andre).
Categoria `anti-vibe-extension` para `.claude/CLAUDE.md` (extensao do plugin — Andre nao tem
`.claude/`).

### Passo 2: Criar `.tpl` minimos quando necessario

Para cada entry adicionada no Passo 1, criar `.tpl` correspondente em `skills/init/assets/templates/`.
Conteudo minimo (LLM em /execute-plan completa depois):

```markdown
<!-- ARCHITECTURE.md.tpl — 2026-05-19 (Luiz/dev): stub minimo. -->
<!-- Conteudo populado pelo /execute-plan via Plano 03 fase-02 (instrucao imperativa). -->
# Architecture

## Convencoes nao-obvias

TBD — sera preenchido pelo /execute-plan apos analise do codebase.

## Fronteiras entre camadas

TBD.

## Contratos entre modulos

TBD.
```

Para `.claude/CLAUDE.md.tpl` adicional, criar subpasta `skills/init/assets/templates/.claude/`
antes de criar o arquivo (verificar com `ls` primeiro).

### Passo 3: Reduzir `EXCLUDED_FROM_POPULATION_V2`

Em `skills/init/lib/populate-plan-generator.ts`, linhas 59-64. Estado atual:

```typescript
// 2026-05-19 (Luiz/dev): preservado do gerador v1 — D14 do PRD mantem filosoficos sem populate.
const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
```

Substituir por:

```typescript
// 2026-05-19 (Luiz/dev): D5 do PRD populate-plan-andre-port — reverte D14 do PRD anterior.
// PRODUCT_SENSE.md e README.md voltam para populate (Andre tem ambos ricos no harness).
// COMPOUND_ENGINEERING.md fica de fora: meta-doc filosofico do processo, sem codigo a referenciar.
// Build quebra (parity test, Plano 01 fase-02) se alguem readicionar entry — CA-04 do PRD.
const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
])
```

### Passo 4: Estender `CanonicalDoc` type

Em `skills/init/lib/stack-aware-input-paths.ts`, linhas 15-27. Adicionar 2 entries ao union:

```typescript
// 2026-05-19 (Luiz/dev): D5 do PRD populate-plan-andre-port — PRODUCT_SENSE e README entram
// no contrato de docs canonicos. Plano 04 (MH-4) adiciona paths reais por stack.
export type CanonicalDoc =
  | 'AGENTS.md'
  | 'ARCHITECTURE.md'
  | 'CLAUDE.md'
  | 'README.md'
  | 'docs/DESIGN.md'
  | 'docs/FRONTEND.md'
  | 'docs/PRODUCT_SENSE.md'
  | 'docs/SECURITY.md'
  | 'docs/RELIABILITY.md'
  | 'docs/PLANS.md'
  | 'docs/QUALITY_SCORE.md'
  | 'docs/CODE_STYLE.md'
  | 'docs/STATE.md'
  | 'docs/design-docs/core-beliefs.md'
```

Ordem alfabetica preservada para reduzir conflito futuro.

### Passo 5: Confirmar Step 91 assertion ainda valida

Em `skills/init/lib/steps/91-generate-populate-plan.ts` linha 46-48, a assertion defensiva exige
`plan.phases.length < 10` para abortar. Com a lista expandida (>= 12 esperado), a assertion segue
valida — nao precisa alterar nesta fase. **Apenas verificar** que nao ha outro literal `10`
referenciando essa lista; se houver, registrar no MEMORY.md.

---

## Gotchas

- **G2 do plano (D14 obsoleto):** O comentario antigo `D14 do PRD mantem filosoficos sem populate`
  na linha 59 e do PRD ANTERIOR (Plano 03 antigo). Substitua pelo bloco datado 2026-05-19 do Passo
  3. Manter linha de origem visivel ajuda revisor a entender que NAO e nova exclusao.
- **G3 do plano (.claude/CLAUDE.md sem opt-out):** Adicionar entry no `TEMPLATE_MANIFEST` mesmo se
  o reviewer questionar — D6 do PRD e explicito. A entry e obrigatoria; o arquivo gerado e espelho
  de AGENTS.md por instrucao em Plano 03 fase-02.
- **G4 do plano (regressao no teste existente):** APOS essa fase, o teste em
  `populate-plan-generator.test.ts` linhas 44-54 fica falsamente verde (PRODUCT_SENSE e README
  agora ESTAO no plano, mas o assert e `not.toContain` — ele passa porque "not contains nao
  contains" e tautologico se o array nao tiver o item; mas o INTENTO original era afirmar exclusao
  ativa). Documentar essa armadilha aqui — fase-03 reescreve o teste com intent novo.
- **Local: TEMPLATES_ROOT path:** O `path.join(import.meta.dir, '..', 'assets', 'templates')` em
  `template-manifest.ts:90` aponta para `skills/init/assets/templates/`. Confirmar que os `.tpl`
  novos sao criados sob essa raiz (e nao em outra pasta).

---

## Verificacao

### TDD

Nao ha teste RED novo nesta fase — a logica e estrutural. Validacao acontece via:

1. Testes EXISTENTES (`populate-plan-generator.test.ts`) — alguns vao virar falsos positivos por
   tautologia mas continuam VERDES (sem quebra).
2. fase-02 cria parity test E2E que valida a expansao em integracao.
3. fase-03 corrige o teste unitario.

### Checklist

- [ ] `EXCLUDED_FROM_POPULATION_V2` contem **apenas** `docs/COMPOUND_ENGINEERING.md`. Verificavel:
      `grep -n "EXCLUDED_FROM_POPULATION_V2" skills/init/lib/populate-plan-generator.ts` mostra 1
      entry no Set.
- [ ] `CanonicalDoc` union em `stack-aware-input-paths.ts` contem `'docs/PRODUCT_SENSE.md'` e
      `'README.md'`. Verificavel: `bun run typecheck` (se configurado) ou inspecao manual.
- [ ] `TEMPLATE_MANIFEST` em `template-manifest.ts` contem entries para `ARCHITECTURE.md`,
      `AGENTS.md`, `.claude/CLAUDE.md` (3 entries novas — ou confirmacao de que ja existiam).
- [ ] Cada entry nova tem `.tpl` correspondente em `skills/init/assets/templates/` (criados no
      Passo 2).
- [ ] Comentarios datados 2026-05-19 substituem os comentarios obsoletos (linhas 59-64 do
      populate-plan-generator.ts).
- [ ] Build TypeScript: `bun run typecheck` (ou equivalente) limpo — uniao expandida nao quebra
      callers em `populate-plan-generator.ts:9` (import) e `stack-aware-input-paths.ts`.
- [ ] Testes existentes: `bun test skills/init/lib/populate-plan-generator.test.ts` — 6 passed
      (5 testes pre-existentes + assertion tautologica do teste linha 44-54 que ainda passa).
      **Esperado: nao quebra.** Se quebrar, ler erro — pode ser TS error no caller.
- [ ] Suite completa: `bun test` — sem novos failures (greenfield-populate-plan.test.ts pode
      precisar ajuste se contar entries; verificar e registrar no MEMORY.md).

### Comandos verificaveis

```powershell
# Confirmar EXCLUDED reduzido
bun test skills/init/lib/populate-plan-generator.test.ts

# Confirmar typecheck
bun run typecheck

# Confirmar suite ampla
bun test
```

---

## Criterio de Aceite

**Por maquina:**
- `EXCLUDED_FROM_POPULATION_V2.size === 1` (so `docs/COMPOUND_ENGINEERING.md`).
- `CanonicalDoc` union (introspectavel via TypeScript) tem >= 14 membros incluindo
  `'docs/PRODUCT_SENSE.md'` e `'README.md'`.
- `TEMPLATE_MANIFEST.some(e => e.dst === 'ARCHITECTURE.md') === true`.
- `TEMPLATE_MANIFEST.some(e => e.dst === 'AGENTS.md') === true`.
- `TEMPLATE_MANIFEST.some(e => e.dst === '.claude/CLAUDE.md') === true`.

**Por humano:**
- Diff do commit mostra comentarios datados 2026-05-19 anulando D14 e apontando para PRD MH-1 / D5.
- Nenhum `.tpl` novo tem conteudo > 30 linhas (sao stubs — corpo real vem em /execute-plan).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
