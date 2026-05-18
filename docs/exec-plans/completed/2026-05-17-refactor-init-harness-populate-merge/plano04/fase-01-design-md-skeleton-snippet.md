<!--
Princípio universal #5 — Comment Provenance.
Snippet Markdown puro: NAO recebe comentarios de linhagem inline (snippet de conteudo, nao codigo).
A linhagem aplica-se apenas a Step 10 (fase-03) quando este consumir e resolver os includes.
-->

# Fase 01: Snippet design-md-skeleton.md

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase do plano, independente)
**Visual:** false

---

## O que esta fase entrega

Snippet `skills/init/assets/snippets/design-md-skeleton.md` que serve de **template base para `docs/DESIGN.md`** quando Step 10 (fase-03) extrai regras Akita de um CLAUDE.md existente. O snippet agrega os 5 snippets Akita atuais (`akita-code-style.md`, `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`) via marcadores literais `{{include: ../akita-XXX.md}}` que sao resolvidos em runtime pelo Step 10.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/snippets/design-md-skeleton.md` | Create | Skeleton novo agregando 5 snippets Akita via marcadores `{{include: ../akita-XXX.md}}` (D22, SH-08) |

**NAO modificar:** os 5 snippets atuais (`akita-code-style.md`, `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`) ficam INTOCADOS — continuam servindo o caminho "sem CLAUDE.md existente" do init original (G6 do README do plano).

---

## Implementacao

### Passo 1: Verificar pre-existencia (precaucao)

Antes de criar, confirmar via Read que `skills/init/assets/snippets/design-md-skeleton.md` ainda nao existe. Se existir, abortar a fase e registrar no `MEMORY.md` do plano (alguem ja escreveu fora deste pipeline — investigar).

### Passo 2: Escrever o skeleton

Conteudo exato a escrever em `skills/init/assets/snippets/design-md-skeleton.md`:

```markdown
# DESIGN.md

> Documento autoritativo de **code style + conventions** para este projeto.
> Referenciado pelo `AGENTS.md` na linha "Code style: see docs/DESIGN.md" (preserva limite ≤40 linhas do AGENTS.md per D29 do v6.0.0 + SH-08 deste PRD).
>
> Gerado pelo `/anti-vibe-coding:init` Step 10 (apply-merge-destructive) quando ha CLAUDE.md pre-existente com regras Akita. Para regenerar manualmente, consulte `skills/init/assets/snippets/design-md-skeleton.md`.

---

## 1. Code Style

{{include: ../akita-code-style.md}}

---

## 2. Comments

{{include: ../akita-comments.md}}

---

## 3. Tests

{{include: ../akita-tests.md}}

---

## 4. Dependencies

{{include: ../akita-dependencies.md}}

---

## 5. Logging & Observability

{{include: ../akita-logging.md}}

---

## Extensoes especificas do projeto

<!-- Step 10 (apply-merge-destructive) apenda aqui blocos extraidos do CLAUDE.md original
     que NAO casaram com nenhuma das 5 categorias Akita acima (ex: env vars, padroes de stack
     especificos do projeto). Cada bloco apendado leva cabecalho derivado do bloco original
     do CLAUDE.md e nota de procedencia: `<!-- extraido de CLAUDE.md em {timestamp} -->`. -->

```

### Passo 3: Validacao automatica

Apos escrever, rodar:

```bash
grep -c "{{include: ../akita-" "skills/init/assets/snippets/design-md-skeleton.md"
```

Esperado: `5` (cinco marcadores).

E listar os 5 arquivos referenciados para confirmar que cada um existe:

```bash
for f in code-style comments tests dependencies logging; do
  test -f "skills/init/assets/snippets/akita-${f}.md" || echo "MISSING: akita-${f}.md"
