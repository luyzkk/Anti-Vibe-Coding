<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado neste plano devem ter linhagem (autor, data, por quê).
Este arquivo cria um doc (.md), não código de runtime — provenance via cabeçalho/seções.
-->

# Fase 02: Doc Canônico `docs/WORKFLOWS.md`

**Plano:** 01 — Núcleo (Awareness + Detector + Doc + Gate)
**Sizing:** 1.5h
**Depende de:** Nenhuma (paralela à fase-01)
**Visual:** false

**RF:** RF1 · **Decisões:** D7 (nomear /deep-research, "se disponível") / PRD-#10 (parafrasear, não verbatim — linha 10 da tabela Decisões Técnicas do PRD; o CONTEXT vai só até D9) · **Invariantes:** INV2 (camada acima) / INV4 (criar antes de qualquer link) · **Diretriz:** PRIME-DIRECTIVE

---

## O que esta fase entrega

`docs/WORKFLOWS.md` — a fonte de verdade única sobre a fronteira workflow/subagente/skill, que todas as outras superfícies (banner, AGENTS, skills dos Planos 02/03) apenas referenciam.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/WORKFLOWS.md` | Create | Doc canônico. DEVE começar com `# ` (H1) na linha 1 — o harness exige (`harness-validate.ts:511`) e CA-05 verifica |

---

## Implementacao

### Passo 0: invariantes de formato (NÃO negociáveis)

- **H1 na linha 1.** `checkMarkdownFiles` (linha 511 do validador) falha qualquer `.md` (exceto
  SKILL.md/commands) que não comece com `# ` após strip de frontmatter. **Sem frontmatter YAML**
  aqui — começar direto com `# Dynamic Workflows ...`.
- **Links internos resolvíveis.** O link-check (`harness-validate.ts:530-556`) faz `fs.stat` em todo
  `[..](path-relativo)`. Se citar arquivos do repo, usar paths que existem (ex: `docs/PIPELINE.md`,
  `docs/PLANS.md`, `ARCHITECTURE.md`). Links a skills devem ser **texto** (`/deep-research`), não
  markdown-links para arquivos inexistentes.
- **INV4:** este arquivo é criado ANTES de qualquer coisa linkar para ele (a fase-03 adiciona o link
  no AGENTS.md). Por isso fase-02 ⟶ fase-03.

### Passo 1: H1 + parágrafo de enquadramento (complexidade ≠ escala)

Abrir com o insight central do CONTEXT: **complexidade ≠ escala.** Tarefa complexa (multi-domínio,
irreversível) → Claude orquestra turno a turno (`plan-feature`). Workflow só ganha quando o **volume**
estoura o que uma conversa segura. Workflow é a camada **ACIMA** de design-twice/verify-work/execute-plan,
não um substituto (INV2).

### Passo 2: tabela comparativa Subagents × Skills × Workflows (PARAFRASEADA — PRD-#10)

