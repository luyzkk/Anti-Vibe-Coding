# Fase 05 — Documentação dos 5 Perfis Arquiteturais

**Plano:** 01 — Foundation
**Sizing:** ~1.5h
**Dependências:** Independente (pode rodar em paralelo com fases 01-04)
**Visual:** false

## Objetivo

Produzir documentação canônica dos 5 perfis arquiteturais (D4) em `anti-vibe-coding/docs/architecture-profiles.md`. Para cada perfil: características visíveis, sinais que o detector usa para classificar, como cada uma das 5 skills estruturantes adapta saída, exemplo de projeto canônico, recomendações específicas. Esta documentação é destino dos links gerados pela fase-04 e é consumida pelos Planos 02 e 04 como spec.

**Sem testes — é doc.** Sinalizado explicitamente.

## Arquivos Afetados

- `anti-vibe-coding/docs/architecture-profiles.md` (criar)

## Contexto Técnico

5 perfis (D4):
1. `clean-architecture-ritual` — Domain/Application/Infrastructure/Presentation rituais
2. `mvc-flat` — controllers/services/repositories/entities flat
3. `vertical-slice` — `src/features/{nome}/` ou `src/modules/{nome}/`
4. `nextjs-app-router` — convenção Next.js (app/, components/, lib/)
5. `unknown-mixed` — fallback honesto

Cada perfil deve ter âncora estável (ex: `#vertical-slice`) porque a fase-04 gera links relativos `architecture-profiles.md#<perfil>`. Não renomear âncoras depois sem atualizar gerador.

Consistência com PRD: documentar que DDD strategic e monorepo são Onda 2 (D4). Vertical-slice como default em greenfield (D11) entra em "Recomendações" do `unknown-mixed`.

Tom: descritivo, não prescritivo. Plugin não impõe arquitetura — descreve. Alinhar com diretriz crítica do CONTEXT.

## Estrutura Sugerida do Documento

```markdown
# Architecture Profiles

Five profiles recognized by /anti-vibe-coding:detect-architecture.
Each profile shapes how structural skills adapt their output (Plano 04).

## clean-architecture-ritual
### Características
### Sinais usados pelo detector
### Como as skills adaptam
- architecture: ...
- plan-feature: ...
- write-prd: ...
- execute-plan: ...
- verify-work: ...
### Exemplo canônico
### Recomendações

## mvc-flat
... (mesma estrutura)

## vertical-slice
...

## nextjs-app-router
...

## unknown-mixed
... (inclui nota sobre Greenfield mode quando src/ vazio)

## Out of scope (Onda 2)
- ddd-strategic
- monorepo-multi-arch
```

## Snippets de Referência

Para cada perfil, "Como as skills adaptam" deve ser específico — exemplos:

```markdown
### vertical-slice — adaptações
- **architecture**: recomenda manter feature-cohesion sobre layer-cohesion;
  alerta contra extração prematura de "shared/" antes da terceira repetição.
- **plan-feature**: gera fases organizadas por feature vertical
  (1 fase = 1 slice end-to-end), não por camada.
- **write-prd**: template sugere campo "feature boundary" explícito.
- **execute-plan**: cada fase entrega slice testável end-to-end.
- **verify-work**: mede coesão da feature; sem prescrever extração.
```

## Plano (sem TDD — é documentação)

- [ ] Esboçar estrutura completa do documento
- [ ] Escrever seção `clean-architecture-ritual` (~10 min)
- [ ] Escrever seção `mvc-flat` (~10 min)
- [ ] Escrever seção `vertical-slice` (~15 min — vai ser o mais usado em adaptações por causa do Tracer Bullet)
- [ ] Escrever seção `nextjs-app-router` (~10 min)
- [ ] Escrever seção `unknown-mixed` (~10 min — incluir Greenfield mode)
- [ ] Seção "Out of scope (Onda 2)" listando DDD strategic e monorepo
- [ ] Verificar âncoras (`#clean-architecture-ritual`, `#mvc-flat`, `#vertical-slice`, `#nextjs-app-router`, `#unknown-mixed`)
- [ ] Cross-check com fase-04: links gerados batem com âncoras escritas

## Checklist de Verificação

- [ ] 5 perfis documentados com 5 sub-seções cada (características, sinais, adaptações por skill, exemplo, recomendações)
- [ ] Âncoras estáveis e batem com os links que a fase-04 gera
- [ ] Seção "Como as skills adaptam" diferencia as 5 skills estruturantes em cada perfil
- [ ] Tom descritivo, não prescritivo (alinhado com CONTEXT)
- [ ] Out-of-scope (DDD strategic, monorepo) sinalizado
- [ ] Markdown lint limpo (sem títulos órfãos, listas malformadas)

## Critérios de Aceite do PRD Cobertos

- **RF10** — Documentação dos 5 perfis em `architecture-profiles.md`.
- **D4** — 5 perfis registrados como cânone do framework.

## Próxima Fase

`fase-06-tracer-bullet-modo-dual` — usa esta documentação como referência para a mensagem adaptada da skill `architecture` (Tracer Bullet).
