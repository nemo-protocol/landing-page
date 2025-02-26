import React, { useMemo } from "react"
import { ConnectModal, useWallet } from "@nemoprotocol/wallet-kit"

interface ActionButtonProps {
  btnText: string
  loading?: boolean
  disabled: boolean
  onClick: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  btnText,
  disabled,
  loading = false,
}) => {
  const { address } = useWallet()

  const isConnected = useMemo(() => !!address, [address])
  return (
    <>
      {!isConnected ? (
        <ConnectModal
          children={
            <button className="mt-5 sm:mt-7.5 px-4 sm:px-8 py-2 sm:py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-10 sm:h-14 text-sm sm:text-base cursor-pointer">
              Connect Wallet
            </button>
          }
        />
      ) : disabled ? (
        <div className="mt-5 sm:mt-7.5 px-4 sm:px-8 py-2 sm:py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-10 sm:h-14 text-sm sm:text-base cursor-pointer flex items-center justify-center">
          {btnText}
        </div>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled || loading}
          className={[
            "mt-5 sm:mt-7.5 px-4 sm:px-8 py-2 sm:py-2.5 rounded-full w-full h-10 sm:h-14 text-sm sm:text-base flex items-center justify-center gap-1.5 sm:gap-2",
            disabled || loading
              ? "bg-[#0F60FF]/50 text-white/50 cursor-not-allowed"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          {loading && (
            <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-2 border-b-transparent border-white/50" />
          )}
          {loading ? "Processing..." : btnText}
        </button>
      )}
    </>
  )
}

export default ActionButton
