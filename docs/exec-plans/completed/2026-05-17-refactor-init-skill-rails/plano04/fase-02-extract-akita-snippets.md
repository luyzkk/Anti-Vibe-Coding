<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Extracao do apendice Akita -> `assets/snippets/akita-*.md`

**Plano:** 04 — Extracao de rationale + Akita + Cutover
**Sizing:** 1h
**Depende de:** Nenhuma (paralelo com fase-01)
**Visual:** false

---

## O que esta fase entrega

5 arquivos snippet em `skills/init/assets/snippets/`:

- `akita-code-style.md`
- `akita-comments.md`
- `akita-tests.md`
- `akita-dependencies.md`
- `akita-logging.md`

Conteudo extraido das 5 secoes do apendice "Template Akita" no `skills/init/SKILL.md`
(linhas ~1004-1195). Cada arquivo segue a convencao ja estabelecida por
`skills/init/assets/snippets/delivery-loop.md`: markdown single-section pronto para
injecao, comecando com `## {heading}`. **Esta fase NAO modifica SKILL.md** — apenas
cria os 5 arquivos. Remocao do apendice acontece no cutover (fase-03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/snippets/akita-code-style.md` | Create | Secao "Code Style for Agents" extraida de SKILL.md ~linhas 1012-1057 |
| `skills/init/assets/snippets/akita-comments.md` | Create | Secao "Comments" extraida de SKILL.md ~linhas 1061-1082 |
| `skills/init/assets/snippets/akita-tests.md` | Create | Secao "Tests" extraida de SKILL.md ~linhas 1086-1106 |
| `skills/init/assets/snippets/akita-dependencies.md` | Create | Secao "Dependencies" extraida de SKILL.md ~linhas 1110-1160 |
| `skills/init/assets/snippets/akita-logging.md` | Create | Secao "Logging" extraida de SKILL.md ~linhas 1164-1194 |
| `skills/init/SKILL.md` | (nao modificar) | Permanece intocado nesta fase. Cutover so na fase-03. |

---

## Implementacao

### Passo 1: Verificar a convencao do snippet existente

Reler `skills/init/assets/snippets/delivery-loop.md` para confirmar o formato:

```bash
cat skills/init/assets/snippets/delivery-loop.md
```

Formato observado: arquivo curto, comeca com `## Delivery Loop`, sem frontmatter,
sem H1, sem nota de proveniencia. **Seguir identico** — sem header, sem boilerplate
de proveniencia (o git guarda historico).

### Passo 2: Extracao byte-identica + downgrade `### ` -> `## `

O apendice atual usa `### {Section}` (porque eh subsecao de `## Template Akita`). No
snippet standalone, vira `## {Section}` (top-level do arquivo).

**Outras transformacoes proibidas:** nenhuma. Conteudo do corpo (paragrafos, listas,
blocos de codigo, exemplos em TypeScript/Python/Ruby) deve ser byte-identico ao
apendice original modulo o downgrade do heading.

Exemplo do que o `akita-code-style.md` deve conter (extracao das linhas ~1014-1056
do SKILL.md atual, com `### Seção: Code Style for Agents` virando `## Code Style for Agents`):

```markdown
## Code Style for Agents

Convenções obrigatórias para código gerado por IA:

- **Nomes grepáveis:** use nomes específicos ao domínio. NUNCA: `data`, `handler`, `process`, `item`, `info`, `result`, `value`, `temp`, `obj`
- **Funções ≤ 40 linhas:** se ultrapassar, extraia função com nome descritivo
- **Arquivos ≤ 500 linhas:** se ultrapassar, divida em módulos com responsabilidade única
- **SRP obrigatório:** uma função, uma responsabilidade. Side effects explícitos e isolados
- **Tipos explícitos:** sem `any`. Use `unknown` + type guard quando o tipo é incerto

```typescript
// TS/JS
// ERRADO
async function process(data: any) { ... }

// CERTO
async function chargeSubscriptionRenewal(invoice: InvoicePayload): Promise<ChargeResult> { ... }
```

```python
# Python
...
```

```ruby
# Ruby
...
```
```

(O bloco acima eh ilustrativo; copiar a versao real do SKILL.md sem reescrita.)

**Atencao a fences quadruplas:** o apendice atual usa ` ```` ` (4 backticks) para
envolver o bloco da secao **dentro** do SKILL.md, e ``` (3 backticks) para os blocos
de codigo embutidos. No snippet standalone, as 4-backticks externas NAO sao
necessarias — sao um wrapper de apresentacao do apendice. Resultado: o snippet
comeca direto com `## {Heading}` e usa apenas 3-backticks para blocos de codigo
internos.

### Passo 3: Extrair os 5 arquivos

Loop de extracao (executado pelo dev / IA assistente; comando ilustrativo):

```bash
# 2026-05-17 (Luiz/dev): extracao manual via Read/Write — nao automatizada com sed
# porque o downgrade ### -> ## eh ambiguo (so o heading da secao, nao headings internos
# que ja sao ### ou ####). Fazer arquivo-a-arquivo, validar diff char-a-char.
```

Para cada uma das 5 secoes:
1. Identificar limites no SKILL.md (entre `### Seção: {Nome}` e proxima `---`).
2. Copiar corpo interno (entre as fences `` ```markdown `` externas).
3. Trocar `### Seção: {Nome}` por `## {Nome}` no inicio do arquivo de destino.
4. Salvar em `skills/init/assets/snippets/akita-{slug}.md`.

Mapeamento nome -> slug:
| Secao no SKILL.md | Arquivo de destino |
|--------------------|--------------------|
| Code Style for Agents | `akita-code-style.md` |
| Comments | `akita-comments.md` |
| Tests | `akita-tests.md` |
| Dependencies | `akita-dependencies.md` |
| Logging | `akita-logging.md` |

### Passo 4: Paranoia diff vs SKILL.md

Para cada arquivo criado, validar que o **corpo** (apos o `## {Heading}` ate o EOF)
casa byte-a-byte com o corpo da secao original (entre `### Seção: X` e o `---`
seguinte, modulo as fences `` ```` `` externas do apendice).

Exemplo de check informal (comparacao visual + diff de paragrafos-chave):

```bash
# 2026-05-17 (Luiz/dev): grep das frases-assinatura de cada secao em ambos os arquivos.
for slug in code-style comments tests dependencies logging; do
  case "$slug" in
    code-style) needle='Nomes grepáveis:' ;;
    comments)   needle='Escreva o WHY' ;;
    tests)      needle='F.I.R.S.T' ;;
    dependencies) needle='Injeção de dependência' ;;
    logging)    needle='JSON estruturado' ;;
  esac
  echo "=== $slug ==="
  grep -F "$needle" "skills/init/assets/snippets/akita-$slug.md" && echo "  OK em snippet"
  grep -F "$needle" "skills/init/SKILL.md" && echo "  OK em SKILL.md (deve sumir em fase-05)"
done
```

Esperado: cada `needle` aparece em ambos. Apos fase-05, deixa de aparecer em
SKILL.md.

---

## Gotchas

- **G5 do plano (convencao snippet):** seguir EXATAMENTE o formato de
  `delivery-loop.md` — sem frontmatter, sem H1, sem cabecalho de proveniencia. O
  snippet eh consumido por `injectOptionalSection` / merge no `CLAUDE.md` do
  projeto cliente; qualquer header extra polui o destino.

- **G1 do plano (wording byte-identico):** este eh o mais sensivel — o conteudo
  Akita ja eh publicado / lido por humanos (mantem caracteres especiais: `≤`,
  `≥`, `—` em-dash, acentos portugueses). Encoding **UTF-8 sem BOM**, line
  endings **LF**. Validar com `file skills/init/assets/snippets/akita-*.md` (deve
  retornar "UTF-8 Unicode text" para todos).

- **G3 do plano (helpers preservados):** nenhum helper em `lib/*.ts` muda. Esta
  fase nao toca em codigo TypeScript.

- **Local — fences quadruplas vs triplas:** o apendice do SKILL.md atual usa
  4-backticks externas para envolver o bloco markdown da secao. No snippet,
  remover essas 4-backticks externas; preservar as 3-backticks internas (TS,
  Python, Ruby).

- **Local — quem consome os snippets:** atualmente, `skills/init/lib/customize-architecture.ts`
  e `skills/init/lib/scaffold-templates.ts` injetam estes blocos no `CLAUDE.md`
  do projeto cliente via leitura inline no SKILL.md. Apos cutover (fase-03),
  esses helpers (ou o passo que os chama) precisam apontar para os arquivos
  `assets/snippets/akita-*.md`. **Isso eh trabalho do fase-03, nao desta fase.**
  Esta fase so cria os arquivos.

- **Local — `harness:validate` pode reclamar de links quebrados:** se algum
  snippet tiver links internos relativos (provavelmente nao tem), o checker
  do harness pode falhar. Como `assets/snippets/` esta em `SKIP_DIRS`
  (`snippets` listado em `scripts/harness-validate.ts` linha ~73), o crawl
  pula a pasta. Confirmar com `bun run harness:validate` apos criar os arquivos.

---

## Verificacao

### TDD

- [ ] **RED:** Antes de criar, listar os 5 arquivos esperados (todos devem retornar
  "No such file").
  - Comando:
    ```bash
    for slug in code-style comments tests dependencies logging; do
      test -f "skills/init/assets/snippets/akita-$slug.md" && echo "EXISTS: $slug" || echo "MISSING: $slug"
    done
    ```
  - Resultado esperado: `MISSING: ...` para todos os 5.

- [ ] **GREEN:** Apos criar, todos os 5 devem existir e ter heading `## `.
  - Comando:
    ```bash
    for slug in code-style comments tests dependencies logging; do
      f="skills/init/assets/snippets/akita-$slug.md"
      head -1 "$f"
    done
    ```
  - Resultado esperado: cada linha comeca com `## ` (Code Style for Agents,
    Comments, Tests, Dependencies, Logging).

### Checklist

- [ ] 5 arquivos criados em `skills/init/assets/snippets/akita-{code-style,comments,tests,dependencies,logging}.md`.
- [ ] Cada arquivo tem primeira linha `## {Heading}` (downgrade aplicado).
- [ ] Cada arquivo eh UTF-8 sem BOM, line endings LF (`file` retorna "UTF-8 Unicode text").
- [ ] `skills/init/SKILL.md` NAO modificado: `git diff skills/init/SKILL.md` vazio.
- [ ] Nenhum helper modificado: `git diff skills/init/lib/` vazio.
- [ ] `bun run harness:validate` exit 0 (pasta `snippets` esta em `SKIP_DIRS` mas
  ainda assim, o overall passa).
- [ ] `bun run test` exit 0 (regression check; nenhum teste novo nesta fase).

---

## Criterio de Aceite

5 arquivos snippet criados, byte-identicos as 5 secoes do apendice Akita do SKILL.md
modulo o downgrade `### ` -> `## `. SKILL.md intocado.

**Por maquina:**
- `ls skills/init/assets/snippets/akita-*.md | wc -l` retorna `5`
- Para cada snippet, primeira linha:
  - `head -1 skills/init/assets/snippets/akita-code-style.md` retorna `## Code Style for Agents`
  - `head -1 skills/init/assets/snippets/akita-comments.md` retorna `## Comments`
  - `head -1 skills/init/assets/snippets/akita-tests.md` retorna `## Tests`
  - `head -1 skills/init/assets/snippets/akita-dependencies.md` retorna `## Dependencies`
  - `head -1 skills/init/assets/snippets/akita-logging.md` retorna `## Logging`
- `git diff --stat skills/init/SKILL.md skills/init/lib/` retorna 0 arquivos modificados
- `bun run harness:validate` exit 0
- `bun run test` exit 0

**Por humano:**
- Inspecao visual: abrir lado-a-lado o `akita-code-style.md` e as linhas 1014-1056
  do SKILL.md atual. Corpo identico (parametros, listas, blocos de codigo). Apenas
  o heading mudou.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
