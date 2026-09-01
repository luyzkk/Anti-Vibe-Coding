<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-01 (Luiz/dev): Bash read-only — PRD §Decisões D6`
Os arquivos desta fase são .md e .json (sem comentário inline); a linhagem vive nos
HTML comments do rodapé do agent, no padrão dos agents existentes.
-->

# Fase 06: Agente dependency-auditor (contrato v2.0.0, Bash read-only + WebFetch)

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 2h
**Depende de:** fase-04
**Visual:** false

---

## O que esta fase entrega

`agents/dependency-auditor.md`: auditor dedicado que executa o procedimento da `sca-triage.md` —
roda o audit da stack via Bash, enriquece com EPSS/KEV via WebFetch, analisa reachability e emite o
envelope v2.0.0 — registrado no `verify-work` como auditor fixo sob `config.auditors.dependencies`.
O `security-auditor` permanece **read-only, sem Bash** (PRD §Decisões D6). Fecha RF-10.

---

## Depende da fase-04 — por que

O prompt do agente **nao reimplementa** a triagem: ele aponta para `skills/security/references/sca-triage.md`
como procedimento canonico. Sem a fase-04, o agente ou fica com ponteiro quebrado (falha no link
checker do `harness:validate`) ou duplica o procedimento — criando duas fontes de verdade que
divergem no primeiro update. Uma fonte de verdade.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/dependency-auditor.md` | Create | Prompt completo, contrato v2.0.0, Bash read-only |
| `agents/__fixtures__/dependency-auditor/expected-output.json` | Create | Envelope v2.0.0 valido (espelha `code-reviewer`) |
| `agents/__fixtures__/dependency-auditor/input.json` | Create | Input de teste (espelha os fixtures irmaos) |
| `skills/lib/subagent-contract.test.ts` | Modify | `+'dependency-auditor'` em `FIXTURE_NAMES` |
| `skills/verify-work/SKILL.md` | Modify | Bloco na secao 2b + linha no Verification Report |
| `config/verify-work.json` | Modify | `auditors.dependencies: true` + `model_profiles.dependency_auditor: "default"` |
| `config/model-profiles.json` | Modify | Entrada nos 3 perfis (quality/balanced/budget) |
| `docs/AGENTS_LIST.md` | Modify | Linha na tabela + "14 standalone" → "15 standalone" |
| `plugin-manifest.json` | Modify | Regenerado |

Oito arquivos alem do manifest — e o motivo de G11 existir no README. Nenhum e opcional: pular um
deixa o agente meio-registrado (existe mas nao roda, ou roda mas sem perfil de modelo).

---

## Implementacao

### Passo 1 — Branch

```bash
git checkout -b feat/dependency-auditor
```

### Passo 2 — RED-1 (primario): o gate de contrato do harness

Criar `agents/dependency-auditor.md` contendo **apenas** frontmatter + H1:

```markdown
---
name: dependency-auditor
kind: audit
description: "stub"
model: sonnet
tools: Read, Grep, Glob, Bash, WebFetch
---

# Dependency Auditor — Anti-Vibe Coding
```

```bash
bun run harness:validate
```

RED esperado — falha real de validador, nao de compilacao:

```
agent-contract-v1: agents/dependency-auditor.md: missing contract tokens in prompt:
contract_version, status, reasoning, payload, "1.0" or "2.0.0".
See docs/design-docs/subagent-contract-v1.md.
```

(`kind` ja aparece no frontmatter, entao nao entra na lista — o check e por substring no arquivo
inteiro.) Este RED prova que o gate esta vivo antes de escrever o prompt de 200 linhas.

### Passo 3 — RED-2: o contrato de output

Adicionar `'dependency-auditor'` ao final de `FIXTURE_NAMES` em `skills/lib/subagent-contract.test.ts`
e criar o fixture com o envelope que se **acredita** correto.

```bash
bun run agents:contract
```

