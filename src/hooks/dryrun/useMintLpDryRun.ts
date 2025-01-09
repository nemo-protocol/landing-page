import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import useFetchPyPosition, { type PyPosition } from "../useFetchPyPosition"
import { useCalculateLpOut } from "../useCalculateLpOut"
import {
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  mintPy,
  mintSCoin,
  splitCoinHelper,
} from "@/lib/txHelper"
import { DEBUG, debugLog } from "@/config"
import Decimal from "decimal.js"
import type { CoinData } from "@/hooks/useCoinData"

type MintLpResult = {
  lpAmount: string
  ptAmount: string
  ytAmount: string
}

export default function useMintLpDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: calculateLpOut } = useCalculateLpOut(coinConfig)
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
    }): Promise<[MintLpResult] | [MintLpResult, DebugInfo]> => {
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

      // Calculate LP output
      const lpOut = await calculateLpOut(addAmount)
      const amounts = {
        syForPt: new Decimal(lpOut.syForPtValue).toFixed(0),
        sy: new Decimal(lpOut.syValue).toFixed(0),
      }

      // Get price voucher for minting PT
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      // Get price voucher for minting LP
      const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

      // Calculate min LP amount based on slippage
      const minLpAmount = new Decimal(lpOut.lpAmount)
        .mul(1 - new Decimal(slippage).div(100).toNumber())
        .toFixed(0)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::mint_lp`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "sy_coin", value: "syCoin" },
            { name: "pt_amount", value: "pt_amount" },
            { name: "min_lp_amount", value: minLpAmount },
            { name: "price_voucher", value: "priceVoucherForMintLp" },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id.id,
            },
            { name: "py_state", value: coinConfig.pyStateId },
            { name: "market_state", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      // Split coins and deposit
      const [splitCoinForSy, splitCoinForPt] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [amounts.sy, amounts.syForPt])
          : splitCoinHelper(
              tx,
              coinData,
              [amounts.sy, amounts.syForPt],
              tokenType === 0
                ? coinConfig.underlyingCoinType
                : coinConfig.coinType,
            )

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForSy,
        tokenType === 0 ? coinConfig.underlyingCoinType : coinConfig.coinType,
      )

      // Mock PT minting
      const pyCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForPt,
        tokenType === 0 ? coinConfig.underlyingCoinType : coinConfig.coinType,
      )

      //   tx.transferObjects([syCoin, pyCoin], address)
      const [pt_amount] = mintPy(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition,
      )

      const mintLpMoveCall = {
        target: `${coinConfig.nemoContractId}::market::mint_lp`,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          pt_amount,
          tx.pure.u64(minLpAmount),
          priceVoucherForMintLp,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      }
      debugLog("mint_lp dry run move call:", mintLpMoveCall)

      // Mock mint LP
      tx.moveCall(mintLpMoveCall)

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

      if (DEBUG) {
        console.log("mint_lp dry run result:", result)
      }

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[2]?.parsedJson) {
        const message = "Failed to get mint PY data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      if (!result?.events?.[3]?.parsedJson) {
        const message = "Failed to get mint LP data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      console.log("result events", result.events)

      const ptAmount = result.events[2].parsedJson.amount_pt as string
      const ytAmount = result.events[2].parsedJson.amount_yt as string
      const lpAmount = result.events[3].parsedJson.lp_amount as string

      debugInfo.parsedOutput = JSON.stringify({ lpAmount, ptAmount, ytAmount })

      const returnValue = { lpAmount, ptAmount, ytAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
