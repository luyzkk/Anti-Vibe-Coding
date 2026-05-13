# Plano 02 — Política Core: Rules + CLAUDE.md

## Visão Geral

Atualiza os arquivos de política core do plugin com as decisões D3 (comentários) e D7 (thresholds de cobertura) do PRD Anti-Vibe Coding v5.2.

**Sizing estimado:** ~2.5h  
**Depende de:** Nenhum (pode correr em paralelo com Plano 01)  
**Desbloqueia:** Plano 03 (skills usam as políticas), Plano 05 (/init usa template), Plano 06 (auditores usam regras)

## Decisões do PRD Aplicadas

### D3 — Política de Comentários (WHY vs WHAT)
- WHY comments: sempre permitidos — proveniência, contexto de decisão, workarounds, bug refs, constraints
- WHAT comments: proibidos — comentário óbvio do que o código já diz
- Não podar comentários que o agente escreveu em refactor — eles carregam intenção
- Docstrings em funções públicas: intenção + 1 exemplo de uso
- Razão: evidência empírica de Akita — comentários de proveniência são contexto de primeira classe para o agente

### D7 — Coverage Thresholds Hardcoded
- Business logic (services, models, domain): ≥95% line coverage
- Global (incluindo integrações mockadas): ≥80% line coverage
- Branch coverage global: ≥70%
- Hardcoded (não configurável) — elimina bikeshedding
- Baseado em evidência empírica de 274 commits reais (Fabio Akita)

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `anti-vibe-coding/rules/code-quality.md` | Atualizar item 8 + nova seção "Política de Comentários" + threshold de função 100L→40L + limite de arquivo |
| `anti-vibe-coding/rules/testing-standards.md` | Nova seção "Coverage Thresholds" |
| `anti-vibe-coding/CLAUDE.md` | Substituir regra de comentários pela política D3 completa |

**Nota:** O `C:\Users\luizf\.claude\CLAUDE.md` global NÃO contém regra de comentários — fase-03 toca apenas o `anti-vibe-coding/CLAUDE.md`.

## Fases

| Fase | Arquivo | Mudança | Status |
|------|---------|---------|--------|
| 01 | `rules/code-quality.md` | Política de comentários D3 + thresholds de tamanho | pending |
| 02 | `rules/testing-standards.md` | Coverage thresholds D7 | pending |
| 03 | `anti-vibe-coding/CLAUDE.md` | Regra de comentários → política D3 | pending |

## Gotchas

- `anti-vibe-coding/` é repositório git independente — commits feitos dentro dele, não no repo pai
- Fase 01: NÃO remover o item "8. Comentarios Inuteis" — atualizar + adicionar seção dedicada
- Fase 03: O `C:\Users\luizf\.claude\CLAUDE.md` global NÃO tem regra de comentários (confirmado em leitura) — modificar apenas o `anti-vibe-coding/CLAUDE.md`
- Sempre ler o arquivo imediatamente antes de editar (old_string pode divergir da memória)
