import { DEBUG } from "@/config"
import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import useFetchPyPosition, { type PyPosition } from "../useFetchPyPosition"
import { useCalculateLpOut } from "../useCalculateLpOut"
import {
  mintSCoin,
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  mintPY,
  splitCoinHelper,
} from "@/lib/txHelper"
import Decimal from "decimal.js"

interface MintLpParams {
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useMintLpDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: calculateLpOut } = useCalculateLpOut(coinConfig)
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      coinData,
      addAmount,
      tokenType,
      pyPositions: inputPyPositions,
    }: MintLpParams): Promise<DryRunResult<T>> => {
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
        pyPosition = tx.object(pyPositions[0].id.id)
      }

      // Calculate LP output
      const lpOut = await calculateLpOut(addAmount)
      const amounts = {
        syForPt: new Decimal(lpOut.syForPtValue).toFixed(0),
        sy: new Decimal(lpOut.syValue).toFixed(0),
      }

      // Split coins and deposit
      const [splitCoinForSy, splitCoinForPt] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [amounts.sy, amounts.syForPt])
          : splitCoinHelper(
              tx,
              coinData,
              [amounts.sy, amounts.syForPt],
              coinConfig.coinType,
            )

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForSy,
        coinConfig.coinType,
      )

      const pyCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForPt,
        coinConfig.coinType,
      )

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)
      const [pt_amount] = mintPY(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition,
      )

      const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::mint_lp`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "sy_coin", value: "syCoin" },
            { name: "pt_amount", value: "pt_amount" },
            { name: "min_lp_amount", value: "0" },
            { name: "price_voucher", value: "priceVoucherForMintLp" },
            {
              name: "py_position",
              value: pyPositions?.length ? pyPositions[0].id.id : "pyPosition",
            },
            { name: "py_state", value: coinConfig.pyStateId },
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
          syCoin,
          pt_amount,
          tx.pure.u64(0),
          priceVoucherForMintLp,
          pyPosition,
          tx.object(coinConfig.pyStateId),
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

      if (result?.error) {
        if (DEBUG) {
          console.log("debugInfo", debugInfo, coinConfig)
        }
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get mint LP data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const lpAmount = result.events[result.events.length - 1].parsedJson
        .lp_amount as string

      debugInfo.parsedOutput = lpAmount

      return (debug ? [lpAmount, debugInfo] : lpAmount) as DryRunResult<T>
    },
  })
}
