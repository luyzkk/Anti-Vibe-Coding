<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Criterio de Promocao Compound -> Reference no README

**Plano:** 03 — Pipeline Compound -> Reference
**Sizing:** 0.5h (XS)
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Secao `## Quando promover para reference` adicionada em `docs/compound/README.md` com criterio numerico explicito (>=3 repeticoes OU >=2 skills OU padrao obrigatorio onboarding) — fecha MH-04 e CA-06 do PRD e estabelece o pre-requisito conceitual para as fases 02-04 (criar references).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/compound/README.md` | Modify | Adicionar secao nova `## Quando promover para reference` apos ultima secao existente (`## Required Sections`); nada removido (DT-5 do PRD — adicao nao substituicao) |

---

## Implementacao

### Passo 1: Reler `docs/compound/README.md` para confirmar ponto de insercao

Antes de editar, ler integralmente o arquivo (~25 linhas) para confirmar:
- Estrutura atual: `# Compound Notes` -> `## Naming Convention` -> `## Required Frontmatter` -> `## Required Sections` (com mencao a `bun run compound:check` e `docs/COMPOUND_ENGINEERING.md`)
- A nova secao entra APOS `## Required Sections` (final do arquivo), preservando a referencia a `compound:check` e `COMPOUND_ENGINEERING.md` no final.

### Passo 2: Adicionar secao com criterio numerico

Snippet exato a inserir (em portugues, alinhado com idioma das demais secoes; criterio numerico do PRD secao "Mecanismo Item 3a"):

```markdown
## Quando promover para reference

Compound notes capturam UMA licao por arquivo (reativo). References operacionais
em [`docs/references/`](../references/) sao checklists destilados que cobrem padroes
recorrentes (proativo). Nem toda compound note vira reference — promova somente
quando UM dos criterios abaixo for atendido:

1. **>=3 repeticoes:** o tema da nota aparece em 3 ou mais compound notes diferentes
   no repo (sinal de padrao recorrente, nao incidente isolado).
2. **>=2 skills:** o tema e citado por 2 ou mais skills do plugin (`skills/<id>/SKILL.md`)
   — sinal de que multiplos pontos do pipeline dependem do mesmo conhecimento.
3. **Obrigatorio para onboarding:** representa padrao que todo contribuidor novo
   precisaria saber antes da primeira PR (ex: contrato de Steps no `/init`).

### Processo de promocao (manual)

1. Criar `docs/references/<topic>.md` em formato checklist operacional (nao prosa).
   Header obrigatorio: `> Origem: docs/compound/<file1>.md + docs/compound/<file2>.md`.
2. Citar a reference nas skills/agents que dependem do conhecimento (link relativo).
3. Adicionar `referenced-by: [docs/references/<topic>.md]` no frontmatter de cada
   compound note-origem (idempotente — verificar presenca antes de adicionar).
4. NAO apagar nem reescrever as compound notes-origem: reference e destilacao
   operacional, narrativa permanece na compound.

Sem script automatizado — promocao e decisao curatorial humana com criterio numerico
acima como gate (decisao DC-8 do PRD-WAVE-3).
```

### Passo 3: Salvar e verificar

Confirmar que a edicao foi feita com Edit cirurgico (nao Write — preservar o resto do arquivo). Reler o arquivo apos edicao para confirmar que `## Naming Convention`, `## Required Frontmatter` e `## Required Sections` continuam intactos (regra "leia novamente para confirmar" do CLAUDE.md global).

---

## Gotchas

- **G5 do plano (adicao nao substituicao):** O conteudo existente do README (Naming Convention, Required Frontmatter, Required Sections, link para COMPOUND_ENGINEERING) NAO pode ser tocado. Edit cirurgico que apenas anexa a nova secao no final.
- **G4 do plano (sem script):** A secao DEVE explicitar que o processo e MANUAL — sem ferramenta de deteccao automatica. Isso e Won't-Have do PRD; deixar ambiguo arrisca planos futuros tentarem automatizar e gastarem tempo.
- **Local — linguagem:** Manter portugues no estilo das demais secoes (heading em ingles ja existente — `Naming Convention`, `Required Frontmatter` — mas o conteudo das secoes esta em ingles curto). A secao nova pode ser em portugues longa porque tem mais material (criterios + processo). Aceitavel — coerente com o resto do plugin (compound notes em portugues).

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, grep retorna 0 matches.
  - Comando: `grep -c "## Quando promover para reference" docs/compound/README.md`
  - Resultado esperado: `0`

- [ ] **GREEN:** Apos edicao, grep retorna 1 match.
  - Comando: `grep -c "## Quando promover para reference" docs/compound/README.md`
  - Resultado esperado: `1`

### Checklist

- [ ] Secao `## Quando promover para reference` presente: `grep -E "^## Quando promover para reference$" docs/compound/README.md` retorna match
- [ ] Criterio numerico ">=3" visivel: `grep -E ">=3 repeticoes|>=3 repetições" docs/compound/README.md` retorna match
- [ ] Criterio ">=2 skills" visivel: `grep -E ">=2 skills" docs/compound/README.md` retorna match
- [ ] Mencao a "manual" / "sem script" visivel: `grep -iE "manual|sem script" docs/compound/README.md` retorna >=1 match
- [ ] Conteudo pre-existente intacto: `grep -E "^## Naming Convention$" docs/compound/README.md` ainda retorna match
- [ ] Conteudo pre-existente intacto: `grep -E "^## Required Frontmatter$" docs/compound/README.md` ainda retorna match
- [ ] Conteudo pre-existente intacto: `grep -E "^## Required Sections$" docs/compound/README.md` ainda retorna match
- [ ] Harness verde (estrutura de docs valida): `bun run harness:validate` exit 0

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "## Quando promover para reference" docs/compound/README.md` retorna `1`
- `grep -cE "(>=3|>=2)" docs/compound/README.md` retorna `>= 2` (pelo menos os 2 criterios numericos)
- `bun run harness:validate` exit code 0

**Por humano:**
- Abrir `docs/compound/README.md` e verificar que a nova secao esta no final, criterio numerico esta legivel, e o restante do README continua intacto.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
