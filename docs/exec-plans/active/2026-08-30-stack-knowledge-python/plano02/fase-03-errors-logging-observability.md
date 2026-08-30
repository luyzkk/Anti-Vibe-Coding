<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 03: Átomo `errors-logging-observability.md`

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 1h
**Depende de:** Plano 01 completo (independente das fases 01-02, 04-05 — Wave 1, paralelizável)
**Visual:** false

---

## O que esta fase entrega

Átomo T1 `knowledge/python/atoms/errors-logging-observability.md` — hierarquia de exceções,
logging estruturado e observabilidade destilados de fonte única (17 seções), preservando os
números concretos e o roteiro de adoção em 3 estágios da fonte.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/errors-logging-observability.md` | Create | Átomo T1 destilado (único arquivo desta fase — G11: NÃO tocar INDEX.md) |

---

## Implementacao

### Passo 1: Ler a fonte e o formato de referência

Fonte única desta fase (ground truth — congelada, gitignored G1):

- `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md`
  — 17 seções; contém roteiro de adoção em 3 estágios e números concretos (sampling rates,
  thresholds etc.) que DEVEM ser preservados como estão na fonte.

Formato de referência: `knowledge/rails/atoms/active-record-fundamentals.md` +
`knowledge/python/atoms/async-and-concurrency.md` (piloto).

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/errors-logging-observability.md destilando EXCLUSIVAMENTE a fonte:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
ATENÇÃO INVERTIDA nesta fonte: ela TEM números concretos (rates, limites, estágios) — quando
usar um número, copie EXATAMENTE o da fonte; nunca arredonde nem "melhore". Onde a fonte é
qualitativa, permaneça qualitativo.

IDIOMA: PT-BR (D1). Fonte já em PT-BR — destilação direta.

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção) / ## Critérios de decisão (tabela) / ## Referências externas; zero [A DEFINIR].

SEÇÕES DA FONTE A COBRIR (17 seções — priorize por impacto se o cap apertar):
- Hierarquia AppError (exceção base da aplicação)
- raise ... from (encadeamento explícito de causa)
- ExceptionGroup / except* (3.11+)
- structlog via dictConfig + QueueHandler
- Correlation IDs com contextvars
- Retry com stamina
- Circuit breaker
- RFC 9457 (problem details para APIs)
- Sentry sampling (preservar números da fonte)
- Gotcha SecretStr + model_dump_json (vazamento na serialização)
- DLQ (dead letter queue)
- sys.monitoring
- Roteiro de adoção em 3 estágios (preservar os 3 estágios como a fonte estrutura — candidato
  natural para Critérios de decisão)

REGRAS DE CONTEÚDO:
- Claims "contestado" na fonte NUNCA viram regra dura — nota em Critérios de decisão ou omitir (G3)
- Números concretos copiados EXATOS da fonte (sem arredondar/inventar)
- Excedente do cap 200: NÃO escreva no átomo; liste ao final como "EXCEDENTE PARA TODO.md" (G5)

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: errors-logging-observability
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md
tier: 1
triggers: [exception, exceção, AppError, raise from, ExceptionGroup, except*, logging, structlog, dictConfig, QueueHandler, correlation id, contextvars, retry, stamina, circuit breaker, RFC 9457, Sentry, sampling, SecretStr, model_dump_json, DLQ, sys.monitoring, observabilidade]
related_skills: [/design-patterns, /system-design, /infrastructure]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 3: Check estrutural local + verificação de números

Além dos checks padrão, comparar por amostragem os números concretos do átomo contra a fonte
(ver Checklist). Excedente → `TODO.md` da raiz (G5).

---

## Gotchas

- **G2 do plano:** anti-drift clause VERBATIM — plan-verifier rejeita prompt sem a cláusula.
- **G5 do plano:** fonte com 17 seções — risco moderado de cap. O roteiro de 3 estágios
  condensa bem em Critérios de decisão (tabela estágio → o que adotar).
- **G11 do plano:** NÃO tocar INDEX.md.
- **Local — números são o ponto frágil deste átomo:** a compound anti-drift documenta que o
  drift clássico é *injetar* números que a fonte não tem (caso `~10% overhead`). Aqui o risco
  é o simétrico: *alterar* números que a fonte tem. Ambos reprovam no verifier. Todo número no
  átomo precisa de passagem correspondente com o MESMO valor.
- **Local — ExceptionGroup/except\* é 3.11+:** compatível com o default `python_versions:
  ['>=3.11']` — não precisa de marcação extra, mas o corpo pode citar "3.11+" como a fonte fizer.
- **Local — fronteira com background-jobs (Plano 04 fase-01):** a §14 desta fonte (DLQ em
  contexto de filas) também alimenta `background-jobs-and-queues`. Aqui entra o conceito DLQ
  sob observabilidade/resiliência; a mecânica de filas fica para o átomo T3. Não aprofundar.

---

## Verificacao

### TDD (adaptado — test-after com gate próprio)

- [ ] **CHECK ESTRUTURAL:** comandos abaixo passam
- [ ] **GATE DE FIDELIDADE:** delegado à fase-06 (verifier refined batch, ≥80%)

### Checklist

- [ ] Corpo ≤200 linhas; 4 seções obrigatórias; zero `[A DEFINIR]`
- [ ] Frontmatter passa no validador (`bun test atoms-frontmatter-validator` verde)
- [ ] `sources:` com o path exato do compass 9b12d328 (RF13)
- [ ] **Preservação dos números concretos:** listar todos os números do átomo
  (`grep -oE '[0-9]+([.,][0-9]+)?%?' knowledge/python/atoms/errors-logging-observability.md`)
  e conferir ≥5 por amostragem contra a fonte — valores EXATOS, sem arredondamento
- [ ] Roteiro de adoção em 3 estágios presente (grep por `estágio`/`Estágio` retorna ≥3 menções ou tabela equivalente)
- [ ] Gotcha SecretStr + model_dump_json presente (grep `model_dump_json` ≥1)
- [ ] Nenhuma claim "contestado" virou regra dura (spot check)
- [ ] `git status` sem `Infos/` staged (G1); INDEX.md intacto (G11)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, corpo ≤200 linhas, 4 seções, frontmatter válido
- `grep model_dump_json` ≥1; menção aos 3 estágios de adoção presente
- `bun run harness:validate` verde (fechamento da Wave 1)

**Por humano:**
- Amostra de ≥5 números concretos idênticos aos da fonte; fidelidade formal fica com a fase-06

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
