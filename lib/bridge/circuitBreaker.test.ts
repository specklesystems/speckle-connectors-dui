import { describe, expect, it, vi } from 'vitest'
import {
  BridgeTimeoutError,
  BridgeUnavailableError,
  MethodCircuitBreaker,
  isBridgeTimeout,
  isBridgeUnavailable
} from './circuitBreaker'

const makeBreaker = (overrides: { now?: () => number } = {}) => {
  const transitions: string[] = []
  const breaker = new MethodCircuitBreaker({
    initialCooldownMs: 1000,
    maxCooldownMs: 4000,
    now: overrides.now ?? (() => 0),
    onTransition: (t) => transitions.push(`${t.methodName}:${t.state}:${t.cooldownMs}`)
  })
  return { breaker, transitions }
}

describe('MethodCircuitBreaker', () => {
  it('admits every call while the host answers', () => {
    const { breaker, transitions } = makeBreaker()
    expect(breaker.admit('GetSendFilters')).toBe(0)
    breaker.recordAnswer('GetSendFilters')
    expect(breaker.admit('GetSendFilters')).toBe(0)
    expect(breaker.stateOf('GetSendFilters')).toBe('closed')
    expect(transitions).toEqual([])
  })

  it('stays closed after a single timeout so one slow operation costs nothing', () => {
    const { breaker } = makeBreaker()
    breaker.recordTimeout('Send')
    expect(breaker.admit('Send')).toBe(0)
    expect(breaker.stateOf('Send')).toBe('closed')
  })

  it('an answer between two timeouts resets the count', () => {
    const { breaker } = makeBreaker()
    breaker.recordTimeout('Send')
    breaker.recordAnswer('Send')
    breaker.recordTimeout('Send')
    expect(breaker.stateOf('Send')).toBe('closed')
  })

  it('opens after consecutive timeouts and refuses calls for the cooldown', () => {
    let clock = 0
    const { breaker, transitions } = makeBreaker({ now: () => clock })
    breaker.recordTimeout('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    expect(breaker.stateOf('GetSendFilters')).toBe('open')
    expect(breaker.admit('GetSendFilters')).toBe(1000)
    clock = 600
    expect(breaker.admit('GetSendFilters')).toBe(400)
    expect(transitions).toEqual(['GetSendFilters:open:1000'])
  })

  it('keeps other methods on the same bridge unaffected', () => {
    const { breaker } = makeBreaker()
    breaker.recordTimeout('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    expect(breaker.admit('UpdateModel')).toBe(0)
  })

  it('lets exactly one probe through after the cooldown', () => {
    let clock = 0
    const { breaker } = makeBreaker({ now: () => clock })
    breaker.recordTimeout('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    clock = 1000
    expect(breaker.admit('GetSendFilters')).toBe(0)
    expect(breaker.stateOf('GetSendFilters')).toBe('half-open')
    expect(breaker.admit('GetSendFilters')).toBeGreaterThan(0)
  })

  it('doubles the cooldown, up to the cap, each time the probe times out', () => {
    let clock = 0
    const { breaker, transitions } = makeBreaker({ now: () => clock })
    breaker.recordTimeout('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')

    clock = 1000
    breaker.admit('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    expect(breaker.admit('GetSendFilters')).toBe(2000)

    clock = 3000
    breaker.admit('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    expect(breaker.admit('GetSendFilters')).toBe(4000)

    clock = 7000
    breaker.admit('GetSendFilters')
    breaker.recordTimeout('GetSendFilters')
    expect(breaker.admit('GetSendFilters')).toBe(4000)

    expect(transitions).toEqual([
      'GetSendFilters:open:1000',
      'GetSendFilters:half-open:1000',
      'GetSendFilters:open:2000',
      'GetSendFilters:half-open:2000',
      'GetSendFilters:open:4000',
      'GetSendFilters:half-open:4000',
      'GetSendFilters:open:4000'
    ])
  })

  it('closes again on any answer, including a late one, with the cooldown reset', () => {
    let clock = 0
    const { breaker, transitions } = makeBreaker({ now: () => clock })
    breaker.recordTimeout('UpdateModel')
    breaker.recordTimeout('UpdateModel')
    breaker.recordAnswer('UpdateModel')
    expect(breaker.stateOf('UpdateModel')).toBe('closed')
    expect(breaker.admit('UpdateModel')).toBe(0)
    expect(transitions).toEqual(['UpdateModel:open:1000', 'UpdateModel:closed:1000'])

    breaker.recordTimeout('UpdateModel')
    breaker.recordTimeout('UpdateModel')
    clock = 5000
    expect(breaker.admit('UpdateModel')).toBe(0)
    breaker.recordTimeout('UpdateModel')
    expect(breaker.admit('UpdateModel')).toBe(2000)
  })

  it('uses the documented defaults', () => {
    const now = vi.fn(() => 0)
    const breaker = new MethodCircuitBreaker({ now })
    breaker.recordTimeout('X')
    expect(breaker.admit('X')).toBe(0)
    breaker.recordTimeout('X')
    expect(breaker.admit('X')).toBe(5000)
  })
})

describe('bridge error classes', () => {
  it('keeps the historical timeout message so existing searches still match', () => {
    const error = new BridgeTimeoutError('GetSendFilters', 60000)
    expect(error.message).toBe(
      '.NET response timed out for call to GetSendFilters - did not receive anything back in good time (60000ms).'
    )
    expect(isBridgeTimeout(error)).toBe(true)
    expect(isBridgeUnavailable(error)).toBe(false)
  })

  it('distinguishes a skipped call from a timed-out one', () => {
    const error = new BridgeUnavailableError('UpdateModel', 5000)
    expect(error.retryInMs).toBe(5000)
    expect(isBridgeUnavailable(error)).toBe(true)
    expect(isBridgeTimeout(error)).toBe(false)
    expect(isBridgeUnavailable(new Error('x'))).toBe(false)
  })
})
