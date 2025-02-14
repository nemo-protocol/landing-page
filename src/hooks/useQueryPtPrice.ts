import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import type { CoinConfig } from "@/queries/types/market"
import useQueryPtOutBySyInWithVoucher from "./useQueryPtOutBySyInWithVoucher"

export default function useQueryPtPrice(
  coinConfig?: CoinConfig,
  syOut?: string,
) {
  const { mutateAsync: queryPtOut } = useQueryPtOutBySyInWithVoucher(coinConfig)

  
  return useQuery({
    queryKey: ["ptPrice", coinConfig?.coinPrice, syOut],
    queryFn: async () => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!syOut) {
        throw new Error("Please provide syOut")
      }
      const { ptAmount: ptIn } = await queryPtOut(syOut)
      return new Decimal(coinConfig.coinPrice)
        .mul(Number(syOut))
        .div(ptIn)
        .toFixed()
    },
    enabled: !!coinConfig && !!syOut,
  })
}