Se `parseContract` recusar, o envelope esta errado — este e o feedback loop real da fase (o formato do
`payload.domain_status` e dos campos v2 so se confirma aqui). Depois de verde, **provar que o gate
morde**: esvaziar `positive_observations` para `[]`, rodar de novo, confirmar a falha
(`positive_observations` exige `length >= 1`), e restaurar. Um teste que nunca falhou nao e um teste.

`agents/__fixtures__/dependency-auditor/expected-output.json` — espelha `code-reviewer`, que ja e
v2.0.0 com `domain_status: "clean"`:

```json
{
  "contract_version": "2.0.0",
  "agent": "dependency-auditor",
  "kind": "audit",
  "status": "complete",
  "verdict": "request_changes",
  "positive_observations": [
    "package.json:31 fixa typescript em ^5.4.0 no devDependencies — fora do bundle de runtime, reduz superficie de producao",
    "package.json:27 declara apenas 3 dependencias de runtime (gray-matter, js-yaml, zod) — superficie de supply chain enxuta"
  ],
  "reasoning": "Audit da stack retornou 1 finding high em dependencia de runtime. EPSS 0.0042 (percentil 0.74) e ausencia do CVE no catalogo KEV indicam exploracao improvavel no curto prazo, mas a funcao vulneravel e alcancavel a partir do parser de frontmatter, que processa conteudo de arquivo nao confiavel. Procedimento aplicado: skills/security/references/sca-triage.md.",
  "payload": {
    "domain_status": "vulnerabilities_found",
    "issues": [
      {
        "id": "DEP-001",
        "severity": "high",
        "description": "gray-matter@4.0.3 — CVE-2026-00000: prototype pollution no parser de YAML. Alcancavel a partir de skills/lib/preface-context.ts:18, que le frontmatter de arquivo do projeto do usuario.",
        "file": "package.json",
        "line": 28,
        "exploitation_scenario": "Arquivo .md do projeto com frontmatter contendo __proto__ chega ao parser sem sanitizacao. EPSS 0.0042; nao consta no catalogo CISA KEV em 2026-09-01.",
        "impact": "Poluicao de prototype no processo do plugin durante /init. Dependencia de runtime, alcancavel — nao e dev-only.",
        "fix_with_example": "Atualizar para gray-matter@4.0.4 (fix disponivel, sem breaking change no schema de frontmatter). Revisar em: 2026-10-01 se o bump for adiado."
      }
    ]
  },
  "metadata": { "run_id": "test-dependency-auditor-001", "duration_ms": 0, "model": "test" }
}
```

CVE e versao do exemplo sao **sinteticos** — e um fixture de contrato, nao um advisory real. Deixar
isso explicito no `input.json`.

### Passo 4 — GREEN: escrever `agents/dependency-auditor.md`

Estrutura obrigatoria, espelhando `security-auditor.md` (o contrato mais completo do repo):
frontmatter → HTML comment de model → H1 → `## O que verificar` → `## Regras` →
`## Output Contract` → `## Anti-Degeneration Rules` → `## Composition` → HTML comments de linhagem →
`## Formato de Saida (Contrato v2.0.0)`.

**Frontmatter:**

```yaml
---
name: dependency-auditor
kind: audit
description: "Auditor de dependencias read-only. Roda o audit da stack, enriquece cada CVE com EPSS (FIRST.org) e CISA KEV, analisa reachability e emite decisao documentada com data de revisao. Degrada para 'exploracao nao verificada' quando offline, sem falhar a auditoria."
model: sonnet
tools: Read, Grep, Glob, Bash, WebFetch
---
<!-- Model resolved via config/model-profiles.json. Frontmatter model is fallback. See skills/lib/model-profile-utils.md -->
```

Precedente de `Bash` em agente de auditoria: `database-analyzer.md` (mesmo shape de frontmatter).
`WebFetch` e novo entre os auditores — justificado pelo PRD §Decisões D4 (feeds vivos, nao
conhecimento congelado do LLM).

