---
title: "Dispatchers that mutate cwd must refuse to run inside their own plugin directory"
category: architecture-gotcha
tags: [dispatcher, init, self-protection, idempotency, blast-radius]
created: 2026-05-18
---

## Problem

O dispatcher `runInit` em `skills/init/lib/run-init.ts` aceita qualquer `cwd` valido e executa os steps (scaffold, link-claude-agents, customize-architecture, etc.) contra ele. Quando uma falha upstream causou `cwd` cair em `process.cwd()` default, e esse `process.cwd()` era o proprio diretorio do plugin (`C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\6.4.1\skills\init\`), o init scaffoldou o **proprio plugin** contra si mesmo:

- `SKILL.md` original (87 linhas) sobrescrito por stub de 3 linhas pelo destructive-merge default
- Criados dentro de `skills/init/`: `.anti-vibe/`, `.claude/`, `.github/`, `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md` (symlink), `README.md`, `TODO.md`, `discovery/`, `docs/`, `package.json`, `scripts/`
- Cache do plugin v6.4.1 ficou inutilizavel; recovery exigiu mover tudo para `_trash-2026-05-18-corrupted-6.4.1/` e re-rodar `sync-to-global.sh`.

Causa raiz arquitetural: **dispatcher confia no caller para passar o `cwd` certo**, sem nenhuma sanity check sobre QUAL diretorio eh. Para um init que destructivamente mescla CLAUDE.md, scaffolda arquivos novos, e roda steps de migracao, isso eh blast radius infinito quando o caller erra (env var nao exportada, path mangled, fallback silencioso para `process.cwd()`).

Categoria do bug: **trusted input boundary missing** — o dispatcher trata `cwd` como input confiavel quando deveria validar.

## Solution

Adicionar guard no `runInit` antes do dispatcher loop, com 3 checks complementares:

1. **Hard guard contra plugin cache**: regex sobre o `cwd` resolvido — se contiver `plugins/cache/local-plugins/anti-vibe-coding` (ou variantes win32 com `\`), abortar com `code: 3` e mensagem explicita. Justificativa: o plugin NUNCA deve rodar contra o proprio cache global; eh sempre erro do caller.

2. **Hard guard contra dev source**: se cwd for o proprio diretorio de desenvolvimento do plugin (`f:\Projetos\Anti-Vibe-Coding`), abortar tambem — exceto se `--allow-self` (flag opt-in para o caso de querer testar o init contra o proprio dev, com aviso amarelo).

3. **Soft guard via marker file**: se `cwd/SKILL.md` existe E `cwd/lib/run-init.ts` existe, eh provavel que estamos dentro do proprio plugin — abortar com mensagem perguntando se foi intencional, sugerir `--force-scaffold-plugin`.

Implementacao em `run-init.ts`:

```typescript
function isPluginInternalPath(cwd: string): { internal: true, reason: string } | { internal: false } {
  const normalized = cwd.replace(/\\/g, '/')
  if (/plugins\/cache\/local-plugins\/anti-vibe-coding/i.test(normalized)) {
    return { internal: true, reason: 'plugin global cache' }
  }
  if (/Anti-Vibe-Coding\/skills\/[^/]+/i.test(normalized) && !normalized.endsWith('/skills')) {
    return { internal: true, reason: 'plugin dev source skill dir' }
  }
  return { internal: false }
}

// No inicio do runInit, antes do dispatcher loop:
const selfCheck = isPluginInternalPath(ctxWithAudit.cwd)
if (selfCheck.internal && ctxWithAudit.flags['allow-self'] !== true) {
  throw new AbortError({
    code: 3,
    reason: `Refusing to run init against the plugin itself (${selfCheck.reason}). ` +
            `cwd=${ctxWithAudit.cwd}. ` +
            `If intentional, pass --allow-self.`,
  })
}
```

## Prevention

- **Dispatchers que mutam disco**: SEMPRE validar o `cwd` antes de qualquer escrita. Lista minima de checks: (a) eh absoluto, (b) existe, (c) NAO eh o proprio plugin/CLI, (d) NAO eh `/`, `/home`, `C:\`, ou outros paths sentinel obvios.
- **Fallback silencioso para `process.cwd()`**: nunca. Se a fonte primaria do cwd (env var, arg) esta ausente, abortar com mensagem em vez de pegar o que estiver disponivel. Falha visivel > corrupcao silenciosa.
- **Marker files como heuristica de "estamos dentro de algo que nao deveriamos tocar"**: testar `SKILL.md` + `lib/<dispatcher>.ts` + `.claude-plugin/plugin.json` para detectar "este eh um plugin Claude Code, nao um projeto cliente".
- **Aplicar o mesmo padrao em outros dispatchers do plugin**: `sync-to-global.sh`, `update`, `scaffold-*` — qualquer skill que faca writes destrutivos contra um `cwd` arbitrario.
- **Audit log de cwd**: a primeira linha do audit log deve registrar `{cwd, resolvedCwd, source: 'env|arg|cwd-default'}` para diagnostico forense quando algo der errado.

## Affected files

- `skills/init/lib/run-init.ts` (precisa do guard — Step 2 do plano `2026-05-18-init-cascade-fix.md`)
- `skills/init/lib/run-init.test.ts` (precisa do teste TDD do guard)
- `scripts/sync-to-global.sh` (vulneravel ao mesmo problema; tambem deveria validar cwd antes de copiar)
- `docs/compound/2026-05-18-bash-env-var-scope-and.md` (lesson irma — env var nao exportada foi gatilho)
- `docs/compound/2026-05-18-path-escape-cascade.md` (lesson irma — escape mangling foi co-fator)
