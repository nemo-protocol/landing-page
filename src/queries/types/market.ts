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
  bgGradient: string
}

export interface CoinConfig {
  underlyingApy: number
  underlyingCoinName: string
  underlyingCoinLogo: string
  underlyingPrice: string
  underlyingProtocol: string
  underlyingProtocolLogo: string
  ptApy: string
  ytApy: string
  pyStateId: string
  syStateId: string
  yieldFactoryConfigId: string
  coinType: string
  marketStateId: string
  marketFactoryConfigId: string
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
  sCoinTreasure: string
  underlyingCoinType: string
  nemoContractId: string
  decimal: number
  pyPositionType: string
  pyPositionTypeList: string[]
  marketPositionType: string
  marketPositionTypeList: string[]
  nativePool: string
  metadataId: string
  lstInfoId: string
  tradeFee: string
  feeRate: string
  sevenAvgUnderlyingApy: string
  poolApy: string
  tvl: string
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
