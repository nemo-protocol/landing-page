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

export const debounce = <T extends (...args: string[]) => void>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func(...args)
    }, delay)
  }
}
