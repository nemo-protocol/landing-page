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

export interface LpPosition {
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

export interface PyPosition {
  name: string
  expiry: string
  id: { id: string }
  pt_balance: string
  yt_balance: string
  description: string
  py_state_id: string
}

export interface MarketState {
  lpSupply: string
  totalSy: string
  totalPt: string
  marketCap: string
}
