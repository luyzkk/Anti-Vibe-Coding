# agents/_contract/

Schemas canonicos do contrato de subagentes.

- `v1.schema.json` — JSON Schema draft-07 do contrato v1 (ADR-0002). **Imutavel** — referencia historica.
- `v2.schema.json` — JSON Schema draft-07 do contrato v2.0.0 (Wave 2 PRD DT-2). **Ativo** — adiciona `positive_observations` e `verdict` como campos obrigatorios. BREAKING: `"const": "2.0.0"`.
- Versoes futuras (v3, v4) adicionam novos arquivos; versoes anteriores ficam imutaveis.

Para spec completa em prosa: `docs/design-docs/subagent-contract-v1.md`.
Para migration guide (v1 -> v2): `docs/design-docs/subagent-contract-v2-migration.md`.
Para racional de design: `docs/design-docs/ADR-0002-subagent-contract.md`.
