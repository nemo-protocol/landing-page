export interface CoinInfo {
  coinLogo: string;
  maturity: string;
  coinName: string;
  underlyingPrice: number;
  coinAddress: string;
  underlyingApy: number;
  provider: string;
  providerLogo: string;
  tvl: number;
  ptApy: number;
  ytApy: number;
  ptRate: number;
  ytRate: number;
  ptPrice: number;
  ytPrice: number;
  poolApy: number;
}

export interface CoinConfig {
  yieldFactoryConfigId: string;
  syStructId: string;
  yieldTokenStoreId: string;
  tokenConfigId: string;
  ytStructId: string;
  ptStructId: string;
  coinType: string;
  marketStateId: string;
  marketConfigId: string;
  marketFactoryConfigId: string;
}

export interface FixedReturnItem {
  name: string;
  youPay: number;
  expiry: number;
  redeem: number;
  fixedReturn: number;
  fixedApy: number;
  coinLogo: string;
  coinType: string;
}


