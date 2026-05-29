<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado neste plano devem ter linhagem (autor, data, por quê).
NÃO aplicar em código de runtime do plugin. Esta fase edita AGENTS.md (doc) e hooks.json (config).
-->

# Fase 03: Linha no AGENTS + Cláusula no Banner SessionStart

**Plano:** 01 — Núcleo (Awareness + Detector + Doc + Gate)
**Sizing:** 1h
**Depende de:** fase-02 (o alvo do link, `docs/WORKFLOWS.md`, precisa existir — INV4)
**Visual:** false

**RF:** RF2 (AGENTS) + RF3 (banner) · **Decisões:** D9 (rename da tag) · **Invariantes:** INV3 (AGENTS cap 70, só 1 linha) / INV4 (WORKFLOWS.md antes do link)

---

## O que esta fase entrega

Consciência permanente de workflow: uma linha na tabela "When to Read What" do `AGENTS.md` apontando para `docs/WORKFLOWS.md`, e uma cláusula curta "Workflows dinâmicos" no banner SessionStart.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `AGENTS.md` | Modify | +1 linha na tabela "When to Read What" (após a linha do AGENTS_LIST, linha 43) → `docs/WORKFLOWS.md`. Garantir ≤ 70 linhas após |
| `hooks/hooks.json` | Modify | Anexar cláusula "Workflows dinâmicos" ao `printf` do SessionStart (linha 13), após o bloco da tabela Akita; renomear a tag para v5.1 |

---

## Implementacao

### Passo 1: linha no AGENTS.md (RF2 / INV3)

A tabela "When to Read What" vai das linhas 40 a 56. A linha do AGENTS_LIST é a **linha 43**:

```
| Listing available subagent auditors | `docs/AGENTS_LIST.md` |
```

Inserir a nova linha **logo após** a linha 43:

```
| When a task is scale (codebase-wide audit, 100s of files, cross-checked research) — workflow vs subagent vs skill | `docs/WORKFLOWS.md` |
```

> **INV3 (cap 70):** `AGENTS.md` tem **67 linhas hoje** (medido por `wc -l`). +1 = 68, dentro do
> `AGENTS_MAX_LINES = 70` (`scripts/harness-validate.ts:43`). Confirmar a contagem ANTES e DEPOIS
> (GT-3). NÃO adicionar mais de 1 linha — prosa rica vai para `docs/WORKFLOWS.md`.
>
> **NÃO** adicionar o link à lista `AGENTS_REQUIRED_LINKS` do validador (linhas 49-58): WORKFLOWS.md
> não é um link obrigatório do harness; basta a linha na tabela. O link será validado pelo
> link-check geral (`fs.stat`), por isso INV4 (fase-02 antes).
>
> **NÃO** editar `.claude/CLAUDE.md` nem o root `CLAUDE.md`: ambos deferem ao `AGENTS.md` por
> convenção ("fonte da verdade") + o hook `sync-agents-to-claude.cjs` (PostToolUse) propaga. Editar
> só o AGENTS.md é suficiente (RNF "consistência de mirror" do CONTEXT).

### Passo 2: rename da tag do banner (D9) — buscar referências ANTES

A tag atual está em `hooks/hooks.json` linha 13, início do `printf`:

```
[ANTI_VIBE_CODING v5.0 - SKILL ADVISOR ATIVO]
```

**ANTES de renomear**, confirmar o escopo (GT-4). Grep `SKILL ADVISOR|SKILL_ADVISOR|ANTI_VIBE_CODING v5`
já rodado na exploração retornou 4 arquivos:
- `hooks/hooks.json` — **a tag (renomear aqui)**
- `hooks/user-prompt-gate.cjs` — o marker de runtime `[SKILL_ADVISOR]` no stdout (**string DIFERENTE — NÃO mexer**)
- `docs/.../workflow-awareness/CONTEXT.md` — esta feature (referência)
- `docs/exec-plans/completed/_legacy-detail/.../PRD.md` — histórico (NÃO tocar)

Renomear SÓ a tag:

```
[ANTI_VIBE_CODING v5.1 - SKILL & WORKFLOW ADVISOR ATIVO]
```

### Passo 3: cláusula "Workflows dinâmicos" no banner (RF3)

