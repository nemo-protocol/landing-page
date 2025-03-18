import { useRef } from "react"
import { CoinConfig } from "@/queries/types/market"
import { useMutation } from "@tanstack/react-query"
import useQuerySyOutByYtInDryRun from "@/hooks/dryRun/sy/useQuerySyOutByYtIn"

interface SyOutByYtInResult {
  ytIn: string
  syOut: string
}

export default function useQuerySyOutByYtIn() {
  const lastSuccessIndexRef = useRef(0)
  const { mutateAsync: querySyOutByYtInDryRun } = useQuerySyOutByYtInDryRun({
    debug: false,
  })

  return useMutation({
    mutationFn: async (coinConfig: CoinConfig): Promise<SyOutByYtInResult> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const ytAmounts = ["1000000", "10000", "1000"]

      const fetchSyOut = async (
        index = lastSuccessIndexRef.current,
      ): Promise<SyOutByYtInResult> => {
        if (index >= ytAmounts.length) {
          throw new Error("All attempts failed, unable to get syOut value")
        }

        const ytAmount = ytAmounts[index]

        try {
          const { syAmount } = await querySyOutByYtInDryRun({
            ytAmount,
            innerCoinConfig: coinConfig,
          })

          lastSuccessIndexRef.current = index
          return {
            ytIn: ytAmount,
            syOut: syAmount,
          }
        } catch (error) {
          console.log(`Failed to use ytIn=${ytAmount}, trying next value...`)
          return fetchSyOut(index + 1)
        }
      }

      return fetchSyOut()
    },
  })
}
