// 2026-09-10 (Luiz/dev): este arquivo IMPORTA `scripts/bump-version.js`. Antes ele reimplementava
// `bumpDescription` no próprio teste, e o efeito é pior que não testar:
//
//   - mudar o script não quebrava teste nenhum, porque a cópia não sabe do original;
//   - e a cópia consagrava o BUG. Dois casos afirmavam explicitamente o comportamento defeituoso:
//     "replaces all occurrences of old version" (reescrever menção histórica) e "replaces codename
//     when --codename is provided" (apagar o nome da release anterior).
//
// É a mesma armadilha da issue #82, onde a expectativa do teste usava o mesmo helper do host que a
// implementação: o teste concordava consigo mesmo, nunca com a spec.
//
// A `description` do plugin é um histórico ACUMULADO de releases, mais novo primeiro, precedido de
// uma frase de apresentação. Um bump acrescenta uma entrada; ele nunca reescreve o que já está lá.
import { describe, it, expect } from 'bun:test';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { bumpDescription, isValidSemver } = require('../scripts/bump-version.js');

/** Formato real da description do plugin: apresentação + entradas, mais nova primeiro. */
const DESC = [
  'Plugin de desenvolvimento disciplinado com conhecimentos de programador senior.',
  'v7.8.0 — Contrato do Ciclo TDD: o ciclo passou a ter uma definicao so.',
  'v7.6.0 — Import mattpocock/skills: 13 aprovadas, 22 descartadas.',
].join(' ');

describe('bumpDescription — o histórico é acrescentado, nunca reescrito', () => {
  it('preserva o headline da release anterior', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r).toContain('v7.8.0 — Contrato do Ciclo TDD');
  });

  it('não reescreve as menções históricas da versão antiga', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r).toContain('v7.8.0');
    expect(r).toContain('v7.6.0 — Import mattpocock/skills');
  });

  it('mantém o corpo da release anterior colado no headline dela, não no novo', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r).toContain('v7.8.0 — Contrato do Ciclo TDD: o ciclo passou a ter uma definicao so.');
  });

  it('insere a entrada nova antes da primeira entrada existente', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r.indexOf('v7.9.0 — Honestidade de Config')).toBeGreaterThan(-1);
    expect(r.indexOf('v7.9.0 — Honestidade de Config')).toBeLessThan(r.indexOf('v7.8.0'));
  });

  it('mantém a frase de apresentação na frente de tudo', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r.startsWith('Plugin de desenvolvimento disciplinado')).toBe(true);
  });

  it('separa a entrada nova da anterior, sem colar as duas', () => {
    const r = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(r).not.toContain('Honestidade de Configv7.8.0');
    expect(r).toContain('Honestidade de Config. v7.8.0');
  });
});

describe('bumpDescription — sem codename não há entrada a acrescentar', () => {
  // O antigo "replaces version number in description" exigia o contrário: que a versão antiga fosse
  // reescrita no texto. A versão corrente vive no campo `version` do JSON; a description guarda
  // história, e história não se reescreve.
  it('devolve a descrição intacta quando nenhum codename é passado', () => {
    expect(bumpDescription(DESC, '7.8.0', '7.9.0')).toBe(DESC);
    expect(bumpDescription(DESC, '7.8.0', '7.9.0', null)).toBe(DESC);
  });
});

describe('bumpDescription — casos de borda', () => {
  it('não duplica a entrada se ela já existe', () => {
    const uma = bumpDescription(DESC, '7.8.0', '7.9.0', 'Honestidade de Config');
    const duas = bumpDescription(uma, '7.8.0', '7.9.0', 'Honestidade de Config');
    expect(duas).toBe(uma);
  });

  it('acrescenta a entrada sem perder o texto quando não há marcador de versão', () => {
    const semVersao = 'Descricao sem versao.';
    const r = bumpDescription(semVersao, '7.8.0', '7.9.0', 'Nome Novo');
    expect(r).toContain('Descricao sem versao.');
    expect(r).toContain('v7.9.0 — Nome Novo');
  });

  it('não quebra com descrição vazia', () => {
    expect(bumpDescription('', '7.8.0', '7.9.0', 'Nome')).toContain('v7.9.0 — Nome');
    expect(bumpDescription('', '7.8.0', '7.9.0')).toBe('');
  });
});

describe('isValidSemver', () => {
  it('aceita semver válido', () => {
    expect(isValidSemver('6.2.0')).toBe(true);
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('10.20.30')).toBe(true);
  });

  it('rejeita formatos inválidos', () => {
    expect(isValidSemver('6.2')).toBe(false);
    expect(isValidSemver('v6.2.0')).toBe(false);
    expect(isValidSemver('latest')).toBe(false);
    expect(isValidSemver('')).toBe(false);
  });
});
