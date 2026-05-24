// 2026-05-24 (Luiz/dev): modulo neutro de tipos compartilhados entre patch-agents e patch-new-plan
// Sem dependencias de implementacao — apenas tipos puros

export type PatchResult = {
  status: 'patched' | 'already-present' | 'created' | 'appended'
  message: string
}
