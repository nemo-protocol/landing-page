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

// export const splitSyAmount = (syAmount: string, lpSupply: string, totalSy: string, totalPt: string, exchange_rate: string, py_index_stored: string) => {
//   getMintLpParameter(syAmount, lpSupply, totalSy, totalPt, exchange_rate, py_index_stored)
//   const ptValue = new Decimal(syAmount).div(2).toFixed(0)
//   const syValue = ptValue
//   return { ptValue, syValue }
// }

export const splitSyAmount = (syAmount: string) => {
  const ptValue = new Decimal(syAmount).div(2).toFixed(0)
  const syValue = ptValue
  return { ptValue, syValue }
}


// function getMintLpParameter(
//   syAmount: string,
//   lpSupply: string,
//   totalSy: string,
//   totalPt: string,
//   exchange_rate: string,
//   py_index_stored: string
// ): { syForPt: number; syDesired: number } | null {
//   const total_sy = Number(syAmount);
//   const lp_supply = Number(lpSupply);
//   const total_sy_reserve = Number(totalSy);
//   const total_pt_reserve = Number(totalPt);
//   const exchange_rate_num = Number(exchange_rate);
//   const py_index_stored_num = Number(py_index_stored);
//   let left = 0;
//   let right = total_sy;
//   let sy_for_pt = -1; // 初始化为无效值，表示未找到

//   while (left <= right) {
//     const mid = Math.floor((left + right) / 2);

//     const net_lp_by_pt = (get_pt_out(mid,exchange_rate_num, py_index_stored_num) * lp_supply) / total_pt_reserve;
//     const sy_desired =
//       (total_sy_reserve * net_lp_by_pt + (lp_supply - 1)) / lp_supply;

//     if (total_sy - (mid + sy_desired) <= 100 ) {
//       sy_for_pt = mid;
//       return { syForPt: sy_for_pt, syDesired: sy_desired };
//     } else if (mid + sy_desired < total_sy) {
//       left = mid + 1;
//     } else {
//       right = mid - 1;
//     }
//   }

//   return null; // 未找到结果时返回 null
// }

// function get_pt_out(syAmount: number, exchange_rate: number, py_index_stored: number): number {
//   const max_rate = Math.max(exchange_rate, py_index_stored);
//   return syAmount * max_rate;
// }

