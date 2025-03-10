import { cn } from "@/lib/utils"
import React from "react"

interface SmallNumDisplayProps {
  value: number | string
  className?: string
}

const SmallNumDisplay: React.FC<SmallNumDisplayProps> = ({
  value,
  className,
}) => {
  const formatNumber = (num: number | string) => {
    const numStr = typeof num === "string" ? num : num.toString()

    // Split number into integer and decimal parts
    const [integerPart, decimalPart] = numStr.split(".")
    if (!decimalPart) return numStr

    // Find consecutive zeros in decimal part
    const match = decimalPart.match(/^(0+)[1-9]/)
    if (!match || match[1].length <= 2) return numStr

    const zeroCount = match[1].length
    const remainingDigits = decimalPart.slice(zeroCount)

    return (
      <span className={cn("shrink-0 text-nowrap", className)}>
        {integerPart}.0<sub>{zeroCount}</sub>
        {remainingDigits}
      </span>
    )
  }

  return formatNumber(value)
}

export default SmallNumDisplay
