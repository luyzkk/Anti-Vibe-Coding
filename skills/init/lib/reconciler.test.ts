import { describe, it, expect } from 'bun:test'
import { runReconciler } from './reconciler'

describe('runReconciler', () => {
  it('module exists and exports runReconciler', () => {
    expect(typeof runReconciler).toBe('function')
  })
})
