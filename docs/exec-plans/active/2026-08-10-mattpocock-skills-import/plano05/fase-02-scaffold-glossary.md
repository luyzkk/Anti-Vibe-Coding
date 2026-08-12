---
fase: 02
plano: 05
status: planned
---

# Fase 02: Scaffold do `GLOSSARY.md` + Ponteiro no `AGENTS.md`

**Plano:** 05 — `domain-modeling`
**Sizing:** ~2h
**Depende de:** fase-01 (o template semente segue o formato definido la)
**Visual:** false

**Decisoes:** DI-12 (`docs/GLOSSARY.md` + linha em "When to Read What")
**Invariantes:** INV-01, INV-02 (a semente precisa ensinar os dois)

---

## O que esta fase entrega

O glossario passa a existir em todo projeto que roda `/init`, e a ser alcancavel pelo mecanismo de
descoberta que o plugin ja usa.

Esta e a parte da resolucao de CO-01 que ficou pendente: DI-12 decidiu **onde** o glossario mora;
esta fase faz ele chegar la.

---

## Arquivos Afetados

**NOVOS**
- `skills/init/assets/templates/docs/GLOSSARY.md.tpl`

**MODIFICADOS**
- `skills/init/lib/template-manifest.ts` — nova entry
- `skills/init/lib/template-manifest.test.ts` — contagem de entries
- `skills/init/assets/templates/AGENTS.md.tpl` — linha em "When to Read What"

**FORA do escopo**
- O `AGENTS.md` **deste** repo — decidir separadamente se dogfoodamos um glossario aqui
- A skill (fase-01), o `decision-registry` (fase-03)

---

## Implementacao

### Passo 0: confirmar a contagem atual

`template-manifest.test.ts` assevera contagem de entries (comentario registra 24, com nota de drift
pre-existente). Ler o numero real **antes** de adicionar, e ajustar para +1. Errar aqui quebra a
suite por um motivo que nao tem nada a ver com glossario.

### Passo 1: o template semente

Nao e arquivo vazio. Precisa ensinar o formato e os dois invariantes, porque quem abre ele pela
primeira vez pode nunca ter rodado a skill:

- Titulo e uma frase sobre o que o arquivo e
- `## Language` com **um exemplo comentado** mostrando termo + definicao + `_Evitar_:`
- Uma linha ensinando INV-01 (glossario e nada mais) e INV-02 (so termos deste dominio)
- Ponteiro para `/anti-vibe-coding:domain-modeling`

Curto. Um placeholder que o dev le em 30 segundos e entende o que preencher.

### Passo 2: entry no manifest

Seguir o shape existente: `{ src: 'docs/GLOSSARY.md.tpl', dst: 'docs/GLOSSARY.md', required: ?, category: ? }`.

Duas decisoes a registrar como DI:

- **`required`** — se `true`, `/init` falha quando o arquivo nao chega; se `false`, e opcional.
  Comparar com como `DESIGN.md` e `CODE_STYLE.md` estao marcados e seguir o vizinho mais proximo
- **`category`** — nao e `canon-andre` (nao vem do harness do Andre). Provavelmente
  `anti-vibe-extension`. Conferir os valores em uso antes de inventar um

### Passo 3: atualizar o teste do manifest

Contagem +1 e, se houver lista explicita de `dst`, adicionar `docs/GLOSSARY.md`.

Verificar tambem se existe teste de arvore de arquivos do greenfield que compara contra golden
(`tests/e2e/__golden__/init-greenfield.tree.json` — o MEMORY do projeto registra que esse golden ja
foi regenerado antes). Se existir, regenerar.

### Passo 4: linha em "When to Read What"

No `AGENTS.md.tpl`, uma linha na tabela — o context pointer, pelas regras do plano01: front-load,
um trigger por branch, sem repetir identidade que o alvo ja carrega.

Gatilho a nomear: precisar falar a lingua do projeto — nomear variavel, funcao ou arquivo; entender
um termo do dominio que aparece no codigo.

O `AGENTS.md` tem cap de linhas checado pelo `harness:validate`. Conferir folga antes de adicionar.

### Passo 5: verificar o link-check

`harness:validate` faz link-check. A linha nova aponta para `docs/GLOSSARY.md`, que agora existe via
scaffold — era exatamente o motivo de escolher semente em vez de criacao preguicosa. Confirmar que
passa num projeto recem-inicializado, nao so neste repo.

---

## Gotchas

- **G1** — Contagem do teste do manifest. Ler o numero real antes (Passo 0).
- **G2** — Golden files do greenfield. O MEMORY do projeto registra regeneracao anterior por causa
  de step novo; mesma classe de quebra.
- **G3** — Cap de linhas do `AGENTS.md` validado pelo harness. Conferir folga.
- **G4** — Template semente virando doc longo. E placeholder: ensina o formato e sai do caminho.
  Um template que explica DDD por 40 linhas e sprawl no projeto-alvo, multiplicado por cada `/init`.
- **G5** — `/init` e idempotente e **nunca sobrescreve** arquivo existente (CA-02 para `CLAUDE.md`).
  Confirmar que a entry nova herda essa protecao — reescrever o glossario de alguem seria destrutivo.

---

## Verificacao

### Checklist

- [ ] `bun test skills/init/lib/template-manifest.test.ts` verde
- [ ] `bun run test` completo verde
- [ ] `bun run harness:validate` verde (link-check da linha nova)
- [ ] Golden do greenfield regenerado se afetado
- [ ] `/init` num tmpdir limpo produz `docs/GLOSSARY.md`
- [ ] Re-rodar `/init` **nao** sobrescreve um `GLOSSARY.md` ja preenchido (G5)
- [ ] Cap de linhas do `AGENTS.md` respeitado
- [ ] Template semente ≤ ~25 linhas (G4)

---

## Criterio de Aceite

**Por maquina:**
- Suite completa verde
- `/init` em tmpdir limpo cria `docs/GLOSSARY.md`
- `/init` rodado 2x com conteudo no glossario preserva o conteudo
- `harness:validate` exit 0

**Por humano:**
- Abrir o `GLOSSARY.md` scaffoldado e saber o que preencher sem abrir a skill
- A linha no `AGENTS.md` diz quando ir la, nao so que o arquivo existe
