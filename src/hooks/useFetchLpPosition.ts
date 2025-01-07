import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import { Decimal } from "decimal.js"
import { type SuiObjectResponse } from "@mysten/sui/client"
import { type CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import type { DebugInfo, LPMarketPosition } from "./types"

const useFetchLpPosition = (
  coinConfig?: CoinConfig,
  debug: boolean = false,
) => {
  const suiClient = useSuiClient()
  const { address } = useWallet()

  return useMutation<[LPMarketPosition[], DebugInfo?], Error>({
    mutationFn: async () => {
      if (!address || !coinConfig) {
        throw new Error("Missing required parameters")
      }

      const debugInfo: DebugInfo = {
        moveCall: {
          target: "get_lp_market_position",
          arguments: [
            { name: "address", value: address },
            { name: "market_state_id", value: coinConfig.marketStateId },
            { name: "maturity", value: coinConfig.maturity },
          ],
          typeArguments: coinConfig.marketPositionTypeList,
        },
      }

      const response = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
          MatchAny: coinConfig.marketPositionTypeList.map((type: string) => ({ StructType: type })),
        },
        options: {
          showContent: true,
        },
      })

      debugInfo.rawResult = {
        results: response.data,
      }

      const positions = response.data
        .map(
          (item: SuiObjectResponse) =>
            (
              item.data?.content as {
                fields?: {
                  name: string
                  expiry: string
                  id: { id: string }
                  lp_amount: string
                  description: string
                  market_state_id: string
                }
              }
            )?.fields,
        )
        .filter((item: unknown): item is LPMarketPosition => {
          return !!item && 
            typeof item === 'object' && 
            'expiry' in item && 
            'market_state_id' in item
        })
        .filter(
          (item: LPMarketPosition) =>
            item.expiry === coinConfig.maturity &&
            item.market_state_id === coinConfig.marketStateId,
        )
        .sort((a: LPMarketPosition, b: LPMarketPosition) =>
          Decimal.sub(b.lp_amount, a.lp_amount).toNumber(),
        )
        .map((position: LPMarketPosition) => ({
          ...position,
          lp_amount_display: new Decimal(position.lp_amount)
            .div(10 ** (coinConfig.decimal || 0))
            .toString()
        }))

      return debug ? [positions, debugInfo] : [positions]
    },
  })
}

export default useFetchLpPosition 