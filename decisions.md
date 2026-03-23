# Decisões Arquiteturais

### Sistema de Versionamento: Manifest com Checksums SHA-256

**Data:** 2026-03-23
**Status:** Implementado (v4.0.0)

**Alternativas consideradas:**
1. **Git tags no plugin** — Versionar o plugin e deixar usuário fazer git pull manual
2. **Timestamps de modificação** — Comparar datas de arquivo em vez de checksums
3. **Diff textual** — Comparar conteúdo sem checksums
4. **Manifest com checksums SHA-256** ✓ (escolhida)

**Justificativa:**

**Por que checksums em vez de timestamps:**
- Timestamps mudam ao copiar/mover arquivos
- Usuário pode "tocar" arquivo sem modificar conteúdo
- Checksums garantem detecção de modificações reais
- SHA-256 é padrão da indústria (Git usa SHA-1/SHA-256)

**Por que manifest em vez de Git:**
- Projetos podem não usar Git
- Usuários podem ter modificações não commitadas
- Plugin precisa rastrear arquivos específicos, não todo o repo
- Manifest local permite rastreamento independente por projeto

**Por que duas camadas (plugin-manifest + local-manifest):**
- `plugin-manifest.json` = fonte de verdade (versão oficial)
- `.anti-vibe-manifest.json` = estado local (o que está instalado)
- Permite comparação: "o que mudou no plugin" vs "o que mudou localmente"

**Estrutura escolhida:**

```json
// plugin-manifest.json (no plugin)
{
  "version": "4.0.0",
  "files": {
    "CLAUDE.md": {
      "version": "4.0.0",
      "checksum": "ff1b3e...",
      "updateStrategy": "merge"
    }
  }
}

// .anti-vibe-manifest.json (no projeto)
{
  "pluginVersion": "4.0.0",
  "files": {
    "CLAUDE.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "a3f2e8...",  // checksum APÓS merge
      "userModified": true
    }
  }
}
```

**Risco conhecido:**
- Checksum do arquivo mesclado é diferente do checksum original do plugin
- Se usuário modificar e depois apagar modificação, o checksum volta ao original mas flag `userModified` permanece `true`
- Mitigação: Usuário pode rodar `/anti-vibe-coding:init` que recalcula checksums

**Reversibilidade:** Reversível

- Backups automáticos em `.claude/backups/YYYY-MM-DD/`
- Usuário pode deletar `.anti-vibe-manifest.json` e reinstalar
- Manifest não afeta código de produção (apenas metadados)

<!--
Formato:
### [Nome da Decisão]: [Opção Escolhida]
**Data:** YYYY-MM-DD
**Alternativas consideradas:** ...
**Justificativa:** ...
**Risco conhecido:** ...
**Reversibilidade:** Reversível / Irreversível
-->
