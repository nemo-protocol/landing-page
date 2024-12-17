import { useSuiClient } from "@mysten/dapp-kit"
import { UseQueryResult, useQuery } from "@tanstack/react-query"

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
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: ["getPyPositions", address, pyStateId, maturity, positionTypes],
    queryFn: () => {
      if (!positionTypes?.length) return Promise.resolve([])

      return suiClient
        .getOwnedObjects({
          owner: address!,
          filter: {
            MatchAny: positionTypes.map((type) => ({
              StructType: type,
            })),
          },
          options: { showContent: true },
        })
        .then((response) =>
          response.data
            .map((item) => {
              const content = item.data?.content as unknown as { fields: PyPosition }
              return content?.fields
            })
            .filter(
              (item): item is PyPosition =>
                !!item &&
                (!maturity || item.expiry === maturity.toString()) &&
                (!pyStateId || item.py_state_id === pyStateId),
            ),
        )
    },
    enabled: !!address && !!maturity && !!pyStateId && !!positionTypes?.length,
  })
}

export default usePyPositionData
