import React from "react"
import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"

interface ActionButtonProps {
  btnText: string
  tokenType: number
  disabled: boolean
  onClick: () => void
  openConnect: boolean
  insufficientBalance: boolean
  setOpenConnect: (isOpen: boolean) => void
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  btnText,
  disabled,
  tokenType,
  openConnect,
  setOpenConnect,
  insufficientBalance,
}) => {
  const { isConnected } = useCurrentWallet()
  return (
    <>
      {!isConnected ? (
        <ConnectModal
          open={openConnect}
          onOpenChange={(isOpen) => setOpenConnect(isOpen)}
          trigger={
            <button className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-14 cursor-pointer">
              Connect Wallet
            </button>
          }
        />
      ) : insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-14 cursor-pointer flex items-center justify-center">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full h-14",
            disabled
              ? "bg-[#0F60FF]/50 text-white/50 cursor-not-allowed"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          {/* TODO : remove tokenType */}
          {tokenType === 0 ? "Coming soon" : btnText}
        </button>
      )}
    </>
  )
}

export default ActionButton
