// Wave 3 — unit tests for isMatrixFolder type guard.
import { describe, it, expect } from 'bun:test'
import { isMatrixFolder } from './stack-id-map'

describe('isMatrixFolder', () => {
  it('returns true for all valid MatrixFolder literals', () => {
    expect(isMatrixFolder('nodejs-typescript')).toBe(true)
    expect(isMatrixFolder('rails')).toBe(true)
    expect(isMatrixFolder('laravel')).toBe(true)
    expect(isMatrixFolder('python')).toBe(true)
  })

  it('returns false for unknown string', () => {
    expect(isMatrixFolder('unknown')).toBe(false)
    expect(isMatrixFolder('invalid-matrix-folder')).toBe(false)
    expect(isMatrixFolder('node-ts')).toBe(false)
    expect(isMatrixFolder('')).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isMatrixFolder(null)).toBe(false)
    expect(isMatrixFolder(undefined)).toBe(false)
    expect(isMatrixFolder(12345)).toBe(false)
    expect(isMatrixFolder({})).toBe(false)
    expect(isMatrixFolder([])).toBe(false)
  })
})
