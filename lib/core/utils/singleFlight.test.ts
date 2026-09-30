import { describe, expect, it } from 'vitest'
import { singleFlight } from './singleFlight'

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('singleFlight', () => {
  it('runs the task once per call when calls do not overlap', async () => {
    let runs = 0
    const run = singleFlight(() => {
      runs += 1
      return Promise.resolve()
    })
    await run()
    await run()
    expect(runs).toBe(2)
  })

  it('collapses a burst into the in-flight run plus one trailing run', async () => {
    const gates = [deferred(), deferred()]
    let runs = 0
    const run = singleFlight(() => gates[runs++].promise)

    const first = run()
    void run()
    void run()
    void run()
    expect(runs).toBe(1)

    gates[0].resolve()
    await first
    await flush()
    expect(runs).toBe(2)

    gates[1].resolve()
    await flush()
    expect(runs).toBe(2)
  })

  it('shares the in-flight promise with callers that arrive during it', async () => {
    const gate = deferred()
    const run = singleFlight(() => gate.promise)
    const a = run()
    const b = run()
    expect(a).toBe(b)
    gate.resolve()
    await a
  })

  it('never rejects and keeps working after the task fails', async () => {
    let runs = 0
    const run = singleFlight(() => {
      runs += 1
      return runs === 1
        ? Promise.reject(new Error('host timed out'))
        : Promise.resolve()
    })
    await expect(run()).resolves.toBeUndefined()
    await run()
    expect(runs).toBe(2)
  })

  it('runs the trailing task even when the in-flight one failed', async () => {
    const gate = deferred()
    let runs = 0
    const run = singleFlight(() => {
      runs += 1
      return runs === 1 ? gate.promise : Promise.resolve()
    })
    const first = run()
    void run()
    gate.reject(new Error('timed out'))
    await first
    await flush()
    expect(runs).toBe(2)
  })
})
