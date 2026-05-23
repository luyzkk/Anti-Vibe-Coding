---
title: "Subagent Contract — Especificacao Canonica"
status: Active
version: "2.0.0"
schema: "agents/_contract/v2.schema.json"
adr: "./ADR-0002-subagent-contract.md"
date: 2026-05-23
---

# Subagent Contract — Especificacao Canonica

**Status:** Active
**Version:** 2.0.0 (bump MAJOR — Wave 2, PRD DT-2)
**Schema:** `agents/_contract/v2.schema.json`
**Schema anterior (imutavel):** `agents/_contract/v1.schema.json`
**ADR:** [ADR-0002](./ADR-0002-subagent-contract.md)
**Migration Guide:** [subagent-contract-v2-migration.md](./subagent-contract-v2-migration.md)
**Date:** 2026-05-23

---

## 1. Visao Geral

Todo subagente deste plugin emite um envelope JSON padronizado ao concluir sua execucao. O contrato v2.0.0 define esse envelope: campos obrigatorios, lifecycle de status, campo `reasoning` livre, shape de `payload` por kind, e os novos campos obrigatorios `positive_observations` e `verdict`. O objetivo e permitir que qualquer orquestrador (skill consumidora) invoque qualquer subagente e parseia o output via um unico handler, sem regex especifico por auditor.

<!-- 2026-05-23 (Luiz/dev): bump MAJOR 1.0 -> 2.0.0 — Wave 2 PRD agent-skills-import. Campos positivos_observations + verdict obrigatorios. Ver DT-2, DT-7 do PRD. -->

