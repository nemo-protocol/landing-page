import { useSuiClientQuery } from "@mysten/dapp-kit"

const useLpMarketPositionData = (
  address?: string,
  marketState?: string,
  maturity?: string,
  contractAddress?: string,
) => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${contractAddress}::market::MarketPosition`,
      },
      options: {
        showContent: true,
      },
    },
    {
      gcTime: 10000,
      enabled: !!address && !!maturity && !!marketState,
      select: (data) => {
        console.log("data", data)

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
          .filter((item) => !!item)
          .filter((item) => item.market_state_id === marketState)
        // .filter(
        //   (item) => item.expiry === maturity && item.py_state_id === pyState,
        // )
      },
    },
  )
}

export default useLpMarketPositionData
