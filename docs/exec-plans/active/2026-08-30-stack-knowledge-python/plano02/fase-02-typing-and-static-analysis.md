<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 02: Átomo `typing-and-static-analysis.md`

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 1.5h
**Depende de:** Plano 01 completo (independente das fases 01, 03-05 — Wave 1, paralelizável)
**Visual:** false

---

## O que esta fase entrega

Átomo T1 `knowledge/python/atoms/typing-and-static-analysis.md` — tipagem sênior (25 regras
do deep-research) + panorama de type checkers, ≤200 linhas, frontmatter completo com decisão
explícita sobre `python_versions` (TypeIs é 3.13+).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/typing-and-static-analysis.md` | Create | Átomo T1 destilado (único arquivo desta fase — G11: NÃO tocar INDEX.md) |

---

## Implementacao

### Passo 1: Ler as fontes e o formato de referência

Fontes desta fase (ground truth — congeladas, gitignored G1):

- **PRIMÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report (3).md`
  — "Tipagem sênior", 25 regras
- **SECUNDÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md`
  — usar APENAS §3 (type checkers: plugin pydantic.mypy, ty/Pyrefly como complementares).
  O restante do compass c4871980 é fonte do átomo `tooling-ruff-mypy-precommit` (Plano 03
  fase-06) — não antecipar conteúdo de tooling aqui.

Formato de referência: `knowledge/rails/atoms/active-record-fundamentals.md` +
`knowledge/python/atoms/async-and-concurrency.md` (piloto).

### Passo 2: Decidir `python_versions` ANTES de spawnar o extrator

Regra (nota do PLAN + D9): TypeIs é 3.13+. Avaliar:
- Se o átomo INTEIRO depender de 3.13 (não é o caso esperado — mypy strict, NewType, Protocol,
  variance etc. servem 3.11) → `python_versions: ['>=3.13']`
- Caso contrário (default esperado) → `python_versions: ['>=3.11']` e TypeIs marcado INLINE
  no corpo ("TypeIs — 3.13+; em 3.11/3.12 use TypeGuard")

Registrar a decisão como DI no MEMORY.md do plano se divergir do default.

### Passo 3: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/typing-and-static-analysis.md destilando EXCLUSIVAMENTE as fontes:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report (3).md (PRIMÁRIA — 25 regras de tipagem)
2. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md — APENAS a §3 (type checkers)

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
Se a fonte não documenta um número/flag/versão, descreva qualitativamente como a fonte faz —
não estime números nem invente flags de mypy.

IDIOMA: PT-BR (D1). Fontes já em PT-BR — destilação direta, sem tradução.

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção) / ## Critérios de decisão (tabela) / ## Referências externas; zero [A DEFINIR].

CONTEÚDO DA FONTE PRIMÁRIA A COBRIR (priorize por impacto se o cap apertar):
- mypy 2.x modo strict flag-a-flag (o que o strict liga)
- strict NÃO inclui warn_unreachable (distinção explícita da fonte — preservar)
- TypeIs vs TypeGuard vs cast (TypeIs é 3.13+ — marcar inline conforme decisão de python_versions)
- NewType vs value object
- Discriminated unions
- Protocol / ParamSpec
- Variance (covariância/contravariância)
- dmypy (daemon)
- autospec / spec_set em mocks tipados
- Baseline pyproject pronto (preservar o bloco de configuração que a fonte oferece, se couber no cap)

DA FONTE 2 (§3 apenas): plugin pydantic.mypy; ty/Pyrefly como complementares (não substitutos).

REGRAS DE CONTEÚDO:
- Claims "contestado" na fonte NUNCA viram regra dura — nota em Critérios de decisão ou omitir (G3)
- Divergência de versões entre fontes → normalizar para a mais recente citada (G4)
- Excedente do cap 200: NÃO escreva no átomo; liste ao final como "EXCEDENTE PARA TODO.md" (G5)

FRONTMATTER EXATO (updated = data real de execução, G7; python_versions conforme Passo 2):
---
topic: typing-and-static-analysis
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report (3).md
  - Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md
tier: 1
triggers: [mypy, strict, tipagem, type hints, TypeIs, TypeGuard, cast, NewType, value object, discriminated union, Protocol, ParamSpec, variance, dmypy, autospec, spec_set, pydantic.mypy, ty, Pyrefly, warn_unreachable]
related_skills: [/design-patterns, /architecture, /tdd-workflow]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 4: Check estrutural local + excedente

Rodar a seção Verificação; excedente listado pelo extrator vira entrada
`- [ ] [knowledge-python] Excedente cap-200 de typing-and-static-analysis: {resumo}` no
`TODO.md` da raiz (G5).

---

## Gotchas

- **G2 do plano:** anti-drift clause VERBATIM — plan-verifier rejeita prompt sem a cláusula.
- **G4 do plano:** deep-research e compass podem citar versões diferentes de mypy/ferramentas —
  normalizar para a mais recente citada.
- **G11 do plano:** NÃO tocar INDEX.md.
- **Local — fronteira com tooling (Plano 03 fase-06):** o compass c4871980 inteiro cobre
  Ruff/mypy/pre-commit; esta fase usa SÓ a §3. Configuração de pre-commit, Ruff rules etc.
  NÃO entram aqui — evita duplicação entre átomos irmãos.
- **Local — TypeIs 3.13+:** a decisão do Passo 2 precisa estar refletida em DOIS lugares
  coerentes: frontmatter (`python_versions`) e corpo (marcação inline). Incoerência entre os
  dois é rework garantido no audit.

---

## Verificacao

### TDD (adaptado — test-after com gate próprio)

- [ ] **CHECK ESTRUTURAL:** comandos abaixo passam
- [ ] **GATE DE FIDELIDADE:** delegado à fase-06 (verifier refined batch, ≥80%)

### Checklist

- [ ] Corpo ≤200 linhas (`wc -l` sobre o arquivo; corpo pós-frontmatter ≤200)
- [ ] 4 seções obrigatórias presentes (grep por `Quando consultar`, `Padrões sênior`, `Anti-padrões`, `Critérios de decisão`)
- [ ] Zero `[A DEFINIR]`
- [ ] Frontmatter passa no validador (`bun test atoms-frontmatter-validator` verde; `python_versions` array)
- [ ] `sources:` com os 2 paths exatos, incluindo o `(3)` com espaço no nome do arquivo (RF13)
- [ ] Claim "strict NÃO inclui warn_unreachable" presente e fiel à fonte (distinção-chave; grep por `warn_unreachable`)
- [ ] TypeIs marcado como 3.13+ (inline OU `python_versions: ['>=3.13']` — nunca sem marcação)
- [ ] Nenhum conteúdo de tooling (pre-commit/Ruff config) além da §3 do compass (fronteira com Plano 03 fase-06)
- [ ] Nenhuma claim "contestado" virou regra dura (spot check)
- [ ] `git status` sem `Infos/` staged (G1); INDEX.md intacto (G11)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, corpo ≤200 linhas, 4 seções, frontmatter válido com `python_versions` em array
- `grep -i 'warn_unreachable'` retorna ≥1 no átomo; `grep -i 'TypeIs'` acompanhado de marcação de versão
- `bun run harness:validate` verde (fechamento da Wave 1)

**Por humano:**
- Coerência frontmatter ↔ corpo na decisão TypeIs (Passo 2); fidelidade formal fica com a fase-06

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
