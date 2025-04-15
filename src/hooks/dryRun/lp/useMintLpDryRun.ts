import Decimal from "decimal.js"
import { ContractError } from "../../types"
import type { DebugInfo, MarketState, MoveCallInfo } from "../../types"
import type { PyPosition } from "../../types"
import type { CoinData } from "@/types"
import { Transaction } from "@mysten/sui/transactions"
import useFetchPyPosition from "../../useFetchPyPosition"
import { useEstimateLpOutDryRun } from "./useEstimateLpOutDryRun"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { useMutation, UseMutationResult } from "@tanstack/react-query"
import { BaseDryRunResult, createDryRunResult } from "../../types/dryRun"
import {
  mintPY,
  depositSyCoin,
  initPyPosition,
  splitCoinHelper,
} from "@/lib/txHelper"
import { debugLog } from "@/config"
import { getPriceVoucher } from "@/lib/txHelper/price"
import useMintCoinDryRun from "../useMintSCoinDryRun"
import { mintMultiSCoin } from "@/lib/txHelper/coin"

interface MintLpParams {
  amount: string
  vaultId?: string
  slippage: string
  tokenType: number
  coinData: CoinData[]
  coinConfig: CoinConfig
  pyPositions?: PyPosition[]
}

interface MintLpResult {
  lpAmount: string
  ytAmount: string
}

export default function useMintLpDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  marketState?: MarketState,
  debug: T = false as T,
): UseMutationResult<BaseDryRunResult<MintLpResult, T>, Error, MintLpParams> {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: estimateLpOut } = useEstimateLpOutDryRun(
    coinConfig,
    marketState,
  )
  const { mutateAsync: mintCoin } = useMintCoinDryRun(coinConfig, false)
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      amount,
      vaultId,
      slippage,
      coinData,
      tokenType,
      coinConfig,
      pyPositions: inputPyPositions,
    }: MintLpParams): Promise<BaseDryRunResult<MintLpResult, T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }

      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      const { coinAmount } = await mintCoin({
        amount,
        coinData,
        vaultId,
        slippage,
      })

      const lpOut = await estimateLpOut(amount)

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

      // Split coins and deposit
      const [[splitCoinForSy, splitCoinForPt, sCoin], mintSCoinMoveCall] =
        tokenType === 0
          ? await mintMultiSCoin({
              tx,
              vaultId,
              slippage,
              amount,
              address,
              coinData,
              coinConfig,
              debug: true,
              splitAmounts: [
                new Decimal(lpOut.syValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0, Decimal.ROUND_HALF_UP),
                new Decimal(lpOut.syForPtValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0, Decimal.ROUND_HALF_UP),
              ],
            })
          : [
              splitCoinHelper(
                tx,
                coinData,
                [
                  new Decimal(lpOut.syValue).toFixed(0, Decimal.ROUND_HALF_UP),
                  new Decimal(lpOut.syForPtValue).toFixed(
                    0,
                    Decimal.ROUND_HALF_UP,
                  ),
                ],
                coinConfig.coinType,
              ),
              [] as MoveCallInfo[],
            ]

      if (tokenType === 0) {
        tx.transferObjects([sCoin], address)
      }

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

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )
      const [pt_amount] = mintPY(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition,
      )

      const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::market::mint_lp`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "pt_amount", value: "pt_amount" },
          { name: "min_lp_amount", value: "0" },
          { name: "price_voucher", value: "priceVoucherForMintLp" },
          {
            name: "py_position",
            value: pyPositions?.length ? pyPositions[0].id : "pyPosition",
          },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
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

      console.log("useMintLpDryRun result", result)

      const debugInfo: DebugInfo = {
        moveCall: [...mintSCoinMoveCall, priceVoucherMoveCall, moveCallInfo],
        rawResult: result,
      }

      if (result?.error) {
        debugLog("useMintLpDryRun error", debugInfo)
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get mint LP data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const ytAmount = result.events[result.events.length - 2].parsedJson
        .amount_yt as string
      const lpAmount = result.events[result.events.length - 1].parsedJson
        .lp_amount as string

      debugInfo.parsedOutput = lpAmount

      return createDryRunResult({ lpAmount, ytAmount }, debug, debugInfo)
    },
  })
}
