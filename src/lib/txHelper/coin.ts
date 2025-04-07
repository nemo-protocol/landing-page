import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/types"
import { MoveCallInfo } from "@/hooks/types"
import { splitCoinHelper } from "../txHelper"
import { CoinConfig } from "@/queries/types/market"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import {
  VOLO,
  HAEDAL,
  ALPAHFI,
  SCALLOP,
  AFTERMATH,
  VALIDATORS,
  getTreasury,
} from "../constants"

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument, MoveCallInfo[]]
  : TransactionArgument

type MintSCoinParams<T extends boolean = false> = {
  tx: Transaction
  coinConfig: CoinConfig
  coinData: CoinData[]
  amount: string
  debug?: T
}

type MintMultiSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument[], MoveCallInfo[]]
  : TransactionArgument[]

type MintMultiSCoinParams<T extends boolean = false> = {
  amount: string
  tx: Transaction
  coinData: CoinData[]
  coinConfig: CoinConfig
  splitAmounts: string[]
  debug?: T
}

export const mintMultiSCoin = <T extends boolean = false>({
  tx,
  amount,
  coinData,
  coinConfig,
  splitAmounts,
  debug = false as T,
}: MintMultiSCoinParams<T>): MintMultiSCoinResult<T> => {
  console.log("mintMultiSCoin splitAmounts", splitAmounts)

  const mintResult = mintSCoin({
    tx,
    debug,
    amount,
    coinData,
    coinConfig,
  })

  const [sCoin, moveCallInfos] = debug
    ? (mintResult as [TransactionArgument, MoveCallInfo[]])
    : [mintResult as TransactionArgument, [] as MoveCallInfo[]]

  if (!debug) {
    debugLog(`mintSCoin move call:`, moveCallInfos)
  }

  if (splitAmounts.length === 1) {
    return (debug
      ? [[sCoin], moveCallInfos]
      : [sCoin]) as unknown as MintMultiSCoinResult<T>
  }

  const splitMoveCallInfo: MoveCallInfo = {
    target: `0x2::coin::split`,
    arguments: [
      { name: "self", value: "sCoin" },
      { name: "amounts", value: JSON.stringify(splitAmounts) },
    ],
    typeArguments: [coinConfig.coinType],
  }
  moveCallInfos.push(splitMoveCallInfo)

  if (!debug) {
    debugLog(`coin::split move call:`, splitMoveCallInfo)
  }

  const coins = tx.splitCoins(sCoin, splitAmounts)

  console.log("mintMultiSCoin coins length:", coins.length)

  return (debug
    ? [coins, moveCallInfos]
    : coins) as unknown as MintMultiSCoinResult<T>
}

