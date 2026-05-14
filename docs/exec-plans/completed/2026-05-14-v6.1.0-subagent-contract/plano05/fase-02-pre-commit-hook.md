<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Pre-Commit Hook (husky + prepare)

**Plano:** 05 — Validacao Final + Harness + Unlock /init
**Sizing:** 0.5h
**Depende de:** Nenhuma (paralela a fase-01); externamente depende de fase-01 estar verde para a logica de validacao existir
**Visual:** false

---

## O que esta fase entrega

Husky leve instalado via `bun install` (script `prepare` em package.json) + hook `.husky/pre-commit` que roda `bun run harness:validate` quando algum `agents/*.md` esta staged. Cumpre **RF-SH-05** do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Modify | adicionar `husky` em `devDependencies` + `prepare` script |
| `.husky/pre-commit` | Create | shell script: detectar `agents/*.md` staged, rodar validador se houver |
| `.husky/_/` | Auto-create | husky cria boilerplate via `bunx husky init` (sera commitado ou ignorado conforme husky 9+ recomendacao) |

---

## Implementacao

### Passo 1: Adicionar husky em devDependencies

```bash
bun add -d husky
```

Resultado esperado em `package.json`:

```json
{
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "@types/js-yaml": "^4.0.9",
    "husky": "^9.0.0",
    "typescript": "^5.4.0"
  }
}
```

### Passo 2: Adicionar prepare script

Editar `package.json`:

```json
{
  "scripts": {
    "test": "bun run scripts/run-tests.ts",
    "typecheck": "tsc --noEmit",
    "test:e2e": "bun test tests/e2e/",
    "test:tracer": "bun test tests/e2e/init-tracer-bullet.test.ts",
    "harness:validate": "bun scripts/harness-validate.ts .",
    "compound:check": "bun scripts/compound-check.ts .",
    "new-plan": "bun run scripts/new-plan.ts",
    "state:regenerate": "bun run skills/lib/state-md-generator.ts $PWD",
    "prepare": "husky"
  }
}
```

`prepare` roda automaticamente apos `bun install` — ativa hooks sem comando extra.

### Passo 3: Inicializar husky

```bash
bunx husky init
# cria .husky/pre-commit com um echo padrao + .husky/_/husky.sh
```

### Passo 4: Substituir conteudo de .husky/pre-commit

```bash
#!/usr/bin/env sh
# 2026-05-14 (Luiz/dev): pre-commit hook para v6.1.0 — RF-SH-05 + PRD §Riscos
# (distincao lifecycle vs domain_status confunde autores).
# Se algum agents/*.md esta staged, valida prompts contrato v1 antes do commit.
# Skip rapido quando nao ha alteracao em agents/ — nao penaliza commits em outras areas.

staged_agents=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^agents/[^/]+\.md$' || true)

if [ -z "$staged_agents" ]; then
  exit 0
fi

echo "[pre-commit] Validando contrato v1 em agents/*.md staged..."
bun run harness:validate
status=$?

if [ $status -ne 0 ]; then
  echo ""
  echo "[pre-commit] FALHOU: prompt(s) de agent nao instruem contrato v1."
  echo "[pre-commit] Veja docs/design-docs/subagent-contract-v1.md."
  exit $status
fi
```

Tornar executavel (Windows: nao precisa, git core.fileMode false; Unix: `chmod +x .husky/pre-commit`).

### Passo 5: Documentar no commit que `bun install` ativa o hook

Mensagem de commit (quando for commitar esta fase):

