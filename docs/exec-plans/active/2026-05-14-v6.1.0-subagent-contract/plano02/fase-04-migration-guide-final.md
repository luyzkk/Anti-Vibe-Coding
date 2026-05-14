<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Migration guide final (destilado dos 3 pilotos)

**Plano:** 02 — Migracao Piloto (3 padroes)
**Sizing:** 1h
**Depende de:** fase-03 (3 fixtures verdes — provam contrato funciona em largura)
**Visual:** false

---

## O que esta fase entrega

Atualizacao de `docs/design-docs/subagent-contract-v1.md` (arquivo criado em Plano 01 fase-02) com a **secao "Migration Guide para Autores"** destilada das licoes reais dos 3 pilotos. Foco: ser **acionavel em <30min** (RF-SH-04). Plano 03 vai usar este guide para escalar a migracao para os 10 auditores restantes mecanicamente.

NAO e arquivo novo. NAO duplica spec. Destila padrao.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/subagent-contract-v1.md` | Modify | Adicionar/refinar secao "Migration Guide para Autores" com regra mapping, regra human_readable, exemplos reasoning bom/fraco, checklist 5 passos |

---

## Implementacao

### Passo 1: Reler `subagent-contract-v1.md` atual (criado em Plano 01 fase-02)

Plano 01 fase-02 ja criou stub do migration guide. Confirmar:
- Qual conteudo ja existe?
- Onde a secao "Migration Guide" se encaixa (apos shape do contrato, antes de exemplos por kind)?

NAO duplicar. Refinar.

### Passo 2: Adicionar/atualizar secao "Status Mapping — regra canonica"

Conteudo aproximado (~250 palavras, copy-paste-ready):

```markdown
## Status Mapping — regra canonica

`status` (top-level) e **lifecycle** — o que o orquestrador faz agora.
`payload.domain_status` (opcional, dentro do payload) e **dominio** — o que o agente encontrou.
NUNCA misturar.

### Para `kind: audit` (security, react, solid, code-smell, tdd, api, database, infra)

| Domain (o que voce encontrou)              | `status`            | `payload.domain_status` |
|--------------------------------------------|---------------------|-------------------------|
| Nada / OK                                  | `complete`          | `clean`                 |
| Issues nao-criticas                        | `complete`          | `issues_found`          |
| Issues criticas                            | `complete`          | `critical`              |
| Falha mecanica (parser/arquivo)            | `needs_retry`       | (omitir)                |
| Erro irrecuperavel (arquivo nao existe)    | `blocked`           | (omitir)                |

### Para `kind: verification` (plan-verifier, plan-executor)

| Resultado dos checks                         | `status`            | `payload.domain_status` |
|----------------------------------------------|---------------------|-------------------------|
| Todos pass                                   | `complete`          | `pass`                  |
| Pelo menos 1 warn, nenhum fail               | `complete`          | `warn`                  |
| Pelo menos 1 fail medio (gap, ambiguidade)   | `complete`          | `fail`                  |
| Fail mecanico (schema inv, parse error)      | `needs_retry`       | `fail`                  |
| Erro irrecuperavel                           | `blocked`           | (omitir)                |

### Para `kind: proposal` (design-explorer)

| Situacao                                      | `status`            |
|-----------------------------------------------|---------------------|
| Proposta entregue                             | `complete` (~100%)  |
| Input contradicente/impossivel                | `needs_human`       |
| `needs_retry` / `blocked` NUNCA se aplicam.   |                     |

`domain_status` nao se aplica a proposal — nao inclua.

### Para `kind: mutation` (documentation-writer, e futuros)

Cosmetico em v1 — payload e stub (PRD §Wont Have). v6.2 define semantica completa.
```

### Passo 3: Adicionar/atualizar secao "human_readable — quando usar"

```markdown
## human_readable — quando usar (e quando NAO usar)

`human_readable` e markdown opcional para apresentacao ao operador. Nao toque a logica de orquestracao — orquestrador deve poder ignorar este campo e ainda funcionar.

**Use quando:**
- Output tem riqueza visual que estrutura JSON nao captura bem (ex: design-explorer 8 secoes).
- Operador humano historicamente espera ver o output em formato familiar — preservar UX evita atrito durante a migracao.

