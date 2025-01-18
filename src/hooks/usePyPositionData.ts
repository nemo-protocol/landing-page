import { PyPosition } from "./types"
import { useSuiClientQuery } from "@mysten/dapp-kit"
import { UseQueryResult } from "@tanstack/react-query"

const usePyPositionData = (
  address?: string,
  pyStateId?: string,
  maturity?: string,
  positionTypes?: string[],
): UseQueryResult<PyPosition[], Error> => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        MatchAny: (positionTypes || []).map((type: string) => ({
          StructType: type,
        })),
      },
      options: {
        showContent: true,
      },
    },
    {
      queryKey: ["queryPyPositionData", address, positionTypes],
      gcTime: 10000,
      enabled:
        !!address &&
        !!maturity &&
        !!pyStateId &&
        !!positionTypes &&
        positionTypes.length > 0,
      select: (data) => {
        return data.data
          .map(
            (item) =>
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
          .filter(
            (item) =>
              (!maturity || item.expiry === maturity.toString()) &&
              (!pyStateId || item.py_state_id === pyStateId),
          )
          .map(({ expiry, id, pt_balance, yt_balance, py_state_id }) => ({
            id: id.id,
            maturity: expiry,
            ptBalance: pt_balance,
            ytBalance: yt_balance,
            pyStateId: py_state_id,
          }))
      },
    },
  )
}

export default usePyPositionData
