import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import { DEBUG } from "@/config"
import type { PyPosition } from "../useFetchPyPosition"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  getPriceVoucher,
  initPyPosition,
  redeemPy,
  redeemSyCoin,
} from "@/lib/txHelper"

export default function useRedeemPYDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      ptRedeemValue,
      ytRedeemValue,
      pyPositions: inputPyPositions,
    }: {
      ptRedeemValue: string
      ytRedeemValue: string
      pyPositions?: PyPosition[]
    }): Promise<[string] | [string, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      let pyPositions = inputPyPositions
      if (!pyPositions) {
        [pyPositions] = (await fetchPyPositionAsync()) as [PyPosition[]]
      }

      if (DEBUG) {
        console.log("pyPositions in dry run:", pyPositions)
      }

      const tx = new Transaction()
      tx.setSender(address)

      // Handle py position creation
      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id.id)
      }

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const syCoin = redeemPy(
        tx,
        coinConfig,
        ytRedeemValue,
        ptRedeemValue,
        priceVoucher,
        pyPosition,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      tx.transferObjects([yieldToken], address)

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      console.log("redeem_py dry run result:", result)

      if (DEBUG) {
        console.log("redeem_py dry run result:", result)
      }

      const dryRunDebugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::yield_factory::redeem_py`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "yt_amount", value: ytRedeemValue },
            { name: "pt_amount", value: ptRedeemValue },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id.id,
            },
            { name: "py_state", value: coinConfig.pyStateId },
            {
              name: "yield_factory_config",
              value: coinConfig.yieldFactoryConfigId,
            },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
      }

      if (result?.error) {
        throw new ContractError(result.error, dryRunDebugInfo)
      }

      if (!result?.events?.[2]?.parsedJson) {
        const message = "Failed to get redeem PY data"
        dryRunDebugInfo.rawResult = {
          error: message,
          results: result?.results,
        }
        throw new ContractError(message, dryRunDebugInfo)
      }

      const syAmount = result.events[2].parsedJson.amount_out as string

      dryRunDebugInfo.parsedOutput = syAmount

      const returnValue = syAmount

      return debug ? [syAmount, dryRunDebugInfo] : [returnValue]
    },
  })
}
