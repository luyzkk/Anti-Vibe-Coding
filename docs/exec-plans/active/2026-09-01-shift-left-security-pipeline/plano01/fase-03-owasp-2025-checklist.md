<!--
Princípio universal #5 — Comment Provenance.
Fase de documentacao: nao gera codigo. Nenhum comentario inline novo e produzido aqui.
A linhagem desta mudanca vive no frontmatter (`last_verified`, `source_url`) e no PR.
-->

# Fase 03: OWASP Top 10 2021 → 2025 no security-checklist

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 1h
**Depende de:** Nenhuma (paralelizavel com fase-04)
**Visual:** false

---

## O que esta fase entrega

O `docs/references/security-checklist.md` sai da edicao 2021 congelada e passa a refletir o OWASP
Top 10 **2025** — A03 Software Supply Chain Failures, SSRF absorvido em A01, Security Misconfiguration
subindo para #2, a categoria nova de Mishandling of Exceptional Conditions e os renames — e a skill
`/security` para de afirmar que injection e o #1. Fecha RF-01 e CA-01.

---

## Nao ha TDD nesta fase — e por que

Nao existe unidade de codigo para exercitar. Um teste que afirmasse "o arquivo contem a string A03"
seria tautologico e acoplado a prosa: passaria com o conteudo errado desde que a string estivesse la.
O gate estrutural real e o `bun run harness:validate` (H1, frontmatter, links resolviveis), e o
criterio de aceite verificavel por maquina vive nos **greps de antes/depois** do Passo 5.

O ciclo aqui e **GREP-RED → editar → GREP-GREEN**, descrito no README (§TDD Strategy).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/references/security-checklist.md` | Modify | Frontmatter (`source_url`, `last_verified`), tabela Top 10 → 2025, secao nova de Supply Chain, TOC |
| `skills/security/SKILL.md` | Modify | Secao 3 (`OWASP #1`) e `## Red Flags` — **so essas duas regioes** (G7) |
| `plugin-manifest.json` | Modify | Regenerado — o `SKILL.md` e rastreado (G2) |

---

## Implementacao

### Passo 1 — Branch

```bash
git checkout -b docs/owasp-2025-checklist
```

### Passo 2 — VERIFICAR a fonte antes de escrever (obrigatorio)

O PRD §Problema diz que o problema e "conhecimento congelado". Escrever a edicao 2025 de memoria
repetiria exatamente o defeito que a fase existe para corrigir.

Fazer `WebFetch` de `https://owasp.org/Top10/` (e da pagina da edicao 2025 que ela apontar) e
**anotar no MEMORY do plano**: URL canonica, data do fetch, e a lista A01..A10 confirmada, com os
CWEs citados para A03.

