import Decimal from "decimal.js"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { splitSyAmount } from "@/lib/utils"

export function useCalculateLpOut(coinConfig?: CoinConfig) {
  const { address } = useWallet()
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)

  return useMutation({
    mutationFn: async (syAmount: string) => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect wallet first")
      }

      const { ptValue, syValue } = splitSyAmount(syAmount)
      console.log("syAmount", syAmount, "ptValue", ptValue, "syValue", syValue)

      const [lpAmount] = await queryLpOut({
        ptValue,
        syValue,
      })
      console.log("lpAmount", lpAmount)

      return new Decimal(lpAmount).div(10 ** coinConfig.decimal).toString()
    },
  })
}
