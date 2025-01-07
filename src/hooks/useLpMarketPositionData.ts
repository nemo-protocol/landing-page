import { useSuiClientQuery } from "@mysten/dapp-kit"
import { UseQueryResult } from "@tanstack/react-query"
import { Decimal } from "decimal.js"
import { LPMarketPosition } from "./types"

const useLpMarketPositionData = (
  address?: string,
  marketStateId?: string,
  maturity?: string,
  positionTypes?: string[],
): UseQueryResult<LPMarketPosition[], Error> => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        MatchAny: (positionTypes || []).map((type) => ({ StructType: type })),
      },
      options: {
        showContent: true,
      },
    },
    {
      queryKey: ["queryLpMarketPositionData", address, positionTypes],
      gcTime: 10000,
      enabled:
        !!address &&
        !!maturity &&
        !!marketStateId &&
        !!positionTypes &&
        positionTypes.length > 0,
      select: (data): LPMarketPosition[] => {
        return data.data
          .map(
            (item) =>
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
          .filter((item): item is LPMarketPosition => !!item)
          .filter(
            (item) =>
              (!maturity || item.expiry === maturity.toString()) &&
              (!marketStateId || item.market_state_id === marketStateId),
          )
          .sort((a, b) => Decimal.sub(b.lp_amount, a.lp_amount).toNumber())
      },
    },
  )
}

export default useLpMarketPositionData
