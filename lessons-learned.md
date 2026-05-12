# Lições Aprendidas — Anti-Vibe Coding Plugin

Registro de erros, bugs e armadilhas descobertos durante o desenvolvimento do plugin.

## 2026-05-12: Blocos de código em prompts não executam (BUG-02 — DEFERRED)

**Sintoma:**
- Plano 03 (Telemetria Passiva) entregou suite com 224 testes verdes e 10/10 skills "instrumentadas" com blocos TypeScript chamando `writeTelemetryStart`/`End` no topo e fim de cada `SKILL.md`
- 7 dias de uso real do plugin geraram 0 pares de telemetria em `.claude/metrics/YYYY-MM.jsonl`
- O diretório `metrics/` sequer foi criado

**Causa Raiz:**
1. `SKILL.md` é **prompt markdown** consumido pelo agente Claude, não runtime executável
2. Os blocos TypeScript dentro de skill files são lidos como instrução descritiva — o agente não compila nem invoca o código literalmente
3. Para o writer rodar, é necessário um **gatilho externo**: hook `PostToolUse`/`Stop` ou wrapper que invoque o writer via Bun com payload do `CLAUDE_HOOK_CONTEXT`
4. Nenhum desses gatilhos existe em [hooks/hooks.json](hooks/hooks.json) — hooks atuais são `SessionStart`, `UserPromptSubmit`, `PreToolUse` (TDD gate)

**Impacto:**
- CA-11 (≥50 pares válidos via dogfooding) deferred para Onda 2
- 14 dias de janela de dogfooding em Carreirarte → 0 dados úteis
- Suite de testes verdes mascarou o problema: writer testado em isolamento Bun passa; integração nunca foi testada end-to-end

**Lição generalizável:**

> **Testes em isolamento não validam integração.** Se uma função vai ser chamada por um agente LLM consumindo prompts, testar a função diretamente (via runtime) prova apenas que a função funciona — não que o agente a chama. Para validar instrumentação em ambiente LLM-driven, é obrigatório:
>
> 1. **Smoke test end-to-end real:** invocar a skill em ambiente vivo e verificar o efeito colateral (arquivo escrito, log emitido, etc.) — não confiar apenas em testes textuais ou de função isolada
> 2. **Gatilho explícito:** se a função precisa rodar durante uso de skill, configurar hook (`PreToolUse`/`PostToolUse`/`Stop`) ou wrapper que efetivamente dispare o código — blocos de exemplo em SKILL.md não são executados
> 3. **Dogfooding antes de declarar pronto:** rodar a skill instrumentada uma vez e confirmar o output esperado ANTES de marcar a fase como done. Day-0 baseline (CA-11) era exatamente esse smoke test — quando deu 0 linhas, deveria ter levantado bandeira imediatamente, não 7 dias depois.

**Fix Planejado (Onda 2):**
- Par `PreToolUse` + `PostToolUse` em `hooks.json` com `matcher: "Skill"`
- Correlação por `tool_use_id`; estado intermediário em `.claude/metrics/.pending-starts.json`
- Regression test que invoca uma skill real e confere que `metrics/YYYY-MM.jsonl` ganha 2 linhas
- Custo estimado: 4-6h + testes

**Detalhes:** [docs/baseline-v53-onda1.md](docs/baseline-v53-onda1.md) e [.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md](../.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md) (BUG-02).

---

## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)

**Sintoma:**
- Ao rodar `/anti-vibe-coding:init` em projeto com hooks customizados, o hooks.json foi completamente substituído
- Hooks customizados do projeto (doc-enforcement.cjs, design-validator.cjs, etc.) perderam configuração
- Arquivos .cjs do plugin foram copiados para `.claude/hooks/` do projeto (duplicação)

**Causa Raiz:**
1. `plugin-manifest.json` tinha `hooks/hooks.json` com `updateStrategy: "replace"`
2. `plugin-manifest.json` listava arquivos `.cjs` individuais (tdd-gate.cjs, user-prompt-gate.cjs)
3. `skills/init/SKILL.md` NÃO documentava como fazer merge de hooks
4. Implementação estava copiando arquivos cegamente sem merge

