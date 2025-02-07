import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import { type SuiObjectResponse } from "@mysten/sui/client"
import { type CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import type { DebugInfo, PyPosition } from "./types"

const useFetchPyPosition = (
  coinConfig?: CoinConfig,
  debug: boolean = false,
) => {
  const suiClient = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async () => {
      if (!address || !coinConfig) {
        throw new Error("Missing required parameters")
      }

      const debugInfo: DebugInfo = {
        moveCall: [{
          target: "get_py_position",
          arguments: [
            { name: "address", value: address },
            { name: "py_state_id", value: coinConfig.pyStateId },
            { name: "maturity", value: coinConfig.maturity },
          ],
          typeArguments: coinConfig.pyPositionTypeList,
        }],
      }

      const response = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
          MatchAny: coinConfig.pyPositionTypeList.map((type: string) => ({
            StructType: type,
          })),
        },
        options: {
          showContent: true,
        },
      })

      debugInfo.rawResult = {
        results: [response],
      }

      const positions = response.data
        .map(
          (item: SuiObjectResponse) =>
            (
              item.data?.content as {
                fields?: {
                  expiry: string
                  id: { id: string }
                  pt_balance: string
                  yt_balance: string
                  py_state_id: string
                }
              }
            )?.fields,
        )
        .filter((item) => !!item)
        .map(
          ({ expiry, id, pt_balance, yt_balance, py_state_id }) =>
            ({
              id: id.id,
              maturity: expiry,
              ptBalance: pt_balance,
              ytBalance: yt_balance,
              pyStateId: py_state_id,
            }) as PyPosition,
        )
        .filter(
          (item) =>
            item.maturity === coinConfig.maturity &&
            item.pyStateId === coinConfig.pyStateId,
        )

      return debug ? [positions, debugInfo] : [positions]
    },
  })
}

export default useFetchPyPosition
