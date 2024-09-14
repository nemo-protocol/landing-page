import { nemoApi } from "./request"
import { useQuery } from "@tanstack/react-query"
import { CoinInfo, CoinConfig } from "./types/market"

function getCoinInfoList(name = "", address = "") {
  return nemoApi<CoinInfo[]>("/api/v1/market/coinInfo").get({
    name,
    address,
  })
}

function getCoinConfig(coinType: string) {
  // return nemoApi<CoinConfig>("/api/v1/market/config/detail").get({
  //   coinType,
  // })
  return {
    yieldFactoryConfigId:
      "0x9bdd4da497e1741692fc16a92f0ac105d73f0316fb096ff9abd690511c3d9e01",
    syStructId:
      "0x93cbfddd901ef21e2b8c237198d57cd921fefdc8d735a18edd2afa33d302b68f",
    yieldTokenStoreId: "",
    tokenConfigId:
      "0x0b4672e4ac2c3c6b6ad8071d4945ec86efb43e3e8e9dc218b282ed2035c54b43",
    ytStructId:
      "0x95b33e9e47ac1cbfd487f30bdc5987250445c08e90ab054f5593fdd17635796a",
    ptStructId:
      "0x024896b3415ac5536c21f21541505b8145ea374b8cd6fe22afb686467376d3b4",
    coinType,
    marketStateId:
      "0x3a44223c9a0626b1c8983a230d3fd904f30ed89d583eac5a12571e18e33a59fc",
    marketConfigId:
      "0x0c87654918508e6177cebb22b95e462744e42cfa6d38b21d522ec2e14bc5e741",
  } as CoinConfig
}

export function useCoinInfoList(name = "", address = "") {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinInfoList", name, address],
    queryFn: () => getCoinInfoList(name, address),
  })
}

export function useCoinConfig(coinType: string) {
  return useQuery({
    // FIXME： queryKey dose not work
    queryKey: ["coinConfig", coinType],
    queryFn: () => getCoinConfig(coinType),
  })
}
