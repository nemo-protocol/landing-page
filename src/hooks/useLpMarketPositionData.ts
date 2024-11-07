import { useSuiClientQuery } from "@mysten/dapp-kit"

const useLpMarketPositionData = (
  address?: string,
  marketState?: string,
  maturity?: string,
  // contractAddress?: string,
) => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType:
          "0xa73001d5f5a504bc232ace51fe8e460cbd5b8ac129dae28747693eae0444aa24::market_position::MarketPosition",
      },
      options: {
        showContent: true,
      },
    },
    {
      gcTime: 10000,
      enabled: !!address && !!maturity && !!marketState,
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