Eixo organizador: **"quem segura o plano"**. NÃO copiar a tabela do CC verbatim (PRD-#10) — reescrever no
estilo do repo. Colunas sugeridas: dimensão | Subagente | Skill | Dynamic Workflow.

| Dimensão | Subagente | Skill (in-context) | Dynamic Workflow |
|---|---|---|---|
| Quem segura o plano | Claude (no turno) | Claude (guiado pela skill) | **Script** (fora do contexto) |
| Onde vivem os resultados | contexto da conversa | contexto da conversa | **variáveis de script** (resumable) |
| Escala típica | 1-poucos | poucos-vários paralelos | **dezenas a centenas** |
| Aprovação de edições | humano/turno | humano/turno | **auto-aprovadas após lançar** |
| Estado entre sessões | não | não (a skill orquestra no turno) | sim (resumable) |

> Parafrasear o conteúdo; a tabela acima é o esqueleto, preencher com as 1-2 linhas de prosa de cada eixo.

### Passo 3: os 5 gatilhos + exemplos canônicos mapeados a sinais

Listar os gatilhos canônicos do CC (varredura/auditoria do codebase inteiro; migração de centenas de
arquivos; pesquisa cross-checada multi-fonte; geração/transformação em massa; plano de muitos ângulos)
e mapear cada um ao **sinal** que o detector usa (espelha `SCALE_PATTERNS` da fase-01, mas em prosa —
**sem repetir o número** `\d{3,}`, INV5). Ex: "migração de 100+/500+ arquivos → sinal: verbo de volume
+ contagem alta".

### Passo 4: 3 padrões de qualidade

- **adversarial-verify** (verificação adversarial entre rascunhos/saídas)
- **multi-angle** (explorar N ângulos divergentes em paralelo)
- **loop-until-dry** (iterar até a fonte secar / convergir)

Mapear cada um à skill in-context análoga (verify-work / design-twice / iterate) como fallback.

### Passo 5: limites operacionais

- ≤ 16 subagentes concorrentes
- até 1000 por run
- **sem input humano no meio** do run
- **edições auto-aprovadas após lançar** (consequência de segurança crítica — ligar à PRIME-DIRECTIVE)

### Passo 6: aviso de CUSTO

Bloco curto e explícito: workflows consomem substancialmente mais tokens; usar só quando o volume
justifica. Espelha a linha de custo da mensagem `[WORKFLOW_ADVISOR]`.

### Passo 7: gate de disponibilidade + degradação graciosa

- Research preview; exige Claude Code **v2.1.154+**.
- Desabilitável via `disableWorkflows` / env (`CLAUDE_CODE_DISABLE_WORKFLOWS`).
- **Degradação graciosa:** toda sugestão de workflow SEMPRE vem pareada com um fallback de skill
  in-context (design-twice/verify-work/plan-feature/`/deep-research` **se disponível**) que funciona
  mesmo com workflows desabilitados. Nomear `/deep-research` com o hedge "(se disponível)" — D7
  (confirmado: NÃO é bundled neste repo; é skill top-level no ambiente do dev).

### Passo 8: caixa PRIME-DIRECTIVE (em negrito)

```markdown
> **PRIME-DIRECTIVE — o plugin SUGERE e pede opt-in pela palavra `workflow`; NUNCA emite a tool
> Workflow nem `decision:block`.** O opt-in é 100% ação humana (a mecânica do Claude Code: a palavra
> `workflow` ou `/effort ultracode`). Esta diretriz é travada por teste de CI
> (`tests/e2e/workflow-advisor-directive.test.ts`), não só por esta prosa.
```

### Passo 9: seção "Workflow vs as skills paralelas existentes"

Distinguir explicitamente os orquestradores **Claude-orquestrados** (design-twice, verify-work,
execute-plan, init-6-explorers — resultados ficam no contexto, escala limitada, sem estado entre
sessões) de um **workflow** (script-orquestrado, resultados em variáveis de script, dezenas-centenas,
resumable). Reforçar INV2 (camada acima, offer-alongside / keep-separate, nunca substitui) e INV8
(STATE.md/MEMORY.md do execute-plan ≠ variáveis de script do workflow — não unificar). Nomear
`/deep-research` (com "se disponível") como o caminho concreto de pesquisa cross-checada.

---

## Gotchas

- **G5 do plano (INV4):** este arquivo precisa existir ANTES de a fase-03 linkar para ele, senão
  `broken-link` no harness. Esta fase é independente da fase-01, mas é PRÉ-REQUISITO da fase-03.
- **G3 do plano (INV5/PRD-#10):** **não** copiar a tabela do CC verbatim e **não** colocar o threshold
  numérico (`100+`/`\d{3,}`) na prosa — o número vive só no hook (fase-01). Aqui é tudo semântico.
- **Local (H1):** sem frontmatter; linha 1 = `# `. O validador strip-a frontmatter mas é mais
  simples (e idêntico ao padrão dos outros docs de `docs/`) começar direto no H1.
- **Local (links):** não criar markdown-links para skills (`[/deep-research](...)`) — viram
  `broken-link`. Usar texto puro para comandos de skill.

---

## Verificacao

### TDD

N/A para esta fase — é criação de documentação, não código. A verificação é via `harness:validate`
(link-check + H1) e, transitivamente, pela fase-04 (que assere existência + H1 do arquivo).

### Checklist

- [ ] `docs/WORKFLOWS.md` existe e a linha 1 começa com `# `.
- [ ] Contém: tabela comparativa (parafraseada), 5 gatilhos+exemplos, 3 padrões de qualidade, limites (≤16, 1000/run, sem input no meio, auto-aprovação), aviso de custo, gate de disponibilidade + degradação graciosa, caixa PRIME-DIRECTIVE em negrito, seção "Workflow vs skills paralelas".
- [ ] Nomeia `/deep-research` SEMPRE com "(se disponível)".
- [ ] Zero markdown-links quebrados (todo `[..](path)` resolve via `fs.stat`).
- [ ] Não contém o número `100`/`500`/`\d{3,}` como threshold em prosa (INV5).
- [ ] `bun run harness:validate` passa verde (H1 + link-check do novo arquivo OK).

### Nota (G6)

`bun run lint` não existe (`package.json` sem script `lint`). Para markdown não há lint configurado;
a validação canônica é `bun run harness:validate`.

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` retorna exit 0 com `docs/WORKFLOWS.md` presente.
- `node -e "const fs=require('fs'); process.exit(fs.readFileSync('docs/WORKFLOWS.md','utf8').startsWith('# ')?0:1)"` → exit 0 (H1).
- `node -e "const t=require('fs').readFileSync('docs/WORKFLOWS.md','utf8'); process.exit(t.includes('PRIME-DIRECTIVE') && /deep-research/.test(t) ? 0 : 1)"` → exit 0.

**Por humano:**
- Revisão confirma que a tabela comparativa está **parafraseada** (não copiada verbatim do CC) e que a caixa PRIME-DIRECTIVE comunica inequivocamente "sugere, nunca executa".

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
