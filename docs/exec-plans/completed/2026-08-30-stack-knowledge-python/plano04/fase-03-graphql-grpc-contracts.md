<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 03: Átomo `graphql-grpc-contracts.md` (T3, D6) + Flag de Revisão de Tier (RF16)

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** S ~1h
**Depende de:** Plano 03 completo (Wave 1 — independente das fases 01-02)
**Visual:** false

---

## O que esta fase entrega

Átomo T3 `knowledge/python/atoms/graphql-grpc-contracts.md` — GraphQL (Strawberry), gRPC/
Protobuf e tRPC destilados EXCLUSIVAMENTE da seção `## GraphQL e RPC` do report3 (D6), com os
conflitos abertos da fonte virando Critérios de decisão honestos. Ao final, a avaliação de
tier (manter T3 / propor T2) registrada no `plano04/MEMORY.md` (RF16).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/graphql-grpc-contracts.md` | Create | Átomo T3 destilado (G11: NÃO tocar INDEX.md) |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano04/MEMORY.md` | Modify | Seção "Avaliação de Tier — graphql-grpc-contracts (RF16)" preenchida |
| `TODO.md` (raiz) | Modify (condicional) | Excedente do cap 200, se houver (G5) |

---

## Implementacao

### Passo 1: Ler a fonte com a fronteira exata

Fonte única (ground truth — congelada, gitignored G1):

- `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report3.md`
  — **SOMENTE a seção `## GraphQL e RPC`** (começa ~L682; termina onde começa
  `## Auth de API, rate limiting, webhooks e operações longas`, ~L988) **+ as entradas de
  `## Conflitos abertos` que tratam de REST vs GraphQL e REST vs gRPC**.

Nota de formato da fonte: nesta seção as regras NÃO usam headers `###` — são parágrafos em
negrito no padrão `**Regra:** ... **Gatilho:** ... **Justificativa técnica:** ...` com blocos
BOM/RUIM. O rastreio do verifier é por passagem (não há IDs numéricos como nos compass).

Conteúdo esperado na fronteira (mapa para o extrator):
- Strawberry + `GraphQLRouter` + `context_getter` integrado ao dependency system (não parsear
  GraphQL manualmente)
- DataLoaders **no contexto do request** — NUNCA cache global compartilhado entre usuários
- Evolução ADITIVA de schema GraphQL sem versionar endpoint
- Paginação por conexão/cursor
- Auth de negócio FORA dos resolvers (o exemplo ACL/service da fonte: resolver checa, service
  não checa, REST/gRPC usa o service direto — furo de autorização)
- gRPC — quando um SEGUNDO protocolo se justifica; deadlines/cancelamento
- Protobuf — NUNCA reutilizar field numbers; reservar números/nomes de campos removidos
- tRPC — não usar em backend Python

**Átomo vizinho a LER antes (fronteira G15/G17):**
`knowledge/python/atoms/api-design-and-contracts.md` (Plano 03 fase-02) — dono de REST/HTTP,
versionamento REST, paginação REST, OpenAPI/SDKs. Este átomo NÃO repete nada disso.

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/graphql-grpc-contracts.md destilando EXCLUSIVAMENTE a fonte:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report3.md
   — SOMENTE a seção "## GraphQL e RPC" (da linha do header até o início de
   "## Auth de API, rate limiting, webhooks e operações longas") + as entradas de
   "## Conflitos abertos" sobre REST vs GraphQL e REST vs gRPC.

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.

EXCLUSIVIDADE (G15 — defeito de wave se violado): REST, versionamento de rota REST, paginação
REST, OpenAPI, SDKs e webhooks moram no átomo api-design-and-contracts. NADA disso entra aqui.
Este átomo cobre apenas GraphQL, gRPC/Protobuf e tRPC. Quando a comparação com REST for o
próprio conteúdo da fonte (REST vs GraphQL / REST vs gRPC), ela entra APENAS em Critérios de
decisão — nunca como re-ensino de REST.

CONFLITOS ABERTOS → CRITÉRIOS HONESTOS (G3): a fonte NÃO fixa threshold para "quando adotar
GraphQL" ou "quando adotar gRPC" — registre exatamente isso. Os Critérios de decisão citam as
condições qualitativas que a fonte dá (ex: segundo protocolo só quando justificado) e declaram
"a fonte não fixa limiar numérico — decisão contextual". NÃO invente números, percentuais ou
regras duras que a fonte não sustenta.

IDIOMA: PT-BR (D1). Fonte já em PT-BR — destilação direta. Termos de API em EN
(DataLoader, field number, deadline, resolver).

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção — candidatos fortes: DataLoader global entre usuários, auth só no
resolver, reutilizar field number, tRPC em backend Python) / ## Critérios de decisão (tabela)
/ ## Referências externas; zero [A DEFINIR].

REGRAS DE CONTEÚDO:
- Divergência de versões → normalizar para a mais recente citada (G4); versões FastAPI/
  Strawberry inline no corpo (D9)

