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

export const formatDecimalValue = (
  _value?: string | number | Decimal,
  decimal = 0,
): string => {
  const value = _value instanceof Decimal ? _value : new Decimal(_value || 0)
  return value.decimalPlaces() > decimal
    ? value.toFixed(decimal)
    : value.toFixed(value.decimalPlaces())
}

export const safeDivide = (str?: string | number): number => {
  const num = Number(str)
  if (isNaN(num) || num === 0) {
    return 1
  }
  return num
}

export const splitSyAmount = (syAmount: string) => {
  const ptValue = new Decimal(syAmount).div(2).toFixed(0)
  const syValue = ptValue
  return { ptValue, syValue }
}
