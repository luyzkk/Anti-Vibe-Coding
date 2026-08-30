<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado de fonte MIT de terceiro) — sem código de runtime;
provenance vive no frontmatter `sources:`, na entrada do THIRD-PARTY-NOTICES.md (RF7) e
nos comentários deste doc.
-->

# Fase 02: Átomo `debugging-pdb-debugpy.md` (flagged audit D11) + Entrada MIT no NOTICES (RF7)

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** S ~1.5h
**Depende de:** Plano 03 completo (Wave 1 — independente das fases 01 e 03)
**Visual:** false

---

## O que esta fase entrega

Átomo T3 `knowledge/python/atoms/debugging-pdb-debugpy.md` — pdb/breakpoint()/debugpy/
remote-pdb destilado da skill MIT `python-debugpy` (Hermes Agent) com **limpeza total do
contexto proprietário Hermes** (R6, CA-10 grep = zero), **marcado para audit humano
obrigatório** (D11 — executa na fase-06). E a entrada MIT correspondente no
`THIRD-PARTY-NOTICES.md` (RF7), espelhando o formato da entrada Addy Osmani.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/debugging-pdb-debugpy.md` | Create | Átomo T3 destilado + flag de audit humano (G11: NÃO tocar INDEX.md) |
| `THIRD-PARTY-NOTICES.md` (raiz) | Modify | Nova seção `### python-debugpy (Hermes Agent, MIT License)` — derivação + licença verbatim |
| `TODO.md` (raiz) | Modify (condicional) | Excedente do cap 200, se houver (G5) |

---

## Implementacao

### Passo 1: Ler a fonte inteira e mapear o que fica e o que sai

Fonte única (ground truth — congelada, gitignored G1):

- `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-debugpy\SKILL.md`
  (373 linhas, EN; frontmatter declara `license: MIT`, `author: Hermes Agent`,
  `platforms: [linux, macos]`)

**APROVEITÁVEL (destilar):**
- Tabela de escolha de ferramenta (breakpoint()/pdb vs `python -m pdb` vs debugpy) + "comece
  com breakpoint()"
- Tabela de comandos pdb (n/s/r/c/unt/j/l/ll/w/u/d/a/p/pp/display/b/cl/tbreak/!stmt/interact/q)
- `breakpoint()` + env `PYTHONBREAKPOINT` (incl. `PYTHONBREAKPOINT=0` desliga tudo)
- Recipes genéricos: breakpoint local (+ grep pré-commit de `breakpoint()`), lançar script sob
  pdb, pytest `--pdb`/`--trace`/`--showlocals`, post-mortem (pdb.post_mortem, `-m pdb -c
  continue`, excepthook), debugpy remoto DAP (listen/wait_for_client, `-m debugpy`, attach
  `--pid`, ptrace_scope), remote-pdb como alternativa terminal-friendly
- Os 9 pitfalls (runner que captura output, breakpoint em CI, PYTHONBREAKPOINT=0,
  wait_for_client, ptrace hardening, threads, asyncio/await no pdb, env divergente, forks)
- Verification checklist + one-shot recipes (dict/KeyError, teste que só falha na suite,
  deadlock async, post-mortem em subprocess)

**LIMPEZA OBRIGATÓRIA (R6, CA-10 — remover TODA referência, sem exceção):**
- `scripts/run_tests.sh` e o runner hermético — generalizar o pitfall para "runners que
  capturam output / pytest-xdist" (a parte genérica do pitfall FICA; o nome do wrapper SAI)
- `tui_gateway`, `_SlashWorker`, `gateway/run.py`, `hermes --tui`, `run_agent.py`
- Seção **"Debugging Hermes-specific Processes" INTEIRA**
- `<hermes-agent-repo>` em paths, o nome "Attach to Hermes" no launch.json, tags/metadata
  `hermes` do frontmatter proprietário
- A restrição `platforms: [linux, macos]` NÃO é importada (pdb/debugpy funcionam em Windows):
  o átomo simplesmente não declara restrição de plataforma; comandos específicos de Linux que
  a fonte mostra (`ss -tlnp`, `/proc/sys/kernel/yama/ptrace_scope`) permanecem rotulados como
  Linux — NÃO inventar equivalentes Windows que a fonte não fornece (anti-drift).

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/debugging-pdb-debugpy.md destilando EXCLUSIVAMENTE a fonte:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\python-debugpy\SKILL.md

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.