**NAO use para:**
- Repetir o que `payload` ja tem (orquestrador nao deve precisar parsear markdown para extrair info).
- Mensagens curtas (1 linha) — coloque em `reasoning`.

**Regra de ouro:** se voce removesse `human_readable`, o orquestrador funcionaria igual? Se sim, ok. Se nao, voce esta usando `human_readable` para esconder logica — mova para `payload`.
```

### Passo 4: Adicionar secao "Reasoning — exemplos bom vs fraco"

```markdown
## Reasoning — exemplos contrastantes

`reasoning` e escape hatch: "vi algo que seu schema nao previu". Obrigatorio, min 20 chars. Warning se <50 (sinal de prompt subotimo).

### Bom (>50, agrega info nova)

> "A constraint 'sem novas deps' do input conflita com a Recommendation natural (lib X). Tambem notei que o problema admite serverless KV — incluida como Alternative B."

> "Verifiquei 4 checks. 3 OK, 1 warn em fixture_matrix — Plano 03 vai precisar dessa matriz, vale antecipar."

> "Encontrei 3 issues SQL injection em endpoints autenticados (`payload.issues[]`). Tambem detectei pattern de migracoes que nao usam IF NOT EXISTS — fora do escopo da auditoria, mas vale flagging."

### Fraco (passa min mas warning)

> "Verifiquei o plano e esta OK." (15 chars — rejeitado)
> "Recomendo Redis com TTL adaptativo." (37 chars, copia summary — passa min, warning. Nao agrega.)
> "Audit completo." (15 chars — rejeitado)

### Regra heuristica

Se seu `reasoning` poderia ser substituido por leitura de `payload.*` ou `human_readable`, esta fraco. Reasoning deve dizer algo que o JSON nao expressa.
```

### Passo 5: Adicionar checklist "Migration em <30min"

```markdown
## Checklist de migracao (target <30min por agente)

1. **Reler** o `agents/{nome}.md` atual. Identificar: output format atual (markdown/JSON), enums de dominio usados, `kind` correto (audit/verification/proposal/mutation).
2. **Decidir** `kind`. 80% dos auditores read-only sao `kind: audit`. Verifications: plan-verifier, plan-executor. Proposals: design-explorer. Mutation: documentation-writer (stub v1).
3. **Aplicar tabela de Status Mapping** acima para o kind escolhido. Substituir o enum de dominio antigo (ex: `SECURE/VULNERABILITIES_FOUND`) por:
   - `status` top-level (lifecycle, das 4 opcoes)
   - `payload.domain_status` opcional (preserva info de dominio para consumidor)
4. **Editar prompt** injetando 4 blocos (template em fase-01/fase-02 deste plano):
   - Bloco "Kind"
   - Bloco "Status Mapping" (copia da tabela)
   - Bloco "Reasoning guideline" (com exemplo bom/fraco)
   - Bloco "Output template" (JSON exato, sem code fences)
5. **Criar fixture** em `agents/__fixtures__/{nome}/`:
   - `input.json` minimo (o que o agente recebe)
   - `expected-output.json` (envelope v1 completo)
6. **Rodar** `bun test agents:contract -- --grep "{nome}"`. Verde = pronto.

### Padroes a evitar (descobertos nos 3 pilotos)

