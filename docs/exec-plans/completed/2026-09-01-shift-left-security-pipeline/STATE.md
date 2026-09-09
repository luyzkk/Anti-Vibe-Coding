# State: Shift-Left Security no Pipeline Anti-Vibe-Coding

**Plan:** ./PLAN.md
**Phase:** completed
**Current Plan:** 03/3
**Last Updated:** 2026-09-01

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Conhecimento (base das auditorias) | 6 | 6/6 | **completed** |
| 02 | Pipeline (código nasce seguro) | 5 | 5/5 | completed |
| 03 | Teste dinâmico white-box | 2 | 2/2 | completed |

## Progress Global

Fases done: 13/13 (100%)

## Fases concluidas

Todas na branch `feat/secrets-scanner-tracer` (9 commits, PR ainda NAO aberto).

| Fase | Plano | Entrega | Verificacao |
|------|-------|---------|-------------|
| fase-01-secrets-scanner-tracer | 01 | `ghp_` + entropia (2 eixos) + escopo de codigo | CA-02 exato; BUG-01 resolvido |
| fase-02-secrets-scanner-full-rules | 01 | 8 familias gitleaks + supressores por linha | `ssh-rsa` deixa de ser falso positivo |
| fase-03-owasp-2025-checklist | 01 | Top 10 2021 -> 2025 | CA-01 verificado na fonte oficial |
| fase-04-sca-triage-reference | 01 | `references/sca-triage.md` (EPSS + KEV + reachability) | CA-04 offline; endpoints verificados ao vivo |
| fase-05-asvs-l1-checklist | 01 | Checklist sob ASVS 5.0.0 | 40 -> 54 itens, zero perdidos (provado por `comm`) |
| fase-06-dependency-auditor-agent | 01 | `agents/dependency-auditor.md` + wire | 5 pontos de registro; D6 preservada |

**Gates finais do Plano 01:** 1858 pass / 0 fail (267 arquivos, 2 lotes) · `agents:contract` 36 pass ·
`typecheck` exit 0 · `harness:validate` exit 0 (395 markdowns).

## Log

- 2026-09-01: PRD aprovado e overview criado via /plan-feature. Planos detalhados a gerar sob demanda.
- 2026-09-01: Plano 01 detalhado (6 fases, ~9.5h) via subagente isolado.
- 2026-09-01: Plano 02 detalhado (5 fases, ~8h) e Plano 03 detalhado (2 fases, ~3.5h). Planejamento completo — 13 fases, ~21h. Pronto para /execute-plan.
- 2026-09-01: Correcao de fato — `skills/lib/__tests__/universal-principles.test.ts` LE `prd-template.md` e `fase-template.md` (indexOf('Outcomes') < indexOf('Mecanismo'), 'Comment Provenance' literal). O risco #1 do PRD segue baixo, mas o teste existe e restringe a POSICAO da secao nova. Registrado como G7 do Plano 02.
- 2026-09-01: **fase-01 CONCLUIDA** (tracer bullet). BUG-01 encontrado e resolvido em sessao — a regra de entropia da spec derrubava um teste pre-existente; causa raiz e que Shannon mede diversidade, nao imprevisibilidade (monotonica 5.17 > secret real 5.00). Fix: guard de corrida sequencial como eixo independente. Spec da fase corrigida + MEMORY atualizada (DI-1, DI-2, BUG-1, GT-1..3, DEV-1, DEV-2).
- 2026-09-01: GT-3 invalida a premissa GT-01 do README do Plano 01 — `bun run typecheck` retorna exit 0, zero erros. Fases seguintes podem exigir typecheck limpo em absoluto.
- 2026-09-01: Branch `feat/secrets-scanner-tracer` com 3 commits: `chore(hooks)` (bump pendente, isolado), `docs(exec-plans)` (PRD + 3 planos), `feat(security)` (a fase). PR ainda NAO aberto.
- 2026-09-01: **PLANO 01 CONCLUIDO — 6/6 fases**, 9 commits na branch. Correcoes de fato feitas contra a fonte durante a execucao: OWASP e 2025 (injection caiu de #1 para A05; SSRF absorvido em A01), ASVS e **5.0.0** e nao 4.0.3 (reagrupou capitulos, nao so renumerou), licenca OWASP e **CC BY 3.0** e nao CC BY-SA (PRD impreciso), e a API do EPSS devolve numero como **string**.
- 2026-09-01: Metodo — `bun run test` roda em 2 lotes e so o lote 2 aparece no fim do output. Baseline real do repo e **1858 pass**, nao 618. Registrado nas Notas do Plano 01 para nao repetir.
- 2026-09-01: Divida tecnica achada e NAO corrigida (fora de escopo): `subagent-contract.ts` usa `instancePath` (ajv 7+) com runtime `ajv@6.15.0` (`dataPath`) — schema falha certo, mas a mensagem nao nomeia o campo; afeta todos os contratos v2. E warning de frontmatter em `skills/anti-vibe-review/SKILL.md`.
- Proximo: Planos 02 e 03 (podem rodar em paralelo, cada um em sua branch). Ler as "Notas para Planos Seguintes" do `plano01/MEMORY.md` antes.
- 2026-09-01: **Plano 02 CONCLUIDO** (5/5). Fases 01-03 rodaram em paralelo (arquivos disjuntos), 04 e 05 depois. 5 commits em `feat/shift-left-pipeline`. 1872 pass / 0 fail; gate do grill-me intacto em 34 pass.
- 2026-09-01: Gate novo `tests/write-prd-contract.test.ts` (14 assercoes). Duas nasceram vacuas e foram corrigidas; mordida provada por remocao (13/14 falham sem as secoes).
- 2026-09-01: Perda de agentes de background no encerramento da sessao — fase-05 tinha gravado em disco (verificada e commitada), fase-04 nao deixou rastro e foi refeita. Registrado como GT-4 do Plano 02.
- 2026-09-01: Restante: **Plano 03** (2 fases, ~3.5h) — teste dinamico white-box.
- 2026-09-01: **Plano 03 CONCLUIDO** (2/2) e **FEATURE COMPLETA — 13/13 fases**. Guardrail de autorizacao coberto por teste de contrato; mordida provada duas vezes (pelo executor e pelo orquestrador, de forma independente). 1883 pass / 0 fail.
- 2026-09-01: Passe dinamico entra como `## Step 2.5` do verify-work, opt-in (`auditors.dynamic: false`), com degradacao graciosa — sem dev server, registra e segue sem perguntar nem bloquear.
