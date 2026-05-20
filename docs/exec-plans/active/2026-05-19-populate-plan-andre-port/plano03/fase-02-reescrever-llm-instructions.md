<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 02: Reescrever 12 entries de `LLM_INSTRUCTIONS`

**Plano:** 03 — MH-3 Instrucoes imperativas
**Sizing:** 1.5h
**Depende de:** fase-01 (tipo `ImperativeInstruction` + helpers `formatImperativeInstruction` /
`isImperativeInstruction` exportados)
**Visual:** false

---

## O que esta fase entrega

Refatoracao do map `LLM_INSTRUCTIONS` em `skills/init/lib/populate-plan-generator.ts` de
`Record<string, string>` para `Record<string, ImperativeInstruction>`. 12 entries reescritas
no novo schema (3 elementos obrigatorios: `fontes`, `secoes`, `honestidade`). `llmInstructionFor`
passa a retornar `ImperativeInstruction`. `renderLLMInstructionBlock` chama
`formatImperativeInstruction` internamente — heading `### Instrucao LLM` preservado.

`DEFAULT_INSTRUCTION` ainda em formato antigo nesta fase — vai mudar em fase-03. Esta fase
acumula erro de TS na linha do default ate a fase-03 corrigir, OU (preferido) declara um
`DEFAULT_INSTRUCTION_LEGACY` temporario para nao quebrar `llmInstructionFor`. Ver Passo 4.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Tipo do map: `Record<string, string>` -> `Record<string, ImperativeInstruction>`. Reescrever as 12 entries. Atualizar `llmInstructionFor` (return type). Atualizar `renderLLMInstructionBlock` (chama `formatImperativeInstruction`). |
| `skills/init/lib/populate-plan-generator.test.ts` | Modify | Adicionar 1 teste novo: `each LLM_INSTRUCTION entry satisfies isImperativeInstruction` via `test.each` sobre `Object.entries(LLM_INSTRUCTIONS)`. Confirmar que o teste existente `expect(content).toContain('### Instrucao LLM')` continua verde. |

Estado esperado apos esta fase: map com 12 entries no novo schema. Testes do generator com
+1 assert (cobertura: 12 entries × 1 = 12 sub-cases via `test.each`).

---

## Implementacao

### Passo 1: Mudar o tipo do map

