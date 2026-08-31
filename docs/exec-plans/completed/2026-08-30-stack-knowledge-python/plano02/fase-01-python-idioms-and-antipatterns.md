<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 01: Átomo `python-idioms-and-antipatterns.md`

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 1.5h
**Depende de:** Plano 01 completo (independente das fases 02-05 — Wave 1, paralelizável)
**Visual:** false

---

## O que esta fase entrega

Átomo T1 `knowledge/python/atoms/python-idioms-and-antipatterns.md` — idiomas e anti-padrões
Python destilados da fonte compass primária (PT-BR) + skill ECC `python-patterns` (ES,
traduzida na destilação), ≤200 linhas, 4 seções obrigatórias, frontmatter completo.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/python-idioms-and-antipatterns.md` | Create | Átomo T1 destilado (único arquivo desta fase — G11: NÃO tocar INDEX.md) |

---

## Implementacao

### Passo 1: Ler as fontes e o formato de referência

Fontes desta fase (ground truth — congeladas, gitignored G1):

- **PRIMÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-90d75ffa-4fc1-50b4-bf6f-296a4fa55734_text_markdown.md`
  — "Padrões Idiomáticos e Anti-Padrões", 15 seções
- **SECUNDÁRIA:** `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-patterns\SKILL.md`
  — origem "ECC", em espanhol; source normal por decisão D5, traduzir na destilação (G6)

Formato de referência (estrutura, não conteúdo):

- `F:\Projetos\Anti-Vibe-Coding\knowledge\rails\atoms\active-record-fundamentals.md` (schema canônico)
- `F:\Projetos\Anti-Vibe-Coding\knowledge\python\atoms\async-and-concurrency.md` (piloto — calibrado no Plano 01)

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

Preencher os blocos `{...}` e enviar. A REGRA DE FIDELIDADE abaixo está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — ao montar o
prompt, copiar dali (ou daqui), NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/python-idioms-and-antipatterns.md destilando EXCLUSIVAMENTE as fontes:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-90d75ffa-4fc1-50b4-bf6f-296a4fa55734_text_markdown.md (PRIMÁRIA)
2. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-patterns\SKILL.md (SECUNDÁRIA, em espanhol)

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
Se a fonte não documenta um número/overhead/versão, descreva qualitativamente como a fonte faz
— não estime números próprios.

IDIOMA: PT-BR (D1). A fonte 2 está em ESPANHOL: traduza na destilação sem adicionar conteúdo —
cada claim traduzida deve permanecer rastreável à passagem original em espanhol.

ESTRUTURA (copiar do átomo de referência knowledge/rails/atoms/active-record-fundamentals.md
e do piloto knowledge/python/atoms/async-and-concurrency.md):
- Frontmatter EXATO (ver abaixo)
- Corpo ≤200 linhas (hard cap — verifier rejeita acima disso)
- Seções obrigatórias: ## Quando consultar / ## Padrões sênior (Problema → Padrão → Quando
  usar → Quando NÃO usar) / ## Anti-padrões (Sintoma → Correção) / ## Critérios de decisão
  (tabela Cenário → Escolha) / ## Referências externas
- Zero placeholders [A DEFINIR]

SEÇÕES DA FONTE PRIMÁRIA A COBRIR (15 seções — priorize por impacto se o cap apertar):
- EAFP vs LBYL
- Defaults mutáveis em argumentos de função
- Protocol vs ABC
- frozen/imutabilidade (dataclasses)
- assert sob -O (por que assert não é validação de produção)
- Anti-padrões importados de Java/C# (getters/setters, hierarquias profundas, etc. — como a fonte lista)
- Metaclasses vs class decorators
- PEP 695 / PEP 702 / PEP 696
- Contra Result-tuple estilo Go

REGRAS DE CONTEÚDO:
- Claims marcadas "contestado" na fonte NUNCA viram regra dura — viram nota em Critérios de
  decisão ("a fonte marca como contestado") ou são omitidas (G3)
- Divergência de versões entre fontes → normalizar para a mais recente citada (G4)
- Excedente que não coube no cap 200: NÃO escreva no átomo; liste ao final da sua resposta
  como "EXCEDENTE PARA TODO.md" (G5)

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: python-idioms-and-antipatterns
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-90d75ffa-4fc1-50b4-bf6f-296a4fa55734_text_markdown.md
  - Infos/knowledge/Python/python-patterns/SKILL.md
