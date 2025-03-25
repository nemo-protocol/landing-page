import Decimal from "decimal.js"
import { ContractError } from "../../types"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/types"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../../types"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import useFetchPyPosition from "../../useFetchPyPosition"
import { initPyPosition } from "@/lib/txHelper"
import useGetConversionRateDryRun from "../useGetConversionRateDryRun"
import { formatDecimalValue } from "@/lib/utils"
import { useAddLiquiditySingleSy } from "@/hooks/actions/useAddLiquiditySingleSy"

interface AddLiquiditySingleSyParams {
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
}

interface AddLiquiditySingleSyResult {
  lpValue: string
  lpAmount: string
  tradeFee: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [AddLiquiditySingleSyResult, DebugInfo]
  : AddLiquiditySingleSyResult

export default function useAddLiquiditySingleSyDryRun<
  T extends boolean = false,
>(coinConfig?: CoinConfig, debug: T = false as T) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun(true)
  const { mutateAsync: addLiquiditySingleSy } = useAddLiquiditySingleSy(
    coinConfig,
    true,
  )

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

      // 构造 minLpAmount，在干运行中设为 0
      const minLpAmount = "0"

      // 调用 useAddLiquiditySingleSy 中的逻辑
      const addLiquiditySingleSyDebugInfo = await addLiquiditySingleSy({
        tx,
        address,
        coinData,
        addAmount,
        tokenType,
        pyPosition,
        coinConfig,
        minLpAmount,
        conversionRate: rate,
        coinType: coinConfig.coinType,
      })

      // 如果创建了新的 pyPosition，需要将其转移给用户
      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      // 执行干运行
      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      // 创建 debugInfo 对象
      const debugInfo: DebugInfo = {
        moveCall: addLiquiditySingleSyDebugInfo?.moveCall || [],
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
        parsedOutput: "",
      }

      if (result.error) {
        throw new ContractError(result.error, debugInfo)
      }

      // 检查结果
      if (!result?.events?.[result.events.length - 1]?.parsedJson?.lp_amount) {
        const message = "Failed to get lp amount"
        // 更新 error 信息
        debugInfo.rawResult = {
          ...debugInfo.rawResult,
          error: message,
        }
        throw new ContractError(message, debugInfo)
      }

      // 检查结果
      if (
        !result?.events?.[result.events.length - 2]?.parsedJson?.reserve_fee
          ?.value
      ) {
        const message = "Failed to get reserve fee"
        // 更新 error 信息
        debugInfo.rawResult = {
          ...debugInfo.rawResult,
          error: message,
        }
        throw new ContractError(message, debugInfo)
      }

      const decimal = Number(coinConfig.decimal)

      // 解析 LP 数量
      const lpAmount =
        result?.events?.[result.events.length - 1]?.parsedJson?.lp_amount

      const lpValue = new Decimal(lpAmount.toString())
        .div(10 ** decimal)
        .toFixed(decimal)

      // 在干运行中，我们不能直接获取 tradeFee，设置为 0
      const tradeFee = formatDecimalValue(
        new Decimal(
          result?.events?.[
            result.events.length - 2
          ]?.parsedJson?.reserve_fee?.value,
        )
          .div(2 ** 64)
          .div(10 ** decimal),
        decimal,
      )

      // 更新 parsedOutput
      debugInfo.parsedOutput = `${lpAmount}`

      return (
        debug
          ? [{ lpAmount: lpAmount.toString(), tradeFee, lpValue }, debugInfo]
          : { lpAmount: lpAmount.toString(), tradeFee, lpValue }
      ) as DryRunResult<T>
    },
  })
}
