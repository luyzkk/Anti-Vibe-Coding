---
title: "Detector de stack com anchor-presença sem content-match gera falso-positivo silencioso"
category: bug
tags: [detector, rails, anchor, false-positive, stack-detection, gemfile, content-match]
created: 2026-05-19
---

## Problem

`detectMultiStack` detectou `primary=rails` em fixture Sinatra-only — um projeto sem nenhuma linha `gem 'rails'` no Gemfile. O detector usava **presença do arquivo Gemfile** como âncora Rails, não **conteúdo do Gemfile**.

Resultado: `runStackKnowledgeInit` copiou o knowledge Rails completo (14 átomos) para um projeto Sinatra, emitindo "Stack detected: rails. Knowledge copied: 14 atoms." — falso-positivo completo, sem erro visível.

A fixture de teste que expôs o bug (`sinatra-no-rails`) foi o único sinal. Em produção, qualquer projeto Ruby não-Rails (Sinatra, Hanami, Roda, scripts com Bundler) receberia o knowledge errado.

## Solution

**Para testes:** usar `detectStack` (singular, regex-based sobre conteúdo) em vez de `detectMultiStack` quando a fixture é não-Rails. O detector singular já tinha a regex correta `/^\s*gem\s+["']rails["']/m` contra o conteúdo do Gemfile.

**Para produção (v6.3.4+):** refinar o anchor de `detectMultiStack` para exigir match de conteúdo, não só presença do arquivo:

```typescript
// Atual (falso-positivo Sinatra)
const hasGemfile = existsSync(join(dir, 'Gemfile'))

// Correto
const gemfileContent = readFileSafe(join(dir, 'Gemfile'))
const hasRailsGem = gemfileContent && /^\s*gem\s+['"]rails['"]/m.test(gemfileContent)
```

## Prevention

**Regra:** âncora de stack = presença do arquivo + match de conteúdo. Presença sozinha é condição necessária mas não suficiente para stacks Ruby (e potencialmente Python: `setup.py` não implica Django).

**Checklist ao implementar detector:**
1. Anchor file identifica a linguagem (Gemfile → Ruby)
2. Content-match identifica o framework (gem 'rails' → Rails)
3. Sem content-match, o detector deve retornar `unknown`/`null`, não o framework candidato

**Sinal de alerta:** detectar stack X em fixture Y que deliberadamente não usa X → anchor é amplo demais. Fixture negativa (sinatra-only, hanami-only) deve ser parte do suite do detector antes de release.

**Padrão relacionado:** [2026-05-18-detector-parser-narrow-happy-path.md](./2026-05-18-detector-parser-narrow-happy-path.md) — detector limitado ao caminho-feliz também falha em projetos legítimos não-padrão.
