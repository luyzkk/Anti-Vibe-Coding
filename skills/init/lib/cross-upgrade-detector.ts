// skills/init/lib/cross-upgrade-detector.ts

export type CrossUpgradeInput = {
  manifestPluginVersion: string | null
  currentPluginVersion: string
  claudeMdLineCount: number | null
  additiveOptIn: boolean
  dryRun: boolean
}

export type CrossUpgradeWarning = {
  shouldWarn: true
  message: string
}

export function detectCrossUpgrade(input: CrossUpgradeInput): CrossUpgradeWarning | null {
  if (input.manifestPluginVersion === null) return null
  if (input.claudeMdLineCount === null) return null
  if (input.claudeMdLineCount <= 40) return null
  if (input.additiveOptIn) return null
  if (input.dryRun) return null

  const manifestMajorMinor = input.manifestPluginVersion.split('.').slice(0, 2).join('.')
  const currentMajorMinor = input.currentPluginVersion.split('.').slice(0, 2).join('.')

  if (manifestMajorMinor !== '6.3' || currentMajorMinor !== '6.4') return null

  return {
    shouldWarn: true,
    message:
      'v6.4.0 mudou o comportamento default do /init para destrutivo. ' +
      'Seu CLAUDE.md (' + input.claudeMdLineCount + ' linhas) sera transformado em espelho <=40 linhas, ' +
      'com backup automatico em .anti-vibe/backup/. ' +
      'Use --additive-merge se preferir o comportamento v6.3.x. ' +
      'Ver docs/design-docs/ADR-0021-destructive-merge-default.md.',
  }
}
