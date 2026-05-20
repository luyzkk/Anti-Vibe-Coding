---
topic: deployment-with-kamal
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-upgrade/version-guides/upgrade-7.2-to-8.0.md
  - claude-code/knowledge/Rails/rails-upgrade/version-guides/upgrade-8.0-to-8.1.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
tier: 2
triggers: [deployment, kamal, docker, rails 8, asset compilation, secrets, traefik, zero downtime, capistrano, dockerfile, /up, healthcheck]
related_skills: [/infrastructure, /system-design]
updated: 2026-05-19
rails_versions: ['>=8.0']
---

# Deployment com Kamal 2

## Quando consultar

- Ao fazer deploy de um app Rails 8 novo (Kamal é o default scaffoldado pelo generator)
- Ao migrar de Capistrano ou Heroku para deploy containerizado em servidor próprio
- Ao configurar healthcheck e SSL em produção com Kamal
- Ao decidir como rodar Solid Queue junto ao Puma (sidecar vs. role separada)
- Ao entender quais arquivos novos o `rails app:update` (7.2 → 8.0) gera para deploy

## Padrões sênior

### Pattern: Kamal como default de deploy no Rails 8

- **Problema:** dev não sabe que Rails 8 scaffolda infraestrutura de deploy automaticamente
- **Padrão:** `bin/rails new` em Rails 8 cria `config/deploy.yml` e o diretório `.kamal/` prontos para Kamal. Kamal é o mecanismo de deploy official no Rails 8 — não requer configuração adicional para começar. Ao rodar `rails app:update` em um projeto 7.2, esses arquivos também são gerados
- **Quando usar:** qualquer projeto Rails 8 com deploy em servidor próprio ou VPS
- **Quando não usar:** apps em PaaS gerenciado (Heroku, Render, Fly.io) onde a plataforma cuida do build/deploy — os arquivos Kamal podem ser ignorados ou deletados

### Pattern: Dockerfile gerado pelo Rails 8 para build containerizado

- **Problema:** devs herdam o Dockerfile do Rails 8 sem entender para que serve e o modificam desnecessariamente
- **Padrão:** Rails 8 inclui um `Dockerfile` otimizado para produção como parte dos novos arquivos gerados. É o artefato de build que Kamal usa para criar a imagem do container. O Dockerfile é um dos arquivos-chave criados em `rails app:update` (junto de `config/deploy.yml` e `bin/jobs`)
- **Quando usar:** sempre que usar Kamal para deploy — Kamal consome a imagem Docker construída a partir deste Dockerfile
- **Quando não usar:** se app está em PaaS que tem seu próprio builder (Heroku buildpack, Render native build) — Dockerfile de produção não é necessário

### Pattern: SSL delegado ao Kamal (Rails 8.1+)

- **Problema:** devs do Rails 8.1 encontram `config.force_ssl` e `config.assume_ssl` comentados em `production.rb` e ficam confusos
- **Padrão:** em Rails 8.1, SSL configuration é comentada por default porque Kamal trata o SSL na camada de proxy. Se usando Kamal, deixar comentado. Se NOT usando Kamal (deploy tradicional sem proxy), descomentar `force_ssl` e `assume_ssl` explicitamente
- **Quando usar:** sempre que usar Kamal em Rails 8.1 — não descomentar SSL no `production.rb`
- **Quando não usar:** deploy sem Kamal (Capistrano, PaaS direto) — nesse caso descomentar `force_ssl = true` e `assume_ssl = true` em `production.rb`

### Pattern: Healthcheck via endpoint `/up` (Rails 8)

- **Problema:** containers de produção sem probe de liveness falham silenciosamente sem detecção
- **Padrão:** Rails 8 expõe o endpoint `/up` nativamente. Em ambientes Kubernetes ou Kamal, usar `livenessProbe` apontando para `/up` do Rails 8. Kamal usa o endpoint de health do container para decidir quando rotear tráfego para o novo container
- **Quando usar:** qualquer deploy containerizado com Rails 8 — Kamal e K8s usam `/up`
- **Quando não usar:** ambientes puramente de desenvolvimento onde probes adicionam overhead desnecessário

### Pattern: Solid Queue em apps Kamal — Puma inline vs. role separada

- **Problema:** dev não sabe como rodar Solid Queue no mesmo host Kamal que o Puma
- **Padrão:** para apps pequenos, `SOLID_QUEUE_IN_PUMA=1` faz o Puma rodar o supervisor do Solid Queue no mesmo processo. Para apps médios/grandes, declarar Solid Queue como `accessory` ou como role separada no `deploy.yml` do Kamal — processo isolado, lifecycle independente
- **Quando usar inline (`SOLID_QUEUE_IN_PUMA=1`):** app pequeno, host único, sem necessidade de escalar workers independentemente
- **Quando usar role separada:** app médio/grande onde workers e web precisam escalar com configuração diferente ou ter lifecycle independente

