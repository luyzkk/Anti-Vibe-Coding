---
topic: active-storage
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-guides/references/active_storage_overview.md
  - claude-code/knowledge/Rails/compass_artifact_wf-8afc0f40-76b2-414c-bc2c-d344997397e4_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
tier: 3
triggers: [active storage, file upload, has_one_attached, has_many_attached, variants, direct upload, signed url, S3, content type validation, file size limit, purge, blob, image processing, libvips, ActiveStorage]
related_skills: [/api-design, /security, /infrastructure]
updated: 2026-05-19
rails_versions: ['>=7.1']
---

# ActiveStorage

## Quando consultar

- Ao adicionar upload de arquivos a um model Rails (avatar, comprovante, anexos)
- Ao escolher backend de storage (disk/S3/GCS/Azure) por ambiente
- Ao configurar variants de imagem (thumbnails, resize) para UI
- Ao implementar direct upload (browser-to-S3 sem passar pelo servidor)
- Ao proteger acesso a arquivos privados com signed URLs + expiração

## Padrões sênior

### Pattern: `has_one_attached` e `has_many_attached`

- **Problema:** file metadata espalhado em colunas manuais (path, size, content_type); uploads sem rastreabilidade no model
- **Padrão:** declarar `has_one_attached :avatar` ou `has_many_attached :images` no model; ActiveStorage gerencia as tabelas `active_storage_blobs` e `active_storage_attachments`; acesso via `user.avatar.attached?`, `user.avatar.attach(params[:avatar])`, `user.avatar.purge_later`
- **Quando usar:** arquivos logicamente associados a um model (avatar de User, comprovante de Pedido, fotos de Message)
- **Quando NÃO usar:** arquivos completamente desacoplados de domain (exports temporários, logs gerados por jobs) — esses vão direto para S3 com path próprio sem ActiveStorage
- **Fonte:** active_storage_overview.md seções "has_one_attached" e "has_many_attached"

### Pattern: Variants com libvips — lazy por default

- **Problema:** imagens originais pesam vários MB; UI precisa de thumbnail e tamanhos intermediários
- **Padrão:** `user.avatar.variant(resize_to_limit: [200, 200])` — lazy por default (`:lazily`); primeira request processa a imagem, subsequentes servem o variant já registrado em `active_storage_variant_records`; Rails 7.1+ usa libvips por default (até 10x mais rápido que ImageMagick, 1/10 do uso de memória); definir presets nomeados no model via bloco `has_one_attached :avatar do |a| a.variant :thumb, resize_to_limit: [100, 100] end`
- **Quando usar:** imagens user-facing com múltiplos tamanhos (thumb, medium, full)
- **Quando NÃO usar:** arquivos não-imagem (CSV, PDF) — variants não se aplicam; usar `preview` para PDF/video
- **Fonte:** active_storage_overview.md seções "Transforming Images", "Variant Generation: Lazily, Later, Immediately"; wf-8afc0f40 RAILS-SEC-090

### Pattern: Presets nomeados para variants — não input dinâmico

- **Problema:** `blob.variant(params[:t] => params[:v])` aceita métodos arbitrários ao processador de imagem (CVE-2022-21831, CVSS 9.8; bypass CVE-2025-24293 em versões anteriores a 7.1.5.2/7.2.2.2/8.0.2.1) — command injection via MiniMagick
- **Padrão:** definir presets nomeados no model e referenciar pelo nome: `image_tag picture.image.variant(:thumb)`; nunca passar params do usuário como chave de transformação; manter Rails atualizado para patches de CVE-2022-21831 e CVE-2025-24293
- **Quando usar:** em qualquer app que processa variants de imagem — sem exceção
- **Quando NÃO usar:** nunca expor transformações dinâmicas com input do usuário
- **Fonte:** wf-8afc0f40 RAILS-SEC-090 (seção 14)

### Pattern: Direct uploads — browser envia direto para S3

- **Problema:** upload grande (>5MB) ou volume alto satura o request cycle do servidor Rails
- **Padrão:** `<%= form.file_field :avatar, direct_upload: true %>` + JS helper `@rails/activestorage`; o helper gera signed upload URL via Rails, o browser faz PUT direto para S3/GCS; Rails recebe apenas o `blob_id` após o upload; requer configuração de CORS no serviço (permitir `PUT`, headers `Content-Type`, `Content-MD5`, `Content-Disposition`)
- **Quando usar:** uploads > 5MB ou endpoints com volume alto de uploads simultâneos
- **Quando NÃO usar:** uploads pequenos (< 1MB) em uso esporádico — direct upload adiciona uma roundtrip extra para obter a signed URL
- **Fonte:** active_storage_overview.md seção "Direct Uploads"

### Pattern: Signed URLs com expiração curta para arquivos privados

- **Problema:** URL permanente de blob vaza acesso a arquivos privados — qualquer pessoa com o link acessa indefinidamente (RAILS-SEC-095)
- **Padrão:** ActiveStorage gera signed URLs por default para serviços privados; usar `rails_blob_url(blob, expires_in: 1.hour)` para visualização temporária; para assets públicos (logo, ícone), configurar `public: true` no service do `config/storage.yml` para evitar overhead de signing; nunca compartilhar URL signed externamente sem auditoria de expiração
- **Quando usar:** arquivos privados/sensíveis (comprovantes, documentos médicos, financeiros)
- **Quando NÃO usar:** assets genuinamente públicos — `public: true` no service config remove signing overhead
- **Fonte:** active_storage_overview.md seção "Public access" + "Authenticated Controllers"; wf-8afc0f40 RAILS-SEC-095