LIMPEZA OBRIGATÓRIA (CA-10 — gate de máquina, tolerância zero):
A fonte mistura conteúdo genérico de pdb/debugpy com contexto proprietário do agente "Hermes".
NENHUMA das strings a seguir pode aparecer no átomo, nem como exemplo, nem como menção:
Hermes, hermes, tui_gateway, _SlashWorker, gateway/run.py, run_agent, run_tests.sh,
"hermes --tui", <hermes-agent-repo>. A seção "Debugging Hermes-specific Processes" é
descartada INTEIRA. Recipes que citam o runner proprietário são generalizados para o
equivalente pytest puro que a própria fonte mostra (ex: o pitfall "pdb sob runner que captura
output/parallel silenciosamente não funciona" fica, atribuído a pytest-xdist/output capture,
sem citar o wrapper). Paths proprietários viram placeholders genéricos (ex: <repo>/.venv).

PLATAFORMA: não importe a restrição platforms do frontmatter da fonte. Comandos Linux-only
que a fonte mostra (ss -tlnp, /proc/sys/kernel/yama/ptrace_scope) permanecem rotulados como
Linux. NÃO invente equivalentes Windows/macOS que a fonte não fornece.

IDIOMA: PT-BR (D1). Fonte em EN — traduza na destilação SEM adicionar conteúdo; a claim
permanece rastreável à passagem original em inglês (G6 — o verifier rastreia paráfrase
cross-idioma). Comandos, flags e nomes de API ficam em EN (breakpoint(), --pdb, wait_for_client).

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção) / ## Critérios de decisão (tabela: situação → ferramenta, derivada da
tabela de escolha da fonte) / ## Referências externas; zero [A DEFINIR]. Logo após o título,
incluir a nota:
"> **Audit humano obrigatório (D11):** este átomo será revisado por Luiz contra a fonte antes
da aprovação do batch final."

