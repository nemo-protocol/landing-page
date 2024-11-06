import { network } from "@/config"

export const PackageAddress =
  network === "mainnet"
    ? import.meta.env.VITE_MAINNET_CONTRACT
    : import.meta.env.VITE_TESTNET_CONTRACT

export const SYPackageAddress =
  network === "mainnet"
    ? import.meta.env.VITE_MAINNET_SY_CONTRACT
    : import.meta.env.VITE_TESTNET_SY_CONTRACT
