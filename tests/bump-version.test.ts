import { describe, it, expect } from 'bun:test';

// Replica a lógica de bumpDescription do script bump-version.js
// para validar o comportamento sem dependência de I/O.
function bumpDescription(desc: string, oldVersion: string, newVersion: string, codename?: string | null): string {
  const escapedOld = oldVersion.replace(/\./g, '\\.');
  let updated = desc.replace(new RegExp(`v${escapedOld}`, 'g'), `v${newVersion}`);
  if (codename) {
    updated = updated.replace(/v[\d.]+\s*—\s*[^:.]+/, `v${newVersion} — ${codename}`);
  }
  return updated;
}

describe('bumpDescription', () => {
  it('replaces version number in description', () => {
    const desc = 'Plugin v6.1.0 — Contrato de Subagentes v1: detalhes.';
    const result = bumpDescription(desc, '6.1.0', '6.2.0');
    expect(result).toContain('v6.2.0');
    expect(result).not.toContain('v6.1.0');
  });

  it('keeps codename when no new codename provided', () => {
    const desc = 'Plugin v6.1.0 — Meu Codename: detalhes.';
    const result = bumpDescription(desc, '6.1.0', '6.2.0');
    expect(result).toContain('Meu Codename');
  });

  it('replaces codename when --codename is provided', () => {
    const desc = 'Plugin v6.1.0 — Antigo Codename: detalhes.';
    const result = bumpDescription(desc, '6.1.0', '6.2.0', 'Novo Codename');
    expect(result).toContain('Novo Codename');
    expect(result).not.toContain('Antigo Codename');
  });

  it('replaces all occurrences of old version', () => {
    const desc = 'v6.1.0 — Codename v1. Versão v6.1.0 estável.';
    const result = bumpDescription(desc, '6.1.0', '6.2.0');
    expect(result).not.toContain('v6.1.0');
    expect(result.match(/v6\.2\.0/g)?.length).toBe(2);
  });

  it('does not corrupt description when version is not found', () => {
    const desc = 'Descrição sem versão.';
    const result = bumpDescription(desc, '6.1.0', '6.2.0');
    expect(result).toBe('Descrição sem versão.');
  });
});

describe('semver validation', () => {
  const isValidSemver = (v: string) => /^\d+\.\d+\.\d+$/.test(v);

  it('accepts valid semver', () => {
    expect(isValidSemver('6.2.0')).toBe(true);
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('10.20.30')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidSemver('6.2')).toBe(false);
    expect(isValidSemver('v6.2.0')).toBe(false);
    expect(isValidSemver('latest')).toBe(false);
    expect(isValidSemver('')).toBe(false);
  });
});