DEDUP (G17): knowledge/python/atoms/pytest-and-testing-strategy.md é o dono da estratégia de
testes. Aqui entra só o gancho de debugging (--pdb/--trace/--showlocals, "falha na suite mas
passa isolado"); referencie o átomo de pytest quando tangenciar estratégia.

REGRAS DE CONTEÚDO:
- A nota da fonte sobre await no pdb exigir Python 3.13+ vira nota inline versionada ("3.13+")
- Claims "contestado" NUNCA viram regra dura (G3); divergência de versão → mais recente (G4)

Tudo que ficar de fora por causa do cap: liste ao final da sua resposta como
"EXCEDENTE PARA TODO.md".

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: debugging-pdb-debugpy
stack: python
layer: both
sources:
  - Infos/knowledge/Python/python-debugpy/SKILL.md
tier: 3
triggers: [debug, debugging, pdb, breakpoint, PYTHONBREAKPOINT, debugpy, DAP, remote debug, attach, post-mortem, post_mortem, pytest --pdb, --trace, --showlocals, remote-pdb, set_trace, ptrace, deadlock, step, stack trace]
related_skills: [/tdd-workflow, /design-patterns]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
flagged_for_human_audit: true
---
```

### Passo 3: Gate CA-10 — grep de contexto proprietário (ZERO hits)

```
grep -i "hermes\|tui_gateway\|run_agent\|_SlashWorker" knowledge/python/atoms/debugging-pdb-debugpy.md
```

Resultado esperado: **exit code 1 (zero matches)**. Qualquer hit = defeito bloqueante da fase;
corrigir o átomo antes de seguir (não "excepcionar"). Rodar também o check estrutural padrão
(cap 200, 4 seções, zero `[A DEFINIR]`, validador de frontmatter — o campo extra
`flagged_for_human_audit` passa, G8).

### Passo 4: Entrada MIT no THIRD-PARTY-NOTICES.md (RF7)

Apêndice ao arquivo, espelhando o formato da entrada Addy Osmani (seção "Future expansion" do
próprio NOTICES prevê o append). Conteúdo:

```markdown
### python-debugpy (Hermes Agent, MIT License)

The atom `knowledge/python/atoms/debugging-pdb-debugpy.md` is **distilled** from the
`python-debugpy` skill package (MIT licensed, author "Hermes Agent"). Distillation involves
selecting the generic pdb/debugpy patterns, pitfalls and recipes from the upstream SKILL.md,
translating them to pt-BR in the Anti-Vibe-Coding atom format (frontmatter + 4 mandatory
sections), and **removing all proprietary Hermes-agent context** (internal test runner,
gateway/TUI processes and worker internals). The derivative atom lists the upstream path in
its frontmatter `sources:` field for audit traceability.

**Upstream license declared at:** `Infos/knowledge/Python/python-debugpy/SKILL.md` frontmatter
(`license: MIT`, `author: Hermes Agent`). The `Infos/` directory is `.gitignore`-d as reference
material; the package ships no separate LICENSE file, so the canonical MIT license text is
reproduced below with the declared author as copyright holder.

#### MIT License:

```
MIT License

Copyright (c) Hermes Agent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
```

Inserir a seção ANTES de `## Future expansion` (manter o arquivo único como NOTICES canônico).

### Passo 5: NÃO commitar isoladamente

Wave 1 = 1 commit (fases 01-03 + este NOTICES). `bun run harness:validate` antes (G10).

---

## Gotchas

- **G20 do plano (crítico):** a limpeza não é "trocar o nome" — é remover o contexto. Um
  recipe que só faz sentido com o gateway proprietário sai inteiro; um pitfall genérico que a
  fonte exemplifica com o wrapper fica, generalizado. Na dúvida, cortar (o átomo é T3).
- **Local — NOTICES sem ano de copyright:** o upstream não fornece LICENSE nem ano — a entrada
  usa `Copyright (c) Hermes Agent` (autor declarado no frontmatter), SEM inventar ano. Se o
  audit humano (fase-06) preferir outra redação, ajustar lá — a obrigação MIT é preservar
  notice + permission notice, e a fonte só nos dá o frontmatter como notice.
- **Local — nome de string do CA-10 no PRD:** o grep canônico do PRD/checklist usa
  `hermes|tui_gateway|run_agent|_SlashWorker`; o prompt do extrator proíbe um superset
  (inclui gateway/run.py, run_tests.sh, hermes --tui). O gate de máquina é o grep do PRD;
  o superset é defesa em profundidade.
- **G8 do plano:** `flagged_for_human_audit: true` passa no validador (campos desconhecidos
  são ignorados) — confirmar mesmo assim rodando o validador.
- **G6 do plano:** fonte EN → tradução sem adicionar conteúdo; o verifier da fase-05 rastreia
  a paráfrase cross-idioma até a passagem original.
- **G17 do plano:** estratégia de testes mora em `pytest-and-testing-strategy` — aqui só o
  gancho de debugging.
- **G1 do plano:** nada de `Infos/` no commit — o SKILL.md upstream NÃO entra no repo; só o
  átomo destilado e a entrada de NOTICES.

---

## Verificacao

### TDD (adaptado — conteúdo)

- [ ] **CHECK ESTRUTURAL:** cap ≤200, 4 seções, zero `[A DEFINIR]`, validador verde (com a flag)
- [ ] **GATE CA-10:** grep proprietário = zero hits (Passo 3)
- [ ] **GATE DE FIDELIDADE:** adiado para fase-05; **GATE HUMANO:** fase-06

### Checklist

- [ ] Átomo existe, PT-BR, `sources:` com o path do SKILL.md, `tier: 3`,
      `flagged_for_human_audit: true` + nota de audit no corpo
- [ ] `grep -i "hermes\|tui_gateway\|run_agent\|_SlashWorker"` no átomo → **zero** (CA-10)
- [ ] Seção "Debugging Hermes-specific Processes" NÃO deixou rastro (nenhum recipe órfão de
      gateway/worker)
- [ ] Nenhuma claim de suporte de plataforma inventada; comandos Linux-only rotulados
- [ ] Tabela de comandos pdb e tabela de escolha de ferramenta presentes (núcleo aproveitável)
- [ ] `THIRD-PARTY-NOTICES.md` com a seção python-debugpy: derivação declarada + path da fonte
      local gitignored + licença MIT verbatim (antes de "Future expansion")
- [ ] Nenhuma linha tocada em `INDEX.md` (G11)
- [ ] `bun run harness:validate` verde (antes do commit da wave)

---

## Criterio de Aceite

**Por maquina:**
- `grep -i "hermes\|tui_gateway\|run_agent\|_SlashWorker" knowledge/python/atoms/debugging-pdb-debugpy.md`
  retorna zero matches (CA-10)
- `validateAtomFrontmatter` retorna `{valid: true, errors: []}`; corpo ≤200 linhas
- `grep -c "python-debugpy" THIRD-PARTY-NOTICES.md` ≥ 1 (RF7)

**Por humano (review da wave + fase-06):**
- Leitura confirma que os recipes generalizados continuam executáveis num projeto Python
  qualquer (nada depende de infra que o leitor não tem)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
