import { useState } from "react"
import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface RefreshButtonProps {
  onRefresh: () => void
  size?: number
  className?: string
}

export default function RefreshButton({ 
  onRefresh,
  size = 16,
  className = ""
}: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  const handleClick = () => {
    setIsSpinning(true)
    const timer = setTimeout(() => {
      setIsSpinning(false)
      clearTimeout(timer)
    }, 1000)
    onRefresh()
  }

  return (
    <RotateCw
      style={{ width: size, height: size }}
      className={cn(
        "cursor-pointer",
        isSpinning && "animate-spin",
        className
      )}
      onClick={handleClick}
    />
  )
} 