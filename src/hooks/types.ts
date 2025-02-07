export interface MoveCallInfo {
  target: string
  arguments: {
    name: string
    value: string
  }[]
  typeArguments: string[]
}

export interface DebugInfo {
  moveCall: MoveCallInfo[]
  rawResult?: {
    error?: string
    results?: unknown[]
  }
  parsedOutput?: unknown
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
  id: string
  maturity: string
  ptBalance: string
  ytBalance: string
  pyStateId: string
}

export interface MarketState {
  totalSy: string
  totalPt: string
  lpSupply: string
  marketCap: string
}
