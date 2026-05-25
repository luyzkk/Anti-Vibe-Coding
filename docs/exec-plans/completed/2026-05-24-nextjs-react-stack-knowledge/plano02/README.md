# Plano 02: Atoms Feature-driven Next (em EN) + verifier batch

**Feature:** Next.js + React Stack Knowledge ([PLAN overview](../PLAN.md))
**Fases:** 7 (fase-01 a fase-07)
**Sizing total:** ~11h (6 extracoes content-only + 1 verifier batch)
**Depende de:** Plano 01 (Infra + Detector + Tracer Bullet) — completo
**Desbloqueia:** Plano 03 (Cross-cutting + React + Integrations + INDEX final consolidado)

---

## O que este plano entrega

6 atoms feature-driven em `knowledge/nextjs/atoms/` (em **EN** per D15), destilados de `Infos/knowledge/NextJS/` seguindo o padrão estabelecido pelo piloto `app-router-and-layouts.md` (Plano 01 fase-03). Cobertura: React Server Components, Server Actions, Middleware/Edge, Data fetching + cache layers, Rendering strategies (com secao PPR Next 15+ per D13), e Pages Router migration tips. Verifier refined ao final do batch (fase-07) confirma >=80% rastreabilidade de claims tecnicas a `sources:` (regression do protocolo estabelecido no piloto — R3-A).

Resultado: 6 dos 15 atoms canonicos do PRD entregues, deixando 8 para Plano 03 (cross-cutting + React conceitual + Supabase + INDEX final consolidado).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Matrix folder `knowledge/nextjs/` + `INDEX.md` skeleton EN (cabecalho `# Next.js + React Knowledge — Index` per D16) + `atoms/` diretorio populavel | Plano 01 fase-01 | esperado pronto |
| `THIRD-PARTY-NOTICES.md` (texto MIT + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2) | Plano 01 fase-02 | esperado pronto — Plano 02 NAO toca este arquivo |
| Detector ajustado (StackId `'react'`, `probeReact` anchor `vite.config.{ts,js,mjs}`, mapping `nextjs->nextjs`/`react->nextjs`, `pickStaticMap('react')->NEXTJS_CANDIDATES`) | Plano 01 fase-04 | esperado pronto — necessario para fixture supabase do Plano 03 funcionar, mas Plano 02 nao depende em tempo de execucao (atoms sao markdown puro) |
| Anti-drift clause + verifier refined protocol VALIDADOS no piloto (regression desde Plano 01 fase-03) | Plano 01 fase-03 | esperado pronto — Plano 02 reusa bloco verbatim das duas compound lessons em TODOS os prompts (extratores 01-06 + verifier batch 07) |
| Atom piloto `app-router-and-layouts.md` (T1, <=200 linhas, frontmatter completo, verifier report >=80% rastreabilidade) | Plano 01 fase-03 | esperado pronto — molde de tom/densidade/estrutura para os 6 atoms desta wave |
| Compound lesson anti-drift (cole VERBATIM no prompt dos extratores) | [docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md) | pronto |
| Compound lesson verifier protocol (cole VERBATIM no prompt do verifier batch da fase-07) | [docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md](../../../../docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md) | pronto |
| Material fonte (~900KB em `Infos/knowledge/NextJS/` — 14 deep-research + 6 SKILL.md V2) | repo local (Infos/ no .gitignore) | pronto |
| Padrao de atom em EN (frontmatter + 4 secoes "When to consult" / "Senior patterns" / "Anti-patterns" / "Decision criteria") | Plano 01 fase-03 piloto + [knowledge/nodejs-typescript/atoms/security-stack-specific.md](../../../../knowledge/nodejs-typescript/atoms/security-stack-specific.md) (referencia de `sources:` no frontmatter) + [knowledge/rails/atoms/rails-conventions-and-magic.md](../../../../knowledge/rails/atoms/rails-conventions-and-magic.md) (referencia de estrutura) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 6 atoms feature-driven em `knowledge/nextjs/atoms/` (`react-server-components.md`, `server-actions-and-mutations.md`, `middleware-and-edge.md`, `data-fetching-and-cache.md`, `rendering-strategies.md`, `pages-router-migration-tips.md`) | Plano 03 fase-06 (INDEX final consolidado — mapping `## By Cross-Stack Skill` referencia estes atoms para `/security`, `/react-patterns`, `/api-design`, `/system-design`) |
| Verifier refined report ratificando >=80% rastreabilidade dos 6 atoms (audit trail textual em `verifier-report-plano02.md`) | Plano 03 fase-07 (audit humano Luiz dos 3 atoms flagged R3-B — react-server-components vem deste plano fase-01) |
| Atom `react-server-components.md` (T1, **flagged audit humano R3-B**) — anotado em STATE.md como `pending audit humano` para Plano 03 fase-07 | Plano 03 fase-07 audit humano Luiz |
| Conteudo excedente >200 linhas (se houver — R3-C hard cap) — backlog em `TODO.md` | Iteracoes futuras |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-react-server-components.md | `knowledge/nextjs/atoms/react-server-components.md` (T1, EN, <=200 linhas, **flagged R3-B** audit humano) | M (~2h) | Plano 01 fase-03 (piloto molde + protocolos) |
| 02 | fase-02-server-actions-and-mutations.md | `knowledge/nextjs/atoms/server-actions-and-mutations.md` (T1, EN, <=200 linhas) | M (~2h) | Plano 01 fase-03 |
| 03 | fase-03-middleware-and-edge.md | `knowledge/nextjs/atoms/middleware-and-edge.md` (T1, EN, <=200 linhas) | S (~1.5h) | Plano 01 fase-03 |
| 04 | fase-04-data-fetching-and-cache.md | `knowledge/nextjs/atoms/data-fetching-and-cache.md` (T1, EN, <=200 linhas) | M (~2h) | Plano 01 fase-03 |
| 05 | fase-05-rendering-strategies.md | `knowledge/nextjs/atoms/rendering-strategies.md` (T2, EN, <=200 linhas, frontmatter `next_versions: ['>=15']` per D13, secao PPR marcada) | M (~2h) | Plano 01 fase-03 |
| 06 | fase-06-pages-router-migration-tips.md | `knowledge/nextjs/atoms/pages-router-migration-tips.md` (T3, EN, <=200 linhas) | S (~1h) | Plano 01 fase-03 |
| 07 | fase-07-verifier-refined-batch.md | `verifier-report-plano02.md` (relatorio markdown por atom, decisao APPROVE/REWORK) + STATE.md atualizado com `verified`/`needs-rework` | S (~1h) | fase-01..06 (todos os 6 atoms presentes em `knowledge/nextjs/atoms/`) |

