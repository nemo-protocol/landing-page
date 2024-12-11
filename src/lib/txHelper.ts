import { CoinData } from "@/hooks/useCoinData"
import { CoinConfig } from "@/queries/types/market"
import { Transaction } from "@mysten/sui/transactions"
import Decimal from "decimal.js"

export const getPriceVoucher = (tx: Transaction, coinConfig: CoinConfig) => {
  switch (coinConfig.coinType) {
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
      return tx.moveCall({
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_volo`,
        arguments: [
          tx.object(coinConfig.nativePool),
          tx.object(coinConfig.metadataId),
          tx.object(coinConfig.syStateId),
        ],
        typeArguments: [coinConfig.syCoinType],
      })
    case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI":
      return tx.moveCall({
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_spring`,
        arguments: [
          tx.object(coinConfig.lstInfoId),
          tx.object(coinConfig.syStateId),
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      })
    default:
      return tx.moveCall({
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
        arguments: [
          tx.object(coinConfig.providerVersion),
          tx.object(coinConfig.providerMarket),
          tx.object(coinConfig.syStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      })
  }
}

export const initPyPosition = (tx: Transaction, coinConfig: CoinConfig) => {
  const [pyPosition] = tx.moveCall({
    target: `${coinConfig.nemoContractId}::py::init_py_position`,
    arguments: [
      tx.object(coinConfig.version),
      tx.object(coinConfig.pyStateId),
      tx.object("0x6"),
    ],
    typeArguments: [coinConfig.syCoinType],
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
      const marketCoin = tx.moveCall({
        target: `0xa45b8ffca59e5b44ec7c04481a04cb620b0e07b2b183527bca4e5f32372c5f1a::mint::mint`,
        arguments: [
          tx.object(SCALLOP_VERSION_OBJECT),
          tx.object(SCALLOP_MARKET_OBJECT),
          splitCoin,
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      })
      return tx.moveCall({
        target: `80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin`,
        arguments: [tx.object(coinConfig.sCoinTreasure), marketCoin],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      })
    }
    // case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
    //   return tx.moveCall({
    //     target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_volo`,
    //     arguments: [
    //       tx.object(coinConfig.nativePool),
    //       tx.object(coinConfig.metadataId),
    //       tx.object(coinConfig.syStateId),
    //     ],
    //     typeArguments: [coinConfig.syCoinType],
    //   })
    // case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI":
    //   return tx.moveCall({
    //     target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_spring`,
    //     arguments: [
    //       tx.object(coinConfig.lstInfoId),
    //       tx.object(coinConfig.syStateId),
    //     ],
    //     typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
    //   })
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
