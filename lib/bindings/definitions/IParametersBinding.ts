/** What the host app did with a change request payload. */
export interface ParameterUpdateSummary {
  applied: number
  failed: number
  errors: string[]
}

export interface IParametersBinding {
  /** Resolves with nothing on connectors that predate the summary. */
  update: (payload: string) => Promise<ParameterUpdateSummary | void>
}
