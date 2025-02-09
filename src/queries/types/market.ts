import { MarketState } from "@/hooks/types"

export interface BaseCoinInfo {
  id: string
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
  decimal: string
  underlyingApy: string
  coinPrice: string
  underlyingPrice: string
  pyStateId: string
  syStateId: string
  conversionRate: string
  marketFactoryConfigId: string
  swapFeeForLpHolder: string
  underlyingCoinName: string
  underlyingCoinLogo: string
  version: string
  perPoints: string
}

export interface CoinInfoWithMetrics extends BaseCoinInfo {
  ptPrice: string
  ytPrice: string
  ptApy: string
  ytApy: string
  tvl: string
  poolApy: string
  ptTvl: string
  syTvl: string
  marketState: MarketState
  scaledApy: string
  underlyingApy: string
  scaled_underlying_apy: string
  scaled_pt_apy: string
  incentive: string
  totalApy: string
  feeApy: string
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
  // lpPrice: string
  coinPrice: string
  sevenAvgUnderlyingPtApy: string
  sevenAvgUnderlyingYtApy: string
  sevenAvgUnderlyingApy: string
  underlyingProtocol: string
  underlyingProtocolLogo: string
  swapFeeApy: string
  marketFactoryConfigId: string
  tradeFee: string
  feeRate: string
  yieldFactoryConfigId: string
}

export interface PortfolioItem extends CoinConfig {
  underlyingProtocol: string
  yieldFactoryConfigId: string
  pyPositionTypeList: string[]
  marketPositionTypeList: string[]
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