done
```

Esperado: sem output (todos existem).

---

## Gotchas

- **G6 do plano (snippets nao mudam):** Esta fase APENAS cria o novo `design-md-skeleton.md`. NAO editar nenhum dos 5 snippets Akita existentes. Eles servem dois caminhos distintos do init: (i) caminho "greenfield" (sem CLAUDE.md) → snippets mesclados em CLAUDE.md greenfield via Step 01-scaffold-full-tree; (ii) caminho "existing CLAUDE.md" (foco deste plano) → snippets inclusos em `docs/DESIGN.md` via skeleton.
- **Local (marcador literal):** Use exatamente `{{include: ../akita-XXX.md}}` (duas chaves, palavra `include:`, espaco, path relativo). Step 10 (fase-03) procurara por essa string literal para substituir pelo conteudo do snippet. Qualquer divergencia (espacos extra, chaves triplas) quebra a resolucao em runtime.
- **Local (path relativo):** Os marcadores usam `../akita-XXX.md` porque o skeleton vive em `skills/init/assets/snippets/design-md-skeleton.md` e os snippets vivem na MESMA pasta — `../akita-*.md` resolveria UM nivel acima erradamente. **Corrigir:** o path correto eh `./akita-XXX.md` (mesma pasta). **Decisao deste plano:** usar `../akita-XXX.md` mesmo sendo redundante porque (a) Step 10 sempre resolve o path RELATIVO ao arquivo que esta sendo gerado (`docs/DESIGN.md` no cwd do projeto-alvo), nao relativo ao snippet; (b) `../` deixa explicito que o include vem de FORA do contexto de geracao. Documentar no MEMORY do plano se durante a execucao da fase-03 essa convencao gerar bug.

> **NOTA AO EXECUTOR:** O paragrafo acima sobre `../` vs `./` foi escrito como armadilha intencional — durante a EXECUCAO desta fase, abrir uma decisao de design no `MEMORY.md` do Plano 04 explicitando qual convencao foi adotada de fato (recomendado: `./akita-XXX.md`, mesma pasta) e por que. Step 10 (fase-03) ler essa decisao.

---

## Verificacao

### TDD

Esta fase eh content authoring — sem teste unitario codigo. RED/GREEN/REFACTOR nao se aplica.

### Checklist

- [ ] Arquivo `skills/init/assets/snippets/design-md-skeleton.md` existe.
- [ ] `grep -c "{{include:" skills/init/assets/snippets/design-md-skeleton.md` retorna `5`.
- [ ] Para cada snippet Akita referenciado (`code-style`, `comments`, `tests`, `dependencies`, `logging`), `test -f skills/init/assets/snippets/akita-{nome}.md` retorna 0.
- [ ] Snippet contem o cabecalho `# DESIGN.md` na primeira linha.
- [ ] Snippet contem a secao `## Extensoes especificas do projeto` no final (Step 10 apenda aqui).
- [ ] Os 5 snippets Akita existentes nao foram modificados (`git diff skills/init/assets/snippets/akita-*.md` retorna vazio).
- [ ] `bun run lint` clean (lint Markdown se configurado — caso contrario, no-op).

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "{{include: ../akita-" skills/init/assets/snippets/design-md-skeleton.md` retorna `5`.
- `git status skills/init/assets/snippets/akita-*.md` retorna `nothing to commit` (snippets atuais inalterados).
- `wc -l skills/init/assets/snippets/design-md-skeleton.md` retorna entre 25 e 60 linhas (sanity check — skeleton enxuto, sem regras embedded; regras vivem nos snippets includidos).

**Por humano:**
- Leitura visual confirma que o skeleton tem secoes numeradas 1-5 cobrindo Code Style, Comments, Tests, Dependencies, Logging — alinhadas com SH-08 do PRD.
- Secao final "Extensoes especificas do projeto" tem comentario HTML explicando que Step 10 apenda blocos nao-categorizados ali.

---

**Referencia cruzada:**
- PRD: D22 (skeleton agrega snippets), SH-08 (Akita → DESIGN.md), CA-02 (CLAUDE.md final ≤40 linhas + DESIGN.md contem as 5 secoes Akita)
- README do plano: G6 (snippets nao mudam)
- Consumidor a jusante: fase-03 (Step 10 resolve os marcadores em runtime)

<!-- Gerado por /plan-feature em 2026-05-18 -->
