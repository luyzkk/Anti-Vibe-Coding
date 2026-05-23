<!--
Princípio universal #5 — Comment Provenance.
Refactor markdown-only: nenhum codigo de runtime tocado. JSDoc/Comments nao se aplicam.
-->

# Fase 02: Refatorar plan-feature/SKILL.md (Task Sizing + Dependency Graph ASCII)

**Plano:** 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final
**Sizing:** 1h
**Depende de:** Nenhuma (independente da fase-01 — arquivos diferentes; paralelizavel)
**Visual:** false

---

## O que esta fase entrega

2 secoes novas adicionadas em `skills/plan-feature/SKILL.md` — `## Task Sizing` e
`## Dependency Graph (ASCII)` — em zona markdown pura, SEM tocar nos blocos `typescript`
de telemetria (linhas 10-33, 35-56, 86-98, 855-876). Atende CA-08 + SH-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/plan-feature/SKILL.md` | Modify | Adicionar 2 secoes contiguas em area markdown pura. Sugestao de ponto: APOS `## Regras` (~linha 796) e ANTES de `## Completion Signal (D33)` (~linha 813). Esse e o ultimo bloco conceitual de planejamento antes dos hooks de telemetria de fechamento. |

---

## Implementacao

### Passo 1: Validacao defensiva pre-edicao (G1 — R-NEW-03)

ANTES de qualquer edicao, capturar contagem de blocos `typescript`:

```bash
grep -c '^```typescript' skills/plan-feature/SKILL.md
```

Resultado esperado: `5` (3 no topo: linhas 10-33, 35-56, 86-98; 2 no fundo: 855-876 — o segundo
bloco do topo abre na 35 e o ultimo bloco do fundo abre antes de 876. Se a contagem nao for 5,
re-ler o arquivo e re-mapear antes de editar.). Anotar o valor no MEMORY como DI-1.

### Passo 2: Adicionar `## Task Sizing`

Inserir apos a ultima linha de `## Regras` e antes de `## Completion Signal`. Conteudo operacional:

```markdown
## Task Sizing

Quatro tamanhos calibrados pelo tempo medio de execucao por um dev senior com IA:

| Tamanho | Criterio | Exemplo | Regra-corte |
|---------|----------|---------|-------------|
| **XS** | < 2h | Adicionar campo a tabela existente + migration | Sem dependencia entre arquivos |
| **S** | < 4h | Endpoint novo com 1 service + 1 teste | <= 3 arquivos tocados |
| **M** | < 1 dia (~6h efetivos) | Feature pequena: endpoint + UI + teste E2E | 5-10 arquivos |
| **L** | > 1 dia | Refactor multi-modulo, migracao de schema, novo subsistema | DEVE SER QUEBRADO |

**Regra inviolavel:** **L sempre quebra**. Divida em subtasks XS/S/M antes de planejar.
Uma fase L escondida e sempre underestimate disfarcado.

**Sinais de que algo "S" e na verdade "M":**
- Toca mais de 3 arquivos
- Precisa de migration de schema
- Tem decisao arquitetural pendente

**Sinais de que algo "M" e na verdade "L":**
- Quebra contratos publicos (API/types exportados)
- Requer coordenacao entre 2+ equipes ou subsistemas
- Tem incerteza tecnica nao resolvida (precisa de spike antes)
```

### Passo 3: Adicionar `## Dependency Graph (ASCII)`

Logo apos `## Task Sizing`. Mini-tutorial sobre o formato canonico de grafo ASCII (mesmo que
aparece em `## Grafo de Fases` do `plan-readme-template.md`):

