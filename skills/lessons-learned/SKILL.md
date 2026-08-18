---
name: lessons-learned
description: "Registro de licoes aprendidas do projeto, com filtro de qualidade senior. Use ao registrar uma licao, revisar as existentes, ou podar as obsoletas."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|review|prune [description]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-02 — profile-aware-preface (PRD §RF-SH-05).
// Mesmo pattern de /security (fase-01); per-skill lookup; fallback v6.2 quando profile null.

import { readPrefaceContext } from '../lib/preface-context'
import { LESSONS_LEARNED_PREFACE_BY_PROFILE, DEFAULT_LESSONS_LEARNED_PREFACE } from './lib/lessons-learned-prefaces'

const ctx = readPrefaceContext(process.cwd())
const preface = ctx.profile
  ? (LESSONS_LEARNED_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_LESSONS_LEARNED_PREFACE)
  : DEFAULT_LESSONS_LEARNED_PREFACE
```

Se `preface` for não-vazio, prepend ao corpo da skill (inicie sua resposta com o preface e prossiga com a operação normal).
Se vazio (profile null), comportamento v6.2 intacto — sem preface (CA-02).
<!-- profile-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# Licoes Aprendidas — Anti-Vibe Coding

Gerenciar o repositorio de conhecimento de nivel senior do projeto.

## Comandos

### `add` — Adicionar nova licao
Quando o desenvolvedor ou o hook de correcao detectar um erro significativo.

### `review` — Revisar licoes existentes
Listar e revisar todas as licoes, verificando relevancia.

### `prune` — Podar licoes obsoletas
Remover licoes que nao foram relevantes nas ultimas 10 sessoes ou que ja foram absorvidas em regras permanentes.

## Filtro de Qualidade Senior

Uma licao SO deve ser registrada se atender a PELO MENOS 2 destes criterios:

1. **Nao e deduzivel** — A IA nao conseguiria inferir essa regra apenas lendo a documentacao da stack
2. **E especifica deste projeto** — Se aplica ao contexto, stack ou regras de negocio do projeto
3. **O custo do erro e alto** — Se repetido, causa retrabalho significativo, bug em producao, perda de dados
4. **E contra-intuitiva** — Vai contra o que a IA faria por padrao

## O que NUNCA adicionar

- Erros de sintaxe ou typos
- Bugs que os testes ja cobrem
- Coisas que a documentacao oficial ja explica
- Padroes genericos de clean code
- Qualquer coisa que a IA acertaria na segunda tentativa sem instrucao

## Formato das Entradas

```
### [Categoria] Titulo conciso da licao
**Regra:** [Uma frase imperativa, direta]
**Contexto:** [Por que essa regra existe — maximo 2 linhas]
```

### Categorias validas:
- `[Arquitetura]` — Decisoes estruturais que afetam multiplos modulos
- `[Integracao]` — Comportamentos especificos de APIs, servicos ou libs externas
- `[Performance]` — Otimizacoes no contexto de escala do projeto
- `[Negocio]` — Regras de negocio que impactam como o codigo deve ser escrito
- `[Deploy]` — Particularidades do ambiente de producao
- `[Armadilha]` — Comportamentos inesperados que parecem certos mas estao errados

## Limite de Manutencao

- Maximo de **15 entradas**
- Se atingir 15: verificar se alguma licao ja foi absorvida nos padroes permanentes. Se sim, remover e incorporar na secao apropriada
- Se uma licao nao foi relevante nas ultimas 10 sessoes, provavelmente pode ser removida

## Fluxo de Trabalho

### Ao adicionar (`add`):
1. Ler o arquivo de licoes do projeto (`.claude/lessons.md` ou secao no CLAUDE.md)
2. Verificar se a licao ja existe ou e coberta por outra
3. Aplicar o filtro de qualidade (>=2 criterios)
4. Se passar, formatar a licao no formato correto:

   ```
   ### [Categoria] Titulo conciso da licao
   **Regra:** [Uma frase imperativa, direta]
   **Contexto:** [Por que essa regra existe — maximo 2 linhas]
   ```

4b. Registrar a origem da licao — **somente quando ela e conhecida**:

   A origem responde "o que produziu esta licao": uma fase de plano, um bug de producao, um
   code review, um item de backlog. Ela **nao se infere** — ou o contexto da sessao diz qual
   foi, ou nao existe linha de origem.

   1. Veio de uma fase/plano que voce acabou de executar → `docs/exec-plans/{completed|active}/{pasta}/SUMMARY.md`
   2. Veio de outra coisa (bug relatado, review, item do `TODO.md`, exploracao) → cite essa
      coisa: o arquivo, o item, o PR
   3. Nao sabe → **omita**. Prosseguir ao Passo 5 sem linha de origem

   Onde a linha entra depende do formato de saida:
   - **Formato v5** (`### [Categoria]` + `**Regra:**` + `**Contexto:**`): linha `**Origem:** <ref>`
     como TERCEIRA linha, apos `**Contexto:**`. Ordem obrigatoria: Regra → Contexto → Origem.

     ```
     ### [Categoria] Titulo conciso da licao
     **Regra:** ...
     **Contexto:** ...
     **Origem:** docs/exec-plans/completed/2026-04-20-auth/SUMMARY.md
     ```

   - **Formato v6** (compound note em `docs/compound/`): a procedencia entra como item da secao
     `## Affected files`, que e onde as notas deste repo ja a registram — junto dos arquivos
     tocados e das notas irmas. Nao existe linha `**Origem:**` no formato v6.

   Notas:
   - **NUNCA inferir origem por recencia.** A versao anterior deste passo mandava pegar a pasta
     mais recente de `docs/exec-plans/` e apontar para ela. Isso produz atribuicao falsa toda vez
     que a licao nao nasceu de plano nenhum — e o ponteiro resultante fica valido, plausivel e
     errado, que e pior que ausente: link quebrado se ve, link correto para o plano errado nao.
   - **SUMMARY.md ausente na pasta que voce sabe ser a origem:** incluir a linha assim mesmo —
     link quebrado e preferivel a falha silenciosa (auditabilidade). Isto vale para a origem
     **conhecida**, nunca como desculpa para chutar uma.