**`## O que verificar`** — 5 blocos que espelham os 5 passos da `sca-triage.md`, apontando para ela
como fonte:

```markdown
> Procedimento canonico: `skills/security/references/sca-triage.md`.
> Este prompt define O QUE reportar e COMO formatar; o COMO triar vive na referencia.

### 1. Inventario
### 2. Enriquecimento (EPSS + KEV)
### 3. Reachability
### 4. Decisao
### 5. Higiene de dependencias
```

O bloco 5 cobre o que o audit nao ve e o grep ve: dependencia declarada e nunca importada,
dependencia de runtime que deveria ser dev, lockfile ausente ou dessincronizado do `package.json`,
`postinstall` em dependencia direta.

**`## Regras`** — o bloco mais importante desta fase, porque este agente tem Bash:

```markdown
## Regras

- NUNCA modifique arquivos. Apenas leia, execute comandos de LEITURA e reporte.
- `Bash` neste agente e READ-ONLY. Comandos permitidos, e apenas estes:
  - `bun audit --json` / `npm audit --json` / `pnpm audit --json` / `yarn npm audit --json`
  - `pip-audit -f json` / `bundle audit check` / `osv-scanner --format json -r .`
  - `bun pm ls` / `bun pm ls --prod` / `npm ls --prod --json`
  - leitura de manifesto: `cat package.json`, `cat requirements.txt`, `cat go.mod`
- PROIBIDO executar qualquer comando que mute o projeto: `install`, `add`, `update`, `upgrade`,
  `remove`, `uninstall`, `audit fix`, `--force`, ou qualquer escrita em disco. Se a correcao exige
  um comando mutativo, REPORTE o comando — nao o execute.
- `osv-scanner` e CLI externo OPCIONAL. Se nao estiver instalado, seguir com o audit nativo da stack
  e registrar a ausencia em `reasoning`. Nunca instalar nada.
- Priorize por acao, nao por severidade declarada: KEV > EPSS alto + reachable > severidade nominal.
- Seja especifico: pacote, versao, CVE, o arquivo/linha que alcanca a funcao vulneravel, e a data de
  revisao quando a decisao for adiar.
```

**`## Anti-Degeneration Rules`** — as 2 genericas (verbatim dos agents existentes) + 5 de dominio:

```markdown
Regras ESPECIFICAS do dominio de dependencias:

3. **Never suggest `npm audit fix --force` (ou `bun update --force`) as triage.** Bump forcado e
   aposta em salto de major, nao decisao. A triagem e por finding: pacote, CVE, reachability, escopo.
   Se o fix exige major bump, isso e um item de trabalho com risco declarado — nao um atalho.

4. **Never suggest removing a dependency without checking callers first.** Antes de propor remocao,
   `grep` pelos imports e reportar quantos call sites existem. "Remova o pacote" sem essa contagem e
   uma sugestao nao verificada.

5. **Never downgrade a finding because the fix is unavailable.** Ausencia de fix vira **deferral
   documentado** (razao + data de revisao), nunca dismissal. Um finding sem fix continua sendo finding.

6. **Never claim exploitation status you did not verify.** Se EPSS/KEV nao responderam, escreva
   `exploracao nao verificada` — jamais `nao explorado` ou `sem exploracao conhecida`. Ausencia de
   dado nao e evidencia de ausencia de exploracao (PRD §CA-04).

7. **Never report a CVE without stating reachability.** `reachable`, `not-reachable` ou `unknown` —
   `unknown` e resposta valida e honesta; omitir o campo nao e.
```

A regra 6 e a que impede o modo offline de virar falso negativo. A regra 7 espelha a Rule 5 do
`database-analyzer` (honestidade calibrada).

**`## Composition`:**

