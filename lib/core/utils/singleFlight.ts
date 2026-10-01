/**
 * Collapses concurrent invocations of an idempotent async task into one in-flight
 * run plus at most one trailing run. Callers that arrive while a run is in flight
 * share its promise and the task runs once more after it settles, so the last
 * caller still gets a result computed after its request. The task's own rejection
 * is handled by the task; the returned promise never rejects.
 */
export function singleFlight(task: () => Promise<void>): () => Promise<void> {
  let inFlight: Promise<void> | undefined
  let trailingRequested = false

  const run = (): Promise<void> => {
    if (inFlight) {
      trailingRequested = true
      return inFlight
    }

    inFlight = task()
      .catch(() => undefined)
      .finally(() => {
        inFlight = undefined
        if (trailingRequested) {
          trailingRequested = false
          void run()
        }
      })
    return inFlight
  }

  return run
}
