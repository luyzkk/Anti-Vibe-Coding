<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Extracao de rationale -> `docs/design-docs/init-rationale.md`

**Plano:** 04 — Extracao de rationale + Akita + Cutover
**Sizing:** 1.5h
**Depende de:** Nenhuma (paralelo com fase-02)
**Visual:** false

---

## O que esta fase entrega

Arquivo `docs/design-docs/init-rationale.md` indexado por ID (DI-XX / GT-XX / CA-XX / R-XX /
M-XX / D-XX / gates), contendo o conteudo dos HTML comments e linhas de rationale espalhadas
hoje no `skills/init/SKILL.md`. Cada entrada referencia o(s) step(s) que consome(m) o rationale.
**Esta fase NAO deleta os comentarios do SKILL.md** — apenas extrai para o novo arquivo.
Remocao acontece no cutover (fase-03) + cleanup (fase-05).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/init-rationale.md` | Create | Arquivo unico indexado por ID, agrupado por categoria (Decisions / Gotchas / Critérios de Aceite / Riscos / Mensagens / Decisoes de design / Gates) |
| `skills/init/SKILL.md` | (nao modificar) | Permanece intocado nesta fase. Cutover so na fase-03. |
| `docs/design-docs/index.md` | Modify | Adicionar link para `init-rationale.md` (se houver indice manual de ADRs/design-docs) |

---

## Implementacao

### Passo 1: Mapear todos os IDs no SKILL.md atual

Antes de extrair, listar todos os IDs presentes. Comando paranoia (rodar e salvar output):

```bash
# 2026-05-17 (Luiz/dev): listar todos os IDs (DI-XX, GT-XX, CA-XX, R-XX, M-XX, D-XX, gates)
# que aparecem em skills/init/SKILL.md. Output guia a estrutura do init-rationale.md.
grep -oE '\b(DI|GT|CA|R|M|D)[-]?[0-9]+\b' skills/init/SKILL.md | sort -u > /tmp/init-rationale-ids.txt
wc -l /tmp/init-rationale-ids.txt
cat /tmp/init-rationale-ids.txt
```

Tambem capturar as keywords sem ID numerico (ex: `Gate:`, `GATING:`, `Soft-fail`):

```bash
grep -nE 'Gate|GATING|Soft-fail|gating' skills/init/SKILL.md > /tmp/init-rationale-gates.txt
```

Conjunto de IDs ja identificado no scan estatico do PRD (sirva de checklist minimo;
o grep acima pode descobrir mais):

```
DI-01, DI-04, DI-06
GT-04
CA-09, CA-10, CA-15, CA-29, CA-31
R2, R14
M3, M7, M8
D3, D7, D9, D12, D14, D15
gates: migrate.1-backup-gate, migrate.2-conflict-gate
```

### Passo 2: Estrutura do `init-rationale.md`

Arquivo agrupado por categoria. Cada entrada: `### {ID} — {titulo curto}` + paragrafo de
contexto + bullet "Consumido por: {step-id-1}, {step-id-2}" + (opcional) link para o ADR
original se existir.

Esqueleto:

