import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "../../types"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../../types"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import useFetchPyPosition from "../../useFetchPyPosition"
import { getPriceVoucher, initPyPosition } from "@/lib/txHelper"
import useGetConversionRateDryRun from "../../dryrun/useGetConversionRateDryRun"
import { safeDivide } from "@/lib/utils"

interface AddLiquiditySingleSyParams {
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : [string, string]

export default function useAddLiquiditySingleSyDryRun<
  T extends boolean = false,
>(coinConfig?: CoinConfig, debug: T = false as T) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun(true)

  return useMutation({
    mutationFn: async ({
      coinData,
      addAmount,
      tokenType,
      pyPositions: inputPyPositions,
    }: AddLiquiditySingleSyParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      const [rate] = await getConversionRate(coinConfig)
      
      const syAmount = tokenType === 0 
        ? safeDivide(addAmount, rate, "decimal").toFixed(0)
        : addAmount

      const [pyPositions] = (
        inputPyPositions ? [inputPyPositions] : await fetchPyPositionAsync()
      ) as [PyPosition[]]

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

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::router::get_lp_out_for_single_sy_in`,
        arguments: [
          { name: "sy_coin_in", value: syAmount },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, moveCallInfo],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(syAmount),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
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

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get add liquidity data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      console.log("result", result)

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[2].returnValues[0][0]),
      )

      console.log("outputAmount", outputAmount)

      const lpAmount = new Decimal(outputAmount.toString())
        .div(10 ** Number(coinConfig.decimal))
        .toFixed()

      console.log("lpAmount", lpAmount)
      const fee = bcs.U128.parse(
        new Uint8Array(result.results[2].returnValues[1][0]),
      )

      const formattedFee = new Decimal(fee)
        .div(2 ** 64)
        .div(10 ** Number(coinConfig.decimal))
        .toString()

      console.log("fee", fee)
      console.log("formattedFee", formattedFee)

      const a = bcs.U128.parse(
        new Uint8Array(result.results[2].returnValues[2][0]),
      )

      const b = new Decimal(a)
        .div(2 ** 64)
        .div(10 ** Number(coinConfig.decimal))
        .toString()

      console.log("a", a)
      console.log("b", b)

      debugInfo.parsedOutput = lpAmount

      return (
        debug ? [lpAmount, debugInfo] : [lpAmount, formattedFee]
      ) as DryRunResult<T>
    },
  })
}
