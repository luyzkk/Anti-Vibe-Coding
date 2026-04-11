# Decisões Arquiteturais — Anti-Vibe Coding

Registro de decisões técnicas relevantes do plugin. Use `/anti-vibe-coding:decision-registry` para consultar ou adicionar.

---

### Model Profiles — Formato de Configuração: JSON
**Data:** 2026-04-08
**Alternativas consideradas:** JSON, YAML, TOML
**Justificativa:** JSON é consistente com o ecossistema existente do plugin (hooks.json, plugin-manifest.json) e com o Claude Code (settings.json). Claude processa JSON com maior confiabilidade. Limitação de "sem comentários" é irrelevante — decisões de design ficam nos arquivos de task, não no JSON.
**Risco conhecido:** Trailing commas causam erro de parse silencioso. Mitigação: validar com `jq .` após editar.
**Reversibilidade:** Reversível

---

### Model Profiles — Estrutura de Perfis: 3 Fixos + Overrides
**Data:** 2026-04-08
**Alternativas consideradas:** 3 perfis fixos, perfis completamente customizáveis, perfis por agente individual
**Justificativa:** 3 perfis fixos (quality/balanced/budget) cobrem ~90% dos casos com zero decisão do dev. Campo `overrides` opcional oferece escape hatch para os 10% restantes sem forçar criação de perfil completo. Princípio: boring technology primeiro.
**Risco conhecido:** Dev pode não perceber que o perfil `budget` sacrifica qualidade em agentes específicos.
**Reversibilidade:** Reversível

---

### Model Profiles — security-auditor: Piso Sonnet
**Data:** 2026-04-08
**Alternativas consideradas:** haiku (custo mínimo), sonnet (piso absoluto), opus (máxima qualidade)
**Justificativa:** Custo assimétrico de falso negativo: vulnerabilidade não detectada vai para produção silenciosamente. Haiku raciocina em padrões superficiais — inadequado para raciocínio adversarial (timing attacks, ReDoS, injection). Sonnet é o piso absoluto em TODOS os perfis incluindo budget.
**Risco conhecido:** Nenhum — a restrição é uma garantia de segurança, não um risco.
**Reversibilidade:** Reversível (mas não recomendado)

---

### Model Profiles — Regra de Ouro Balanced: Sonnet para Agentes de Produção
**Data:** 2026-04-08
**Alternativas consideradas:** haiku para todos os agentes não-críticos, sonnet para agentes cujo falso negativo resulta em incidente
**Justificativa:** Agentes que detectam problemas com consequências de produção (N+1, índices ausentes, infra mal configurada, testes vacuamente passando) requerem sonnet em balanced. Afeta: database-analyzer, tdd-verifier, infrastructure-auditor. Haiku para esses agentes aumenta risco de falso negativo silencioso.
**Risco conhecido:** Custo ligeiramente maior no perfil balanced vs proposta original.
**Reversibilidade:** Reversível
