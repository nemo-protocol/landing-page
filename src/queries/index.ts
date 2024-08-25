import { nemoApi } from "./request";
import { useQuery } from "@tanstack/react-query";
import { CoinInfo } from "./types/market";

function getCoinInfoList() {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get();
}

export function useCoinInfoList() {
  return useQuery({
    queryKey: ["coinInfoList"],
    queryFn: getCoinInfoList,
    select: (data) => {
      console.log("data", data);
      return data;
    },
  });
}
