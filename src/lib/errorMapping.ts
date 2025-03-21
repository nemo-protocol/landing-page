const errorMapping: { [key: number]: string } = {
  257: "Sy zero deposit", // 0x0000101
  258: "Sy insufficient sharesOut", // 0x0000102
  259: "Sy zero redeem", // 0x0000103
  260: "Sy insufficient amountOut", // 0x0000104
  513: "Interest fee rate too high", // 0x0000201
  514: "Reward fee rate too high", // 0x0000202
  515: "Factory zero expiry divisor", // 0x0000203
  516: "Factory invalid expiry", // 0x0000204
  517: "Factory invalid yt amount", // 0x0000205
  518: "Py contract exists", // 0x0000206
  519: "Mismatch yt pt tokens", // 0x0000207
  520: "Factory yc expired", // 0x0000208
  521: "Factory yc not expired", // 0x0000209
  528: "Invalid py state", // 0x0000210
  769: "Market scalar root below zero", // 0x0000301
  770: "Market pt expired", // 0x0000302
  771: "Market ln fee rate too high", // 0x0000303
  772: "Market initial anchor too low", // 0x0000304
  773: "Market factory reserve fee too high", // 0x0000305
  774: "Market exists", // 0x0000306
  775: "Market scalar root is zero", // 0x0000307
  776: "Market pt amount is zero", // 0x0000308
  777: "Market sy amount is zero", // 0x0000309
  784: "Market expired", // 0x0000310
  785: "Market liquidity too low", // 0x0000311
  786: "Market exchange rate negative", // 0x0000312
  787: "Market proportion too high", // 0x0000313
  788: "Market proportion cannot be one", // 0x0000314
  789: "Market exchange rate cannot be one", // 0x0000315
  790: "Market exchange rate below one", // 0x0000316
  791: "Market burn sy amount is zero", // 0x0000317
  792: "Market burn pt amount is zero", // 0x0000318
  793: "Market insufficient pt for swap", // 0x0000319
  800: "Market rate scalar negative", // 0x0000320
  801: "Market insufficient sy for swap", // 0x0000321
  802: "Repay sy in exceeds expected sy in", // 0x0000322
  803: "Market insufficient sy in for swap yt", // 0x0000323
  804: "Swapped sy borrowed amount not equal", // 0x0000324
  805: "Market cap exceeded", // 0x0000325
  806: "Invalid repay", // 0x0000326
  807: "Register sy invalid sender", // 0x0000327
  808: "Sy not supported", // 0x0000328
  809: "Register sy type already registered", // 0x0000329
  816: "Register sy type not registered", // 0x0000330
  817: "Sy insufficient repay", // 0x0000331
  818: "Factory invalid py", // 0x0000332
  819: "Invalid py amount", // 0x0000333
  820: "Market insufficient pt.", // 0x0000334
  821: "Market invalid py state", // 0x0000335
  822: "Market invalid market position", // 0x0000336
  823: "Market lp amount is zero", // 0x0000337
  824: "Market insufficient lp for burn", // 0x0000338
  825: "Market insufficient yt balance swap", // 0x0000339
  832: "Invalid flash loan position", // 0x0000340
  833: "Create market invalid sender", // 0x0000341
  834: "Invalid epoch", // 0x0000342
  835: "Swap exact yt amount mismatch", // 0x0000343
  836: "Insufficient lp output", // 0x0000344
  837: "Price fluctuation too large", // 0x0000345
  1025: "Acl invalid permission", // 0x0000401
  1026: "Acl role already exists", // 0x0000402
  1027: "Acl role not exists", // 0x0000403
  1028: "Version mismatch error", // 0x0000404
  1029: "Update config invalid sender", // 0x0000405
  1030: "Withdraw from treasury invalid sender", // 0x0000406
  1031: "Invalid yt approx out", // 0x0000407
  1032: "Invalid sy approx out", // 0x0000408
  1033: "Wrong slippage tolerance", // 0x0000409
  1280: "Invalid reward amount", // 0x0000500
  1281: "Invalid reward end time", // 0x0000501
  1282: "Emission exceeds total reward", // 0x0000502
  1283: "Pool rewarder already active", // 0x0000503
  1284: "Reward token type mismatch", // 0x0000504
  1285: "Pool rewarder not active", // 0x0000505
  1286: "Reward not harvested", // 0x0000506
  65537: "Denominator error", // 0x10001
  65542: "Abort code on calculation result is negative", // 0x10006
  131074: "The quotient value would be too large to be held in a u128", // 0x20002
  131075: "The multiplied value would be too large to be held in a u128", // 0x20003
  65540: "A division by zero was encountered", // 0x10004
  131077: "The computed ratio when converting to a FixedPoint64 would be unrepresentable", // 0x20005
}

export default errorMapping

function getErrorMessage(errorCode: number, errorString: string): string {
  return errorMapping[errorCode] || errorString
}

export const parseErrorMessage = (errorString: string) => {
  if (errorString.includes("OUT_OF_GAS")) {
    return { error: "Insufficient liquidity in the pool.", detail: "" }
  }
  const errorCodeMatch = errorString.match(/[^\d]*(\d+)\)/)

  const errorCode = errorCodeMatch
    ? parseInt(
        errorCodeMatch[1] || errorCodeMatch[0],
        errorCodeMatch[1] ? 10 : 16,
      )
    : null

  const detail =
    errorCode && [790, 793].includes(errorCode)
      ? "To ensure the capital efficiency of the liquidity pool, Nemo's flash swap is utilized when selling YT, which requires higher liquidity. You can try swapping again later or reduce the selling amount."
      : ""

  const error = errorCode
    ? getErrorMessage(errorCode, errorString)
    : errorString

  return { error, detail }
}

export function parseGasErrorMessage(msg: string) {
  const match = msg.match(
    /Balance of gas object (\d+) is lower than the needed amount: (\d+)/,
  )

  if (match) {
    const currentBalance = parseInt(match[1], 10) / 1e9
    const neededAmount = parseInt(match[2], 10) / 1e9
    const shortfall = neededAmount - currentBalance

    return `Insufficient gas fee. Your current balance is ${currentBalance} SUI, but at least ${neededAmount} SUI is required. You are short by ${shortfall} SUI. Please top up your balance and try again.`
  }
}
