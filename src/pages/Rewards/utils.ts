export function shortenString(str: string, length: number = 6): string {
  if (!str || str.length <= length * 2) {
    return str; // 如果字符串长度小于或等于两倍的保留长度，则不做修改
  }
  const start = str.slice(0, length); // 取前 `length` 位
  const end = str.slice(-length); // 取后 `length` 位
  return `${start}...${end}`;
}