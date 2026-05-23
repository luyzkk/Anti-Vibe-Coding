<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código devem ter linhagem: autor + papel + data + razão.
Exemplo: `// 2026-05-22 (Luiz/dev): bump contract_version "2.0.0" — Wave 2 Plano 01 fase-03 (DT-2)`
-->

# Fase 03: TRACER BULLET — Refinar `security-auditor.md` (Gold Standard)

**Plano:** 01 — Tracer Bullet Schema v2.0.0 + Gold Standard
**Sizing:** 1.5h (S)
**Depende de:** fase-02 (schema v2.0.0 definido e migration guide pronto)
**Visual:** false

---

## O que esta fase entrega

`agents/security-auditor.md` refinado aplicando os 5 patterns canonicos (Output Contract additions, Anti-Degeneration Rules, Composition, JSON contract bumpado para 2.0.0, callers ajustados). Vira o **gold standard** que o Plano 02 replica verbatim nos outros 12 agentes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` | Modify | Aplicar os 5 patterns + bump contract para 2.0.0 + atualizar exemplos |
| `f:/Projetos/Anti-Vibe-Coding/<parsers identificados na fase-01>` | Modify (condicional) | Ajustar callers TS para aceitar shape v2.0.0 (so se fase-01 listou parsers afetados) |

---

## Implementacao

**Atencao:** Antes de qualquer edicao, RELER `agents/security-auditor.md` inteiro (regra de Integridade das Edicoes — arquivo > 100 linhas, contexto pode estar desatualizado).

### Passo 1: Adicionar secao `## Output Contract`

Localizacao sugerida: imediatamente apos a descricao geral do agente, antes da secao de processo/instrucoes.

```markdown
## Output Contract

O agente emite payload JSON conforme schema v2.0.0 (ver `docs/design-docs/subagent-contract-v1.md`).

**Campos obrigatorios:**
- `contract_version`: literal `"2.0.0"`.
- `agent`: literal `"security-auditor"`.
- `kind`: literal `"audit"`.
- `status`: `"complete" | "blocked" | "needs_human"`.
- `verdict`: `"approve" | "request_changes" | "block"`.
- `positive_observations`: `string[]` com `length >= 1`. Cada item DEVE citar arquivo:linha OU funcao/classe especifica E NAO pode ser tautologia (ver `docs/design-docs/subagent-contract-v2-migration.md` regex blacklist).

**Campos opcionais (recomendados para issues critical/high):**
- `exploitation_scenario`: descricao passo-a-passo de como explorar.
- `impact`: blast radius (dados/usuarios/sistemas).
- `fix_with_example`: snippet correto (antes/depois).

**Tabela `severity_action_map` canonica:** ver `docs/design-docs/subagent-contract-v1.md` secao "severity_action_map".
```

### Passo 2: Adicionar secao `## Anti-Degeneration Rules`

Localizacao: apos `## Output Contract`. Bloco completo (>=4 regras: 2+ genericas + 2+ especificas de seguranca).

```markdown
## Anti-Degeneration Rules

Regras GENERICAS (aplicaveis a todo agente — baseline do plugin):

1. **Never suggest disabling type checks** as a fix. Proibido recomendar `@ts-ignore`, `@ts-expect-error` sem justificativa documentada, `as any`, ou alargar tipos para silenciar erros. Se o type-checker reclama, o tipo precisa ser corrigido — nao silenciado.

2. **Never suggest disabling lint or tests** as a workaround. Proibido recomendar `eslint-disable`, `test.skip`, `xit`, `it.only` em codigo de producao, ou desabilitar regra de lint sem justificativa documentada no PRD/decision-registry. Se lint/teste reclama, ha sinal — investigar.

Regras ESPECIFICAS do dominio de seguranca:

3. **Never suggest disabling CORS, CSRF, auth middleware, or rate-limiting as a fix.** Se o middleware esta bloqueando uma rota legitima, a rota precisa ser configurada corretamente (whitelist, scope, role) — nao desligar o middleware. Bypass de auth e nunca a solucao certa.

4. **Never suggest weakening crypto algorithm or reducing entropy.** Proibido recomendar SHA-1 onde SHA-256 e padrao, AES-128 onde 256 e o default do projeto, saltRounds < 10 em bcrypt, ou desabilitar verificacao de assinatura JWT. Se a crypto e "lenta demais", o problema e arquitetural (cache, batch) — nao reduzir seguranca.
```

