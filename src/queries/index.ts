import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import { CoinInfo,CoinConfig } from "./types/market"

function getCoinInfoList(name = "", address = "") {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
  })
}

function getCoinConfig(coinType: string) {
  return nemoApi<CoinConfig>("/api/v1/market/config/depositAndMint").post({
    coinType,
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
