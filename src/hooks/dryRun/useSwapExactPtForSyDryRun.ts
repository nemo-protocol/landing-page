import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../types"
import { ContractError } from "../types"
import { bcs } from "@mysten/sui/bcs"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  initPyPosition,
  getPriceVoucher,
  swapExactPtForSy,
} from "@/lib/txHelper"

type SwapResult = {
  syAmount: string
}

export default function useSwapExactPtForSyDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(
    coinConfig,
    true,
  )

  return useMutation({
    mutationFn: async (
      ptAmount: string,
    ): Promise<[SwapResult] | [SwapResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const [pyPositions] = (await fetchPyPositionAsync()) as [PyPosition[]]

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

      // Get price voucher
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
        arguments: [
          { name: "version", value: coinConfig.version },
          {
            name: "pt_amount",
            value: ptAmount,
          },
          {
            name: "py_position",
            value: created ? "pyPosition" : pyPositions[0].id,
          },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "price_voucher", value: "priceVoucher" },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const syCoin = swapExactPtForSy(
        tx,
        coinConfig,
        ptAmount,
        pyPosition,
        priceVoucher,
        "0",
      )

      tx.moveCall({
        target: `0x2::coin::value`,
        arguments: [syCoin],
        typeArguments: [coinConfig.syCoinType],
      })

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

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
        rawResult: result,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      debugInfo.parsedOutput = syAmount

      const returnValue = { syAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
