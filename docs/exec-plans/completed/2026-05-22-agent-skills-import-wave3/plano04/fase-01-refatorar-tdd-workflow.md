<!--
Princípio universal #5 — Comment Provenance.
Refactor markdown-only: nenhum codigo de runtime tocado. JSDoc/Comments nao se aplicam.
-->

# Fase 01: Refatorar tdd-workflow/SKILL.md (Test Sizes + DAMP vs DRY + Test-Doubles Reference)

**Plano:** 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase — paralelizavel com fase-02 e fase-03)
**Visual:** false

---

## O que esta fase entrega

3 secoes novas adicionadas em `skills/tdd-workflow/SKILL.md` — `## Test Sizes`,
`## DAMP vs DRY em Testes`, `## Test-Doubles Reference` — preservando todo o conteudo
existente intacto (refactor por ADICAO, DT-5). Atende CA-07 + SH-01.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/tdd-workflow/SKILL.md` | Modify | Adicionar 3 secoes contiguas apos `## Piramide Invertida com IA` (linha 184) e ANTES de `## Classificacao de Complexidade (Modo Classico)` (linha 203). Ponto de insercao unico mantem agrupamento conceitual (todas explicam dimensoes de teste). |

---

## Implementacao

### Passo 1: Adicionar `## Test Sizes`

Inserir apos a ultima linha de `## Piramide Invertida com IA`. Conteudo operacional (nao
placeholder) cobrindo 3 tamanhos minimo. Estrutura sugerida:

```markdown
## Test Sizes

Tres tamanhos de teste segundo orcamento de tempo e fidelidade ao runtime real:

- **Unit (ms)** — milisegundos por teste, sem I/O, sem rede, sem filesystem. Funcao
  pura ou modulo com dependencias mockadas. Roda em massa (centenas em <1s).
- **Integration (sub-1s)** — sub-segundo, com storage fake (SQLite em memoria,
  in-process queue, msw para HTTP). Testa integracao real entre 2-3 modulos.
- **E2E (segundos)** — segundos por teste, com UI real, browser real (Playwright),
  banco real. Reservar para fluxos criticos de usuario.

| Tamanho | Custo | Quando usar |
|---------|-------|-------------|
| Unit | ms | Logica de dominio, parsing, transformacao de dados, validacao |
| Integration | sub-1s | Repositories, controllers, integracao entre services |
| E2E | segundos | Fluxos criticos end-to-end (login, checkout, onboarding) |

**Regra de proporcao:** 70% Unit, 20% Integration, 10% E2E. Inverter a piramide
(majoria E2E) torna a suite lenta e fragil.
```

### Passo 2: Adicionar `## DAMP vs DRY em Testes`

Logo apos `## Test Sizes`. Conteudo sobre o trade-off DRY vs DAMP em testes:

```markdown
## DAMP vs DRY em Testes

**DAMP** = "Don't Abstain from Meaningful Phrases". Testes aceitam alguma repeticao
se isso torna cada cenario auto-descritivo. Codigo de producao busca DRY; codigo de
teste prioriza CLAREZA.

**Anti-padrao (DRY demais):**

\`\`\`ts
function setup(role: string) {
  return createUserWithRole(role)
}

test('admin can delete', () => {
  const u = setup('admin')
  expect(canDelete(u)).toBe(true)
})

test('viewer cannot delete', () => {
  const u = setup('viewer')
  expect(canDelete(u)).toBe(false)
})
\`\`\`

O leitor precisa pular para `setup` para entender o cenario. Custo cognitivo
desproporcional ao ganho de 1 linha.

**DAMP (preferivel):**

\`\`\`ts
test('admin can delete posts', () => {
  const admin = createUserWithRole('admin')
  expect(canDelete(admin)).toBe(true)
})

test('viewer cannot delete posts', () => {
  const viewer = createUserWithRole('viewer')
  expect(canDelete(viewer)).toBe(false)
})
\`\`\`

Cada teste e auto-contido. Setup explicito vence indireção. Helpers de teste sao
extraidos APENAS quando a logica de setup e nao-obvia ou repetida 3+ vezes com
identica forma.
```

