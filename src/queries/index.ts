import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import { CoinInfo, CoinConfig } from "./types/market"

function getCoinInfoList(name = "", address = "") {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
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

async function getSwapRatio(marketConfigId: string) {
  return await nemoApi<string>("/api/v1/market/swap/exchangeRate").get({
    marketConfigId,
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

export function useQuerySwapRatio(marketConfigId: string, enabled: boolean) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["swapRatio", marketConfigId],
    queryFn: () => getSwapRatio(marketConfigId),
    refetchInterval: 1000 * 30,
    enabled,
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
