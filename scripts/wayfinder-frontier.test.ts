// Testes de scripts/wayfinder-frontier.ts — plano10 fase-02.
// Fixtures em tmpdir, nunca contra o repo real: o repo muda, o teste nao pode (G1).

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { analyseEffort, renderReport } from './wayfinder-frontier'

let effortDir: string

beforeEach(async () => {
  effortDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wayfinder-'))
})

afterEach(async () => {
  await fs.rm(effortDir, { recursive: true, force: true })
})

type TicketSpec = {
  id: string
  title: string
  type?: string
  status?: string
  blockedBy?: string
  claimed?: string
  outOfScope?: boolean
}

/** Escreve um ticket no formato do FORMATS.md. `eol` cobre o caso CRLF (G4). */
async function writeTicket(spec: TicketSpec, eol = '\n'): Promise<void> {
  const dir = path.join(effortDir, 'tickets')
  await fs.mkdir(dir, { recursive: true })
  const body = [
    '---',
    `id: ${spec.id}`,
    `title: ${spec.title}`,
    `type: ${spec.type ?? 'grilling'}`,
    `status: ${spec.status ?? 'open'}`,
    `blocked-by: ${spec.blockedBy ?? '[]'}`,
    `claimed: ${spec.claimed ?? ''}`,
    `out-of-scope: ${spec.outOfScope ?? false}`,
    '---',
    '',
    '## Question',
    '',
    `Pergunta do ticket ${spec.id}.`,
    '',
  ].join(eol)
  await fs.writeFile(path.join(dir, `${spec.id}-slug.md`), body, 'utf8')
}

async function writeMap(decisions: string): Promise<void> {
  await fs.writeFile(
    path.join(effortDir, 'MAP.md'),
    ['## Destination', '', 'Destino de teste.', '', '## Decisions so far', '', decisions, ''].join('\n'),
    'utf8',
  )
}

const titles = (list: ReadonlyArray<{ title: string }>): string[] => list.map((t) => t.title)

