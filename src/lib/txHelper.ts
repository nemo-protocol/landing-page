import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/types"
import { MoveCallInfo } from "@/hooks/types"
import { LpPosition } from "@/hooks/types"
import { CoinConfig } from "@/queries/types/market"
import {
  Transaction,
  TransactionResult,
  TransactionArgument,
} from "@mysten/sui/transactions"

export const initPyPosition = (tx: Transaction, coinConfig: CoinConfig) => {
  const moveCall = {
    target: `${coinConfig.nemoContractId}::py::init_py_position`,
    arguments: [coinConfig.version, coinConfig.pyStateId, "0x6"],
    typeArguments: [coinConfig.syCoinType],
  }
  debugLog("init_py_position move call:", moveCall)

  const [pyPosition] = tx.moveCall({
    ...moveCall,
    arguments: moveCall.arguments.map((arg) => tx.object(arg)),
  })

  return pyPosition
}

export function splitCoinHelper(
  tx: Transaction,
  coinData: CoinData[],
  amounts: string[],
  coinType?: string,
) {
  debugLog("splitCoinHelper params:", {
    coinData,
    amounts,
    coinType,
  })

  const totalTargetAmount = amounts.reduce(
    (sum, amount) => sum.add(new Decimal(amount)),
    new Decimal(0),
  )

  if (
    !coinType ||
    [
      "0x2::sui::SUI",
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    ].includes(coinType)
  ) {
    const totalBalance = coinData.reduce(
      (sum, coin) => sum.add(coin.balance),
      new Decimal(0),
    )

    if (totalBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "Insufficient balance")
    }

    return tx.splitCoins(tx.gas, amounts)
  } else {
    const firstCoinBalance = new Decimal(coinData[0].balance)

    if (firstCoinBalance.gte(totalTargetAmount)) {
      if (firstCoinBalance.eq(totalTargetAmount) && amounts.length === 1) {
        return [tx.object(coinData[0].coinObjectId)]
      }
      return tx.splitCoins(tx.object(coinData[0].coinObjectId), amounts)
    }

    const coinsToUse: string[] = []
    let accumulatedBalance = new Decimal(0)

    for (const coin of coinData) {
      accumulatedBalance = accumulatedBalance.add(coin.balance)
      coinsToUse.push(coin.coinObjectId)

      if (accumulatedBalance.gte(totalTargetAmount)) {
        break
      }
    }

    if (accumulatedBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "insufficient balance")
    }

    tx.mergeCoins(
      tx.object(coinsToUse[0]),
      coinsToUse.slice(1).map((id) => tx.object(id)),
    )
    return tx.splitCoins(coinsToUse[0], amounts)
  }
}

export const mergeLpPositions = (
  tx: Transaction,
  coinConfig: CoinConfig,
  lpPositions: LpPosition[],
  lpAmount: string,
) => {
  debugLog("mergeLppMarketPositions params:", {
    lpPositions,
    lpAmount,
  })

  const sortedPositions = [...lpPositions].sort(
    (a, b) => Number(b.lp_amount) - Number(a.lp_amount),
  )

  let accumulatedAmount = new Decimal(0)
  const positionsToMerge: LpPosition[] = []
  for (const position of sortedPositions) {
    accumulatedAmount = accumulatedAmount.add(position.lp_amount)
    positionsToMerge.push(position)

    if (accumulatedAmount.gte(lpAmount)) {
      break
    }
  }

  if (accumulatedAmount.lt(lpAmount)) {
    throw new Error("Insufficient LP amount")
  }

  const mergedPosition = tx.object(positionsToMerge[0].id.id)

  if (positionsToMerge.length === 1) {
    return mergedPosition
  }

  for (let i = 1; i < positionsToMerge.length; i++) {
    const joinMoveCall = {
      target: `${coinConfig.nemoContractId}::market_position::join`,
      arguments: [positionsToMerge[0].id.id, positionsToMerge[i].id.id, "0x6"],
      typeArguments: [],
    }
    debugLog("market_position::join move call:", joinMoveCall)

    tx.moveCall({
      ...joinMoveCall,
      arguments: joinMoveCall.arguments.map((arg) => tx.object(arg)),
    })
  }

  return mergedPosition
}

