import { nemoApi } from "./request"
import { MarketState } from "@/hooks/types"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { useQuery, UseQueryResult, useMutation } from "@tanstack/react-query"
import { handleInfinityValues, isValidAmount } from "@/lib/utils"
import useFetchMultiMarketState from "@/hooks/fetch/useMultiMarketState"
import useCalculatePoolMetrics from "@/hooks/actions/useCalculatePoolMetrics"
import {
  PointItem,
  CoinConfig,
  BaseCoinInfo,
  PortfolioItem,
  FixedReturnItem,
  CoinInfoWithMetrics,
  TokenInfoMap,
} from "./types/market"

interface CoinInfoListParams {
  name?: string
  address?: string
  isShowExpiry?: number
  isCalc?: boolean
}

function getCoinInfoList({
  name = "",
  address = "",
  isShowExpiry = 0,
}: CoinInfoListParams = {}) {
  return nemoApi<BaseCoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
    isShowExpiry,
  })
}

function getFixedReturnInfos() {
  return nemoApi<FixedReturnItem[]>("/api/v1/fixReturn/detail").get()
}

function getRewardList(address?: string) {
  const headers = new Headers()
  if (address) {
    headers.set("userAddress", address)
  }
  return nemoApi<PointItem[]>("/api/v1/points/page").get(
    {
      pageSize: 100,
    },
    headers,
  )
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

export function useCoinInfoList<T extends boolean = true>(
  params: CoinInfoListParams & { isCalc?: T } = {},
): UseQueryResult<
  T extends true ? CoinInfoWithMetrics[] : BaseCoinInfo[],
  Error
> {
  const {
    name = "",
    address = "",
    isShowExpiry = 0,
    isCalc = true as T,
  } = params
  const { mutateAsync: calculateMetrics } = useCalculatePoolMetrics()
  const { mutateAsync: fetchMarketStates } = useFetchMultiMarketState()

  return useQuery({
    queryKey: ["coinInfoList", name, address, isShowExpiry],
    queryFn: async () => {
      const coinList = (await getCoinInfoList(params).catch(() => [])).filter(
        ({ marketStateId }) => !!marketStateId,
      )

      if (!coinList.length) return []

      if (!isCalc) return coinList

      const marketStateIds = coinList.map((coin) => coin.marketStateId)

      const marketStates = await fetchMarketStates(marketStateIds).catch(
        () => ({}) as { [key: string]: MarketState },
      )

      const results = await Promise.all(
        coinList.map(async (coinInfo) => {
          const marketState = marketStates?.[coinInfo.marketStateId]
          if (!isValidAmount(marketState?.lpSupply))
            return {
              ...coinInfo,
              ptPrice: "0",
              ytPrice: "0",
              ptApy: "0",
              ytApy: "0",
              tvl: "0",
              poolApy: "0",
              ptTvl: "0",
              syTvl: "0",
              marketState,
              feeApy: "0",
            }

          try {
            const metrics = await calculateMetrics({
              coinInfo,
              marketState,
            })

            return {
              ...coinInfo,
              ...metrics,
              marketState,
            }
          } catch (error) {
            return {
              ...coinInfo,
              ptPrice: "",
              ytPrice: "",
              ptApy: "",
              ytApy: "",
              tvl: "",
              poolApy: "",
              ptTvl: "",
              syTvl: "",
              marketState,
            }
          }
        }),
      )

      return results
    },
    staleTime: 10000,
    gcTime: 30000,
    retry: 2,
  })
}

export function useRewardList() {
  const { address } = useWallet()
  return useQuery({
    queryKey: ["RewardConfig"],
    queryFn: () => getRewardList(address),
  })
}

export function useRewardWithAddress(userAddress?: string) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["RewardWithAddress"],
    queryFn: () => getRewardWithAddress(userAddress),
  })
}

export const getTokenInfo = async (): Promise<TokenInfoMap> => {
  return nemoApi<TokenInfoMap>("/api/v1/market/info").get()
}

export const useTokenInfo = () => {
  return useMutation<TokenInfoMap, Error>({
    mutationFn: getTokenInfo,
  })
}
