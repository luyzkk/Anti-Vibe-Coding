# init-step-contract

> Origem: docs/compound/2026-05-18-init-self-protection.md +
> docs/compound/2026-05-18-path-escape-cascade.md +
> docs/compound/2026-05-18-detector-parser-narrow-happy-path.md
>
> Reference operacional. Narrativa esta nas compound notes-origem; aqui sao verificacoes.

Checklist para criar ou modificar Steps no dispatcher `/init` (`skills/init/lib/run-init.ts`
e arquivos em `skills/init/lib/steps/`). Use em PR review de qualquer Step novo
ou edicao em Step existente que toque disco.

## Validar `cwd` antes do dispatcher loop

- [ ] `cwd` resolvido e absoluto (`path.isAbsolute(cwd)`) — abortar se relativo
- [ ] `cwd` existe (`fs.existsSync(cwd)`) — abortar se ausente em vez de criar
- [ ] `cwd` NAO e `/`, `/home`, `C:\`, `D:\` ou outro path sentinel obvio
- [ ] Audit log registra `{cwd, resolvedCwd, source: 'env|arg|cwd-default'}` na primeira
      linha (diagnostico forense quando algo der errado)
- [ ] Source `cwd-default` (fallback para `process.cwd()`) so e aceito com flag opt-in
      explicita; default e abortar com mensagem "cwd nao fornecido" (falha visivel >
      corrupcao silenciosa)

## Hard guards contra rodar contra o proprio plugin

- [ ] Regex contra plugin cache: `cwd` normalizado nao contem
      `plugins/cache/local-plugins/anti-vibe-coding` (variantes win32 com `\` cobertas)
- [ ] Regex contra dev source: `cwd` nao e `f:\Projetos\Anti-Vibe-Coding` (ou caminho
      equivalente do checkout local); excecao apenas com `--allow-self`
- [ ] Marker file soft guard: se `cwd/SKILL.md` E `cwd/lib/run-init.ts` ambos existem,
      abortar com pergunta "isto e intencional?" + sugerir `--force-scaffold-plugin`
- [ ] Mensagem de abort lista QUAL guard disparou (`plugin global cache`, `plugin dev
      source skill dir`, `marker files`) — diagnostico imediato

## Preservar idempotencia em re-runs

- [ ] Step que escreve arquivo verifica `fs.existsSync(target)` antes de sobrescrever
- [ ] Re-rodar Step apos sucesso nao corrompe estado (idempotente por design)
- [ ] Em caso de skip por presenca previa, audit log registra `{step, action: 'skip',
      reason: 'file exists'}`

## Blast radius do destructive merge

- [ ] Step destructive (sobrescreve `CLAUDE.md`, `AGENTS.md`, etc) cria backup em
      `docs/_legacy/<file>.bak.YYYY-MM-DD` ANTES de escrever
- [ ] Step destructive NAO roda sem flag explicita `--destructive` OU sem confirmacao
      interativa (default e dry-run + diff)
- [ ] Step destructive declara explicitamente em `## Affected files` da spec quais
      arquivos serao tocados (auditavel)

## Recovery via `_trash-YYYY-MM-DD-*`

- [ ] Quando user reportar corrupcao, mover artefatos suspeitos para
      `_trash-YYYY-MM-DD-<reason>/` em vez de delete imediato (preserva diagnostico)
- [ ] Cache global do plugin (`C:\Users\<user>\.claude\plugins\cache\local-plugins\
      anti-vibe-coding\<version>\`) e recuperavel via re-`sync-to-global.sh` apos limpar
      o trash
- [ ] Compound note nova registra o incidente em `docs/compound/YYYY-MM-DD-<slug>.md`
      antes de fechar o ticket

## Detector e parser: cobrir variantes de campo conhecidas (nao so caminho-feliz)

- [ ] Detector que varre raiz tambem varre `.claude/` (layout legado v5 vivia la)
- [ ] Probes para legacy listam TODOS os arquivos conhecidos por versao (4 arquivos:
      `decisions.md`, `senior-principles.md`, `architecture-profile.md`,
      `PROJECT_MAP.md`) e diretorios com `entries.length > 0` (5 dirs)
- [ ] Manifest v5 detection le `pluginVersion` e verifica `!startsWith('6.')` —
      backup `.backup-v5.*` e sinal mais forte
- [ ] Regex de extracao de blocos cobre PT-BR alem de EN (`c[óo]digo|coment[áa]rios?|
      testes?|depend[êe]ncias?|observabilidade`) — projetos pt-BR sao comuns no campo
- [ ] Quando detector reporta "vazio/zero/nenhum" em situacao onde usuario esperava
      conteudo, primeira hipotese e "detector estreito demais", nao "input vazio";
      retornar `unknown` em vez de `greenfield` quando ambiguo

## Passar paths Windows entre shells sem mangling

- [ ] Nunca usar `\\\\` em strings de codigo embutido em shell (sinal de "nao sei
      quantos layers vou atravessar" — bash -> bun -> JS consome 3 niveis de escape)
- [ ] Para invocacoes manuais, preferir POSIX path (`/c/Users/...`) +
      `resolveNativeCwd` no codigo (ja implementado em `run-init.ts`)
- [ ] Alternativas confiaveis: (a) arquivo intermediario com `echo path > /tmp/target` +
      `fs.readFileSync`, (b) base64 via `printf %s | base64`, (c) POSIX path direto
- [ ] Sanity check antes de side-effect destrutivo: `console.log({ cwd: opts.cwd })` —
      se path parecer mangled, abortar

## Referencias

- Compound: [init-self-protection](../compound/2026-05-18-init-self-protection.md) — guards do dispatcher
- Compound: [path-escape-cascade](../compound/2026-05-18-path-escape-cascade.md) — escape Windows
- Compound: [detector-parser-narrow-happy-path](../compound/2026-05-18-detector-parser-narrow-happy-path.md) — detector estreito
- Compound: [bash-env-var-scope-and](../compound/2026-05-18-bash-env-var-scope-and.md) — lesson irma (gatilho do incidente)
