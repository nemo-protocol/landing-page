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
  WINTER,
} from "../constants"
import { initCetusVaultsSDK, InputType } from "@cetusprotocol/vaults-sdk"

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument, MoveCallInfo[]]
  : TransactionArgument

type MintSCoinParams<T extends boolean = false> = {
  debug?: T
  amount: string
  tx: Transaction
  address: string
  vaultId?: string
  slippage: string
  coinData: CoinData[]
  coinConfig: CoinConfig
}

type MintMultiSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument[], MoveCallInfo[]]
  : TransactionArgument[]

type MintMultiSCoinParams<T extends boolean = false> = {
  debug?: T
  amount: string
  address: string
  tx: Transaction
  vaultId?: string
  slippage: string
  coinData: CoinData[]
  coinConfig: CoinConfig
  splitAmounts: string[]
}

export const mintMultiSCoin = async <T extends boolean = false>({
  tx,
  amount,
  vaultId,
  address,
  coinData,
  slippage,
  coinConfig,
  splitAmounts,
  debug = false as T,
}: MintMultiSCoinParams<T>): Promise<MintMultiSCoinResult<T>> => {
  console.log("mintMultiSCoin splitAmounts", splitAmounts)

  const mintResult = await mintSCoin({
    tx,
    debug,
    amount,
    vaultId,
    address,
    coinData,
    slippage,
    coinConfig,
  })

  if (coinConfig.underlyingProtocol === "Cetus") {
    const minSplitAmount = Math.min(...splitAmounts.map(Number))

    if (minSplitAmount < 3) {
      const splitTotalAmount = splitAmounts.reduce(
        (sum, val) => sum + Number(val),
        0,
      )

      const needValue = (splitTotalAmount * 3) / minSplitAmount

      throw new Error(
        `Please enter at least ${needValue} ${coinConfig.underlyingCoinType}`,
      )
    }
  }

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

  const splitCoins = tx.splitCoins(sCoin, splitAmounts)

  const coins = [...splitCoins, sCoin]

  return (debug
    ? [coins, moveCallInfos]
    : coins) as unknown as MintMultiSCoinResult<T>
}

