import dayjs from "dayjs"
import Decimal from "decimal.js"
import { twMerge } from "tailwind-merge"
import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const truncateStr = (str: string, charsPerSide = 4) => {
  if (str.length < charsPerSide * 4) {
    return str
  }
  return `${str.slice(0, charsPerSide)}...${str.slice(-charsPerSide)}`
}

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): T & { cancel: () => void } => {
  let timeout: NodeJS.Timeout | null = null

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced as T & { cancel: () => void }
}

/**
 * Formats a number with optional decimal places and unit suffixes
 * @param value The number to format
 * @param decimal Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const formatDecimalValue = (
  _value?: string | number | Decimal,
  decimal = 0,
): string => {
  const value = _value instanceof Decimal ? _value : new Decimal(_value || 0)
  return value.decimalPlaces() > decimal
    ? value.toFixed(Number(decimal))
    : value.toFixed(value.decimalPlaces())
}

export const splitSyAmount = (
  syAmount: string,
  lpSupply: string,
  totalSy: string,
  totalPt: string,
  exchangeRate: string,
  pyIndexStored: string,
) => {
  const result = getMintLpParameter(
    syAmount,
    lpSupply,
    totalSy,
    totalPt,
    exchangeRate,
    pyIndexStored,
  )
  const syForPtValue = result?.syForPt.toFixed(0) || "1"
  const syValue = result?.syDesired.toFixed(0) || "1"
  const ptValue = result?.pt.toFixed(0) || "1"
  return { syForPtValue, syValue, ptValue }
}

function getMintLpParameter(
  syAmount: string,
  lpSupply: string,
  totalSy: string,
  totalPt: string,
  exchangeRate: string,
  pyIndexStored: string,
): { syForPt: number; syDesired: number; pt: number } | null {
  const total_sy = Number(syAmount)
  const lp_supply = Number(lpSupply)
  const total_sy_reserve = Number(totalSy)
  const total_pt_reserve = Number(totalPt)
  const exchange_rate_num = Number(exchangeRate)
  const py_index_stored_num = Number(pyIndexStored)
  if (lpSupply == "0") {
    const syIn = new Decimal(syAmount).div(2).toString()
    const max_rate = get_max_rate(exchange_rate_num, py_index_stored_num)
    const ptIn = new Decimal(syAmount).div(2).mul(max_rate).toString()
    const syInNumber = Number(syIn)
    const ptInNumber = Number(ptIn)
    return {
      syForPt: ptInNumber,
      syDesired: syInNumber,
      pt: get_pt_out(ptInNumber, exchange_rate_num, py_index_stored_num),
    }
  }
  let left = 0
  let right = total_sy
  let sy_for_pt = -1 // 初始化为无效值，表示未找到

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    const net_lp_by_pt =
      (get_pt_out(mid, exchange_rate_num, py_index_stored_num) * lp_supply) /
      total_pt_reserve
    const sy_desired =
      (total_sy_reserve * net_lp_by_pt + (lp_supply - 1)) / lp_supply
    if (total_sy >= mid + sy_desired && total_sy <= mid + sy_desired + 100) {
      sy_for_pt = mid
      return {
        syForPt: sy_for_pt,
        syDesired: sy_desired,
        pt: get_pt_out(sy_for_pt, exchange_rate_num, py_index_stored_num),
      }
    } else if (mid + sy_desired < total_sy) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return null // 未找到结果时返回 null
}

function get_max_rate(exchange_rate: number, py_index_stored: number): number {
  return Math.max(exchange_rate / 2 ** 64, py_index_stored / 2 ** 64)
}

export function get_pt_out(
  syAmount: number,
  exchange_rate: number,
  py_index_stored: number,
): number {
  const max_rate = Math.max(exchange_rate / 2 ** 64, py_index_stored / 2 ** 64)
  return syAmount * max_rate
}

/**
 * Recursively handles +Inf/-Inf values in an object, converting them to empty strings
 * @param data The data object to process
 * @returns Processed data with Infinity values converted to empty strings
 */
