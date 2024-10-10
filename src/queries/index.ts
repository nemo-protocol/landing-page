import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import { CoinInfo, CoinConfig, FixedReturnItem } from "./types/market"

function getCoinInfoList(name = "", address = "") {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
  })
}

function getFixedReturnInfos() {
  return nemoApi<FixedReturnItem[]>("/api/v1/fixReturn/detail").get()
}

export function useQueryFixedReturnInfos() {
  return useQuery({
    queryKey: ["FixedReturnInfos"],
    queryFn: () => getFixedReturnInfos(),
  })
}

function getCoinConfig(coinType: string) {
  return nemoApi<CoinConfig>("/api/v1/market/config/detail").get({
    coinType,
  })
}

async function getMintLpAmount(
  marketConfigId: string,
  syCoinAmount: string,
  ptCoinAmount: string,
) {
  const { amount } = await nemoApi<{ amount: string }>(
    "/api/v1/market/lp/mintConfig",
  ).get({
    marketConfigId,
    syCoinAmount,
    ptCoinAmount,
  })
  return amount
}

async function getSwapRatio(marketConfigId: string, tokenType: string) {
  return await nemoApi<string>("/api/v1/market/swap/exchangeRate").get({
    marketConfigId,
    tokenType,
  })
}

interface MintPYResult {
  syPtRate: number
  syYtRate: number
}

async function getMintPYRatio(marketConfigId: string) {
  return await nemoApi<MintPYResult>("/api/v1/market/py/mintConfig").get({
    marketConfigId,
  })
}

export function useQueryMintPYRatio(marketConfigId: string) {
  return useQuery({
    queryKey: ["mintPYRatio", marketConfigId],
    queryFn: () => getMintPYRatio(marketConfigId),
    enabled: !!marketConfigId,
  })
}

interface LPResult {
  syLpRate: number
  splitRate: number
}

async function getLPRatio(marketConfigId: string, mintType?: string) {
  return await nemoApi<LPResult>("/api/v1/market/lp/mintConfig").get({
    marketConfigId,
    mintType,
  })
}

export function useQueryMintLpAmount(
  marketConfigId: string,
  syCoinAmount: string,
  ptCoinAmount: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["coinInfoList", marketConfigId, syCoinAmount, ptCoinAmount],
    queryFn: () => getMintLpAmount(marketConfigId, syCoinAmount, ptCoinAmount),
    enabled,
  })
}

export function useQuerySwapRatio(
  marketConfigId: string,
  tokenType: string,
  enabled: boolean,
) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["swapRatio", marketConfigId, tokenType],
    queryFn: () => getSwapRatio(marketConfigId, tokenType),
    refetchInterval: 1000 * 30,
    enabled,
  })
}

export function useQueryLPRatio(
  marketConfigId: string,
  options: {
    enabled: boolean
    mintType?: string
  },
) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["lpRatio", marketConfigId, options?.mintType],
    queryFn: () => getLPRatio(marketConfigId, options?.mintType),
    enabled: options.enabled,
    refetchInterval: 1000 * 30,
  })
}

export function useCoinConfig(coinType: string) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinConfig", coinType],
    queryFn: () => getCoinConfig(coinType),
  })
}

export function useCoinInfoList(name = "", address = "") {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinInfoList", name, address],
    queryFn: () => getCoinInfoList(name, address),
  })
}
