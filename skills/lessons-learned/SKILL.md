---
name: lessons-learned
description: "This skill should be used when the user asks to 'add a lesson learned', 'register a lesson', 'review lessons', 'prune obsolete lessons', or when a significant error pattern is detected that should be recorded for future sessions. Manages project-specific senior knowledge with quality filters."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|review|prune [description]"
---

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

4b. Inferir origem do PRD mais recente em `_archive/`:

   1. Glob `.planning/_archive/YYYY-MM-DD-*/` — buscar pastas cujo nome comeca com data no formato `YYYY-MM-DD-`
   2. Se resultado vazio ou `.planning/_archive/` nao existe:
      - NAO adicionar linha de origem (comportamento preservado)
      - Prosseguir ao Passo 5
   3. Se encontrou pastas:
      - Ordenar descendente por nome (ordenacao lexicografica = cronologica para formato `YYYY-MM-DD`)
      - Pegar a primeira (mais recente)
      - Construir linha: `**Origem:** .planning/_archive/{nome-da-pasta}/SUMMARY.md`
   4. Injetar a linha como TERCEIRA linha do bloco da licao, apos `**Contexto:**`:

      ```
      ### [Categoria] Titulo conciso da licao
      **Regra:** ...
      **Contexto:** ...
      **Origem:** .planning/_archive/2026-04-20-auth/SUMMARY.md
      ```

   5. Prosseguir ao Passo 5 com a licao ja formatada com a linha de origem

   Notas:
   - **Ordenacao:** `YYYY-MM-DD-slug` ordena cronologicamente em ordem alfabetica — nao precisa parsear data
   - **SUMMARY.md ausente na pasta:** ainda assim incluir a linha — link quebrado e preferivel a falha silenciosa (auditabilidade)
   - **Posicao da linha:** APOS `**Contexto:**`, NUNCA antes de `**Regra:**` — ordem obrigatoria: Regra → Contexto → Origem
   - **Mesmo dia (sufixo -v2):** pegar qualquer uma (sort estavel) — nao e critico

5. Se nao passar no filtro de qualidade, explicar por que nao qualifica
6. **Avaliar promocao a senior-principles:** perguntar ao usuario se a licao atende aos 4 criterios de promocao (ver abaixo). Se o usuario confirmar, adicionar ao `senior-principles.md` na secao apropriada

### Ao revisar (`review`):
1. Listar todas as licoes com numeracao
2. Para cada uma, indicar se ainda e relevante

### Ao podar (`prune`):
1. Identificar licoes obsoletas ou ja absorvidas
2. Sugerir remocao com justificativa
3. Esperar aprovacao do desenvolvedor antes de remover

## Promocao a Senior Principles

Apos registrar uma licao aprovada, avaliar se ela merece ser promovida ao `senior-principles.md`. Perguntar ao usuario:

> "Esta licao parece [universal/nao-obvia/etc]. Ela atende os criterios para ir ao senior-principles.md?"

### Criterios de promocao (TODOS devem ser atendidos):

| Criterio | Pergunta-chave |
|----------|---------------|
| **Universal** | Aplica em qualquer projeto, nao so neste? |
| **Nao-obvia** | Um junior erraria isso sem saber? |
| **Provada por falha** | Foi aprendida por um erro real, nao teoria? |
| **Prevencao de dano** | O erro causa bug silencioso, vulnerabilidade ou perda de dados? |

Se falhar em qualquer um, a licao fica apenas nas lessons do projeto.

### Ao promover:
1. Identificar a secao correta no `senior-principles.md` (Seguranca, Qualidade, API Design, etc.)
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
