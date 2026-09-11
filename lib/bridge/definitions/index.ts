/**
 * Defines the expected contract of the host application bound object.
 */
export type IRawBridge = {
  GetBindingsMethodNames: () => Promise<string[]>
  RunMethod: (methodName: string, requestId: string, args: string) => Promise<string>
  /**
   * Absent on connectors predating trace-context support, and on the Archicad
   * adapter. Only call it when `GetBridgeCapabilities` advertises 'otelTraceContext'.
   */
  RunMethodTraced?: (
    methodName: string,
    requestId: string,
    args: string,
    otelTraceContext: string
  ) => Promise<string>
  GetBridgeCapabilities?: () => Promise<string[]>
  ShowDevTools: () => Promise<void>
  OpenUrl: (url: string) => Promise<void>
  GetCallResult: (requestId: string) => Promise<string>
}
