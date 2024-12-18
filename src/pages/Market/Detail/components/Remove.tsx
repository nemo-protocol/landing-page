import Decimal from "decimal.js"
import { network, debugLog, DEBUG } from "@/config"
import { useMemo, useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Transaction } from "@mysten/sui/transactions"
import usePyPositionData from "@/hooks/usePyPositionData"
import { useCoinConfig, useQueryLPRatio, useCoinInfoList } from "@/queries"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { initPyPosition, mergeLppMarketPositions } from "@/lib/txHelper"
import { useWallet, ConnectModal } from "@aricredemption/wallet-kit"
import { ChevronsDown } from "lucide-react"
import AmountInput from "@/components/AmountInput"
import dayjs from "dayjs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export default function Remove() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [lpValue, setLpValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()
  const [isInputLoading, setIsInputLoading] = useState(false)
  const [selectedPool, setSelectedPool] = useState("")
  const navigate = useNavigate()
  const { data: list } = useCoinInfoList()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading } = useCoinConfig(coinType, maturity)

  const { data: dataRatio } = useQueryLPRatio(
    address,
    coinConfig?.marketStateId,
  )
  const ratio = useMemo(() => dataRatio?.syLpRate || 0, [dataRatio])

  const { data: lppMarketPositionData } = useLpMarketPositionData(
    address,
    coinConfig?.marketStateId,
    coinConfig?.maturity,
    coinConfig?.marketPositionTypeList,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const lpCoinBalance = useMemo(() => {
    if (lppMarketPositionData?.length) {
      return lppMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(9)
    }
    return 0
  }, [coinConfig?.decimal, lppMarketPositionData])

  const insufficientBalance = useMemo(
    () => new Decimal(lpCoinBalance).lt(new Decimal(lpValue || 0)),
    [lpCoinBalance, lpValue],
  )

  useEffect(() => {
    if (lpValue) {
      setIsInputLoading(true)
      const timer = setTimeout(() => {
        setIsInputLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [lpValue])

  async function remove() {
    if (
      address &&
      coinType &&
      coinConfig &&
      !insufficientBalance &&
      lppMarketPositionData?.length
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

        const mergedPositionId = mergeLppMarketPositions(
          tx,
          coinConfig,
          lppMarketPositionData,
          lpValue,
          coinConfig.decimal,
        )

        const burnLpMoveCall = {
          target: `${coinConfig.nemoContractId}::market::burn_lp`,
          arguments: [
            coinConfig.version,
            new Decimal(lpValue).mul(1e9).toFixed(0),
            "pyPosition",
            coinConfig.marketStateId,
            "mergedPositionId",
          ],
          typeArguments: [coinConfig.syCoinType],
        }
        debugLog("burn_lp move call:", burnLpMoveCall)

        const [sy] = tx.moveCall({
          ...burnLpMoveCall,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(new Decimal(lpValue).mul(1e9).toFixed(0)),
            pyPosition,
            tx.object(coinConfig.marketStateId),
            mergedPositionId,
          ],
        })

        const redeemMoveCall = {
          target: `${coinConfig.nemoContractId}::sy::redeem`,
          arguments: [
            coinConfig.version,
            "sy",
            new Decimal(0).toFixed(0),
            coinConfig.syStateId,
          ],
          typeArguments: [coinConfig.coinType, coinConfig.syCoinType],
        }
        debugLog("sy::redeem move call:", redeemMoveCall)

        const [yieldToken] = tx.moveCall({
          ...redeemMoveCall,
          arguments: [
            tx.object(coinConfig.version),
            sy,
            tx.pure.u64(new Decimal(0).toFixed(0)),
            tx.object(coinConfig.syStateId),
          ],
        })

        tx.transferObjects([yieldToken], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        //TODO : handle error
        // if (res.effects?.status.status === "failure") {
        //   setOpen(true)
        //   setStatus("Failed")
        //   setTxId(res.digest)
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
        setTxId(res.digest)
        setOpen(true)
        setLpValue("")
        setStatus("Success")
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <div className="w-full mb-4">
          <Select
            value={selectedPool}
            onValueChange={(item) => {
              setSelectedPool(item)
              const [coinAddress, maturity] = item.split("-")
              navigate(`/market/detail/${coinAddress}/${maturity}/remove`, {
                replace: true,
              })
            }}
          >
            <SelectTrigger className="w-full text-wrap border-none bg-[#131520] h-auto p-3 rounded-2xl">
              <div className="flex items-center gap-x-3">
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-8 lg:size-10"
                />
                <h2 className="text-lg lg:text-xl font-normal text-left">
                  {coinConfig?.coinName || "Select a pool"}
                  {coinConfig?.maturity &&
                    ` - ${dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")}`}
                </h2>
              </div>
            </SelectTrigger>
            <SelectContent className="border-none bg-[#131520]">
              <SelectGroup className="flex flex-col gap-y-2">
                {list?.map((item) => (
                  <SelectItem
                    className="flex items-center justify-between hover:bg-[#0E0F16] cursor-pointer py-4 rounded-md"
                    key={item.coinAddress + "-" + item.maturity}
                    value={item.coinAddress + "-" + item.maturity}
                  >
                    {item.coinName}-
                    {dayjs(parseInt(item.maturity)).diff(dayjs(), "day")}DAYS
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <h2 className="text-center text-xl">Remove Liquidity</h2>

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

        <AmountInput
          amount={lpValue}
          price={coinConfig?.lpPrice}
          decimal={coinConfig?.decimal}
          coinName={coinConfig?.coinName}
          coinLogo={coinConfig?.coinLogo}
          isLoading={isLoading}
          isConnected={isConnected}
          coinBalance={lpCoinBalance}
          onChange={setLpValue}
          coinNameComponent={
            <span className="text-base">LP {coinConfig?.coinName}</span>
          }
        />

        <ChevronsDown className="size-6" />

        <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
          <div className="flex flex-col items-end gap-y-1">
            <div className="flex items-center justify-between w-full">
              <span>Receiving</span>
              <span className="flex items-center gap-x-1.5">
                {isInputLoading || isLoading ? (
                  <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
                ) : lpValue && ratio ? (
                  <>
                    <span>{new Decimal(lpValue).div(ratio).toString()}</span>
                    <span>{coinConfig?.coinName}</span>
                    {coinConfig?.coinLogo && (
                      <img
                        src={coinConfig.coinLogo}
                        alt={coinConfig.coinName}
                        className="size-[28px]"
                      />
                    )}
                  </>
                ) : (
                  "--"
                )}
              </span>
            </div>
            <div className="text-xs text-white/60">
              {coinConfig?.maturity
                ? dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")
                : "--"}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isConnected ? (
          <ConnectModal
            open={openConnect}
            onOpenChange={(isOpen) => setOpenConnect(isOpen)}
          >
            <button className="mt-4 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-12 hover:bg-[#0F60FF]/90 transition-colors">
              Connect Wallet
            </button>
          </ConnectModal>
        ) : insufficientBalance ? (
          <div className="mt-4 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-12 flex items-center justify-center">
            Insufficient Balance
          </div>
        ) : (
          <button
            onClick={remove}
            disabled={
              lpValue === "" ||
              lpValue === "0" ||
              insufficientBalance ||
              new Decimal(lpValue).toNumber() === 0
            }
            className={[
              "mt-4 px-8 py-2.5 rounded-full w-full h-12 transition-colors",
              lpValue === "" ||
              lpValue === "0" ||
              insufficientBalance ||
              new Decimal(lpValue).toNumber() === 0
                ? "bg-[#0F60FF]/50 text-white/50"
                : "bg-[#0F60FF] text-white hover:bg-[#0F60FF]/90",
            ].join(" ")}
          >
            Remove Liquidity
          </button>
        )}
      </div>
    </div>
  )
}
