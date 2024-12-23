import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/hooks/useCoinData"
import { CoinConfig } from "@/queries/types/market"
import { LppMarketPosition } from "@/hooks/useLpMarketPositionData"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"

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

export const mintSycoin = (
  tx: Transaction,
  coinConfig: CoinConfig,
  coinData: CoinData[],
  amounts: string[],
) => {
  const splitCoins = splitCoinHelper(
    tx,
    coinData,
    amounts,
    coinConfig.underlyingCoinType,
  )

  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      const SCALLOP_MARKET_OBJECT =
        "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9"
      const SCALLOP_VERSION_OBJECT =
        "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7"

      const results = []

      for (let i = 0; i < amounts.length; i++) {
        const mintMoveCall = {
          target: `0x3fc1f14ca1017cff1df9cd053ce1f55251e9df3019d728c7265f028bb87f0f97::mint::mint`,
          arguments: [
            SCALLOP_VERSION_OBJECT,
            SCALLOP_MARKET_OBJECT,
            amounts[i],
            "0x6",
          ],
          typeArguments: [coinConfig.underlyingCoinType],
        }
        debugLog(`scallop mint move call ${i}:`, mintMoveCall)

        const marketCoin = tx.moveCall({
          ...mintMoveCall,
          arguments: [
            tx.object(SCALLOP_VERSION_OBJECT),
            tx.object(SCALLOP_MARKET_OBJECT),
            splitCoins[i],
            tx.object("0x6"),
          ],
        })

        const mintSCoinMoveCall = {
          target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin`,
          arguments: [coinConfig.sCoinTreasure, "marketCoin"],
          typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
        }
        debugLog(`mint_s_coin move call ${i}:`, mintSCoinMoveCall)

        const result = tx.moveCall({
          ...mintSCoinMoveCall,
          arguments: [tx.object(coinConfig.sCoinTreasure), marketCoin],
        })

        results.push(result)
      }

      return results
    }
    default:
      throw new Error(
        "Unsupported underlying protocol: " + coinConfig.underlyingProtocol,
      )
  }
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

  if (!coinType || coinType === "0x2::sui::SUI") {
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

    const accumulatedBalance = new Decimal(0)
    const coinsToUse: string[] = []

    for (const coin of coinData) {
      accumulatedBalance.add(coin.balance)
      coinsToUse.push(coin.coinObjectId)

      if (accumulatedBalance.gte(totalTargetAmount)) {
        break
      }
    }

    if (accumulatedBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "insufficient balance")
    }

    const mergedCoin = tx.mergeCoins(
      tx.object(coinsToUse[0]),
      coinsToUse.slice(1).map((id) => tx.object(id)),
    )
    return tx.splitCoins(mergedCoin, amounts)
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
  splitCoin: TransactionArgument,
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
      tx.pure.u64(0),
      tx.object(coinConfig.syStateId),
    ],
  })

  return syCoin
}

export const mintPy = (
  tx: Transaction,
  coinConfig: CoinConfig,
  pyCoin: TransactionArgument,
  priceVoucher: TransactionArgument,
  pyPosition: TransactionArgument,
) => {
  const mintPyMoveCall = {
    target: `${coinConfig.nemoContractId}::yield_factory::mint_py`,
    arguments: [
      coinConfig.version,
      "pyCoin",
      "priceVoucher",
      "pyPosition",
      coinConfig.pyStateId,
      coinConfig.yieldFactoryConfigId,
      "0x6",
    ],
    typeArguments: [coinConfig.syCoinType],
  }
  debugLog("mint_py move call:", mintPyMoveCall)

  return tx.moveCall({
    ...mintPyMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      pyCoin,
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
  })
}

export const redeemSyCoin = (
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionArgument,
  amount: string,
  slippage: string,
) => {
  const minAmount = new Decimal(amount)
    .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
    .toFixed(0)

  const redeemMoveCall = {
    target: `${coinConfig.nemoContractId}::sy::redeem`,
    arguments: [
      coinConfig.version,
      "syCoin",
      minAmount,
      coinConfig.syStateId,
    ],
    typeArguments: [coinConfig.coinType, coinConfig.syCoinType],
  }
  debugLog("sy::redeem move call:", redeemMoveCall)

  const [yieldToken] = tx.moveCall({
    ...redeemMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      tx.pure.u64(minAmount),
      tx.object(coinConfig.syStateId),
    ],
  })

  return yieldToken
}
