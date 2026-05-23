<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Criar `docs/references/init-step-contract.md`

**Plano:** 03 — Pipeline Compound -> Reference
**Sizing:** 1h (S)
**Depende de:** fase-01 (criterio de promocao documentado primeiro — coerencia conceitual: nao se promove antes de definir o criterio)
**Visual:** false

---

## O que esta fase entrega

Reference operacional `docs/references/init-step-contract.md` em formato checklist destilado de 3 compound notes-origem (`2026-05-18-init-self-protection` + `2026-05-18-path-escape-cascade` + `2026-05-18-detector-parser-narrow-happy-path` — esta ultima e a substituta R-NEW-01 para a nao-existente `init-cascade-fix`). Cobre parte de CA-05 e MH-05 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/references/init-step-contract.md` | Create | Reference novo em formato checklist com header `> Origem:` citando as 3 compound notes-origem |

---

## Implementacao

### Passo 1: Reler as 3 compound notes-origem para extrair checklist operacional

Ler integralmente (ja foi feito no planejamento, mas reler para confirmar nada mudou):
- `docs/compound/2026-05-18-init-self-protection.md` — guards do dispatcher contra plugin cache / dev source / marker file
- `docs/compound/2026-05-18-path-escape-cascade.md` — escape Windows mangled em bash -> bun -> JS
- `docs/compound/2026-05-18-detector-parser-narrow-happy-path.md` — detector estreito demais (caminho-feliz canonico) gera falso "greenfield"

Extrair APENAS itens operacionais (verificaveis), nao paragrafos narrativos (R-07 PRD).

### Passo 2: Criar `docs/references/init-step-contract.md`

Conteudo proposto (snippet de referencia — escrever literalmente; ajustar texto se necessario para clareza, mas manter formato checklist e header `Origem`):

```markdown
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
```

### Passo 3: Verificar contagem minima e formato

Confirmar via grep que arquivo:
- Tem header `> Origem:` (Passo 1 do contrato)
- Tem `>= 5` linhas `^- \[ \]` (e checklist real, nao prosa)
- Tem `>= 40` linhas no total (`wc -l`)

---

## Gotchas

- **G1 do plano (R-NEW-01):** Compound note `2026-05-18-init-cascade-fix.md` NAO existe. Substituta confirmada: `2026-05-18-detector-parser-narrow-happy-path.md`. Header `Origem:` cita as 3 corretas. Registrar como DI no MEMORY antes de iniciar a fase (ja registrado no template do MEMORY).
- **G2 do plano (R-03):** Compound notes-origem permanecem intactas. Esta fase apenas LE; nao toca arquivos em `docs/compound/`. Frontmatter sera tocado em fase-05.
- **G3 do plano (R-07):** Formato e CHECKLIST operacional, nao paragrafo narrativo. Se durante a escrita aparecer texto longo explicando "por que" um check existe, mover esse texto para a compound note-origem (caso ja la nao esteja); a reference fica so com o "o que verificar".
- **Local — agrupamento:** O snippet acima agrupa em 7 secoes (validar cwd, hard guards, idempotencia, blast radius, recovery, detector/parser, paths Windows). Esse agrupamento e curatorial — pode ser ajustado para 5-8 secoes durante a escrita real se um item nao se encaixar. Manter quantidade total de `- [ ]` em `>= 20` (o snippet acima ja entrega ~30).
- **Local — links relativos:** `docs/references/<file>.md` linka para `../compound/<file>.md` (sobe um nivel, entra em `compound/`). Validar que o link nao quebra.

---

## Verificacao

### TDD

- [ ] **RED:** Arquivo nao existe.
  - Comando: `test -f docs/references/init-step-contract.md && echo "exists" || echo "missing"`
  - Resultado esperado: `missing`

- [ ] **GREEN:** Apos criar, arquivo existe e satisfaz formato.
  - Comando: `test -f docs/references/init-step-contract.md && echo "exists"`
  - Resultado esperado: `exists`

### Checklist

- [ ] Arquivo criado: `test -f docs/references/init-step-contract.md`
- [ ] Header H1 presente: `grep -E "^# init-step-contract" docs/references/init-step-contract.md` retorna match
- [ ] Header `Origem` presente: `grep -E "^> Origem:" docs/references/init-step-contract.md` retorna match
- [ ] Cita as 3 compound notes corretas: `grep -E "init-self-protection|path-escape-cascade|detector-parser-narrow-happy-path" docs/references/init-step-contract.md` retorna 3 matches
- [ ] Formato checklist (>=5 items): `grep -cE "^- \[ \]" docs/references/init-step-contract.md` retorna `>= 5` (snippet sugerido entrega ~30)
- [ ] Tamanho minimo (>=40 linhas): `wc -l docs/references/init-step-contract.md` retorna `>= 40`
- [ ] Compound notes-origem NAO foram modificadas (so leitura): `git status docs/compound/` nao mostra modificacao em init-self-protection nem path-escape-cascade nem detector-parser-narrow-happy-path
- [ ] Harness verde: `bun run harness:validate` exit 0

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/references/init-step-contract.md` exit 0
- `grep -c "^- \[ \]" docs/references/init-step-contract.md` retorna `>= 5`
- `grep -c "^> Origem:" docs/references/init-step-contract.md` retorna `1`
- `wc -l docs/references/init-step-contract.md | awk '{print $1}'` retorna `>= 40`
- `bun run harness:validate` exit 0

**Por humano:**
- Abrir o arquivo e verificar que cada checklist e ACIONAVEL (engenheiro lendo sabe o que fazer/verificar — nao precisa decidir interpretacao). Se algum item exigir interpretacao, reescrever em forma de verificacao binaria.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
