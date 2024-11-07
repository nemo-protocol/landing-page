export interface CoinInfo {
  coinLogo: string
  maturity: string
  coinName: string
  underlyingPrice: number
  coinAddress: string
  underlyingApy: number
  provider: string
  providerLogo: string
  cap: string
  decimal: string
  tvl: number
  ptApy: number
  ytApy: number
  ptRate: number
  ytRate: number
  ptPrice: number
  ytPrice: number
  poolApy: number
}

export interface CoinConfig {
  underlyingApy: number
  ytApy: number
  pyStore: string
  syStore: string
  pyState: string
  syState: string
  yieldFactoryConfigId: string
  // syStructId: string
  // yieldTokenStoreId: string
  // tokenConfigId: string
  // ytStructId: string
  // ptStructId: string
  coinType: string
  marketStateId: string
  marketFactoryConfigId: string
  sCoinPrice: string
  ptPrice: string
  ytPrice: string
  lpPrice: string
  coinLogo: string
  coinPrice: string
  coinName: string
  maturity: string
  version: string
  providerVersion: string
  providerMarket: string
  syCoinType: string
  underlyingCoinType: string
  nemoContractId: string
  decimal: number
}

export interface PortfolioItem {
  name: string
  icon: string
  maturity: string
  ptPrice: string
  ytPrice: string
  lpPrice: string
  coinType: string
  ptReward: string
  ytReward: string
  lpReward: string
  decimal: string
  rewardCoinType: string
  rewardCoinPrice: string
}

export interface FixedReturnItem {
  name: string
  youPay: number
  expiry: number
  redeem: number
  fixedReturn: number
  fixedApy: number
  coinLogo: string
  coinType: string
  maturity: string
}
