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

export function useCoinInfoList(name = "", address = "") {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinInfoList", name, address],
    queryFn: () => getCoinInfoList(name, address),
  })
}

export function useCoinConfig(coinType: string) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinConfig", coinType],
    queryFn: () => getCoinConfig(coinType),
  })
}
