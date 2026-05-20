<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 04: Parity asserts de 11 secoes obrigatorias + 3 opcionais marcadas

**Plano:** 02 — MH-2 PLAN.md / fase.md templates estilo Andre
**Sizing:** 1.5h
**Depende de:** fase-03 (renderer ja consome `PLAN.md.tpl`)
**Visual:** false

---

## O que esta fase entrega

Dois sub-asserts adicionados em `tests/e2e/populate-plan-parity.test.ts` validando o gate
"nunca diminuir" para secoes do PLAN.md gerado (CA-03 do PRD): (1) as 11 secoes obrigatorias
(10 do canon Andre + Observability) presentes na ordem certa case-sensitive; (2) os 3
opcionais ficam ausentes OU como `<!-- opcional: ... -->`. Mensagens de erro linkam o PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/populate-plan-parity.test.ts` | Modify | adicionar `import { EXEC_PLAN_SECTIONS_FULL } from 'skills/lib/exec-plan-sections'` (ou path equivalente); adicionar 2 testes novos no describe principal |

Estado esperado apos esta fase: arquivo com 4 testes ativos (2 do Plano 01 MH-1 + 2 desta
fase).

---

## Implementacao

### Passo 1: Reler estado atual do parity test

Abrir `tests/e2e/populate-plan-parity.test.ts` para confirmar:

- Import de `generatePopulatePlanV2` ja existe (do Plano 01 fase-02).
- `FIXED_DATE` ja existe.
- Constante `PRD_LINK` (ou equivalente) usada nas mensagens de erro existentes — reusar nas
  mensagens novas; se nao houver, declarar:

  ```typescript
  const PRD_LINK = 'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md'
  ```

Registrar em MEMORY.md `DI-Plano02-fase04-reuse-prd-link` (se ja existia) ou
`DI-Plano02-fase04-add-prd-link` (se foi adicionado).

### Passo 2: Adicionar import de `EXEC_PLAN_SECTIONS_FULL`

No topo do arquivo, junto com os outros imports:

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-04 do PRD populate-plan-andre-port (MH-2 / CA-03).
// Fonte canonica das 10 secoes base — drift entre array e tpl quebra este teste.
import { EXEC_PLAN_SECTIONS_FULL } from '../../skills/lib/exec-plan-sections'
```

Confirmar o path relativo correto (a partir de `tests/e2e/`): `../../skills/lib/exec-plan-sections`.
Se o tsconfig do projeto usa alias (`@/skills/...`), preferir o alias.

### Passo 3: Adicionar teste das 11 secoes obrigatorias

Dentro do `describe` principal (apos os 2 asserts do Plano 01):