describe('wayfinder-frontier', () => {
  test('ticket aberto sem blocked-by entra na fronteira', async () => {
    await writeTicket({ id: '001', title: 'Nomear o destino' })
    const report = await analyseEffort(effortDir)
    expect(titles(report.frontier)).toEqual(['Nomear o destino'])
  })

  test('ticket bloqueado por ticket aberto fica fora da fronteira', async () => {
    await writeTicket({ id: '001', title: 'Bloqueador aberto' })
    await writeTicket({ id: '002', title: 'Depende do aberto', blockedBy: '[001]' })
    const report = await analyseEffort(effortDir)
    expect(titles(report.frontier)).toEqual(['Bloqueador aberto'])
    expect(titles(report.blocked.map((b) => b.ticket))).toEqual(['Depende do aberto'])
    expect(titles(report.blocked[0]!.waitingOn)).toEqual(['Bloqueador aberto'])
  })

  test('ticket bloqueado por ticket fechado entra na fronteira', async () => {
    await writeTicket({ id: '001', title: 'Bloqueador fechado', status: 'closed' })
    await writeTicket({ id: '002', title: 'Liberado', blockedBy: '[001]' })
    const report = await analyseEffort(effortDir)
    expect(titles(report.frontier)).toEqual(['Liberado'])
  })

  test('ticket bloqueado por um fechado e um aberto fica fora da fronteira', async () => {
    await writeTicket({ id: '001', title: 'Fechado', status: 'closed' })
    await writeTicket({ id: '002', title: 'Aberto' })
    await writeTicket({ id: '003', title: 'Espera os dois', blockedBy: '[001, 002]' })
    const report = await analyseEffort(effortDir)
    expect(titles(report.frontier)).toEqual(['Aberto'])
    const waiting = report.blocked.find((b) => b.ticket.id === '003')
    expect(titles(waiting!.waitingOn)).toEqual(['Aberto'])
  })

  test('ticket aberto e reivindicado sai da fronteira e aparece como reivindicado', async () => {
    const agora = new Date('2026-08-14T12:00Z')
    await writeTicket({ id: '001', title: 'Em andamento', claimed: '2026-08-14T11:00 feat/x' })
    const report = await analyseEffort(effortDir, agora)
    expect(report.frontier).toEqual([])
    expect(titles(report.claimed.map((c) => c.ticket))).toEqual(['Em andamento'])
    expect(report.claimed[0]!.claim.by).toBe('feat/x')
    expect(report.claimed[0]!.claim.stale).toBe(false)
  })

  // DI-Plano10-fase01-claim: o timestamp existe para a reivindicacao poder vencer.
  test('reivindicacao com mais de 24h volta para a fronteira, sinalizada', async () => {
    const agora = new Date('2026-08-14T12:00Z')
    await writeTicket({ id: '001', title: 'Sessao que morreu', claimed: '2026-08-12T09:00 feat/x' })
    const report = await analyseEffort(effortDir, agora)
    expect(titles(report.frontier)).toEqual(['Sessao que morreu'])
    expect(report.claimed).toEqual([])
    expect(report.warnings.join(' ')).toContain('Sessao que morreu')
  })

  test('ticket fechado nunca entra na fronteira', async () => {
    await writeTicket({ id: '001', title: 'Ja resolvido', status: 'closed' })
    const report = await analyseEffort(effortDir)
    expect(report.frontier).toEqual([])
    expect(report.blocked).toEqual([])
    expect(report.claimed).toEqual([])
  })

  test('ticket out-of-scope nunca entra na fronteira mesmo aberto', async () => {
    await writeTicket({ id: '001', title: 'Alem do destino', outOfScope: true })
    const report = await analyseEffort(effortDir)
    expect(report.frontier).toEqual([])
    expect(report.blocked).toEqual([])
  })

  test('blocked-by apontando para id inexistente vira erro', async () => {
    await writeTicket({ id: '001', title: 'Aponta para fantasma', blockedBy: '[999]' })
    const report = await analyseEffort(effortDir)
    expect(report.errors.join(' ')).toContain('999')
    expect(report.errors.join(' ')).toContain('Aponta para fantasma')
  })

  test('ciclo de bloqueio e reportado como erro', async () => {
    await writeTicket({ id: '001', title: 'Lado A', blockedBy: '[002]' })
    await writeTicket({ id: '002', title: 'Lado B', blockedBy: '[001]' })
    const report = await analyseEffort(effortDir)
    expect(report.errors.join(' ').toLowerCase()).toContain('ciclo')
    expect(report.errors.join(' ')).toContain('Lado A')
    expect(report.errors.join(' ')).toContain('Lado B')
  })

  test('diretorio tickets ausente produz saida vazia sem estourar', async () => {
    const report = await analyseEffort(effortDir)
    expect(report.frontier).toEqual([])
    expect(report.errors).toEqual([])
  })

  test('diretorio tickets vazio produz saida vazia sem estourar', async () => {
    await fs.mkdir(path.join(effortDir, 'tickets'), { recursive: true })
    const report = await analyseEffort(effortDir)
    expect(report.frontier).toEqual([])
    expect(report.errors).toEqual([])
  })

  // compound 2026-05-19: todo .md do repo fica CRLF no working tree do Windows.
  test('frontmatter com CRLF e parseado', async () => {
    await writeTicket({ id: '001', title: 'Escrito em CRLF' }, '\r\n')
    const report = await analyseEffort(effortDir)
    expect(titles(report.frontier)).toEqual(['Escrito em CRLF'])
  })

  // YAML CORE_SCHEMA le `003` como inteiro 3 — os zeros a esquerda somem.
  test('ids com zero a esquerda resolvem contra o arquivo', async () => {
    await writeTicket({ id: '003', title: 'Bloqueador', status: 'closed' })
    await writeTicket({ id: '012', title: 'Depende do 003', blockedBy: '[003]' })
    const report = await analyseEffort(effortDir)
    expect(report.errors).toEqual([])
    expect(titles(report.frontier)).toEqual(['Depende do 003'])
  })

  describe('divergencia entre mapa e tickets (INV-01)', () => {
    test('ticket fechado ausente de Decisions so far vira aviso', async () => {
      await writeTicket({ id: '001', title: 'Fechado e esquecido', status: 'closed' })
      await writeMap('- nenhuma decisao ainda')
      const report = await analyseEffort(effortDir)
      expect(report.warnings.join(' ')).toContain('Fechado e esquecido')
      expect(report.errors).toEqual([])
    })

    test('ticket fechado presente em Decisions so far nao gera aviso', async () => {
      await writeTicket({ id: '001', title: 'Fechado e indexado', status: 'closed' })
      await writeMap('- [Fechado e indexado](tickets/001-slug.md) — resolvido assim')
      const report = await analyseEffort(effortDir)
      expect(report.warnings).toEqual([])
    })

    test('linha de Decisions so far apontando para ticket inexistente vira aviso', async () => {
      await writeTicket({ id: '001', title: 'Existe', status: 'closed' })
      await writeMap(
        [
          '- [Existe](tickets/001-slug.md) — ok',
          '- [Sumiu](tickets/404-slug.md) — aponta para nada',
        ].join('\n'),
      )
      const report = await analyseEffort(effortDir)
      expect(report.warnings.join(' ')).toContain('404-slug.md')
      expect(report.errors).toEqual([])
    })
  })

  describe('saida', () => {
    test('fronteira vazia sem ticket aberto diz que o caminho esta claro', async () => {
      await writeTicket({ id: '001', title: 'Tudo resolvido', status: 'closed' })
      await writeMap('- [Tudo resolvido](tickets/001-slug.md) — feito')
      const report = await analyseEffort(effortDir)
      expect(renderReport(report, effortDir)).toContain('o caminho esta claro')
    })

    test('refere por nome, com o caminho do arquivo junto', async () => {
      await writeTicket({ id: '001', title: 'Pegavel agora' })
      const out = renderReport(await analyseEffort(effortDir), effortDir)
      expect(out).toContain('Pegavel agora')
      expect(out).toContain('001-slug.md')
    })

    test('fronteira com ticket aberto nao anuncia caminho claro', async () => {
      await writeTicket({ id: '001', title: 'Ainda aberto' })
      const out = renderReport(await analyseEffort(effortDir), effortDir)
      expect(out).not.toContain('o caminho esta claro')
    })
  })

  test('nao escreve em lugar nenhum (G5)', async () => {
    await writeTicket({ id: '001', title: 'Somente leitura' })
    const before = await fs.readFile(path.join(effortDir, 'tickets', '001-slug.md'), 'utf8')
    const listBefore = (await fs.readdir(effortDir)).sort()
    await analyseEffort(effortDir)
    const after = await fs.readFile(path.join(effortDir, 'tickets', '001-slug.md'), 'utf8')
    expect(after).toBe(before)
    expect((await fs.readdir(effortDir)).sort()).toEqual(listBefore)
  })
})
