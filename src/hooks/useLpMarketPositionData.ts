import { useSuiClientQuery } from "@mysten/dapp-kit"

const useLpMarketPositionData = (
  address?: string,
  marketStateId?: string,
  maturity?: string,
  positionType?: string,
) => {
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
      select: (data) => {
        return (
          data.data
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
            .filter((item) => !!item)
            // .filter((item) => item.market_state_id === marketState)
            .filter(
              (item) =>
                item.expiry === maturity &&
                item.market_state_id === marketStateId,
            )
        )
      },
    },
  )
}

export default useLpMarketPositionData
