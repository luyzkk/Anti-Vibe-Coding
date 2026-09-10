// 2026-09-10 (Luiz/dev): `introduced` responde "desde quando esta skill existe" e é o único campo
// HISTÓRICO do manifest. O gerador o reescrevia com a versão corrente em toda regeneração, então a
// resposta era sempre "desde a versão de agora" — o campo estava funcionalmente morto desde a
// v6.3.2, com nota compound própria
// (docs/compound/2026-05-17-manifest-generator-overwrites-introduced-field.md).
//
// Medido em 2026-09-09, no bump de 7.8.0 para 7.9.0: as 46 skills passaram de `v7.8.0` para
// `v7.9.0` de uma vez, incluindo `/init`, que existe desde a v6.0.0.
//
// A heurística que a nota compound deixou, e que este arquivo guarda: quando o output tem campo
// histórico (`introduced`, `created_at`, `first_seen`), o gerador PRECISA ler o estado anterior.
// Gerar tudo do zero apaga o histórico embutido no próprio output.
//
// Este arquivo IMPORTA o script. Para isso `generateManifest()` passou a rodar só quando o arquivo
// é executado: antes ele rodava no topo do módulo, então importar para testar REESCREVIA o manifest
// do repo — que é a razão de este script nunca ter tido teste.
import { describe, it, expect, afterAll } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { introducedFor, readPreviousSkills, collectSkillsIndex } = require('../scripts/generate-manifest.js');

const ANTERIOR = {
  init: { path: 'skills/init/', version: '7.8.0', introduced: 'v6.0.0', description: '' },
  security: { path: 'skills/security/', version: '7.8.0', introduced: 'v6.2.0', description: '' },
};

describe('introducedFor — o campo histórico vem do manifest anterior', () => {
  it('preserva o introduced de uma skill que já existia', () => {
    expect(introducedFor('init', ANTERIOR, '7.9.0')).toBe('v6.0.0');
  });

  it('preserva por NOME, sem herdar o de outra skill', () => {
    expect(introducedFor('security', ANTERIOR, '7.9.0')).toBe('v6.2.0');
  });

  it('não reescreve o histórico quando a versão corrente muda', () => {
    // O coração do bug: bump é justamente quando `version` difere, e era exatamente aí que o
    // campo era achatado.
    expect(introducedFor('init', ANTERIOR, '9.9.9')).toBe('v6.0.0');
  });
});

describe('introducedFor — skill nova recebe a versão corrente', () => {
  it('carimba a versão corrente numa skill ausente do anterior', () => {
    expect(introducedFor('skill-nova', ANTERIOR, '7.9.0')).toBe('v7.9.0');
  });

  it('carimba a versão corrente quando não há manifest anterior', () => {
    expect(introducedFor('init', {}, '7.9.0')).toBe('v7.9.0');
    expect(introducedFor('init', undefined, '7.9.0')).toBe('v7.9.0');
    expect(introducedFor('init', null, '7.9.0')).toBe('v7.9.0');
  });
});

describe('introducedFor — valor anterior inutilizável não é propagado', () => {
  it('ignora introduced ausente, vazio ou de tipo errado', () => {
    const sujo = {
      a: { introduced: '' },
      b: { introduced: '   ' },
      c: { introduced: 42 },
      d: {},
    };
    for (const nome of ['a', 'b', 'c', 'd']) {
      expect(introducedFor(nome, sujo, '7.9.0')).toBe('v7.9.0');
    }
  });

  it('não quebra quando a entrada anterior não é objeto', () => {
    expect(introducedFor('x', { x: null }, '7.9.0')).toBe('v7.9.0');
    expect(introducedFor('x', { x: 'texto' }, '7.9.0')).toBe('v7.9.0');
  });
});

const tempDirs: string[] = [];
function tempFile(nome: string, conteudo: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genmanifest-'));
  tempDirs.push(dir);
  const p = path.join(dir, nome);
  fs.writeFileSync(p, conteudo, 'utf8');
  return p;
}

afterAll(() => {
  for (const dir of tempDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ }
  }
});

