import { useSuiClientQuery } from "@mysten/dapp-kit"
import { UseQueryResult } from "@tanstack/react-query"

export interface PyPosition {
  name: string
  expiry: string
  id: { id: string }
  pt_balance: string
  yt_balance: string
  description: string
  py_state_id: string
}

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
        MatchAny: positionTypes!.map((type: string) => ({ StructType: type })),
      },
      options: {
        showContent: true,
      },
    },
    {
      queryKey: ["queryPyPositionData", address, positionTypes],
      gcTime: 10000,
      enabled: !!address && !!maturity && !!pyStateId && !!positionTypes,
      select: (data) => {
        return data.data
          .map(
            (item) =>
              (
                item.data?.content as {
                  fields?: {
                    name: string
                    expiry: string
                    id: { id: string }
                    pt_balance: string
                    yt_balance: string
                    description: string
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
      },
    },
  )
}

export default usePyPositionData