```markdown
**Invoke directly when:**
- Dependencia nova adicionada ou versao alterada no manifesto (`package.json`, `requirements.txt`, `go.mod`, `Gemfile`).
- `bun audit` (ou equivalente) retornou findings e alguem precisa decidir o que bloqueia o release.
- Antes de um release/tag, como portao de supply chain (A03:2025).

**Invoke via (orquestradores conhecidos):**
- `/anti-vibe-coding:verify-work` (auditor fixo, secao 2b, sob `config.auditors.dependencies`).
- `/anti-vibe-coding:security` (consulta de triagem de CVE).
- `/anti-vibe-coding:iterate` (incident response — quando a causa raiz e dependencia).

**Do not invoke from:**
- Dentro do `security-auditor` — escopos separados por design (PRD §Decisões D6). O `security-auditor`
  permanece read-only sem Bash; dar SCA a ele seria juntar o que a decisao separou.
- Em PR que nao toca manifesto nem lockfile — o audit nao muda, o custo sim.
- Em PRD/plano em fase de discovery — este agente audita DEPENDENCIAS REAIS instaladas, nao propostas.
```

**Rodape de linhagem**, no padrao dos agents existentes:

```markdown
<!-- 2026-09-01 (Luiz/dev): agente novo — PRD RF-10 + §Decisões D6. Contrato v2.0.0 desde o nascimento. -->
<!-- 2026-09-01 (Luiz/dev): Bash READ-ONLY (allowlist na secao Regras); precedente database-analyzer. -->
```

**`## Formato de Saida (Contrato v2.0.0)`** — copiar a estrutura do `security-auditor.md`,
substituindo `agent` e o enum:

```markdown
- `payload.domain_status`: enum de dominio especifico deste auditor — valores aceitos:
  `"clean"`, `"vulnerabilities_found"`, `"critical_issues"`.
```

`"clean"` (nao `"secure"`) reusa o valor que `code-reviewer` ja emite, e o par
`vulnerabilities_found`/`critical_issues` alinha com o `security-auditor` — o `verify-work` renderiza
os tres estados com o mesmo mapeamento de icone.

Incluir tambem, no bloco de regras do formato, os campos que a triagem exige por issue:
`epss`, `kev`, `reachability`, `scope` (`runtime`/`dev-only`) e `review_by` quando a decisao for adiar.
Estes vivem **dentro** de `description`/`exploitation_scenario`/`fix_with_example` — **nao inventar
campos novos no envelope**: PRD §Boundaries pede "perguntar antes" para alterar o contrato JSON v2.0.0.

### Passo 5 — Wire no `verify-work`

**5a. Secao 2b**, apos o bloco de `code-reviewer`, no formato exato dos irmaos:

```markdown
**dependency-auditor:**
- Input: manifesto de dependencias do projeto (package.json/lockfile, requirements.txt, Gemfile, go.mod) + saida do audit da stack
- Verifica: CVE por dependencia enriquecido com EPSS + CISA KEV e analise de reachability — procedimento em `skills/security/references/sca-triage.md`
- Skippado se: config.auditors.dependencies = false
- Degradacao: sem rede, marca "exploracao nao verificada" e completa mesmo assim — nunca falha a verificacao (PRD CA-04)
```

**5b. Verification Report**, na lista de Summary, apos a linha de `Code Review`:

```markdown
- Dependencies: {se domainStatuses["dependency-auditor"] === "clean"} ✅ clean | {se "vulnerabilities_found"} ⚠️ issues found | {se "critical_issues"} ❌ critical | {se incomplete} ⏸ incomplete
```

**5c. `config/verify-work.json`:**

```json
  "auditors": {
    "tdd": true,
    "security": true,
    "code_quality": true,
    "dependencies": true,
    "domain_specific": true,
    "test_quality": true
  },
```

e em `model_profiles`, `"dependency_auditor": "default"`.

**5d. `config/model-profiles.json`** — nos 3 perfis:

