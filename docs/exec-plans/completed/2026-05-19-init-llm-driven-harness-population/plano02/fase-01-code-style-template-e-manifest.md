<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: CODE_STYLE.md template e TEMPLATE_MANIFEST entry

**Plano:** 02 — Scaffold expandido + Backup pre-mutacao
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Novo template `assets/templates/docs/CODE_STYLE.md.tpl` (scaffold canonico vazio) e nova
entrada em `TEMPLATE_MANIFEST` declarando `docs/CODE_STYLE.md` como doc canonico de
`anti-vibe-extension` — habilita o scaffold-full-tree a criar esse arquivo em todo init
greenfield. Resolve MH-03 (docs canonicos incluem CODE_STYLE.md) e MH-06 (Akita destinado
a CODE_STYLE.md, nao DESIGN.md).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/docs/CODE_STYLE.md.tpl` | Create | Scaffold canonico vazio com headings padronizados — populado pelo PLAN populate (Plano 03) |
| `skills/init/lib/template-manifest.ts` | Modify | Adicionar entrada `{ src: 'docs/CODE_STYLE.md.tpl', dst: 'docs/CODE_STYLE.md', required: true, category: 'anti-vibe-extension' }` no FIM da Camada 1, apos COMPOUND_ENGINEERING.md (decisao Plano 02 ponto-revisao 1 = opcao C: posicao por data + comentario de proveniencia, seguindo padrao MERGE_GATES) |
| `skills/init/lib/template-manifest.test.ts` | Modify | Adicionar assertion que entry de CODE_STYLE.md aparece no manifest (se arquivo existir) |
| `skills/init/lib/scaffold-full-tree.test.ts` | Modify | Adicionar assertion `expect(files).toContain('docs/CODE_STYLE.md')` em fixture greenfield |

---

## Implementacao

### Passo 1: Criar o template `CODE_STYLE.md.tpl`

Scaffold canonico VAZIO — apenas headings e placeholder. NAO copiar conteudo dos snippets
`akita-*.md` aqui (G-local 2). Conteudo real sera sintetizado pela LLM no PLAN populate
gerado pelo Plano 03.

Conteudo do `skills/init/assets/templates/docs/CODE_STYLE.md.tpl`:

```markdown
<!-- 2026-05-19 (Luiz/dev): CODE_STYLE.md scaffold — MH-03, MH-06, CA-08.
     Conteudo populado pelo subagente do PLAN populate (Plano 03 fase-03).
     Inputs reais: assets/snippets/akita-code-style.md + akita-comments.md +
     akita-tests.md + akita-dependencies.md + akita-logging.md. -->

# CODE_STYLE.md

> Code style and conventions for AI agents and human contributors.
> Companion to [DESIGN.md](./DESIGN.md) (visual Design System).

<!-- placeholder — populado por /execute-plan na fase correspondente do plano populate -->

## Naming

<!-- TODO: nomes grepaveis, dominio-especificos. -->

## Functions

<!-- TODO: tamanho maximo, SRP, side effects explicitos. -->

## Files

<!-- TODO: tamanho maximo, organizacao por dominio. -->

## Single Responsibility

<!-- TODO: regras concretas com exemplos do codebase. -->

## Types

<!-- TODO: sem `any`, type guards sobre `unknown`, contratos publicos. -->
```

### Passo 2: Adicionar entry no TEMPLATE_MANIFEST

Editar `skills/init/lib/template-manifest.ts`. Adicionar a linha abaixo no FIM da Camada 1
(docs institucionais), logo apos a entry de `docs/COMPOUND_ENGINEERING.md` e antes do
comentario `// Camada 2: design-docs/`.

**Decisao de posicionamento (ponto-revisao 1 do Plano 02, opcao C):** seguir o padrao
estabelecido por `MERGE_GATES` (linha 35 do arquivo atual) — posicao por data de adicao
com comentario de proveniencia inline. Mais consistente com o estilo do arquivo do que
ordem alfabetica estrita.

Snippet TS exato a inserir:

```typescript
  // 2026-05-19 (Luiz/dev): Plano 02 fase-01 — CODE_STYLE.md destino do Akita-style
  // (Bug E, MH-06, CA-08). Separa code-style de DESIGN.md (Design System visual).
  // Categoria anti-vibe-extension pois nao faz parte dos 22 docs canonicos do Andre Prado (DT-09).
  // D1 do CONTEXT.md: nome canonico = docs/CODE_STYLE.md.
  { src: 'docs/CODE_STYLE.md.tpl',                 dst: 'docs/CODE_STYLE.md',                 required: true,  category: 'anti-vibe-extension'  },
```

**Ordem no array final (extracto da Camada 1):**

```typescript
  // Camada 1: docs institucionais (raiz docs/)
  // ... entradas existentes (DESIGN.md, FRONTEND.md, ..., COMPOUND_ENGINEERING.md) ...
  { src: 'docs/COMPOUND_ENGINEERING.md.tpl',       dst: 'docs/COMPOUND_ENGINEERING.md',       required: true,  category: 'anti-vibe-extension'  },
  // 2026-05-19 (Luiz/dev): Plano 02 fase-01 — CODE_STYLE.md (Bug E, MH-06, CA-08).
  { src: 'docs/CODE_STYLE.md.tpl',                 dst: 'docs/CODE_STYLE.md',                 required: true,  category: 'anti-vibe-extension'  },

  // Camada 2: design-docs/
  // ...
```

