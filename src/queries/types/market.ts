import { MarketState } from "@/hooks/types"

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
  decimal: string | number
  underlyingApy: string
  underlyingPrice: string
  pyStateId: string
  syStateId: string
  conversionRate: string
  marketFactoryConfigId: string
  swapFeeForLpHolder: string
  underlyingCoinName: string
  version: string
}

export interface CoinInfo extends BaseCoinInfo {
  bgGradient: string
}

export interface CoinInfoWithMetrics extends CoinInfo {
  ptPrice: string
  ytPrice: string
  ptApy: string
  ytApy: string
  tvl: string
  poolApy: string
  ptTvl: string
  syTvl: string
  marketState: MarketState
}

export interface CoinConfig extends BaseCoinInfo {
  pyStoreId: string
  pyPosition: string
  pyPositionType: string
  pyPositionTypeList: string[]
  marketPosition: string
  marketPositionType: string
  marketPositionTypeList: string[]
  nemoContractIdList: string[]
  lpPrice: string
  coinPrice: string
  sevenAvgUnderlyingPtApy: string
  sevenAvgUnderlyingYtApy: string
  sevenAvgUnderlyingApy: string
  underlyingCoinName: string
  underlyingCoinLogo: string
  underlyingProtocol: string
  underlyingProtocolLogo: string
  swapFeeApy: string
  yieldFactoryConfigId: string
  marketFactoryConfigId: string
  sCoinTreasure: string
  tradeFee: string
  feeRate: string
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
  youPay: string
  expiry: string
  redeem: string
  fixedReturn: string
  fixedApy: string
  coinLogo: string
  coinType: string
  maturity: string
}

export interface PointItem {
  rank: string
  address: string
  pointsPerDay: string
  totalPoints: string
}
