# Plano 01: Conhecimento (base das auditorias)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9.5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Pipeline), Plano 03 (Teste dinamico)

---

## O que este plano entrega

As auditorias do plugin ficam mais assertivas **hoje**, sem tocar no pipeline: o scanner de secrets
deixa de ser 5 regexes sobre markdown e passa a cobrir as familias do gitleaks + entropia sobre arquivos
de codigo; a base de conhecimento sai do OWASP 2021 congelado e ganha regua ASVS L1 + procedimento
operacional de triagem de CVE ancorado em feeds vivos (EPSS/KEV); e nasce um `dependency-auditor`
dedicado, com Bash read-only, sem afrouxar o `security-auditor`.

Este plano e 100% **ferramental defensivo** — scanner, checklist, referencia e auditor. Nada ofensivo.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `bun run generate:manifest` funcional | ja no projeto (`scripts/generate-manifest.js`) | pronto |
| Gates de paridade / `bun run harness:validate` | ja no projeto (`scripts/harness-validate.ts`) | pronto |
| Licenca gitleaks (MIT) confirmada | PRD §Premissas #4 — **validar na fase-02** | pendente |
| Licencas OWASP (CC BY-SA) confirmadas | PRD §Premissas #5 — **validar nas fases 03 e 05** | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Vocabulario OWASP 2025 (A01 absorve SSRF, A03 Supply Chain) | Plano 02 fase-01 (secao "Ameacas & Dados" do PRD template) |
| Regua ASVS L1 no checklist minimo | Plano 02 fase-03 (criterio de aceite de seguranca por slice) |
| `skills/security/references/sca-triage.md` | Plano 01 fase-06 (agente) e consultas de `/security` |
| `agents/dependency-auditor.md` + chave `config.auditors.dependencies` | Plano 03 fase-02 (wire dinamico no `verify-work`) |
| Precedente "agente de auditoria com Bash read-only" | Plano 03 (passe dinamico precisa de `curl` sob guardrail) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-secrets-scanner-tracer.md | **[TRACER]** regra `ghp_` + entropia Shannon + escopo de codigo no step 03 (RF-02 parcial, CA-02) | 1.5h | — |
| 02 | fase-02-secrets-scanner-full-rules.md | Port completo das familias gitleaks (AWS secret, GCP, Azure, Slack, chave privada, connection strings) + supressores de falso positivo (RF-02) | 1.5h | fase-01 |
| 03 | fase-03-owasp-2025-checklist.md | `security-checklist.md` na edicao 2025 + correcao das mencoes na `/security` (RF-01, CA-01) | 1h | — |
| 04 | fase-04-sca-triage-reference.md | `references/sca-triage.md` com EPSS + KEV + reachability + modo offline (RF-03, CA-04) | 2h | — |
| 05 | fase-05-asvs-l1-checklist.md | Checklist minimo da `/security` reorganizado sob ASVS L1, sem perder nenhum item (RF-15) | 1.5h | fase-03 |
| 06 | fase-06-dependency-auditor-agent.md | `agents/dependency-auditor.md` (contrato v2.0.0, Bash+WebFetch) + wire no `verify-work` (RF-10) | 2h | fase-04 |

---

## Grafo de Fases

```
  [trilha SCANNER]        [trilha CONHECIMENTO]       [trilha SCA]
                                                            
  fase-01 (tracer)         fase-03 (OWASP 2025)       fase-04 (sca-triage)
   ghp_ + entropia          checklist + skill          EPSS/KEV/reachability
      |                          |                            |
      v                          v                            v
  fase-02 (full rules)     fase-05 (ASVS L1)          fase-06 (dependency-auditor)
   gitleaks completo        checklist minimo           agente + wire verify-work
```

**Paralelismo possivel:** as tres trilhas sao independentes entre si e podem rodar em paralelo
(3 branches). Dentro de cada trilha as fases sao **sequenciais** — tocam o mesmo arquivo.

**Caveat de merge (ler antes de paralelizar):** as fases **03, 04 e 05 editam o mesmo arquivo**
(`skills/security/SKILL.md`), em **regioes disjuntas** (fase-03 = secao 3 + Red Flags; fase-04 = ponteiro
da secao 9; fase-05 = `## Checklist de Seguranca Minima`). Nao ha conflito semantico, mas ha conflito
textual possivel no git se os PRs abrirem da mesma base. Recomendacao: `git pull --rebase` antes de abrir
cada PR dessa trilha. Ver **G7**.

---

## TDD Strategy

```
Ciclo por fase de CODIGO (01, 02, 06):
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck && bun run harness:validate
5. MANIFEST: bun run generate:manifest (arquivo rastreado alterado)
```

```
Ciclo por fase de DOC (03, 04, 05) — TDD nao se aplica:
1. GREP-RED: rodar os greps de aceite ANTES da edicao e registrar que retornam 0 / valor errado
2. EDITAR: aplicar a mudanca de conteudo
3. GREP-GREEN: mesmos greps retornam o valor esperado
4. VERIFY: bun run harness:validate && bun run test (nenhum teste le o conteudo destes docs —
   a suite serve como guarda de nao-regressao de links e frontmatter)
5. MANIFEST: bun run generate:manifest se tocou arquivo rastreado
```

Por que fases de doc nao tem TDD: nao ha unidade de codigo para exercitar. Escrever um teste que
afirme "o arquivo contem a string X" seria um teste tautologico acoplado a prosa — o proprio
`bun run harness:validate` ja e o gate estrutural (H1, frontmatter, links resolviveis). O criterio de
aceite verificavel por maquina dessas fases vive nos greps, nao em `bun test`.

