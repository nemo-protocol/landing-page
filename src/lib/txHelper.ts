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
  swapValue: string,
) => {
  const [sui] = tx.splitCoins(tx.gas, [
    new Decimal(swapValue).mul(10 ** coinConfig.decimal).toString(),
  ])
  switch (coinConfig.coinType) {
    case "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI": {
      const SCALLOP_MARKET_OBJECT =
        "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9"
      const SCALLOP_VERSION_OBJECT =
        "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7"
      return tx.moveCall({
        target: `0xa45b8ffca59e5b44ec7c04481a04cb620b0e07b2b183527bca4e5f32372c5f1a::mint::mint`,
        arguments: [
          tx.object(SCALLOP_VERSION_OBJECT),
          tx.object(SCALLOP_MARKET_OBJECT),
          sui,
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.coinType],
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
