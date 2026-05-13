# Plano 06 — Auditores, Advisor e Multi-lang

## Visao Geral

Expansao e refinamento de tres areas do plugin: auditoria de nomes grepáveis no `anti-vibe-review`, enriquecimento do hook advisor com a tabela Akita (faz bem / faz mal), e cobertura multi-linguagem (Python + Ruby) nas rules de qualidade e testes.

**Sizing estimado:** ~3h  
**Status:** planned

## Dependencias

- Plano 02 — regras estabelecidas (code-quality.md já tem threshold 40L e política D3)
- Plano 03 — skills standalone existentes (anti-vibe-review é skill autônoma)
- Plano 04 — pipeline completo (verify-work integra anti-vibe-review)

## Fases

| Fase | Arquivo-alvo | Sizing | Deps |
|------|-------------|--------|------|
| fase-01 | `skills/anti-vibe-review/SKILL.md` | ~0.5h | — |
| fase-02 | `hooks/hooks.json` | ~1h | — |
| fase-03 | `rules/code-quality.md` + `rules/testing-standards.md` | ~1.5h | Plano 02 fase-01 |

## Repo Git

`anti-vibe-coding/` é repositório git independente. Todos os commits devem ser feitos de dentro desse diretório.

## Gotchas

- `hooks.json`: o `printf` do SessionStart é uma string gigante numa única linha. Edição deve ser cirúrgica — não reformatar o arquivo inteiro.
- `code-quality.md`: o Plano 02 fase-01 já adicionou threshold 40L e política D3. Ao editar, usar âncoras que existam no estado pós-Plano02.
- O advisor hook é **instructional** (texto educativo para o modelo), não executa lógica condicional.
- Exemplos multi-lang devem ser concisos (3-5 linhas) — não transformar rules em tutoriais.

## Decisoes PRD Aplicadas

- **D12:** Tabela faz bem/mal no advisor hook
- **D13:** Nomes grepáveis — checklist item com threshold >5 hits não relacionados / >10 = genérico
- **D14:** Cobertura TS/JS + Python + Ruby nos exemplos; formatadores black (Python) e rubocop (Ruby)
