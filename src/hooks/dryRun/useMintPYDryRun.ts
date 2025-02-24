import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import Decimal from "decimal.js"
import type { CoinData } from "@/hooks/useCoinData"
import type { PyPosition } from "../types"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  mintPY,
  splitCoinHelper,
} from "@/lib/txHelper"

type MintResult = {
  ptAmount: string
  ytAmount: string
}

export default function useMintPYDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      mintValue,
      coinData,
      pyPositions: inputPyPositions,
    }: {
      mintValue: string
      coinData: CoinData[]
      pyPositions?: PyPosition[]
    }): Promise<[MintResult] | [MintResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      const [pyPositions] = !inputPyPositions
        ? ((await fetchPyPositionAsync()) as [PyPosition[]])
        : [inputPyPositions]

      const tx = new Transaction()
      tx.setSender(address)

      // Handle py position creation
      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const amount = new Decimal(mintValue)
        .mul(new Decimal(10).pow(coinConfig.decimal))
        .toString()

      const [splitCoin] = splitCoinHelper(
        tx,
        coinData,
        [amount],
        coinConfig.coinType,
      )

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoin,
        coinConfig.coinType,
      )

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const [, debugInfo] = mintPY(
        tx,
        coinConfig,
        syCoin,
        priceVoucher,
        pyPosition,
        true,
      )

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      console.log("mint_py dry run result:", result)

      const dryRunDebugInfo: DebugInfo = {
        moveCall: [debugInfo],
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
      }

      if (result?.error) {
        throw new ContractError(result.error, dryRunDebugInfo)
      }

      if (!result?.events?.[1]?.parsedJson) {
        const message = "Failed to get mint PY data"
        dryRunDebugInfo.rawResult = {
          error: message,
          results: result?.results,
        }
        throw new ContractError(message, dryRunDebugInfo)
      }

      const ptAmount = result.events[1].parsedJson.amount_pt as string
      const ytAmount = result.events[1].parsedJson.amount_yt as string

      dryRunDebugInfo.parsedOutput = JSON.stringify({ ptAmount, ytAmount })

      const returnValue = { ptAmount, ytAmount }

      return debug ? [returnValue, dryRunDebugInfo] : [returnValue]
    },
  })
}
