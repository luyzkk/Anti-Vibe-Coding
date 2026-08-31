<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 05: Átomo `security-fastapi-owasp.md` (flagged audit humano D11)

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 1.5h
**Depende de:** Plano 01 completo + Wave 1 commitada (independente da fase-04 — Wave 2, paralelizável)
**Visual:** false

---

## O que esta fase entrega

Átomo T1 `knowledge/python/atoms/security-fastapi-owasp.md` — app security FastAPI/OWASP
destilado de fonte densa (20 seções com IDs de regra estáveis), ≤200 linhas com priorização
explícita (RISCO R4), **marcado para audit humano obrigatório** (D11 — audit executa no
Plano 04 fase-06).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/security-fastapi-owasp.md` | Create | Átomo T1 destilado + flag de audit humano (único arquivo desta fase — G11: NÃO tocar INDEX.md) |
| `TODO.md` (raiz) | Modify (provável) | Excedente do cap 200 — fonte de 20 seções dificilmente cabe inteira (R4) |

---

## Implementacao

### Passo 1: Ler a fonte e o formato de referência

Fonte única desta fase (ground truth — congelada, gitignored G1):

- `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md`
  — 20 seções, com **IDs de regra estáveis** (formato 1.1 / 2.2 / 7.1)

Formato de referência: `knowledge/rails/atoms/active-record-fundamentals.md` +
`knowledge/python/atoms/async-and-concurrency.md` (piloto).

**Escopo negativo desta fase (fronteira com Plano 03 fase-05):** a §18 (supply
chain/slopsquatting) tem dupla vida — o aprofundamento vai para o átomo
`dependencies-and-packaging-uv` (Plano 03, que também lista compass 0e7023f8 §18 como fonte).
AQUI entra só o essencial de app security (ex: o conceito de slopsquatting como vetor +
regra de nunca instalar dependência sugerida por IA sem verificar). Não duplicar.

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/security-fastapi-owasp.md destilando EXCLUSIVAMENTE a fonte:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
Este átomo é de SEGURANÇA: fidelidade importa mais que completude. Não generalize regras além
do que a fonte prescreve.

RASTREIO DE IDs DE REGRA: a fonte usa IDs estáveis (1.1, 2.2, 7.1...). Ao destilar uma regra,
PRESERVE o ID entre parênteses na claim (ex: "pinar `algorithms` na decodificação JWT (regra
2.2)"). Claim derivada de regra da fonte SEM o ID correspondente será tratada como não
rastreada no review. Não invente IDs.

IDIOMA: PT-BR (D1). Fonte já em PT-BR — destilação direta.

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap — ver PRIORIZAÇÃO);
seções ## Quando consultar / ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO
usar) / ## Anti-padrões (Sintoma → Correção) / ## Critérios de decisão (tabela) /
## Referências externas; zero [A DEFINIR]. Logo após o título, incluir a nota:
"> **Audit humano obrigatório (D11):** este átomo será revisado por Luiz contra a fonte antes
da aprovação do batch final."

PRIORIZAÇÃO (fonte de 20 seções vs cap 200 — RISCO R4; nesta ordem):
P1 (núcleo, não cortar):
- Injeção: SQL (SQLAlchemy text()), NoSQL, command, SSTI
- JWT: RFC 8725 + `algorithms` pinado
- Senhas: argon2id vs bcrypt (limite de 72 bytes)
- Sessão / CSRF
- XSS / Jinja2 / nh3
- CORS e docs (/docs, /redoc) em produção
- SecretStr
- 8 padrões inseguros de código gerado por IA (§19 — forte candidato a Anti-padrões)
P2 (comprimir se necessário):
- Upload de arquivos; SSRF; rate limiting; headers CSP/HSTS
- Catálogo de CVEs (§17): destilar a LIÇÃO ESTRUTURAL de cada CVE, não a ficha completa —
  se o cap apertar, condensar em tabela de Critérios de decisão
P3 (mínimo aqui — aprofundamento vai para outro átomo):
- Supply chain / slopsquatting (§18): SÓ o essencial de app security; o resto pertence ao
  átomo dependencies-and-packaging-uv

Tudo que ficar de fora por causa do cap: liste ao final da sua resposta como
"EXCEDENTE PARA TODO.md" com os IDs de regra correspondentes.

REGRAS DE CONTEÚDO:
- Claims "contestado" na fonte NUNCA viram regra dura — nota em Critérios de decisão ou omitir (G3)
- Divergência de versões → normalizar para a mais recente citada (G4)

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: security-fastapi-owasp
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md
tier: 1
triggers: [OWASP, segurança, SQL injection, SQLAlchemy text, NoSQL injection, command injection, SSTI, JWT, RFC 8725, algorithms, argon2, argon2id, bcrypt, CSRF, sessão, XSS, Jinja2, nh3, CORS, docs em produção, SecretStr, upload, SSRF, rate limiting, CSP, HSTS, CVE, slopsquatting, código de IA inseguro]
related_skills: [/security, /api-design, /infrastructure]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
flagged_for_human_audit: true
---
```