export function depositSyCoin(
  tx: Transaction,
  coinConfig: CoinConfig,
  splitCoin: TransactionArgument,
  coinType: string,
) {
  const depositMoveCall = {
    target: `${coinConfig.nemoContractId}::sy::deposit`,
    arguments: [coinConfig.version, "splitCoin", coinConfig.syStateId],
    typeArguments: [coinType, coinConfig.syCoinType],
  }
  debugLog("sy::deposit move call:", depositMoveCall)

  const [syCoin] = tx.moveCall({
    ...depositMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      splitCoin,
      tx.object(coinConfig.syStateId),
    ],
  })

  return syCoin
}

export const mintPY = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionArgument,
  priceVoucher: TransactionArgument,
  pyPosition: TransactionArgument,
  returnDebugInfo?: T,
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::yield_factory::mint_py`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "sy_coin", value: "syCoin" },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: coinConfig.pyStateId },
      { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  const txMoveCall = {
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  }

  debugLog("mint_py move call:", txMoveCall)

  const result = tx.moveCall(txMoveCall)

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const redeemSyCoin = (
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionArgument,
) => {
  const redeemMoveCall = {
    target: `${coinConfig.nemoContractId}::sy::redeem`,
    arguments: [coinConfig.version, "syCoin", coinConfig.syStateId],
    typeArguments: [coinConfig.coinType, coinConfig.syCoinType],
  }
  debugLog("sy::redeem move call:", redeemMoveCall)

  const [yieldToken] = tx.moveCall({
    ...redeemMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      tx.object(coinConfig.syStateId),
    ],
  })

  return yieldToken
}

export const burnLp = (
  tx: Transaction,
  coinConfig: CoinConfig,
  lpAmount: string,
  pyPosition: TransactionArgument,
  mergedPositionId: TransactionArgument,
) => {
  const burnLpMoveCall = {
    target: `${coinConfig.nemoContractId}::market::burn_lp`,
    arguments: [
      coinConfig.version,
      lpAmount,
      "pyPosition",
      coinConfig.marketStateId,
      "mergedPositionId",
      "0x6",
    ],
    typeArguments: [coinConfig.syCoinType],
  }
  debugLog("burn_lp move call:", burnLpMoveCall)

  const [syCoin] = tx.moveCall({
    ...burnLpMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(lpAmount),
      pyPosition,
      tx.object(coinConfig.marketStateId),
      mergedPositionId,
      tx.object("0x6"),
    ],
  })

  return syCoin
}

export const swapExactPtForSy = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  ptAmount: string,
  pyPosition: TransactionArgument,
  priceVoucher: TransactionArgument,
  minSyOut: string,
  returnDebugInfo?: T,
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "pt_amount", value: ptAmount },
      { name: "min_sy_out", value: minSyOut },
      { name: "py_position", value: "pyPosition" },
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

  debugLog("swap_exact_pt_for_sy move call:", debugInfo)

  const txMoveCall = {
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(ptAmount),
      tx.pure.u64(minSyOut),
      pyPosition,
      tx.object(coinConfig.pyStateId),
      priceVoucher,
      tx.object(coinConfig.marketFactoryConfigId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  }

  const result = tx.moveCall(txMoveCall)

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const swapExactYtForSy = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  ytAmount: string,
  pyPosition: TransactionArgument,
  priceVoucher: TransactionArgument,
  minSyOut: string,
  returnDebugInfo?: T,
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::router::swap_exact_yt_for_sy`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "yt_amount", value: ytAmount },
      { name: "min_sy_out", value: minSyOut },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: coinConfig.pyStateId },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
      {
        name: "market_factory_config",
        value: coinConfig.marketFactoryConfigId,
      },
      { name: "market_state", value: coinConfig.marketStateId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  debugLog("swap_exact_yt_for_sy move call:", debugInfo)

  const txMoveCall = {
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(ytAmount),
      tx.pure.u64(minSyOut),
      pyPosition,
      tx.object(coinConfig.pyStateId),
      priceVoucher,
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object(coinConfig.marketFactoryConfigId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  }

  const result = tx.moveCall(txMoveCall)

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const redeemPy = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  ytRedeemValue: string,
  ptRedeemValue: string,
  priceVoucher: TransactionArgument,
  pyPosition: TransactionArgument,
  returnDebugInfo?: T,
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::yield_factory::redeem_py`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "yt_amount", value: ytRedeemValue },
      { name: "pt_amount", value: ptRedeemValue },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: coinConfig.pyStateId },
      { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  const txMoveCall = {
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(
        new Decimal(ytRedeemValue)
          .mul(10 ** Number(coinConfig.decimal))
          .toString(),
      ),
      tx.pure.u64(
        new Decimal(ptRedeemValue)
          .mul(10 ** Number(coinConfig.decimal))
          .toString(),
      ),
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  }

  debugLog("redeem_py move call:", txMoveCall)

  const result = tx.moveCall(txMoveCall)

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const getPrice = (
  tx: Transaction,
  coinConfig: CoinConfig,
  priceVoucher: TransactionArgument,
) => {
  const moveCall = {
    target: `${coinConfig.oracleVoucherPackageId}::oracle_voucher::get_price`,
    arguments: ["priceVoucher"],
    typeArguments: [coinConfig.syCoinType],
  }
  debugLog("get_price move call:", moveCall)

  const [price] = tx.moveCall({
    ...moveCall,
    arguments: [priceVoucher],
  })

  return price
}

export const mergeAllLpPositions = (
  tx: Transaction,
  coinConfig: CoinConfig,
  lpPositions: LpPosition[],
  marketPosition: TransactionArgument,
) => {
  debugLog("mergeAllLpPositions params:", {
    tx,
    coinConfig,
    lpPositions,
    marketPosition,
  })

  if (lpPositions.length === 0) {
    return marketPosition
  }

  const joinMoveCall = {
    target: `${coinConfig.nemoContractId}::market_position::join`,
    arguments: [lpPositions[0].id.id, marketPosition, "0x6"],
    typeArguments: [],
  }
  debugLog("market_position::join move call:", joinMoveCall)

  tx.moveCall({
    ...joinMoveCall,
    arguments: joinMoveCall.arguments.map((arg) => tx.object(arg)),
  })

  for (let i = 1; i < lpPositions.length; i++) {
    const joinMoveCall = {
      target: `${coinConfig.nemoContractId}::market_position::join`,
      arguments: [lpPositions[0].id.id, lpPositions[i].id.id, "0x6"],
      typeArguments: [],
    }
    debugLog("market_position::join move call:", joinMoveCall)

    tx.moveCall({
      ...joinMoveCall,
      arguments: joinMoveCall.arguments.map((arg) => tx.object(arg)),
    })
  }

  return tx.object(lpPositions[0].id.id)
}

export const swapExactSyForPt = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionArgument,
  priceVoucher: TransactionArgument,
  pyPosition: TransactionArgument,
  minPtOut: string,
  approxPtOut: string,
  returnDebugInfo?: T,
): T extends true ? MoveCallInfo : void => {
  const debugInfo: MoveCallInfo = {
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
  }

  debugLog("swap_exact_sy_for_pt move call:", debugInfo)

  const txMoveCall = {
    target: debugInfo.target,
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
    typeArguments: debugInfo.typeArguments,
  }

  tx.moveCall(txMoveCall)

  return (returnDebugInfo ? debugInfo : undefined) as T extends true
    ? MoveCallInfo
    : void
}

export const mergeAllCoins = async (
  tx: Transaction,
  address: string,
  coins: CoinData[],
  coinType: string = "0x2::sui::SUI",
) => {
  debugLog("mergeAllCoins params:", {
    coinType,
    address,
  })

  if (!coins || coins.length === 0) {
    debugLog("No coins to merge or only one coin available")
    throw new Error("No coins to merge or only one coin available")
  }

  if (coins.length === 1) {
    return coins[0].coinObjectId
  }

  // For SUI coins, first split a small amount for gas
  if (coinType === "0x2::sui::SUI") {
    const [mergedCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(
        coins.reduce((total, coin) => total + Number(coin.balance), 0),
      ),
    ])

    tx.transferObjects([mergedCoin], address)

    return coins[0].coinObjectId
  } else {
    // For non-SUI coins, proceed as before
    const primaryCoin = coins[0].coinObjectId
    const otherCoins = coins
      .slice(1)
      .map((coin) => tx.object(coin.coinObjectId))

    tx.mergeCoins(tx.object(primaryCoin), otherCoins)
    return primaryCoin
  }
}
