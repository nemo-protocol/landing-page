import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import { parseErrorMessage } from "@/lib/errorMapping"
import usePyPositionData from "@/hooks/usePyPositionData"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import { Wallet as WalletIcon } from "lucide-react"
// import { useCurrentAccount } from "@mysten/dapp-kit"
// // import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import { getPriceVoucher, initPyPosition } from "@/lib/txHelper"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import BalanceInput from "@/components/BalanceInput"
import { formatDecimalValue } from "@/lib/utils"
import ActionButton from "@/components/ActionButton"
import useMarketStateData from "@/hooks/useMarketStateData"
import { useWallet } from "@aricredemption/wallet-kit"

export default function Mint({ slippage }: { slippage: string }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()

  // const { mutateAsync: signAndExecuteTransaction } =
  //   useCustomSignAndExecuteTransaction()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading } = useCoinConfig(
    coinType,
    maturity,
    address,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: lpSupply } = useMarketStateData(coinConfig?.marketStateId)

  const { data: dataRatio } = useQueryLPRatio(
    address,
    coinConfig?.marketStateId,
  )
  const ratio = useMemo(() => dataRatio?.syLpRate, [dataRatio])

  const { data: coinData } = useCoinData(address, coinType)
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(9)
    }
    return 0
  }, [coinData, coinConfig])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  async function add() {
    if (
      address &&
      coinType &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [splitCoinForAdd] = tx.splitCoins(coinData[0].coinObjectId, [
          new Decimal(addValue).mul(10 ** coinConfig.decimal).toFixed(0),
        ])

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoinForAdd,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(10 ** coinConfig.decimal)
                .mul(ratio || 1)
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

        if (lpSupply === "" || lpSupply === "0") {
          const [lp] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
            arguments: [
              tx.object(coinConfig.version),
              syCoin,
              priceVoucherForMintLp,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig!.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })

          tx.transferObjects([lp], address)
        } else {
          const [mp] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::add_liquidity_single_sy`,
            arguments: [
              tx.object(coinConfig.version),
              syCoin,
              //FIXME: we should calculate the min out correctly
              tx.pure.u64(new Decimal(0).toFixed(0)),
              priceVoucherForMintLp,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })

          tx.transferObjects([mp], address)
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        setTxId(res.digest)
        //TODO : handle error
        // if (res.effects?.status.status === "failure") {
        //   setStatus("Failed")
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
        setAddValue("")
        setStatus("Success")
      } catch (error) {
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      } finally {
        setOpen(true)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-y-4">
      <TransactionStatusDialog
        open={open}
        status={status}
        network={network}
        txId={txId}
        message={message}
        onClose={() => {
          setTxId("")
          setOpen(false)
        }}
      />
      <div className="flex items-center justify-end gap-x-1 w-full">
        <WalletIcon />
        <span>Balance: {address ? coinBalance : "--"}</span>
      </div>
      <BalanceInput
        showPrice={true}
        isLoading={isLoading}
        balance={addValue}
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinBalance={coinBalance}
        onChange={(value) => {
          setAddValue(value)
          setTargetValue(
            formatDecimalValue(
              new Decimal(value).mul(ratio || 0),
              coinConfig?.decimal,
            ),
          )
        }}
        price={coinConfig?.underlyingPrice}
        coinNameComponent={<span>{coinConfig?.coinName}</span>}
      />
      <SwapIcon className="mx-auto" />
      <BalanceInput
        showPrice={false}
        isLoading={isLoading}
        balance={targetValue}
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinNameComponent={<span>LP {coinConfig?.coinName}</span>}
        onChange={(value) => {
          setTargetValue(value)
          setAddValue(
            formatDecimalValue(
              new Decimal(value).div(ratio || 1),
              coinConfig?.decimal,
            ),
          )
        }}
      />
      <ActionButton
        btnText="Add Liquidity"
        onClick={add}
        openConnect={openConnect}
        setOpenConnect={setOpenConnect}
        insufficientBalance={insufficientBalance}
        disabled={
          ["", undefined, "0"].includes(addValue) ||
          new Decimal(addValue).toNumber() === 0
        }
      />
    </div>
  )
}
