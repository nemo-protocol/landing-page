import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/types"
import { MoveCallInfo } from "@/hooks/types"
import { LpPosition } from "@/hooks/types"
import { CoinConfig } from "@/queries/types/market"
import {
  SCALLOP,
  AFTERMATH,
  VALIDATORS,
  getTreasury,
  ALPAHFI,
  HAEDAL,
  VOLO,
} from "./constants"
import {
  Transaction,
  TransactionResult,
  TransactionArgument,
} from "@mysten/sui/transactions"
import { formatDecimalValue } from "./utils"

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
  cetusData?: {
    amount_a: string
    amount_b: string
    amount_limit_a: string
    amount_limit_b: string
  }[],
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
              value: HAEDAL.HAEDAL_STAKING_ID,
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
            tx.object(HAEDAL.HAEDAL_STAKING_ID),
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
    case "Cetus": {
      console.log("cetusData", cetusData, "coinData", coinData)

      const sCoins: TransactionArgument[] = []
      if (!cetusData) {
        throw new Error("Cetus data is required")
      }

      for (let i = 0; i < cetusData.length; i++) {
        const { amount_a, amount_b, amount_limit_a, amount_limit_b } =
          cetusData[i]

        const suiForHaedal = splitCoins[i * 2]
        const suiCoin = splitCoins[i * 2 + 1]

        if (new Decimal(amount_a).lt(10 ** 9)) {
          const amount = new Decimal(amount_a).add(amount_b)
          throw Error(
            `Please invest at least ${formatDecimalValue(
              new Decimal(amount)
                .div(new Decimal(amount_a))
                .mul(
                  amounts
                    .reduce((acc, curr) => acc.add(curr), new Decimal(0))
                    .div(amount),
                ),
              Number(coinConfig.decimal),
            )} ${coinConfig.underlyingCoinName}`,
          )
        }

        const mintHaedalMoveCall = {
          target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_stake_coin`,
          arguments: [
            { name: "sui_system_state", value: "0x5" },

            {
              name: "staking",
              value: HAEDAL.HAEDAL_STAKING_ID,
            },
            { name: "coin", value: amount_a },
            {
              name: "address",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          ],
          typeArguments: [],
        }

        moveCallInfos.push(mintHaedalMoveCall)
        const [hasuiCoin] = tx.moveCall({
          target: mintHaedalMoveCall.target,
          arguments: [
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000005",
            ),
            tx.object(HAEDAL.HAEDAL_STAKING_ID),
            suiForHaedal,
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ),
          ],
          typeArguments: mintHaedalMoveCall.typeArguments,
        })

        // Now implement the deposit call based on the provided parameters
        const vaultDepositMoveCall = {
          target: `0x5c35deb22849011d69456f37aaf4d90356e0829545d413039212dafa5b1d70b4::vaults::deposit`,
          arguments: [
            {
              name: "vaults_manager",
              value:
                "0x25b82dd2f5ee486ed1c8af144b89a8931cd9c29dee3a86a1bfe194fdea9d04a6",
            },
            {
              name: "vault",
              value:
                "0xde97452e63505df696440f86f0b805263d8659b77b8c316739106009d514c270",
            },
            {
              name: "rewarder_manager",
              value:
                "0xe0e155a88c77025056da08db5b1701a91b79edb6167462f768e387c3ed6614d5",
            },
            {
              name: "cetus_global_config",
              value:
                "0x21215f2f6de04b57dd87d9be7bb4e15499aec935e36078e2488f36436d64996e",
            },
            {
              name: "cetus_pool",
              value:
                "0x9f5fd63b2a2fd8f698ff6b7b9720dbb2aa14bedb9fc4fd6411f20e5b531a4b89",
            },
            {
              name: "dex_global_config",
              value:
                "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f",
            },
            {
              name: "dex_pool",
              value:
                "0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc",
            },
            { name: "coin_a", value: amount_a },
            { name: "coin_b", value: amount_b },
            { name: "amount_a_min", value: amount_limit_a },
            { name: "amount_b_min", value: amount_limit_b },
            { name: "is_one_side", value: "true" },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [
            "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
            coinConfig.underlyingCoinType,
            coinConfig.coinType,
          ],
        }
        moveCallInfos.push(vaultDepositMoveCall)
        // Execute the deposit call
        const [sCoin] = tx.moveCall({
          target: vaultDepositMoveCall.target,
          arguments: vaultDepositMoveCall.arguments.map((arg) => {
            if (arg.name === "coin_a" || arg.name === "coin_b") {
              return arg.value === amount_a ? hasuiCoin : suiCoin
            }
            if (arg.name === "amount_a_min" || arg.name === "amount_b_min") {
              return tx.pure.u64(arg.value.toString())
            }
            if (arg.name === "is_one_side") {
              return tx.pure.bool(true)
            }
            return tx.object(arg.value.toString())
          }),
          typeArguments: vaultDepositMoveCall.typeArguments,
        })
        console.log("moveCallInfos", moveCallInfos)
        sCoins.push(sCoin)
      }
      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    case "Mstable": {
      const sCoins: TransactionArgument[] = []

      for (let i = 0; i < amounts.length; i++) {
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
        debugLog(
          `Mstable create_deposit_cap move call:`,
          createDepositCapMoveCall,
        )

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
            { name: "coin", value: amounts[i] },
            { name: "amount_limit", value: "0" },
          ],
          typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
        }
        moveCallInfos.push(depositMoveCall)
        debugLog(`Mstable vault deposit move call:`, depositMoveCall)

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
            splitCoins[i],
            tx.pure.u64("0"),
          ],
          typeArguments: depositMoveCall.typeArguments,
        })

        sCoins.push(sCoin)
      }

      return (debug
        ? [sCoins, moveCallInfos]
        : sCoins) as unknown as MintSCoinResult<T>
    }
    default:
      throw new Error(
        "mintSCoin Unsupported underlying protocol: " +
          coinConfig.underlyingProtocol,
      )
  }
}

export const burnSCoin = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  sCoin: TransactionArgument,
  debug: T = false as T,
): T extends true
  ? [TransactionArgument, MoveCallInfo[]]
  : TransactionArgument => {
  const moveCallInfos: MoveCallInfo[] = []
  let underlyingCoin: TransactionArgument

  console.log(
    "underlyingProtocol",
    coinConfig.underlyingProtocol,
    coinConfig.underlyingProtocol === "Haedal",
  )

  switch (coinConfig.underlyingProtocol) {
    case "Scallop": {
      const treasury = getTreasury(coinConfig.coinType)

      const burnSCoinMoveCall = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::burn_s_coin`,
        arguments: [
          { name: "treasury", value: treasury },
          { name: "s_coin", value: "sCoin" },
        ],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(burnSCoinMoveCall)
      debugLog(`burn_s_coin move call:`, burnSCoinMoveCall)

      const marketCoin = tx.moveCall({
        target: burnSCoinMoveCall.target,
        arguments: [tx.object(treasury), sCoin],
        typeArguments: burnSCoinMoveCall.typeArguments,
      })

      const redeemMoveCall = {
        target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::redeem::redeem`,
        arguments: [
          { name: "version", value: SCALLOP.VERSION_OBJECT },
          { name: "market", value: SCALLOP.MARKET_OBJECT },
          { name: "market_coin", value: "marketCoin" },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(redeemMoveCall)
      debugLog(`scallop redeem move call:`, redeemMoveCall)

      const [coin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [
          tx.object(SCALLOP.VERSION_OBJECT),
          tx.object(SCALLOP.MARKET_OBJECT),
          marketCoin,
          tx.object("0x6"),
        ],
        typeArguments: redeemMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "Haedal": {
      const unstakeMoveCall = {
        target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_unstake_instant_coin`,
        arguments: [
          { name: "sui_system_state", value: "0x5" },
          { name: "staking", value: HAEDAL.HAEDAL_STAKING_ID },
          { name: "s_coin", value: "sCoin" },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(unstakeMoveCall)
      debugLog(`haedal request_unstake_instant_coin move call:`, unstakeMoveCall)

      const [coin] = tx.moveCall({
        target: unstakeMoveCall.target,
        arguments: [
          tx.object("0x5"),
          tx.object(HAEDAL.HAEDAL_STAKING_ID),
          sCoin,
        ],
        typeArguments: unstakeMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "Strater": {
      // Convert sCoin to balance first
      const toBalanceMoveCall = {
        target: `0x2::coin::into_balance`,
        arguments: [{ name: "coin", value: "sCoin" }],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(toBalanceMoveCall)
      debugLog(`coin::into_balance move call:`, toBalanceMoveCall)

      const [sbsBalance] = tx.moveCall({
        target: toBalanceMoveCall.target,
        arguments: [sCoin],
        typeArguments: toBalanceMoveCall.typeArguments,
      })

      // Call withdraw to get a withdraw ticket
      const withdrawMoveCall = {
        target: `0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::withdraw`,
        arguments: [
          {
            name: "bucket_vault",
            value:
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          },
          {
            name: "balance",
            value: "sbsBalance",
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.underlyingCoinType, coinConfig.coinType],
      }
      moveCallInfos.push(withdrawMoveCall)
      debugLog(`sbuck_saving_vault::withdraw move call:`, withdrawMoveCall)

      const [withdrawTicket] = tx.moveCall({
        target: withdrawMoveCall.target,
        arguments: [
          tx.object(
            "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          ),
          sbsBalance,
          tx.object("0x6"),
        ],
        typeArguments: withdrawMoveCall.typeArguments,
      })

      // Redeem the withdraw ticket to get the underlying balance
      const redeemTicketMoveCall = {
        target: `0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::redeem_withdraw_ticket`,
        arguments: [
          {
            name: "bucket_vault",
            value:
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          },
          {
            name: "withdraw_ticket",
            value: "withdrawTicket",
          },
        ],
        typeArguments: [coinConfig.underlyingCoinType, coinConfig.coinType],
      }
      moveCallInfos.push(redeemTicketMoveCall)
      debugLog(
        `sbuck_saving_vault::redeem_withdraw_ticket move call:`,
        redeemTicketMoveCall,
      )

      const [underlyingBalance] = tx.moveCall({
        target: redeemTicketMoveCall.target,
        arguments: [
          tx.object(
            "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          ),
          withdrawTicket,
        ],
        typeArguments: redeemTicketMoveCall.typeArguments,
      })

      // Convert balance back to coin
      const fromBalanceMoveCall = {
        target: `0x2::coin::from_balance`,
        arguments: [{ name: "balance", value: "underlyingBalance" }],
        typeArguments: [coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(fromBalanceMoveCall)
      debugLog(`coin::from_balance move call:`, fromBalanceMoveCall)

      const [coin] = tx.moveCall({
        target: fromBalanceMoveCall.target,
        arguments: [underlyingBalance],
        typeArguments: fromBalanceMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "AlphaFi": {
      const redeemMoveCall = {
        target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::redeem`,
        arguments: [
          { name: "liquid_staking_info", value: ALPAHFI.LIQUID_STAKING_INFO },
          { name: "coin", value: "sCoin" },
          { name: "sui_system_state", value: "0x5" },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(redeemMoveCall)
      debugLog(`alphaFi redeem move call:`, redeemMoveCall)

      const [coin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [
          tx.object(ALPAHFI.LIQUID_STAKING_INFO),
          sCoin,
          tx.object("0x5"),
        ],
        typeArguments: redeemMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "Aftermath": {
      const burnMoveCall = {
        target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_unstake_atomic`,
        arguments: [
          { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
          { name: "safe", value: AFTERMATH.SAFE },
          { name: "referral_vault", value: AFTERMATH.REFERRAL_VAULT },
          { name: "treasury", value: AFTERMATH.TREASURY },
          { name: "s_coin", value: "sCoin" },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(burnMoveCall)
      debugLog(`aftermath request_unstake_atomic move call:`, burnMoveCall)

      const [coin] = tx.moveCall({
        target: burnMoveCall.target,
        arguments: [
          tx.object(AFTERMATH.STAKED_SUI_VAULT),
          tx.object(AFTERMATH.SAFE),
          tx.object(AFTERMATH.REFERRAL_VAULT),
          tx.object(AFTERMATH.TREASURY),
          sCoin,
        ],
        typeArguments: burnMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "Volo": {
      const mintTicketMoveCall = {
        target: `0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::native_pool::mint_ticket_non_entry`,
        arguments: [
          { name: "native_pool", value: VOLO.NATIVE_POOL },
          { name: "metadata", value: VOLO.METADATA },
          { name: "cert_coin", value: "sCoin" },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(mintTicketMoveCall)
      debugLog(`volo mint_ticket_non_entry move call:`, mintTicketMoveCall)

      const [unstakeTicket] = tx.moveCall({
        target: mintTicketMoveCall.target,
        arguments: [
          tx.object(VOLO.NATIVE_POOL),
          tx.object(VOLO.METADATA),
          sCoin,
        ],
        typeArguments: mintTicketMoveCall.typeArguments,
      })

      const burnTicketMoveCall = {
        target: `0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::native_pool::burn_ticket_non_entry`,
        arguments: [
          { name: "native_pool", value: VOLO.NATIVE_POOL },
          { name: "sui_system_state", value: "0x5" },
          { name: "unstake_ticket", value: "unstakeTicket" },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(burnTicketMoveCall)
      debugLog(`volo burn_ticket_non_entry move call:`, burnTicketMoveCall)

      const [coin] = tx.moveCall({
        target: burnTicketMoveCall.target,
        arguments: [
          tx.object(VOLO.NATIVE_POOL),
          tx.object("0x5"),
          unstakeTicket,
        ],
        typeArguments: burnTicketMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    case "Mstable": {
      // First, create the withdraw cap
      const createWithdrawCapMoveCall = {
        target: `0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_withdraw_cap`,
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
      moveCallInfos.push(createWithdrawCapMoveCall)
      debugLog(
        `Mstable create_withdraw_cap move call:`,
        createWithdrawCapMoveCall,
      )

      const [withdrawCap] = tx.moveCall({
        target: createWithdrawCapMoveCall.target,
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
        typeArguments: createWithdrawCapMoveCall.typeArguments,
      })

      // Next, perform the withdrawal
      const withdrawMoveCall = {
        target: `0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::withdraw`,
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
          { name: "withdraw_cap", value: "withdrawCap" },
          { name: "coin", value: "sCoin" },
          { name: "amount_limit", value: "0" },
        ],
        typeArguments: [coinConfig.coinType, coinConfig.underlyingCoinType],
      }
      moveCallInfos.push(withdrawMoveCall)
      debugLog(`Mstable vault withdraw move call:`, withdrawMoveCall)

      const [coin] = tx.moveCall({
        target: withdrawMoveCall.target,
        arguments: [
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          ),
          tx.object(
            "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",
          ),
          withdrawCap,
          sCoin,
          tx.pure.u64("0"),
        ],
        typeArguments: withdrawMoveCall.typeArguments,
      })

      underlyingCoin = coin
      break
    }
    default:
      console.error(
        "burnSCoin Unsupported underlying protocol: " +
          coinConfig.underlyingProtocol,
      )
      underlyingCoin = sCoin
    // throw new Error(
    //   "Unsupported underlying protocol: " + coinConfig.underlyingProtocol,
    // )
  }

  return (debug
    ? [underlyingCoin, moveCallInfos]
    : underlyingCoin) as unknown as T extends true
    ? [TransactionArgument, MoveCallInfo[]]
    : TransactionArgument
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
