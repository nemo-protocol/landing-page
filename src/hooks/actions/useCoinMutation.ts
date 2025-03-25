import { useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { SuiClient } from "@mysten/sui/client"
import { CoinData } from "@/types"

/**
 * Hook for fetching coins data using mutation pattern
 * This is a mutation version of the useCoinData query hook
 */
export default function useCoinMutation() {
  const fetchCoins = useCallback(
    async ({ 
      client, 
      address, 
      coinType 
    }: { 
      client: SuiClient; 
      address: string; 
      coinType: string;
    }): Promise<CoinData[]> => {
      if (!address || !coinType) {
        throw new Error("Invalid parameters for fetching coins")
      }

      const response = await client.getCoins({
        owner: address,
        coinType: coinType,
      })

      // Sort coins by balance in descending order, similar to the query hook
      return response.data.sort((a, b) => {
        const balanceA = BigInt(a.balance)
        const balanceB = BigInt(b.balance)
        return balanceB > balanceA ? 1 : balanceB < balanceA ? -1 : 0
      })
    },
    []
  )

  return useMutation({
    mutationFn: fetchCoins,
  })
} 