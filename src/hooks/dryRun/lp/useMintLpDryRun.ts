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
  mintSCoin,
  depositSyCoin,
  initPyPosition,
  splitCoinHelper,
} from "@/lib/txHelper"
import { NEED_MIN_VALUE_LIST } from "@/lib/constants"
import { formatDecimalValue } from "@/lib/utils"
import { initCetusVaultsSDK, InputType } from "@cetusprotocol/vaults-sdk"
import { debugLog } from "@/config"
import { getPriceVoucher } from "@/lib/txHelper/price"

interface MintLpParams {
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
  coinConfig: CoinConfig
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
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      coinData,
      addAmount,
      tokenType,
      pyPositions: inputPyPositions,
      coinConfig,
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

      // Calculate LP output
      const lpOut = await estimateLpOut(addAmount)

      const decimal = Number(coinConfig.decimal)

      const minValue =
        NEED_MIN_VALUE_LIST.find(
          (item) => item.coinType === coinConfig.coinType,
        )?.minValue || 0

      const smallerAmount = formatDecimalValue(
        Decimal.min(
          new Decimal(lpOut.syForPtValue).div(10 ** decimal),
          new Decimal(lpOut.syValue).div(10 ** decimal),
        ),
        decimal,
      )

      const addValue = formatDecimalValue(
        new Decimal(addAmount).div(10 ** decimal),
        decimal,
      )

      if (
        tokenType === 0 &&
        new Decimal(smallerAmount).lt(new Decimal(minValue))
      ) {
        const needValue = formatDecimalValue(
          new Decimal(minValue).div(new Decimal(smallerAmount)).mul(addValue),
          decimal,
        )
        throw new Error(
          `Please enter at least ${needValue} ${coinConfig.underlyingCoinName}`,
        )
      }

      const amounts = {
        syForPt: new Decimal(lpOut.syForPtValue).toFixed(0),
        sy: new Decimal(lpOut.syValue).toFixed(0),
      }

      console.log("amounts", amounts)

      const sdk = initCetusVaultsSDK({
        network: "mainnet",
      })

      console.log("coinType", coinConfig.coinType)

      const cetusDatas =
        coinConfig.coinType ===
        "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN"
          ? [
              await sdk.Vaults.calculateDepositAmount({
                vault_id:
                  "0xde97452e63505df696440f86f0b805263d8659b77b8c316739106009d514c270",
                fix_amount_a: true,
                input_amount: amounts.syForPt,
                slippage: 0.005,
                side: InputType.OneSide,
              }),
              await sdk.Vaults.calculateDepositAmount({
                vault_id:
                  "0xde97452e63505df696440f86f0b805263d8659b77b8c316739106009d514c270",
                fix_amount_a: true,
                input_amount: amounts.sy,
                slippage: 0.005,
                side: InputType.OneSide,
              }),
            ]
          : undefined

      console.log("cetusDatas", cetusDatas,cetusDatas
        ?.map((item) => [item.amount_a, item.amount_b])
        .flat())

      // Split coins and deposit
      const [[splitCoinForSy, splitCoinForPt], mintSCoinMoveCall] =
        tokenType === 0
          ? mintSCoin(
              tx,
              coinConfig,
              coinData,
              coinConfig.coinType ===
                "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN" &&
                cetusDatas?.length
                ? cetusDatas
                    ?.map((item) => [item.amount_a, item.amount_b])
                    .flat()
                : [amounts.sy, amounts.syForPt],
              true,
              cetusDatas,
            )
          : [
              splitCoinHelper(
                tx,
                coinData,
                [amounts.sy, amounts.syForPt],
                coinConfig.coinType,
              ),
              [] as MoveCallInfo[],
            ]

      // tx.transferObjects([splitCoinForSy, splitCoinForPt], address)

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
