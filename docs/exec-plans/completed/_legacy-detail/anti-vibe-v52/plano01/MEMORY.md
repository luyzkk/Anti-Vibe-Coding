# MEMORY — Plano 01: Infraestrutura — Hooks Novos

> Memória viva do plano. Preenchida DURANTE execução com bugs encontrados, decisões tomadas e gotchas descobertos.
> Não editar antes de iniciar execução — este arquivo é escrito pelo executor, não pelo planejador.

---

## Status

- [x] fase-01: file-size-guard hook (commit 99a9391)
- [x] fase-02: grepping-names hook (commit e102d6a)

---

## Bugs Encontrados

Nenhum.

---

## Decisões Tomadas

- **DI-01:** Fase executada sem suite de testes. Hook é código de infraestrutura procedural sem exports unitários testáveis; spec não listou arquivos `*.test.*` como elegíveis.

---

## Gotchas Descobertos

- **GT-01:** Repositório tem `autocrlf` ativo no Windows. Arquivos gerados com LF serão convertidos para CRLF no próximo checkout. Não afeta execução do Node, mas pode gerar diffs de whitespace em fases futuras que editem os mesmos arquivos.
- **GT-02:** `grep -c` no bash retorna exit code 1 quando o padrão não é encontrado (count=0). Verificação de `process.exit(2)` via contagem funciona corretamente — exit code 1 + output "0" confirma ausência do padrão.

---

## Notas de Verificação

- **fase-01:** JSON do hooks.json validado com `node -e "JSON.parse(...)"` → `JSON válido`. PostToolUse tem 3 elementos na ordem: biome → file-size-guard → context-monitor.
- **fase-02:** JSON do hooks.json validado. PreToolUse tem 4 elementos na ordem: tdd-gate → prompt-guard → bun-test → grepping-names.

## Notas para Planos Seguintes

- GT-01/GT-03: autocrlf ativo no Windows converte LF→CRLF nos hooks .cjs após commit. Não afeta execução Node.js.
- Padrão de hook .cjs estabelecido: `require(CLAUDE_PLUGIN_ROOT + '/hooks/nome.cjs')` no hooks.json + `process.nextTick(run)` para PostToolUse / `process.stdin.on('end', run)` para PreToolUse.
- Commits devem ser feitos dentro de `anti-vibe-coding/` (repo git independente).
