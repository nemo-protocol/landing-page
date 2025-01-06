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

export interface LppMarketPosition {
  id: { id: string }
  description: string
  expiry: string
  expiry_days: string
  lp_amount: string
  lp_amount_display: string
  market_state_id: string
  name: string
  url: string
  yield_token: string
}