```markdown
# /anti-vibe-coding:init — Rationale Indexado

> **Origem:** este arquivo consolida HTML comments e blocos rationale que viviam inline em
> `skills/init/SKILL.md` ate v6.3.2 (1215 linhas). Extraido em 2026-05-17 durante a refatoracao
> Rails-style (PRD `2026-05-17-refactor-init-skill-rails`). O SKILL.md novo (manifest) referencia
> este arquivo por ID.

## Como ler

Cada entrada tem formato:

    ### {ID} — {titulo}
    {paragrafo de contexto}
    **Consumido por:** {step-id-1}, {step-id-2}

Se voce esta editando um step em `skills/init/lib/steps/` e precisa entender o porque de uma
decisao (ex: "por que usamos `await import` em vez de `bun -e`?"), busque pelo ID neste arquivo.

---

## Decisoes de Implementacao (DI)

### DI-01 — Import direto via `await import('./lib/X.ts')` no SKILL.md inline antigo
{paragrafo extraido de SKILL.md HTML comment linha 109}
**Consumido por:** historico — Plano 01 fase-04 centralizou via `lazyImport`. DI-01 hoje
referencia `lib/lazy-import.ts`.

### DI-04 — Inline JS detect `--dry-run` em vez de parser CLI completo
{paragrafo extraido de SKILL.md linha 47}
**Consumido por:** `migrate-0-parse-dry-run`, `migrate-all-orchestrate`

### DI-06 — `bun -e` quebra em paths absolutos no Windows -> usar `await import`
{paragrafo extraido de SKILL.md linhas 21, 109, 139, etc. — repetido ~18x na versao antiga}
**Consumido por:** todos os steps (centralizado em `lazy-import.ts` apos Plano 01 fase-04)

---

## Gotchas (GT)

### GT-04 — Workaround Windows + bun -e
{paragrafo extraido de SKILL.md HTML comments linhas 21/47/61/etc.}
**Consumido por:** mesmo escopo de DI-06 (sao gotcha + decisao pareados)

---

## Critérios de Aceite (CA)

### CA-09 — SKILL.md `<= 200` linhas
{paragrafo: meta do PRD, verificado por `wc -l skills/init/SKILL.md`}
**Consumido por:** fase-03 deste plano + fase-05 (validacao)

### CA-10 — `bun run test` verde apos cutover
{paragrafo: meta do PRD}
**Consumido por:** fase-05 deste plano

### CA-15 — ADRs com frontmatter id/title/status/date/tags
{paragrafo extraido de SKILL.md linha 202}
**Consumido por:** `migrate-4-decisions`

### CA-29 — Compound notes com frontmatter title/category/tags/created
{paragrafo extraido de SKILL.md linha 179}
**Consumido por:** `migrate-3-lessons`

### CA-31 — TODO.md idempotente (prereq do /todo-pick)
{paragrafo extraido de SKILL.md linha 256}
**Consumido por:** `scaffold-full-tree` (Passo 1.5 consolidado)

---

## Riscos / Mensagens (R, M)

### R2 — Backup deve preceder qualquer mutacao
**Consumido por:** `migrate-1-backup`
### R14 — Dry-run nao deve criar `docs/`
**Consumido por:** `migrate-0-parse-dry-run`, `migrate-all-orchestrate`
### M3 — Stack registrada em STATE.md
**Consumido por:** `detect-stack-and-register`
### M7 — Migracao gera lessons + decisions
**Consumido por:** `migrate-3-lessons`, `migrate-4-decisions`
### M8 — Backup antes do migrate.2
**Consumido por:** `migrate-1-backup`, `migrate-2-planning`

---

## Decisoes de Design (D)

### D3 — Steps interativos retornam contrato `needsUser`
**Consumido por:** `delivery-loop` (Step 6)
### D7 — Stack registrada em STATE.md no Step 3
**Consumido por:** `detect-stack-and-register`
### D9 — Detecao read-only de v5 legacy antes de qualquer mutacao
**Consumido por:** `detect-legacy`
### D12 — Delivery Loop eh opt-in default-N
**Consumido por:** `delivery-loop`
### D14 — Install GH files SEMPRE (mesmo sem GitHub)
**Consumido por:** `install-gh-files`
### D15 — `alreadyMigrated && isLegacy` -> partial migration, exit 2
**Consumido por:** `detect-legacy`

---

## Gates

### Gate: migrate.1 backup-fail
{paragrafo extraido de SKILL.md linhas 125-128}
**Consumido por:** `migrate-1-backup` (lanca `AbortError({ code: 1, reason: ... })`)

### Gate: migrate.2 conflict
{paragrafo extraido de SKILL.md linhas 155-156}
**Consumido por:** `migrate-2-planning` (lanca `AbortError({ code: 1, reason: ... })`)

### Gate: detect-legacy partial-migration
{paragrafo extraido de SKILL.md linhas 25-29}
**Consumido por:** `detect-legacy` (lanca `AbortError({ code: 2, reason: ... })`)
```

> **Nota:** os "{paragrafo extraido...}" sao placeholders. O conteudo real eh copia
> textual do HTML comment do SKILL.md atual, normalizado para sentencas completas em
> portugues (mesmo idioma do PRD e dos planos).

### Passo 3: Atualizar `docs/design-docs/index.md`

Adicionar uma linha em `docs/design-docs/index.md` apontando para o novo arquivo
(localizar a secao de links existentes — provavelmente listagem de ADRs).

```markdown
- [init-rationale.md](./init-rationale.md) — rationale indexado do `/anti-vibe-coding:init`
  (extraido de SKILL.md inline em 2026-05-17)
```

### Passo 4: Cross-reference inicial (preparatorio para fase-05)

Para cada ID criado no `init-rationale.md`, registrar em comentario HTML do proprio
arquivo a expectativa de onde ele eh consumido. Fase-05 vai rodar grep para validar.

Comando que **a fase-05 vai rodar** (documentar aqui para o leitor saber o gate final):

```bash
# 2026-05-17 (Luiz/dev): cross-reference check — todo ID em init-rationale.md
# deve aparecer >=1x em algum step module OU no novo SKILL.md.
# Esta fase produz os IDs; a fase-05 valida.
for id in $(grep -oE '^### [A-Z]+-?[0-9]+' docs/design-docs/init-rationale.md | awk '{print $2}'); do
  count=$(grep -RF "$id" skills/init/lib/steps/ skills/init/SKILL.md 2>/dev/null | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "ORPHAN: $id"
  fi
done
```