O banner é uma **única string `printf`** terminando no bloco da tabela Akita:

```
...Quando detectar pedido nos dominios Faz MAL: sinalize o risco e sugira a skill antes de prosseguir.\n'
```

Anexar a cláusula **depois** desse bloco (antes do fechamento `\n'`), curta (R4 — banner já longo;
detalhe vive em `docs/WORKFLOWS.md`). Lembrar: o conteúdo é uma string `printf` JSON-escaped — usar
`\\n` para quebras de linha (como o resto do banner) e evitar aspas que quebrem o JSON.

Texto sugerido (espelha o banner SEMPRE-pergunte + custo + nunca-lançar):

```
\n\nWorkflows dinamicos (escala — dezenas a centenas de agentes coordenados):\n- Para varredura do codebase inteiro, migracao de centenas de arquivos ou pesquisa cross-checada, SUGIRA rodar como dynamic workflow.\n- SEMPRE pergunte antes; workflows consomem substancialmente mais tokens.\n- NUNCA lance a tool Workflow automaticamente — o humano opta incluindo a palavra workflow no pedido.\n- Detalhe e fronteira (workflow vs subagente vs skill): docs/WORKFLOWS.md.
```

> Mantém a simetria com a regra de skill ("SEMPRE pergunte antes de invocar") e reafirma a
> PRIME-DIRECTIVE (nunca lançar). O link a `docs/WORKFLOWS.md` no banner é **texto** dentro de uma
> string printf (não markdown), então não é alvo do link-check do harness — mas o arquivo já existe
> (fase-02), então mesmo se fosse, passaria.

---

## Gotchas

- **G3 do plano (INV3):** confirmar `wc -l AGENTS.md` = 67 antes; 68 depois. Acima de 70 →
  `agents-line-count` failure no harness.
- **G4 do plano (GT-4):** renomear SÓ a tag em hooks.json. O marker `[SKILL_ADVISOR]` no
  `user-prompt-gate.cjs` é outra string — deixar intacto (senão quebra a fase-01 e o advisor de skill).
- **G5 do plano (INV4):** esta fase depende da fase-02. Se rodar antes de `docs/WORKFLOWS.md` existir,
  o link no AGENTS.md vira `broken-link` no `harness:validate`.
- **Local (JSON do hooks.json):** o banner é uma string dentro de JSON. Validar que o arquivo continua
  JSON válido após a edição (aspas, `\\n` escapados). Um `\n` cru ou aspas não escapadas quebra o parse.
- **Local (mirror):** NÃO tocar `.claude/CLAUDE.md` / root `CLAUDE.md` (defer + hook sync).

---

## Verificacao

### TDD

N/A direto — esta fase edita config/doc. A asserção formal vem na fase-04 (AGENTS linka WORKFLOWS.md).
A verificação local é: harness verde + JSON válido.

### Checklist

- [ ] `AGENTS.md` tem 68 linhas (era 67) — `wc -l AGENTS.md`.
- [ ] A linha nova aponta para `docs/WORKFLOWS.md` e está logo após a linha do AGENTS_LIST.
- [ ] `hooks/hooks.json` continua JSON válido: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))"` sem erro.
- [ ] Tag do banner = `[ANTI_VIBE_CODING v5.1 - SKILL & WORKFLOW ADVISOR ATIVO]`.
- [ ] Banner contém a cláusula "Workflows dinamicos" com "NUNCA lance a tool Workflow automaticamente".
- [ ] Marker `[SKILL_ADVISOR]` em `user-prompt-gate.cjs` inalterado.
- [ ] `bun run harness:validate` passa (line-cap ≤70, H1, link-check do novo link OK).
- [ ] `bun run typecheck` limpo (G6 — `bun run lint` não existe).

---

## Criterio de Aceite

**Por maquina:**
- `node -e "const t=require('fs').readFileSync('AGENTS.md','utf8'); process.exit(t.includes('docs/WORKFLOWS.md') && t.split('\n').length<=70 ? 0 : 1)"` → exit 0.
- `node -e "const h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); const b=JSON.stringify(h); process.exit(b.includes('v5.1 - SKILL & WORKFLOW ADVISOR') && b.includes('Workflows dinamicos') ? 0 : 1)"` → exit 0.
- `bun run harness:validate` → exit 0.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
