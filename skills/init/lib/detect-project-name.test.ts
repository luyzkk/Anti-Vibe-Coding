import { describe, it, expect } from 'bun:test'
import { detectProjectName } from './detect-project-name'

describe('detectProjectName', () => {
  it('returns basename of the given path', () => {
    expect(detectProjectName('/tmp/foo')).toBe('foo')
  })

  it('returns basename of a Windows-style path', () => {
    expect(detectProjectName('C:/Users/luiz/my-project')).toBe('my-project')
  })
})
