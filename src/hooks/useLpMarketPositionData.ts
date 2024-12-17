import { useSuiClient } from "@mysten/dapp-kit"
import { UseQueryResult, useQuery } from "@tanstack/react-query"
import { Decimal } from "decimal.js"

export interface LppMarketPosition {
  id: {
    id: string
  }
  description: string
  expiry: string
  expiry_days: string
  lp_amount: string
  lp_amount_display: string
  market_state_id: string
  name: string
  url: string
  yield_token: string
}

const useLpMarketPositionData = (
  address?: string,
  marketStateId?: string,
  maturity?: string,
  positionTypes?: string[],
): UseQueryResult<LppMarketPosition[], Error> => {
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: [
      "getLpPositions",
      address,
      marketStateId,
      maturity,
      positionTypes,
    ],
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
              const content = item.data?.content as unknown as { fields: LppMarketPosition }
              return content?.fields
            })
            .filter(
              (item): item is LppMarketPosition =>
                !!item &&
                (!maturity || item.expiry === maturity.toString()) &&
                (!marketStateId || item.market_state_id === marketStateId),
            )
            .sort((a, b) => Decimal.sub(b.lp_amount, a.lp_amount).toNumber()),
        )
    },
    enabled:
      !!address && !!maturity && !!marketStateId && !!positionTypes?.length,
  })
}

export default useLpMarketPositionData
