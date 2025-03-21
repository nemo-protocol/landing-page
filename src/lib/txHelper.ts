import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { MoveCallInfo } from "@/hooks/types"
import { LpPosition } from "@/hooks/types"
import { CoinData } from "@/hooks/useCoinData"
import { BaseCoinInfo, CoinConfig } from "@/queries/types/market"
import {
  SCALLOP,
  AFTERMATH,
  VALIDATORS,
  getTreasury,
  SSBUCK,
  ALPAHFI,
  SPRING_SUI,
  HAEDAL,
  VOLO,
} from "./constants"
import {
  Transaction,
  TransactionResult,
  TransactionArgument,
} from "@mysten/sui/transactions"

// FIXME: catch error and return moveCall
export const getPriceVoucher = <T extends boolean = true>(
  tx: Transaction,
  coinConfig: BaseCoinInfo,
  caller: string = "default",
  returnDebugInfo: T = true as T,
): T extends true
  ? [TransactionArgument, MoveCallInfo]
  : TransactionArgument => {
  let moveCall: MoveCallInfo
  switch (coinConfig.coinType) {
    case "0xd01d27939064d79e4ae1179cd11cfeeff23943f32b1a842ea1a1e15a0045d77d::st_sbuck::ST_SBUCK": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::buck::get_price_voucher_from_ssbuck`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          {
            name: "vault",
            value: SSBUCK.VAULT,
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_ssbuck move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::volo::get_price_voucher_from_volo`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          { name: "native_pool", value: VOLO.NATIVE_POOL },
          { name: "metadata", value: VOLO.METADATA },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType],
      }
      if (!returnDebugInfo) {
        debugLog(`[${caller}] get_price_voucher_from_volo move call:`, moveCall)
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    case "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::spring::get_price_voucher_from_spring`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          { name: "lst_info", value: SPRING_SUI.LIQUID_STAKING_INFO },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_spring move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::aftermath::get_price_voucher_from_aftermath`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          {
            name: "aftermath_staked_sui_vault",
            value: AFTERMATH.STAKED_SUI_VAULT,
          },
          { name: "aftermath_safe", value: AFTERMATH.SAFE },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_spring move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::haedal::get_price_voucher_from_haSui`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          { name: "haedal_staking", value: HAEDAL.HAEDAL_STAKING_ID },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_spring move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    case "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::alphafi::get_price_voucher_from_spring`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          {
            name: "lst_info",
            value: ALPAHFI.LIQUID_STAKING_INFO,
          },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_spring move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
    }
    default: {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::scallop::get_price_voucher_from_x_oracle`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          { name: "provider_version", value: coinConfig.providerVersion },
          { name: "provider_market", value: coinConfig.providerMarket },
          { name: "sy_state", value: coinConfig.syStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_x_oracle move call:`,
          moveCall,
        )
      }
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      })
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionArgument, MoveCallInfo]
        : TransactionArgument
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

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument[], MoveCallInfo[]]
  : TransactionArgument[]

