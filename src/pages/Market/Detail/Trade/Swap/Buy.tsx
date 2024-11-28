import dayjs from "dayjs"
import Decimal from "decimal.js"
import { network } from "@/config"
import { Info } from "lucide-react"
import { useParams } from "react-router-dom"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useEffect, useMemo, useState } from "react"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import useCoinData from "@/hooks/useCoinData"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { formatDecimalValue } from "@/lib/utils"
import { getPriceVoucher, initPyPosition } from "@/lib/txHelper"
import BalanceInput from "@/components/BalanceInput"
import ActionButton from "@/components/ActionButton"

export default function Mint({ slippage }: { slippage: string }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const [swapValue, setSwapValue] = useState("")
  const [tokenType, setTokenType] = useState("pt")
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const currentAccount = useCurrentAccount()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [_tokenType])

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

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

  const { data: coinData } = useCoinData(address, coinType)
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(coinConfig?.decimal ?? 0)
    }
    return 0
  }, [coinData, coinConfig])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(swapValue || 0),
    [coinBalance, swapValue],
  )

  async function mint() {
    if (
      coinType &&
      address &&
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

        const [splitCoin] = tx.splitCoins(coinData[0].coinObjectId, [
          new Decimal(swapValue).mul(10 ** coinConfig.decimal).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(swapValue)
                .mul(10 ** coinConfig.decimal)
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        if (tokenType === "pt") {
          tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::swap_exact_sy_for_pt`,
            arguments: [
              tx.object(coinConfig.version),
              tx.pure.u64(
                new Decimal(swapValue)
                  .mul(10 ** coinConfig.decimal)
                  .mul(1 - new Decimal(slippage).div(100).toNumber())
                  .toFixed(0),
              ),
              syCoin,
              priceVoucher,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })
        } else {
          const [sy] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::swap_sy_for_exact_yt`,
            arguments: [
              tx.object(coinConfig.version),
              tx.pure.u64(
                new Decimal(swapValue)
                  .mul(10 ** coinConfig.decimal)
                  .mul(1 - new Decimal(slippage).div(100).toNumber())
                  .toFixed(0),
              ),
              syCoin,
              priceVoucher,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.syStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })
          // tx.transferObjects([sy], address)
          const [sCoin] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::sy::redeem`,
            arguments: [
              tx.object(coinConfig.version),
              sy,
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
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        // tx.setGasBudget(GAS_BUDGET)

        const res = await signAndExecuteTransaction({
          transaction: Transaction.from(tx),
          chain: `sui:${network}`,
        })
        setTxId(res.digest)
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setStatus("Success")
        setOpen(true)
        setSwapValue("")
      } catch (error) {
        console.log("error", error)
        console.log("error", (error as Error)?.message)

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
        <span>Balance: {isConnected ? coinBalance : "--"}</span>
      </div>
      <BalanceInput
        showPrice={true}
        isLoading={isLoading}
        balance={swapValue}
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinBalance={coinBalance}
        setBalance={setSwapValue}
        price={coinConfig?.sCoinPrice}
        coinNameComponent={<span>{coinConfig?.coinName}</span>}
      />
      <SwapIcon className="mx-auto" />
      <BalanceInput
        showPrice={false}
        balance={
          swapValue &&
          formatDecimalValue(
            new Decimal(swapValue).mul(ratio || 0),
            coinConfig?.decimal,
          )
        }
        isLoading={isLoading}
        coinConfig={coinConfig}
        isConnected={isConnected}
        coinNameComponent={
          <Select
            value={tokenType}
            onValueChange={(value) => {
              setTokenType(value)
              setSwapValue("")
            }}
          >
            <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base">
              <SelectValue placeholder="Select token type" />
            </SelectTrigger>
            <SelectContent className="border-none outline-none bg-[#0E0F16]">
              <SelectGroup>
                <SelectItem
                  value="pt"
                  className="cursor-pointer text-white"
                  onClick={() => setTokenType("pt")}
                >
                  PT {coinConfig?.coinName}
                </SelectItem>
                <SelectItem
                  value="yt"
                  className="cursor-pointer text-white"
                  onClick={() => setTokenType("yt")}
                >
                  YT {coinConfig?.coinName}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />
      {isConnected && !isLoading && (
        <div className="bg-[#44E0C30F]/[0.08] px-6 py-4 flex flex-col gap-y-2 w-full mt-6 rounded-lg">
          <div className="flex items-center justify-between">
            {tokenType === "pt" ? (
              <span className="text-[#44E0C3] text-sm">
                Fixed return after{" "}
                {dayjs(
                  parseInt(coinConfig?.maturity || Date.now().toString()),
                ).diff(dayjs(), "day")}{" "}
                days
              </span>
            ) : (
              <span className="text-[#44E0C3] text-sm">
                If underlying APY remains same
              </span>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#20283C] rounded-md border-none">
                  {tokenType === "pt" ? (
                    <p>
                      You can sell PT prior to maturity. Alternatively, you can
                      hold PT until maturity to obtain a fixed return.
                    </p>
                  ) : (
                    <p>
                      If the underlying APY increases, your actual returns will
                      also increase. Conversely, if it decreases, your returns
                      will be reduced.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-between">
            {tokenType === "pt" ? (
              <div className="flex items-center gap-x-2">
                <img
                  className="size-6"
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                />
                <div className="flex flex-col gap-y-0.5">
                  <span className="text-white text-sm space-x-1">
                    <span>
                      {formatDecimalValue(
                        new Decimal(swapValue || 0).mul(ratio || 0),
                        coinConfig?.decimal,
                      )}
                    </span>
                    {coinConfig?.underlyingCoinName && (
                      <span>{coinConfig.underlyingCoinName}</span>
                    )}
                  </span>
                  <span className="text-white/60 text-xs">
                    $
                    {new Decimal(swapValue || 0)
                      .mul(coinConfig?.coinPrice || 0)
                      .mul(ratio || 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <span>YT APY</span>
            )}

            {tokenType === "pt" ? (
              <span className="text-[#44E0C3] text-sm space-x-1">
                <span>
                  {new Decimal(swapValue || 0)
                    .mul(ratio || 0)
                    .mul(
                      new Decimal(coinConfig?.sCoinPrice || 0).minus(
                        coinConfig?.coinPrice || 0,
                      ),
                    )
                    .toFixed(2)}
                </span>
                {coinConfig?.underlyingCoinName && (
                  <span>{coinConfig.underlyingCoinName}</span>
                )}
              </span>
            ) : (
              <span className="text-[#44E0C3] text-sm">
                {coinConfig?.ytApy ?? 0} %
              </span>
            )}
          </div>
        </div>
      )}
      <ActionButton
        btnText="Buy"
        onClick={mint}
        openConnect={openConnect}
        setOpenConnect={setOpenConnect}
        insufficientBalance={insufficientBalance}
        disabled={["", undefined].includes(swapValue)}
      />
    </div>
  )
}
