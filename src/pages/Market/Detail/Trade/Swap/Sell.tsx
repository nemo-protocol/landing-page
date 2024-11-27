import Decimal from "decimal.js"
import { useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { useCurrentWallet } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { network } from "@/config"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import { initPyPosition } from "@/lib/txHelper"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import BalanceInput from "@/components/BalanceInput"
import ActionButton from "@/components/ActionButton"
import { formatDecimalValue } from "@/lib/utils"

export default function Sell({ slippage }: { slippage: string }) {
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState("pt")
  const { currentWallet, isConnected } = useCurrentWallet()
  const [redeemValue, setRedeemValue] = useState("")
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()
  const [openConnect, setOpenConnect] = useState(false)

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [_tokenType])

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: coinConfig, isLoading } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: ratio } = useQuerySwapRatio(
    coinConfig?.marketStateId,
    tokenType,
  )

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const insufficientBalance = useMemo(
    () =>
      tokenType == "pt"
        ? new Decimal(Number(ptBalance)).lt(redeemValue || 0)
        : new Decimal(Number(ytBalance)).lt(redeemValue || 0),
    [ptBalance, ytBalance, redeemValue, tokenType],
  )

  async function redeem() {
    if (!insufficientBalance && coinConfig && coinType && address) {
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

        const [priceVoucher] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(coinConfig.providerVersion),
            tx.object(coinConfig.providerMarket),
            tx.object(coinConfig.syStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
        })

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::swap_exact_${tokenType}_for_sy`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(new Decimal(redeemValue).mul(1e9).toString()),
            pyPosition,
            tx.object(coinConfig.pyStateId),
            priceVoucher,
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig.marketFactoryConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        const [sCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::redeem`,
          arguments: [
            tx.object(coinConfig.version),
            syCoin,
            // FIXME: This is a temporary fix for the slippage issue
            // tx.pure.u64(new Decimal(redeemValue)
            tx.pure.u64(
              new Decimal(0)
                .div(ratio || 0)
                .mul(10 ** coinConfig.decimal)
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        tx.transferObjects([sCoin], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        // tx.setGasBudget(10000000)

        const res = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setTxId(res.digest)
        setOpen(true)
        setRedeemValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
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
        <span className="space-x-1">
          <span>Balance:</span>
          <span>
            {isConnected ? (tokenType === "pt" ? ptBalance : ytBalance) : "--"}
          </span>
        </span>
      </div>
      <BalanceInput
        showPrice={true}
        isLoading={isLoading}
        balance={redeemValue}
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinBalance={tokenType === "pt" ? ptBalance : ytBalance}
        setBalance={setRedeemValue}
        price={tokenType === "pt" ? coinConfig?.ptPrice : coinConfig?.ytPrice}
        coinNameComponent={
          <Select
            value={tokenType}
            onValueChange={(value) => setTokenType(value)}
          >
            <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base">
              <SelectValue placeholder="Select token type" />
            </SelectTrigger>
            <SelectContent className="bg-black border-none shadow-lg">
              <SelectGroup>
                <SelectItem value="pt" className="cursor-pointer text-white">
                  PT {coinConfig?.coinName}
                </SelectItem>
                <SelectItem value="yt" className="cursor-pointer text-white">
                  YT {coinConfig?.coinName}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />
      <SwapIcon className="mx-auto" />
      <BalanceInput
        showPrice={false}
        isLoading={isLoading}
        balance={
          redeemValue &&
          formatDecimalValue(
            new Decimal(redeemValue).div(ratio && ratio !== "0" ? ratio : 1),
            coinConfig?.decimal,
          )
        }
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinBalance={tokenType === "pt" ? ptBalance : ytBalance}
        coinNameComponent={<span className="px-2">{coinConfig?.coinName}</span>}
      />
      <ActionButton
        btnText="Sell"
        onClick={redeem}
        openConnect={openConnect}
        setOpenConnect={setOpenConnect}
        insufficientBalance={insufficientBalance}
        disabled={["", undefined].includes(redeemValue)}
      />
    </div>
  )
}