Linha 79:

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-02 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Cada entry exige `ImperativeInstruction` — TS error guia a refatoracao das 12 entries.
const LLM_INSTRUCTIONS: Record<string, ImperativeInstruction> = {
```

`bun run typecheck` apos esse passo lista 12 erros (um por entry ainda em string). Esse e
o guia da refatoracao.

### Passo 2: Reescrever entry `ARCHITECTURE.md` (exemplo canonico — PRD MH-3)

**Antes (linha 80-84):**

```typescript
'ARCHITECTURE.md':
  'Leia os inputs (docs candidatos + codigo). Sintetize a arquitetura REAL do projeto: ' +
  'dominios, modulos compartilhados, integracoes externas. Cada afirmacao deve apontar para ' +
  'um arquivo/pasta do repo. Zero placeholder generico. Se um input nao tem destino obvio ' +
  'neste doc, sugira consolidacao em outro canonico e marque `needsUser` (DQ2 do CONTEXT).',
```

**Depois:**

```typescript
// 2026-05-19 (Luiz/dev): exemplo canonico de PRD MH-3. As `secoes` espelham o ARCHITECTURE.md
// real deste plugin (secao "Convencao: docs/ vs Runtime Assets" foi o gabarito).
'ARCHITECTURE.md': {
  fontes: [
    'docs/ARCHITECTURE.md candidato (se existir)',
    'package.json (entry points, scripts)',
    'tsconfig.json (paths, includes)',
    'src/** ou skills/** (modulos principais)',
    'README.md (visao macro do projeto)',
  ],
  secoes: [
    'Convencao docs/ vs Runtime Assets',
    'Modulos compartilhados',
    'Integracoes externas',
    'Decisoes obrigatorias (ADRs ativas)',
  ],
  honestidade:
    'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
    'Honestidade > marketing.',
},
```

**Justificativa do `secoes`:** PRD MH-3 referencia a secao `Convencao: docs/ vs Runtime Assets`
(presente no `ARCHITECTURE.md` deste plugin apos V6.6.0 / knowledge-path-cutover) como modelo
do tipo de conteudo que a LLM deve gerar — material rastreavel, decisoes obrigatorias, sem
placeholder.

### Passo 3: Reescrever as outras 11 entries (formato compacto)

Para manter este documento navegavel, cada entry abaixo lista apenas:
- **fontes** (5-6 itens, especificos por doc)
- **secoes** (3-5 sub-secoes obrigatorias)
- **honestidade** (variacao da frase padrao ou frase padrao literal)

Quando reescrever no codigo, seguir o padrao do Passo 2 (objeto literal com `fontes`,
`secoes`, `honestidade`).

**Frase padrao (`honestidade`):**
```
'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. Honestidade > marketing.'
```

#### `docs/FRONTEND.md`

- **fontes:** `app/**`, `src/components/**`, `tailwind.config.{ts,js}`, `globals.css`,
  `src/lib/design-tokens.ts` (se existir), `src/styles/**`.
- **secoes:** `Rotas e layouts`, `Componentes compartilhados`, `Sistema de design (tokens)`,
  `Convencoes de estilo (Tailwind / CSS-in-JS)`.
- **honestidade:** frase padrao.

#### `docs/SECURITY.md`

- **fontes:** `middleware.ts`, `src/lib/auth/**`, `supabase/migrations/**`, `.env.example`,
  `next.config.{ts,js}` (CORS / headers), policies de RLS.
- **secoes:** `Autenticacao (provider, fluxo)`, `Autorizacao (RBAC / RLS)`, `Secrets`,
  `CORS / headers`, `Auditoria`.
- **honestidade:** frase padrao. **NAO** "se nao houver, mantenha template" — se algum aspecto
  critico nao tem evidencia, marcar `TODO(<contexto>):` + flag `needsUser`.

#### `docs/RELIABILITY.md`

- **fontes:** `error-boundaries/**`, `src/lib/observability/**`, `*.config.{ts,js}` de logger
  (Pino/Winston), `vercel.json` / `wrangler.toml` (jobs/crons), `src/app/api/**` para retries.
- **secoes:** `Error boundaries (UI + API)`, `Observabilidade (logs / traces / metricas)`,
  `Retries e timeouts`, `Backups e recovery`.
- **honestidade:** frase padrao.

#### `docs/DESIGN.md`

- **fontes:** `tailwind.config.{ts,js}`, `globals.css`, `components/ui/**`, `src/styles/tokens.css`,
  `figma-export.json` (se existir).
- **secoes:** `Tokens (cores, tipografia, spacing)`, `Componentes base`, `Padroes de composicao`,
  `Regras visuais (NAO regras de codigo — codigo vai em CODE_STYLE.md)`.
- **honestidade:** frase padrao.

#### `docs/CODE_STYLE.md`

- **fontes:** `.eslintrc*` / `eslint.config.{ts,js}`, `.prettierrc*`, `tsconfig.json`,
  `snippets/akita-*.md` (se existirem), `src/**` (padroes implicitos).
- **secoes:** `Convencoes de nomes`, `Organizacao de arquivos`, `Padroes de codigo (do ESLint
  + implicitos)`, `Anti-patterns proibidos`.
- **honestidade:** frase padrao.

#### `docs/QUALITY_SCORE.md`

- **fontes:** `docs/QUALITY_SCORE.md` candidato (se existir), historico de PR review em
  `.git/`, `docs/exec-plans/completed/**` (lessons), `docs/compound/**`.
- **secoes:** `Strengths`, `Gaps`, `Priorities`, `TODOs com contexto rastreavel`.
- **honestidade:** frase padrao. **Brecha matada:** texto antigo dizia "Se nao houver historico
  de PR review, mantenha o template e adicione TODO". O novo `honestidade` exige
  `TODO(<contexto>):` — NAO "mantenha o template".

#### `docs/PLANS.md`

- **fontes:** `docs/exec-plans/active/**`, `docs/exec-plans/completed/**`, `docs/exec-plans/*.md`
  (indices), `package.json` (scripts harness/compound).
- **secoes:** `Planos ativos (status + ETA)`, `Planos completos recentes`, `Bloqueios atuais`.
- **honestidade:** frase padrao.

#### `docs/STATE.md`

- **fontes:** `package.json` (versao do plugin), `docs/exec-plans/active/**` (plano em
  execucao), `tests/fixtures/v6-state-fixture/docs/STATE.md` (template), output do Step 03
  (detect-stack-and-register).
- **secoes:** `Versao do plugin`, `Stack detectado`, `Ultima init`, `Planos ativos relevantes`.
- **honestidade:** frase padrao.

#### `docs/design-docs/core-beliefs.md`

- **fontes:** `docs/design-docs/core-beliefs.md` candidato, `progress.txt` (gotchas elevaveis),
  `docs/compound/**`, `CLAUDE.md` global do dev.
- **secoes:** `Arquitetura padrao`, `Seguranca por default`, `Qualidade nao-negociavel`,
  `Anti-patterns proibidos`.
- **honestidade:** frase padrao.

#### `AGENTS.md`

- **fontes:** lista canonica de docs em `docs/`, `CLAUDE.md` candidato, `.claude/agents/**`
  (se houver subagentes registrados), `package.json` (skills declaradas no manifest).
- **secoes:** `Index de docs canonicos (com 1 linha cada)`, `Quando ler cada um`,
  `Subagentes / skills declarados`.
- **honestidade:** frase padrao.

#### `CLAUDE.md`

- **fontes:** `AGENTS.md` recem-gerado (mirror), mesma lista canonica de docs.
- **secoes:** `Mirror canonico de AGENTS.md` (mesmo conteudo, mesmo formato).
- **honestidade:** frase padrao. **Lembrete obrigatorio nas secoes:** `Em alteracoes futuras:
  atualizar AMBOS (AGENTS.md + CLAUDE.md)`.

### Passo 4: Atualizar `llmInstructionFor` e `DEFAULT_INSTRUCTION` provisorio

Atualmente:

```typescript
const DEFAULT_INSTRUCTION = '...' // linha 128 — string

function llmInstructionFor(dst: string): string {  // linha 133
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION
}
```

Apos fase-02, `LLM_INSTRUCTIONS[dst]` retorna `ImperativeInstruction`, mas `DEFAULT_INSTRUCTION`
ainda e string -> TS error. **Solucao desta fase (provisoria, sera limpa em fase-03):**

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-02 — DEFAULT ainda em formato antigo, sera reescrito
// em fase-03 como ImperativeInstruction. Cast provisorio aceito porque fase-03 e o passo
// imediatamente seguinte e fecha o ciclo MH-3.
const DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03: ImperativeInstruction = {
  fontes: ['(provisorio — fase-03 reescreve)'],
  secoes: ['(provisorio — fase-03 reescreve)'],
  honestidade: 'Provisorio. Fase-03 do Plano 03 reescreve com o conteudo final.',
}

function llmInstructionFor(dst: string): ImperativeInstruction {
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03
}
```

Manter `DEFAULT_INSTRUCTION` antigo no arquivo (comentado OU intocado — fase-03 deleta) para
nao perder a string original. Registrar em MEMORY.md: `DI-Plano03-fase02-default-provisorio`.

### Passo 5: Atualizar `renderLLMInstructionBlock`

Linha 177:

**Antes:**

```typescript
function renderLLMInstructionBlock(instruction: string): string {
  return `### Instrucao LLM\n\n${instruction}\n`
}
```

**Depois:**

```typescript
// 2026-05-19 (Luiz/dev): chama `formatImperativeInstruction` (fase-01) para renderizar o
// corpo. O heading `### Instrucao LLM` continua aqui — G1 do Plano 03.
function renderLLMInstructionBlock(instruction: ImperativeInstruction): string {
  return `### Instrucao LLM\n\n${formatImperativeInstruction(instruction)}\n`
}
```

Atualizar call site se necessario (provavel: `generatePopulatePlanV2` interno passa
`llmInstructionFor(dst)` que agora ja e `ImperativeInstruction`, type-checks ok).

### Passo 6: Adicionar teste contrato no generator

Em `skills/init/lib/populate-plan-generator.test.ts`, adicionar dentro do `describe` principal:

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-02 — cada entry do map precisa satisfazer o guard
// (precondicao do assert CA-06 de fase-03 no parity test).
test.each(Object.entries(LLM_INSTRUCTIONS))(
  'LLM_INSTRUCTIONS[%s] satisfies isImperativeInstruction',
  (_key, instr) => {
    expect(isImperativeInstruction(instr)).toBe(true)
  },
)
```

Isso requer importar `LLM_INSTRUCTIONS` no arquivo de teste — mas o map ainda nao tem
`export`. **Opcoes:**

- **(a)** Adicionar `export` em fase-02 ja (entao fase-03 nao precisa) — registrar
  `DI-Plano03-fase02-export-llm-instructions`.
- **(b)** Deferir export para fase-03 (mais alinhado com PLAN.md — fase-03 e quem dispara o
  parity assert externo).

**Recomendado: (a)** — facilita teste interno desta fase e simplifica fase-03. Em fase-03 o
export ja existe; o passo "adicionar export" some, sobrando apenas o import no parity test.

Apos escolha, mudar linha 79:

```typescript
export const LLM_INSTRUCTIONS: Record<string, ImperativeInstruction> = {
```

E adicionar import no `populate-plan-generator.test.ts`:

```typescript
import {
  generatePopulatePlanV2,
  isImperativeInstruction,
  LLM_INSTRUCTIONS,
} from './populate-plan-generator'
```

### Passo 7: Rodar testes e iterar

```powershell
bun test skills/init/lib/populate-plan-generator.test.ts
```

**Esperado:** suite original verde + 12 sub-cases novos do `test.each` (1 por entry do map).
Total: original_count + 12.

```powershell
bun test skills/init/lib/imperative-instruction.test.ts
```

**Esperado:** 12 pass (sem mudanca da fase-01).

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos.

---

## Gotchas

- **G1 (12 entries = maior risco mecanico do plano):** refatorar em 4 lotes de 3, rodando
  `bun run typecheck` entre lotes. TS lista todas entries pendentes a cada lote — usar como
  guia. Registrar em MEMORY.md `DI-Plano03-fase02-batch-N` se algum lote precisar de retorno.
- **G2 (TS guia, NAO confiar so no lint):** o lint nao tem opiniao sobre object literal
  estrutura — apenas TS. Se `bun run lint` passa mas `bun run typecheck` falha, a entry esta
  errada (campo faltando, tipo errado).
- **G3 (ARCHITECTURE.md `secoes` deve refletir PRD MH-3):** as 4 secoes
  (`Convencao docs/ vs Runtime Assets`, `Modulos compartilhados`, `Integracoes externas`,
  `Decisoes obrigatorias`) sao pegadas do ARCHITECTURE.md real deste plugin. NAO inventar
  secao nova nessa entry — PRD MH-3 referencia explicitamente. Se for mudar, atualizar PRD
  PRIMEIRO.
- **G4 (NAO mover o map):** manter linha 79 — git blame preserva linhagem das instrucoes
  historicas. Reescrever entries IN PLACE.
- **G5 (`formatImperativeInstruction` NAO emite heading — pre-condicao):** confirmado em
  fase-01 (G1 da fase-01). O `renderLLMInstructionBlock` continua dono do heading
  `### Instrucao LLM`. Teste existente `expect(content).toContain('### Instrucao LLM')`
  continua verde apos esta fase — verificar manualmente que esse assert nao quebrou.
- **G6 (`DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03`):** nome longo proposital — sinaliza que
  e provisorio. Fase-03 deleta. Registrar no MEMORY.md
  `DI-Plano03-fase02-default-provisorio` apontando a linha exata.
- **G7 (export breaking change?):** `LLM_INSTRUCTIONS` ganha `export`. Conferir se algum
  consumer externo ja importa por path-magic (improvavel — era `const` privado). `Grep` por
  `LLM_INSTRUCTIONS` no repo antes de adicionar export.
- **G8 (frase de honestidade variacoes):** a frase padrao e o default. Variacoes legitimas
  precisam manter as 3 promessas (rastreio, fallback `TODO(<contexto>):`, frase "Honestidade
  > marketing" literal). `isImperativeInstruction` so checa que a string NAO E VAZIA — nao
  valida o texto. O parity test em fase-03 PODE adicionar regex strict (decisao para fase-03).

---

## Verificacao

### TDD

- [ ] **RED:** apos Passo 1 (mudar tipo do map para `Record<string, ImperativeInstruction>`)
      MAS antes dos Passos 2-3 (refatorar entries), `bun run typecheck` falha com 12 erros
      "Type 'string' is not assignable to type 'ImperativeInstruction'". Esse e o RED do TS.
      `bun test populate-plan-generator.test.ts` tambem falha (test.each fica indefinido sem
      `LLM_INSTRUCTIONS` exportado e em formato novo).

      Comando: `bun run typecheck`

      Resultado esperado: 12 erros no map.

- [ ] **GREEN:** apos Passos 2-3 (refatorar as 12 entries) + Passos 4-5 (default provisorio
      + renderer atualizado), `bun run typecheck` limpo e `bun test populate-plan-generator.test.ts`
      verde com 12 sub-cases novos.

      Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`

      Resultado esperado: original_count + 12 pass.

### Checklist

- [ ] Tipo do map mudado para `Record<string, ImperativeInstruction>`.
- [ ] 12 entries refatoradas (ARCHITECTURE.md + 11 outras), cada uma com `fontes` (5-6),
      `secoes` (3-5), `honestidade` (frase padrao ou variacao com as 3 promessas).
- [ ] Brecha matada na entry `docs/QUALITY_SCORE.md` (sem "mantenha o template").
- [ ] `LLM_INSTRUCTIONS` ganha `export`.
- [ ] `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` provisorio adicionado (fase-03 deleta).
- [ ] `llmInstructionFor` retorna `ImperativeInstruction`.
- [ ] `renderLLMInstructionBlock` aceita `ImperativeInstruction`, chama
      `formatImperativeInstruction`, heading `### Instrucao LLM` preservado.
- [ ] `test.each` adicionado em `populate-plan-generator.test.ts` cobrindo 12 entries.
- [ ] Teste existente `expect(content).toContain('### Instrucao LLM')` continua verde.
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] Comentarios `2026-05-19 (Luiz/dev)` nos lugares mudados.

### Comandos verificaveis

```powershell
# Suite principal do generator + 12 sub-cases novos
bun test skills/init/lib/populate-plan-generator.test.ts
# Esperado: original_count + 12 pass

# Fase-01 sem regressao
bun test skills/init/lib/imperative-instruction.test.ts
# Esperado: 12 pass

# Typecheck (12 erros esperados ANTES do Passo 2-3, 0 erros DEPOIS)
bun run typecheck
# Esperado: clean

# Confirmar export
Select-String -Pattern "^export const LLM_INSTRUCTIONS" -Path skills/init/lib/populate-plan-generator.ts
# Esperado: 1 match
```

---

## Criterio de Aceite

**Por maquina:**
- `skills/init/lib/populate-plan-generator.ts` contem
  `export const LLM_INSTRUCTIONS: Record<string, ImperativeInstruction>`.
- Cada uma das 12 entries existe e e objeto literal com chaves `fontes`, `secoes`,
  `honestidade` (`Select-String -Pattern "fontes:" -Path skills/init/lib/populate-plan-generator.ts`
  retorna >= 12 matches).
- `llmInstructionFor` tem return type `ImperativeInstruction`.
- `renderLLMInstructionBlock` aceita `ImperativeInstruction` e chama
  `formatImperativeInstruction`.
- `bun test skills/init/lib/populate-plan-generator.test.ts` — exit 0, `test.each` com 12
  sub-cases todos verdes.
- `bun run typecheck` exit 0.

**Por humano:**
- Diff legivel: 12 entries reescritas, formato consistente. Brecha `mantenha o template` em
  `docs/QUALITY_SCORE.md` desapareceu.
- Heading `### Instrucao LLM` ainda presente no output (teste existente verde).
- Comentarios `2026-05-19 (Luiz/dev)` nas mudancas estruturais (tipo do map, helper
  renderer, default provisorio).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