**Sizing total:** 6 extracoes (5 M + 2 S = ~10.5h) + 1 verifier batch (S = 1h) = **~11h** (alinhado com PLAN.md "10-12h").

**Sizing notation:** XS=0.5h / S=1h-1.5h / M=2h. Atoms feature-driven destilados de SKILL.md V2 ja existente + 2-3 deep-research files compoem M (sintese + dedupe + ajuste tom EN). Atoms cobertos por 1 source curto = S.

---

## Grafo de Fases

```
fase-01 (RSC)   fase-02 (server actions)   fase-03 (middleware)   fase-04 (cache)   fase-05 (rendering)   fase-06 (pages migration)
    |                  |                            |                    |                    |                        |
    +------------------+----------------------------+--------------------+--------------------+------------------------+
                                                          |
                                                          v
                                              fase-07 (verifier refined batch)
```

**Paralelismo possivel:** fases 01-06 sao INDEPENDENTES e podem rodar em paralelo via `/execute-plan` wave (subagentes extrator paralelos — cada um isolado com seu source + frontmatter alvo + anti-drift clause verbatim). NAO compartilham arquivos, NAO leem output uma da outra. fase-07 e SEQUENCIAL: aguarda os 6 atoms existirem em disco para o verifier auditar o batch completo.

**Recomendacao pratica:** se executar paralelo, lancar fases 01+02+03 num wave, depois 04+05+06 num segundo wave (limita carga e evita conflito de quota subagente). Se sequencial, ordem livre — sem dependencias entre extracoes.

---

## TDD Strategy

```
Atoms content-only NAO usam ciclo RED-GREEN-REFACTOR classico.
Em vez disso: extracao -> verifier refined -> APPROVE/REWORK por atom.

Ciclo por fase (01-06):
1. EXTRACT: subagente extrator le source(s) + frontmatter alvo + anti-drift clause verbatim
            -> produz atom markdown em knowledge/nextjs/atoms/{nome}.md
2. SELF-CHECK: extrator confirma <=200 linhas + 4 secoes presentes + sources: aponta paths reais
3. (verifier consolidado roda na fase-07)

Ciclo da fase-07 (verifier batch):
1. AUDIT: subagente verifier le os 6 atoms + compound lesson verifier-protocol verbatim
          -> audita APENAS "Senior patterns" + "Anti-patterns" + "Decision criteria"
          -> amostra >=5 claims tecnicas por atom; tenta rastrear cada uma para passagem do source declarado
          -> meta >=80% rastreaveis por atom
2. REPORT: gera verifier-report-plano02.md com 1 secao por atom (APPROVE ou REWORK + razoes)
3. DECIDE: APPROVE -> STATE.md global do plano marca `verified`
            REWORK -> volta a fase correspondente (subagente extrator re-roda com instrucao cirurgica)
```

