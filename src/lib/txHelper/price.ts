import { debugLog } from "@/config"
import { MoveCallInfo } from "@/hooks/types"
import { BaseCoinInfo } from "@/queries/types/market"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import {
  VOLO,
  SSBUCK,
  HAEDAL,
  ALPAHFI,
  AFTERMATH,
  SPRING_SUI,
  SUPER_SUI,
  WWAL,
} from "../constants"

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
    case "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::haedal::get_haWAL_price_voucher`,
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
            name: "staking",
            value: "0x9e5f6537be1a5b658ec7eed23160df0b28c799563f6c41e9becc9ad633cb592b",
          },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [
          coinConfig.syCoinType,
          coinConfig.coinType,
        ],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_haWAL_price_voucher move call:`,
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
    case "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::haedal::get_price_voucher_from_cetus_vault`,
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
            name: "staking",
            value: HAEDAL.HAEDAL_STAKING_ID,
          },
          {
            name: "vault",
            value:
              "0xde97452e63505df696440f86f0b805263d8659b77b8c316739106009d514c270",
          },
          {
            name: "pool",
            value:
              "0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc",
          },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [
          coinConfig.syCoinType,
          coinConfig.yieldTokenType, // Use underlyingCoinType as YieldToken
          coinConfig.coinType,
        ],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_cetus_vault move call:`,
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
    case "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI": {
      moveCall = {
        target: `0x83949cdb90510f02ed3aee7a686cd0b1390de073afcadad9aa41d3016eb13463::aftermath::get_meta_coin_price_voucher`,
        arguments: [
          {
            name: "price_oracle_config",
            value: coinConfig.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: coinConfig.oracleTicket,
          },
          { name: "registry", value: SUPER_SUI.REGISTRY },
          { name: "vault", value: SUPER_SUI.VAULT },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_meta_coin_price_voucher move call:`,
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
    case "0xb1b0650a8862e30e3f604fd6c5838bc25464b8d3d827fbd58af7cb9685b832bf::wwal::WWAL": {
      moveCall = {
        target: `${coinConfig.oraclePackageId}::haedal::get_price_voucher_from_blizzard`,
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
            name: "blizzard_staking",
            value: WWAL.BLIZZARD_STAKING,
          },
          {
            name: "walrus_staking",
            value: WWAL.WALRUS_STAKING,
          },
          { name: "sy_state", value: coinConfig.syStateId },
        ],
        typeArguments: [coinConfig.syCoinType, coinConfig.coinType],
      }
      if (!returnDebugInfo) {
        debugLog(
          `[${caller}] get_price_voucher_from_blizzard move call:`,
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
