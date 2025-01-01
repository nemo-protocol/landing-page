import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import {
  CoinInfo,
  CoinConfig,
  FixedReturnItem,
  PortfolioItem, PointItem
} from "./types/market"

function getCoinInfoList(name = "", address = "") {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo")
    .get({ name, address })
    .then(response => response.filter(coin => parseInt(coin.maturity) > Date.now()));
}

function getFixedReturnInfos() {
  return nemoApi<FixedReturnItem[]>("/api/v1/fixReturn/detail").get()
}

function getRewardList() {
  return nemoApi<PointItem[]>("/api/v1/points/page").get(
    {
      pageSize: 100,
    }
  )
}

function getRewardWithAddress(address?: string) {
  const userAddress = address || "0x0";
  return nemoApi<PointItem[]>("/api/v1/points/page").get(
    {
      userAddress
    }
  )
}

export function useQueryFixedReturnInfos() {
  return useQuery({
    queryKey: ["FixedReturnInfos"],
    queryFn: () => getFixedReturnInfos(),
  })
}

function getCoinConfig(coinType: string, maturity: string, address?: string) {
  const headers = new Headers()
  if (address) {
    headers.set("userAddress", address)
  }
  return nemoApi<CoinConfig>("/api/v1/market/config/detail").get(
    {
      coinType,
      maturity,
    },
    headers,
  )
}

function getPortfolioList() {
  return nemoApi<PortfolioItem[]>("/api/v1/portfolio/detail").get()
}

async function getMintLpAmount(
  marketStateId: string,
  syCoinAmount: string,
  ptCoinAmount: string,
) {
  const { amount } = await nemoApi<{ amount: string }>(
    "/api/v1/market/lp/mintConfig",
  ).get({
    marketStateId,
    syCoinAmount,
    ptCoinAmount,
  })
  return amount
}

async function getSwapRatio(
  marketStateId: string,
  tokenType: string,
  swapType = "buy",
) {
  return await nemoApi<{
    fixReturn: string
    exchangeRate: string
    conversionRate: string
  }>("/api/v1/market/swap/exchangeRateDetail").get({
    marketStateId,
    tokenType,
    swapType,
  })
}

interface MintPYResult {
  syPtRate: number
  syYtRate: number
}

async function getMintPYRatio(marketStateId: string) {
  return await nemoApi<MintPYResult>("/api/v1/market/py/mintConfig").get({
    marketStateId,
  })
}

export function useQueryMintPYRatio(marketStateId?: string) {
  return useQuery({
    queryKey: ["mintPYRatio", marketStateId],
    queryFn: () => getMintPYRatio(marketStateId!),
    enabled: !!marketStateId,
  })
}

interface LPResult {
  ptLpRate: string
  syLpRate: string
  syPtRate: string
  splitRate: string
  conversionRate: string
}

async function getLPRatio(
  marketStateId: string,
  address: string,
  mintType?: string,
) {
  const headers = new Headers()
  headers.set("userAddress", address)
  return await nemoApi<LPResult>("/api/v1/market/lp/mintConfig").get(
    {
      marketStateId,
      mintType,
    },
    headers,
  )
}

export function useQueryMintLpAmount(
  marketStateId: string,
  syCoinAmount: string,
  ptCoinAmount: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["coinInfoList", marketStateId, syCoinAmount, ptCoinAmount],
    queryFn: () => getMintLpAmount(marketStateId, syCoinAmount, ptCoinAmount),
    enabled,
  })
}

export function useQuerySwapRatio(
  marketStateId?: string,
  tokenType?: string,
  swapType?: "buy" | "sell",
) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["swapRatio", marketStateId, tokenType, swapType],
    queryFn: () => getSwapRatio(marketStateId!, tokenType!, swapType),
    refetchInterval: 1000 * 20,
    enabled: !!marketStateId && !!tokenType,
  })
}

export function useQueryLPRatio(
  address?: string,
  marketStateId?: string,
  mintType?: string,
) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["lpRatio", marketStateId, mintType],
    queryFn: () => getLPRatio(marketStateId!, address!, mintType),
    enabled: !!marketStateId,
    refetchInterval: 1000 * 20,
  })
}

export function useCoinConfig(
  coinType?: string,
  maturity?: string,
  address?: string,
) {
  return useQuery({
    enabled: !!coinType && !!maturity,
    // FIXME： queryKey dose not work
    queryKey: ["coinConfig", coinType, maturity],
    queryFn: () => getCoinConfig(coinType!, maturity!, address),
  })
}

export function usePortfolioList() {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["PortfolioConfig"],
    queryFn: () => getPortfolioList(),
  })
}

export function useCoinInfoList(name = "", address = "") {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinInfoList", name, address],
    queryFn: () => getCoinInfoList(name, address),
  })
}

export function useRewardList() {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["RewardConfig"],
    queryFn: () => getRewardList(),
  })
}

export function useRewardWithAddress(userAddress?: string) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["RewardWithAddress"],
    queryFn: () => getRewardWithAddress(userAddress),
  })
}