export const mintSCoin = <T extends boolean = false>({
  tx,
  amount,
  coinData,
  coinConfig,
  debug = false as T,
}: MintSCoinParams<T>): MintSCoinResult<T> => {
  let moveCall: MoveCallInfo
  const moveCallInfos: MoveCallInfo[] = []

  // 使用splitCoin从coinData获取coin
  const [coin] = splitCoinHelper(
    tx,
    coinData,
    [amount],
    coinConfig.underlyingCoinType,
  )

  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      const treasury = getTreasury(coinConfig.coinType)

      const moveCall = {
        target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::mint::mint`,
        arguments: [
          { name: "version", value: SCALLOP.VERSION_OBJECT },
          { name: "market", value: SCALLOP.MARKET_OBJECT },
          { name: "amount", value: amount },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(moveCall)

      if (!debug) {
        debugLog(`scallop mint move call:`, moveCall)
      }

      const [marketCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(SCALLOP.VERSION_OBJECT),
          tx.object(SCALLOP.MARKET_OBJECT),
          coin,
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
      if (!debug) {
        debugLog(`mint_s_coin move call:`, mintSCoinMoveCall)
      }

      const [sCoin] = tx.moveCall({
        ...mintSCoinMoveCall,
        arguments: [tx.object(treasury), marketCoin],
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "Strater": {
      const fromBalanceMoveCall = {
        target: `0x2::coin::into_balance`,
        arguments: [{ name: "balance", value: amount }],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(fromBalanceMoveCall)
      if (!debug) {
        debugLog(`coin::from_balance move call:`, fromBalanceMoveCall)
      }

      const [sBalance] = tx.moveCall({
        target: fromBalanceMoveCall.target,
        arguments: [coin],
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
            value: amount,
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`bucket buck_to_sbuck move call:`, moveCall)
      }

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

      return (debug
        ? [sbsCoin, moveCallInfos]
        : sbsCoin) as unknown as MintSCoinResult<T>
    }
    case "Aftermath": {
      moveCall = {
        target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_stake`,
        arguments: [
          { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
          { name: "safe", value: AFTERMATH.SAFE },
          { name: "system_state", value: AFTERMATH.SYSTEM_STATE },
          { name: "referral_vault", value: AFTERMATH.REFERRAL_VAULT },
          { name: "coin", value: amount },
          { name: "validator", value: VALIDATORS.MYSTEN_2 },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`aftermath request_stake move call:`, moveCall)
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(AFTERMATH.STAKED_SUI_VAULT),
          tx.object(AFTERMATH.SAFE),
          tx.object(AFTERMATH.SYSTEM_STATE),
          tx.object(AFTERMATH.REFERRAL_VAULT),
          coin,
          tx.pure.address(VALIDATORS.MYSTEN_2),
        ],
        typeArguments: moveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "SpringSui": {
      moveCall = {
        target: `0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::mint`,
        arguments: [
          {
            name: "liquid_staking_info",
            value:
              "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
          },
          { name: "sui_system_state", value: "0x5" },
          { name: "coin", value: amount },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`spring_sui mint move call:`, moveCall)
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(
            "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
          ),
          tx.object("0x5"),
          coin,
        ],
        typeArguments: moveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "Volo": {
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
          { name: "coin", value: amount },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`volo stake move call:`, moveCall)
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(VOLO.NATIVE_POOL),
          tx.object(VOLO.METADATA),
          tx.object("0x5"),
          coin,
        ],
        typeArguments: moveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "Haedal": {
      if (new Decimal(amount).lt(new Decimal(2.97).mul(10 ** 9))) {
        throw new Error("Please invest at least 3 SUI")
      }

      const moveCall = {
        target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_stake_coin`,
        arguments: [
          { name: "sui_system_state", value: "0x5" },

          {
            name: "staking",
            value: HAEDAL.HAEDAL_STAKING_ID,
          },
          { name: "coin", value: amount },
          {
            name: "address",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`Haedal stake move call:`, moveCall)
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(
            "0x0000000000000000000000000000000000000000000000000000000000000005",
          ),
          tx.object(HAEDAL.HAEDAL_STAKING_ID),
          coin,
          tx.object(
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ),
        ],
        typeArguments: moveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "AlphaFi": {
      moveCall = {
        target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::mint`,
        arguments: [
          {
            name: "liquid_staking_info",
            value: ALPAHFI.LIQUID_STAKING_INFO,
          },
          { name: "sui_system_state", value: "0x5" },
          { name: "coin", value: amount },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(moveCall)
      if (!debug) {
        debugLog(`alphaFi mint move call:`, moveCall)
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(ALPAHFI.LIQUID_STAKING_INFO),
          tx.object("0x5"),
          coin,
        ],
        typeArguments: moveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    case "Mstable": {
      // First, create the deposit cap
      const createDepositCapMoveCall = {
        target: `0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_deposit_cap`,
        arguments: [
          {
            name: "meta_vault_sui_integration",
            value:
              "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa",
          },
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "registry",
            value:
              "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8",
          },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(createDepositCapMoveCall)
      if (!debug) {
        debugLog(
          `Mstable create_deposit_cap move call:`,
          createDepositCapMoveCall,
        )
      }

      const [depositCap] = tx.moveCall({
        target: createDepositCapMoveCall.target,
        arguments: [
          tx.object(
            "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa",
          ),
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          ),
          tx.object(
            "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8",
          ),
        ],
        typeArguments: createDepositCapMoveCall.typeArguments,
      })

      // Next, perform the deposit
      const depositMoveCall = {
        target: `0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::deposit`,
        arguments: [
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "version",
            value:
              "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",
          },
          { name: "deposit_cap", value: "depositCap" },
          { name: "coin", value: amount },
          { name: "amount_limit", value: "0" },
        ],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(depositMoveCall)
      if (!debug) {
        debugLog(`Mstable vault deposit move call:`, depositMoveCall)
      }

      const [sCoin] = tx.moveCall({
        target: depositMoveCall.target,
        arguments: [
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          ),
          tx.object(
            "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",
          ),
          depositCap,
          coin,
          tx.pure.u64("0"),
        ],
        typeArguments: depositMoveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }
    default:
      throw new Error(
        "mintSCoin Unsupported underlying protocol: " +
          coinConfig.underlyingProtocol,
      )
  }
}

type GetCoinValueResult<T extends boolean> = T extends true
  ? MoveCallInfo
  : void

export const getCoinValue = <T extends boolean = false>(
  tx: Transaction,
  coin: TransactionArgument,
  coinType: string,
  debug = false as T,
): GetCoinValueResult<T> => {
  const moveCallInfo: MoveCallInfo = {
    target: `0x2::coin::value`,
    arguments: [{ name: "coin", value: "coin" }],
    typeArguments: [coinType],
  }

  if (!debug) {
    debugLog(`coin::value move call:`, moveCallInfo)
  }

  tx.moveCall({
    target: moveCallInfo.target,
    arguments: [coin],
    typeArguments: moveCallInfo.typeArguments,
  })

  return (debug ? moveCallInfo : undefined) as unknown as GetCoinValueResult<T>
}
