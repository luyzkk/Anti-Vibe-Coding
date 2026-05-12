# Decisões Arquiteturais

### [Sistema de Versionamento]: Manifest com Checksums SHA-256
**Data:** 2026-03-23
**Alternativas consideradas:** 1. Git tags; 2. Timestamps; 3. Diff textual; 4. Manifest ✓
**Justificativa:** Checksums garantem detecção de modificações reais
**Risco conhecido:** Checksum do arquivo mesclado difere do original
**Reversibilidade:** Reversível

### [Idioma dos templates]: Inglês
**Data:** 2026-05-11
**Alternativas consideradas:** PT / EN / configurável
**Justificativa:** Economia 25-30% tokens
**Risco conhecido:** Acesso reduzido a leitores PT
**Reversibilidade:** Reversível
