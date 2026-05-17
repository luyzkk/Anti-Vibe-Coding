<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
Esta fase também cumpre RF8/D12: migração de nodejs-core/rules/primordials.md para dentro do átomo.
-->

# Fase 02: Átomo thin `security-stack-specific.md` (+ RF8 primordials migrados)

**Plano:** 05 — Atom Batch B
**Sizing:** 1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo **thin** tier 2 `docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` (~80 linhas), complementando a skill `/security` com o ângulo Node+TS-específico de segurança: prototype pollution, `npm audit` no fluxo dev, `process.env` direto vs config schema-validada, dotenv pitfalls, e **migração inline do conteúdo de `nodejs-core/rules/primordials.md`** (RF8 + D12 — ex: usar `Object.create(null)` para maps confiáveis, primitives congelados via `Object.freeze`). Não duplica OWASP geral, JWT genérico, RBAC, ABAC, criptografia conceitual — esses ficam em `/security`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` | Create | Átomo thin (frontmatter + 5 seções com primordials migrados inline, ~80 linhas) |
| `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` | Read | Source — confirmar que segue intacto após migração (audit trail RF11) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: security-stack-specific
stack: nodejs-typescript
layer: backend
sources:
  - research: security-guide
  - skill: nodejs-core/rules/primordials.md
tier: 2
triggers: [prototype pollution, npm audit, dotenv, env, primordials, supply chain, helmet]
related_skills: [/security]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `security-guide` — Security Definitive Guide (2627 linhas) — extrair só as **parts Node-specific** (prototype pollution, supply chain Node, headers via Helmet, `crypto.timingSafeEqual`)
- `nodejs-core/rules/primordials.md` — rule app-relevant (D12, RF8) — extrair nuggets concretos (`Object.create(null)`, congelar primitives, evitar `__proto__` em parsers)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (thin — bullets minimal viable, não pular seção):

1. `# Security — Node.js + TypeScript stack-specific` (título)
2. `## Quando consultar` — 2-3 bullets de cenários (thin)
3. `## Padrões sênior` — 2-3 patterns (incluindo **pelo menos 1 sobre primordials/prototype pollution** para cobrir RF8)
4. `## Anti-padrões` — 1-2 armadilhas com correção
5. `## Critérios de decisão` — 1 tabela curta "se X, então Y"
6. `## Referências externas` — skill `/security` + paths das fontes (incluindo `primordials.md`)

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

Patterns recomendados (escolher 2-3 destes; **um deles obrigatoriamente cobre primordials/prototype pollution** para cumprir RF8):

- **Pattern: Defesa contra prototype pollution (RF8/D12)** — em parsers e merges genéricos, `__proto__`, `constructor.prototype` podem ser injetados via JSON. Padrão: usar `Object.create(null)` para maps confiáveis; checar keys reservadas em deep-merge; em libs como `lodash.merge`, atualizar para versão patched ou usar `Object.assign` raso. Quando NÃO usar: classe instanciada (Object.create(null) quebra typeof Object behavior).
- **Pattern: Config schema-validada com Zod no boot** — `process.env` é `Record<string, string | undefined>`; ler direto espalha "is it set?" pelo código. Padrão: parsar `process.env` uma vez no boot via `EnvSchema.parse(process.env)`; falha rápida se var faltar. Quando NÃO usar: scripts CLI efêmeros (overhead injustificado).
- **Pattern: Supply chain — `npm audit` no CI + lockfile pinado** — `npm audit --omit=dev` no CI bloqueia merge se vulnerabilidade high/critical. Padrão: complementar com `npm audit --audit-level=high` + `socket.dev` ou `osv-scanner` para detectar malware (não só CVE). Quando usar: qualquer serviço em produção.
- **Pattern: `crypto.timingSafeEqual` para comparação de tokens** — `===` vaza timing side-channel ao comparar HMAC/API key. Padrão: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` com buffers de mesmo tamanho. Quando NÃO usar: comparação de strings não-secret (overhead desnecessário).

Anti-padrões esperados (1-2):

- **`process.env.X` espalhado pelo código** — `if (process.env.NODE_ENV === 'production')` em 30 arquivos faz "set env" virar caça aos fantasmas. Correção: parse uma vez no boot em `config.ts`, importar `config.nodeEnv` no resto do código.
- **Parser de JSON aceitando `__proto__` em deep-merge** — bibliotecas como `lodash.merge` (vulnerável pré-patch) ou merges artesanais sem allow-list. Correção: `Object.create(null)` para alvo + checar keys reservadas; preferir merges shallow quando possível.

Critérios de decisão (tabela mínima):

| Cenário | Escolha |
|---|---|
| Map confiável (deep-merge, parser JSON externo) | `Object.create(null)` ou allow-list de keys |
| Comparação de token/HMAC | `crypto.timingSafeEqual` (não `===`) |
| `process.env` em múltiplos arquivos | Schema único parseado no boot |
| CI quer bloquear PR com CVE | `npm audit --audit-level=high` (+ socket.dev opcional) |
| Headers HTTP de defesa em Express/Fastify | Helmet (cobre Strict-Transport-Security, X-Content-Type-Options, etc.) |

### Passo 4: Referências externas

- Skill: `/security` para princípios cross-stack (OWASP Top 10, JWT, OAuth2/PKCE, session management, RBAC/ABAC, cryptography geral)
- Source: `claude-code/knowledge/Nodejs/wf-security-guide.md` (extrair só parts Node-specific)
- Source: `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` (RF8/D12 — conteúdo migrado inline, fonte preservada como audit trail)

### Passo 5: Verificar audit trail do primordials.md (RF8 / D12)

```bash
test -f claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md && echo "audit trail OK"
```

Resultado esperado: arquivo existe (não foi deletado durante a migração). RF11 exige audit trail: source preservada.

### Passo 6: Validar cap thin de 80 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md
```

