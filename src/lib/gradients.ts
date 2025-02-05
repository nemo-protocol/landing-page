export const BgGradientMap: Record<string, string> = {
  "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI":
    "linear-gradient(23deg, rgba(14, 15, 23, 0.65) 39.17%, rgba(0, 116, 255, 0.55) 110%)",
  "0xad4d71551d31092230db1fd482008ea42867dbf27b286e9c70a79d2a6191d58d::scallop_wormhole_usdc::SCALLOP_WORMHOLE_USDC":
    "linear-gradient(30.78deg, rgb(14, 15, 23) 38.43%, rgb(0, 59, 145) 180.85%)",
  "0xe6e5a012ec20a49a3d1d57bd2b67140b96cd4d3400b9d79e541f7bdbab661f95::scallop_wormhole_usdt::SCALLOP_WORMHOLE_USDT":
    "linear-gradient(34.52deg, #040A09 46.13%, rgba(0, 61, 51, 0.59) 93.67%)",
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
    "linear-gradient(26.01deg, rgba(23, 16, 14, 0.65) 37.24%, #391E1C 105.7%)",
  "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI":
    "linear-gradient(22.88deg, color(display-p3 0.055 0.059 0.086 / 0.65) 39.17%, color(display-p3 0.427 0.835 1.000 / 0.22) 105.29%)",
  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI":
    "linear-gradient(23.46deg, rgba(14, 15, 23, 0.65) 29.03%, rgba(128, 79, 13, 0.33) 100.82%)",
  "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI":
    "linear-gradient(22.88deg, rgba(26, 52, 56, 0.21) 39.17%, rgba(0, 207, 179, 0.48) 105.29%)",
  "0xeb7a05a3224837c5e5503575aed0be73c091d1ce5e43aa3c3e716e0ae614608f::scallop_deep::SCALLOP_DEEP":
    "linear-gradient(315deg, #000120 11.41%, #0032B4 168.05%)",
}

export const getBgGradient = (coinType: string): string => {
  return BgGradientMap[coinType] || "#0E0F16"
}