```typescript
test('PLAN.md gerado contem as 11 secoes obrigatorias (10 Andre + Observability) — CA-03', async () => {
  const result = await generatePopulatePlanV2({
    cwd: '/tmp/fake',
    projectName: 'parity-test',
    clock: () => FIXED_DATE,
  })

  const required = [...EXEC_PLAN_SECTIONS_FULL, 'Observability']
  const ausentes = required.filter(sec =>
    !new RegExp(`^## ${sec}\\s*$`, 'm').test(result.planIndexMarkdown),
  )

  if (ausentes.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" — CA-03] Secoes obrigatorias ausentes do PLAN.md gerado:\n` +
      ausentes.map(s => `  - ## ${s}`).join('\n') +
      `\n\nSe removida propositalmente, atualize ${PRD_LINK} CA-03 + o template:\n` +
      `  skills/init/assets/templates/exec-plan/PLAN.md.tpl\n` +
      `Fonte canonica das 10 primeiras: skills/lib/exec-plan-sections.ts (EXEC_PLAN_SECTIONS_FULL).\n` +
      `Observability e melhoria nossa (D1 do PRD) — manter ate ser explicitamente removida.\n`,
    )
  }

  expect(ausentes).toEqual([])
})
```

### Passo 4: Adicionar teste das 3 opcionais marcadas

Imediatamente apos:

```typescript
test('PLAN.md tem 3 opcionais ausentes OU marcadas como <!-- opcional --> (CA-03)', async () => {
  const result = await generatePopulatePlanV2({
    cwd: '/tmp/fake',
    projectName: 'parity-test',
    clock: () => FIXED_DATE,
  })

  // 2026-05-19 (Luiz/dev): CA-03 do PRD — opcionais NAO podem aparecer como H2 com corpo
  // vazio. Aceitavel: ausentes OU `<!-- opcional: NOME ... -->`. Falha se `## NOME` aparecer
  // sem o comentario correspondente.
  const opcionais = ['Follow-up Plans', 'Final Report', 'Pre-GO']
  const violacoes: string[] = []

  for (const opt of opcionais) {
    const hasH2 = new RegExp(`^## ${opt}\\s*$`, 'm').test(result.planIndexMarkdown)
    const hasComment = new RegExp(`<!--\\s*opcional:[^>]*${opt}`, 'm').test(result.planIndexMarkdown)
    // Violacao: tem H2 sem ser marcada como comentario (vazou para o output).
    if (hasH2 && !hasComment) {
      violacoes.push(opt)
    }
  }

  if (violacoes.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" — CA-03] Opcionais vazaram para o PLAN.md como H2 sem marcacao:\n` +
      violacoes.map(s => `  - ## ${s} (deveria ser <!-- opcional: ${s} ... --> ou ausente)`).join('\n') +
      `\n\nAjuste ${PRD_LINK} CA-03 + o template:\n` +
      `  skills/init/assets/templates/exec-plan/PLAN.md.tpl\n`,
    )
  }

  expect(violacoes).toEqual([])
})
```

### Passo 5: Rodar e iterar

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** 4 testes passam (2 do Plano 01 + 2 desta fase).

Se algum dos 2 novos falhar:

- **Teste 1 falha (secoes ausentes):** abrir `PLAN.md.tpl` e conferir que os 11 headers H2
  estao presentes e batem com `[...EXEC_PLAN_SECTIONS_FULL, 'Observability']` na ordem
  case-sensitive. Adicionar a secao ausente.
- **Teste 2 falha (opcional vazada):** abrir `PLAN.md.tpl` e procurar `## Follow-up Plans`,
  `## Final Report`, `## Pre-GO`. Trocar por `<!-- opcional: NOME ... -->`.

### Passo 6: Validacao do RED→GREEN

Para confirmar que o teste 1 e RED de verdade (nao tautologico), reverter manualmente uma
secao do tpl (ex: apagar `## Observability` de `PLAN.md.tpl`) e rodar:

```powershell
bun test tests/e2e/populate-plan-parity.test.ts --grep "11 secoes obrigatorias"
```

**Esperado:** falha com mensagem listando `## Observability` em `Secoes obrigatorias ausentes`.

Restaurar o tpl. Rodar de novo:

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** 4 testes passam. Esse exercicio NAO precisa ser commitado — registrar no
MEMORY.md como `DI-Plano02-fase04-red-validado`.

---

## Gotchas

- **Local (regex multiline):** `^## NAME\s*$` precisa flag `m` (passada via 2o arg do
  `RegExp`). Sem `m`, `^` e `$` matcham apenas inicio/fim da string toda — falso negativo.
- **Local (case-sensitive):** os nomes em `EXEC_PLAN_SECTIONS_FULL` sao case-sensitive
  (`Execution Steps`, nao `execution steps`). O tpl em fase-01 deve preservar isso. Se algum
  reviewer alterar capitalizacao, este teste pega.