Confirmar tambem a licenca (PRD §Premissas #5): conteudo OWASP e CC BY-SA. O uso aqui e **reescrita
propria dos conceitos** com atribuicao via `source_url` no frontmatter — nunca copia de texto literal.

**Se o WebFetch estiver bloqueado:** parar e escalar ao humano. Nao escrever a tabela de memoria.
Esta e a unica fase do plano onde a rede e bloqueante (a fase-04 tem modo offline por design; esta
nao tem, porque o entregavel *e* o conteudo da fonte).

### Passo 3 — Rascunho de trabalho (confirmar contra o Passo 2)

Esta e a lista esperada. **Ela e rascunho, nao fonte** — se o Passo 2 divergir, vale o Passo 2, e a
divergencia vira um DEV-N no MEMORY.

| # | 2025 (esperado) | Vinha de (2021) |
|---|---|---|
| A01 | Broken Access Control — **absorve SSRF** | A01 + A10 (SSRF) |
| A02 | Security Misconfiguration | A05 (subiu de #5 para #2) |
| A03 | **Software Supply Chain Failures** (NOVO/expandido — CWEs 477, 1104, 1329, 1395) | A06 Vulnerable and Outdated Components |
| A04 | Cryptographic Failures | A02 |
| A05 | Injection | A03 |
| A06 | Insecure Design | A04 |
| A07 | **Authentication Failures** (rename) | A07 Identification and Authentication Failures |
| A08 | Software or Data Integrity Failures | A08 |
| A09 | **Logging & Alerting Failures** (rename) | A09 Security Logging and Monitoring Failures |
| A10 | **Mishandling of Exceptional Conditions** (NOVO) | — |

Os tres renames: A06:2021 → A03:2025 (de "componentes vulneraveis" para "falhas de cadeia de
suprimentos"), A07 perde "Identification and", A09 troca "Monitoring" por "Alerting".

### Passo 4 — Editar `docs/references/security-checklist.md`

**4a. Frontmatter** — atribuicao e data de verificacao (G9: este arquivo TEM frontmatter, e o padrao
citado no PRD §Boundaries):

```yaml
---
title: "Security Checklist"
source_url: "<URL canonica da edicao 2025 confirmada no Passo 2>"
last_verified: "2026-09-01"
---
```

**4b. Tabela `## OWASP Top 10 Quick Reference`** — substituir as 10 linhas. Manter a forma
`| # | Vulnerability | Prevention |` (a coluna de prevencao e o que torna a tabela util; uma lista
de nomes seria diminuir). Exemplo do formato para as linhas que mudam de substancia:

```markdown
| # | Vulnerability | Prevention |
|---|---|---|
| A01 | Broken Access Control (inclui SSRF) | Auth em todo endpoint, verificacao de ownership, allowlist de URLs de saida |
| A02 | Security Misconfiguration | Security headers, defaults seguros, superficie minima, debug off em producao |
| A03 | Software Supply Chain Failures | Lockfile versionado, audit de dependencias com triagem, artefatos assinados, CI com permissao minima |
...
| A10 | Mishandling of Exceptional Conditions | Fail-closed, erro generico ao cliente, nenhum caminho de excecao que ignore a checagem de autorizacao |
```

**4c. Secao nova `## Supply Chain`** — A03 e categoria nova e material; a secao
`## Dependency Security` atual so tem tres comandos de audit, o que nao cobre a categoria. Adicionar
apos `## Dependency Security` (nao substituir — regra "nunca diminuir"):

```markdown
## Supply Chain (A03:2025)

- [ ] Lockfile versionado no repositorio e usado no CI (`--frozen-lockfile`)
- [ ] Dependencias novas passam pelo portao de pre-adocao (ver `/security`, "Dependency Discipline")
- [ ] Findings de audit triados, nao apenas listados — procedimento em `skills/security/references/sca-triage.md`
- [ ] Assets de CDN com `integrity` + `crossorigin` (SRI)
- [ ] Actions/steps de CI fixados por SHA, nao por tag movel
- [ ] Token de CI com permissao minima e escopo por job
- [ ] Nenhum script de `postinstall` nao auditado em dependencia direta
```

O ponteiro para `sca-triage.md` cria uma dependencia de link para a **fase-04**. Se a fase-04 ainda
nao mergeou, o link quebra no `harness:validate` (link checker recursivo). Duas saidas: (a) mergear a
fase-04 antes, ou (b) escrever este item sem o link nesta fase e adicionar o link no PR da fase-04.
**Preferir (b)** — mantem as fases independentes. Registrar a escolha no MEMORY.

**4d. Table of Contents** — adicionar `- [Supply Chain](#supply-chain-a032025)` na lista do topo.
Conferir a ancora gerada (o `:` some, o espaco vira `-`).

### Passo 5 — Editar `skills/security/SKILL.md` (duas regioes apenas)

**5a. Secao 3, bloco `<constraints>`** — a linha atual afirma:

> **ORM/prepared statements** — NUNCA SQL com concatenacao/interpolacao de strings (SQL injection e OWASP #1)

Em 2025 injection nao e #1. Corrigir a afirmacao **sem perder a instrucao**:

```markdown
- **ORM/prepared statements** — NUNCA SQL com concatenacao/interpolacao de strings (Injection e A05 no OWASP Top 10 2025; era o #1 ate a edicao 2017)
```

**5b. `## Red Flags`** — adicionar as duas entradas que as categorias novas justificam, sem remover
nenhuma existente:

```markdown
- Dependencia adicionada sem lockfile atualizado no mesmo commit (A03:2025 — Supply Chain)
- `catch` vazio ou `catch` que segue o fluxo feliz apos falha de autorizacao (A10:2025 — Mishandling of Exceptional Conditions)
```

**Nao tocar** em mais nada do `SKILL.md`: os 3 blocos HTML-comment do topo sao intocaveis (G8), a
secao 9 e da fase-04 e o `## Checklist de Seguranca Minima` e da fase-05 (G7).

### Passo 6 — Manifest

```bash
bun run generate:manifest
git diff --stat plugin-manifest.json
```

Necessario apesar de `docs/references/security-checklist.md` **nao** ser rastreado (G2) — porque
`skills/security/SKILL.md` e.

---

## Gotchas

- **G1 / G2 do plano:** o checklist nao e rastreado, o `SKILL.md` e. Rodar o manifest mesmo assim.
- **G7 do plano:** fases 03, 04 e 05 editam o mesmo `SKILL.md`. Esta fase toca **so** a secao 3 e as
  Red Flags. `git pull --rebase` antes de abrir o PR.
- **G8 do plano:** nao encostar nos blocos `profile-aware-preface`, `stack-aware-preface` e
  `stale-capabilities-check` (linhas 10-80).
- **G9 do plano:** este arquivo TEM frontmatter — atualizar `last_verified` e `source_url` faz parte
  do entregavel, nao e detalhe.
- **Local — link checker do `harness:validate` e recursivo.** Referenciar `sca-triage.md` antes da
  fase-04 mergear quebra o gate. Ver a decisao (a)/(b) no Passo 4c.
- **Local — a numeracao 2025 pode divergir do rascunho.** O Passo 2 e a fonte. Divergencia vira DEV-N
  no MEMORY, nao uma edicao silenciosa do plano.
- **Local — "nunca diminuir".** Nenhum item de checklist existente sai nesta fase. A secao
  `## Dependency Security` continua onde esta; `## Supply Chain` e adicao.

---

## Verificacao

### Verificacao de conteudo (substitui TDD)

Rodar **antes** da edicao e registrar a saida (GREP-RED), depois novamente (GREP-GREEN).

| # | Comando | Antes (RED) | Depois (GREEN) |
|---|---------|-------------|----------------|
| 1 | `grep -c "Software Supply Chain Failures" docs/references/security-checklist.md` | `0` | `>= 1` |
| 2 | `grep -c "Mishandling of Exceptional Conditions" docs/references/security-checklist.md` | `0` | `>= 1` |
| 3 | `grep -c "^| A0" docs/references/security-checklist.md` | `0` | `9` |
| 4 | `grep -c "^| A10" docs/references/security-checklist.md` | `0` | `1` |
| 5 | `grep -c "SSRF" docs/references/security-checklist.md` | `1` (linha 10 da tabela antiga) | `>= 1` (agora dentro de A01) |
| 6 | `grep -c 'last_verified: "2026-09-01"' docs/references/security-checklist.md` | `0` | `1` |
| 7 | `grep -c "OWASP #1" skills/security/SKILL.md` | `1` | `0` |
| 8 | `grep -c "A03:2025" skills/security/SKILL.md` | `0` | `1` |
| 9 | `grep -c "^## Supply Chain" docs/references/security-checklist.md` | `0` | `1` |

O par (3)+(4) e o que prova a tabela inteira reescrita: 9 linhas `A0x` + 1 linha `A10` = 10 categorias
na notacao 2025 (a tabela 2021 usava `| 1 |` ... `| 10 |`, sem o prefixo `A`).

### Checklist

- [ ] Fonte OWASP 2025 verificada por WebFetch, com URL + data anotadas no MEMORY (Passo 2)
- [ ] Licenca CC BY-SA confirmada; conteudo e reescrita propria com atribuicao no `source_url`
      (PRD §Premissas #5)
- [ ] Os 9 greps da tabela acima retornam o valor da coluna GREEN
- [ ] Nenhum item de checklist pre-existente foi removido do `security-checklist.md`
      (`git diff` do arquivo nao mostra linha `- [ ]` deletada)
- [ ] Nenhuma Red Flag pre-existente removida do `SKILL.md`
- [ ] `git diff skills/security/SKILL.md` toca **apenas** a secao 3 e `## Red Flags` (G7/G8)
- [ ] TOC do checklist atualizado e a ancora de `## Supply Chain` resolve
- [ ] Harness: `bun run harness:validate` verde (H1, frontmatter, links)
- [ ] Suite: `bun run test` sem falhas novas
- [ ] Manifest: `bun run generate:manifest` + `git diff --stat plugin-manifest.json` nao-vazio (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (CA-01 do PRD, "verificavel linha a linha"):**

```bash
grep -E "^\| A(0[1-9]|10) \|" docs/references/security-checklist.md | wc -l
# esperado: 10

grep -cE "^\| A01 \|.*SSRF" docs/references/security-checklist.md
# esperado: 1  (SSRF absorvido em A01)

grep -cE "^\| A03 \|.*Software Supply Chain Failures" docs/references/security-checklist.md
# esperado: 1

grep -cE "^\| A10 \|.*Mishandling of Exceptional Conditions" docs/references/security-checklist.md
# esperado: 1

grep -c "OWASP #1" skills/security/SKILL.md
# esperado: 0
```

**Por maquina (gates):**
- `bun run harness:validate` → exit 0
- `bun run test` → sem falhas novas
- `git diff --stat plugin-manifest.json` → nao-vazio

**Por humano:**
- A tabela lida de cima a baixo corresponde a lista confirmada no Passo 2, incluindo a ordem.
- O MEMORY do plano registra URL, data do fetch e qualquer divergencia em relacao ao rascunho.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
