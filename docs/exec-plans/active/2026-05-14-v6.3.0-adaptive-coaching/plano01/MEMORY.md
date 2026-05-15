# Memória: Plano 01 — Fundação Adaptativa

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Status:** em andamento (3/4 fases)

---

## Decisões de Implementação

- **DI-01** (fase-01): `bun run typecheck` (tsc --noEmit strict) substitui `bun run lint` na verificação pós-GREEN. Projeto não define script `lint` em `package.json`; `typecheck` garante tipagem estática equivalente. Aplicar mesma substituição nas próximas fases.
- **DI-02** (fase-01): `NULL_CONTEXT` exposto como constante de módulo, não `Object.freeze`. TypeScript strict + readonly implícito no contrato consumido bastam para imutabilidade prática; freeze seria over-engineering.
- **DI-03** (fase-02): `.gitignore` usa pattern `discovery/*.json` (não `discovery/`). Glob `*` cobre apenas raiz da pasta — `discovery/_schemas/*.json` permanece tracked. Verificado via `git check-ignore` em ambos os caminhos.
- **DI-04** (fase-03): ADR-0020 adotou frontmatter YAML + seções canônicas do projeto (Context/Decision/Alternatives/Consequences/Reversibility/References), combinando estrutura do ADR-0001/0002 com o conteúdo D1–D10 fornecido no spec da fase. Spec descrevia conteúdo, não formato — convergiu para padrão existente.
- **DI-05** (fase-03): `index.md` ganhou seção nova "Canonical Docs" para indexar `adaptive-coaching-framework.md` + `subagent-contract-v1.md` (este último já existia mas não estava indexado). Também adicionou-se a entrada faltante de ADR-0002 na lista de ADRs (estava órfã).

---

## Bugs Descobertos

<!-- BUG-1: ... -->

---

## Gotchas

- **GT-01** (fase-01): commits durante `/execute-plan` podem absorver renames pré-staged do git index (no caso, 31 renames `active/`→`completed/` do plano anterior `init-migration-mode`). Não rompe atomicidade lógica da fase, mas inflama o diff. Próximas fases: rodar `git status` antes do subagente para detectar staged residual.

---

## Desvios do Plano

- **DEV-01** (fase-01): spec citava `bun run lint`; script não existe no `package.json`. Resolvido via DI-01 (typecheck). Atualizar specs futuras das fases 02/03/04 para citar `typecheck` em vez de `lint`.
- **DEV-02** (fase-03): spec do `index.md` listava "Verbatim original" no template ADR Format; substituído por "References" para refletir o formato real adotado em ADR-0002 e ADR-0020. ADR-0001 mantém "Verbatim original" como herança histórica. Sem impacto funcional — apenas alinha doc ao estado real.

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluídas | 3 |
| Fases com desvio | 2 |
| Bugs encontrados | 0 |
| Retries necessários | 0 |

---

## Notas para Planos Seguintes

- `skills/lib/preface-context.ts` exporta `PrefaceContext` type + `readPrefaceContext(projectRoot: string): PrefaceContext`. Wrapper puro de `readArchitectureProfile` — sem lógica de IO própria.
- Shape estável: `{ profile, language, framework, confidence }`. `language` e `framework` SEMPRE `null` em v6.3.0 (slots reservados para v6.5/v6.6 — não preencher).
- Manifest path resolvido como `path.join(projectRoot, '.anti-vibe-manifest.json')`.
- `NULL_CONTEXT` retornado quando profile ausente: `{ profile: null, language: null, framework: null, confidence: 0 }`.
- Verificação pós-fase: usar `bun run typecheck`, NÃO `bun run lint` (script inexistente).
- **Schemas JSON disponíveis (fase-02):** `discovery/_schemas/capabilities-v1.schema.json` (Plano 02 valida output) e `discovery/_schemas/parity-gaps-v1.schema.json` (Plano 03 valida output). Draft-07, `additionalProperties:false`, `schema_version:"1.0"` (string const).
- **Pasta discovery/ versionada** via `.gitkeep`. Runtime JSONs ignorados via `discovery/*.json`. `_schemas/` permanece tracked (subpasta não capturada pelo glob).
- **capabilities-v1 shape:** `{ capabilities[], coverage_gaps?[], generated_at, profile_at_generation, schema_version }`. Capability: `{ kind, method?, path, handler, owner_path?, confidence, source }`. `method` opcional (jobs/CLIs não têm).
- **parity-gaps-v1 shape:** `{ gaps[], tool_registry_snapshot, generated_at, schema_version }`. Gap: `{ gap_id, task_type, missing_capability, severity, suggestion }`. `tool_registry_snapshot: { mcps?[], builtin_tools?[], subagents?[] }`.
- **ADR-0020 (fase-03)** documenta as 10 decisões arquiteturais da v6.3.0 — fonte canônica para discussões/revisões futuras. Em `docs/design-docs/ADR-0020-adaptive-coaching.md`.
- **adaptive-coaching-framework.md (fase-03)** é o migration guide para autores de skill. Plano 04 deve referenciar este doc nos PRs/commits que adicionarem blocos profile-aware-preface. Em `docs/design-docs/adaptive-coaching-framework.md`.
- **Formato canônico de ADR no projeto:** frontmatter YAML (`adr-id`, `title`, `date`, `status`, `tags`) + seções Context/Decision/Alternatives Considered/Consequences/Reversibility/References. Sem "Verbatim original" em ADRs novos (mantido só em ADR-0001 por herança).
- **index.md de design-docs** tem agora 3 seções: ADRs, Canonical Docs, Core Beliefs. Novos canonical docs (não-ADR) devem ser indexados em Canonical Docs.

---

<!-- Atualizado automaticamente durante execução -->
