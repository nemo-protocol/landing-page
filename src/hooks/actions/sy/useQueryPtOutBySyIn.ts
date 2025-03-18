import { useRef } from "react"
import { CoinConfig } from "@/queries/types/market"
import { useMutation } from "@tanstack/react-query"
import useQueryPtOutBySyInDryRun from "@/hooks/dryRun/pt/useQueryPtOutBySyIn"

interface PtOutBySyInResult {
  syIn: string
  ptOut: string
}

export default function useQueryPtOutBySyIn() {
  const lastSuccessIndexRef = useRef(0)
  const { mutateAsync: queryPtOutBySyInDryRun } = useQueryPtOutBySyInDryRun({
    debug: false,
  })

  return useMutation({
    mutationFn: async (coinConfig: CoinConfig): Promise<PtOutBySyInResult> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const syAmounts = ["1000", "100", "10", "1"]

      const fetchPtOut = async (
        index = lastSuccessIndexRef.current,
      ): Promise<PtOutBySyInResult> => {
        if (index >= syAmounts.length) {
          throw new Error("All attempts failed, unable to get ptOut value")
        }

        const syAmount = syAmounts[index]

        try {
          const { ptValue, syValue } = await queryPtOutBySyInDryRun({
            syAmount,
            innerCoinConfig: coinConfig,
          })

          lastSuccessIndexRef.current = index
          return {
            syIn: syValue,
            ptOut: ptValue,
          }
        } catch (error) {
          console.log(`Failed to use syIn=${syAmount}, trying next value...`)
          return fetchPtOut(index + 1)
        }
      }

      return fetchPtOut()
    },
  })
}
