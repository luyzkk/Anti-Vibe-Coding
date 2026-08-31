<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 01: Scaffold knowledge/python/ + INDEX.md skeleton PT-BR

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 0.5h
**Depende de:** fase-00
**Visual:** false

---

## O que esta fase entrega

A 4ª matrix do plugin nasce: `knowledge/python/` com `INDEX.md` skeleton PT-BR (preâmbulo D2
declarando cobertura FastAPI-native) e `atoms/` pronta para receber o piloto — a peça que
elimina a causa do AbortError em `copy-knowledge.ts:81` (RF1 parcial; INDEX final é Plano 04).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/INDEX.md` | Create | Skeleton PT-BR ≤100 linhas: cabeçalho + preâmbulo D2 + 3 seções de layout |
| `knowledge/python/atoms/` | Create | Diretório destino dos átomos (populado na fase-03; git não versiona dir vazio — ver Gotchas) |

Zero mudança em `skills/init/lib/` — `STACK_ID_TO_MATRIX_FOLDER['python'] = 'python'`
(`stack-id-map.ts:55`) já aponta para cá, e `copyKnowledge` (`copy-knowledge.ts:81`) para de
abortar assim que a pasta existir com conteúdo. Não tocar no detector (`detect-stack.ts:147`).

---

## Implementacao

### Passo 1: Criar o INDEX.md skeleton

Espelhar a estrutura do `knowledge/rails/INDEX.md` (cabeçalho + preâmbulo + `## Por Skill
Cross-Stack` + `## Por Tier` + `## Por keyword`), mas em estado skeleton — as entradas de
átomo entram nas fases/planos que criam cada átomo (piloto na fase-03; consolidação final no
Plano 04 fase-04). Conteúdo de partida:

```markdown
<!-- 2026-08-30 (Luiz/dev): INDEX skeleton Plano01 fase-01 — RF1/D2 do PRD stack-knowledge-python. Consolidação final: Plano 04 fase-04. -->

# Python Knowledge — Index

Knowledge sênior Python-native (Python 3.11+, foco 3.13). Átomos de linguagem, typing, testes,
tooling e performance servem qualquer projeto Python; **os padrões web são FastAPI-native** —
projetos Django/Flask aproveitam os átomos de linguagem, mas os de web assumem FastAPI.
Skills cross-stack consomem este INDEX via `getStackKnowledgePreface()` antes do corpo genérico.

---

## Por Skill Cross-Stack

### Para /security

### Para /api-design

### Para /system-design

### Para /design-patterns

### Para /architecture

### Para /infrastructure

### Para /tdd-workflow

---

## Por Tier

### Tier 1 — Todo Python dev sênior precisa

### Tier 2 — Comum em apps de médio porte

### Tier 3 — Niche / opcional

---

## Por keyword

| Keyword | Átomos |
|---|---|

Cobertura Python 3.11+/3.13. Padrões 3.13-exclusivos marcados com `python_versions: ['>=3.13']`
no frontmatter do átomo (TypeIs, free-threading, JIT).
```

Regras do skeleton:
- Cabeçalho EXATO `# Python Knowledge — Index` (paridade com `# Rails Knowledge — Index`).
- Preâmbulo D2 obrigatório: declara "3.11+, foco 3.13" + "padrões web são FastAPI-native".
- As 7 subseções de skill existem desde já (mesmo vazias) — o roteamento CA-05 preenche nelas.
- Tabela `## Por keyword` nasce só com header — o parser `parseTopKeywords`
  (`format-knowledge-preview.ts:34`) já aceita `Por keyword` PT-BR e retorna `[]` com tabela
  vazia (graceful); a primeira row entra na fase-03.
- SEM placeholders `[A DEFINIR]` — seção vazia é estado honesto de skeleton; placeholder é lixo.

### Passo 2: Verificar o limite de linhas

INDEX skeleton deve ficar bem abaixo de 100 linhas (~45). O cap ≤100 vale até o INDEX FINAL
(Plano 04) — não gastar orçamento de linhas aqui.

```powershell
(Get-Content knowledge/python/INDEX.md | Measure-Object -Line).Lines   # esperado: <= 50
```

### Passo 3: NÃO commitar

Parar aqui. `bun run harness:validate` está VERMELHO neste ponto — esperado (ver Gotchas).
Seguir para fase-02/fase-03; o commit bundle acontece ao fim da fase-03.

---

## Gotchas

- **G1 do plano (crítico):** com `atoms/` sem `.md`, `bun run harness:validate` falha na regra
  `[knowledge-presence]` (`scripts/harness-validate.ts:717-722` — "atoms/ has no .md files").
  Isso NÃO é bug desta fase — é a razão do commit bundle 01+02+03. Não "consertar" criando
  átomo dummy nem `.gitkeep`; o piloto real da fase-03 fecha o gap no mesmo commit.
- **Local:** git não versiona diretório vazio — `knowledge/python/atoms/` só passa a existir
  no repo quando o piloto entrar. Criar o diretório localmente já ajuda a fase-03, mas o
  `git status` desta fase mostra apenas o INDEX.md.
- **Local:** manter o header da tabela keyword no formato exato `| Keyword | Átomos |` — o
  parser filtra a linha de header por `keyword |` case-insensitive
  (`format-knowledge-preview.ts:44`); mudar o texto do header quebraria o filtro no futuro.
- **G2 do plano:** nada de `Infos/` neste commit.

---

## Verificacao

### TDD

N/A — conteúdo estático sem lógica. A validação de máquina desta fase é o harness (no bundle)
e o tracer da fase-04 (INDEX copiado para `.claude/knowledge/INDEX.md`).

### Checklist

- [ ] `knowledge/python/INDEX.md` existe, PT-BR, ≤50 linhas no skeleton
- [ ] Cabeçalho exato `# Python Knowledge — Index`
- [ ] Preâmbulo declara "Python 3.11+, foco 3.13" E "padrões web são FastAPI-native" (D2)
- [ ] 7 subseções `### Para /{skill}` presentes (security, api-design, system-design,
      design-patterns, architecture, infrastructure, tdd-workflow)
- [ ] Seções `## Por Tier` (3 tiers) e `## Por keyword` (tabela com header) presentes
- [ ] Zero `[A DEFINIR]` ou placeholder equivalente
- [ ] `bun test` continua verde (nenhum teste enumera INDEX de python ainda — conferir contra
      audit-report da fase-00; se a fase-00 catalogou afetado que quebra JÁ com a pasta
      criada, corrigir AGORA nesta fase e registrar no MEMORY.md)
- [ ] NÃO commitado (bundle na fase-03)

---

## Criterio de Aceite

**Por maquina:**
- `bun test` verde com a pasta `knowledge/python/` presente no working tree
- `(Get-Content knowledge/python/INDEX.md | Measure-Object -Line).Lines` ≤ 50

**Por humano:**
- Preâmbulo lido em voz alta responde "isso serve pro meu projeto Django?" com honestidade:
  átomos de linguagem sim, web é FastAPI

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
