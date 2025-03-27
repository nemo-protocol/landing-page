import { useRef } from "react"
import { CoinConfig } from "@/queries/types/market"
import { useMutation } from "@tanstack/react-query"
import useQueryYtOutBySyInDryRun from "@/hooks/dryRun/yt/useQueryYtOutBySyIn"

interface YtOutBySyInResult {
  syIn: string
  ytOut: string
}

export default function useQueryYtOutBySyIn() {
  const lastSuccessIndexRef = useRef(0)
  const { mutateAsync: queryYtOutBySyInDryRun } = useQueryYtOutBySyInDryRun({
    debug: false,
  })

  return useMutation({
    mutationFn: async (coinConfig: CoinConfig): Promise<YtOutBySyInResult> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const syAmounts = ["1000000", "10000", "1000"]

      const fetchYtOut = async (
        index = lastSuccessIndexRef.current,
      ): Promise<YtOutBySyInResult> => {
        if (index >= syAmounts.length) {
          throw new Error("All attempts failed, unable to get ytOut value")
        }

        const syAmount = syAmounts[index]

        try {
          const { ytAmount } = await queryYtOutBySyInDryRun({
            syAmount,
            innerCoinConfig: coinConfig,
          })

          lastSuccessIndexRef.current = index
          return {
            syIn: syAmount,
            ytOut: ytAmount,
          }
        } catch (error) {
          console.log(`Failed to use syIn=${syAmount}, trying next value...`)
          return fetchYtOut(index + 1)
        }
      }

      return fetchYtOut()
    },
  })
} 