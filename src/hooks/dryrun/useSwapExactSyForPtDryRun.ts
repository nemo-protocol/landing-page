import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import {
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  mintSCoin,
  splitCoinHelper,
} from "@/lib/txHelper"
import useFetchPyPosition from "../useFetchPyPosition"
import type { PyPosition } from "../types"
import type { CoinData } from "@/hooks/useCoinData"

interface SwapParams {
  tokenType: number
  swapAmount: string
  coinData: CoinData[]
  coinType: string
  minPtOut: string
  approxPtOut: string
  pyPositions?: PyPosition[]
}

export default function useSwapExactSyForPtDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      tokenType,
      swapAmount,
      coinData,
      coinType,
      minPtOut,
      approxPtOut,
      pyPositions: inputPyPositions,
    }: SwapParams): Promise<[boolean] | [boolean, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const [pyPositions] = !inputPyPositions
        ? ((await fetchPyPositionAsync()) as [PyPosition[]])
        : [inputPyPositions]

      const tx = new Transaction()
      tx.setSender(address)

      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const [splitCoin] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [swapAmount])
          : splitCoinHelper(tx, coinData, [swapAmount], coinType)

      const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_pt`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "min_pt_out", value: minPtOut },
            { name: "approx_pt_out", value: approxPtOut },
            { name: "sy_coin", value: "syCoin" },
            { name: "price_voucher", value: "priceVoucher" },
            { name: "py_position", value: "pyPosition" },
            { name: "py_state", value: coinConfig.pyStateId },
            {
              name: "market_factory_config",
              value: coinConfig.marketFactoryConfigId,
            },
            { name: "market_state", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(minPtOut),
          tx.pure.u64(approxPtOut),
          syCoin,
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: debugInfo.moveCall.typeArguments,
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

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      console.log("useSwapExactSyForPtDryRun", result.event)

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      return debug ? [true, debugInfo] : [true]
    },
  })
}
