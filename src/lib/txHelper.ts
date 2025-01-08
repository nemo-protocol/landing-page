import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/hooks/useCoinData"
import { CoinConfig, CoinInfo } from "@/queries/types/market"
import { LPMarketPosition } from "@/hooks/types"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"

interface MoveCallArgument {
  name: string
  value: string
}

interface MoveCallInfo {
  target: string
  arguments: MoveCallArgument[]
  typeArguments: string[]
}

export const getPriceVoucher = (
  tx: Transaction,
  coinConfig: CoinConfig,
): [TransactionArgument, MoveCallInfo] => {
  let moveCall: MoveCallInfo
  switch (coinConfig.coinType) {
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": {
      moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_volo`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          { name: "native_pool", value: coinConfig.nativePool },
          { name: "metadata", value: coinConfig.metadataId },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType],
      }
      debugLog("get_price_voucher_from_volo move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI": {
      moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_spring`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          { name: "lst_info", value: coinConfig.lstInfoId },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI": {
      moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_aftermath`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          { name: "aftermath_safe", value: coinConfig.aftermathSafeId },
          {
            name: "aftermath_staked_sui_vault",
            value: coinConfig.aftermathStakedSuiVaultId,
          },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })

      return [priceVoucher, moveCall]
    }
    case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI": {
      moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_haSui`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          { name: "haedal_staking", value: coinConfig.haedalStakeingId },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    default: {
      moveCall = {
        target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          { name: "provider_version", value: coinConfig.providerVersion },
          { name: "provider_market", value: coinConfig.providerMarket },
          { name: "sy_state", value: coinConfig.syStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      // debugLog("get_price_voucher_from_x_oracle move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
  }
}

export const getPriceVoucherWithCoinInfo = (
  tx: Transaction,
  coinInfo: CoinInfo,
): [TransactionArgument, MoveCallInfo] => {
  let moveCall: MoveCallInfo
  switch (coinInfo.coinAddress) {
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": {
      moveCall = {
        target: `${coinInfo.nemoContractId}::oracle::get_price_voucher_from_volo`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinInfo.priceOracleConfigId,
          },
          { name: "native_pool", value: coinInfo.nativePool },
          { name: "metadata", value: coinInfo.metadataId },
          { name: "sy_state", value: coinInfo.syState },
        ],
        typeArguments: [coinInfo.syCoinType],
      }
      debugLog("get_price_voucher_from_volo move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI": {
      moveCall = {
        target: `${coinInfo.nemoContractId}::oracle::get_price_voucher_from_spring`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinInfo.priceOracleConfigId,
          },
          { name: "lst_info", value: coinInfo.lstInfoId },
          { name: "sy_state", value: coinInfo.syState },
        ],
        typeArguments: [coinInfo.syCoinType, coinInfo.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI": {
      moveCall = {
        target: `${coinInfo.nemoContractId}::oracle::get_price_voucher_from_aftermath`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinInfo.priceOracleConfigId,
          },
          { name: "aftermath_safe", value: coinInfo.aftermathSafeId },
          {
            name: "aftermath_staked_sui_vault",
            value: coinInfo.aftermathStakedSuiVaultId,
          },
          { name: "sy_state", value: coinInfo.syState },
        ],
        typeArguments: [coinInfo.syCoinType, coinInfo.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })

      return [priceVoucher, moveCall]
    }
    case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI": {
      moveCall = {
        target: `${coinInfo.nemoContractId}::oracle::get_price_voucher_from_haSui`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinInfo.priceOracleConfigId,
          },
          { name: "haedal_staking", value: coinInfo.haedalStakeingId },
          { name: "sy_state", value: coinInfo.syState },
        ],
        typeArguments: [coinInfo.syCoinType, coinInfo.underlyingCoinType],
      }
      debugLog("get_price_voucher_from_spring move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
    }
    default: {
      moveCall = {
        target: `${coinInfo.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinInfo.priceOracleConfigId,
          },
          { name: "provider_version", value: coinInfo.providerVersion },
          { name: "provider_market", value: coinInfo.providerMarket },
          { name: "sy_state", value: coinInfo.syState },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinInfo.syCoinType, coinInfo.underlyingCoinType],
      }
      // debugLog("get_price_voucher_from_x_oracle move call:", moveCall)
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return [priceVoucher, moveCall]
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

  return pyPosition
}

export const mintSCoin = (
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

export const burnSCoin = (
  tx: Transaction,
  coinConfig: CoinConfig,
  sCoin: TransactionArgument,
) => {
  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      // 1. First call burn_s_coin to get marketCoin
      const burnSCoinMoveCall = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::burn_s_coin`,
        arguments: [coinConfig.sCoinTreasure, sCoin],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      debugLog(`burn_s_coin move call:`, burnSCoinMoveCall)

      const marketCoin = tx.moveCall({
        ...burnSCoinMoveCall,
        arguments: [tx.object(coinConfig.sCoinTreasure), sCoin],
      })

      // return marketCoin

      // 2. Then call redeem to get underlying coin
      const SCALLOP_MARKET_OBJECT =
        "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9"
      const SCALLOP_VERSION_OBJECT =
        "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7"

      const redeemMoveCall = {
        target: `0x3fc1f14ca1017cff1df9cd053ce1f55251e9df3019d728c7265f028bb87f0f97::redeem::redeem`,
        arguments: [
          SCALLOP_VERSION_OBJECT,
          SCALLOP_MARKET_OBJECT,
          marketCoin,
          "0x6",
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      debugLog(`scallop redeem move call:`, redeemMoveCall)

      const [underlyingCoin] = tx.moveCall({
        ...redeemMoveCall,
        arguments: [
          tx.object(SCALLOP_VERSION_OBJECT),
          tx.object(SCALLOP_MARKET_OBJECT),
          marketCoin,
          tx.object("0x6"),
        ],
      })

      return underlyingCoin
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
  lpPositions: LPMarketPosition[],
  lpValue: string,
  decimal: number,
) => {
  debugLog("mergeLppMarketPositions params:", {
    lpPositions,
    lpValue,
    decimal,
  })

  const sortedPositions = [...lpPositions].sort(
    (a, b) => Number(b.lp_amount) - Number(a.lp_amount),
  )

  let accumulatedAmount = new Decimal(0)
  const positionsToMerge: LPMarketPosition[] = []
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
      pyCoin,
      priceVoucher,
      pyPosition,
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
  lpValue: string,
  pyPosition: TransactionArgument,
  mergedPositionId: TransactionArgument,
  decimal: number,
) => {
  const burnLpMoveCall = {
    target: `${coinConfig.nemoContractId}::market::burn_lp`,
    arguments: [
      coinConfig.version,
      new Decimal(lpValue).mul(10 ** decimal).toFixed(0),
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
      tx.pure.u64(new Decimal(lpValue).mul(10 ** decimal).toFixed(0)),
      pyPosition,
      tx.object(coinConfig.marketStateId),
      mergedPositionId,
      tx.object("0x6"),
    ],
  })

  return syCoin
}

export const swapExactPtForSy = (
  tx: Transaction,
  coinConfig: CoinConfig,
  redeemValue: string,
  pyPosition: TransactionArgument,
  priceVoucher: TransactionArgument,
) => {
  const [syCoin] = tx.moveCall({
    target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(
        new Decimal(redeemValue).mul(10 ** coinConfig.decimal).toFixed(0),
      ),
      pyPosition,
      tx.object(coinConfig.pyStateId),
      priceVoucher,
      tx.object(coinConfig.marketFactoryConfigId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: [coinConfig.syCoinType],
  })
  console.log("redeemValue", redeemValue)
  return syCoin
}

export const swapExactYtForSy = (
  tx: Transaction,
  coinConfig: CoinConfig,
  redeemValue: string,
  pyPosition: TransactionArgument,
  priceVoucher: TransactionArgument,
) => {
  const [syCoin] = tx.moveCall({
    target: `${coinConfig.nemoContractId}::router::swap_exact_yt_for_sy`,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(
        new Decimal(redeemValue).mul(10 ** coinConfig.decimal).toFixed(0),
      ),
      pyPosition,
      tx.object(coinConfig.pyStateId),
      priceVoucher,
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object(coinConfig.marketFactoryConfigId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: [coinConfig.syCoinType],
  })
  return syCoin
}

export const redeemPy = (
  tx: Transaction,
  coinConfig: CoinConfig,
  ytRedeemValue: string,
  ptRedeemValue: string,
  priceVoucher: TransactionArgument,
  pyPosition: TransactionArgument,
) => {
  const moveCall = {
    target: `${coinConfig.nemoContractId}::yield_factory::redeem_py`,
    arguments: [
      coinConfig.version,
      new Decimal(ytRedeemValue).mul(10 ** coinConfig.decimal).toString(),
      new Decimal(ptRedeemValue).mul(10 ** coinConfig.decimal).toString(),
      "priceVoucher",
      "pyPosition",
      coinConfig.pyStateId,
      coinConfig.yieldFactoryConfigId,
      "0x6",
    ],
    typeArguments: [coinConfig.syCoinType],
  }
  debugLog("redeem_py move call:", {
    moveCall,
    ytRedeemValue,
    ptRedeemValue,
    decimal: coinConfig.decimal,
    ytAmount: new Decimal(ytRedeemValue)
      .mul(10 ** coinConfig.decimal)
      .toString(),
    ptAmount: new Decimal(ptRedeemValue)
      .mul(10 ** coinConfig.decimal)
      .toString(),
  })

  const [sy] = tx.moveCall({
    target: moveCall.target,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(
        new Decimal(ytRedeemValue).mul(10 ** coinConfig.decimal).toString(),
      ),
      tx.pure.u64(
        new Decimal(ptRedeemValue).mul(10 ** coinConfig.decimal).toString(),
      ),
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
    typeArguments: moveCall.typeArguments,
  })
  return sy
}

export const getPrice = (
  tx: Transaction,
  coinConfig: CoinConfig,
  priceVoucher: TransactionArgument,
) => {
  const moveCall = {
    target: `${coinConfig.nemoContractId}::oracle::get_price`,
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
  lpPositions: LPMarketPosition[],
  marketPosition: TransactionArgument,
) => {
  debugLog("mergeAllLpPositions params:", {
    lpPositions,
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
