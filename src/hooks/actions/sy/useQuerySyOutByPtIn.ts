import { useRef } from "react"
import { CoinConfig } from "@/queries/types/market"
import { useMutation } from "@tanstack/react-query"
import useQuerySyOutByPtInDryRun from "@/hooks/dryRun/sy/useQuerySyOutByPtIn"

interface SyOutByPtInResult {
  ptIn: string
  syOut: string
}

export default function useQuerySyOutByPtIn() {
  const lastSuccessIndexRef = useRef(0)
  const { mutateAsync: querySyOutByPtInDryRun } = useQuerySyOutByPtInDryRun({
    debug: false,
  })

  return useMutation({
    mutationFn: async (coinConfig: CoinConfig): Promise<SyOutByPtInResult> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const ptAmounts = ['1000','100']

      const fetchSyOut = async (
        index = lastSuccessIndexRef.current,
      ): Promise<SyOutByPtInResult> => {
        if (index >= ptAmounts.length) {
          throw new Error("All attempts failed, unable to get syOut value")
        }

        const ptAmount = ptAmounts[index]

        try {
          const { syAmount } = await querySyOutByPtInDryRun({
            ptIn: ptAmount,
            innerCoinInfo: coinConfig,
          })

          lastSuccessIndexRef.current = index
          return {
            ptIn: ptAmount,
            syOut: syAmount,
          }
        } catch (error) {
          console.log(`Failed to use ptIn=${ptAmount}, trying next value...`)
          return fetchSyOut(index + 1)
        }
      }

      return fetchSyOut()
    },
  })
}