**Tracer Bullet deste plano:** `fase-01-secrets-scanner-tracer`. Prova o caminho mais arriscado do
plano inteiro — alterar codigo **rastreado no manifest**, regenerar o manifest e manter todos os gates
verdes. Se esse caminho fecha, as outras 5 fases sao aditivas de baixo risco.

---

## Gotchas Conhecidos

- **G1 — Manifest inverte o veredito do `/update`.** Alterar arquivo rastreado sem rodar
  `bun run generate:manifest` no mesmo PR faz o `/update` reportar o arquivo como "modificado pelo
  usuario" e recusar a atualizacao. Gotcha conhecida do repo (PRD §Requisitos Nao-Funcionais).
  **Toda fase deste plano toca ao menos um arquivo rastreado.**

- **G2 — Nem tudo que este plano edita e rastreado.** Verificado por grep em `plugin-manifest.json`:
  `skills/init/lib/secrets-scanner.ts`, `skills/security/SKILL.md`, `skills/security/references/*.md`,
  `skills/verify-work/SKILL.md` e `agents/*.md` **sao** rastreados. `docs/references/security-checklist.md`
  **nao e**. Isso NAO dispensa a fase-03 de rodar o manifest — ela tambem edita o `SKILL.md`, que e.

- **G3 — `bun run lint` NAO EXISTE neste repo.** O template de fase sugere esse comando; ignore.
  Scripts reais relevantes: `bun run test`, `bun run typecheck`, `bun run harness:validate`,
  `bun run agents:contract`, `bun run generate:manifest`, e `bun test <caminho>` para um arquivo.
  Formatacao roda sozinha via hook PostToolUse (`bunx biome check --write`).

- **G4 — Ordem de `SECRET_PATTERNS` e prioridade.** `scanSecrets` usa `usedRanges` para suprimir
  matches sobrepostos, e o primeiro padrao do array vence. Regra generica (entropia) **sempre por
  ultimo**, senao ela engole `aws-key`, `jwt`, `stripe-live` e os novos tipos, destruindo a
  classificacao. Fases 01 e 02.

- **G5 — Lookbehind proibido no `secrets-scanner.ts`.** Comentario no proprio arquivo (linha 14):
  "NAO usar lookbehind (compatibilidade com runtimes JS antigos)". Ancorar por palavra-chave a
  esquerda dentro do proprio match, nunca por `(?<=...)`. Fases 01 e 02.

- **G6 — Flag `g` obrigatoria em todo padrao novo.** `scanSecrets` roda `while ((m = re.exec(line)))`.
  Regex sem `g` nunca avanca `lastIndex` → **loop infinito**. Fases 01 e 02.

- **G7 — Tres fases editam `skills/security/SKILL.md`.** Regioes disjuntas (ver o caveat no Grafo de
  Fases), mas rebase antes do PR. Fases 03, 04 e 05.

- **G8 — Os 3 blocos HTML-comment do topo do `skills/security/SKILL.md` sao intocaveis.**
  `profile-aware-preface`, `stack-aware-preface` e `stale-capabilities-check` (linhas 10-80) tem logica
  espelhada em testes e helpers. Nenhuma fase deste plano encosta neles. Fases 03, 04 e 05.

- **G9 — Padrao de atribuicao difere por diretorio.** `skills/security/references/*.md` **nao tem
  frontmatter** — comecam direto com `# Titulo — Referencia Detalhada`. `docs/references/security-checklist.md`
  **tem** (`title`, `source_url`, `last_verified`). Nao introduzir frontmatter onde o padrao nao usa;
  no reference novo, a atribuicao vai numa secao de fontes no rodape. Fases 03 e 04.

- **G10 — `harness-validate` valida o prompt de todo `agents/*.md`.** `checkAgentContracts` exige que o
  texto contenha `contract_version`, `kind`, `status`, `reasoning`, `payload` e a string `"2.0.0"`
  (ou `"1.0"` legado). Todo `.md` fora de `SKILL.md`/`commands/` tambem precisa de **H1** apos
  frontmatter e HTML comments. Agente novo sem isso quebra `bun run harness:validate`. Fase-06.

- **G11 — Agente novo tem 4 pontos de registro alem do proprio `.md`.**
  `config/model-profiles.json` (3 perfis: quality/balanced/budget), `config/verify-work.json`
  (`auditors.*` + `model_profiles.*`), `docs/AGENTS_LIST.md` (linha na tabela + o texto "14 standalone
  subagent auditors" vira 15) e `agents/__fixtures__/<nome>/expected-output.json` + `FIXTURE_NAMES` em
  `skills/lib/subagent-contract.test.ts`. Esquecer qualquer um deixa o agente meio-registrado. Fase-06.

- **G12 — Fixtures de secret sao SINTETICAS, sempre.** PRD §Boundaries "Nunca: commitar secret real
  (mesmo revogado) em fixture ou doc". Usar formato valido com valor inventado
  (`ghp_` + 36 chars digitados a mao). Fases 01 e 02.

- **G13 — Nunca commitar na `main`.** Regra do repo: branch + PR por fase, mesmo em mudanca de doc.

- **GT-01 (pre-existente, nao desta feature).** `bun run typecheck` ja acusa erros em
  `lazy-import.test.ts` e `subagent-contract.ts`. Nao e regressao deste plano — comparar o **delta**,
  nao o valor absoluto.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
