<!-- 2026-05-20 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port. -->

# Stack-Aware Fixtures

Stubs vazios para o helper `stackAwareInputPaths` validar paths via `fs.access`.

- `empty/` — sem arquivos. Usado em CA-05 (stack nao detectado / fallback null).
- `nextjs-supabase/` — Next.js + Supabase. Stubs cobrem CA-02 (>= 3 paths reais em
  ARCHITECTURE, SECURITY, RELIABILITY). NAO deletar stubs sem regenerar
  `tests/e2e/__golden__/populate-plan-andre-parity.md` (Plano 05 fase-01).
- `rails/` — Rails (Gemfile + app + config). Usado pelo test "Rails-specific paths".

Manter `.gitkeep` em pastas vazias para garantir que ficam no repo.