Esta fase nao precisa passar nesse gate (steps ainda estao por portar / SKILL.md ainda
nao foi reescrito). Apenas documenta o contrato.

---

## Gotchas

- **G1 do plano (wording byte-identico):** nao se aplica diretamente — esta fase nao
  emite stdout do `/init`. Mas o **conteudo do rationale extraido** deve ser fiel ao
  HTML comment original (mesmo wording em portugues do SKILL.md atual). Nao "melhorar"
  textos durante a extracao — preservar literal para que o git diff entre SKILL.md
  antigo (a ser deletado em fase-05) e init-rationale.md mostre 1-a-1.

- **G2 do plano (cross-reference):** se um ID aparece SO no SKILL.md atual e nao em
  nenhum step portado (Plano 02/03), avaliar se eh: (a) rationale obsoleto (era do
  pre-refactor) -> nao incluir; ou (b) rationale ainda valido mas o step nao cita ->
  decidir se adicionar citacao no step OU se o rationale eh transversal (ex: DI-06)
  e mora so no arquivo central. Documentar a decisao no proprio init-rationale.md
  ("nota: DI-06 nao tem citacao por step porque foi centralizado em
  `lib/lazy-import.ts`").

- **Local — IDs com formatos mistos:** o SKILL.md atual mistura `R2` (sem hifen) e
  `CA-15` (com hifen). Padronizar no init-rationale.md para sempre usar hifen
  (`R-02`, `M-03`, etc.) **OU** preservar o formato original. Decisao DI-1 desta
  fase: preservar o formato original (sem normalizar) para que grep por `R2` em
  steps continue casando.

- **Local — entradas que nao tem ID:** algumas linhas tem rationale sem ID numerico
  (ex: "Gate: if this step exits non-zero..."). Atribuir ID novo no formato
  `gate:{slug}` (ex: `gate:migrate-1-backup-fail`). Documentar a convencao no header
  do arquivo.

- **Local — `index.md` pode nao listar ADRs manualmente:** se `docs/design-docs/index.md`
  for gerado por script (ex: scaffoldFullTree manifesta), nao editar manualmente. Em
  vez disso, adicionar nota em `docs/design-docs/init-rationale.md` informando que
  o arquivo eh referenciado a partir do `SKILL.md` (apos fase-03).

---

## Verificacao

### TDD

- [ ] **RED:** Antes de criar, rodar `cat docs/design-docs/init-rationale.md`
  - Comando: `cat docs/design-docs/init-rationale.md 2>&1`
  - Resultado esperado: `cat: docs/design-docs/init-rationale.md: No such file or directory`

- [ ] **GREEN:** Arquivo criado com as ~6 secoes (DI, GT, CA, R/M, D, Gates) e todos
  os IDs identificados no Passo 1.
  - Comando: `grep -cE '^### ' docs/design-docs/init-rationale.md`
  - Resultado esperado: numero `>= 15` (5 DI + 1 GT + 5 CA + 3 R + 3 M + 6 D + 3 gates = ~26)

### Checklist

- [ ] `/tmp/init-rationale-ids.txt` gerado e arquivado no MEMORY.md desta fase (lista
  os IDs encontrados via grep — referencia para fase-05).
- [ ] `docs/design-docs/init-rationale.md` criado e validavel como markdown
  (`bun scripts/harness-validate.ts` continua passando — H1 presente, links validos).
- [ ] Cada entrada tem **paragrafo** + **Consumido por:** (nao deixar entrada vazia).
- [ ] `skills/init/SKILL.md` NAO modificado: `git diff skills/init/SKILL.md` vazio.
- [ ] Nenhum helper modificado: `git diff skills/init/lib/` vazio.
- [ ] Testes existentes passam: `bun run test`
- [ ] Harness validate continua verde: `bun run harness:validate`

---

## Criterio de Aceite

`docs/design-docs/init-rationale.md` existe, lista todos os IDs do scan estatico
do PRD (DI-01/04/06, GT-04, CA-09/10/15/29/31, R2/R14, M3/M7/M8, D3/D7/D9/D12/D14/D15,
gates de migrate.1/migrate.2/detect-legacy), e cada entrada tem `Consumido por:`
apontando para `step-id` ou para "historico/transversal".

**Por maquina:**
- `test -f docs/design-docs/init-rationale.md` exit 0
- `grep -c '^### ' docs/design-docs/init-rationale.md` retorna `>= 15`
- `grep -c 'Consumido por:' docs/design-docs/init-rationale.md` retorna `>= 15`
- `git diff --stat skills/init/SKILL.md skills/init/lib/` retorna 0 arquivos modificados
- `bun run harness:validate` exit 0
- `bun run test` exit 0

**Por humano:**
- Inspecao visual do arquivo: cada entrada tem paragrafo legivel em portugues, fiel ao
  HTML comment original do SKILL.md. Nenhum ID listado eh placeholder vazio.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
