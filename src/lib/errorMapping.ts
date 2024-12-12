const errorMapping: { [key: number]: string } = {
  257: "Whitelist error", // 0x0000101
  258: "Sy zero deposit", // 0x0000102
  259: "Sy insufficient sharesOut", // 0x0000103
  260: "Sy zero redeem", // 0x0000104
  261: "Sy insufficient amountOut", // 0x0000105
  513: "Interest fee rate too high", // 0x0000201
  514: "Reward fee rate too high", // 0x0000202
  515: "Factory zero expiry divisor", // 0x0000203
  516: "Factory invalid expiry", // 0x0000204
  517: "Factory invalid yt amount", // 0x0000205
  518: "Py contract exists", // 0x0000206
  519: "Mismatch yt pt tokens", // 0x0000207
  520: "Factory yc expired", // 0x0000208
  521: "Factory yc not expired", // 0x0000209
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
  790: "Market ln implied rate is zero", // 0x0000316
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
  807: "Acl invalid permission", // 0x0000327
  808: "Register sy invalid sender", // 0x0000328
  809: "Sy not supported", // 0x0000329
  816: "Register sy type already registered", // 0x0000330
  817: "Register sy type not registered", // 0x0000331
  818: "Sy insufficient repay", // 0x0000332
  819: "Factory invalid py", // 0x0000333
  820: "Invalid py amount", // 0x0000334
  821: "Market insufficient pt in for mint lp", // 0x0000335
  822: "Market invalid py state", // 0x0000336
  823: "Market invalid market position", // 0x0000337
  824: "Market lp amount is zero", // 0x0000338
  825: "Market insufficient lp for burn", // 0x0000339
  832: "Market insufficient yt balance swap", // 0x0000340
  833: "Invalid flash loan position", // 0x0000341
  834: "Version mismatch error", // 0x0000342
  835: "Update config invalid sender", // 0x0000343
  836: "Create market invalid sender", // 0x0000344
  837: "Invalid epoch", // 0x0000345
  838: "Swap exact yt amount mismatch", // 0x0000346

  65537: "Denominator error", // 0x10001
  131074: "The quotient value would be too large to be held in a u128", // 0x20002
  131075: "The multiplied value would be too large to be held in a u128", // 0x20003
  65540: "A division by zero was encountered", // 0x10004
  131077:
    "The computed ratio when converting to a FixedPoint64 would be unrepresentable", // 0x20005
  65542: "Abort code on calculation result is negative", // 0x10006
}

export default errorMapping

function getErrorMessage(errorCode: number, errorString: string): string {
  return errorMapping[errorCode] || errorString
}

export const parseErrorMessage = (errorString: string) => {
  const errorCodeMatch = errorString.match(/(\d+)\) in command/)
  const errorCode = errorCodeMatch
    ? parseInt(
        errorCodeMatch[1] || errorCodeMatch[0],
        errorCodeMatch[1] ? 10 : 16,
      )
    : null

  return errorCode ? getErrorMessage(errorCode, errorString) : errorString
}
