// 2026-05-23 (Luiz/dev): fixture de positive_observations — PRD DC-5 / Wave 2 Plano 01 fase-04
// Casos VALIDOS e INVALIDOS para uso em testes e como referencia humana.
// VALIDO = cita arquivo com extensao OU simbolo identificavel E nao e tautologia E >= 15 chars.
// INVALIDO = tautologia blacklist OU curto demais OU sem citacao de arquivo/simbolo.

export const POSITIVE_OBSERVATIONS_FIXTURE = {
  valid: [
    // cita arquivo:linha com contexto de seguranca especifico
    'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12 (acima do minimo OWASP)',
    // cita arquivo:linha com validacao de payload
    'src/api/users/route.ts:88 valida payload com zod antes de tocar DB',
    // cita arquivo:linha com verificacao de JWT
    'lib/jwt.ts:15 verifica assinatura JWT (nao apenas decode)',
    // cita arquivo com simbolo backtick e contexto especifico
    'A funcao `hashPassword` em auth.ts usa bcrypt — implementacao correta',
    // cita middleware com rota especifica
    'O middleware `requireAdmin` em src/middleware/admin.ts:23 valida role antes de cada rota /api/admin',
    // cita classe PascalCase com comportamento verificavel
    'Class `JwtVerifier` em lib/security/jwt.ts:5 rejeita tokens com alg=none corretamente',
    // cita script com escape de input
    'scripts/build.py:120 escapa input antes do shell subprocess',
  ] as const,
  invalid: [
    { input: '', reason: 'vazia — length 0' },
    { input: 'ok', reason: 'curta demais — length < 15' },
    { input: 'no issues found', reason: 'tautologia blacklist — padrao ingles' },
    { input: 'looks fine', reason: 'tautologia blacklist — padrao ingles (curto)' },
    { input: 'tudo certo', reason: 'curta demais E tautologia blacklist (pt-BR)' },
    { input: 'codigo limpo', reason: 'curta demais E tautologia blacklist (pt-BR)' },
    { input: 'a aplicacao parece segura', reason: 'tautologia blacklist — "parece seguro"' },
    { input: 'auth e implementado corretamente', reason: 'sem citacao de arquivo (extensao) nem simbolo identificavel' },
    { input: 'everything is fine', reason: 'tautologia blacklist — padrao ingles' },
    { input: 'No Issues Found.', reason: 'tautologia blacklist — padrao ingles com maiuscula' },
  ] as const,
} as const