### Passo 3: Adicionar secao `## Composition`

Localizacao: apos `## Anti-Degeneration Rules`.

```markdown
## Composition

**Invoke directly when:**
- Usuario solicita auditoria de seguranca explicita: `/security`, "audita seguranca", "scan OWASP", "verifica vulnerabilidades".
- Antes de merge para `main` em PR que toca: rotas de API, middleware de auth, lib de crypto, integracoes externas, configuracao de CORS/CSP, queries com input externo.

**Invoke via (orquestradores conhecidos):**
- `/anti-vibe-coding:security` (skill principal de consultoria de seguranca).
- `/anti-vibe-coding:verify-work` (etapa de verificacao pos-execucao).
- `/anti-vibe-coding:iterate` (incident response — auditoria de causa raiz).

**Do not invoke from:**
- Dentro de `code-smell-detector` ou `solid-auditor` (escopos distintos — composicao explicita gera ruido e custo redundante).
- Durante refatoracoes triviais sem mudanca de superficie de ataque (renomes, formatacao, comentarios).
- Em PRDs/planos em fase de discovery — `security-auditor` audita CODIGO real, nao especificacoes.
```

### Passo 4: Bumpar o bloco JSON existente (linha ~97-122) de v1.0 para v2.0.0

Substituir o exemplo atual por:

````markdown
```json
{
  "contract_version": "2.0.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "verdict": "request_changes",
  "positive_observations": [
    "src/auth/middleware.ts:42 usa bcrypt com saltRounds=12 (acima do minimo OWASP)",
    "src/api/users/route.ts:88 valida payload com zod antes de tocar DB",
    "src/lib/jwt.ts:15 verifica assinatura com `verify` (nao apenas `decode`)"
  ],
  "issues": [
    {
      "id": "SEC-001",
      "severity": "high",
      "title": "Endpoint /api/admin/users nao valida role do usuario",
      "file": "src/api/admin/users/route.ts",
      "line": 23,
      "exploitation_scenario": "Usuario autenticado mas sem role 'admin' chama POST /api/admin/users com body { role: 'admin' } e cria conta privilegiada. Reproducao: 1) login como user normal, 2) `curl -X POST /api/admin/users -d '{...}'` com cookie de sessao.",
      "impact": "Escalacao de privilegio. Qualquer usuario logado pode promover-se a admin. Afeta toda a base de usuarios. Risco de takeover total da aplicacao.",
      "fix_with_example": "No inicio do handler:\n```ts\nconst session = await getSession(req)\nif (session?.user?.role !== 'admin') {\n  return new Response('forbidden', { status: 403 })\n}\n```"
    }
  ],
  "metadata": {
    "files_scanned": 18,
    "duration_ms": 4231
  }
}
```
````

### Passo 5: Atualizar texto das `Regras` (linha ~125)

A linha que diz `` `contract_version` sempre `"1.0"`.`` precisa virar:

```markdown
- `contract_version` sempre `"2.0.0"`.
- `kind` sempre `"audit"`.
- `status`: `"complete"` se voce concluiu a analise; `"blocked"` se faltou contexto; `"needs_human"` se algo ambiguo precisa decisao humana.
- `verdict`: `"approve" | "request_changes" | "block"` — ver tabela `severity_action_map` no schema.
- `positive_observations`: array com pelo menos 1 string especifica (cita arquivo:linha ou simbolo). Proibido tautologia (`"no issues found"`, `"looks fine"`, `"tudo certo"`). Validator regex enforce — ver fase-04.
```

### Passo 6: Atualizar callers ajustaveis (se a fase-01 identificou)

Para cada parser TS listado em `audit-consumers.md` com acao "needs-migration":

1. Reler o arquivo inteiro (regra de Integridade).
2. Atualizar o type `SubagentReportV1` -> `SubagentReportV2` conforme o exemplo do migration guide (fase-02).
3. Atualizar fixture/teste relacionado (se houver).
4. Rodar `bun run typecheck` e `bun run test` localmente para garantir GREEN.