### Passo 3: Check estrutural local + rastreio de IDs

Rodar a seção Verificação. O check específico desta fase: **nenhum ID de regra da fonte virou
claim sem rastreio** — amostrar os IDs citados no átomo (grep por padrão `\d+\.\d+`) e conferir
cada um contra a seção correspondente da fonte (ID existe + conteúdo bate).

### Passo 4: Registrar excedente no TODO.md (esperado — R4)

Fonte de 20 seções: excedente é o cenário provável, não a exceção. Entrada no `TODO.md` da
raiz: `- [ ] [knowledge-python] Excedente cap-200 de security-fastapi-owasp (R4): regras {IDs}
— avaliar segundo átomo ou absorção no INDEX do Plano 04`.

---

## Gotchas

- **G2 do plano:** anti-drift clause VERBATIM — plan-verifier rejeita prompt sem a cláusula.
- **G5 do plano (R4 — CAP VIGIADO):** esta é a fase de maior risco de estouro do plano. A
  priorização P1/P2/P3 do prompt existe para o corte ser deliberado, não aleatório. NUNCA
  espremer removendo "Quando NÃO usar" dos patterns para caber — cortar seção P2/P3 inteira e
  registrar no TODO.md.
- **G8 do plano:** `flagged_for_human_audit: true` é campo extra — o validador ignora campos
  desconhecidos (G3 do Plano 01), mas rodar o validador para confirmar. A nota no corpo é o
  fallback visível a humanos (precedente Next).
- **G11 do plano:** NÃO tocar INDEX.md.
- **Local — IDs de regra são o mecanismo de rastreio deste átomo:** diferente dos demais, a
  fonte oferece IDs estáveis. Usá-los barateia o verifier (fase-06) e o audit humano (Plano 04
  fase-06). Claim sem ID em conteúdo que a fonte cobre com ID = retrabalho certo.
- **Local — segurança não admite "verdade conhecida" fora da fonte:** exatamente o domínio
  onde o extrator mais tende a completar com OWASP genérico de treinamento. A fonte é densa o
  suficiente; qualquer regra sem passagem correspondente reprova.

---

## Verificacao

### TDD (adaptado — test-after com gate próprio)

- [ ] **CHECK ESTRUTURAL:** comandos abaixo passam
- [ ] **GATE DE FIDELIDADE:** delegado à fase-06 (verifier refined batch, ≥80%)
- [ ] **GATE HUMANO:** audit D11 no Plano 04 fase-06 (esta fase só FLAGA)

### Checklist

- [ ] Corpo ≤200 linhas; 4 seções obrigatórias; zero `[A DEFINIR]`
- [ ] Frontmatter passa no validador MESMO com `flagged_for_human_audit: true` (G8)
- [ ] Nota de audit humano presente no corpo (grep `Audit humano` ≥1)
- [ ] `sources:` com o path exato do compass 0e7023f8 (RF13)
- [ ] **Nenhum ID de regra virou claim sem rastreio:** extrair IDs citados
  (`grep -oE '\(regra [0-9]+\.[0-9]+\)' knowledge/python/atoms/security-fastapi-owasp.md`)
  e conferir TODOS contra a fonte (ID existe E o conteúdo da claim bate com a seção do ID)
- [ ] Núcleo P1 presente: greps âncora `algorithms` (JWT), `argon2`, `72 bytes`, `text()`,
  `nh3`, `SecretStr` — ≥1 cada
- [ ] §19 (padrões inseguros de código de IA) representada em Anti-padrões
- [ ] §18 (supply chain) reduzida ao essencial — sem profundidade de packaging (fronteira
  Plano 03 fase-05)
- [ ] Claims "contestado" não viraram regra dura (spot check — fonte de security costuma ter
  as contestadas mais delicadas)
- [ ] Excedente registrado no TODO.md com IDs (se houver corte — cenário esperado)
- [ ] `git status` sem `Infos/` staged (G1); INDEX.md intacto (G11)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, corpo ≤200 linhas, 4 seções, frontmatter válido com
  `flagged_for_human_audit: true`
- Greps âncora do núcleo P1 retornam ≥1 cada; grep de IDs `(regra N.N)` retorna ≥5
- `bun run harness:validate` verde (fechamento da Wave 2)

**Por humano:**
- Amostra de IDs 100% rastreada à fonte (todos os IDs citados conferidos)
- Audit humano completo D11 fica para o Plano 04 fase-06 — esta fase entrega o átomo FLAGADO

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
