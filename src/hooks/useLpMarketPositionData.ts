import { useSuiClientQuery } from "@mysten/dapp-kit"
import { UseQueryResult } from "@tanstack/react-query"
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
  positionType?: string,
): UseQueryResult<LppMarketPosition[], Error> => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: positionType!,
      },
      options: {
        showContent: true,
      },
    },
    {
      gcTime: 10000,
      enabled: !!address && !!maturity && !!marketStateId && !!positionType,
      select: (data): LppMarketPosition[] => {
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
          .filter((item): item is LppMarketPosition => !!item)
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
