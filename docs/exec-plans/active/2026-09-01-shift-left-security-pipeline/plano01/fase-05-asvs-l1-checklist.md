<!--
Princípio universal #5 — Comment Provenance.
Fase de documentacao: nao gera codigo. A linhagem desta mudanca vive no PR e no MEMORY
(versao do ASVS confirmada + mapa categoria -> capitulo aplicado).
-->

# Fase 05: Checklist minimo da /security sob a regua ASVS L1

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 1.5h
**Depende de:** fase-03
**Visual:** false

---

## O que esta fase entrega

O `## Checklist de Seguranca Minima` da skill `/security` deixa de ser uma lista ad-hoc por tema e
passa a ser uma cobertura **sistematica** sob os capitulos do ASVS Level 1 — com os itens L1 que hoje
faltam adicionados e **zero** itens existentes perdidos. Fecha RF-15.

Por que importa: hoje o checklist tem 7 grupos escolhidos por afinidade tematica. Nao ha como saber
o que **falta**. Uma regua externa responde essa pergunta.

---

## Depende da fase-03 — por que

Ambas editam `skills/security/SKILL.md` (G7). A fase-03 mexe na secao 3 e nas Red Flags; esta
reescreve o bloco `<checklist>` inteiro. Reescrever um bloco grande sobre uma base que vai mudar
gera conflito textual caro. Ordem: fase-03 mergeia, esta ramifica de `main` atualizada.

---

## Nao ha TDD nesta fase — e por que

Nao ha unidade de codigo. O risco real aqui **nao** e conteudo errado, e **perda silenciosa** durante
a reorganizacao — mover 40+ itens de checklist e exatamente onde linhas somem. A verificacao dessa
fase e por isso um **diff de conjuntos**: extrair os itens antes, extrair depois, provar que a
diferenca `antes - depois` e vazia. Isso e verificavel por maquina e vale mais que qualquer teste
sobre prosa.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/SKILL.md` | Modify | **So** o bloco `## Checklist de Seguranca Minima` / `<checklist>` (G7/G8) |
| `plugin-manifest.json` | Modify | Regenerado — o `SKILL.md` e rastreado |

---

## Implementacao

### Passo 1 — Branch e baseline

```bash
git checkout -b docs/asvs-l1-checklist
```

**Antes de qualquer edicao**, extrair o conjunto de itens atual — este arquivo e a prova de
nao-regressao do Passo 6:

```bash
mkdir -p F:/tmp/asvs
sed -n '/## Checklist de Seguranca Minima/,/## Common Rationalizations/p' skills/security/SKILL.md \
  | grep '^- \[ \]' | sed 's/^- \[ \] //' | sort > F:/tmp/asvs/before.txt
wc -l F:/tmp/asvs/before.txt
```

(Git Bash. Anotar a contagem no MEMORY — ela e o piso.)

### Passo 2 — VERIFICAR a versao e a numeracao do ASVS (obrigatorio)

O ASVS renumerou capitulos entre a 4.0.3 e a 5.0. Escrever de memoria repete o defeito que o PRD
existe para corrigir.

