import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import { depositSyCoin, getPriceVoucher, initPyPosition, mintSCoin, splitCoinHelper } from "@/lib/txHelper"
import { DEBUG, debugLog } from "@/config"
import type { CoinData } from "@/hooks/useCoinData"
import Decimal from "decimal.js"
import useFetchPyPosition, { type PyPosition } from "../useFetchPyPosition"

type SeedLiquidityResult = {
  lpAmount: string
}

export default function useSeedLiquidityDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      addAmount,
      tokenType,
      slippage,
      coinData,
      pyPositions: inputPyPositions,
    }: {
      addAmount: string
      tokenType: number
      slippage: string
      coinData: CoinData[]
      pyPositions?: PyPosition[]
    }): Promise<[SeedLiquidityResult] | [SeedLiquidityResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      let pyPositions = inputPyPositions
      if (!pyPositions) {
        [pyPositions] = (await fetchPyPositionAsync()) as [PyPosition[]]
      }

      if (DEBUG) {
        console.log("pyPositions in dry run:", pyPositions)
        console.log("coinData in dry run:", coinData)
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

      // Calculate min LP amount based on slippage
      const minLpAmount = new Decimal(addAmount)
        .mul(1 - new Decimal(slippage).div(100).toNumber())
        .toFixed(0)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "sy_coin", value: "syCoin" },
            { name: "min_lp_amount", value: minLpAmount },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id.id,
            },
            { name: "py_state", value: coinConfig.pyStateId },
            { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
            { name: "market_state", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      // Split coins and deposit
      const [splitCoin] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [addAmount])
          : splitCoinHelper(
              tx,
              coinData,
              [addAmount],
              tokenType === 0
                ? coinConfig.underlyingCoinType
                : coinConfig.coinType,
            )

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoin,
        tokenType === 0 ? coinConfig.underlyingCoinType : coinConfig.coinType,
      )

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const seedLiquidityMoveCall = {
        target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          tx.pure.u64(minLpAmount),
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.yieldFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      }
      debugLog("seed_liquidity dry run move call:", seedLiquidityMoveCall)

      // Mock seed liquidity
      const [lp] = tx.moveCall(seedLiquidityMoveCall)

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      tx.transferObjects([lp], address)

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      if (DEBUG) {
        console.log("seed_liquidity dry run result:", result)
      }

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[1]?.parsedJson) {
        const message = "Failed to get seed liquidity data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const lpAmount = result.events[1].parsedJson.lp_amount as string

      debugInfo.parsedOutput = JSON.stringify({ lpAmount })

      const returnValue = { lpAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
} 