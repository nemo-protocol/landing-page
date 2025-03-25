import { SuiClient } from "@mysten/sui/client"
import { CoinData } from "@/types"
import Decimal from "decimal.js"

/**
 * Fetches coin data for a specific address and coin type
 * @param client SuiClient instance
 * @param address The address to fetch coins for
 * @param coinType The type of coin to fetch
 * @returns Sorted array of CoinData objects
 */
export async function fetchCoins(
  client: SuiClient,
  address: string,
  coinType: string,
): Promise<CoinData[]> {
  if (!address || !coinType) {
    throw new Error("Invalid parameters for fetching coins")
  }

  const response = await client.getCoins({
    owner: address,
    coinType: coinType,
  })

  // Sort coins by balance in descending order
  return response.data.sort((a, b) =>
    new Decimal(b.balance).comparedTo(new Decimal(a.balance))
  )
}