**Atomicidade:** todas as edicoes desta fase entram em UM commit. Se algum parser quebrar e o fix for nao-trivial (>30min), criar BUG no MEMORY e escalar — nao continuar editando outros arquivos.

### Passo 7: Smoke test do gold standard

Validar consistencia visual antes de declarar pronto:

```bash
# Headings esperados existem
grep -n "^## " f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md

# Esperado (ordem pode variar, mas todos presentes):
# ## Output Contract
# ## Anti-Degeneration Rules
# ## Composition
# (+ as secoes pre-existentes do agente)

# Versao bumpada em todos os locais
grep -n '"2.0.0"\|"1.0"' f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md
# Esperado: zero matches de "1.0", >= 1 match de "2.0.0"
```

---

## Gotchas

- **G3 do plano:** `agents/security-auditor.md` tem >= 2 referencias a `"1.0"` (linha 99 no JSON + linha 125 no texto). Buscar BOTH locations antes de declarar bump completo.
- **G6 do plano:** Plano 02 vai replicar este arquivo VERBATIM em 12 agentes. Qualquer typo, heading inconsistente, ou ordem trocada propaga 12x. Capricho aqui economiza retrabalho la.
- **Local:** O agente ja tem secoes pre-existentes (provavelmente `## Process`, `## Output`, etc). NAO duplicar — se ja existe `## Output`, renomear para `## Output Contract` E unificar. Decisao registrada como DI no MEMORY do plano.
- **Local:** Algumas instalacoes do plugin podem ter `agents/security-auditor.md` customizado por usuarios — verificar git status antes do commit (regra de seguranca: nao destruir trabalho nao salvo).
- **Local:** Se o numero de linhas finais ficar > 300, considerar quebrar o agente em arquivos auxiliares (regra de Higiene de Arquivos). Provavelmente NAO acontece — patterns sao concisos.

---

## Verificacao

### TDD

Esta fase nao tem RED/GREEN classico de codigo runtime (o "codigo" e markdown). Substituido por gates de grep + harness validate.

### Checklist

- [ ] `agents/security-auditor.md` foi lido inteiro ANTES da primeira edicao (regra de Integridade)
- [ ] Secao `## Output Contract` adicionada
- [ ] Secao `## Anti-Degeneration Rules` adicionada com >= 4 regras (>= 2 genericas + >= 2 especificas de seguranca)
- [ ] Secao `## Composition` adicionada com 3 sub-secoes (Invoke directly when / Invoke via / Do not invoke from)
- [ ] Bloco JSON bumpado para `"contract_version": "2.0.0"`
- [ ] Exemplo JSON contem `positive_observations` (>= 1 item especifico)
- [ ] Exemplo JSON contem `verdict`
- [ ] Pelo menos 1 issue de exemplo (critical/high) tem `exploitation_scenario`, `impact` e `fix_with_example`
- [ ] Texto das "Regras" do agente foi atualizado (`sempre "2.0.0"` em vez de `"1.0"`)
- [ ] Callers identificados na fase-01 (se houver) foram atualizados no mesmo commit
- [ ] `bun run harness:validate` passa
- [ ] `bun run test` passa
- [ ] `bun run lint` passa
- [ ] Smoke test final: `grep "1.0" agents/security-auditor.md` retorna ZERO matches

---

## Criterio de Aceite

**Por maquina (todos devem passar):**
- `grep -c "## Output Contract" f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna `1`
- `grep -c "## Anti-Degeneration Rules" f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna `1`
- `grep -c "## Composition" f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna `1`
- `grep -c '"contract_version": "2.0.0"' f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna >= 1
- `grep -c '"1.0"' f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna `0`
- `grep -c "positive_observations" f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md` retorna >= 2 (1 no schema/output contract + 1 no exemplo JSON)
- `bun run harness:validate` exit code 0
- `bun run test` exit code 0
- `bun run lint` exit code 0

**Por humano:**
- Releitura final do arquivo: as 3 secoes novas fluem naturalmente com o conteudo pre-existente do agente (sem duplicacao, sem orfaos)
- Teste com olhos frescos: um dev sem conhecer o PRD entende para que servem as secoes novas

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