Para a racional completa — alternativas rejeitadas, trade-offs de granularidade de status, obrigatoriedade de `reasoning` — consulte o [ADR-0002](./ADR-0002-subagent-contract.md).

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Shape do Contrato](#2-shape-do-contrato)
3. [Campos Obrigatorios](#3-campos-obrigatorios)
4. [Lifecycle vs Domain Status](#4-lifecycle-vs-domain-status)
5. [Exemplos por Kind](#5-exemplos-por-kind)
6. [Migration Guide — Portar Subagente em <30min](#6-migration-guide--portar-subagente-existente-em-30min)
   - [Status Mapping — regra canonica](#status-mapping--regra-canonica)
   - [human_readable — quando usar](#human_readable--quando-usar)
   - [Reasoning — exemplos contrastantes](#reasoning--exemplos-contrastantes)
   - [Checklist de migracao (<30min)](#checklist-de-migracao-target-30min)
7. [APIs do Validator](#7-apis-do-validator)
8. [Erros e Warnings do Validator](#8-erros-e-warnings-do-validator)
9. [FAQ](#9-faq)

---

## 2. Shape do Contrato

```json
{
  "contract_version": "2.0.0",
  "agent": "nome-do-agente",
  "kind": "audit | mutation | proposal | verification",
  "status": "complete | needs_retry | needs_human | blocked",
  "verdict": "approve | request_changes | block",
  "reasoning": "Texto livre. O agente descreve o que observou, inclusive coisas fora do payload esperado. Obrigatorio, minimo 20 chars.",
  "positive_observations": [
    "Observacao especifica citando arquivo, funcao ou padrao verificavel"
  ],
  "payload": {
    "// shape depende de kind — ver secao 5": "..."
  },
  "human_readable": "Markdown opcional para apresentacao ao operador",
  "metadata": {
    "run_id": "uuid v4",
    "duration_ms": 0,
    "model": "sonnet | opus | haiku"
  }
}
```

Campos obrigatorios: `contract_version`, `agent`, `kind`, `status`, `reasoning`, `payload`, `positive_observations`, `verdict`.
Campos opcionais: `human_readable`, `metadata` (recomendado incluir).

---

## 3. Campos Obrigatorios

| Campo | Tipo | Regra de Validacao | Exemplo |
|-------|------|-------------------|---------|
| `contract_version` | string | Literal `"2.0.0"` — qualquer outro valor rejeita com `INVALID_CONTRACT_VERSION` | `"2.0.0"` |
| `agent` | string | Nome do arquivo do agente sem extensao `.md` | `"security-auditor"` |
| `kind` | string | Um dos 4 valores: `audit`, `mutation`, `proposal`, `verification` | `"audit"` |
| `status` | string | Um dos 4 valores de lifecycle: `complete`, `needs_retry`, `needs_human`, `blocked` | `"complete"` |
| `verdict` | string | Um dos 3 valores: `approve`, `request_changes`, `block`. Ver regra de derivacao abaixo. | `"approve"` |
| `reasoning` | string | Minimo 20 chars. Warning se entre 20-49 chars. Prosa livre — o que foi observado, inclusive fora do schema. | `"Encontrei SQL concatenado em 3 arquivos legacy marcados deprecated."` |
| `positive_observations` | string[] | Array com `length >= 1`. Cada item deve citar arquivo, funcao ou padrao verificavel — tautologias sao rejeitadas pelo validator. | `["src/auth.ts:42 usa bcrypt saltRounds=12"]` |
| `payload` | object | Shape depende de `kind` — ver secao 5. Validador rejeita se shape nao casar. | `{ "domain_status": "secure", "issues": [] }` |

### Novos campos obrigatorios em v2.0.0

- `contract_version`: string literal `"2.0.0"` (BREAKING — antes `"1.0"`).
- `positive_observations`: `string[]` com `length >= 1`. Mesmo quando a auditoria nao encontra issues, o agente DEVE registrar pelo menos uma observacao positiva especifica (cita arquivo, funcao ou padrao verificavel — proibido tautologia). Ver `docs/design-docs/subagent-contract-v2-migration.md` para regex blacklist e exemplos.
- `verdict`: enum literal `"approve" | "request_changes" | "block"`. Regra de derivacao:
  - `approve`: nenhum issue critical/high, observacoes positivas validas.
  - `request_changes`: pelo menos 1 issue medium/high; recomendacoes acionaveis.
  - `block`: pelo menos 1 issue critical OU bloqueio de seguranca/contrato.

### Campos novos opcionais (recomendados para issues critical/high)

- `exploitation_scenario`: string descrevendo passo-a-passo como o issue pode ser explorado.
- `impact`: string descrevendo blast radius (dados, usuarios, sistemas afetados).
- `fix_with_example`: string com snippet de codigo correto (antes/depois quando aplicavel).

### Tabela canonica `severity_action_map`

| Severity | Acao obrigatoria | SLA sugerido | Bloqueia merge? |
|----------|------------------|--------------|------------------|
| critical | block + fix imediato | < 24h | sim |
| high | request_changes + fix antes do release | < 1 semana | sim |
| medium | request_changes + fix no proximo sprint | < 1 mes | nao |
| low | nota informativa, sem bloqueio | best-effort | nao |
| info | observacao positiva ou contexto | n/a | nao |

Ver tambem: `docs/references/severity-glossary.md` (se existir; caso contrario, esta tabela e canonica para o plugin).

---

## 4. Lifecycle vs Domain Status

O contrato usa dois eixos de status que coexistem e nao devem ser confundidos.

**`status` (campo top-level) = lifecycle.** Diz ao orquestrador o que fazer agora:
- `complete` — terminei, prossiga.
- `needs_retry` — falhei por algo transiente, tente de novo (1x max).
- `needs_human` — preciso de input humano antes de prosseguir.
- `blocked` — nao consigo continuar, reporte ao operador.

**`payload.domain_status` (dentro do payload, opcional por kind) = dominio.** Diz o que o agente encontrou no dominio dele:
- security-auditor: `vulnerabilities_found`, `secure`, `critical_issues`
- tdd-verifier: `compliant`, `non_compliant`, `partially_compliant`
- plan-verifier: `pass`, `fail`, `partial`

**Erro classico:** colocar `VULNERABILITIES_FOUND` em `status` top-level. Validator rejeita com `INVALID_LIFECYCLE_STATUS` e sugere mover para `payload.domain_status`.

### Exemplo Contrastante

CORRETO:

```json
{
  "status": "complete",
  "payload": {
    "domain_status": "vulnerabilities_found",
    "issues": [{ "severity": "critical", "file": "src/auth.ts", "line": 42 }]
  }
}
```

ERRADO:

```json
{
  "status": "VULNERABILITIES_FOUND",
  "payload": {
    "issues": [{ "severity": "critical", "file": "src/auth.ts", "line": 42 }]
  }
}
```

O campo `status` responde "o que o orquestrador faz agora?". O campo `payload.domain_status` responde "o que o agente encontrou?". Sao perguntas diferentes.

---

## 5. Exemplos por Kind

### 5.1 kind: audit (security-auditor)

Agentes de leitura/analise que nao modificam arquivos. Cobrem 10 dos 13 subagentes atuais.

```json
{
  "contract_version": "2.0.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "verdict": "block",
  "positive_observations": [
    "src/api/users/route.ts:88 valida input com zod antes de tocar DB",
    "src/middleware/rate-limit.ts:15 aplica rate-limiting em todos os endpoints publicos"
  ],
  "reasoning": "Encontrei MD5 usado para hash de senha em src/auth.ts:42 e SQL concatenado em src/api.ts:15. Tambem notei que .env.example tem placeholders mas .env real nao esta no .gitignore — fora do schema padrao mas relevante para o operador saber.",
  "payload": {
    "domain_status": "critical_issues",
    "issues": [
      {
        "severity": "critical",
        "file": "src/auth.ts",
        "line": 42,
        "description": "MD5 usado para hash de senha — trocar por bcrypt ou argon2",
        "exploitation_scenario": "Atacante com acesso ao DB extrai hashes MD5 e quebra senhas em minutos com rainbow tables.",
        "impact": "Comprometimento de credenciais de toda a base de usuarios.",
        "fix_with_example": "Substituir `md5(password)` por `await bcrypt.hash(password, 12)`."
      },
      {
        "severity": "high",
        "file": "src/api.ts",
        "line": 15,
        "description": "SQL concatenado manualmente — usar prepared statement"
      }
    ]
  },
  "human_readable": "## Security Audit\n\n2 issues encontrados (1 critical, 1 high). Acao imediata recomendada em src/auth.ts.",
  "metadata": {
    "run_id": "550e8400-e29b-41d4-a716-446655440000",
    "duration_ms": 1240,
    "model": "sonnet"
  }
}
```

### 5.2 kind: verification (plan-verifier)

Agentes que verificam criterios de aceite de uma task ou plano. Nao modificam arquivos; apenas observam e reportam conformidade.

```json
{
  "contract_version": "2.0.0",
  "agent": "plan-verifier",
  "kind": "verification",
  "status": "complete",
  "verdict": "approve",
  "positive_observations": [
    "Todos os 12 testes do modulo notifications passaram sem skips",
    "Lint retornou 0 warnings e 0 errors — codigo limpo"
  ],
  "reasoning": "Acceptance criteria executado integralmente e passou. Testes verdes (12/12). Lint limpo. Arquivos esperados criados conforme listagem da task. Nenhum desvio detectado entre o plano e o estado atual do repo.",
  "payload": {
    "domain_status": "pass",
    "checks": [
      {
        "name": "acceptance_met",
        "status": "pass",
        "detail": "Comando `bun run test -- --grep notifications` retornou 12 passed, 0 failed"
      },
      {
        "name": "tests_pass",
        "status": "pass",
        "detail": "12 testes passando, nenhum skipped"
      },
      {
        "name": "lint_pass",
        "status": "pass",
        "detail": "bun run lint retornou 0 warnings, 0 errors"
      },
      {
        "name": "files_match_plan",
        "status": "pass",
        "detail": "src/notifications.ts e src/notifications.test.ts criados conforme listado na task"
      }
    ]
  },
  "metadata": {
    "run_id": "7c9e1234-ab56-78cd-ef90-123456789abc",
    "duration_ms": 3200,
    "model": "sonnet"
  }
}
```

### 5.3 kind: proposal (design-explorer)

Agentes que exploram e propoe alternativas arquiteturais ou de design. Nao modificam arquivos; retornam opcoes para decisao humana.

```json
{
  "contract_version": "2.0.0",
  "agent": "design-explorer",
  "kind": "proposal",
  "status": "complete",
  "verdict": "approve",
  "positive_observations": [
    "Requisito de auditoria identificado no roadmap — opcoes avaliadas levam isso em conta"
  ],
  "reasoning": "Explorei 3 abordagens para o fluxo de notificacoes. A opcao B (event-sourced) tem trade-off claro de complexidade vs auditabilidade — vale destacar que o requisito de auditoria pode mudar em 6 meses conforme o roadmap. A opcao A e mais segura no horizonte curto.",
  "payload": {
    "proposal_summary": "Migrar fluxo de notificacoes para event-sourcing vs manter CRUD simples",
    "options": [
      {
        "label": "A — CRUD simples",
        "pros": "Implementacao rapida, equipe ja conhece o padrao, sem overhead de infra",
        "cons": "Sem trilha de auditoria nativa, refactor custoso se requisito mudar"
      },
      {
        "label": "B — Event-sourced",
        "pros": "Auditabilidade completa, replay de eventos, escalabilidade horizontal",
        "cons": "Complexidade de infra (broker), curva de aprendizado, over-engineering se escala nao vier"
      },
      {
        "label": "C — CRUD + audit log manual",
        "pros": "Auditabilidade sem complexidade de broker, progressivo",
        "cons": "Inconsistencias possiveis entre state e log se nao transacional"
      }
    ],
    "recommendation": "A com plano de evolucao para C se auditoria virar requisito formal"
  },
  "human_readable": "## Design Proposal: Notificacoes\n\n### Recomendacao\nOpcao A (CRUD simples) no curto prazo...",
  "metadata": {
    "run_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "duration_ms": 8500,
    "model": "opus"
  }
}
```

### 5.4 kind: mutation (documentation-writer — STUB em v1)

Agentes que modificam arquivos do repositorio. Em v1 o `payload.mutation` aceita qualquer shape — spec real do mutation payload (dry-run, diff preview, conflict resolution) esta planejada para v6.2.

```json
{
  "contract_version": "2.0.0",
  "agent": "documentation-writer",
  "kind": "mutation",
  "status": "complete",
  "verdict": "approve",
  "positive_observations": [
    "README.md secao Setup atualizada corretamente — bun install no lugar de npm install"
  ],
  "reasoning": "Atualizei README.md secao Setup com novo passo de bun install substituindo npm install. Tambem detectei que CONTRIBUTING.md menciona npm em 3 lugares — fora do escopo desta task mas vale registrar como TODO para o operador.",
  "payload": {
    "mutation": {
      "note": "STUB em v1 — payload.mutation aceita qualquer shape. Spec real em v6.2 (PRD Won't Have).",
      "files_modified": ["README.md"],
      "summary": "Substituiu npm install por bun install na secao Setup"
    }
  },
  "human_readable": "## Documentation Update\n\nREADME.md atualizado: secao Setup agora usa `bun install`.",
  "metadata": {
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "duration_ms": 4100,
    "model": "sonnet"
  }
}
```

---

## 6. Migration Guide — Portar Subagente Existente em <30min

Este guia assume que voce tem um arquivo `agents/{nome}.md` com prompt em markdown retornando output proprio (tabela, enum, texto livre). O objetivo e migrar para o contrato v1 sem quebrar o comportamento.

### Passo 1 (3min): Identificar o `kind` do seu agente

Responda uma pergunta:

- O agente le/analisa codigo sem modificar arquivos? → `audit`
- O agente verifica criterios de aceite de task ou plano? → `verification`
- O agente propoe alternativas arquiteturais para decisao humana? → `proposal`
- O agente modifica arquivos no repositorio? → `mutation`

Se o agente faz mais de uma coisa, divida em dois agentes — o contrato nao suporta kind duplo.

### Passo 2 (2min): Adicionar frontmatter `kind`

Abra `agents/{nome}.md` e adicione `kind` no frontmatter:

```diff
 ---
 agent: security-auditor
+kind: audit
 model-profile: quality
 ---
```

### Passo 3 (10min): Reescrever a secao "Formato de Saida" do prompt

Substitua qualquer instrucao de output atual pelo bloco abaixo, ajustando so o payload interno para o dominio do seu agente. Os outros campos sao identicos para todos os agentes.

**Antes (exemplo tipico):**

```markdown
## Output

Retorne uma tabela markdown com colunas: Arquivo | Severidade | Descricao
Ao final, declare: SECURE, VULNERABILITIES_FOUND ou CRITICAL_ISSUES.
```

**Depois (contrato v2.0.0):**

```markdown
## Output

Retorne um JSON valido seguindo o contrato v2.0.0 exatamente:

\`\`\`json
{
  "contract_version": "2.0.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "verdict": "approve | request_changes | block",
  "positive_observations": [
    "Cite pelo menos 1 arquivo, funcao ou padrao especifico verificado — sem tautologias"
  ],
  "reasoning": "Descreva em 1-3 frases o que voce observou, especialmente coisas fora dos campos estruturados abaixo.",
  "payload": {
    "domain_status": "secure | vulnerabilities_found | critical_issues",
    "issues": [
      { "severity": "critical | high | medium | low | info", "file": "caminho/arquivo.ts", "line": 0, "description": "descricao do problema" }
    ]
  },
  "metadata": {
    "run_id": "uuid-aqui",
    "duration_ms": 0,
    "model": "sonnet"
  }
}
\`\`\`

Importante:
- `status` (top-level) e sempre lifecycle: complete / needs_retry / needs_human / blocked.
- Resultado do dominio (secure, vulnerabilities_found etc) vai em `payload.domain_status`, nao em `status`.
- `reasoning` e obrigatorio, minimo 20 caracteres. Escreva o que voce notou fora do schema padrao.
- `positive_observations` e obrigatorio, minimo 1 item. Cite arquivo:linha ou padrao concreto.
- `verdict`: block se critical, request_changes se high/medium, approve se apenas low/info ou nenhum.
- Se nao encontrar issues, retorne `"issues": []`.
```

### Passo 4 (5min): Escrever um `reasoning` bom no exemplo do prompt

O `reasoning` nao deve re-narrar o que ja esta em `payload.issues[]`. Deve capturar observacoes que o schema nao comporta.

Bom:
> "Pattern de SQL concatenado aparece em 3 arquivos, todos em modulo legacy marcado deprecated — recomendaria substituicao em batch em vez de pontual."

Ruim:
> "Encontrei vulnerabilidades de SQL injection." (re-narra issues — informacao duplicada)

O campo existe para o agente dizer coisas que o enum nao cabe. Use-o assim.

### Passo 5 (5min): Criar fixture em `agents/__fixtures__/{nome}/`

Crie dois arquivos:

- `input.md` (ou `input.json`) — entrada minima representativa para o agente
- `expected-output.json` — output esperado seguindo o contrato v1

A fixture serve como contrato de regressao. Se o prompt mudar e o output quebrar, o teste pega.

### Passo 6 (5min): Validar output

Quando o CLI de simulacao estiver disponivel (RF-CH-02):

```bash
bun run agent:simulate {nome}
```

Ate la, valide manualmente:
- O JSON e sintaticamente valido (cole em `bun -e "JSON.parse(require('fs').readFileSync('output.json','utf8'))"`)
- `reasoning` tem >= 50 chars (evita warning `REASONING_LIKELY_WEAK`)
- `kind` e consistente com o shape de `payload` (ver secao 5)
- `status` e um dos 4 valores lifecycle (ver secao 4)

**Total estimado: ~30min.** Se o Passo 3 demorar mais de 10min, o problema provavelmente e que o prompt atual mistura logica de dominio com instrucao de formato — separe antes de reescrever.

<!-- 2026-05-14 (Luiz/dev): secao Migration Guide expandida — Plano 02 fase-04 -->

### Status Mapping — regra canonica

`status` (top-level) e **lifecycle** — o que o orquestrador faz agora.
`payload.domain_status` (opcional, dentro do payload) e **dominio** — o que o agente encontrou.
NUNCA misturar.

#### Para `kind: audit` (security-auditor e auditores de leitura)

| O que voce encontrou | `status` | `payload.domain_status` |
|----------------------|----------|-------------------------|
| Nada / tudo OK | `complete` | `clean` |
| Issues nao-criticas | `complete` | `issues_found` |
| Issues criticas | `complete` | `critical_issues` |
| Falha mecanica (parse/arquivo) | `needs_retry` | (omitir) |
| Erro irrecuperavel (arquivo nao existe) | `blocked` | (omitir) |

#### Para `kind: verification` (plan-verifier)

| Resultado dos checks | `status` | `payload.domain_status` |
|----------------------|----------|-------------------------|
| Todos pass | `complete` | `pass` |
| Pelo menos 1 warn, nenhum fail | `complete` | `warn` |
| Pelo menos 1 fail | `complete` | `fail` |
| Fail mecanico (schema invalido, parse error) | `needs_retry` | `fail` |
| Erro irrecuperavel | `blocked` | (omitir) |

#### Para `kind: proposal` (design-explorer)

| Situacao | `status` |
|----------|----------|
| Proposta entregue | `complete` |
| Input contraditorio / impossivel | `needs_human` |

`domain_status` nao se aplica a proposal — nao inclua. `needs_retry` e `blocked` nunca se aplicam a proposals.

#### Para `kind: mutation` (documentation-writer — STUB v1)

Cosmetico em v1 — payload aceita qualquer shape (PRD Won't Have). Semantica completa em v6.2.

---

### human_readable — quando usar

`human_readable` e markdown opcional para apresentacao ao operador. O orquestrador deve poder ignorar este campo e ainda funcionar.

**Use quando:**
- Output tem riqueza visual que JSON nao captura bem (ex: design-explorer com 8 secoes de analise).
- Operador humano historicamente espera output em formato familiar — preservar UX evita atrito na migracao.

**NAO use para:**
- Repetir o que `payload` ja estrutura (orquestrador nao deve precisar parsear markdown para extrair info).
- Mensagens curtas (1 linha) — coloque em `reasoning`.

**Regra de ouro:** se voce removesse `human_readable`, o orquestrador funcionaria igual? Se sim, ok. Se nao, voce esta usando `human_readable` para esconder logica — mova para `payload`.

---

### Reasoning — exemplos contrastantes

`reasoning` e escape hatch: o agente diz o que viu fora do schema. Obrigatorio, min 20 chars. Warning se <50.

**Bom (>50 chars, agrega info nova)**

> "Encontrei MD5 usado para hash de senha em src/auth.ts:5 (algoritmo quebrado, criticamente inseguro) e SQL concatenado manualmente em src/api.ts:3 (injection). Ambos sao padroes claros documentados, sem nada fora do schema esperado."

> "Verifiquei 4 checks contra o plano exemplo. 3 passaram, 1 emitiu warn em fixture_matrix — o plano nao especifica matriz de fixtures por kind. Nao bloqueia merge, mas o Plano 02 fase-03 vai criar essas fixtures e o gap pode confundir o autor do Plano 03."

> "A constraint 'sem novas deps' do input conflita com a Recommendation natural (lib de cache wrapper). Sinalizado como tradeoff #2. Tambem notei que o problema admite serverless KV que o input nao mencionou — incluida como Alternative B para o operador considerar se a restricao de deps for relaxada."

**Fraco (passa min mas dispara warning)**

> "Verifiquei o plano e esta OK." — 28 chars, nao diz nada alem do `domain_status: pass`.

> "Recomendo Redis com TTL adaptativo." — 36 chars, copia o `title` do payload.

> "Audit completo." — 15 chars, rejeitado (`REASONING_TOO_SHORT`).

**Regra heuristica:** se `reasoning` poderia ser substituido por leitura direta de `payload.*`, esta fraco. Reasoning deve dizer algo que o JSON nao expressa.

---

### Checklist de migracao (target <30min)

1. **Reler** o `agents/{nome}.md` atual. Identificar: format atual (markdown/JSON), enums de dominio, `kind` correto.
2. **Decidir** `kind`: leitura/analise = `audit`; criterios de aceite = `verification`; proposta para decisao humana = `proposal`; modifica arquivos = `mutation`. Se o agente faz dois, divida antes de migrar.
3. **Aplicar tabela Status Mapping** (acima) para o kind escolhido. Substituir enum antigo por `status` lifecycle (top-level) + `payload.domain_status` opcional.
4. **Editar prompt**: adicionar bloco "Output" com JSON template exato (Passo 3 acima), regra "status e lifecycle", reasoning guideline com exemplo bom/fraco.
5. **Criar fixture** em `agents/__fixtures__/{nome}/expected-output.json` com envelope v1 completo.
6. **Validar**: `bun test -- --grep "{nome}"` verde = pronto. Ate CI estar disponivel, checar JSON sintaticamente e reasoning >= 50 chars.

**Padroes a evitar** (descobertos nos 3 pilotos):

- Code fences ao redor do JSON top-level — `\`\`\`json {...}\`\`\`` confunde parser. Instruir explicitamente "sem code fences".
- Status de dominio no top-level — `"status": "VULNERABILITIES_FOUND"` em vez de `"status": "complete"` + `"payload.domain_status": "critical_issues"`. Validator rejeita com `INVALID_LIFECYCLE_STATUS`.
- Reasoning copiando summary — indica que o prompt nao ensinou o campo. Adicionar exemplo contrastante no prompt.
- Secoes markdown ricas virando payload bagunçado — manter `human_readable` para apresentacao, estruturar campos chave em `payload.proposal` (proposal) ou `payload.issues` (audit).

---

## 7. APIs do Validator

O modulo `skills/lib/subagent-contract.ts` exporta duas funcoes com propositos distintos:

- **`parseContract(rawString): ValidationResult`** — usa em testes e validators. Retorna `{ valid, contract, errors, warnings }`. Entrada: string bruta do output do agente. Nao tem efeito colateral.
- **`parseAndDispatch(rawString, handlers): Promise<DispatchResult>`** — usa em orquestradores (skills que consomem subagentes). Retorna `{ validation, dispatched, handlerKind }`. Chama o handler do `kind` correspondente em `handlers`, permitindo roteamento por kind sem if-chain. **Nao use `parseContract` em orquestradores** — o dispatch e o ponto certo de consumo.

---

## 8. Erros e Warnings do Validator

| Codigo | Tipo | Quando Dispara | Como Corrigir |
|--------|------|---------------|---------------|
| `INVALID_CONTRACT_VERSION` | Error | `contract_version` nao e `"2.0.0"` | Usar o literal `"2.0.0"` — v1.0 nao e mais aceito. Ver migration guide. |
| `MISSING_REQUIRED_FIELD` | Error | Campo obrigatorio ausente (`contract_version`, `agent`, `kind`, `status`, `reasoning`, `payload`) | Adicionar o campo faltante (ver secao 3) |
| `INVALID_LIFECYCLE_STATUS` | Error | `status` top-level fora dos 4 valores permitidos | Usar `complete`, `needs_retry`, `needs_human` ou `blocked`. Enums de dominio (ex: `VULNERABILITIES_FOUND`) vao em `payload.domain_status` |
| `REASONING_TOO_SHORT` | Error | `reasoning` ausente, vazio ou com menos de 20 chars | Escrever 1-3 frases descrevendo o que foi observado, inclusive fora do schema esperado |
| `REASONING_LIKELY_WEAK` | Warning | `reasoning` entre 20 e 49 chars | Nao bloqueia, mas indica prompt subotimo — ajustar a instrucao de `reasoning` no prompt do agente |
| `INVALID_KIND` | Error | `kind` fora dos 4 valores: `audit`, `mutation`, `proposal`, `verification` | Escolher o kind correto (ver Passo 1 do migration guide) |
| `PAYLOAD_SCHEMA_MISMATCH` | Error | Shape de `payload` nao corresponde ao `kind` declarado | Ver secao 5 para o exemplo completo do kind correspondente |
| `SECRET_PATTERN_DETECTED` | Error | Strings como `API_KEY=`, `SECRET=`, `PASSWORD=` detectadas em `payload` ou `reasoning` | Remover secrets crus do output; usar referencias redacted ou mascaradas |
| `INVALID_JSON` | Error | `JSON.parse` falhou no output do agente | Validator faz retry mecanico 1x com prompt ajustado. Se persistir, verificar se o agente esta emitindo code fences em volta do JSON |

**Nota sobre `INVALID_JSON`:** Retry mecanico e separado do retry semantico (`needs_retry`). O primeiro corrige falha de formatacao do LLM. O segundo sinaliza falha logica no dominio do agente.

---

## 9. FAQ

**Por que `reasoning` e obrigatorio e nao opcional?**

Campos opcionais viram sempre vazios. A obrigatoriedade tecnica forca o agente a observar e narrar — capturando informacoes que o schema nao comporta. O campo e o escape hatch: quando o agente ve algo fora das 8 categorias do `payload`, tem onde colocar. Se opcional, essa informacao seria descartada.

**Posso usar qualquer valor em `payload.domain_status`?**

Sim. O `domain_status` e livre por design — cada agente define seu enum de dominio no proprio prompt. O contrato padroniza o envelope (`status` lifecycle, `reasoning`, estrutura de `payload`), nao o vocabulario interno de cada dominio. O validator checa apenas que `status` top-level seja lifecycle valido.

**Como o orquestrador sabe que o agente terminou vs. precisou de ajuda humana?**

Via `status` top-level. `complete` significa terminou, prossiga. `needs_human` significa empilhe pergunta ao operador antes de consolidar. O orquestrador nao faz parse de `payload` para inferir isso — nao mais.

**O que fazer se o agente claramente falhou mas nao sabe se e `needs_retry` ou `blocked`?**

`needs_retry` e para falhas transientes (timeout, parse error, dado temporariamente indisponivel). `blocked` e para impasses semanticos (faltam informacoes que o agente nao pode obter sozinho, task contraditoria, escopo impossivel). Em caso de duvida, use `needs_human` — o operador decide se tenta de novo ou aborta.

**Como valido meu agente contra o schema v2.0.0?**

```bash
bun run agent:simulate {nome}
```

Ate o CLI estar disponivel (RF-CH-02), valide manualmente com:

```bash
bun -e "
const Ajv = require('ajv');
const schema = require('./agents/_contract/v2.schema.json');
const output = require('./agents/__fixtures__/{nome}/expected-output.json');
const ajv = new Ajv();
const valid = ajv.validate(schema, output);
console.log(valid ? 'OK' : ajv.errors);
"
```

Para validar contra o schema v1 legado (imutavel):

```bash
bun -e "
const Ajv = require('ajv');
const schema = require('./agents/_contract/v1.schema.json');
const output = require('./agents/__fixtures__/{nome}/expected-output.json');
const ajv = new Ajv();
const valid = ajv.validate(schema, output);
console.log(valid ? 'OK (v1 legado)' : ajv.errors);
"
```

---

## Anti-Degeneration Rules (secao obrigatoria em cada agente)

<!-- 2026-05-23 (Luiz/dev): secao adicionada em v2.0.0 — Wave 2 PRD CA-10. -->

Todo agente DEVE declarar pelo menos 4 regras anti-degeneration no seu `.md`:

- >= 2 regras GENERICAS aplicaveis a todo agente (sugestoes baseline):
  - "Never suggest disabling type checks (`@ts-ignore`, `as any`) as a fix."
  - "Never suggest disabling lint (`eslint-disable`) as the primary fix."
  - "Never suggest `test.skip` / `xit` para silenciar testes."
  - "Never suggest desabilitar validator, gate, hook ou guardrail como solucao."
- >= 2 regras ESPECIFICAS do dominio do agente (ex: security-auditor tem regras de seguranca).

Total minimo agregado: 4 regras x 13 agentes = 52 regras (CA-10 do PRD).

---

## Composition (secao obrigatoria em cada agente)

<!-- 2026-05-23 (Luiz/dev): secao adicionada em v2.0.0 — Wave 2 PRD. -->

Todo agente DEVE declarar:

- **Invoke directly when:** condicoes em que o usuario invoca o agente sozinho.
- **Invoke via:** lista de skills/slash-commands que orquestram este agente (`/security`, `/verify-work`, etc).
- **Do not invoke from:** contextos onde o agente NAO deve ser chamado (ex: nao chamar `security-auditor` dentro de `code-smell-detector`).