**Impacto:**
- Projeto Carreirarte perdeu configuração de hooks customizados
- Hooks duplicados no projeto (deviam estar só no cache do plugin)
- Hook `doc-enforcement.cjs` parou de funcionar

**Fix Aplicado:**
1. Mudou `updateStrategy` de hooks/hooks.json para `"merge"` no manifest
2. Removeu arquivos `.cjs` individuais do manifest (não devem ser rastreados)
3. Adicionou Passo 4 no init skill documentando merge de hooks
4. Criou `skills/lib/hooks-merge-utils.md` com algoritmo de merge
5. Corrigiu manualmente hooks.json do Carreirarte
6. Removeu arquivos `.cjs` duplicados do projeto Carreirarte

**Lição:**
- **Hooks .cjs do plugin NUNCA devem ser copiados para projetos**
  - Eles vivem em `$CLAUDE_PLUGIN_ROOT/hooks/` (cache do plugin)
  - São referenciados via `require(process.env.CLAUDE_PLUGIN_ROOT + '/hooks/nome.cjs')`
- **Hooks customizados do projeto ficam em `.claude/hooks/*.cjs`**
  - São executados via `node .claude/hooks/nome.cjs`
- **hooks.json deve combinar AMBOS via merge**
  - Projeto primeiro, plugin depois
  - Preservar matchers (Write|Edit, Bash)
  - Sempre criar backup antes de merge

**Prevenção:**
- Documentar TODOS os passos de instalação no SKILL.md
- Testar init em projeto com customizações existentes
- Validar que updateStrategy está correto para cada tipo de arquivo
- Arquivos que devem ser merged: CLAUDE.md, rules/*.md, hooks/hooks.json
- Arquivos que devem ser replaced: agents/*.md, skills/*.md, senior-principles.md
- Arquivos que NUNCA devem ser copiados: hooks/*.cjs (do plugin)

**Arquivos Afetados:**
- `plugin-manifest.json` (linha 66-70)
- `skills/init/SKILL.md` (linhas 288-337)
- `skills/lib/hooks-merge-utils.md` (novo)
- Projeto Carreirarte: `.claude/hooks/hooks.json` (corrigido manualmente)

**Commit de Fix:**
<!-- Adicionar hash do commit quando commitado -->

---

## Lições — Anti-Vibe Coding v5.2 (2026-04-21)

### [Armadilha] grep -c retorna exit 1 quando count é zero
**Regra:** Em scripts que usam `grep -c`, tratar exit code 1 + output "0" como resultado válido — não como falha do script.
**Contexto:** `grep -c` retorna exit 1 quando o padrão não é encontrado (count=0). Verificações de `$?` causam falso positivo de erro em código que funciona corretamente.

### [Arquitetura] anti-vibe-coding/ é repositório git independente dentro do repo pai
**Regra:** Executar `git add/commit` de dentro de `anti-vibe-coding/` — nunca do diretório pai.
**Contexto:** Parece subdiretório mas tem próprio `.git/`. Commits feitos no repo pai não registram mudanças no plugin; o histórico fica separado por design.

### [Armadilha] Blocos de código aninhados em SKILL.md precisam de quadruple backticks
**Regra:** Usar ```` ````markdown ```` como fence externo em seções de SKILL.md que contêm triple backticks internos.
**Contexto:** Triple backticks quebram o parser quando aninhados. Rules/*.md diretos não precisam — o problema ocorre apenas em SKILL.md com templates de código dentro de fences.

### [Arquitetura] Padrão de entrada de hooks .cjs difere por tipo de evento
**Regra:** PostToolUse usa `process.nextTick(run)`; PreToolUse usa `process.stdin.on('end', run)`. Inverter causa hook silencioso que nunca executa.
**Contexto:** Claude Code passa contexto via stdin apenas para PreToolUse. PostToolUse recebe via env vars e deve iniciar via nextTick para não bloquear o processo.
