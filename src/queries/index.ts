import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import {
  CoinInfo,
  CoinConfig,
  FixedReturnItem,
  PortfolioItem,
  PointItem,
  CoinInfoWithMetrics,
} from "./types/market"
import { handleInfinityValues } from "../lib/utils"
import useCalculatePoolMetrics from "@/hooks/actions/useCalculatePoolMetrics"
import useFetchMultiMarketState from "@/hooks/fetch/useFetchMultiMarketState"

interface CoinInfoListParams {
  name?: string
  address?: string
  isShowExpiry?: number
}

function getCoinInfoList({
  name = "",
  address = "",
  isShowExpiry = 0,
}: CoinInfoListParams = {}) {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
    isShowExpiry,
  })
}

function getFixedReturnInfos() {
  return nemoApi<FixedReturnItem[]>("/api/v1/fixReturn/detail").get()
}

function getRewardList() {
  return nemoApi<PointItem[]>("/api/v1/points/page").get({
    pageSize: 100,
  })
}

function getRewardWithAddress(address?: string) {
  const userAddress = address || "0x0"
  return nemoApi<PointItem[]>("/api/v1/points/page").get({
    userAddress,
  })
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
  return nemoApi<CoinConfig>("/api/v1/market/config/detail")
    .get(
      {
        coinType,
        maturity,
      },
      headers,
    )
    .then(handleInfinityValues)
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

export async function getSwapRatio(
  marketStateId: string,
  tokenType: string,
  swapType = "buy",
) {
  const response = await nemoApi<{
    fixReturn: string
    exchangeRate: string
    conversionRate: string
  }>("/api/v1/market/swap/exchangeRateDetail").get({
    marketStateId,
    tokenType,
    swapType,
  })
  return handleInfinityValues(response)
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

export async function getLPRatio(
  marketStateId: string,
  address: string,
  mintType?: string,
) {
  const headers = new Headers()
  headers.set("userAddress", address)
  const response = await nemoApi<LPResult>("/api/v1/market/lp/mintConfig").get(
    {
      marketStateId,
      mintType,
    },
    headers,
  )
  return handleInfinityValues(response)
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

export function useCoinInfoList(params: CoinInfoListParams = {}) {
  const { name = "", address = "", isShowExpiry = 0 } = params
  const { mutateAsync: calculateMetrics } = useCalculatePoolMetrics()
  const { mutateAsync: fetchMarketStates } = useFetchMultiMarketState()

  return useQuery({
    queryKey: ["coinInfoList", name, address, isShowExpiry],
    queryFn: async () => {
      const coinList = (await getCoinInfoList(params).catch(() => []))
      if (!coinList.length) return []

      const marketStateIds = [...new Set(coinList.map((coin) => coin.marketStateId))]
      const marketStates = await fetchMarketStates(marketStateIds).catch(() => [])

      const marketStatesMap = new Map(
        marketStates.map((state, index) => {
          if (!state.lpSupply || !state.totalSy || !state.totalPt) {
            return [marketStateIds[index], {
              lpSupply: "--",
              totalSy: "--",
              totalPt: "--"
            }]
          }
          return [marketStateIds[index], state]
        })
      )

      const results = await Promise.all(
        coinList.map(async (coinInfo) => {
          const marketState = marketStatesMap.get(coinInfo.marketStateId)
          if (!marketState || marketState.lpSupply === "--")
            return {
              ...coinInfo,
              ptPrice: "--",
              ytPrice: "--",
              ptApy: "--",
              ytApy: "--",
              tvl: "--",
              poolApy: "--",
              ptTvl: "--",
              syTvl: "--",
            }

          try {
            const metrics = await calculateMetrics({
              coinInfo,
              marketState: {
                lpSupply: marketState.lpSupply,
                totalPt: marketState.totalPt,
                totalSy: marketState.totalSy,
              },
            })

            return { ...coinInfo, ...metrics, poolApy: metrics.poolApy.toString() }
          } catch {
            return {
              ...coinInfo,
              ptPrice: "--",
              ytPrice: "--",
              ptApy: "--",
              ytApy: "--",
              tvl: "--",
              poolApy: "--",
              ptTvl: "--",
              syTvl: "--",
            }
          }
        })
      )

      return results as CoinInfoWithMetrics[]
    },
    staleTime: 10000,
    gcTime: 30000,
    retry: 2,
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
