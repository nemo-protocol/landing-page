import { network } from "@/config"

export const PackageAddress =
  network === "mainnet"
    ? import.meta.env.VITE_MAINNET_CONTRACT
    : import.meta.env.VITE_TESTNET_CONTRACT
