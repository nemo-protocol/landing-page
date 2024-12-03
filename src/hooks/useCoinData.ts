import Decimal from "decimal.js"
import { useSuiClientQuery } from "@mysten/dapp-kit"
import { } from "@suiet/wallet-kit"

const useCoinData = (address?: string, coinType?: string) => {
  return useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: coinType!,
    },
    {
      gcTime: 10000,
      enabled: !!address && !!coinType,
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )
}

export default useCoinData