| Perfil | Modelo | Razao |
|---|---|---|
| quality | `sonnet` | mesma faixa do `database-analyzer` (o outro agente com Bash); a tarefa e procedimental, nao de julgamento aberto |
| balanced | `sonnet` | reachability exige ler call path — `haiku` erra a ponta |
| budget | `haiku` | aceita degradacao; o audit e deterministico, o julgamento e que perde |

**5e. `docs/AGENTS_LIST.md`** — linha na tabela e o contador no texto:

```markdown
| dependency-auditor | Dependency audit (CVE + EPSS/KEV + reachability; Bash read-only) | balanced |
```

E `14 standalone subagent auditors` → `15 standalone subagent auditors`. O texto tambem diz
"All agents are read-only unless noted" — o `dependency-auditor` **e** read-only (a allowlist de Bash
so le), entao nada a anotar; se quiser explicitar, escrever "read-only (Bash restrito a comandos de
audit)".

### Passo 6 — Manifest

```bash
bun run generate:manifest
grep -c "agents/dependency-auditor.md" plugin-manifest.json   # esperado: 1
git diff --stat plugin-manifest.json
```

---

## Gotchas

- **G1 do plano:** cinco arquivos rastreados nesta fase. Manifest obrigatorio, verificando a
  **presenca** da entrada nova do agente.
- **G10 do plano:** `harness:validate` exige `contract_version`, `kind`, `status`, `reasoning`,
  `payload` e `"2.0.0"` no texto do agente, alem de H1 apos frontmatter/HTML comments. E o RED-1.
- **G11 do plano:** os 5 pontos de registro (model-profiles, verify-work.json, verify-work SKILL,
  AGENTS_LIST, fixture + FIXTURE_NAMES). Esquecer qualquer um deixa o agente meio-vivo.
- **G13 do plano:** branch + PR.
- **Local — Bash num agente de auditoria e a superficie de risco desta fase.** A allowlist da secao
  `## Regras` e o controle. Se ela nao estiver escrita explicitamente, o agente vai rodar
  `npm audit fix` na primeira oportunidade — que e exatamente o anti-pattern que a secao 9 da
  `/security` ja condena.
- **Local — nao inventar campo no envelope v2.0.0.** `epss`/`kev`/`reachability` vao dentro dos campos
  existentes. Alterar o contrato exige perguntar antes (PRD §Boundaries).
- **Local — o fixture usa CVE sintetico.** Nao referenciar advisory real num fixture de contrato;
  ele nao envelhece bem e vira desinformacao. Deixar explicito no `input.json`.
- **Local — `parseContract` valida `warnings: []` tambem.** O teste exige zero warnings, nao so zero
  erros. Campo extra ou valor fora do enum aparece como warning — e ai o RED-2 falha por um motivo
  diferente do esperado. Ler a mensagem antes de "consertar".
- **Local — preservar o `security-auditor`.** Nenhuma linha de `agents/security-auditor.md` muda nesta
  fase. Se `git diff` tocar nesse arquivo, D6 foi violada.

---

## Verificacao

### TDD

- [ ] **RED-1:** stub do agente reprovado pelo gate de contrato
  - Comando: `bun run harness:validate`
  - Resultado esperado: `agent-contract-v1: agents/dependency-auditor.md: missing contract tokens in prompt: contract_version, status, reasoning, payload, "1.0" or "2.0.0"`

- [ ] **GREEN-1:** prompt completo, gate verde
  - Comando: `bun run harness:validate`
  - Resultado esperado: exit 0, sem failure de `agent-contract-v1`

- [ ] **RED-2 (prova de que o gate morde):** com `positive_observations: []` no fixture
  - Comando: `bun run agents:contract`
  - Resultado esperado: falha citando `positive_observations` (exige `length >= 1`)

