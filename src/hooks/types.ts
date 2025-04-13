import { TransactionArgument } from "@mysten/sui/transactions"

export interface MoveCallInfo {
  target: string
  arguments: {
    name: string
    value: string | TransactionArgument
  }[]
  typeArguments: string[]
}

export interface DebugInfo {
  moveCall: MoveCallInfo[]
  rawResult: {
    error?: string
    results?: unknown[]
  }
  parsedOutput?: unknown
  result?: string
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

export interface RewardMetrics {
  tokenType: string
  tokenLogo: string
  tokenName?: string
  tokenPrice: string
  dailyEmission: string
  decimal?: string
}

export interface MarketState {
  marketCap: string
  totalSy: string
  lpSupply: string
  totalPt: string
  rewardMetrics: {
    tokenType: string
    tokenLogo: string
    dailyEmission: string
    tokenPrice: string
    tokenName?: string
    decimal?: string
  }[]
}
