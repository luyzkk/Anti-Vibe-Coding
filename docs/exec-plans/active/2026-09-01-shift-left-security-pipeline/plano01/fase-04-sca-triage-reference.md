<!--
Princípio universal #5 — Comment Provenance.
Fase de documentacao: nao gera codigo de runtime. Os snippets de comando dentro do reference
sao exemplos operacionais, nao codigo do plugin — nao carregam comentario de linhagem inline.
A linhagem vive na secao de Fontes do proprio reference e no PR.
-->

# Fase 04: Referencia de Triagem SCA (EPSS + KEV + reachability)

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 2h
**Depende de:** Nenhuma (paralelizavel com fase-03)
**Visual:** false

---

## O que esta fase entrega

`skills/security/references/sca-triage.md`: procedimento operacional que transforma a arvore de
decisao teorica da secao 9 da `/security` em passos executaveis — rodar o audit da stack, enriquecer
cada CVE com **EPSS** e **CISA KEV**, analisar **reachability** e registrar a decisao com data de
revisao — incluindo o comportamento offline exigido pelo CA-04. Fecha RF-03.

E o insumo direto da **fase-06** (o `dependency-auditor` executa este procedimento).

---

## Nao ha TDD nesta fase — e por que

O entregavel e um documento de procedimento, sem unidade de codigo. Um teste sobre o texto seria
tautologico. O gate estrutural e `bun run harness:validate` (H1, links resolviveis, e o arquivo entra
no manifest); o criterio verificavel por maquina vive nos greps de secao do Passo 6 e na resolucao dos
links. Ciclo: **GREP-RED → escrever → GREP-GREEN**.