```markdown
## Dependency Graph (ASCII)

Notacao canonica para grafos de dependencia entre fases (mesmo formato usado em
`plan-readme-template.md`):

- **Nome do node** = `fase-NN` (numero da fase do plano)
- **Seta horizontal** = `→` ou `--->` (continuacao na mesma linha)
- **Seta vertical** = `|` no meio + `v` no fim (3 caracteres minimo)
- **Junction (fan-in)** = `+----+----+` com `|` saindo do meio

Exemplo curto (4 nodes mostrando paralelismo):

\`\`\`
fase-01 (tipos base)
    |
    v
fase-02 (services)     fase-03 (UI components)
    |                          |
    +------------+-------------+
                 |
                 v
          fase-04 (E2E gate)
\`\`\`

**Como ler:** `fase-02` e `fase-03` rodam em paralelo (ambas saem de `fase-01`).
`fase-04` aguarda as duas (fan-in). Indentacao alinha `|` verticalmente — facilita
leitura em monospace.

**Anti-padroes:**
- Usar caixas (`+---+\n| X |\n+---+`) — ruido visual sem benefit.
- Setas diagonais (`\` ou `/`) — quebram em alguns renderers markdown.
- Nodes sem prefixo `fase-NN` — perde rastreabilidade com os arquivos.
```

### Passo 4: Validacao defensiva pos-edicao (G1)

Apos salvar, RE-rodar a contagem de blocos `typescript`:

```bash
grep -c '^```typescript' skills/plan-feature/SKILL.md
```

Deve retornar **exatamente o mesmo valor** capturado no Passo 1 (esperado: `5`). Se mudou,
algum bloco foi acidentalmente alterado — REVERT imediato (`git checkout skills/plan-feature/SKILL.md`)
e re-planejar o Edit.

---

## Gotchas

- **G1 do plano (R-NEW-03):** Blocos `typescript` de telemetria estao nas linhas ~10-33,
  ~35-56, ~86-98, ~855-876. Edit cirurgico em zona markdown pura ENTRE `## Regras` e
  `## Completion Signal`. Validacao defensiva nos Passos 1 e 4 — contagem antes/depois.
- **G2 do plano (refactor por ADICAO):** Nenhum texto existente reescrito. Apenas anexar.
- **Local:** Confirmar com `grep -cE "^## " skills/plan-feature/SKILL.md` antes e depois — o
  delta deve ser +2 (exatamente duas secoes novas).
- **Local:** Se `## Regras` ou `## Completion Signal` nao existirem exatamente com esses
  titulos (arquivo evoluiu), re-localizar pelo conteudo e ajustar o ponto de insercao —
  NAO usar numeros de linha cegamente.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, contagem das 2 secoes deve ser zero.
  - Comando: `grep -cE "^## (Task Sizing|Dependency Graph)" skills/plan-feature/SKILL.md`
  - Resultado esperado: `0`

- [ ] **GREEN:** Apos edicao, contagem de 2 + telemetria intacta.
  - Comando A: `grep -cE "^## (Task Sizing|Dependency Graph)" skills/plan-feature/SKILL.md` → `2`
  - Comando B: `grep -c '^```typescript' skills/plan-feature/SKILL.md` → valor identico ao capturado pre-edicao (esperado `5`)

### Checklist

- [ ] 2 secoes presentes na ordem correta (Task Sizing → Dependency Graph)
- [ ] Conteudo nao-placeholder (tabela com 4 linhas em Task Sizing; exemplo ASCII operacional em Dependency Graph)
- [ ] Blocos `typescript` intactos (contagem antes = contagem depois)
- [ ] `## Regras` ainda existe e nao foi alterada
- [ ] `## Completion Signal (D33)` ainda existe e nao foi alterada
- [ ] Delta total de secoes `^## ` e exatamente `+2`
- [ ] `bun run harness:validate` verde

---

## Criterio de Aceite

**Por maquina:**
- `grep -cE "^## (Task Sizing|Dependency Graph)" skills/plan-feature/SKILL.md` retorna `2`
- `grep -c '^```typescript' skills/plan-feature/SKILL.md` retorna o mesmo valor pre-edicao (esperado `5`)
- `bun run harness:validate` retorna exit code 0

**Por humano:**
- Leitura confirma tabela de Task Sizing operacional (criterio claro de XS/S/M/L) e
  exemplo de Dependency Graph compreensivel sem contexto adicional.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
