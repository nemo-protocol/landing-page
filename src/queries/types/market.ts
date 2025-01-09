export interface BaseCoinInfo {
  coinLogo: string
  maturity: string
  coinName: string
  coinType: string
  nemoContractId: string
  provider: string
  providerLogo: string
  cap: string
  marketStateId: string
  syCoinType: string
  lstInfoId: string
  underlyingCoinType: string
  providerMarket: string
  providerVersion: string
  metadataId: string
  nativePool: string
  priceOracleConfigId: string
  aftermathSafeId: string
  aftermathStakedSuiVaultId: string
  haedalStakeingId: string
  tvl: number | string
  poolApy: number | string
  decimal: string | number
  underlyingApy: number | string
  underlyingPrice: number | string
  /** @deprecated */
  ptApy: number | string
  /** @deprecated */
  ytApy: number | string
  /** @deprecated */
  ptPrice: number | string
  /** @deprecated */
  ytPrice: number | string
}

export interface CoinInfo extends BaseCoinInfo {
  ptRate: number
  ytRate: number
  bgGradient: string
  syState: string
  pyState: string
}

export interface CoinConfig extends BaseCoinInfo {
  underlyingCoinName: string
  underlyingCoinLogo: string
  underlyingProtocol: string
  underlyingProtocolLogo: string
  swapFeeApy: string
  pyStateId: string
  syStateId: string
  yieldFactoryConfigId: string
  marketFactoryConfigId: string
  lpPrice: string
  coinPrice: string
  version: string
  sCoinTreasure: string
  pyPositionType: string
  pyPositionTypeList: string[]
  marketPositionType: string
  marketPositionTypeList: string[]
  tradeFee: string
  feeRate: string
  sevenAvgUnderlyingApy: string
  ptTvl: string
  syTvl: string
}

export interface PortfolioItem extends CoinConfig {
  name: string
  icon: string
  ptReward: string
  ytReward: string
  lpReward: string
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

export interface PointItem {
  rank: number
  address: string
  pointsPerDay: number
  totalPoints: number
}