Resultado esperado: entre 60 e 90 linhas. Alvo: ~80 (per `_topic-plan.md:61`). Se passar de 90, sinal de excesso de OWASP cross-stack que pertence a `/security` — cortar e linkar.

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano (cap thin de 80 ln):** se exceder 90 linhas, drift — provavelmente está explicando "o que é OWASP A03" ou "como funciona JWT" (cross-stack). Cortar e linkar `/security`. Faixa saudável: 70-90 linhas.
- **G5 do plano (overlap com `/security`):** este átomo é THIN porque `/security` é forte. Resistir a explicar OWASP, JWT, RBAC, criptografia geral. Aqui é só **stack-specific**: prototype pollution, primordials, `npm audit`, dotenv vs config schema, `crypto.timingSafeEqual`, Helmet middleware.
- **G6 do plano:** frontmatter `sources:` lista compass-id (`security-guide`) + skill path (`nodejs-core/rules/primordials.md`). Sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **G8 do plano (RF8/D12 — primordials migration):** o conteúdo de `primordials.md` deve ser integrado **inline** em pelo menos 1 pattern (ex: "Defesa contra prototype pollution" cobre `Object.create(null)`, congelar primitives, evitar `__proto__`). NÃO criar átomo separado `primordials.md` em `atoms/`. Verificar antes da fase que `primordials.md` ainda existe na pasta fonte (audit trail).
- **Local — extração seletiva de `security-guide`:** a fonte tem 2627 linhas. Filtrar apenas Node-specific (parts sobre prototype pollution, supply chain JS/Node, headers Express/Fastify, `crypto` nativo Node). Pular OWASP genérico, JWT, OAuth2 conceitual — esses estão em `/security`.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo (sem RED→GREEN):

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: security-stack-specific` (literal, kebab-case)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: backend`
- [ ] `tier: 2`
- [ ] `sources:` inclui tanto `research: security-guide` quanto `skill: nodejs-core/rules/primordials.md` (RF8/D12)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] **Pelo menos 1 pattern cobre primordials/prototype pollution** (RF8 cumprido)
- [ ] Pelo menos 2 patterns no total em "Padrões sênior"
- [ ] Pelo menos 1 anti-padrão com correção
- [ ] `wc -l` retorna entre 60 e 90 (alvo ~80)
- [ ] `grep -c '\[A DEFINIR\]' atoms/security-stack-specific.md` retorna 0
- [ ] Triggers contém pelo menos: `prototype pollution`, `npm audit`, `dotenv`, `env`, `primordials`, `supply chain`, `helmet`
- [ ] Citação de `/security` em "Referências externas" para deixar claro o limite cross-stack
- [ ] `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` ainda existe na fonte (audit trail RF11)
- [ ] `bun run harness:validate` verde
- [ ] Nenhuma claim duplica `/security` (OWASP Top 10, JWT, OAuth2, RBAC, criptografia conceitual)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` retorna número entre 60 e 90
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` retorna 0
- `grep -E '^(topic|stack|layer|sources|tier|triggers|related_skills|updated):' docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md | wc -l` retorna 8
- `grep -c 'primordials' docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` retorna ≥1 (RF8 cumprido)
- `test -f claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` exit 0 (audit trail preservado)
- `bun run harness:validate` exit 0

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção (`Object.create(null)`, config schema, `crypto.timingSafeEqual`)
- Pattern de prototype pollution + primordials cita exemplos concretos (não só "cuidado com `__proto__`")
- Nenhum pattern duplica conteúdo coberto cross-stack por `/security` (diferencial Node+TS-específico — primordials, dotenv pitfalls, Helmet, npm audit — é claro)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