Tudo que ficar de fora por causa do cap: liste ao final da sua resposta como
"EXCEDENTE PARA TODO.md".

AO FINAL, além do átomo, responda em 3-5 linhas: o conteúdo extraído sugere manter tier 3
(nicho) ou propor tier 2 (comum em apps de médio porte)? Justifique pela densidade e
aplicabilidade do material REAL extraído — não pelo tema em abstrato. (RF16 — vai para o
MEMORY; não altere o frontmatter por conta própria.)

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: graphql-grpc-contracts
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report3.md
tier: 3
triggers: [GraphQL, Strawberry, GraphQLRouter, resolver, DataLoader, N+1, schema evolution, cursor pagination, connection, gRPC, Protobuf, protobuf, field number, reserved, deadline, cancelamento, tRPC, RPC, contrato]
related_skills: [/api-design, /architecture]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 3: Check estrutural + grep de exclusividade

```powershell
# Estrutural padrão
(Get-Content knowledge/python/atoms/graphql-grpc-contracts.md | Measure-Object -Line).Lines
Select-String -Path knowledge/python/atoms/graphql-grpc-contracts.md -Pattern 'A DEFINIR'   # 0

# Exclusividade G15: OpenAPI/webhook/SDK não pertencem a este átomo
Select-String -Path knowledge/python/atoms/graphql-grpc-contracts.md -Pattern 'OpenAPI|webhook|operationId'   # esperado: 0
```

Validador de frontmatter (mesmo one-liner das fases anteriores). Ocorrência de "REST" é
permitida APENAS dentro de Critérios de decisão (comparativos da fonte) — conferir por leitura.

### Passo 4: Registrar RF16 no MEMORY

Preencher a seção "Avaliação de Tier — graphql-grpc-contracts (RF16)" do `plano04/MEMORY.md`
com o veredito do extrator + posição do executor da fase. NÃO mudar `tier:` no frontmatter —
se o dev decidir promover a T2, a mudança é frontmatter + INDEX (a fase-04 aplica), registrada
como DI no MEMORY.

### Passo 5: NÃO commitar isoladamente

Wave 1 = 1 commit (fases 01-03 + NOTICES). `bun run harness:validate` antes (G10).

---

## Gotchas

- **G15 do plano (espelhado, crítico):** no Plano 03 o api-design teve grep garantindo que
  GraphQL/gRPC/tRPC NÃO entraram lá; aqui o grep inverso garante que REST/OpenAPI/webhooks não
  entram cá. As duas metades do report3 não podem se sobrepor — a fase-05 re-checa.
- **G3 do plano:** os dois Conflitos abertos (REST vs GraphQL, REST vs gRPC) são o caso-teste
  do filtro "contestado nunca vira regra dura" — o átomo declara a ausência de limiar em vez
  de inventar um.
- **G25 do plano:** RF16 é flag barata — a avaliação usa o conteúdo já extraído; nenhuma
  re-extração, nenhuma mudança de frontmatter sem decisão do dev.
- **Local — formato da fonte:** regras em `**Regra:**` bold (sem IDs numéricos) — o verifier
  rastreia por passagem; o extrator não deve inventar IDs (diferente dos átomos compass).
- **Local:** paginação por cursor aparece nas DUAS metades do report3 — aqui entra apenas a
  variante conexão/cursor GraphQL; a paginação REST ficou no api-design (conferir o átomo
  vizinho na dúvida).
- **G1 do plano:** nada de `Infos/` no commit.

---

## Verificacao

### TDD (adaptado — conteúdo)

- [ ] **CHECK ESTRUTURAL:** cap ≤200, 4 seções, zero `[A DEFINIR]`, validador verde
- [ ] **GATE DE FIDELIDADE:** adiado para fase-05 (verifier batch T3 + check de exclusividade)

### Checklist

- [ ] Átomo existe, PT-BR, `sources:` único (report3), `tier: 3`
- [ ] Grep `OpenAPI|webhook|operationId` = 0; "REST" só em Critérios de decisão (G15)
- [ ] Anti-padrões incluem: DataLoader/cache global entre usuários; auth só no resolver;
      reutilização de field number Protobuf; tRPC em backend Python
- [ ] Critérios de decisão declaram a ausência de threshold (conflitos abertos honestos)
- [ ] Seção RF16 do `plano04/MEMORY.md` preenchida (manter T3 / propor T2 + justificativa)
- [ ] Nenhuma linha tocada em `INDEX.md` (G11)
- [ ] Excedentes (se houver) listados para o TODO.md
- [ ] `bun run harness:validate` verde (antes do commit da wave)

---

## Criterio de Aceite

**Por maquina:**
- `validateAtomFrontmatter` retorna `{valid: true, errors: []}`; corpo ≤200 linhas
- Grep de exclusividade (Passo 3) retorna zero

**Por humano (review da wave):**
- Critérios de decisão lidos em voz alta não contêm nenhum número/limiar que a fonte não deu
- Avaliação RF16 no MEMORY é acionável (dá para o dev decidir sem reler a fonte)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