`WebFetch` de `https://owasp.org/www-project-application-security-verification-standard/` e anotar no
MEMORY: **versao corrente**, a lista de capitulos com numeracao, e a URL. Confirmar tambem a licenca
(CC BY-SA, PRD §Premissas #5) — uso e reescrita propria com atribuicao, nunca copia de requisitos
literais.

**Rascunho de trabalho** (numeracao ASVS 4.0.x, a ser confirmada no Passo 2 — se a versao corrente
for a 5.0, **renumerar os rotulos**; o agrupamento das categorias nao muda, so o numero e o nome do
capitulo):

| Capitulo (rascunho) | Absorve do checklist atual |
|---|---|
| V2 Authentication | Autenticacao |
| V3 Session Management | Autenticacao (tokens de sessao) |
| V4 Access Control | Aplicacao (parte) + Supabase/BaaS |
| V5 Validation, Sanitization & Encoding | Dados (inputs, ORM) |
| V7 Error Handling & Logging | **lacuna** — nao existe hoje |
| V8 Data Protection | Dados (parte) |
| V9 Communications | Infraestrutura (TLS) |
| V12 File & Resources | Dados (uploads) |
| V14 Configuration | Aplicacao (headers, CORS) + Dependencias |
| (transversal) Criptografia | Criptografia e Senhas |

### Passo 3 — Reorganizar, preservando tudo

Regra "nunca diminuir": **todo item existente sobrevive**, com o mesmo texto sempre que possivel.
Reorganizar = reagrupar sob novos cabecalhos, nao reescrever.

Estrutura alvo do bloco (mantendo `<checklist>` ... `</checklist>` e o formato `- [ ]`):

```markdown
## Checklist de Seguranca Minima

Checklist obrigatoria para auditar qualquer projeto em producao.
Organizada sob a regua **OWASP ASVS Level 1** (`<versao confirmada no Passo 2>`) — L1 e o piso
aplicavel a toda aplicacao; os capitulos dao cobertura sistematica em vez de tematica.

<checklist>
### V2 — Autenticacao
- [ ] 2FA disponivel (TOTP preferivel, nao apenas SMS)
- [ ] Senha minima de 12 caracteres, sem max restritivo
- [ ] Rate limiting em login (5 tentativas/minuto)
- [ ] Senhas hasheadas com bcrypt (rounds >= 12) ou Argon2id
- [ ] NENHUM uso de MD5/SHA1 para seguranca
...
```

Os itens de Criptografia migram para onde sao usados (hash de senha → V2; AES-GCM e Base64 → o
capitulo de criptografia/protecao de dados confirmado no Passo 2). Nenhum some.

### Passo 4 — Adicionar as lacunas L1

Estes sao os itens que a regua revela ausentes. Cada um e uma **adicao**, marcado no PR como tal:

```markdown
### V3 — Gestao de Sessao
- [ ] Logout invalida a sessao/token no SERVIDOR (nao apenas remove do client)
- [ ] Refresh token com rotacao; reuso detectado invalida a familia inteira

### V4 — Controle de Acesso
- [ ] Negar por padrao: rota sem regra explicita e inacessivel, nao publica
- [ ] Autorizacao verificada no servidor em TODO recurso (nunca so escondendo a UI)

### V7 — Tratamento de Erro e Logging
- [ ] Erro ao cliente e generico; stack trace, SQL e caminho de arquivo nunca vazam
- [ ] Eventos de seguranca logados: login falho, falha de autorizacao, mudanca de privilegio
- [ ] Nenhum log contem senha, token, secret ou PII
- [ ] Caminho de excecao nao contorna a checagem de autorizacao (fail-closed)

### V8 — Protecao de Dados
- [ ] Respostas com dados sensiveis carregam header anti-cache
- [ ] Campos sensiveis excluidos das respostas de API (passwordHash, resetToken)

### V9 — Comunicacoes
- [ ] TLS em TODA conexao, inclusive entre servicos internos

### V14 — Configuracao
- [ ] Modo debug/verbose desabilitado em producao
- [ ] Endpoints e features nao usados removidos (superficie minima)
- [ ] Dependencias sem criticos/highs nao-triados (procedimento: `references/sca-triage.md`)
```

O ultimo item conecta com a **fase-04**. Se a fase-04 ainda nao mergeou, escrever o item **sem** o
link e adicionar o link depois — o link checker do `harness:validate` e recursivo e quebra com alvo
inexistente. Mesma decisao registrada na fase-03 (Passo 4c).

O item `V7 — caminho de excecao nao contorna autorizacao` e a ponte com **A10:2025** da fase-03. Se as
duas fases mergearam, vale citar a categoria no texto do item.

### Passo 5 — Fechar o mapa no proprio documento

Logo apos `</checklist>`, uma nota curta de 3 linhas dizendo qual versao do ASVS foi usada como regua
e que L1 e piso, nao teto — quem precisa de L2/L3 (dados regulados, financeiro) deve subir a regua.
Isso evita a leitura errada de "passei no L1, estou seguro".

### Passo 6 — Provar que nada sumiu

```bash
sed -n '/## Checklist de Seguranca Minima/,/## Common Rationalizations/p' skills/security/SKILL.md \
  | grep '^- \[ \]' | sed 's/^- \[ \] //' | sort > F:/tmp/asvs/after.txt

# Itens que existiam e sumiram — DEVE ser vazio:
comm -23 F:/tmp/asvs/before.txt F:/tmp/asvs/after.txt

# Itens adicionados (revisar um a um):
comm -13 F:/tmp/asvs/before.txt F:/tmp/asvs/after.txt

wc -l F:/tmp/asvs/before.txt F:/tmp/asvs/after.txt
```

Se `comm -23` retornar qualquer linha, ou o item foi removido (violacao de "nunca diminuir") ou foi
reescrito. Reescrever e permitido apenas com justificativa no PR — **cada linha do `comm -23` precisa
de uma explicacao**, nunca de um encolher de ombros.

### Passo 7 — Manifest

```bash
bun run generate:manifest
git diff --stat plugin-manifest.json
```

---

## Gotchas

- **G1 do plano:** `SKILL.md` e rastreado — manifest no mesmo commit.
- **G7 do plano:** esta fase reescreve o maior bloco das tres que tocam o `SKILL.md`. Ramificar de
  `main` **apos** a fase-03 mergear; `git pull --rebase` antes do PR.
- **G8 do plano:** nao encostar nos 3 blocos HTML-comment do topo (linhas 10-80).
- **Local — a numeracao do ASVS pode divergir do rascunho.** O Passo 2 e a fonte. Se for 5.0, os
  agrupamentos ficam, os rotulos mudam. Divergencia vira DEV-N no MEMORY.
- **Local — "reorganizar" e onde item some.** Por isso o `comm -23` do Passo 6 e o criterio de aceite
  principal desta fase, nao um extra.
- **Local — L1 e piso, nao teto.** Se o documento nao disser isso (Passo 5), a reorganizacao cria uma
  falsa sensacao de cobertura — exatamente o problema #3 do PRD, so que num lugar novo.
- **Local — a estrutura `<checklist>` e consumida pela skill.** Manter as tags e o formato `- [ ]`
  intactos; so os cabecalhos `###` mudam.

---

## Verificacao

### Verificacao de conteudo (substitui TDD)

| # | Comando | Antes (RED) | Depois (GREEN) |
|---|---------|-------------|----------------|
| 1 | `comm -23 F:/tmp/asvs/before.txt F:/tmp/asvs/after.txt \| wc -l` | — | `0` (**criterio principal**) |
| 2 | `wc -l < F:/tmp/asvs/after.txt` | N | `> N` (so cresceu) |
| 3 | `grep -c "^### V" skills/security/SKILL.md` | `0` | `>= 8` |
| 4 | `grep -c "ASVS" skills/security/SKILL.md` | `0` | `>= 2` |
| 5 | `grep -ci "Logout invalida a sessao" skills/security/SKILL.md` | `0` | `1` |
| 6 | `grep -ci "Negar por padrao" skills/security/SKILL.md` | `0` | `1` |
| 7 | `grep -ci "stack trace" skills/security/SKILL.md` | `0` | `>= 1` |
| 8 | `grep -ci "Modo debug" skills/security/SKILL.md` | `0` | `1` |
| 9 | `grep -c "<checklist>" skills/security/SKILL.md` | `1` | `1` (tag preservada) |

### Checklist

- [ ] `F:/tmp/asvs/before.txt` gerado ANTES da edicao e a contagem anotada no MEMORY (Passo 1)
- [ ] Versao do ASVS confirmada por WebFetch, com URL + data anotadas no MEMORY (Passo 2)
- [ ] Licenca CC BY-SA confirmada; conteudo e reescrita propria (PRD §Premissas #5)
- [ ] `comm -23 before after` retorna **vazio** — nenhum item perdido
- [ ] Toda linha de `comm -13` (adicoes) foi revisada e e um item L1 real, nao invencao
- [ ] Os 8 grupos tematicos antigos estao todos representados nos capitulos novos
- [ ] Nota do Passo 5 presente: "L1 e piso, nao teto"
- [ ] Tags `<checklist>` / `</checklist>` e o formato `- [ ]` preservados
- [ ] `git diff skills/security/SKILL.md` toca **apenas** o bloco do checklist (G7/G8)
- [ ] Harness: `bun run harness:validate` verde
- [ ] Suite: `bun run test` sem falhas novas
- [ ] Manifest: `bun run generate:manifest` + `git diff --stat plugin-manifest.json` nao-vazio (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (RF-15 + "nunca diminuir" — o criterio principal):**

```bash
sed -n '/## Checklist de Seguranca Minima/,/## Common Rationalizations/p' skills/security/SKILL.md \
  | grep '^- \[ \]' | sed 's/^- \[ \] //' | sort > F:/tmp/asvs/after.txt

comm -23 F:/tmp/asvs/before.txt F:/tmp/asvs/after.txt | wc -l
# esperado: 0   (zero itens perdidos)

[ "$(wc -l < F:/tmp/asvs/after.txt)" -gt "$(wc -l < F:/tmp/asvs/before.txt)" ] && echo CRESCEU
# esperado: CRESCEU
```

**Por maquina (a regua foi de fato aplicada):**

```bash
grep -c "^### V" skills/security/SKILL.md   # esperado: >= 8
grep -c "ASVS" skills/security/SKILL.md     # esperado: >= 2
grep -c "<checklist>" skills/security/SKILL.md  # esperado: 1
bun run harness:validate                    # exit 0
```

**Por humano:**
- Um auditor lendo o checklist consegue dizer **o que nao esta coberto** — que e a pergunta que a
  lista ad-hoc nao respondia.
- O MEMORY registra a versao do ASVS usada e o mapa categoria antiga → capitulo, para a fase seguinte
  e para o Plano 02.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