O que *precisa* ser verificado de verdade nesta fase nao e o texto, e a **premissa #2 do PRD**: os
dois endpoints respondem via WebFetch. Isso e o Passo 2.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/references/sca-triage.md` | Create | Procedimento completo, **sem frontmatter** (G9) |
| `skills/security/SKILL.md` | Modify | Uma linha: ponteiro da secao 9 → o reference novo (G7) |
| `plugin-manifest.json` | Modify | Regenerado — `skills/security/references/*` e rastreado |

---

## Implementacao

### Passo 1 — Branch

```bash
git checkout -b docs/sca-triage-reference
```

### Passo 2 — Validar a premissa #2 do PRD (os endpoints respondem)

Antes de documentar o procedimento, provar que ele roda. Fazer `WebFetch` dos dois:

- EPSS: `https://api.first.org/data/v1/epss?cve=CVE-2021-44228`
- CISA KEV: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`

Anotar no MEMORY: alcancavel sim/nao, o shape do campo lido (`data[0].epss`, `data[0].percentile`;
`vulnerabilities[].cveID`) e o tamanho aproximado do feed KEV (e grande — o procedimento precisa
dizer como consultar sem despejar o feed inteiro no contexto).

**Se algum endpoint estiver bloqueado:** a fase **nao para**. O modo offline e parte do entregavel
(CA-04) — documentar o bloqueio no MEMORY e escrever a secao de degradacao com base no que foi
observado. Isso e o oposto da fase-03, onde a rede era bloqueante.

### Passo 3 — Criar `skills/security/references/sca-triage.md`

**Sem frontmatter** (G9): os 8 references irmaos comecam direto no H1. Atribuicao de fontes vai numa
secao no rodape.

Esqueleto obrigatorio (H1 + 8 secoes):

```markdown
# Triagem de Vulnerabilidades de Dependencias (SCA) — Referencia Detalhada

> Procedimento operacional. A secao 9 da skill `/security` da a arvore de decisao;
> este documento da os comandos, os campos e o formato do registro.

## Quando usar
## Passo 1 — Inventario: rodar o audit da stack
## Passo 2 — Enriquecer: EPSS e CISA KEV
## Passo 3 — Reachability: a funcao vulneravel e chamada?
## Passo 4 — Matriz de decisao
## Passo 5 — Registrar a decisao
## Modo offline (degradacao graciosa)
## Limites honestos
## Fontes
```

**Passo 1 — Inventario.** Comando por stack, com saida em JSON (o agente da fase-06 precisa parsear):

```bash
bun audit --json                      # Bun (padrao deste projeto)
npm audit --json                      # Node/npm
pnpm audit --json                     # pnpm
pip-audit -f json                     # Python
bundle audit check --update           # Ruby
osv-scanner --format json -r .        # multi-stack, CLI externo OPCIONAL
```

Registrar por finding: pacote, versao instalada, CVE/GHSA, severidade declarada, versao com fix,
e **runtime vs dev-only** (`bun pm ls --prod`, ou o campo do proprio audit).

**Passo 2 — Enriquecer.** Para cada CVE:

```
EPSS   → https://api.first.org/data/v1/epss?cve=CVE-2021-44228
         ler data[0].epss (0..1, probabilidade de exploracao em 30 dias)
         e data[0].percentile (posicao relativa no universo de CVEs)

KEV    → https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
         procurar o CVE em vulnerabilities[].cveID
         KEV = exploracao ATIVA confirmada, nao previsao
```

Nota operacional obrigatoria: o feed KEV e grande. Buscar o CVE especifico no conteudo retornado —
nunca despejar o feed inteiro no relatorio nem no contexto.

Distincao que o documento precisa deixar explicita, porque e onde a triagem costuma errar:
**CVSS mede o quanto doeria; EPSS estima a chance de acontecer; KEV afirma que ja esta acontecendo.**
Um CVSS 9.8 com EPSS 0.0004 e fora do code path e menos urgente que um CVSS 6.5 no KEV.

**Passo 3 — Reachability.** Tres perguntas, nesta ordem:

```bash
# 1. O pacote e importado?
grep -rn "from ['\"]<pacote>['\"]\|require(['\"]<pacote>['\"])" --include="*.ts" --include="*.js" src/

# 2. A funcao/modulo citado no advisory e usado?
grep -rn "<simbolo do advisory>" src/

# 3. O call path chega a entrada externa?
#    Tracar do uso ate um handler de rota / job / CLI. Se so aparece em teste ou script de build,
#    e dev-only na pratica.
```

Classificar em `reachable` / `not-reachable` / `unknown`. **`unknown` e resposta valida** — melhor
que uma afirmacao falsa em qualquer direcao.

**Passo 4 — Matriz de decisao.** A tabela e o coracao do documento:

```markdown
| KEV | EPSS | Reachability | Escopo | Acao | Prazo |
|---|---|---|---|---|---|
| sim | qualquer | qualquer | runtime | Corrigir agora — bloqueia release | < 24h |
| sim | qualquer | qualquer | dev-only | Corrigir no ciclo — nao bloqueia release | < 7d |
| nao | alto (>= 0.10 ou percentil >= 0.90) | reachable | runtime | Prioridade alta — bloqueia release | < 72h |
| nao | alto | not-reachable / unknown | runtime | Proximo release | < 30d |
| nao | alto | qualquer | dev-only | Backlog com data de revisao | < 30d |
| nao | baixo (< 0.01) | reachable | runtime | Proximo release | < 30d |
| nao | baixo | not-reachable | dev-only | Backlog com data de revisao | < 90d |
| **nao verificado** (offline) | — | reachable | runtime | Tratar como alto — fail-safe para cima | < 72h |
| **nao verificado** (offline) | — | not-reachable / unknown | qualquer | Backlog + reavaliar quando houver rede | < 30d |

Sem fix disponivel em qualquer linha: a acao vira **deferral documentado** (Passo 5), nunca dismissal.
```

Sobre os limiares: `EPSS >= 0.10` (10% de chance em 30 dias) e o corte operacional usual, ~top 5% do
universo de CVEs. O documento deve dizer que o limiar e **heuristica configuravel** e que a triagem
registra qual limiar usou — nao fingir precisao que o dado nao tem.

Fail-safe para cima no offline: e o unico jeito de honrar o CA-04 (nao falhar) sem virar
falso-negativo silencioso.

**Passo 5 — Registrar a decisao.** Formato do registro (o `dependency-auditor` da fase-06 emite este
mesmo conjunto de campos dentro de `payload.issues[]`):

```
pacote@versao — CVE-XXXX-YYYYY
  severidade declarada: high
  EPSS: 0.0042 (percentil 0.74)   [ou "nao verificado — sem rede em 2026-09-01"]
  KEV: nao                        [ou "nao verificado"]
  reachability: not-reachable (importado so em scripts/build.ts)
  escopo: dev-only
  decisao: backlog
  razao: nao alcancavel de codigo de producao; fix exige major bump do bundler
  revisar em: 2026-12-01
```

`revisar em` e obrigatorio em toda decisao que nao seja "corrigir agora" — sem data de revisao, o
finding vira divida invisivel (a regra ja existe na secao 9 da skill; aqui ela vira campo).

**Modo offline.** Secao propria, curta e taxativa:

```markdown
## Modo offline (degradacao graciosa)

Sem acesso a FIRST.org ou CISA, a triagem **completa mesmo assim**. Regras:

1. Marcar cada item como `exploracao nao verificada` — nunca `nao explorado`. A ausencia de dado
   nao e evidencia de ausencia de exploracao.
2. Nunca falhar a auditoria por indisponibilidade de rede (PRD §CA-04).
3. Aplicar as duas ultimas linhas da matriz: fail-safe para cima em runtime + reachable.
4. Registrar a data da tentativa e reavaliar quando houver rede.
```

**Limites honestos.** Uma secao dizendo o que isto NAO e: nao substitui Snyk/Trivy, nao tem banco de
pacotes maliciosos, nao faz container/IaC scanning, e a analise de reachability e por grep + leitura —
nao e call graph estatico. Alinhado com PRD §Won't Have e §Out of Scope.

**Fontes.** Atribuicao (G9 — no rodape, ja que nao ha frontmatter):

```markdown
## Fontes

- EPSS — FIRST.org: https://www.first.org/epss/ (API: https://api.first.org/data/v1/epss)
- CISA Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OSV.dev: https://osv.dev/
- OWASP Top 10 2025, A03 Software Supply Chain Failures — ver `docs/references/security-checklist.md`

Verificado em: 2026-09-01.
```

### Passo 4 — Atualizar o ponteiro da secao 9 do `SKILL.md`

Uma linha, dentro da secao `## 9. Triagem de Vulnerabilidades de Dependencias`:

```markdown
> Referencia: `references/sca-triage.md`  (procedimento operacional: audit → EPSS/KEV → reachability → decisao)
```

Substitui o ponteiro atual para `references/application-security.md`, que nao cobre o tema. **Nada
mais do `SKILL.md` e tocado** (G7/G8) — a arvore de decisao da secao 9 permanece intacta; o reference
a estende, nao a substitui.

### Passo 5 — Manifest

```bash
bun run generate:manifest
grep -c "skills/security/references/sca-triage.md" plugin-manifest.json   # esperado: 1
```

Arquivo **novo** dentro de diretorio rastreado — precisa aparecer no manifest, nao so mudar checksum.

---

## Gotchas

- **G1 do plano:** dois arquivos rastreados (o reference novo e o `SKILL.md`). Manifest obrigatorio,
  e desta vez verificar a **presenca** da entrada nova, nao so o diff.
- **G7 do plano:** fases 03, 04 e 05 editam o `SKILL.md`. Esta toca **uma linha** na secao 9.
  `git pull --rebase` antes do PR.
- **G9 do plano:** o reference **nao leva frontmatter**. Se for gerado com `title:`/`source_url:` no
  topo, esta fora do padrao dos 8 irmaos — atribuicao vai na secao `## Fontes`.
- **Local — o feed KEV e grande.** O procedimento precisa instruir a buscar o CVE dentro do conteudo,
  nunca a despejar o feed. Se isso nao estiver escrito, o agente da fase-06 vai estourar contexto.
- **Local — `osv-scanner` e CLI externo opcional.** PRD §Boundaries: nao vira dependencia do plugin.
  O documento apresenta como alternativa, nunca como pre-requisito.
- **Local — nao afirmar exploracao que nao verificou.** `nao verificado` != `nao explorado`. Essa
  distincao vira Anti-Degeneration Rule do agente na fase-06; nasce aqui.
- **Local — link para o checklist.** Se a secao `## Fontes` apontar para
  `docs/references/security-checklist.md`, o link checker do `harness:validate` resolve (o arquivo ja
  existe). Se apontar para uma **ancora** de secao criada na fase-03, esperar a fase-03 mergear.

---

## Verificacao

### Verificacao de conteudo (substitui TDD)

| # | Comando | Antes (RED) | Depois (GREEN) |
|---|---------|-------------|----------------|
| 1 | `test -f skills/security/references/sca-triage.md && echo ok` | vazio | `ok` |
| 2 | `head -1 skills/security/references/sca-triage.md` | — | comeca com `# ` (nao com `---`) |
| 3 | `grep -c "^## " skills/security/references/sca-triage.md` | `0` | `>= 8` |
| 4 | `grep -c "api.first.org/data/v1/epss" skills/security/references/sca-triage.md` | `0` | `>= 1` |
| 5 | `grep -c "known_exploited_vulnerabilities.json" skills/security/references/sca-triage.md` | `0` | `>= 1` |
| 6 | `grep -c "reachab" skills/security/references/sca-triage.md` | `0` | `>= 3` |
| 7 | `grep -c "nao verificada" skills/security/references/sca-triage.md` | `0` | `>= 2` |
| 8 | `grep -c "revisar em" skills/security/references/sca-triage.md` | `0` | `>= 1` |
| 9 | `grep -c "sca-triage.md" skills/security/SKILL.md` | `0` | `1` |
| 10 | `grep -c "skills/security/references/sca-triage.md" plugin-manifest.json` | `0` | `1` |

### Checklist

- [ ] Premissa #2 do PRD testada: WebFetch nos dois endpoints, resultado anotado no MEMORY (Passo 2)
- [ ] As 8 secoes `## ` obrigatorias existem, com os nomes do esqueleto do Passo 3
- [ ] A matriz de decisao tem as **9 linhas**, incluindo as 2 de `nao verificado`
- [ ] O limiar de EPSS usado esta escrito no documento e marcado como heuristica configuravel
- [ ] A distincao CVSS / EPSS / KEV aparece explicitamente
- [ ] Secao `## Limites honestos` presente, citando o que a triagem NAO substitui
- [ ] Secao `## Fontes` presente com as 3 URLs e a data de verificacao (G9)
- [ ] Arquivo **sem** frontmatter — `head -1` mostra `# `, nao `---`
- [ ] `git diff skills/security/SKILL.md` mostra **1 linha** alterada, dentro da secao 9 (G7)
- [ ] Harness: `bun run harness:validate` verde (H1 + links resolvem)
- [ ] Suite: `bun run test` sem falhas novas
- [ ] Manifest: entrada nova presente — `grep -c "sca-triage" plugin-manifest.json` retorna `1` (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (RF-03 — o procedimento existe e esta completo):**

```bash
for s in "## Quando usar" "## Passo 1" "## Passo 2" "## Passo 3" "## Passo 4" "## Passo 5" "## Modo offline" "## Limites honestos" "## Fontes"; do
  printf '%s -> ' "$s"
  grep -c "^$s" skills/security/references/sca-triage.md
done
# esperado: cada linha termina em 1
```

**Por maquina (CA-04 — degradacao graciosa documentada):**

```bash
grep -ci "nao verificada" skills/security/references/sca-triage.md   # esperado: >= 2
grep -ci "nunca falhar\|completa mesmo assim" skills/security/references/sca-triage.md  # esperado: >= 1
```

**Por maquina (wire + rastreio):**

```bash
grep -c "sca-triage.md" skills/security/SKILL.md                    # esperado: 1
grep -c "skills/security/references/sca-triage.md" plugin-manifest.json  # esperado: 1
bun run harness:validate                                            # exit 0
```

**Por humano:**
- Um dev que nunca triou um CVE consegue seguir os 5 passos ate uma decisao registrada, sem sair do
  documento.
- O MEMORY registra se EPSS e KEV responderam, com data — a fase-06 depende dessa informacao.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
