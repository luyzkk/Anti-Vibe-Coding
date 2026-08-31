<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 04: INDEX.md Final Consolidado (RF1/CA-05) + Nota Django/Flask (RF14) + Preview Keywords (RF15)

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** M ~2h
**Depende de:** fases 01-03 (o INDEX lista os 18 átomos) — paralelizável com a fase-05
**Visual:** false

---

## O que esta fase entrega

O `knowledge/python/INDEX.md` FINAL (substitui o skeleton do Plano 01): preâmbulo D2, as 7
skills cross-stack roteando ≥2 átomos cada (CA-05), Por Tier 6/9/3, tabela Por keyword
compatível com `parseTopKeywords`, ≤100 linhas, começando com H1 (G18 — habilita o preface
CA-05 de verdade). Mais a nota Django/Flask no output do `/init` (RF14/D8, could-have, TDD
leve) e o teste que prova o preview de keywords sobre o INDEX final (RF15).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/INDEX.md` | Modify | Reescrita completa do skeleton → versão final (RF1) |
| `skills/init/lib/format-knowledge-preview.ts` | Modify | RF14: helper `extractPythonWebFrameworkNote` (mesma vizinhança dos warnings de versão) |
| `skills/init/lib/format-knowledge-preview.test.ts` | Modify | RF14 RED/GREEN + RF15: describe `parseTopKeywords` sobre o INDEX Python real |
| `skills/init/lib/run-stack-knowledge-init.ts` | Modify | RF14: integração no bloco `primary === 'python'` + campo additive `notes?` no result |
| `skills/init/lib/run-stack-knowledge-init.test.ts` | Modify | RF14: integração (nota emitida com django/flask; ausente com fastapi-only) |

---

## Implementacao

### Parte A — INDEX.md final (RF1, CA-05)

#### Passo 1: Derivar o roteamento dos átomos reais

O INDEX é DERIVADO dos 18 átomos commitados, não inventado. Levantar o mapa real:

```
grep -H "related_skills:" knowledge/python/atoms/*.md
grep -H "^tier:" knowledge/python/atoms/*.md
grep -H "triggers:" knowledge/python/atoms/*.md
```

Conferir: 18 arquivos; tiers somando 6 T1 + 9 T2 + 3 T3 (D4). Se a decisão RF16 do dev tiver
promovido `graphql-grpc-contracts` a T2 (ver MEMORY), a contagem vira 6/10/2 — refletir no
INDEX e registrar DI.

#### Passo 2: Reescrever o INDEX

Modelo estrutural: `knowledge/rails/INDEX.md` (layout Por Skill Cross-Stack / Por Tier / Por
keyword). Regras da versão final:

- **Linha 1 = H1 EXATO** `# Python Knowledge — Index` — o comentário de provenance vem DEPOIS
  do H1 (G18): `getStackKnowledgePreface` (`skills/security/lib/stack-aware-preface.ts:37`)
  exige `startsWith('# ')`; o Rails perdeu o preface por começar com comentário HTML — o
  Python corrige o defeito.
- **Preâmbulo D2** (herdar do skeleton, ajustando a contagem): Python 3.11+/foco 3.13; 18
  átomos; "padrões web são FastAPI-native"; skills cross-stack consomem via
  `getStackKnowledgePreface()`.
- **`## Por Skill Cross-Stack`** — 7 subseções `### Para /{skill}`, cada uma com ≥2 átomos
  (CA-05), 1 linha por átomo no formato Rails: `- **{slug}** (T{n}) — {resumo de 5-8 palavras
  derivado dos triggers}`. Sugestão de partida (VALIDAR contra os `related_skills` reais do
  Passo 1 — o frontmatter ganha em caso de divergência):

  | Skill | Átomos candidatos |
  |---|---|
  | /security | security-fastapi-owasp (T1), errors-logging-observability (T1, PII/sanitização), dependencies-and-packaging-uv (T2, supply chain) |
  | /api-design | api-design-and-contracts (T2), security-fastapi-owasp (T1), graphql-grpc-contracts (T3), async-and-concurrency (T1, streaming) |
  | /system-design | async-and-concurrency (T1), sqlalchemy-async-and-orm (T2, pooling), performance-and-profiling (T2), background-jobs-and-queues (T3), deployment-and-production (T2) |
  | /design-patterns | python-idioms-and-antipatterns (T1), code-smells-and-refactoring (T2), errors-logging-observability (T1), debugging-pdb-debugpy (T3) |
  | /architecture | architecture-and-di-fastapi (T2), typing-and-static-analysis (T1), migrations-and-schema-evolution (T2), graphql-grpc-contracts (T3) |
  | /infrastructure | deployment-and-production (T2), dependencies-and-packaging-uv (T2), tooling-ruff-mypy-precommit (T2), migrations-and-schema-evolution (T2), background-jobs-and-queues (T3) |
  | /tdd-workflow | pytest-and-testing-strategy (T1), debugging-pdb-debugpy (T3), tooling-ruff-mypy-precommit (T2) |

- **`## Por Tier`** — 3 subseções com contagem no header (espelho Rails: "Tier 1 — Todo Python
  dev sênior precisa (6 átomos)"), 1 linha por átomo: `` `{slug}` — {keywords-resumo} ``.
- **`## Por keyword`** — tabela com header EXATO `| Keyword | Átomos |` (o parser filtra o
  header por `keyword |` case-insensitive — `format-knowledge-preview.ts:44`), ~18 rows (1 por
  átomo), formato `| kw1, kw2, kw3 | [slug](./atoms/slug.md) |`. As primeiras 2 rows carregam
  os top keywords do preview (top-8 = primeiras células, na ordem): garantir que asyncio,
  pytest, SQLAlchemy, Ruff, mypy, uv, FastAPI, Alembic apareçam cedo (fluxo UX do PRD).
- **Rodapé:** nota `python_versions: ['>=3.13']` para padrões 3.13-only (herdar do skeleton).
- **≤100 linhas TOTAL (hard, G19).** Orçamento: Rails fechou 98 com 14 átomos; com 18, cortar
  redundância nas listas por skill (átomo citado em 2-3 skills no máximo — citar em todas
  onde `related_skills` aponta SÓ se couber; CA-05 exige ≥2 por skill, não exaustividade).

#### Passo 3: Verificação da Parte A

```powershell
(Get-Content knowledge/python/INDEX.md | Measure-Object -Line).Lines        # <= 100
(Get-Content knowledge/python/INDEX.md -TotalCount 1)                        # "# Python Knowledge — Index"
```

- 7 subseções `### Para /` com ≥2 bullets cada (CA-05) — contar por grep.
- Todos os 18 slugs aparecem em Por Tier E em Por keyword; links relativos `./atoms/*.md`
  existem (o harness:validate checa links).

### Parte B — Nota Django/Flask (RF14/D8, could-have — TDD leve)

**Corte permitido (G26):** se o envelope da fase apertar, PULAR a Parte B inteira (Parte A e
C são o core), registrar DEV no MEMORY e remover os 3 arquivos de código da tabela de
afetados no commit.

#### Passo 4: RED — testes do detector conservador

Em `format-knowledge-preview.test.ts` (padrão do describe de `extractPythonVersionWarning`
da fase-05 do Plano 01):

```typescript
// 2026-08-30 (Luiz/dev): nota Django/Flask — D8/RF14 do PRD stack-knowledge-python (could-have).
// Conservador como R7: detecta só dependência declarada; falso-negativo ok, falso-positivo não.
describe('extractPythonWebFrameworkNote (RF14/D8)', () => {
  const NOTE = 'ℹ️ Padrões web dos átomos são FastAPI-native. Átomos de linguagem/tooling servem qualquer Python.'

  it('django nas dependencies do pyproject gera nota', () => {
    const pyproject = '[project]\nname = "x"\ndependencies = ["django>=5.0", "celery"]\n'
    expect(extractPythonWebFrameworkNote(pyproject, null)).toBe(NOTE)
  })

  it('flask nas dependencies do pyproject gera nota', () => {
    const pyproject = '[project]\nname = "x"\ndependencies = ["flask>=3.0"]\n'
    expect(extractPythonWebFrameworkNote(pyproject, null)).toBe(NOTE)
  })

  it('fastapi-only NAO gera nota', () => {
    const pyproject = '[project]\nname = "x"\ndependencies = ["fastapi>=0.110", "uvicorn"]\n'
    expect(extractPythonWebFrameworkNote(pyproject, null)).toBeNull()
  })

  it('django no requirements.txt (sem pyproject) gera nota', () => {
    expect(extractPythonWebFrameworkNote(null, 'django>=5.0\npsycopg[binary]\n')).toBe(NOTE)
  })

  it('substring nao dispara: "django" em comentario/nome composto sem ser dep', () => {
    expect(extractPythonWebFrameworkNote('[project]\nname = "django-fanpage-scraper"\ndependencies = ["httpx"]\n', null)).toBeNull()
    expect(extractPythonWebFrameworkNote(null, '# migrado do django em 2024\nfastapi\n')).toBeNull()
  })

  it('ambos ausentes NAO gera nota nem lanca', () => {
    expect(extractPythonWebFrameworkNote(null, null)).toBeNull()
  })
})
```

RED genuíno: exportar stub `return null` primeiro; falha por assertion.

#### Passo 5: GREEN — helper em format-knowledge-preview.ts

Mesma vizinhança dos warnings de versão. Implementação conservadora:

```typescript
// 2026-08-30 (Luiz/dev): RF14/D8 — nota informativa quando django/flask aparecem nas deps.
// Complementa D2 (preâmbulo do INDEX): evita dev Django aplicar padrão FastAPI sem perceber.
// Conservador (espelho R7): só linha de dependência declarada — pyproject: item do array
// dependencies começando com o nome; requirements: linha começando com o nome. Comentários,
// name do projeto e pacotes que apenas CONTÊM a palavra não disparam.
export const FASTAPI_NATIVE_NOTE =
  'ℹ️ Padrões web dos átomos são FastAPI-native. Átomos de linguagem/tooling servem qualquer Python.'

const DEP_ENTRY = /["']\s*(django|flask)\b/i          // item de array do pyproject
const REQ_LINE = /^\s*(django|flask)\b/im             // linha do requirements.txt

export function extractPythonWebFrameworkNote(
  pyprojectContent: string | null,
  requirementsContent: string | null,
): string | null {
  if (pyprojectContent) {
    const depsBlock = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(pyprojectContent)
    if (depsBlock?.[1] && DEP_ENTRY.test(depsBlock[1])) return FASTAPI_NATIVE_NOTE
  }
  if (requirementsContent && REQ_LINE.test(requirementsContent)) return FASTAPI_NATIVE_NOTE
  return null
}
```

(Snippet de referência — ajustar na implementação se os testes exigirem; o contrato são os
testes do Passo 4.)

#### Passo 6: GREEN — integração no run-stack-knowledge-init.ts

Dentro do bloco `if (stackJson.primary === 'python')` criado na fase-05 do Plano 01 (após o
warning de versão): ler `requirements.txt` com o mesmo padrão stat + `MANIFEST_MAX_BYTES` +
try/catch silencioso, chamar o helper com os dois conteúdos (o pyproject já foi lido para o
warning — reusar a variável, não ler duas vezes) e propagar via campo NOVO additive:

```typescript
// 2026-08-30 (Luiz/dev): RF14/D8 — nota informativa (não é warning; canal separado additive).
notes?: string[]   // no RunStackKnowledgeInitResult
```

Emitir também no `logger` (a nota é output user-facing do /init). Retorno segue o padrão do
`warnings`: `...(notes.length > 0 ? { notes } : {})`.

Testes de integração em `run-stack-knowledge-init.test.ts`: django no pyproject → `notes`
contém a nota; fastapi-only → `notes` undefined; requirements-only com flask → nota presente.

### Parte C — Preview keywords sobre o INDEX final (RF15)

#### Passo 7: Teste RF15

No mesmo `format-knowledge-preview.test.ts`:

```typescript
// 2026-08-30 (Luiz/dev): RF15 — preview de keywords contra o INDEX Python REAL da matrix
// (regressão automática da infra RF10 Node; o e2e full re-checa pós-cópia no Plano 04 fase-07).
describe('parseTopKeywords sobre knowledge/python/INDEX.md final (RF15)', () => {
  const PYTHON_INDEX = join(import.meta.dir, '..', '..', '..', 'knowledge', 'python', 'INDEX.md')

  it('retorna 8 keywords não-vazias do INDEX final', async () => {
    const keywords = await parseTopKeywords(PYTHON_INDEX)
    expect(keywords.length).toBe(TOP_N_KEYWORDS)
    expect(keywords.every((k) => k.length > 0)).toBe(true)
  })

  it('primeiras rows da tabela alimentam o preview (fluxo UX do PRD)', async () => {
    const keywords = await parseTopKeywords(PYTHON_INDEX)
    expect(keywords).toContain('asyncio')
    expect(keywords).toContain('pytest')
  })
})
```

(Ajustar o path relativo ao harness real do arquivo de teste; as duas keywords assertadas
devem existir nas 2 primeiras rows da tabela — alinhar Passo 2 e Passo 7.)

### Passo 8: Suite completa + commit próprio (commit 2)

```
bun test && bun run typecheck && bun run harness:validate
git add knowledge/python/INDEX.md skills/init/lib/format-knowledge-preview.ts skills/init/lib/format-knowledge-preview.test.ts skills/init/lib/run-stack-knowledge-init.ts skills/init/lib/run-stack-knowledge-init.test.ts
git commit -m "feat(python-knowledge): INDEX final consolidado + nota Django/Flask + preview keywords (RF1/RF14/RF15, CA-05)"
```

---

## Gotchas

- **G18 do plano (crítico):** H1 na linha 1. Se o INDEX final começar com comentário HTML, o
  preface CA-05 degrada para `''` silenciosamente e o e2e full da fase-07 (que asserta preface
  não-vazio) REPROVA. O comentário de provenance vai na linha 2+.
- **G19 do plano:** cap 100 com 18 átomos exige disciplina — 1 linha por átomo por seção,
  átomo em no máximo as skills onde `related_skills` aponta. CA-05 pede ≥2 por skill; não é
  matriz completa 18×7.
- **G26 do plano:** RF14 corta-se INTEIRO ou entrega-se inteiro (helper + integração + testes).
  Meio-RF14 (helper sem integração) é pior que cortar.
- **Local — fonte de verdade do roteamento:** divergência entre a tabela-sugestão desta fase e
  os `related_skills` reais dos átomos → o frontmatter ganha; se o frontmatter parecer errado,
  corrigir o átomo é mudança de conteúdo (registrar DI, rodar validador de novo) — não
  "consertar só no INDEX" (Uma Fonte de Verdade).
- **Local — header da tabela keyword:** manter EXATO `| Keyword | Átomos |` — o parser filtra
  por `keyword |` case-insensitive; mudar o texto quebra o filtro.
- **Local — RF16:** conferir o MEMORY antes do Passo 2 — se o dev promoveu graphql a T2, o Por
  Tier muda (6/10/2) e a linha do átomo muda de seção.
- **Local — reuso de leitura no init:** o pyproject já é lido para o warning de versão
  (fase-05 Plano 01) — a integração RF14 NÃO faz segunda leitura do mesmo arquivo.
- **G7 do plano:** comentários de provenance com data real de execução.

---

## Verificacao

### TDD

- [ ] **RED (RF14):** describe do Passo 4 com stub `return null` — falha por assertion
  - Comando: `bun test skills/init/lib/format-knowledge-preview.test.ts`
- [ ] **GREEN (RF14 + RF15):** helper + integração + testes RF15 verdes
  - Comando: `bun test skills/init/lib/format-knowledge-preview.test.ts skills/init/lib/run-stack-knowledge-init.test.ts`
  - Resultado esperado: `0 fail`

### Checklist

- [ ] INDEX ≤100 linhas; linha 1 = `# Python Knowledge — Index` (G18)
- [ ] Preâmbulo D2 presente (3.11+/3.13 + FastAPI-native declarado)
- [ ] 7 subseções de skill, cada uma com ≥2 átomos (CA-05)
- [ ] Por Tier com 6/9/3 (ou contagem ajustada por RF16, com DI registrado)
- [ ] Tabela Por keyword: header exato, 18 rows, links `./atoms/*.md` válidos
- [ ] `parseTopKeywords` retorna 8 keywords do INDEX final (RF15)
- [ ] RF14: nota emitida com django/flask; ausente com fastapi-only; conservador em
      comentários/nomes (ou RF14 cortado com DEV registrado — G26)
- [ ] Warning de versão (fase-05 Plano 01) intacto — regressão dos describes existentes
- [ ] Testes passam: `bun test`; TypeCheck: `bun run typecheck`
- [ ] `bun run harness:validate` verde (link checker cobre os 18 links do INDEX)
- [ ] Commit próprio (commit 2 do plano)

---

## Criterio de Aceite

**Por maquina:**
- `bun test` completo 0 fail; `(Get-Content knowledge/python/INDEX.md | Measure-Object -Line).Lines` ≤ 100
- `getStackKnowledgePreface` retorna string não-vazia num projeto com este INDEX copiado
  (provado de vez no e2e full da fase-07)

**Por humano:**
- Leitura do INDEX: um dev Python acha o átomo certo pela skill OU pela keyword em <30s;
  nenhuma seção órfã ou átomo fantasma

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