### Passo 3: Adicionar `## Test-Doubles Reference`

Logo apos `## DAMP vs DRY em Testes`. Tabela de referencia rapida com 4 tipos:

```markdown
## Test-Doubles Reference

| Tipo | O que faz | Quando usar |
|------|-----------|-------------|
| **Stub** | Retorna valor fixo para chamadas | Substituir dependencia sem comportamento dinamico (ex: `clock.now() → 2026-01-01`) |
| **Mock** | Verifica que uma chamada ocorreu com argumentos esperados | Testar side-effect (ex: `expect(emailer.send).toHaveBeenCalledWith(...)`) |
| **Fake** | Implementacao simplificada e funcional | Substituir DB real por in-memory (ex: `InMemoryUserRepository`) |
| **Spy** | Log de chamadas sem alterar comportamento | Observar fluxo sem modificar (ex: contar quantas vezes `logger.warn` foi chamado) |

**Regra:** prefira **Fake** quando o comportamento da dependencia importa (testa
mais cenarios reais). Use **Mock** com moderacao — mocks excessivos acoplam o teste
a implementacao e nao ao comportamento.
```

---

## Gotchas

- **G2 do plano (refactor por ADICAO):** NAO reescrever nenhuma linha existente. Apenas
  anexar as 3 secoes novas no ponto de insercao indicado.
- **Local:** Preservar `## Common Rationalizations` (linha 322) e `## Red Flags` (linha 331)
  ja existentes. As secoes novas vao ANTES delas — nao misturar.
- **Local:** Se durante a leitura encontrar drift de numero de linha (arquivo mudou desde o
  planejamento), re-localizar pontos de insercao pelos titulos `## Piramide Invertida com IA`
  e `## Classificacao de Complexidade (Modo Classico)` — nao pelos numeros.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, verificar contagem zero.
  - Comando: `grep -cE "^## (Test Sizes|DAMP vs DRY em Testes|Test-Doubles Reference)" skills/tdd-workflow/SKILL.md`
  - Resultado esperado: `0`

- [ ] **GREEN:** Apos edicao, contagem de 3.
  - Comando: `grep -cE "^## (Test Sizes|DAMP vs DRY em Testes|Test-Doubles Reference)" skills/tdd-workflow/SKILL.md`
  - Resultado esperado: `3`

### Checklist

- [ ] 3 secoes presentes na ordem correta (Test Sizes → DAMP vs DRY → Test-Doubles Reference)
- [ ] Conteudo nao-placeholder (sem `TODO`, sem `lorem ipsum`, sem `{...}`)
- [ ] `## Piramide Invertida com IA` ainda existe e nao foi alterada
- [ ] `## Classificacao de Complexidade (Modo Classico)` ainda existe e nao foi alterada
- [ ] `## Common Rationalizations` e `## Red Flags` ainda existem (verificar com `grep -E "^## (Common Rationalizations|Red Flags)" skills/tdd-workflow/SKILL.md` retorna 2)
- [ ] `bun run harness:validate` verde

---

## Criterio de Aceite

**Por maquina:**
- `grep -cE "^## (Test Sizes|DAMP vs DRY em Testes|Test-Doubles Reference)" skills/tdd-workflow/SKILL.md` retorna `3`
- `grep -cE "^## (Common Rationalizations|Red Flags)" skills/tdd-workflow/SKILL.md` retorna `2` (sanity de nao-regressao)
- `bun run harness:validate` retorna exit code 0

**Por humano:**
- Leitura confirma que as 3 tabelas/exemplos sao operacionais (qualquer dev consegue
  agir sobre eles sem perguntar nada externo).

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