> feat(hooks): pre-commit valida contrato v1 em agents/*.md staged
>
> `bun install` ativa o hook automaticamente via `prepare` script (husky 9).
> Hook so roda quando agents/*.md esta staged — commits em outras areas
> nao sofrem penalidade. CI (.github/workflows/harness.yml) continua sendo
> a blindagem hard; este hook e conforto local.

### Passo 6: Testar manualmente

```bash
# Cenario 1: agent valido staged
bun install # ativa hook
echo "<edit minimo em agents/security-auditor.md>" >> agents/security-auditor.md
git add agents/security-auditor.md
git commit -m "test: should pass" # hook roda harness:validate, deve passar
git reset --soft HEAD~1
git checkout agents/security-auditor.md

# Cenario 2: agent quebrado staged
# editar agents/foo.md removendo "contract_version" (revert depois!)
git add agents/foo.md
git commit -m "test: should fail" # hook deve bloquear com mensagem clara
git reset HEAD agents/foo.md
git checkout agents/foo.md

# Cenario 3: commit fora de agents/
echo "test" >> docs/STATE.md
git add docs/STATE.md
git commit -m "test: should skip" # hook detecta nada em agents/, exit 0 imediato
git reset --soft HEAD~1
git checkout docs/STATE.md
```

---

## Gotchas

- **G-P05-02 (Windows armadilhas):** Husky 9 funciona em Windows via Git Bash (ja vem com Git for Windows). Line endings: garantir que `.husky/pre-commit` seja salvo LF (nao CRLF) — git pode autoconverter. Se `core.autocrlf=true` causar problema, adicionar `* text=auto eol=lf` em `.gitattributes` apenas para `.husky/*`. Em CI Linux, line endings nao importam.
- **G-P05-02 corolario:** Se um dev Windows reclamar que hook nao roda, verificar: (a) `bun install` foi rodado depois desta fase commitada? (b) `git config core.hooksPath` aponta para `.husky` (husky 9 faz auto)? (c) `.husky/pre-commit` tem permissao executavel? Em Windows isso ja vem por padrao via Git Bash.
- **G8 do Plano 01 (Comment Provenance):** Hook script tem comentario com autor/data/PRD ref no topo — ja incluido no snippet acima.
- **Local:** NAO usar `lint-staged` em v6.1.0. Tentacao classica e "rodar so validador no arquivo X staged" — mas `harness-validate.ts` ja itera todos os agents internamente (G-P05-01). Adicionar lint-staged complica setup sem ganho real (overhead < 50ms ja).
- **Local:** Husky **nao** roda hooks em CI (Github Actions). O workflow `harness.yml` ja chama `bun run harness:validate` diretamente. Os dois caminhos de defesa sao complementares: hook = pre-commit local rapido; CI = blindagem hard antes de merge.

---

## Verificacao

### TDD

- [ ] **RED:** Sem o hook ativo, commit com `agents/*.md` quebrado passa
  - Comando: editar `agents/foo.md` removendo `contract_version`, `git add`, `git commit -m "should not pass"`
  - Resultado esperado: commit completa (sem hook ainda)

- [ ] **GREEN:** Apos `bun install` desta fase, mesmo commit bloqueia
  - Comando: idem acima
  - Resultado esperado: `[pre-commit] FALHOU: ...` + commit NAO criado (`git log -1` mostra commit anterior)

### Checklist

- [ ] `husky` em `devDependencies` do `package.json`
- [ ] Script `prepare: "husky"` adicionado
- [ ] `.husky/pre-commit` existe com shebang `#!/usr/bin/env sh`
- [ ] Hook detecta `agents/*.md` staged via `git diff --cached --name-only`
- [ ] Hook chama `bun run harness:validate` apenas se ha agents staged (skip rapido caso contrario)
- [ ] Hook bloqueia commit quando validacao falha
- [ ] Commit em `docs/`/`skills/`/outros NAO dispara validacao
- [ ] `bun install` reativa hook em maquina nova (testar em pasta clone separada)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- Apos `bun install`: `ls .husky/pre-commit` retorna o arquivo
- `git config core.hooksPath` retorna `.husky` (husky 9 auto-config)
- Cenario hook-fails reproduzido manualmente: commit bloqueado quando agent quebrado, ok quando outro arquivo

**Por humano:**
- Mensagem de erro do hook contem nome do agent violador + sugestao de doc canonico

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