**Tracer Bullet deste plano:** N/A — o tracer bullet da feature inteira ja foi entregue no Plano 01 fase-05. Plano 02 e escala (replicar o padrao do piloto em 6 atoms novos com quality gate via verifier refined batch).

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Anti-drift clause regression desde Plano 01 fase-03 (R3-A, compound lesson 2026-05-16):** o prompt de TODOS os 6 subagentes extratores (fases 01-06) DEVE conter o bloco "REGRA DE FIDELIDADE" colado VERBATIM do compound lesson [`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md). NAO parafrasear, NAO resumir, NAO simplificar. Se subagente entrega atom com claims plausiveis mas nao-rastreaveis, blocker: rework do prompt antes de re-rodar. Verifier rejeita batch na fase-07 se claims falham >20% rastreabilidade.

- **G2 — Hard cap 200 linhas absoluto (R3-C):** cada atom DEVE ter <=200 linhas (frontmatter + corpo). Se extrator entrega 230 linhas, NAO "aceitar com nota". Re-rodar com instrucao de cortar (priorizar Senior patterns + Anti-patterns + Decision criteria; encolher When to consult + Referencias externas). Conteudo excedente vira backlog em `TODO.md` futuro (R3-C — heranca v6.4+). Verifier conta linhas e rejeita.

- **G3 — Idioma EN per D15:** atoms, INDEX.md, e todas as 4 secoes em EN. Comentarios `.ts` em codigo de producao permanecem PT-BR (padrao do plugin Anti-Vibe-Coding seguindo formato `// 2026-05-24 (Luiz/dev): rationale + ref PRD`). Heterogeneidade entre matrix folders (Rails/Node-TS em PT-BR; Next/React em EN) e DECISAO ARQUITETURAL documentada no preambulo do INDEX.md.

- **G4 — fase-01 (RSC) flagged audit humano R3-B:** ao final da fase-01, anotar em STATE.md global da feature como `pending audit humano Luiz` (sera resolvido no Plano 03 fase-07 junto com `security-stack-specific` + `supabase-integration`). Razao: RSC e o conceito mais novo/contraintuitivo do Next (props serialization, useState proibido, async components) — alto risco de claims plausiveis-mas-nao-rastreaveis mesmo com anti-drift clause. Audit humano e gate adicional.

- **G5 — fase-05 (rendering-strategies) frontmatter `next_versions: ['>=15']` per D13:** o atom inteiro recebe campo `next_versions: ['>=15']` no frontmatter (padrao espelhado de `rails_versions: ['>=8.0']` no Rails wave). A secao PPR e claramente marcada com comentario HTML `<!-- next_versions: >=15 -->` no inicio da secao indicando que PPR especificamente requer Next 15+. As outras estrategias (SSG/SSR/ISR) funcionam em Next 13+, mas o frontmatter no atom inteiro sinaliza que o conteudo PPR contido aqui exige >=15. Isso preserva coesao semantica (D13 razao) e padroniza filtragem por versao futura.

- **G6 — Verifier audita APENAS 3 secoes tecnicas (compound lesson 2026-05-16-verifier-protocol-technical-sections-only):** "When to consult" e "Referencias externas" sao metadata editorial (use-case framing + audit trail) — NAO entram no audit de source-traceability. Verifier amostra >=5 claims SOMENTE de Senior patterns + Anti-patterns + Decision criteria por atom. Threshold: >=80% rastreaveis ao source declarado em `sources:`. Se verifier marcar false-negatives em When to consult, ajustar prompt do verifier (loop foi observado em Plano 04 do Node-TS wave — herancao).

- **G7 — `sources:` no frontmatter aponta para `Infos/knowledge/NextJS/...` mesmo com `Infos/` no .gitignore:** funciona como audit trail textual (paths nao precisam estar committados para a referencia ser valida). Subagente extrator tem acesso local ao material; verifier idem. Documentado em Plano 01 fase-03 G9. Formato: `sources:` aceita lista YAML com `- skill: <name> (caminho relativo da raiz do plugin)` para SKILL.md V2 e `- research: <wf-id> (caminho relativo)` para compass artifacts.

- **G8 — Paralelismo via /execute-plan wave herda anti-drift clause:** cada subagente extrator paralelo recebe sua copia do prompt (inclusive bloco verbatim da compound lesson). Plan-verifier do pipeline confere a presenca do bloco antes de aceitar batch. Se algum subagente "perde" o bloco (truncamento de contexto, edicao manual do prompt antes do lancamento), TODOS os 6 atoms desse wave precisam re-verificacao. Regressao desde piloto = pre-requisito nao-negociavel.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