5. Se nao passar no filtro de qualidade, explicar por que nao qualifica
6. **Avaliar promocao a principio senior:** perguntar ao usuario se a licao atende aos 4 criterios de promocao (ver abaixo). Se o usuario confirmar, adicionar ao `docs/design-docs/core-beliefs.md` na secao apropriada

### Ao revisar (`review`):
1. Listar todas as licoes com numeracao
2. Para cada uma, indicar se ainda e relevante

### Ao podar (`prune`):
1. Identificar licoes obsoletas ou ja absorvidas
2. Sugerir remocao com justificativa
3. Esperar aprovacao do desenvolvedor antes de remover

## Promocao a Principios Senior

Apos registrar uma licao aprovada, avaliar se ela merece ser promovida ao
`docs/design-docs/core-beliefs.md` — o registro canonico de principios senior do projeto (v6;
substituiu o `senior-principles.md` da raiz, que era o local v5). Perguntar ao usuario:

> "Esta licao parece [universal/nao-obvia/etc]. Ela atende os criterios para ir ao core-beliefs.md?"

### Criterios de promocao (TODOS devem ser atendidos):

| Criterio | Pergunta-chave |
|----------|---------------|
| **Universal** | Aplica em qualquer projeto, nao so neste? |
| **Nao-obvia** | Um junior erraria isso sem saber? |
| **Provada por falha** | Foi aprendida por um erro real, nao teoria? |
| **Prevencao de dano** | O erro causa bug silencioso, vulnerabilidade ou perda de dados? |

Se falhar em qualquer um, a licao fica apenas nas lessons do projeto.

### Ao promover:
1. Identificar a secao correta no `docs/design-docs/core-beliefs.md` (Verification of Premises, Security, Code Quality, API Design, etc.)
2. Adicionar no formato existente: regra concisa + justificativa apos o travessao
3. Se nenhuma secao existente se aplica, criar uma nova secao
4. Confirmar com o usuario o texto final antes de salvar

## Fluxo de Captura (v6)

```
1. Resolve project layout via skills/lib/path-resolver-v6.ts
   - v6 = docs/compound/ AND docs/exec-plans/ ambos presentes
   - v5 = apenas lessons-learned.md presente
   - cru = projeto virgem (usa v5-default)
2. Se layout === 'v6':
     - Escreve em docs/compound/YYYY-MM-DD-{slug}.md
     - Frontmatter: title, category (default 'general'), tags (>=1), created (today)
     - Secoes: ## Problem, ## Solution, ## Prevention
3. Se layout === 'v5' ou 'cru':
     - Appenda em lessons-learned.md (formato legado)
     - Injeta tip de migracao uma vez (idempotente)
4. Retorna { filePath, layout } para o orquestrador
```

Formas de invocacao (D10 — zero breaking change):

```typescript
// Forma posicional v5.x (string posicional)
await add('Race condition em session refresh', projectRoot)

// Forma rica v6 (objeto LessonOpts)
await add({ title: 'Bug X', category: 'bug', tags: ['producao'] }, projectRoot)
```

## Completion Signal (D33)

Ao finalizar o output principal (add/review/prune), a skill emite automaticamente um bloco YAML machine-readable via `console.log`. Orquestradores podem extrair o sinal usando `extractCompletionSignal(output)`.

```typescript
import { renderCompletionSignal } from '../lib/completion-signal'
console.log('\n\n' + renderCompletionSignal({
  skill: 'lessons-learned',
  status: 'complete',
  outputs: [/* filePath da licao escrita */],
  next_suggested: null,
  blocks_for_user: [],
}))
```

---

## Sub-comandos CRUD (D31)

- `--update {slug}` — reescreve compound note preservando `created`, adicionando `updated`
- `--delete {slug}` — soft archive para `docs/compound/_archived/` (recuperavel via git)

---

## Acao solicitada

$ARGUMENTS
