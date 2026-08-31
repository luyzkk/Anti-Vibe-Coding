# Fase 06: Átomo `tooling-ruff-mypy-precommit` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1h)
**Depende de:** Plano 02 completo (Wave 2 — independente das fases 01-05, 07-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/tooling-ruff-mypy-precommit.md` — configuração e integração
de Ruff, coverage, deptry, Vulture e pre-commit, PT-BR, ≤200 linhas, SEM duplicar o mypy
strict flag-a-flag que já vive em `typing-and-static-analysis` (Plano 02).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/tooling-ruff-mypy-precommit.md` | Create | Átomo T2 destilado da fonte abaixo |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte única:**
`Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md`
(17 seções)

**Seções a cobrir:**

1. Ruff: `select` vs `extend-select`
2. `extend-immutable-calls` / B008
3. Famílias de regras: FAST / S / ASYNC / ANN / ERA
4. `ruff format` + regra I (import sorting)
5. pre-commit: ordem check antes de format + venv do mypy
6. deptry DEP001-004
7. coverage: branch + `exclude_also` + cobertura falsa de async
8. Dead code: Vulture e números de falso positivo
9. IDE / ruff server
10. §17 — lint como guardrail para agentes de IA

**DEDUP OBRIGATÓRIO (G17 — declarar no prompt):** o mypy strict flag-a-flag JÁ está no átomo
`typing-and-static-analysis` (Plano 02 fase-02; a §3 desta mesma fonte foi fonte complementar
lá). Aqui entra SOMENTE o ângulo de **config e integração no pre-commit** (venv do mypy, ordem
dos hooks) — referenciar `typing-and-static-analysis` para as flags. Duplicação flag-a-flag é
defeito de wave.

---

## Frontmatter alvo

```yaml
---
topic: tooling-ruff-mypy-precommit
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md
tier: 2
triggers: [ruff, lint, extend-select, B008, ruff format, import sorting, pre-commit, mypy hook, deptry, coverage, branch coverage, exclude_also, vulture, dead code, ruff server, guardrail]
related_skills: [/design-patterns, /tdd-workflow]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

Versões de Ruff divergentes entre fontes (0.15 vs 0.16) → normalizar para a mais recente
citada (G4).

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código. Ler o `typing-and-static-analysis.md` commitado (Plano 02) para o
extrator saber exatamente o que NÃO repetir — anexar a lista de patterns dele ao prompt.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 04-05 (Wave 2).

### Passo 3: Check estrutural + check de dedup

Cap ≤200, 4 seções, frontmatter, zero placeholders. Check de dedup: nenhuma flag de mypy
strict detalhada (`disallow_untyped_defs`, `warn_return_any` etc.) explicada aqui — apenas
integração pre-commit/venv.

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 2.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/tooling-ruff-mypy-precommit.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/compass_artifact_wf-c4871980-0dc5-5ac9-a91b-92a5a6ec022f_text_markdown.md

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

Escopo: as 17 seções da fonte (Ruff select vs extend-select, extend-immutable-calls/B008,
famílias FAST/S/ASYNC/ANN/ERA, ruff format + regra I, pre-commit ordem check antes de format +
venv do mypy, deptry DEP001-004, coverage branch + exclude_also + cobertura falsa de async,
Vulture e números de falso positivo, IDE/ruff server, §17 lint como guardrail p/ agentes de
IA).

Regras específicas:
- DEDUP OBRIGATÓRIO: o mypy strict flag-a-flag JÁ vive no átomo typing-and-static-analysis
  (anexo: lista dos patterns dele). Deste tema, escreva SOMENTE config/integração pre-commit
  (venv do mypy, ordem dos hooks) e REFERENCIE typing-and-static-analysis para as flags. Não
  explique flags de mypy aqui.
- Claims "contestado" na fonte NUNCA viram regra dura.
- Versões Ruff inline no corpo, normalizadas para a mais recente citada nas fontes do corpus.
- Cap 200 hard: excedente relevante LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G17 do plano (crítico aqui):** dedup com `typing-and-static-analysis` — o Passo 1 anexa a
  lista de patterns do átomo do Plano 02 ao prompt; sem isso o extrator não tem como saber o
  que já foi coberto (fresh context).
- **G4 do plano:** Ruff 0.15 vs 0.16 — mais recente citada.
- **G7 do plano:** `updated:` com data real.
- **Local:** a §17 (lint como guardrail p/ agentes de IA) é diferencial desta fonte — dá bom
  conteúdo para Critérios de decisão; não deixar de fora por parecer "meta".

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Dedup mypy: nenhuma flag strict explicada; `typing-and-static-analysis` referenciado
  (grep por `disallow_untyped_defs|warn_return_any` no átomo = 0)
- [ ] Ordem pre-commit (check antes de format) e venv do mypy cobertos — é o ângulo que só
  este átomo tem
- [ ] §17 (guardrail p/ agentes de IA) representada
- [ ] `sources:` = compass c4871980 (path completo)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 2)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- `grep -cE "disallow_untyped_defs|warn_return_any" knowledge/python/atoms/tooling-ruff-mypy-precommit.md` = 0

**Por humano:**
- Review da wave confirma a divisão de fronteira com typing-and-static-analysis
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
