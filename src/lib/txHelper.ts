import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { CoinData } from "@/types"
import { MoveCallInfo } from "@/hooks/types"
import { LpPosition } from "@/hooks/types"
import { CoinConfig } from "@/queries/types/market"
import {
  SCALLOP,
  AFTERMATH,
  getTreasury,
  ALPAHFI,
  HAEDAL,
  VOLO,
  WINTER,
} from "./constants"
import {
  Transaction,
  TransactionResult,
  TransactionArgument,
} from "@mysten/sui/transactions"

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
        debugLog(
          `haedal request_unstake_instant_coin move call:`,
          unstakeMoveCall,
        )

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
    case "Winter": {
      // TODO: use get coin value
      const getCoinValueMoveCall = {
        target: `0x2::coin::value`,
        arguments: [{ name: "coin", value: sCoin }],
        typeArguments: [coinConfig.coinType],
      }
      moveCallInfos.push(getCoinValueMoveCall)
      if (!debug) {
        debugLog(`Winter get_coin_value move call:`, getCoinValueMoveCall)
      }

      const coinValue = tx.moveCall({
        target: getCoinValueMoveCall.target,
        arguments: [sCoin],
        typeArguments: getCoinValueMoveCall.typeArguments,
      })

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
            value:
              "0xea126b68396dff3991a1117eaff3ade6b1c6de23b9ac3e964e10cd5d66fe2bbb",
          },
        ],
        typeArguments: [],
      }

      tx.moveCall({
        target: vectorTransferStakedWalMoveCall.target,
        arguments: [
          tx.object(WINTER.WALRUS_STAKING),
          stakedWals,
          tx.pure.address(
            "0xea126b68396dff3991a1117eaff3ade6b1c6de23b9ac3e964e10cd5d66fe2bbb",
          ),
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