- **Local (regex de opcional):** `<!--\\s*opcional:[^>]*${opt}` aceita qualquer texto entre
  `opcional:` e o nome do opcional. Atencao: se o tpl em fase-01 escrever `<!-- opcional:
  Follow-up Plans — descricao -->`, o regex casa. Se escrever `<!-- Follow-up Plans (opcional) -->`,
  NAO casa. Manter convencao `opcional: NOME` (documentada no Comment Provenance do tpl).
- **Local (`{{PHASES_TABLE}}` injetada dentro de Execution Steps):** o regex
  `^## Execution Steps\s*$` matcha o HEADER. O conteudo da tabela vem depois e nao afeta o
  regex. Validado em fase-03 (renderer ja injeta a tabela como conteudo dentro da secao).
- **Local (Step 91 PURO):** os 2 testes chamam `generatePopulatePlanV2` direto, sem rodar
  `/init` inteiro. Nao dispara Step 90 (G1 do Plano 01) — alinhado a `DI-Plano01-fase02-isolated-call`.
- **Local (path do import):** se o tsconfig tem alias, preferir alias para evitar quebra
  futura quando reorganizar pastas. Conferir `tsconfig.json` antes de escolher.

---

## Verificacao

### TDD

- [ ] **RED:** se rodado ANTES da fase-03 estar mergeada (renderer ainda no formato antigo
      com `## Glossario` e sem secoes Andre), o teste 1 falha com mensagem listando
      `## Goal`, `## Scope`, `## Assumptions`, etc como ausentes. Esse e o RED puro.

      Comando: `bun test tests/e2e/populate-plan-parity.test.ts --grep "11 secoes"`

      Resultado esperado: erro com `## Goal`, `## Scope`, ..., `## Observability` (10+ secoes)
      listadas em `Secoes obrigatorias ausentes`.

- [ ] **GREEN:** apos fase-03 (renderer le `PLAN.md.tpl` produzido em fase-01), os 2 testes
      novos passam.

      Comando: `bun test tests/e2e/populate-plan-parity.test.ts`

      Resultado esperado: `4 pass, 0 fail`.

### Checklist

- [ ] Import de `EXEC_PLAN_SECTIONS_FULL` adicionado, path correto.
- [ ] Teste `PLAN.md gerado contem as 11 secoes obrigatorias` adicionado.
- [ ] Teste `PLAN.md tem 3 opcionais ausentes OU marcadas` adicionado.
- [ ] Mensagens de erro de ambos linkam `PRD_LINK` + apontam para `PLAN.md.tpl`.
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` — 4 testes, todos verdes.
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` — 6 testes, todos verdes
      (estado da fase-03).
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] RED validado manualmente (Passo 6) — registrado no MEMORY.md.

### Comandos verificaveis

```powershell
# Estado final
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: 4 pass, 0 fail

# Validar RED (transitorio, NAO commitar)
# 1. Apagar manualmente `## Observability` de PLAN.md.tpl
# 2. Rodar: bun test tests/e2e/populate-plan-parity.test.ts --grep "11 secoes"
# 3. Esperado: 1 fail com mensagem listando ## Observability
# 4. Restaurar tpl
# 5. Rodar de novo: 4 pass
```

---

## Criterio de Aceite

**Por maquina:**
- `tests/e2e/populate-plan-parity.test.ts` contem 4 testes (`Select-String -Pattern "^test\(|^\s*test\(" -Path tests/e2e/populate-plan-parity.test.ts` retorna 4 matches, ou o framework reporta `4 pass`).
- Os 2 testes novos referenciam `EXEC_PLAN_SECTIONS_FULL` e `Observability`.
- `bun test tests/e2e/populate-plan-parity.test.ts` — exit 0, 4 pass.
- Reverter manualmente o tpl (sem commit) faz `bun test ...` falhar com mensagem clara
  listando a secao removida (RED valido).

**Por humano:**
- Diff legivel: 2 testes novos, cada um com mensagem de erro educativa apontando para PRD +
  tpl.
- Comentarios datados 2026-05-19 nos lugares onde a decisao precisa de contexto.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