### Pattern: Rails 8 é container-first — sem modo PaaS

- **Problema:** dev vindo de Heroku/PaaS tenta usar o mesmo workflow de `git push heroku main` e percebe que Rails 8 não foi projetado para isso
- **Padrão:** Rails 8 é explicitamente "designed for containerized deployment" e "no more PaaS mode". O stack default inclui: Propshaft (asset pipeline), Solid Cache/Queue/Cable (database-backed, sem Redis), Kamal (deploy containerizado) e Thruster (HTTP serving em produção). Qualquer recomendação anterior baseada em Redis/Sidekiq/Memcached precisa ser reavaliada projeto a projeto
- **Quando usar:** projetos Rails 8 novos — adotar o stack container-first como default
- **Quando não usar:** migração de Rails 7.x com Redis e Sidekiq estabelecidos — manter o stack atual se funcionando; Solid Trifecta é opt-in na migração

## Anti-padrões

### Anti-pattern: Deletar ou ignorar `config/deploy.yml` e `.kamal/` em Rails 8

- **Sintoma:** dev faz `rm config/deploy.yml` por não reconhecer os arquivos e depois tenta configurar deploy manualmente
- **Por que é ruim:** esses arquivos são o ponto de entrada de Kamal — deletar impede o deploy containerizado default do Rails 8
- **Correção:** se não for usar Kamal (PaaS), manter os arquivos mas documentar a decisão. Se for usar Kamal, editar `config/deploy.yml` com as configurações do ambiente alvo

### Anti-pattern: Descomentar `force_ssl` em `production.rb` quando usando Kamal (Rails 8.1)

- **Sintoma:** redirect loop (`ERR_TOO_MANY_REDIRECTS`) em produção com Kamal no Rails 8.1
- **Por que é ruim:** Kamal já trata SSL na camada de proxy; habilitar `force_ssl` no Rails causa loop duplo de redirect
- **Correção:** deixar `config.force_ssl` e `config.assume_ssl` comentados em `production.rb` quando usando Kamal. Descomentar apenas se migrando para deploy sem proxy Kamal

### Anti-pattern: Usar Kamal em projetos Rails 7.x sem adaptação

- **Sintoma:** dev tenta instalar Kamal em projeto Rails 7.x como se fosse drop-in, sem Dockerfile gerado pelo Rails 8
- **Por que é ruim:** Kamal é default a partir do Rails 8 — Rails 7.x não gera `Dockerfile` nem `config/deploy.yml` automaticamente; a configuração é manual e error-prone
- **Correção:** para Rails 7.x sem Docker, usar Capistrano (alternativa legada, nota D16). Para Rails 7.x com Docker, Kamal pode ser usado mas requer setup manual do Dockerfile. Considerar upgrade para Rails 8

### Anti-pattern: Rodar `SOLID_QUEUE_IN_PUMA=1` em app com alta carga de jobs

- **Sintoma:** workers de background bloqueiam threads do Puma, causando latência em requests web
- **Por que é ruim:** compartilhar processo Puma com Solid Queue supervisor consome threads que deveriam servir requests HTTP
- **Correção:** para apps médios/grandes, declarar Solid Queue como `accessory` ou role separada no Kamal `deploy.yml` — processos isolados com lifecycle e recursos independentes

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Rails 8 novo projeto, servidor próprio/VPS | Kamal 2 (default — `config/deploy.yml` já scaffoldado) |
| Rails 8.1 — SSL em `production.rb` | Deixar comentado se usando Kamal; descomentar se não |
| Rails 7.x sem Docker | Capistrano (alternativa legada, D16) |
| Healthcheck de container | Endpoint `/up` nativo Rails 8 |
| App pequeno com Solid Queue no mesmo host Kamal | `SOLID_QUEUE_IN_PUMA=1` |
| App médio/grande com Solid Queue | Role separada ou `accessory` no `deploy.yml` |
| PaaS (Heroku, Render, Fly.io) | Ignorar/deletar arquivos Kamal; usar mecanismo da plataforma |
| Deploy Rails 8 em Kubernetes | `livenessProbe` em `/up`; Kamal não necessário |
| Rails 8 com Redis/Sidekiq já estabelecido | Manter Redis/Sidekiq — Solid Trifecta é opt-in na migração |
| Thruster vs. nginx como HTTP server em produção | Thruster é o default do Rails 8 — nginx se já estabelecido ou necessário por restrição de infra |

## Referências externas

- Skills relacionadas: /infrastructure (deploy containerizado, registry, zero-downtime cross-stack), /system-design (healthcheck design, capacity planning)
- Nota Capistrano (D16): projetos Rails legados (7.x sem Docker) ainda usam Capistrano com `cap production deploy`. Para Rails 8 moderno, Kamal é o caminho padrão.
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-upgrade/version-guides/upgrade-7.2-to-8.0.md
  - claude-code/knowledge/Rails/rails-upgrade/version-guides/upgrade-8.0-to-8.1.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
