/**
 * The host app rejected nothing and answered nothing: the bridge gave up waiting.
 */
export class BridgeTimeoutError extends Error {
  public readonly methodName: string
  public readonly timeoutMs: number

  constructor(methodName: string, timeoutMs: number) {
    super(
      `.NET response timed out for call to ${methodName} - did not receive anything back in good time (${timeoutMs}ms).`
    )
    this.name = 'BridgeTimeoutError'
    this.methodName = methodName
    this.timeoutMs = timeoutMs
  }
}

/**
 * The call was not sent: the method's circuit is open after repeated timeouts and
 * the host app is being given time to recover. Call sites treat this as "skip",
 * not as a failure worth reporting.
 */
export class BridgeUnavailableError extends Error {
  public readonly methodName: string
  public readonly retryInMs: number

  constructor(methodName: string, retryInMs: number) {
    super(
      `Bridge call to ${methodName} skipped: the host app has stopped answering it, retrying in ${retryInMs}ms.`
    )
    this.name = 'BridgeUnavailableError'
    this.methodName = methodName
    this.retryInMs = retryInMs
  }
}

export const isBridgeTimeout = (error: unknown): error is BridgeTimeoutError =>
  error instanceof BridgeTimeoutError

export const isBridgeUnavailable = (error: unknown): error is BridgeUnavailableError =>
  error instanceof BridgeUnavailableError

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitTransition {
  methodName: string
  state: CircuitState
  cooldownMs: number
  consecutiveTimeouts: number
}

export interface CircuitBreakerOptions {
  /** Timeouts in a row (no answer in between) before the circuit opens. */
  openAfterConsecutiveTimeouts?: number
  initialCooldownMs?: number
  maxCooldownMs?: number
  now?: () => number
  onTransition?: (transition: CircuitTransition) => void
}

interface MethodCircuit {
  state: CircuitState
  consecutiveTimeouts: number
  cooldownMs: number
  openedAt: number
}

/**
 * Per-method circuit breaker for bridge calls. Closed: every call goes through.
 * Open: calls are refused until the cooldown elapses. Half-open: exactly one probe
 * call is in flight; its answer closes the circuit, its timeout re-opens it with a
 * doubled cooldown.
 *
 * A single timeout never opens the circuit: long host operations (a big publish)
 * legitimately outlive the bridge timeout, and refusing the next click after one
 * of those would be a regression. Timeouts in a row with nothing answered in
 * between are the signature of a host that is not answering at all.
 */
export class MethodCircuitBreaker {
  private readonly circuits = new Map<string, MethodCircuit>()
  private readonly openAfterConsecutiveTimeouts: number
  private readonly initialCooldownMs: number
  private readonly maxCooldownMs: number
  private readonly now: () => number
  private readonly onTransition?: (transition: CircuitTransition) => void

  constructor(options: CircuitBreakerOptions = {}) {
    this.openAfterConsecutiveTimeouts = options.openAfterConsecutiveTimeouts ?? 2
    this.initialCooldownMs = options.initialCooldownMs ?? 5_000
    this.maxCooldownMs = options.maxCooldownMs ?? 60_000
    this.now = options.now ?? (() => Date.now())
    this.onTransition = options.onTransition
  }

  /**
   * Decides whether a call to `methodName` may be issued now. Returns 0 when it
   * may, otherwise the milliseconds until the next attempt will be admitted.
   */
  public admit(methodName: string): number {
    const circuit = this.circuits.get(methodName)
    if (!circuit || circuit.state === 'closed') return 0

    if (circuit.state === 'half-open') return circuit.cooldownMs

    const remaining = circuit.openedAt + circuit.cooldownMs - this.now()
    if (remaining > 0) return remaining

    this.transition(methodName, circuit, 'half-open')
    return 0
  }

  /** The host answered (result or error): it is alive, the circuit closes. */
  public recordAnswer(methodName: string): void {
    const circuit = this.circuits.get(methodName)
    if (!circuit) return
    if (circuit.state !== 'closed') this.transition(methodName, circuit, 'closed')
    this.circuits.delete(methodName)
  }

  public recordTimeout(methodName: string): void {
    const circuit = this.circuits.get(methodName) ?? {
      state: 'closed' as CircuitState,
      consecutiveTimeouts: 0,
      cooldownMs: this.initialCooldownMs,
      openedAt: 0
    }
    this.circuits.set(methodName, circuit)
    circuit.consecutiveTimeouts += 1

    if (circuit.state === 'half-open') {
      circuit.cooldownMs = Math.min(circuit.cooldownMs * 2, this.maxCooldownMs)
      circuit.openedAt = this.now()
      this.transition(methodName, circuit, 'open')
      return
    }

    if (
      circuit.state === 'closed' &&
      circuit.consecutiveTimeouts >= this.openAfterConsecutiveTimeouts
    ) {
      circuit.openedAt = this.now()
      this.transition(methodName, circuit, 'open')
    }
  }

  public stateOf(methodName: string): CircuitState {
    return this.circuits.get(methodName)?.state ?? 'closed'
  }

  private transition(methodName: string, circuit: MethodCircuit, state: CircuitState) {
    circuit.state = state
    this.onTransition?.({
      methodName,
      state,
      cooldownMs: circuit.cooldownMs,
      consecutiveTimeouts: circuit.consecutiveTimeouts
    })
  }
}
