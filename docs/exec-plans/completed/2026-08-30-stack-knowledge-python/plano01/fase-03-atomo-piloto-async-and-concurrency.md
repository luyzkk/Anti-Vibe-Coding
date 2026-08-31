<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 03: Átomo piloto async-and-concurrency (T1, D10) + commit bundle

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-01 (scaffold existe) e fase-02 (validador aceita python_versions)
**Visual:** false

---

## O que esta fase entrega

Primeiro átomo real da matrix Python — `async-and-concurrency.md` destilado da fonte compass
63884763 com anti-drift + verifier refined ≥80% (RF4, D10) — e o **commit bundle das fases
01+02+03** que deixa `harness:validate` verde. O piloto calibra o protocolo de qualidade que
os Planos 02-04 herdam.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/async-and-concurrency.md` | Create | Átomo piloto T1, corpo ≤200 linhas, 4 seções obrigatórias + Referências externas |
| `knowledge/python/INDEX.md` | Modify | Entradas do piloto: skills, Tier 1 e primeira row da tabela keyword |

Fonte (LOCAL, gitignored — nunca commitada):
`F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md`
— "Modelo de Execução de Python 3.13 + FastAPI: Guia Sênior de Concorrência" (~506 linhas,
15 seções: event loop/GIL/free-threading, TaskGroup vs gather, pitfalls async, task queues,
locks, pooling, streaming, cancellation, backpressure, contextvars, memory model 3.13,
idempotência, scheduling; regras com BOM/RUIM e bloco final de hierarquização por impacto).

---

## Implementacao

### Passo 1: Frontmatter alvo (contrato com o validador da fase-02)

```yaml
---
topic: async-and-concurrency
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md
tier: 1
triggers: [asyncio, TaskGroup, gather, GIL, free-threading, event loop, run_in_executor, contextvars, backpressure, cancellation, semaphore, streaming]
related_skills: [/system-design, /design-patterns, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---
```

`python_versions: ['>=3.11']` porque `asyncio.TaskGroup` é 3.11+ (D7/D9). Padrões
free-threading/JIT DENTRO do átomo levam nota inline "3.13+" no texto — o campo do
frontmatter marca o piso do átomo inteiro, não de cada pattern.

### Passo 2: Estrutura do corpo (espelho EXATO do modelo Rails)

Modelo de formato: `knowledge/rails/atoms/active-record-fundamentals.md`. Seções, na ordem:

1. `## Quando consultar` — 4-6 bullets de use-case (editorial, NÃO auditada pelo verifier)
2. `## Padrões sênior` — cada pattern com **Problema / Padrão / Quando usar / Quando NÃO
   usar** (usar os pares BOM/RUIM da fonte como base dos exemplos)
3. `## Anti-padrões` — **Sintoma / Correção** (pitfalls async da fonte)
4. `## Critérios de decisão` — tabela `| Cenário | Escolha |` (derivar do bloco final de
   hierarquização por impacto da fonte)
5. `## Referências externas` — skills cross-stack + source paths (audit trail RF13; editorial)

Cap: corpo ≤200 linhas (hard — verifier rejeita; arquivo total com frontmatter ≤ ~220).
Material candidato que não couber vira backlog no TODO.md (precedente R8 Next) — NUNCA
espremer removendo "Quando NÃO usar".

### Passo 3: Extração via subagente com anti-drift VERBATIM

Spawnar subagente extrator (`anti-vibe-coding:plan-executor`) com prompt contendo: path da
fonte, frontmatter alvo (Passo 1), estrutura (Passo 2), cap 200 e a cláusula anti-drift.

**REGRA VERBATIM (G8/R8):** a cláusula anti-drift abaixo deve ser copiada LITERALMENTE de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (seção
"Solution") para dentro do prompt do extrator — não parafrasear, não resumir, não traduzir.
Texto canônico (conferir contra o arquivo compound na hora de montar o prompt; o compound é a
fonte de verdade, não esta fase):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, **NÃO escreva**, mesmo que você saiba que é verdade. O
> verifier gate downstream marca como falha qualquer claim não-rastreável ao source — e você
> gastará tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o
> detalhe ou re-leia o source para confirmar."

Incluir também (mesma lição, mesmo arquivo): liberdade explícita de NÃO cobrir tudo do
template se a fonte não fornece material — "se source não documenta o overhead quantitativo
de uma API, descreva a API qualitativamente (como a fonte faz) — não estime números próprios."

Restrições adicionais no prompt do extrator:
- Claims marcadas "contestado" na fonte (campo de confiança) NUNCA viram regra dura — no
  máximo nota em Critérios de decisão com a divergência explícita.
- Divergência de versão entre trechos da fonte: normalizar para a mais recente citada.
- Saída em PT-BR (D1 — a fonte já é PT-BR, destilação direta sem tradução).

### Passo 4: Verifier refined ≥80% (protocolo VERBATIM)

Spawnar verifier (`anti-vibe-coding:plan-verifier`) com acesso ao átomo + à fonte. **REGRA
VERBATIM (G8/R8):** o protocolo de escopo abaixo deve ser copiado LITERALMENTE de
`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` (seção "Prevention",
item 2) para o prompt do verifier — não parafrasear. Texto canônico (conferir contra o
arquivo compound; ele é a fonte de verdade):

> "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Padrões sênior,
> Anti-padrões, Critérios de decisão. ATOM-STRUCTURAL METADATA lives in: Quando consultar
> (use-case framing) and Referências externas (cross-skill linking) — DO NOT evaluate these
> sections for source traceability."

Protocolo: verifier amostra 5 claims técnicas (apenas das 3 seções técnicas), rastreia cada
uma a passagem específica da fonte, reporta X/5. Gate: ≥80% (≥4/5). Também valida: corpo
≤200 linhas, 4 seções obrigatórias presentes, zero placeholder.

**Se <80%:** ciclo de polish — corrigir SÓ as claims reprovadas (rework cirúrgico), re-rodar
verifier. Se 2 ciclos não resolverem, PARAR: reler a fonte e o prompt do extrator do zero
(regra Recuperação de Falhas) e registrar a causa no MEMORY.md — o prompt calibrado aqui é
herdado pelos Planos 02-04.

### Passo 5: Validação de máquina do átomo

```
# frontmatter passa no validador estendido da fase-02
bun -e "import { validateAtomFrontmatter } from './skills/init/lib/atoms-frontmatter-validator'; console.log(JSON.stringify(validateAtomFrontmatter('knowledge/python/atoms/async-and-concurrency.md')))"
# esperado: {"valid":true,"errors":[]}
```

```powershell
(Get-Content knowledge/python/atoms/async-and-concurrency.md | Measure-Object -Line).Lines   # <= 220
```

### Passo 6: Atualizar o INDEX skeleton com o piloto

- `### Para /system-design`, `### Para /design-patterns` e `### Para /architecture`: bullet
  `- **async-and-concurrency** (T1) — {resumo curto das keywords}`
- `### Tier 1`: entrada `` `async-and-concurrency` ``
- `## Por keyword`: primeira row, formato idêntico ao Rails:
  `| asyncio, TaskGroup, GIL, free-threading, contextvars, backpressure | [async-and-concurrency](./atoms/async-and-concurrency.md) |`

### Passo 7: COMMIT BUNDLE (fases 01+02+03)

```
bun test && bun run typecheck && bun run harness:validate
git add knowledge/python/ skills/init/lib/atoms-frontmatter-validator.ts skills/init/lib/atoms-frontmatter-schema.test.ts
git commit -m "feat(python-knowledge): scaffold knowledge/python + validador python_versions + atomo piloto async-and-concurrency (RF1-RF4, D10)"
```

`harness:validate` DEVE estar verde agora — `atoms/` tem 1 `.md` (fecha o G1).

---

## Gotchas

- **G1 do README:** este é o commit que fecha o bundle 01+02+03. Se `harness:validate` falhar
  aqui, NÃO commitar parcial.
- **G2 do README:** `git status` antes do commit — NENHUM path `Infos/` staged. Os `sources:`
  do frontmatter apontam para arquivo gitignored de propósito (audit trail local, RF13).
- **G8 do README:** anti-drift e verifier protocol VERBATIM dos compounds (paths no Passo 3/4).
  Precedente: 2 de 5 extratores do Plano 04 Node injetaram claims plausíveis-mas-fora-da-fonte
  quando o prompt não tinha a cláusula (~30min de rework cada).
- **Local (falso-negativo do verifier):** se o verifier reprovar bullets de "Quando consultar"
  ou "Referências externas", o PROTOCOLO está errado (não o átomo) — reconferir que o texto
  verbatim do escopo entrou no prompt. Foi exatamente o loop v2 do Plano 04 Node.
- **Local (freeze da fonte):** não editar NADA em `Infos/` durante o PRD (Premissa 2). O
  verifier compara contra a fonte intocada.
- **Local:** frontmatter salvo com CRLF é aceito (fase-02 testou), mas manter LF por higiene —
  os demais átomos do repo são LF.

---

## Verificacao

### TDD

Adaptado para conteúdo: o gate desta fase é o verifier, não teste de unidade.

- [ ] **RED equivalente:** verifier rodado sobre o primeiro draft — registrar X/5 real no
      MEMORY.md (mesmo que passe de primeira; o número calibra os próximos batches)
- [ ] **GREEN equivalente:** verifier final ≥4/5 nas 3 seções técnicas

### Checklist

- [ ] Corpo ≤200 linhas; arquivo total ≤220; zero placeholders `[A DEFINIR]`
- [ ] 4 seções obrigatórias + Referências externas presentes, na ordem do modelo Rails
- [ ] Frontmatter: 8 campos Rails + `python_versions: ['>=3.11']` + `sources:` com path
      `Infos/knowledge/Python/compass_artifact_wf-63884763...` (RF13)
- [ ] `validateAtomFrontmatter` retorna `{valid: true, errors: []}` (Passo 5)
- [ ] Prompt do extrator continha a cláusula anti-drift VERBATIM (conferido por diff/quote)
- [ ] Prompt do verifier continha o escopo de seções VERBATIM (conferido por diff/quote)
- [ ] Verifier ≥80% registrado no MEMORY.md (claims amostradas + resultado)
- [ ] Claims "contestado" da fonte não aparecem como regra dura no átomo
- [ ] INDEX atualizado (3 skills + Tier 1 + row keyword) e ainda ≤100 linhas
- [ ] `bun test` + `bun run typecheck` + `bun run harness:validate` verdes
- [ ] Commit bundle feito com as mudanças das fases 01+02+03 juntas

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` verde no commit do bundle (regra `[knowledge-presence]` satisfeita)
- Validador retorna `valid: true` para o piloto

**Por humano:**
- Relatório do verifier no MEMORY.md: ≥4/5 claims técnicas rastreadas a passagens específicas
  da fonte compass 63884763, com as passagens citadas

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