describe('readPreviousSkills — falha aberta, mas nunca calada', () => {
  it('devolve o índice quando o manifest anterior está sadio', () => {
    const p = tempFile('m.json', JSON.stringify({ skills: { init: { introduced: 'v6.0.0' } } }));
    expect(readPreviousSkills(p)).toEqual({ init: { introduced: 'v6.0.0' } });
  });

  it('devolve vazio quando não há manifest anterior — primeira geração', () => {
    expect(readPreviousSkills(path.join(os.tmpdir(), 'nao-existe-mesmo-12345.json'))).toEqual({});
  });

  it('devolve vazio quando o manifest anterior está corrompido', () => {
    const p = tempFile('m.json', '{ isto nao e json');
    expect(readPreviousSkills(p)).toEqual({});
  });

  it('devolve vazio quando o manifest anterior não tem índice de skills', () => {
    const p = tempFile('m.json', JSON.stringify({ version: '7.8.0', files: {} }));
    expect(readPreviousSkills(p)).toEqual({});
  });
});

describe('collectSkillsIndex — a fiação entre o leitor e o índice', () => {
  // Sem este teste, alguém pode passar `{}` em vez do manifest anterior e as assertions de
  // `introducedFor` continuam todas verdes — a função certa, desligada do chamador.
  it('usa o introduced que veio do manifest anterior', () => {
    const idx = collectSkillsIndex({ init: { introduced: 'v6.0.0' } });
    expect(idx.init).toBeDefined();
    expect(idx.init.introduced).toBe('v6.0.0');
  });

  it('carimba a versão corrente nas skills ausentes do anterior', () => {
    const idx = collectSkillsIndex({ init: { introduced: 'v6.0.0' } });
    const outra = Object.keys(idx).find((n) => n !== 'init');
    expect(outra).toBeDefined();
    expect(idx[outra!].introduced).not.toBe('v6.0.0');
    expect(idx[outra!].introduced).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});

// 2026-09-10 (Luiz/dev): este é o único teste que exercita o gerador INTEIRO, por subprocesso.
//
// Ele existe porque uma mutação medida sobreviveu a todos os outros: trocar
// `collectSkillsIndex(previousSkills)` por `collectSkillsIndex({})` dentro de `generateManifest`
// deixava os 13 testes verdes. As funções certas, desligadas do chamador — que é exatamente a
// forma do bug original.
//
// O sandbox vive fora do repo e copia o script REAL em tempo de execução. Cópia commitada
// envelheceria e passaria a testar a si mesma; cópia feita na hora testa o arquivo de verdade.
// `node_modules` entra por junction porque o script importa js-yaml.
describe('gerador completo — o histórico sobrevive a uma troca de versão', () => {
  it('preserva introduced ao regenerar com outra versão', () => {
    const REPO = path.join(import.meta.dir, '..');
    const box = fs.mkdtempSync(path.join(os.tmpdir(), 'genmanifest-e2e-'));
    tempDirs.push(box);

    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(box, 'node_modules'), 'junction');
    fs.mkdirSync(path.join(box, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(box, 'skills', 'antiga'), { recursive: true });
    fs.mkdirSync(path.join(box, 'skills', 'recem-chegada'), { recursive: true });

    fs.copyFileSync(path.join(REPO, 'scripts/generate-manifest.js'), path.join(box, 'scripts/generate-manifest.js'));
    fs.writeFileSync(path.join(box, 'package.json'), JSON.stringify({ name: 'box', version: '1.0.0' }));
    fs.writeFileSync(path.join(box, 'skills/antiga/SKILL.md'), '---\nname: antiga\ndescription: x\n---\n');
    fs.writeFileSync(path.join(box, 'skills/recem-chegada/SKILL.md'), '---\nname: recem-chegada\ndescription: y\n---\n');
    fs.writeFileSync(
      path.join(box, 'plugin-manifest.json'),
      JSON.stringify({ version: '6.0.0', skills: { antiga: { introduced: 'v6.0.0' } }, files: {} }),
    );

    const r = Bun.spawnSync(['bun', 'scripts/generate-manifest.js'], {
      cwd: box,
      env: { ...process.env, PLUGIN_VERSION: '9.9.9' },
    });
    expect(r.exitCode).toBe(0);

    const gerado = JSON.parse(fs.readFileSync(path.join(box, 'plugin-manifest.json'), 'utf8'));
    expect(gerado.version).toBe('9.9.9');
    // DEFESA A MUTAR: a skill que já existia mantém a versão em que nasceu.
    expect(gerado.skills.antiga.introduced).toBe('v6.0.0');
    // E a nova nasce carimbada com a versão desta rodada.
    expect(gerado.skills['recem-chegada'].introduced).toBe('v9.9.9');
  });
});
