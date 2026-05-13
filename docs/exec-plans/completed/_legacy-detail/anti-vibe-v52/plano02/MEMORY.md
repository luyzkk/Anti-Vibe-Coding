# MEMORY — Plano 02: Política Core — Rules + CLAUDE.md

Memória viva do Plano 02. Preenchida durante execução.

## Estado das Fases

| Fase | Status | Commit | Observações |
|------|--------|--------|-------------|
| 01 | completed | 51d9888 | threshold 100L→40L + política D3 em code-quality.md |
| 02 | completed | bd46add | coverage thresholds D7 (95/80/70) em testing-standards.md |
| 03 | completed | 631c7bd | política D3 WHY/WHAT em anti-vibe-coding/CLAUDE.md |

## Bugs / Surpresas

Nenhum.

## Decisões Tomadas em Execução

- **DI-01:** Fase-01 executada sem suite de testes (mudança é arquivo .md de regras, não código executável).
- **DI-02 (fase-03):** old_string confirmado exato antes de editar — 4 linhas corresponderam sem divergência.

## Gotchas Descobertos

- **GT-01:** autocrlf ativo no Windows — LF→CRLF em todos os arquivos editados. Não afeta execução, mas gera warnings de git. (Confirmado nas 3 fases.)
- **GT-02:** A seção `### Código` no `anti-vibe-coding/CLAUDE.md` passou de 3 para 6 bullets. Fases futuras que referenciem contagem de linhas dessa seção precisam recalcular.

## Notas para Planos Seguintes

- Política D3 (WHY/WHAT) agora está em 3 lugares: `rules/code-quality.md`, `rules/testing-standards.md` (coverage thresholds D7), e `anti-vibe-coding/CLAUDE.md`. Planos 03-06 devem REFERENCIAR essas regras, não duplicá-las.
- Threshold de função é agora 40L (não 100L). Skills de auditoria (Plano 06) devem usar 40L como referência.
- Todos os commits feitos dentro de `anti-vibe-coding/` (repo git independente) — padrão estabelecido.