export const mintSCoin = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  coinData: CoinData[],
  amounts: string[],
  debug: T = false as T,
): MintSCoinResult<T> => {
  const splitCoins = splitCoinHelper(
    tx,
    coinData,
    amounts,
    coinConfig.underlyingCoinType,
  )

  let moveCall: MoveCallInfo
  const moveCallInfos: MoveCallInfo[] = []

  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      const treasury = getTreasury(coinConfig.coinType)
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        const moveCall = {
          target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::mint::mint`,
          arguments: [
            { name: "version", value: SCALLOP.VERSION_OBJECT },
            { name: "market", value: SCALLOP.MARKET_OBJECT },
            { name: "amount", value: amounts[i] },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.underlyingCoinType],
        }
        moveCallInfos.push(moveCall)
        debugLog(`scallop mint move call for amount ${i}:`, moveCall)

        const [marketCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(SCALLOP.VERSION_OBJECT),
            tx.object(SCALLOP.MARKET_OBJECT),
            splitCoins[i],
            tx.object("0x6"),
          ],
          typeArguments: moveCall.typeArguments,
        })

        const mintSCoinMoveCall: MoveCallInfo = {
          target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin`,
          arguments: [
            { name: "treasury", value: treasury },
            { name: "market_coin", value: "marketCoin" },
          ],
          typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
        }
        moveCallInfos.push(mintSCoinMoveCall)
        debugLog(`mint_s_coin move call for amount ${i}:`, mintSCoinMoveCall)

        const [sCoin] = tx.moveCall({
          ...mintSCoinMoveCall,
          arguments: [tx.object(treasury), marketCoin],
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "Strater": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        const fromBalanceMoveCall = {
          target: `0x2::coin::into_balance`,
          arguments: [{ name: "balance", value: amounts[i] }],
          typeArguments: [coinConfig.underlyingCoinType],
        }
        moveCallInfos.push(fromBalanceMoveCall)
        debugLog(`coin::from_balance move call:`, fromBalanceMoveCall)

        const [sBalance] = tx.moveCall({
          target: fromBalanceMoveCall.target,
          arguments: [splitCoins[i]],
          typeArguments: fromBalanceMoveCall.typeArguments,
        })

        const moveCall = {
          target: `0x75fe358d87679b30befc498a8dae1d28ca9eed159ab6f2129a654a8255e5610e::sbuck_saving_vault::deposit`,
          arguments: [
            {
              name: "bucket_vault",
              value:
                "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
            },
            {
              name: "balance",
              value: amounts[i],
            },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [],
        }
        moveCallInfos.push(moveCall)
        debugLog(`bucket buck_to_sbuck move call:`, moveCall)

        const [sbsBalance] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
            ),
            sBalance,
            tx.object("0x6"),
          ],
          typeArguments: moveCall.typeArguments,
        })
        const [sbsCoin] = tx.moveCall({
          target: `0x2::coin::from_balance`,
          arguments: [sbsBalance],
          typeArguments: [coinConfig.coinType],
        })
        sCoins.push(sbsCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "Aftermath": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        moveCall = {
          target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_stake`,
          arguments: [
            { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
            { name: "safe", value: AFTERMATH.SAFE },
            { name: "system_state", value: AFTERMATH.SYSTEM_STATE },
            { name: "referral_vault", value: AFTERMATH.REFERRAL_VAULT },
            { name: "coin", value: amounts[i] },
            { name: "validator", value: VALIDATORS.MYSTEN_2 },
          ],
          typeArguments: [],
        }
        moveCallInfos.push(moveCall)
        debugLog(`aftermath request_stake move call:`, moveCall)

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(AFTERMATH.STAKED_SUI_VAULT),
            tx.object(AFTERMATH.SAFE),
            tx.object(AFTERMATH.SYSTEM_STATE),
            tx.object(AFTERMATH.REFERRAL_VAULT),
            splitCoins[i],
            tx.pure.address(VALIDATORS.MYSTEN_2),
          ],
          typeArguments: moveCall.typeArguments,
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "SpringSui": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        moveCall = {
          target: `0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::mint`,
          arguments: [
            {
              name: "liquid_staking_info",
              value:
                "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
            },
            { name: "sui_system_state", value: "0x5" },
            { name: "coin", value: amounts[i] },
          ],
          typeArguments: [coinConfig.coinType],
        }
        moveCallInfos.push(moveCall)
        debugLog(`spring_sui mint move call:`, moveCall)

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
            ),
            tx.object("0x5"),
            splitCoins[i],
          ],
          typeArguments: moveCall.typeArguments,
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "Volo": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        const moveCall = {
          target: `0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::native_pool::stake_non_entry`,
          arguments: [
            {
              name: "native_pool",
              value: VOLO.NATIVE_POOL,
            },
            {
              name: "metadata",
              value: VOLO.METADATA,
            },
            { name: "sui_system_state", value: "0x5" },
            { name: "coin", value: amounts[i] },
          ],
          typeArguments: [],
        }
        moveCallInfos.push(moveCall)
        debugLog(`volo stake move call:`, moveCall)

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(VOLO.NATIVE_POOL),
            tx.object(VOLO.METADATA),
            tx.object("0x5"),
            splitCoins[i],
          ],
          typeArguments: moveCall.typeArguments,
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "Haedal": {
      if (
        amounts
          .reduce((acc, curr) => acc.add(curr), new Decimal(0))
          .lt(new Decimal(2.97).mul(10 ** 9))
      ) {
        throw new Error("Please invest at least 3 SUI")
      }
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        const moveCall = {
          target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_stake_coin`,
          arguments: [
            { name: "sui_system_state", value: "0x5" },

            {
              name: "staking",
              value:
                "0x47b224762220393057ebf4f70501b6e657c3e56684737568439a04f80849b2ca",
            },
            { name: "coin", value: amounts[i] },
            {
              name: "address",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          ],
          typeArguments: [],
        }
        moveCallInfos.push(moveCall)
        debugLog(`Haedal stake move call:`, moveCall)

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000005",
            ),
            tx.object(
              "0x47b224762220393057ebf4f70501b6e657c3e56684737568439a04f80849b2ca",
            ),
            splitCoins[i],
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ),
          ],
          typeArguments: moveCall.typeArguments,
        })
        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "AlphaFi": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
        moveCall = {
          target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::mint`,
          arguments: [
            {
              name: "liquid_staking_info",
              value: ALPAHFI.LIQUID_STAKING_INFO,
            },
            { name: "sui_system_state", value: "0x5" },
            { name: "coin", value: amounts[i] },
          ],
          typeArguments: [coinConfig.coinType],
        }
        moveCallInfos.push(moveCall)
        debugLog(`alphaFi mint move call:`, moveCall)

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(ALPAHFI.LIQUID_STAKING_INFO),
            tx.object("0x5"),
            splitCoins[i],
          ],
          typeArguments: moveCall.typeArguments,
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
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
      const treasury = getTreasury(coinConfig.coinType)

      const burnSCoinMoveCall = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::burn_s_coin`,
        arguments: [treasury, sCoin],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      debugLog(`burn_s_coin move call:`, burnSCoinMoveCall)

      const marketCoin = tx.moveCall({
        ...burnSCoinMoveCall,
        arguments: [tx.object(treasury), sCoin],
      })

      const redeemMoveCall = {
        target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::redeem::redeem`,
        arguments: [
          SCALLOP.VERSION_OBJECT,
          SCALLOP.MARKET_OBJECT,
          marketCoin,
          "0x6",
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      debugLog(`scallop redeem move call:`, redeemMoveCall)

      const [underlyingCoin] = tx.moveCall({
        ...redeemMoveCall,
        arguments: [
          tx.object(SCALLOP.VERSION_OBJECT),
          tx.object(SCALLOP.MARKET_OBJECT),
          marketCoin,
          tx.object("0x6"),
        ],
      })

      return underlyingCoin
    }
    case "AlphaFi": {
      const redeemMoveCall = {
        target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::redeem`,
        arguments: [ALPAHFI.LIQUID_STAKING_INFO, sCoin, "0x5"],
        typeArguments: [coinConfig.coinType],
      }
      debugLog(`alphaFi redeem move call:`, redeemMoveCall)

      const [underlyingCoin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [
          tx.object(ALPAHFI.LIQUID_STAKING_INFO),
          sCoin,
          tx.object("0x5"),
        ],
        typeArguments: redeemMoveCall.typeArguments,
      })

      return underlyingCoin
    }
    case "Aftermath": {
      const burnMoveCall = {
        target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_unstake`,
        arguments: [
          { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
          { name: "safe", value: AFTERMATH.SAFE },
          { name: "s_coin", value: sCoin },
        ],
        typeArguments: [],
      }
      debugLog(`aftermath request_unstake move call:`, burnMoveCall)

      const [underlyingCoin] = tx.moveCall({
        target: burnMoveCall.target,
        arguments: [
          tx.object(AFTERMATH.STAKED_SUI_VAULT),
          tx.object(AFTERMATH.SAFE),
          sCoin,
        ],
        typeArguments: burnMoveCall.typeArguments,
      })

      return underlyingCoin
    }
    default:
      console.error(
        "Unsupported underlying protocol: " + coinConfig.underlyingProtocol,
      )
      return sCoin
    // throw new Error(
    //   "Unsupported underlying protocol: " + coinConfig.underlyingProtocol,
    // )
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
  lpPositions: LpPosition[],
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
  const positionsToMerge: LpPosition[] = []
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

export const swapExactYtForSy = (
  tx: Transaction,
  coinConfig: CoinConfig,
  redeemValue: string,
  pyPosition: TransactionArgument,
  priceVoucher: TransactionArgument,
  minSyOut: string,
) => {
  console.log("minSyOut", minSyOut)
  const [syCoin] = tx.moveCall({
    target: `${coinConfig.nemoContractId}::router::swap_exact_yt_for_sy`,
    arguments: [
      tx.object(coinConfig.version),
      tx.pure.u64(
        new Decimal(redeemValue)
          .mul(10 ** Number(coinConfig.decimal))
          .toFixed(0),
      ),
      tx.pure.u64(minSyOut),
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
