import React from "react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

interface TransactionStatusDialogProps {
  open: boolean
  status?: "Success" | "Failed"
  network: string
  txId: string
  message?: string
  onClose: () => void
}

const TransactionStatusDialog: React.FC<TransactionStatusDialogProps> = ({
  open,
  status,
  network,
  txId,
  message,
  onClose,
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-[#0e0f15] border-none rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-white">
            {status}
          </AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col items-center">
            {status === "Success" ? <SuccessIcon /> : <FailIcon />}
            {status === "Success" && (
              <div className="py-2 flex flex-col gap-y-1 items-center">
                <p className=" text-white/50">Transaction submitted!</p>
                <a
                  className="text-[#8FB5FF] underline"
                  href={`https://suiscan.xyz/${network}/tx/${txId}`}
                  target="_blank"
                >
                  View details
                </a>
              </div>
            )}
            {status === "Failed" && (
              <div className="py-2 flex flex-col gap-y-1 items-center">
                <p className=" text-red-400">Transaction Error</p>
                <p className="text-red-500 break-all">{message}</p>
                {txId && (
                  <a
                    className="text-red-500 underline"
                    href={`https://suiscan.xyz/${network}/tx/${txId}`}
                    target="_blank"
                  >
                    View details
                  </a>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-center">
          <button
            className="text-white w-36 rounded-3xl bg-[#0F60FF] py-1.5"
            onClick={onClose}
          >
            OK
          </button>
        </div>
        <AlertDialogFooter></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default TransactionStatusDialog
