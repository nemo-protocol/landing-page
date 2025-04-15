import type { CoinData } from "@/types"
import { ContractError } from "../../types"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { DebugInfo, PyPosition } from "../../types"
import type { CoinConfig } from "@/queries/types/market"
import useFetchPyPosition from "../../useFetchPyPosition"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { depositSyCoin, initPyPosition, splitCoinHelper } from "@/lib/txHelper"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { mintSCoin } from "@/lib/txHelper/coin"
import { debugLog } from "@/config"

interface SeedLiquidityParams {
  vaultId?: string
  slippage: string
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
  coinConfig: CoinConfig
}

type DryRunResult<T extends boolean> = T extends true
  ? [{ lpAmount: string; ytAmount: string }, DebugInfo]
  : { lpAmount: string; ytAmount: string }

export default function useSeedLiquidityDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      vaultId,
      slippage,
      coinData,
      addAmount,
      tokenType,
      coinConfig,
      pyPositions: inputPyPositions,
    }: SeedLiquidityParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

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

      const [splitCoin] =
        tokenType === 0
          ? await mintSCoin({
              tx,
              vaultId,
              address,
              slippage,
              coinData,
              coinConfig,
              debug: true,
              amount: addAmount,
            })
          : splitCoinHelper(tx, coinData, [addAmount], coinConfig.coinType)

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoin,
        coinConfig.coinType,
      )

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "min_lp_amount", value: "0" },
          { name: "price_voucher", value: "priceVoucher" },
          {
            name: "py_position",
            value: pyPositions?.length ? pyPositions[0].id : "pyPosition",
          },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "yield_factory_config",
            value: coinConfig.yieldFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const [lp] = tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          tx.pure.u64(0),
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.yieldFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      })

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

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, moveCallInfo],
        rawResult: result,
      }

      if (result?.error) {
        debugLog("seedLiquidityDryRun error", debugInfo)
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get seed liquidity data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const ytAmount = result.events[result.events.length - 2].parsedJson
        .amount_yt as string

      const lpAmount = result.events[result.events.length - 1].parsedJson
        .lp_amount as string

      debugInfo.parsedOutput = lpAmount

      return (
        debug ? [{ lpAmount, ytAmount }, debugInfo] : { lpAmount, ytAmount }
      ) as DryRunResult<T>
    },
  })
}
