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

### Público-alvo do framework v5.3: Híbrido (single-user power + plugin público)
**Data:** 2026-05-04
**Alternativas consideradas:** Single dev sem retrocompat; Comunidade ampla com defaults conservadores; Híbrido (escolhida)
**Justificativa:** Framework já tem versionamento + manifesto + sistema de update — infraestrutura para tratar como produto. Híbrido permite Luiz dirigir evolução sem travar, mas força disciplina de retrocompat (feature flags, rollout opt-in). Single-user perderia adopters; comunidade ampla retardaria evolução por proteger casos não-usuários.
**Risco conhecido:** Toda nova feature precisa avaliar impacto em ambos perfis. Adiciona overhead de testes/dogfooding (D14). Exige feature flags em mudanças semi-irreversíveis (D15).
**Reversibilidade:** Irreversível — mudar público-alvo após v5.3 publicada quebra contrato com adopters existentes.
**Origem:** /grill-me v5.3 (D1 em CONTEXT-v53-plugin-adaptativo.md)

---

### Onda 1 da v5.3: 5 universais + telemetria passiva (não 7 universais juntos)
**Data:** 2026-05-04
**Alternativas consideradas:** 7 universais juntos (risco de items 3 e 8 virarem dead weight sem dado para calibrar); 3 universais mínimos (perde momentum); 5 universais sem telemetria (perde baseline para Onda 2); 5 universais + telemetria passiva (escolhida)
**Justificativa:** Telemetria contínua substitui design especulativo. Coleta dados reais que decidem empiricamente quando 3 (Token Tax) e 8 (Comprehension Debt) entram. Inverte ordem clássica (design → ship → measure) para (measure → design → ship). Items 3 e 8 sem dados de calibração viram features sem critério.
**Risco conhecido:** Cria dependência da Onda 2 sobre dados da Onda 1 — Onda 2 não pode começar até ter ≥50 entradas de telemetria (D14). Adiciona complexidade nova à Onda 1 (storage, schema, instrumentação de 10 skills). Privacy-first restringe analytics a script local.
**Reversibilidade:** Semi-irreversível — escopo da Onda 1 pode ser ajustado durante implementação, mas a estrutura de telemetria, uma vez publicada, fica em manifesto público.
**Origem:** /grill-me v5.3 (D2 em CONTEXT-v53-plugin-adaptativo.md)

---

### Telemetria armazenada local-only (sem servidor central)
**Data:** 2026-05-04
**Alternativas consideradas:** Upload opt-in para mantenedor (GDPR + fricção); Endpoint configurável (complexidade de servidor); Local-only em `.claude/metrics/YYYY-MM.jsonl` (escolhida)
**Justificativa:** Privacy-first elimina barreira de adoção. Dados nunca saem do repo do dev. Quando Luiz quiser agregar dados de N projetos seus, roda script CLI local que lê `.claude/metrics/*.jsonl` de cada projeto. Sem servidor, sem GDPR, sem fricção de setup.
**Risco conhecido:** Análises agregadas exigem invocação manual do script CLI. Sem dashboard remoto. Sem visibilidade automática para o mantenedor sobre uso de outros adopters (alinhado com D1: comunidade é secundária). Onda 2 depende de script CLI maduro para alimentar decisões de Token Tax e Comprehension Debt.
**Reversibilidade:** Irreversível — depois de publicado como local-only, adicionar upload central exige opt-in explícito + nova versão major. Mudar storage path quebra repos com dados acumulados.
**Origem:** /grill-me v5.3 (D7 em CONTEXT-v53-plugin-adaptativo.md)

---

### Modo dual aplicado em todas skills estruturantes (architecture, plan-feature, write-prd, execute-plan, verify-work)
**Data:** 2026-05-04
**Alternativas consideradas:** Apenas planejamento (architecture, plan-feature, write-prd) — quebra coerência do pipeline; Plus correções proativas em verify-work — viola feedback_suggest_dont_execute.md; Em todas skills estruturantes (escolhida)
**Justificativa:** Coerência ao longo do pipeline. Token tax alto vira **dado** (telemetria) registrado, não prescrição automática. Luiz decide manualmente quando refatorar. Respeita memória `feedback_suggest_dont_execute.md` ao não introduzir sugestões automáticas em verify-work.
**Risco conhecido:** Toda skill estruturante precisa lógica de leitura do manifest + branching por perfil. Aumenta complexidade interna (mitigada por princípio "lê profile UMA vez no início, adapta saída — sem branching profundo"). Onda 1 deve testar 5 perfis × 5 skills = 25 combinações no dogfooding.
**Reversibilidade:** Semi-irreversível — desligar modo dual via flag é trivial (feature flag de D15), mas remover o suporte das skills exige refatoração das 5 skills.
**Origem:** /grill-me v5.3 (D11 em CONTEXT-v53-plugin-adaptativo.md)

---

### Rollout v5.2 → v5.3 via feature flag opt-in por repo (architectureDetectorEnabled)
**Data:** 2026-05-04
**Alternativas consideradas:** Big bang (/update aplica tudo automaticamente — risco se algo quebrar); Gradual em 3 releases (telemetria → detector → modo dual — exige coordenação de 3 versões); Feature flag opt-in por repo (escolhida)
**Justificativa:** Alinha com `feedback_suggest_dont_execute.md`. Luiz controla risco em cada projeto manualmente. Permite testar em 1 repo (Licitar piloto) antes de ativar em outros. Reverte rapidamente se houver problema (set flag = false). Telemetria passiva fica ligada sem flag (privacy-first em D7 mitiga risco).
**Risco conhecido:** Adoção mais lenta vs big bang. Exige documentação clara sobre como ativar a flag. /update precisa orientar o usuário a ativar quando estiver pronto. Telemetria passiva começa a coletar imediatamente em todos os repos atualizados.
**Reversibilidade:** Reversível — flag pode ser desligada em qualquer repo a qualquer momento sem efeito persistente.
**Origem:** /grill-me v5.3 (D15 em CONTEXT-v53-plugin-adaptativo.md)
