import { CoinConfig } from "@/queries/types/market"
import { Transaction } from "@mysten/sui/transactions"

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