### Pattern: Content-type validation via magic bytes + size limit

- **Problema:** browser pode declarar `Content-Type: image/jpeg` mas enviar executável ou SVG com script; validar só extensão do filename é bypassável (RAILS-SEC-006, RAILS-SEC-091)
- **Padrão:** validar `blob.content_type` (inferido por Marcel a partir dos primeiros bytes, não do header declarado) contra allowlist; também validar `byte_size`; gem `active_storage_validations` expõe `content_type:` e `size:` como validators declarativos; em código custom: `avatar.blob.content_type` + comparar whitelist; rejeitar SVG quando não necessário (XSS vetorial)
- **Quando usar:** 100% dos attachments user-uploaded — sem exceção
- **Quando NÃO usar:** nunca — esta validação é defesa de última linha
- **Fonte:** wf-a0aa55c4 RAILS-SEC-006; wf-8afc0f40 RAILS-SEC-091

## Anti-padrões

### Anti-pattern: blob órfão após substituição de attachment

- **Sintoma:** `user.avatar = new_file` + `user.save` substitui o attachment mas o blob antigo permanece no S3; custo de storage cresce silenciosamente; `ActiveStorage::Blob.unattached` scope acumula registros
- **Correção:** chamar `user.avatar.purge_later` antes de substituir; ou rodar rake task periódica: `ActiveStorage::Blob.unattached.where(created_at: ..2.days.ago).find_each(&:purge_later)`
- **Fonte:** active_storage_overview.md seção "Purging Unattached Uploads" + "Removing Files"

### Anti-pattern: variant gerada on-demand em UI crítica sem pré-processamento

- **Problema:** variant com `process: :lazily` (default) significa que a primeira request processa a imagem no momento em que o browser a requisita; em UIs com grids de imagem, isso pode impactar o tempo de resposta da primeira renderização
- **Correção:** usar `process: :immediately` para variants críticas ao salvar o attachment, ou `process: :later` para enfileirar via background job; para páginas com muitas imagens, usar `with_all_variant_records` scope para evitar N+1 nas queries de variant tracking
- **Fonte:** active_storage_overview.md seção "Variant Generation: Lazily, Later, Immediately" + "Lazy vs Immediate Loading"

### Anti-pattern: Direct uploads sem limpeza de blobs não-attached

- **Sintoma:** direct upload envia o arquivo para S3 antes do form ser submetido; se o usuário abandona o form, o blob fica em S3 sem `active_storage_attachments` correspondente; com volume alto, storage acumula orphans
- **Correção:** rodar `ActiveStorage::Blob.unattached.where(created_at: ..2.days.ago).find_each(&:purge_later)` em cron regular; Rails guides alertam explicitamente: "Using Direct Uploads can sometimes result in a file that uploads, but never attaches to a record"
- **Fonte:** active_storage_overview.md seção "Direct Uploads" nota + "Purging Unattached Uploads"

### Anti-pattern: Confiar em `Content-Type` declarado pelo browser

- **Sintoma:** validação baseada em `params[:avatar].content_type` (valor declarado pelo browser) ou extensão do filename; atacante envia executável com extensão `.jpg`
- **Correção:** usar `blob.content_type` após attach — ActiveStorage usa Marcel para inferir o tipo real a partir dos magic bytes do arquivo; combinar com `byte_size` limit e allowlist explícita
- **Fonte:** wf-8afc0f40 RAILS-SEC-091; wf-a0aa55c4 RAILS-SEC-006

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Arquivo logicamente do model (avatar, comprovante) | `has_one_attached` ou `has_many_attached` |
| Arquivo desacoplado de domain (exports, logs) | S3 direto com path próprio (sem ActiveStorage) |
| Imagem user-facing com múltiplos tamanhos | `variant(...)` + libvips (default Rails 7.1+) |
| Variant usada em UI crítica na primeira carga | `process: :immediately` no preset nomeado |
| Grid com muitas imagens + variant tracking | `with_all_variant_records` scope para evitar N+1 |
| Upload > 5MB ou volume alto simultâneo | `direct_upload: true` (browser envia direto para S3) |
| Arquivo privado/sensível | Signed URL com `expires_in: 1.hour` (default ActiveStorage) |
| Asset publicamente acessível (logo, ícone) | `public: true` no service config do `storage.yml` |
| Input de usuário em transformação de imagem | Presets nomeados no model — nunca `variant(params[:t] => params[:v])` |
| Substituir attachment existente | `user.avatar.purge_later` antes de substituir |

## Referências externas

- Skill: `/security` para signed URLs, content-type validation, CVE-2022-21831, CVE-2025-24293, blob authorization
- Skill: `/api-design` para direct upload patterns (proxy vs bypass, CORS para PUT direto)
- Skill: `/infrastructure` para configuração de S3/GCS/Azure backends, Mirror service, custo de storage
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-guides/references/active_storage_overview.md
  - claude-code/knowledge/Rails/compass_artifact_wf-8afc0f40-76b2-414c-bc2c-d344997397e4_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