- **Code fences ao redor do JSON top-level** — `\`\`\`json {...} \`\`\`` confunde parser. Instruir explicitamente "no fences".
- **Status de dominio no top-level** — `status: "VULNERABILITIES_FOUND"` em vez de `status: "complete"` + `payload.domain_status: "vulnerabilities_found"`. Validador rejeita com `INVALID_LIFECYCLE_STATUS`.
- **Reasoning copiando summary** — sinal de prompt nao ensinou bem o que reasoning faz. Adicionar exemplo contrastante.
- **8 secoes markdown viraram payload bagunçado** — manter `human_readable` para apresentacao, estruturar campos chave em `payload.proposal`.
```

### Passo 6: Verificar tamanho final

Migration guide inteiro (do passo 2 ao passo 5) deve ficar em **2 paginas** de leitura. Se passar, cortar exemplos redundantes ou compactar tabelas.

Contar paginas mentalmente:
- Passo 2 (mapping): ~1 pagina
- Passo 3 (human_readable): ~0.3 pagina
- Passo 4 (reasoning): ~0.4 pagina
- Passo 5 (checklist): ~0.5 pagina
- Total alvo: ~2 paginas. OK.

Se ficou >2 paginas, foco em cortar:
- Exemplos repetidos
- Justificativas longas (preserve "o que" + "por que" curto, descarte "alternativa rejeitada" que ja esta no ADR)

### Passo 7: Atualizar TOC do `subagent-contract-v1.md` se houver

Se o doc canonico tem indice no topo, adicionar as novas subsections:
- Status Mapping — regra canonica
- human_readable — quando usar
- Reasoning — exemplos contrastantes
- Checklist de migracao (<30min)

### Passo 8: Re-ler doc inteiro

CLAUDE.md §Integridade. Confirmar que:
- Stub original do Plano 01 fase-02 foi refinado, nao duplicado
- TOC reflete realidade
- Exemplos sao consistentes com fixtures de fase-03

---

## Gotchas

- **G7 do plano (migration guide <30min):** Critico. Resistir tentacao de "ser completo". Foco: minimo viavel para autor portar 1 agente sem ler outra coisa.
- **G-P02-05 (destilar vs concatenar):** Cada passo (2-5) tem foco unico — Status Mapping, human_readable, Reasoning, Checklist. NAO misturar. NAO copiar specs do PRD aqui (PRD e canonico para "por que"; guide e canonico para "como").
- **G8 do plano (Comment Provenance):** Snippets de exemplo dentro do guide podem ter comentarios inline — usar formato `// 2026-05-14 (Luiz/dev): X — Y`. Mas o guide em si e markdown, nao codigo runtime, entao nao precisa de comment provenance em prosa.
- **Local (consistencia com fixtures):** Exemplos no guide devem casar com fixtures de fase-03 (mesmas frases de reasoning, mesmo title de proposal). Se divergir, escolha uma fonte de verdade — fixture vence (e o oraculo da CI).
- **Local (Plano 05 fase-05 vai precisar deste guide):** CHANGELOG v6.1.0 vai linkar para este doc. Manter o anchor `#migration-guide` ou similar previsivel.

---

## Verificacao

### TDD

Nao ha codigo runtime aqui. Verificacao e estrutural.

- [ ] **RED:** Antes da edicao, autor hipotetico tentando migrar um agente le o stub atual do Plano 01 fase-02 — falha (informacao insuficiente).
- [ ] **GREEN:** Apos edicao, autor hipotetico segue checklist (passo 5) e completa migracao mental de 1 agente em <30min sem precisar perguntar nada.

### Checklist

- [ ] `docs/design-docs/subagent-contract-v1.md` lido completo ANTES da edicao
- [ ] Secao "Status Mapping — regra canonica" presente com tabelas para audit, verification, proposal, mutation
- [ ] Secao "human_readable — quando usar" presente com regra de ouro
- [ ] Secao "Reasoning — exemplos contrastantes" presente com >=3 exemplos bom e >=3 fraco
- [ ] Secao "Checklist de migracao <30min" presente com 6 passos numerados + lista de padroes a evitar
- [ ] Total <= 2 paginas de leitura (estimativa, sem ferramentar)
- [ ] TOC atualizado (se aplicavel)
- [ ] Exemplos consistentes com fixtures de fase-03 (mesmos titles, mesmas frases de reasoning)
- [ ] `docs/design-docs/subagent-contract-v1.md` re-lido APOS edicao
- [ ] Anotacao em MEMORY.md secao "Notas para Planos Seguintes" sobre onde achar a regra mapping para Plano 03
- [ ] `bun run lint` limpo (markdown lint se houver)
- [ ] `bun run harness:validate` ainda passa (CLAUDE.md §Validation)

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` retorna OK (estrutura de `docs/` integra)
- `bun run compound:check` retorna OK (sem lessons quebradas pela edicao)

**Por humano:**
- Revisor (que NAO leu o PRD nem os planos) consegue, lendo apenas este guide, portar 1 agente hipotetico mental em <30min: escolhe kind, aplica tabela mapping, escreve template prompt, cria fixture esqueleto.
- Se algum dos 4 passos (kind / mapping / prompt / fixture) precisar consultar outro arquivo, o guide falhou. Revisar pacote ate ser auto-suficiente.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
