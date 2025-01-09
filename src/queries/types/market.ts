export interface BaseCoinInfo {
  coinLogo: string
  maturity: string
  coinName: string
  underlyingPrice: number | string
  coinAddress?: string
  nemoContractId: string
  underlyingApy: number | string
  provider?: string
  providerLogo?: string
  cap: string
  decimal: string | number
  tvl: number | string
  /** @deprecated */
  ptApy: number | string
  /** @deprecated */
  ytApy: number | string
  /** @deprecated */
  ptPrice: number | string
  /** @deprecated */
  ytPrice: number | string
  poolApy: number | string
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
  coinType: string
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
  name: string;
  icon: string;
  ptReward: string;
  ytReward: string;
  lpReward: string;
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
  rank: number,
  address: string,
  pointsPerDay: number,
  totalPoints: number
}