export const mintSCoin = async <T extends boolean = false>({
  tx,
  amount,
  address,
  vaultId,
  coinData,
  slippage,
  coinConfig,
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  let moveCall: MoveCallInfo
  const moveCallInfos: MoveCallInfo[] = []

  // 使用splitCoin从coinData获取coin
  const [coin] = splitCoinHelper(
    tx,
    coinData,
    [amount],
    coinConfig.underlyingCoinType,
  )

  // Otherwise proceed with existing protocol-based switch
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
      // 根据 coinType 处理不同的逻辑
      if (
        coinConfig.coinType ===
        "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL"
      ) {
        // 处理 HAWAL 特殊情况
        const moveCall = {
          target: `0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::walstaking::request_stake_coin`,
          arguments: [
            {
              name: "staking",
              value:
                "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
            },
            {
              name: "staking",
              value:
                "0x9e5f6537be1a5b658ec7eed23160df0b28c799563f6c41e9becc9ad633cb592b",
            },
            { name: "coin", value: amount },
            {
              name: "id",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          ],
          typeArguments: [],
        }
        moveCallInfos.push(moveCall)
        if (!debug) {
          debugLog(`HAWAL stake move call:`, moveCall)
        }

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
            ),
            tx.object(
              "0x9e5f6537be1a5b658ec7eed23160df0b28c799563f6c41e9becc9ad633cb592b",
            ),
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
      } else {
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
    case "Winter": {
      const getAllowedVersionsMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_allowed_versions::get_allowed_versions`,
        arguments: [
          {
            name: "blizzard_av",
            value:
              "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(getAllowedVersionsMoveCall)
      if (!debug) {
        debugLog(
          `Winter get_allowed_versions move call:`,
          getAllowedVersionsMoveCall,
        )
      }

      const [allowedVersions] = tx.moveCall({
        target: getAllowedVersionsMoveCall.target,
        arguments: [
          tx.object(
            "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          ),
        ],
        typeArguments: getAllowedVersionsMoveCall.typeArguments,
      })

      // 然后调用blizzard_protocol::mint
      const mintMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::mint`,
        arguments: [
          {
            name: "blizzard_staking",
            value:
              "0xccf034524a2bdc65295e212128f77428bb6860d757250c43323aa38b3d04df6d",
          },
          {
            name: "staking",
            value:
              "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
          },
          {
            name: "coin",
            value: amount,
          },
          {
            name: "id",
            value:
              "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb",
          },
          {
            name: "allowed_versions",
            value: "allowedVersions",
          },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(mintMoveCall)
      if (!debug) {
        debugLog(`Winter mint move call:`, mintMoveCall)
      }

      const [sCoin] = tx.moveCall({
        target: mintMoveCall.target,
        arguments: [
          tx.object(
            "0xccf034524a2bdc65295e212128f77428bb6860d757250c43323aa38b3d04df6d",
          ),
          tx.object(
            "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
          ),
          coin,
          tx.object(
            "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb",
          ),
          allowedVersions,
        ],
        typeArguments: mintMoveCall.typeArguments,
      })

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>
    }

    case "Cetus": {
      if (!vaultId) {
        throw new Error("Vault ID is required for Cetus")
      }
      const sdk = initCetusVaultsSDK({
        network: "mainnet",
      })

      sdk.senderAddress = address

      const depositResult = await sdk.Vaults.calculateDepositAmount({
        vault_id: vaultId,
        fix_amount_a: false,
        input_amount: amount,
        slippage: Number(slippage),
        side: InputType.OneSide,
      })

      const sCoin = (await sdk.Vaults.deposit(
        {
          coin_object_b: coin,
          vault_id:
            "0xde97452e63505df696440f86f0b805263d8659b77b8c316739106009d514c270",
          slippage: Number(slippage),
          deposit_result: depositResult,
          return_lp_token: true,
        },
        tx,
      )) as TransactionArgument

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
  ? [TransactionArgument, MoveCallInfo]
  : TransactionArgument

export const getCoinValue = <T extends boolean = false>(
  tx: Transaction,
  coin: TransactionArgument,
  coinType: string,
  debug = false as T,
): GetCoinValueResult<T> => {
  const moveCallInfo: MoveCallInfo = {
    target: `0x2::coin::value`,
    arguments: [{ name: "coin", value: coin }],
    typeArguments: [coinType],
  }

  if (!debug) {
    debugLog(`coin::value move call:`, moveCallInfo)
  }

  const coinValue = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [coin],
    typeArguments: moveCallInfo.typeArguments,
  })

  return (debug
    ? [coinValue, moveCallInfo]
    : coinValue) as unknown as GetCoinValueResult<T>
}

type BurnSCoinResult<T extends boolean> = T extends true
  ? [TransactionArgument, MoveCallInfo[]]
  : TransactionArgument

type BurnSCoinParams<T extends boolean = false> = {
  debug?: T
  amount: string
  tx: Transaction
  address: string
  vaultId?: string
  slippage: string
  coinConfig: CoinConfig
  sCoin: TransactionArgument
}

export const burnSCoin = async <T extends boolean = false>({
  tx,
  sCoin,
  amount,
  address,
  vaultId,
  slippage,
  coinConfig,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = []
  let underlyingCoin: TransactionArgument

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
      if (!debug) {
        debugLog(`burn_s_coin move call:`, burnSCoinMoveCall)
      }

      const [marketCoin] = tx.moveCall({
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
      if (!debug) {
        debugLog(`scallop redeem move call:`, redeemMoveCall)
      }

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
      // 检查是否为 HAWAL 币种
      if (
        coinConfig.coinType ===
        "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL"
      ) {
        throw new Error("Underlying protocol error, try to withdraw to HAWAL.")
      } else {
        // 原有的 HASUI 处理逻辑
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
        if (!debug) {
          debugLog(
            `haedal request_unstake_instant_coin move call:`,
            unstakeMoveCall,
          )
        }

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
      }
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
      if (!debug) {
        debugLog(`coin::into_balance move call:`, toBalanceMoveCall)
      }

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
      if (!debug) {
        debugLog(`sbuck_saving_vault::withdraw move call:`, withdrawMoveCall)
      }

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
      if (!debug) {
        debugLog(
          `sbuck_saving_vault::redeem_withdraw_ticket move call:`,
          redeemTicketMoveCall,
        )
      }

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
      if (!debug) {
        debugLog(`coin::from_balance move call:`, fromBalanceMoveCall)
      }

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
      if (!debug) {
        debugLog(`alphaFi redeem move call:`, redeemMoveCall)
      }

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
      if (!debug) {
        debugLog(`aftermath request_unstake_atomic move call:`, burnMoveCall)
      }

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
      if (!debug) {
        debugLog(`volo mint_ticket_non_entry move call:`, mintTicketMoveCall)
      }

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
      if (!debug) {
        debugLog(`volo burn_ticket_non_entry move call:`, burnTicketMoveCall)
      }

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
      if (!debug) {
        debugLog(
          `Mstable create_withdraw_cap move call:`,
          createWithdrawCapMoveCall,
        )
      }

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
      if (!debug) {
        debugLog(`Mstable vault withdraw move call:`, withdrawMoveCall)
      }

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
    case "Winter": {
      if (
        coinConfig.coinType ===
        "0xb1b0650a8862e30e3f604fd6c5838bc25464b8d3d827fbd58af7cb9685b832bf::wwal::WWAL"
      ) {
        throw new Error("Underlying protocol error, try to withdraw to wWAL.")
      }
      const [coinValue, getCoinValueMoveCall] = getCoinValue(
        tx,
        sCoin,
        coinConfig.coinType,
        true,
      )
      moveCallInfos.push(getCoinValueMoveCall)
      if (!debug) {
        debugLog(`Winter get_coin_value move call:`, getCoinValueMoveCall)
      }

      const fcfsMoveCall = {
        target: `0x10a7c91b25090b81a4de1e3a3912c994feb446529a308b7aa549eea259b11842::blizzard_hooks::fcfs`,
        arguments: [
          {
            name: "blizzard_staking",
            value: WINTER.BLIZZARD_STAKING,
          },
          {
            name: "walrus_staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "amount",
            value: coinValue,
          },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(fcfsMoveCall)
      if (!debug) {
        debugLog(`Winter fcfs move call:`, fcfsMoveCall)
      }

      // 调用blizzard_hooks::fcfs获取ixVector

      const [, ixVector] = tx.moveCall({
        target: fcfsMoveCall.target,
        arguments: [
          tx.object(WINTER.BLIZZARD_STAKING),
          tx.object(WINTER.WALRUS_STAKING),
          coinValue,
        ],
        typeArguments: fcfsMoveCall.typeArguments,
      })

      // 首先调用get_allowed_versions获取版本信息
      const getAllowedVersionsMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_allowed_versions::get_allowed_versions`,
        arguments: [
          {
            name: "blizzard_av",
            value:
              "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          },
        ],
        typeArguments: [],
      }
      moveCallInfos.push(getAllowedVersionsMoveCall)
      if (!debug) {
        debugLog(
          `Winter get_allowed_versions move call:`,
          getAllowedVersionsMoveCall,
        )
      }

      const allowedVersions = tx.moveCall({
        target: getAllowedVersionsMoveCall.target,
        arguments: [
          tx.object(
            "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          ),
        ],
        typeArguments: getAllowedVersionsMoveCall.typeArguments,
      })

      // 调用burn_lst函数
      const burnLstMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::burn_lst`,
        arguments: [
          {
            name: "blizzard_staking",
            value: WINTER.BLIZZARD_STAKING,
          },
          {
            name: "staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "s_coin",
            value: sCoin,
          },
          {
            name: "ix_vector",
            value: ixVector,
          },
          {
            name: "allowed_versions",
            value: allowedVersions,
          },
        ],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(burnLstMoveCall)
      if (!debug) {
        debugLog(`Winter burn_lst move call:`, burnLstMoveCall)
      }

      const [coin, stakedWals] = tx.moveCall({
        target: burnLstMoveCall.target,
        arguments: [
          tx.object(WINTER.BLIZZARD_STAKING),
          tx.object(WINTER.WALRUS_STAKING),
          sCoin,
          ixVector,
          allowedVersions,
        ],
        typeArguments: burnLstMoveCall.typeArguments,
      })

      const vectorTransferStakedWalMoveCall = {
        target: `0x3e12a9b6dbe7997b441b5fd6cf5e953cf2f3521a8f353f33e7f297cf7dac0ecc::blizzard_utils::vector_transfer_staked_wal`,
        arguments: [
          {
            name: "walrus_staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "StakedWalVector",
            value: stakedWals,
          },
          {
            name: "address",
            value: address,
          },
        ],
        typeArguments: [],
      }

      tx.moveCall({
        target: vectorTransferStakedWalMoveCall.target,
        arguments: [
          tx.object(WINTER.WALRUS_STAKING),
          stakedWals,
          tx.pure.address(address),
        ],
        typeArguments: vectorTransferStakedWalMoveCall.typeArguments,
      })

      if (!debug) {
        debugLog(
          `Winter vector_transfer_staked_wal move call:`,
          vectorTransferStakedWalMoveCall,
        )
      }

      moveCallInfos.push(vectorTransferStakedWalMoveCall)

      underlyingCoin = coin
      break
    }
    case "Cetus": {
      if (!amount) {
        throw new Error("Amount is required for Cetus")
      }
      if (!vaultId) {
        throw new Error("Vault ID is required for Cetus")
      }

      const sdk = initCetusVaultsSDK({
        network: "mainnet",
      })

      sdk.senderAddress = address

      const withdrawResult = await sdk.Vaults.calculateWithdrawAmount({
        vault_id: vaultId,
        fix_amount_a: false,
        input_amount: amount,
        slippage: Number(slippage),
        side: InputType.OneSide,
        is_ft_input: false,
        max_ft_amount: "",
      })

      const coin = (await sdk.Vaults.withdraw(
        {
          vault_id: vaultId,
          return_coin: true,
          slippage: Number(slippage),
          ft_amount: withdrawResult.burn_ft_amount,
        },
        tx,
      )) as TransactionArgument

      return (debug
        ? [coin, moveCallInfos]
        : coin) as unknown as MintSCoinResult<T>
    }
    default:
      console.error(
        "burnSCoin Unsupported underlying protocol: " +
          coinConfig.underlyingProtocol,
      )
      underlyingCoin = sCoin
  }

  return (debug
    ? [underlyingCoin, moveCallInfos]
    : underlyingCoin) as unknown as BurnSCoinResult<T>
}
