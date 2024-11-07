import { useSuiClientQuery } from "@mysten/dapp-kit"

const usePyPositionData = (
  address?: string,
  pyState?: string,
  maturity?: string,
) => {
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType:
          "0xa73001d5f5a504bc232ace51fe8e460cbd5b8ac129dae28747693eae0444aa24::py_position::PyPosition",
      },
      options: {
        showContent: true,
      },
    },
    {
      gcTime: 10000,
      enabled: !!address && !!maturity && !!pyState,
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
          .filter((item) => item.py_state_id === pyState)
        // .filter(
        //   (item) => item.expiry === maturity && item.py_state_id === pyState,
        // )
      },
    },
  )
}

export default usePyPositionData