### Passo 3: Ajustar testes do scaffold para verificar CODE_STYLE.md

Editar `skills/init/lib/scaffold-full-tree.test.ts`. Adicionar (ou estender o teste de
greenfield ja existente) a assertion:

```typescript
// 2026-05-19 (Luiz/dev): MH-03 — CODE_STYLE.md presente no scaffold greenfield.
it('creates docs/CODE_STYLE.md as part of scaffold-full-tree', async () => {
  const tmpDir = await mkTempProject()
  await scaffoldFullTree({ targetDir: tmpDir, /* ...opcoes padroes */ })

  const files = await listAllFiles(tmpDir)
  expect(files).toContain('docs/CODE_STYLE.md')
})
```

Se `skills/init/lib/template-manifest.test.ts` existir, adicionar assertion paralela:

```typescript
// 2026-05-19 (Luiz/dev): MH-03 — entry CODE_STYLE.md presente no manifest.
it('contains CODE_STYLE.md entry as anti-vibe-extension', () => {
  const entry = TEMPLATE_MANIFEST.find((e) => e.dst === 'docs/CODE_STYLE.md')
  expect(entry).toBeDefined()
  expect(entry?.category).toBe('anti-vibe-extension')
  expect(entry?.required).toBe(true)
  expect(entry?.src).toBe('docs/CODE_STYLE.md.tpl')
})
```

---

## Gotchas

- **G1 do plano (categoria):** Categoria DEVE ser `anti-vibe-extension`. Os 22 docs canonicos
  do Andre Prado sao imutaveis (DT-09 do harness PRD); CODE_STYLE.md e extensao do Anti-Vibe.
  Ausencia gera warning, nao erro — alinhado com a politica do validador para
  `anti-vibe-extension`.

- **G2 do plano (template vazio):** NAO copiar conteudo dos snippets `akita-*.md` aqui.
  Eles permanecem em `skills/init/assets/snippets/` como input REAL para o subagente do
  PLAN populate (Plano 03 fase-03 instruira a LLM a ler esses snippets e sintetizar).
  Template e scaffold canonico vazio com placeholders comentados.

- **G-local (posicionamento):** Inserir entry no FIM da Camada 1 (apos COMPOUND_ENGINEERING.md),
  NAO em ordem alfabetica. Segue o padrao estabelecido pelo `MERGE_GATES` (linha 35 do
  template-manifest.ts atual): posicao por data de adicao + comentario de proveniencia
  inline. Decisao registrada no ponto-revisao 1 do Plano 02 (opcao C).

- **G-local:** Se `template-manifest.test.ts` nao existir no codebase, NAO criar arquivo
  novo so para esta assertion — assertion no `scaffold-full-tree.test.ts` ja cobre. Verificar
  com `ls skills/init/lib/template-manifest.test.ts` antes.

---

## Verificacao

### TDD

- [ ] **RED:** Teste novo (`creates docs/CODE_STYLE.md`) falha porque entry ainda nao existe no manifest
  - Comando: `bun test skills/init/lib/scaffold-full-tree.test.ts -t "creates docs/CODE_STYLE.md"`
  - Resultado esperado: `Expected array to contain "docs/CODE_STYLE.md", received [...sem ele...]`

- [ ] **GREEN:** Apos adicionar entry no `TEMPLATE_MANIFEST` + criar o `.tpl`, teste passa
  - Comando: `bun test skills/init/lib/scaffold-full-tree.test.ts -t "creates docs/CODE_STYLE.md"`
  - Resultado esperado: `1 passed, 0 failed`

### Checklist

- [ ] Arquivo `skills/init/assets/templates/docs/CODE_STYLE.md.tpl` existe no FS
- [ ] Entry com `dst: 'docs/CODE_STYLE.md'` aparece em `TEMPLATE_MANIFEST` (Camada 1, FIM, apos COMPOUND_ENGINEERING.md — opcao C do ponto-revisao 1)
- [ ] Categoria da entry e literalmente `'anti-vibe-extension'` (nao `'canon-andre'`)
- [ ] `required` da entry e `true`
- [ ] `bun test skills/init` passa (todos os testes do diretorio init)
- [ ] `bun run lint` passa sem warnings novos
- [ ] Greenfield init em fixture cria `docs/CODE_STYLE.md` (verificavel por inspecao manual ou teste E2E)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init` passa
- `grep -c "dst: 'docs/CODE_STYLE.md'" skills/init/lib/template-manifest.ts` retorna `1`
- `grep -c "category: 'anti-vibe-extension'" skills/init/lib/template-manifest.ts` aumenta em 1 (vs baseline)
- `ls skills/init/assets/templates/docs/CODE_STYLE.md.tpl` retorna o arquivo (existe)
- Apos rodar scaffold em fixture greenfield: `ls {fixture}/docs/CODE_STYLE.md` retorna o arquivo

**Por humano:**
- Conteudo do `.tpl` segue o padrao do passo 1 (5 headings + 1 placeholder comentado em cada secao)
- Comentario de proveniencia no topo do `.tpl` cita Bug E + MH-06 + CA-08

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
