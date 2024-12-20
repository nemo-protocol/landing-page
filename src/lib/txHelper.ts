import { CoinData } from "@/hooks/useCoinData"
import { LppMarketPosition } from "@/hooks/useLpMarketPositionData"
import { CoinConfig } from "@/queries/types/market"
import { Transaction } from "@mysten/sui/transactions"
import Decimal from "decimal.js"
import { debugLog } from "@/config"

export const getPriceVoucher = (tx: Transaction, coinConfig: CoinConfig) => {
  switch (coinConfig.coinType) {
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": {
      const moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_volo`,
        arguments: [
          coinConfig.nativePool,
          coinConfig.metadataId,
          coinConfig.syStateId,
        ],
        typeArguments: [coinConfig.syCoinType],
      }
      debugLog("get_price_voucher_from_volo move call:", moveCall)
      return tx.moveCall({
        ...moveCall,
        arguments: moveCall.arguments.map((arg) => tx.object(arg)),
      })
    }
    case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI": {
      const moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_spring`,
        arguments: [coinConfig.lstInfoId, coinConfig.syStateId],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      return tx.moveCall({
        ...moveCall,
        arguments: moveCall.arguments.map((arg) => tx.object(arg)),
      })
    }
    default: {
      const moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
        arguments: [
          coinConfig.providerVersion,
          coinConfig.providerMarket,
          coinConfig.syStateId,
          "0x6",
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_x_oracle move call:", moveCall)
      return tx.moveCall({
        ...moveCall,
        arguments: moveCall.arguments.map((arg) => tx.object(arg)),
      })
    }
  }
}

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
  if (pyPosition === undefined) {
    throw new Error("initPyPosition failed")
  }
  return pyPosition
}

export const swapScoin = (
  tx: Transaction,
  coinConfig: CoinConfig,
  coinData: CoinData[],
  swapValue: string,
) => {
  const splitCoin = splitCoinHelper(
    tx,
    coinData,
    new Decimal(swapValue).mul(10 ** coinConfig.decimal).toString(),
    coinConfig.underlyingCoinType,
  )

  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      const SCALLOP_MARKET_OBJECT =
        "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9"
      const SCALLOP_VERSION_OBJECT =
        "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7"

      const mintMoveCall = {
        target: `0x3fc1f14ca1017cff1df9cd053ce1f55251e9df3019d728c7265f028bb87f0f97::mint::mint`,
        arguments: [
          SCALLOP_VERSION_OBJECT,
          SCALLOP_MARKET_OBJECT,
          "splitCoin",
          "0x6",
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      debugLog("scallop mint move call:", mintMoveCall)

      const marketCoin = tx.moveCall({
        ...mintMoveCall,
        arguments: [
          tx.object(SCALLOP_VERSION_OBJECT),
          tx.object(SCALLOP_MARKET_OBJECT),
          splitCoin,
          tx.object("0x6"),
        ],
      })

      const mintSCoinMoveCall = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin`,
        arguments: [coinConfig.sCoinTreasure, "marketCoin"],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      debugLog("mint_s_coin move call:", mintSCoinMoveCall)

      return tx.moveCall({
        ...mintSCoinMoveCall,
        arguments: [tx.object(coinConfig.sCoinTreasure), marketCoin],
      })
    }
    default:
      throw new Error("swapScoin failed")
  }
}

export function splitCoinHelper(
  tx: Transaction,
  coinData: CoinData[],
  targetAmount: string,
  coinType?: string,
) {
  debugLog("splitCoinHelper params:", {
    coinData,
    targetAmount,
    coinType,
  })

  if (!coinType || coinType === "0x2::sui::SUI") {
    const totalBalance = coinData.reduce(
      (sum, coin) => sum.add(coin.balance),
      new Decimal(0),
    )

    if (totalBalance.lt(targetAmount)) {
      throw new Error(coinType + " " + "Insufficient balance")
    }

    return tx.splitCoins(tx.gas, [targetAmount])
  } else {
    const firstCoinBalance = new Decimal(coinData[0].balance)

    if (firstCoinBalance.gt(targetAmount)) {
      return tx.splitCoins(tx.object(coinData[0].coinObjectId), [targetAmount])
    } else if (firstCoinBalance.eq(targetAmount)) {
      return tx.object(coinData[0].coinObjectId)
    }

    let accumulatedBalance = new Decimal(0)
    const coinsToUse: string[] = []

    // 选择需要合并的币
    for (const coin of coinData) {
      accumulatedBalance = accumulatedBalance.add(coin.balance)
      coinsToUse.push(coin.coinObjectId)

      if (accumulatedBalance.gte(targetAmount)) {
        break
      }
    }

    if (accumulatedBalance.lt(targetAmount)) {
      throw new Error(coinType + " " + "insufficient balance")
    }

    const mergedCoin = tx.mergeCoins(coinsToUse[0], coinsToUse.slice(1))

    return tx.splitCoins(mergedCoin, [targetAmount])
  }
}

export const mergeLppMarketPositions = (
  tx: Transaction,
  coinConfig: CoinConfig,
  lppMarketPositionData: LppMarketPosition[],
  lpValue: string,
  decimal: number,
) => {
  debugLog("mergeLppMarketPositions params:", {
    lppMarketPositionData,
    lpValue,
    decimal,
  })

  const sortedPositions = [...lppMarketPositionData].sort(
    (a, b) => Number(b.lp_amount) - Number(a.lp_amount),
  )

  let accumulatedAmount = new Decimal(0)
  const positionsToMerge: LppMarketPosition[] = []
  const targetAmount = new Decimal(lpValue).mul(10 ** decimal)

  for (const position of sortedPositions) {
    accumulatedAmount = accumulatedAmount.add(position.lp_amount)
    positionsToMerge.push(position)

    if (accumulatedAmount.gte(targetAmount)) {
      break
    }
  }

  if (accumulatedAmount.lt(targetAmount)) {
    throw new Error("Insufficient LP amount")
  }

  const mergedPosition = tx.object(positionsToMerge[0].id.id)

  if (positionsToMerge.length === 1) {
    return mergedPosition
  }

  for (let i = 1; i < positionsToMerge.length; i++) {
    const joinMoveCall = {
      target: `${coinConfig.nemoContractId}::market_position::join`,
      arguments: [positionsToMerge[0].id.id, positionsToMerge[i].id.id],
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
  splitCoin: ReturnType<typeof splitCoinHelper>,
  syCoinAmount: string,
  coinType: string,
) {
  const depositMoveCall = {
    target: `${coinConfig.nemoContractId}::sy::deposit`,
    arguments: [
      coinConfig.version,
      "splitCoin",
      syCoinAmount,
      coinConfig.syStateId,
    ],
    typeArguments: [coinType, coinConfig.syCoinType],
  }
  debugLog("sy::deposit move call:", depositMoveCall)

  const [syCoin] = tx.moveCall({
    ...depositMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      splitCoin,
      tx.pure.u64(syCoinAmount),
      tx.object(coinConfig.syStateId),
    ],
  })

  return syCoin
}