- [ ] **GREEN-2:** fixture restaurado
  - Comando: `bun run agents:contract`
  - Resultado esperado: `fixture dependency-auditor: parseContract valid=true, 0 errors, 0 warnings` passa;
    total de fixtures do loop vai de 14 para 15

### Checklist

- [ ] `agents/dependency-auditor.md` tem as 7 secoes do padrao `security-auditor.md`
- [ ] Allowlist de Bash escrita explicitamente em `## Regras`, com a lista de comandos PROIBIDOS
- [ ] `grep -c "audit fix" agents/dependency-auditor.md` retorna `>= 1` e **so** em contexto de proibicao
- [ ] `payload.domain_status` documentado com os 3 valores (`clean` / `vulnerabilities_found` / `critical_issues`)
- [ ] 7 Anti-Degeneration Rules (2 genericas + 5 de dominio)
- [ ] `## Composition` cita explicitamente o "Do not invoke from: dentro do security-auditor" (D6)
- [ ] `git diff --stat agents/security-auditor.md` **vazio** — auditor original intocado (D6)
- [ ] `'dependency-auditor'` presente em `FIXTURE_NAMES` e os 2 arquivos de fixture existem
- [ ] `config/verify-work.json` tem `auditors.dependencies` e `model_profiles.dependency_auditor`
- [ ] `config/model-profiles.json` tem a entrada nos **3** perfis
- [ ] `docs/AGENTS_LIST.md` tem a linha nova E o contador atualizado para 15
- [ ] `skills/verify-work/SKILL.md` tem o bloco na 2b E a linha no Verification Report
- [ ] Link para `skills/security/references/sca-triage.md` resolve (fase-04 mergeada)
- [ ] Harness: `bun run harness:validate` verde
- [ ] Contrato: `bun run agents:contract` verde
- [ ] Suite: `bun run test` sem falhas novas
- [ ] TypeCheck: `bun run typecheck` — zero erros novos alem de GT-01
- [ ] JSON valido: `bun -e "JSON.parse(require('fs').readFileSync('config/verify-work.json','utf8')); JSON.parse(require('fs').readFileSync('config/model-profiles.json','utf8')); console.log('ok')"`
- [ ] Manifest: `grep -c "agents/dependency-auditor.md" plugin-manifest.json` retorna `1` (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (RF-10 — o agente existe e passa nos dois gates):**

```bash
bun run harness:validate && echo HARNESS_OK
# esperado: HARNESS_OK

bun run agents:contract 2>&1 | grep -c "fixture dependency-auditor"
# esperado: 1  (o teste do fixture novo rodou)

bun run agents:contract && echo CONTRACT_OK
# esperado: CONTRACT_OK
```

**Por maquina (registro completo — G11):**

```bash
grep -c '"dependency-auditor"' config/model-profiles.json   # esperado: 3 (um por perfil)
grep -c '"dependencies"' config/verify-work.json            # esperado: 1
grep -c 'dependency_auditor' config/verify-work.json        # esperado: 1
grep -c 'dependency-auditor' skills/verify-work/SKILL.md    # esperado: >= 2 (2b + report)
grep -c 'dependency-auditor' docs/AGENTS_LIST.md            # esperado: 1
grep -c '15 standalone subagent auditors' docs/AGENTS_LIST.md  # esperado: 1
grep -c 'agents/dependency-auditor.md' plugin-manifest.json    # esperado: 1
```

**Por maquina (D6 — o security-auditor nao foi tocado):**

```bash
git diff --stat agents/security-auditor.md | wc -l
# esperado: 0
grep -c "^tools: Read, Grep, Glob$" agents/security-auditor.md
# esperado: 1  (continua sem Bash)
```

**Por humano:**
- Lendo `## Regras`, fica inequivoco quais comandos o agente pode rodar e que nenhum deles muta o
  projeto.
- As 5 Anti-Degeneration Rules de dominio descrevem erros que um auditor de dependencias realmente
  comete — nao sao genericas recicladas.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
