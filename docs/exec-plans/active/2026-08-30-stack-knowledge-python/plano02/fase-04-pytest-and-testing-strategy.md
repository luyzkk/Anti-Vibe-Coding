<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 04: Átomo `pytest-and-testing-strategy.md`

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 1.5h
**Depende de:** Plano 01 completo + Wave 1 commitada (independente da fase-05 — Wave 2, paralelizável)
**Visual:** false

---

## O que esta fase entrega

Átomo T1 `knowledge/python/atoms/pytest-and-testing-strategy.md` — estratégia de testes
pytest/FastAPI destilada da fonte compass primária (17 seções, PT-BR) + skill ECC
`python-testing` (ES, traduzida na destilação), incluindo os smells de suítes geradas por IA
com o ângulo "como o revisor detecta".

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/pytest-and-testing-strategy.md` | Create | Átomo T1 destilado (único arquivo desta fase — G11: NÃO tocar INDEX.md) |

---

## Implementacao

### Passo 1: Ler as fontes e o formato de referência

Fontes desta fase (ground truth — congeladas, gitignored G1):

- **PRIMÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-1d7424ba-c0bb-5ddb-956f-82d43118195f_text_markdown.md`
  — 17 seções de estratégia de testes
- **SECUNDÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-testing\SKILL.md`
  — origem "ECC", em espanhol; source normal por decisão D5, traduzir na destilação (G6)

Formato de referência: `knowledge/rails/atoms/active-record-fundamentals.md` +
`knowledge/python/atoms/async-and-concurrency.md` (piloto).

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/pytest-and-testing-strategy.md destilando EXCLUSIVAMENTE as fontes:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-1d7424ba-c0bb-5ddb-956f-82d43118195f_text_markdown.md (PRIMÁRIA)
2. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-testing\SKILL.md (SECUNDÁRIA, em espanhol)

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
Se a fonte não documenta um número/flag/versão, descreva qualitativamente como a fonte faz.

IDIOMA: PT-BR (D1). A fonte 2 está em ESPANHOL: traduza na destilação sem adicionar conteúdo —
cada claim traduzida deve permanecer rastreável à passagem original em espanhol.

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção) / ## Critérios de decisão (tabela) / ## Referências externas; zero [A DEFINIR].

SEÇÕES DA FONTE PRIMÁRIA A COBRIR (17 seções — priorize por impacto se o cap apertar):
- TestClient vs AsyncClient + ASGITransport
- dependency_overrides vs patch
- Fixtures vs factories (polyfactory)
- respx (HTTP mocking) / time-machine (tempo)
- testcontainers + savepoint (isolamento de banco)
- Hypothesis / schemathesis (property-based + contract testing)
- Mutation testing
- patch-where-its-used (onde aplicar patch — no ponto de uso, não na definição)
- Smells de suítes de teste geradas por IA — PRESERVAR o ângulo "como o revisor detecta"
  de cada smell (é o diferencial da fonte; forte candidato a Anti-padrões)

REGRAS DE CONTEÚDO:
- Claims "contestado" na fonte NUNCA viram regra dura — nota em Critérios de decisão ou omitir (G3)
- Divergência de versões entre fontes → normalizar para a mais recente citada (G4)
- Excedente do cap 200: NÃO escreva no átomo; liste ao final como "EXCEDENTE PARA TODO.md" (G5)

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: pytest-and-testing-strategy
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-1d7424ba-c0bb-5ddb-956f-82d43118195f_text_markdown.md
  - Infos/knowledge/Python/python-testing/SKILL.md
tier: 1
triggers: [pytest, fixture, conftest, TestClient, AsyncClient, ASGITransport, dependency_overrides, patch, mock, monkeypatch, factory, polyfactory, respx, time-machine, testcontainers, savepoint, Hypothesis, schemathesis, property-based, mutation testing, test smell, suíte de IA]
related_skills: [/tdd-workflow, /api-design]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 3: Check estrutural local + excedente

Rodar a seção Verificação; excedente listado pelo extrator vira entrada
`- [ ] [knowledge-python] Excedente cap-200 de pytest-and-testing-strategy: {resumo}` no
`TODO.md` da raiz (G5).

---

## Gotchas

- **G2 do plano:** anti-drift clause VERBATIM — plan-verifier rejeita prompt sem a cláusula.
- **G6 do plano:** `python-testing/SKILL.md` está em espanhol. Tradução ≠ enriquecimento: se a
  versão PT-BR de uma claim não mapear numa passagem ES concreta, é drift.
- **G11 do plano:** NÃO tocar INDEX.md.
- **Local — "como o revisor detecta" é conteúdo, não editorial:** os smells de suítes de IA
  vêm com heurística de detecção na fonte primária. Esse ângulo entra em Anti-padrões (seção
  TÉCNICA, auditada pelo verifier) — cada heurística de detecção precisa rastrear à fonte.
- **Local — fronteira com o átomo de typing (fase-02):** autospec/spec_set aparece nas duas
  fontes-mãe (tipagem e testes). Aqui entra o USO em testes (patch seguro); a semântica de
  tipagem ficou na fase-02. Mencionar sem duplicar a explicação.
- **Local — fronteira com tdd-workflow skill:** o átomo NÃO reproduz o ciclo RED/GREEN da
  skill cross-stack; `related_skills: [/tdd-workflow]` faz o link. Conteúdo aqui é
  Python/pytest-specific.

---

## Verificacao

### TDD (adaptado — test-after com gate próprio)

- [ ] **CHECK ESTRUTURAL:** comandos abaixo passam
- [ ] **GATE DE FIDELIDADE:** delegado à fase-06 (verifier refined batch, ≥80%)

### Checklist

- [ ] Corpo ≤200 linhas; 4 seções obrigatórias; zero `[A DEFINIR]`
- [ ] Frontmatter passa no validador (`bun test atoms-frontmatter-validator` verde)
- [ ] `sources:` com os 2 paths exatos (RF13)
- [ ] **Tradução ES→PT sem drift:** amostrar 3 claims oriundas do `python-testing/SKILL.md` e
  localizar a passagem original em espanhol de cada uma (spot check manual — o verifier da
  fase-06 repete formalmente)
- [ ] Smells de suítes de IA presentes COM o ângulo "como o revisor detecta" (grep por
  `revisor` ou `detecta` ≥1 na seção Anti-padrões)
- [ ] `dependency_overrides` e `ASGITransport` presentes (grep ≥1 cada — patterns âncora da fonte)
- [ ] Nenhuma claim "contestado" virou regra dura (spot check)
- [ ] `git status` sem `Infos/` staged (G1); INDEX.md intacto (G11)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, corpo ≤200 linhas, 4 seções, frontmatter válido
- Greps âncora (`dependency_overrides`, `ASGITransport`, smell/revisor) retornam ≥1
- `bun run harness:validate` verde (fechamento da Wave 2)

**Por humano:**
- Spot check de tradução ES→PT: 3/3 claims amostradas rastreiam ao SKILL.md; fidelidade formal
  fica com a fase-06

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
