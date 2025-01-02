export interface DebugInfo {
  moveCall: {
    target: string
    arguments: {
      name: string
      value: string
    }[]
    typeArguments: string[]
  }
  rawResult?: {
    error?: string
    results?: unknown
  }
  parsedOutput?: string
}

export class ContractError extends Error {
  debugInfo: DebugInfo

  constructor(message: string, debugInfo: DebugInfo) {
    super(message)
    this.debugInfo = debugInfo
  }
}
