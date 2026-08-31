# Fase 05: Átomo `dependencies-and-packaging-uv` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 2 — independente das fases 01-04, 06-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/dependencies-and-packaging-uv.md` — gestão de dependências e
packaging uv-first (PEP 621/751/735, supply chain, pinning, SBOM), PT-BR, ≤200 linhas,
destilado de 2 fontes compass.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/dependencies-and-packaging-uv.md` | Create | Átomo T2 destilado das fontes abaixo |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte PRIMÁRIA:**
`Infos/knowledge/Python/compass_artifact_wf-b10c35a1-e3cd-582e-abdd-3dd4dc1cd670_text_markdown.md`
(19 seções)

**Fonte complementar:**
`Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md`
— **APENAS a §18** (slopsquatting/typosquatting). O resto do 0e7023f8 é a fonte do átomo
`security-fastapi-owasp` (Plano 02 fase-05) — não re-extrair.

**Seções da primária a cobrir:**

1. uv / PEP 621
2. `uv.lock` commitado + hashes
3. PEP 751
4. Renovate vs Dependabot
5. FastAPI 0.x: minor = breaking
6. pip-audit
7. Critérios para adotar nova dependência
8. Workspaces
9. Dependency confusion / `--extra-index-url`
10. Licenças
11. Deps abandonadas: fork > alternativa > vendor
12. Pinning: app vs lib
13. SBOM: CycloneDX / PEP 740
14. Incidentes reais — **como EVIDÊNCIA, não como átomo** (regra abaixo)
15. PEP 735
16. `fastapi` vs `fastapi[standard]` vs `fastapi[all]`

**Regra "incidentes reais":** a fonte usa incidentes de supply chain como evidência dos
padrões. O átomo NÃO recontará incidentes como conteúdo próprio — no máximo 1 linha de
menção como evidência de um padrão, atribuída à fonte.

**Dedup (G17):**
- Slopsquatting/typosquatting (§18 do 0e7023f8): AQUI é o dono do tema pelo ângulo de gestão
  de dependências; o átomo `security-fastapi-owasp` (Plano 02) cobre OWASP/runtime — se ele já
  tiver mencionado o tema, referenciar em vez de duplicar (conferir o átomo commitado antes).
- Trusted Publishing/secrets em CI pertencem à fase-08 (deployment) — aqui só o ângulo de
  packaging/publicação de pacote, se a fonte primária o trouxer.
- `uv --locked` em CI pertence à fase-08; aqui fica o contrato do lockfile (`uv.lock`
  commitado + hashes).

**Pré-flight específico (G13):** ler no `plano02/MEMORY.md` o resultado do rastreio ECC
(RF12). Esta fase NÃO usa fontes ECC, mas o MEMORY pode conter nota sobre NOTICES que afete
como citar fontes.

---

## Frontmatter alvo

```yaml
---
topic: dependencies-and-packaging-uv
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-b10c35a1-e3cd-582e-abdd-3dd4dc1cd670_text_markdown.md
  - Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md
tier: 2
triggers: [uv, pyproject, PEP 621, PEP 751, PEP 735, uv.lock, lockfile, dependabot, renovate, pip-audit, dependency confusion, extra-index-url, typosquatting, slopsquatting, SBOM, CycloneDX, pinning, vendoring, workspaces, fastapi standard]
related_skills: [/security, /infrastructure]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código + leitura do resultado ECC no `plano02/MEMORY.md` (G13) + conferir se
`security-fastapi-owasp.md` commitado já menciona typosquatting (dedup).

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 04 e 06 (Wave 2).

### Passo 3: Check estrutural

Cap ≤200, 4 seções, frontmatter, zero placeholders. Spot-check: incidentes reais aparecem no
máximo como menção de 1 linha.

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 2.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/dependencies-and-packaging-uv.md` em PT-BR, destilado EXCLUSIVAMENTE
de:
  PRIMÁRIA: Infos/knowledge/Python/compass_artifact_wf-b10c35a1-e3cd-582e-abdd-3dd4dc1cd670_text_markdown.md
  COMPLEMENTAR (SOMENTE a §18 — slopsquatting/typosquatting):
    Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md

REGRA DE FIDELIDADE (compound lesson
docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md — verbatim):
"REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier gate
downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo no
retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia o
source para confirmar."

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
"Se source não documenta o overhead quantitativo de uma API, descreva a API qualitativamente
(como a fonte faz) — não estime números próprios."

Formato: siga knowledge/rails/atoms/active-record-fundamentals.md — frontmatter (fornecido
pela fase) + corpo ≤200 linhas com as 4 seções obrigatórias + Referências externas.

Escopo: as 19 seções da primária (uv/PEP 621, uv.lock commitado + hashes, PEP 751, Renovate vs
Dependabot, FastAPI 0.x minor=breaking, pip-audit, critérios p/ nova dep, workspaces,
dependency confusion --extra-index-url, licenças, deps abandonadas fork>alternativa>vendor,
pinning app vs lib, SBOM CycloneDX/PEP 740, incidentes reais, PEP 735, fastapi vs [standard]
vs [all]) + §18 da complementar (slopsquatting/typosquatting).

Regras específicas:
- Incidentes reais da fonte são EVIDÊNCIA, não átomo: no máximo 1 linha de menção por padrão,
  atribuída à fonte — não reconte incidentes.
- Da fonte complementar 0e7023f8, use SOMENTE a §18 — o restante pertence ao átomo
  security-fastapi-owasp (já commitado).
- Claims "contestado" na fonte NUNCA viram regra dura.
- Versões (uv, FastAPI) inline no corpo, normalizadas para a mais recente citada.
- DEDUP: CI com uv --locked e Trusted Publishing pertencem ao átomo deployment-and-production
  — aqui fica o contrato do lockfile e o packaging; referencie.
- Cap 200 hard: excedente relevante LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G13 do plano:** conferir MEMORY do Plano 02 (rastreio ECC) antes de citar fontes.
- **G17 do plano:** lockfile aqui, CI/Trusted Publishing na fase-08; typosquatting aqui,
  OWASP runtime no security (Plano 02).
- **G5 do plano:** 19 seções + §18 — segundo maior risco de estouro da wave; excedente →
  TODO.md.
- **G7 do plano:** `updated:` com data real.
- **Local:** duas fontes no `sources:` — o verifier rastreará contra ambas; a claim de
  slopsquatting DEVE rastrear à §18 do 0e7023f8, não à primária.

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Da complementar 0e7023f8, só conteúdo da §18 (slopsquatting/typosquatting) presente
- [ ] Incidentes reais: no máximo menções de 1 linha como evidência (sem recontagem)
- [ ] "fastapi vs [standard] vs [all]" coberto (decisão frequente de dev — bom candidato à
  tabela de Critérios de decisão)
- [ ] Referências externas apontam `deployment-and-production` (CI/publishing) e
  `security-fastapi-owasp` (OWASP)
- [ ] `sources:` com os 2 paths na ordem primária → complementar
- [ ] `bun run harness:validate` verde (na wave, antes do commit 2)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`

**Por humano:**
- Review da wave confirma: §18 como único uso da complementar, incidentes como evidência
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
