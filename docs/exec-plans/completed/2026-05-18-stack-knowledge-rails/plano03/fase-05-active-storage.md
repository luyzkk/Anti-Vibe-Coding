<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 05: Átomo `active-storage.md` (T3 + flag de revisão de tier RF13)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto como template); Plano 02 fase-09 (verifier refined + audit humano aprovados)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 3 `docs/knowledge/rails/atoms/active-storage.md` (~140 linhas), condensando ActiveStorage: file uploads (`has_one_attached`, `has_many_attached`), backends (disk/S3/GCS/Azure), variants (image processing via vips/mini_magick), direct uploads (browser-to-S3 via signed URL — bypass servidor), signed URLs com expiration, segurança (content-type validation, file size limits). Inclui **flag de revisão de tier (RF13)**: ao final da fase, dev avalia se o átomo escrito mostra padrões críticos para apps modernas (variants, direct uploads, signed URLs) ou majoritariamente niche, e decide se sobe para T2 (uso comum) ou mantém T3 (conservador). Decisão registrada em `plano03/MEMORY.md` como DI-N + atualiza `tier:` no frontmatter do átomo + atualiza INDEX em fase-06.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/active-storage.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-stack-conventions`, `rails-expert` (fontes do átomo) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` | Modify | Registrar decisão RF13 (T3 mantido OU T2 promovido) como DI-N após avaliação final |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global da feature e extrair a decisão aprovada para os pares duplicados. Para este átomo, importam:

- `rails-stack-conventions` vs `rails-stack-conventions v2` (storage idioms, attachment patterns)
- `rails-expert` (sem duplicata — patterns sêniores para signed URLs, variants)
- compass artifact sobre ActiveStorage backends (se existir — confirmar via `ls`)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado, **BLOQUEAR a fase** e escalar.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: active-storage
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-active-storage_text_markdown.md
tier: 3
triggers: [active storage, file upload, has_one_attached, has_many_attached, variants, direct upload, signed url, S3, content type validation, file size limit]
related_skills: [/api-design, /security, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Notas sobre o frontmatter:**

- `tier: 3` é INICIAL. Após escrita + avaliação RF13 ao final da fase, dev decide se atualiza para `tier: 2`. Se atualizar, MEMORY.md registra a decisão e INDEX (fase-06) reflete.
- `rails_versions: ['>=7.1']` — ActiveStorage existe desde 5.2, mas cobertura alinhada com escopo 7.1+. Direct uploads e signed URLs são padrões estáveis em 7.1+.
- `related_skills:` inclui `/security` por causa de signed URLs, content-type validation, file size limits — vetores de attack reais.
- Compass artifact UUID acima é placeholder — extrator confirma via `ls claude-code/knowledge/Rails/compass_artifact_*`.

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem:

1. `# ActiveStorage` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário
3. `## Padrões sênior` — 5-6 patterns
4. `## Anti-padrões` — 3-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (audit trail RF14)

**NÃO incluir** seção API-only mode.

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 6 — extrair do source canônico. Lista Rails-native:

- **Pattern: `has_one_attached` e `has_many_attached`** — Problema: file metadata espalhado (paths, URLs, sizes); Padrão: model `has_one_attached :avatar` ou `has_many_attached :photos`; ActiveStorage gerencia `blob` + `attachment` tables; acesso via `user.avatar.attached?`, `user.avatar.url`; Quando usar: arquivos lógicos do model (avatar, comprovante, anexos); Quando NÃO usar: arquivos completamente desacoplados de domain (logs, exports temporários) — vão diretos para S3 com path próprio.
- **Pattern: Variants com vips/mini_magick** — Problema: imagens originais pesam 5MB+, UI precisa thumbnail; Padrão: `user.avatar.variant(resize_to_limit: [200, 200])` gera transformação lazy (primeira request processa, depois cacheia); `image_processing` gem default usa libvips (mais rápido que ImageMagick); Quando usar: imagens user-facing com múltiplos tamanhos (thumb, medium, full); Quando NÃO usar: arquivos não-imagem (CSV, PDF — variants não aplicam).
- **Pattern: Direct uploads (browser → S3 sem passar pelo servidor Rails)** — Problema: upload grande satura request do servidor; Padrão: form com `<%= form.file_field :avatar, direct_upload: true %>` + JS helper (`@rails/activestorage`) que gera signed URL via `presigned_post` → browser faz PUT direto para S3 → app só guarda `blob_id`; Quando usar: uploads > 5MB ou volume alto; Quando NÃO usar: uploads pequenos (< 1MB) — direct upload tem latência adicional pela negociação.
- **Pattern: Signed URLs com expiration** — Problema: blob URL público vaza acesso a arquivos privados; Padrão: `rails_blob_url(blob, expires_in: 1.hour)` gera URL assinada com expiração; backend pode revogar key se necessário; Quando usar: arquivos privados/sensíveis (comprovantes financeiros, médicos); Quando NÃO usar: assets públicos (logo, avatar — `public: true` no service config evita signing overhead).
- **Pattern: Content-type validation no model** — Problema: usuário sobe `.exe` renomeado para `.jpg`; Padrão: `validate :acceptable_avatar` chama `avatar.blob.content_type` (real, inferido pelo Marcel gem) e compara whitelist; também valida `byte_size` ≤ limite; Quando usar: 100% dos attachments user-uploaded; Quando NÃO usar: nunca — validação no model é defesa final.
- **Pattern: Service config por ambiente (`config/storage.yml`)** — Problema: dev usa disk local, prod usa S3, test usa test service; Padrão: `config/storage.yml` define services nomeados (`local`, `amazon`, `test`); `config.active_storage.service = :amazon` em `production.rb`; credentials via Rails encrypted credentials ou ENV; Quando usar: setup default Rails; Quando NÃO usar: nunca — multi-ambiente exige.

Extrator escolhe 5 desses 6.

### Passo 5: Anti-padrões (3-4 armadilhas com correção)

- **Anti-pattern: variant gerada no controller (sync)** — Sintoma: primeira request com `user.avatar.variant(...).processed` bloqueia ~2s gerando thumbnail; Correção: `.processed` é lazy mas controller espera. Alternativa: pré-processar via job (`AvatarProcessingJob.perform_later(user.id)`) após upload; ou usar `url_for(variant)` que serve via redirect (browser segue após variant pronto).
- **Anti-pattern: signed URL com expiration muito longa** — Sintoma: `expires_in: 1.year` permite vazamento perpétuo; Correção: expiration curta (1.hour para visualização, max 24.hour); regenerar quando necessário; nunca compartilhar URL signed externamente sem auditoria.
- **Anti-pattern: confiar em `Content-Type` declarado pelo browser** — Sintoma: browser pode mentir, request POST com `content-type: image/png` mas bytes são executável; Correção: usar Marcel (gem default ActiveStorage) para inferir content-type real a partir dos primeiros bytes; comparar com whitelist + size limit.
- **Anti-pattern: deletar attachment sem garbage collection** — Sintoma: `user.avatar = new_file` substitui mas blob antigo fica órfão no S3, custo cresce; Correção: `user.avatar.purge_later` antes de substituir; ou rodar `ActiveStorage::PurgeJob` em cron para órfãos (blobs sem attachment).

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| Arquivo lógico do model (avatar, comprovante) | `has_one_attached` ou `has_many_attached` |
| Arquivo desacoplado de domain (logs, exports) | S3 direto com path próprio (não ActiveStorage) |
| Imagem user-facing com múltiplos tamanhos | `variant(...)` + libvips |
| Upload > 5MB ou volume alto | `direct_upload: true` (browser → S3) |
| Arquivo privado/sensível | `rails_blob_url(blob, expires_in: 1.hour)` |
| Asset público (logo, avatar) | `public: true` no service config (sem signing) |
| Variant em UI crítica | Pré-processar via job pós-upload |
| Substituir attachment | `user.avatar.purge_later` antes |

### Passo 7: Referências externas

- Skill: `/api-design` para upload patterns (direct vs proxy, multipart vs binary)
- Skill: `/security` para signed URLs, content-type validation, file size limits, malware vectors
- Skill: `/infrastructure` para S3/GCS/Azure backend mgmt, CDN integration, cost optimization
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com prompt incluindo anti-drift LITERAL. Substituir nomes de pasta canônica pelos decididos no STATE.md. Output: arquivo markdown completo em `docs/knowledge/rails/atoms/active-storage.md`.

### Passo 9: Avaliação de tier RF13 (após extração)

Após o átomo ser escrito e antes da fase-06 (INDEX final), dev avalia se sobe para T2:

**Critérios para PROMOVER para T2:**
- O átomo cobre signed URLs + direct uploads + variants — padrões críticos para qualquer app moderno com user-generated content (e-commerce, SaaS, social)
- Riscos de segurança cobertos (content-type spoofing, signed URL leak) são T1-like — encontram-se em qualquer code review
- Volume de fontes em `rails-stack-conventions` e `rails-expert` sugere uso comum (não niche)

**Critérios para MANTER T3:**
- Apps API-only sem upload (backend de mobile que não recebe arquivos) não usam — caso comum
- Configuração de service (S3/GCS) é one-off, não decisão constante
- Variants e direct uploads são features de "frontend rico", não core backend

**Decisão:**
- Se PROMOVER → atualizar `tier: 2` no frontmatter do átomo + registrar em `plano03/MEMORY.md` como DI-N + sinalizar fase-06 (INDEX) para incluir `active-storage` no mapa "Tier 2"
- Se MANTER → registrar em `plano03/MEMORY.md` como DI-N (mesmo se decisão é manter, decisão deliberada conta) + fase-06 inclui no mapa "Tier 3"

Decisão tomada por Luiz após `Read` do átomo escrito. Registrar em STATE.md global da feature em bloco `## Decisão RF13 (active-storage tier)` com data + linha de razão.

---

## Gotchas

- **G1 do plano (cap 200 ln):** ActiveStorage cobre uploads + variants + direct uploads + signed URLs + service config. Alvo 130-145. Cuidado para não inflar service config (último — pegar só essencial).
- **G2 do plano (anti-drift literal):** prompt do extrator inclui texto da compound lesson verbatim. ActiveStorage docs Rails são bem cobertos em stack-conventions — menos risco de drift que ActionCable.
- **G4 do plano (`rails_versions`):** `['>=7.1']` — ActiveStorage estável em 7.1+. Direct uploads e variants funcionam em 6.x mas escopo da feature é 7.1+.
- **G7 do plano (RF13 flag de revisão):** Passo 9 acima é OBRIGATÓRIO. Dev avalia e decide antes de fase-06. Decisão registrada em MEMORY.md + STATE.md.
- **G10 do plano (fonte canônica via STATE.md):** Read STATE.md ANTES de chamar extrator.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro + decisão RF13 ao final. Checklist:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/active-storage.md`
- [ ] Frontmatter contém todos os 8 campos base na ordem correta
- [ ] Campo opcional `rails_versions: ['>=7.1']` presente
- [ ] `topic: active-storage` (literal, kebab-case)
- [ ] `stack: rails`, `layer: backend`, `tier: 3` (INICIAL; pode mudar para 2 após RF13), `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo existente em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem correta
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l docs/knowledge/rails/atoms/active-storage.md` retorna entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/active-storage.md` retorna 0
- [ ] Triggers contém pelo menos: `active storage`, `file upload`, `variants`, `direct upload`, `signed url`, `S3`
- [ ] `bun run harness:validate` passa sobre o novo átomo
- [ ] **Passo 9 RF13 executado:** Luiz revisou átomo e decidiu T2-promote OU T3-manter; decisão registrada em `plano03/MEMORY.md` como DI-N + bloco `## Decisão RF13 (active-storage tier)` em STATE.md global
- [ ] Se PROMOVIDO: frontmatter `tier: 2` atualizado no átomo + sinalização para fase-06 (INDEX inclui em mapa "Tier 2")

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/active-storage.md` exit 0
- `wc -l docs/knowledge/rails/atoms/active-storage.md` retorna número entre 120 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/active-storage.md` retorna 0
- Frontmatter parseável como YAML; `tier:` igual ao valor decidido em Passo 9 (3 ou 2)
- `bun run harness:validate` passa

**Por humano:**

- Subagente verifier refined (fase-07) reporta ≥80% das 5 claims auditadas das seções técnicas como rastreáveis.
- Leitor sênior Rails reconhece os patterns como decisões de produção (direct upload signed PUT, content-type validation, expiration curta), não tutorial superficial.
- **RF13 cumprido:** Decisão de tier registrada com data + razão em `plano03/MEMORY.md` (DI-N) + STATE.md global. Se T2 promovido, frontmatter do átomo atualizado e fase-06 informada.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