tier: 1
triggers: [EAFP, LBYL, default mutável, mutable default, dataclass, frozen, imutabilidade, Protocol, ABC, duck typing, metaclass, class decorator, assert, PEP 695, PEP 702, PEP 696, idiomático, anti-padrão, Result tuple]
related_skills: [/design-patterns, /architecture]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 3: Check estrutural local (antes de aceitar o output)

Rodar os comandos da seção Verificação. Rework imediato se falhar — o verifier da fase-06 só
audita fidelidade ao source; estrutura é responsabilidade desta fase.

### Passo 4: Registrar excedente (se houver)

Se o extrator listou "EXCEDENTE PARA TODO.md", adicionar entrada no `TODO.md` da raiz:
`- [ ] [knowledge-python] Excedente cap-200 de python-idioms-and-antipatterns: {resumo}` (G5).

---

## Gotchas

- **G2 do plano:** anti-drift clause VERBATIM no prompt — o plan-verifier da wave rejeita
  prompt sem a cláusula literal.
- **G6 do plano:** `python-patterns/SKILL.md` está em espanhol. Tradução ≠ licença para
  enriquecer: se a versão PT-BR de uma claim não mapear numa passagem ES concreta, é drift.
- **G3 do plano:** a fonte compass usa campo de confiança consenso/contestado — filtrar antes
  de prescrever.
- **G11 do plano:** NÃO tocar `knowledge/python/INDEX.md` — consolidação é Plano 04 fase-04.
- **Local — PEP 695/702/696 são 3.12/3.13+:** se a fonte amarrar um padrão a versão específica,
  preservar a marcação inline (ex: "PEP 695 — sintaxe `type` desde 3.12"); o átomo como um
  todo permanece `python_versions: ['>=3.11']` porque a maioria dos idiomas serve 3.11.

---

## Verificacao

### TDD (adaptado — test-after com gate próprio)

- [ ] **CHECK ESTRUTURAL (equivale ao RED/GREEN):** comandos abaixo passam
- [ ] **GATE DE FIDELIDADE:** delegado à fase-06 (verifier refined batch, ≥80%)

### Checklist

- [ ] Corpo ≤200 linhas: `wc -l knowledge/python/atoms/python-idioms-and-antipatterns.md` ≤ ~215 total (frontmatter incluso; corpo pós-frontmatter ≤200)
- [ ] 4 seções obrigatórias presentes: `grep -c '^## ' knowledge/python/atoms/python-idioms-and-antipatterns.md` ≥ 5 e grep individual por `Quando consultar`, `Padrões sênior`, `Anti-padrões`, `Critérios de decisão`
- [ ] Zero placeholders: `grep -c 'A DEFINIR' knowledge/python/atoms/python-idioms-and-antipatterns.md` = 0
- [ ] Frontmatter válido: teste do validador verde (`bun test atoms-frontmatter-validator`) e campo `python_versions` em formato array
- [ ] `sources:` lista os 2 paths `Infos/knowledge/Python/...` exatos (RF13)
- [ ] **Tradução ES→PT sem drift:** amostrar 3 claims oriundas do SKILL.md ES e localizar a passagem original em espanhol de cada uma (spot check manual — o verifier da fase-06 repete formalmente)
- [ ] Nenhuma claim "contestado" da fonte virou regra dura (spot check nas seções técnicas)
- [ ] `git status` NÃO mostra `Infos/` staged (G1)
- [ ] INDEX.md intacto: `git diff --stat knowledge/python/INDEX.md` vazio (G11)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe em `knowledge/python/atoms/python-idioms-and-antipatterns.md`, corpo ≤200
  linhas, 4 seções obrigatórias, frontmatter passa no validador com `python_versions: ['>=3.11']`
- `bun run harness:validate` verde (rodado no fechamento da Wave 1, antes do commit)

**Por humano:**
- Spot check de tradução ES→PT: 3/3 claims amostradas rastreiam a passagens do SKILL.md
- Aprovação formal de fidelidade fica com a fase-06 (verifier ≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
