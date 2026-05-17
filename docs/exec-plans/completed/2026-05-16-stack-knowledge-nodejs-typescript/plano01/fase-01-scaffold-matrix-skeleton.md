<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 01: Scaffold matrix skeleton (INDEX.md + atoms/)

**Plano:** 01 — Tracer Bullet
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Esqueleto mínimo do matrix `docs/knowledge/nodejs-typescript/`: `INDEX.md` citando apenas o átomo piloto + pasta `atoms/` vazia. Estabelece o terreno físico que fase-02 (átomo piloto), fase-03 (cópia via init) e Plano 06 (INDEX consolidado) vão consumir.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/INDEX.md` | Create | Esqueleto mínimo: seção "Por keyword" com apenas a linha do átomo piloto + placeholders comentados para o INDEX final do Plano 06 fase-04 |
| `docs/knowledge/nodejs-typescript/atoms/` | Create | Pasta vazia (será populada por fase-02 com `type-system-idioms.md`) |

---

## Implementacao

### Passo 1: Criar a pasta `atoms/`

Pasta vazia. No git, usar `.gitkeep` para garantir tracking — convenção comum do projeto.

```bash
mkdir -p docs/knowledge/nodejs-typescript/atoms
touch docs/knowledge/nodejs-typescript/atoms/.gitkeep
```

### Passo 2: Escrever `INDEX.md` esqueleto

Conteúdo mínimo (~30 linhas). A estrutura final (mapa por keyword/layer/tier completo) vem no Plano 06 fase-04 — aqui é só placeholder citando o piloto.

```markdown
# Node.js + TypeScript — Senior Knowledge Index

Stack: `nodejs-typescript`
Atualizado: 2026-05-16
Status: skeleton (Plano 01 Tracer Bullet — INDEX final no Plano 06 fase-04)

Quando trabalhar em projeto Node.js + TypeScript, consulte o átomo relevante via keyword match.

## Por keyword

| Keyword | Atom |
|---|---|
| type, generic, branded, discriminated, satisfies, ESM, CJS | [type-system-idioms](./atoms/type-system-idioms.md) |

<!-- Plano 06 fase-04 substitui esta tabela pelo mapa completo dos 14 átomos. -->

## Por layer

<!-- A preencher no Plano 06 fase-04 quando os 14 átomos existirem. -->

## Por tier

**Tier 1 (must-know):** type-system-idioms

<!-- Tier 2 e Tier 3 a preencher no Plano 06 fase-04. -->

## Formato dos átomos

Todos os átomos seguem o skeleton definido em `_topic-plan.md:73-112`:
frontmatter fixo (`topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`) +
corpo com seções: Quando consultar, Padrões sênior, Anti-padrões, Critérios de decisão, Referências externas.
```

---

## Gotchas

- **G3 do plano (preview):** o INDEX agora cita apenas 1 átomo (o piloto). Não confundir esse skeleton com o INDEX final — o final tem mapa completo por keyword/layer/tier e vem no Plano 06 fase-04. Aqui o objetivo é apenas dar terreno físico para a cópia em fase-03 funcionar.
- **Local — pasta vazia + `.gitkeep`:** sem `.gitkeep`, git não trackea pasta vazia, e fase-03 (cópia) falha porque o source não existe. Validar com `git status` que a pasta + `.gitkeep` foram adicionados.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é puramente markdown. Em vez de RED→GREEN, valida-se conteúdo via checklist abaixo.

### Checklist

- [ ] `docs/knowledge/nodejs-typescript/INDEX.md` existe e tem seção "Por keyword" listando `type-system-idioms`
- [ ] `docs/knowledge/nodejs-typescript/atoms/` existe como pasta (verificar com `ls -la docs/knowledge/nodejs-typescript/`)
- [ ] `atoms/.gitkeep` presente (git trackeia pasta vazia)
- [ ] INDEX.md menciona explicitamente que é skeleton e cita Plano 06 fase-04 como momento do INDEX final
- [ ] INDEX.md ≤ 50 linhas (skeleton, não o final ≤100 linhas do NFR)
- [ ] `git status` mostra apenas os novos arquivos esperados (sem ruído em outros paths)
- [ ] `bun run harness:validate` continua verde (NFR Manutenibilidade) — schema da subárvore `docs/knowledge/` é validado no Plano 06 fase-06; aqui basta não quebrar o que já passa

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/INDEX.md && test -d docs/knowledge/nodejs-typescript/atoms` retorna exit code 0
- `grep -q 'type-system-idioms' docs/knowledge/nodejs-typescript/INDEX.md` retorna exit code 0
- `bun run harness:validate` exit code 0

**Por humano:**
- INDEX.md lê como esqueleto óbvio (skeleton, work-in-progress assumido) — não como documento final acidentalmente publicado

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