export function handleInfinityValues<T>(data: T): T {
  if (typeof data !== "object" || data === null) return data

  const result = Array.isArray(data) ? [...data] : { ...data }

  Object.entries(result).forEach(([key, value]) => {
    if (typeof value === "string" && (value === "+Inf" || value === "-Inf")) {
      const typedResult = result as Record<string, unknown>
      typedResult[key] = ""
    } else if (typeof value === "object" && value !== null) {
      const typedResult = result as Record<string, unknown>
      typedResult[key] = handleInfinityValues(value)
    }
  })

  return result as T
}

/**
 * Checks if a string amount is valid (not empty, not "0", and is a valid number)
 * @param amount The amount string to check
 * @returns boolean indicating if the amount is valid
 */
export const isValidAmount = (
  amount?: string | number | Decimal | null,
): boolean => {
  if (
    !amount ||
    amount === 0 ||
    amount === "" ||
    amount === "0" ||
    new Decimal(amount).isZero()
  )
    return false
  const num = Number(amount)
  return !isNaN(num) && num > 0
}

/**
 * Formats time difference to display string
 * @param timestamp Unix timestamp to compare with current time
 * @returns Formatted string like "5 DAYS", "3 HOURS", "2 MINS", "30 SECS" or "END"
 */
export const formatTimeDiff = (timestamp: number): string => {
  const maturityTime = dayjs(timestamp)
  const now = dayjs()
  const diffSeconds = maturityTime.diff(now, "second")

  if (diffSeconds <= 0) {
    return "Pool Expired"
  }

  const diffDays = maturityTime.diff(now, "day")
  if (diffDays > 0) {
    return `${diffDays} DAYS`
  }
  const diffHours = maturityTime.diff(now, "hour")
  if (diffHours > 0) {
    return `${diffHours} HOURS`
  }
  const diffMinutes = maturityTime.diff(now, "minute")
  if (diffMinutes > 0) {
    return `${diffMinutes} MINS`
  }
  return `${diffSeconds} SECS`
}

type DivideReturnType<T> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : Decimal

export const safeDivide = <T extends "string" | "number" | "decimal">(
  numerator?: string | number | Decimal,
  denominator?: string | number | Decimal,
  returnType: T = "string" as T,
): DivideReturnType<T> => {
  try {
    const num = new Decimal(numerator || 0)
    const den = new Decimal(denominator || 0)

    if (!isValidAmount(denominator)) {
      return (
        returnType === "string"
          ? "0"
          : returnType === "number"
            ? 0
            : new Decimal(0)
      ) as DivideReturnType<T>
    }

    const result = num.div(den)

    return (
      returnType === "number"
        ? result.toNumber()
        : returnType === "decimal"
          ? result
          : result.toString()
    ) as DivideReturnType<T>
  } catch {
    return (
      returnType === "string"
        ? "0"
        : returnType === "number"
          ? 0
          : new Decimal(0)
    ) as DivideReturnType<T>
  }
}

/**
 * Formats a number to a human readable string with K, M, B, T suffixes
 * @param value The number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string like "1.23K" or "1.23M"
 */
export const formatLargeNumber = (
  value?: string | number | Decimal,
  decimals = 2,
): string => {
  try {
    if (!value) return "0"

    const num = new Decimal(value)
    const abs = num.abs()

    // Return infinity symbol if value exceeds 1000T
    if (abs.greaterThanOrEqualTo(new Decimal("1e15"))) {
      return "∞"
    }

    if (abs.lessThan(1000000)) {
      return formatDecimalValue(num, decimals)
    }

    const suffixes = ["", "M", "B", "T"]
    const magnitude = Math.min(Math.floor(abs.log(1000000).toNumber()), 3)

    return formatDecimalValue(
      num.div(new Decimal(1000000).pow(magnitude)),
      decimals,
    ).concat(suffixes[magnitude])
  } catch {
    return "0"
  }
}
