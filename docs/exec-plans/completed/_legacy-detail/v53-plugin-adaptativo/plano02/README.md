# Plano 02: Architecture Detector

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1) ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~7.5h
**Depende de:** Plano 01 (Foundation)
**Desbloqueia:** Plano 04 (Modo Dual consome `architectureProfile`)

---

## O que este plano entrega

Skill manual `/anti-vibe-coding:detect-architecture` que classifica um projeto em 1 dos 5 perfis arquiteturais (`clean-architecture-ritual`, `mvc-flat`, `vertical-slice`, `nextjs-app-router`, `unknown-mixed`) via heurística determinística (pastas + amostragem de imports), com confirmação humana quando confiança < 80%, persistência no manifest JSON e geração do markdown legível. Cobre RF1, RF3 e os critérios CA-01 e CA-02 do PRD.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Schema do `architectureProfile` no manifest | Plano 01, fase-01 | pendente |
| Helper `isFeatureEnabled(flag)` (não usado aqui, mas reutilizado pelo Plano 04 que consome este) | Plano 01, fase-03 | pendente |
| Gerador `writeArchitectureProfileMarkdown(profile)` para `.claude/architecture-profile.md` | Plano 01, fase-04 | pendente |
| Documentação dos 5 perfis (referência cruzada) | Plano 01, fase-05 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Função `classifyByFolders(srcTree)` exportada de `lib/architecture-detector/` | Plano 04 (caso queira ré-classificar) |
| Manifest com `architectureProfile` populado em projeto piloto | Plano 04 (helper `readArchitectureProfile`) e Plano 05 (dogfooding) |
| Skill `/detect-architecture` invocável pelo usuário | Plano 05 (rollout em Licitar) |
| Convenção de fixtures de árvore por perfil | Plano 04 fase-02 (testes do recommendation table) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-heuristica-pastas-classificacao-preliminar.md | Função pura `classifyByFolders` com lookup table dos 5 perfis | 1.5h | — |
| 02 | fase-02-heuristica-amostragem-imports-confidence-score.md | Função `sampleImports` + `computeConfidence(0..100)` | 2h | fase-01 |
| 03 | fase-03-skill-detect-architecture-cli.md | SKILL.md `/detect-architecture` com flow + AskUserQuestion | 1.5h | fase-02 |
| 04 | fase-04-persistencia-manifest-e-markdown.md | Helper `writeArchitectureProfile` (JSON + MD idempotente) | 1h | fase-03 |
| 05 | fase-05-cobertura-5-perfis-e2e.md | Suite E2E com fixtures dos 5 perfis (CA-01 explícito) | 1.5h | fase-01 a 04 |

---

## Grafo de Fases

```
fase-01 (classifyByFolders)
    |
    v
fase-02 (sampleImports + confidence)
    |
    v
fase-03 (skill /detect-architecture)
    |
    v
fase-04 (persistencia manifest + md)
    |
    v
fase-05 (E2E 5 perfis)
```

**Paralelismo possivel:** nenhum dentro deste plano — cada fase depende da anterior. Ganho de paralelismo é externo: Plano 02 e Plano 03 (Telemetria) rodam concorrentes após Plano 01 concluir.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste com fixture de árvore (ou input mock) que falha por assertion
2. GREEN: codigo minimo que faz o teste passar (sem prematuras otimizacoes)
3. REFACTOR: extrair lookup table, separar IO de logica pura
4. VERIFY: bun run test --grep '<fase>' && bun run lint && bun run typecheck
```

Estratégia específica do detector:
- **Funções puras primeiro (fase-01, fase-02):** recebem árvore/snippet como parâmetro, sem IO. Testáveis com fixtures inline.
- **IO encapsulado (fase-03, fase-04):** skill orquestra leitura real do `src/` e chama as funções puras. Testes da skill usam fixtures em `tmp/` ou diretório temporário do Bun.
- **E2E (fase-05):** cada perfil tem fixture própria sob `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/<perfil>/`. Roda fluxo completo e assert no manifest + md gerados.

**Tracer Bullet deste plano:** N/A — o tracer bullet do PRD vive em Plano 01 fase-06. Este plano é o primeiro consumidor real.

---

## Gotchas Conhecidos

- **G1: Heurística pode confundir Next.js App Router com vertical-slice.** Next.js usa `app/` na raiz (ou em `src/app/`) e cada rota é uma pasta — superficialmente parece vertical-slice. Discriminador: presença de `app/page.tsx`, `app/layout.tsx` ou `app/[*]/route.ts`. Aplicado na fase-01 (lookup table prioriza `nextjs-app-router` antes de `vertical-slice`).
- **G2: Decisão D10 — confidence < 80% NÃO é fallback automático para `unknown-mixed`.** Mostra preliminar + sinais e pergunta. Falha de UX se a skill decidir sozinha sem perguntar (CA-02).
- **G3: Monorepo é OQ10 do PRD.** Se detector encontrar `packages/` ou `apps/` na raiz, sinaliza gracefully (mensagem "monorepo detectado — Onda 1 não suporta. Rodando detector em `packages/<primeiro>/src/` ou abortando?") em fase-03. NÃO classificar como `unknown-mixed` silenciosamente.
- **G4: Idempotência da persistência.** `writeArchitectureProfile` rodado 2x consecutivas com mesmo perfil deve produzir manifest+md equivalentes (apenas `detectedAt` muda). Garantir em fase-04.
- **G5: Amostragem de imports deve evitar arquivos gigantes.** Se um arquivo amostrado tiver > 500 linhas, lê só primeiras 100 linhas (imports ficam no topo). Performance < 500ms (RNF do PRD).
- **G6: Path canônico do `src/`.** Alguns projetos usam `app/` na raiz (Next.js sem `src/`) ou `lib/` (libs). Detector procura `src/` primeiro; se ausente, tenta `app/`, `lib/`, e em último caso classifica como `unknown-mixed` com confiança baixa e pergunta ao usuário onde está o código.
- **G7: Convenção de skills do plugin.** Helpers de skill são markdown executável em `anti-vibe-coding/skills/lib/<nome>/<arquivo>.md` (ver Plano 01 fase-04 para padrão). NÃO criar `.ts` puro fora de `scripts/`. Lógica TypeScript embarcada em blocos de código markdown — convenção do plugin (ver lição "Instrucoes executaveis em SKILL.md pertencem a blocos de codigo" no CLAUDE.md raiz).
- **G8: 5 perfis exatos (D4).** Não inventar perfil novo ("ddd-strategic", "monorepo") — está fora de escopo da Onda 1. Se aparecer caso real, registrar em MEMORY.md como descoberta para Onda 2.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
