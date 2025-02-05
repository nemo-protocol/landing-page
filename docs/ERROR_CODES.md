# 🚨 Nemo Protocol Error Codes

## 📝 Overview
This document provides a comprehensive list of error codes and their descriptions that you may encounter while using the Nemo Protocol.

---

## 🏷️ Error Categories

### 💎 Standardized Token (SY) Errors
*Range: 0x0000100 - 0x0000104*

| Error Code | Description |
|:---:|:---|
| 257 (0x0000101) | Sy zero deposit - Attempted to deposit zero tokens |
| 258 (0x0000102) | Sy insufficient sharesOut - Not enough shares available for the operation |
| 259 (0x0000103) | Sy zero redeem - Attempted to redeem zero tokens |
| 260 (0x0000104) | Sy insufficient amountOut - Insufficient output amount for the operation |

### 🏭 Factory Related Errors
*Range: 0x0000201 - 0x0000210*

| Error Code | Description |
|:---:|:---|
| 513 (0x0000201) | Interest fee rate too high |
| 514 (0x0000202) | Reward fee rate too high |
| 515 (0x0000203) | Factory zero expiry divisor |
| 516 (0x0000204) | Factory invalid expiry |
| 517 (0x0000205) | Factory invalid yt amount |
| 518 (0x0000206) | Py contract exists |
| 519 (0x0000207) | Mismatch yt pt tokens |
| 520 (0x0000208) | Factory yc expired |
| 521 (0x0000209) | Factory yc not expired |
| 528 (0x0000210) | Invalid py state |

### 🏦 Market Related Errors
*Range: 0x0000301 - 0x0000345*

| Error Code | Description |
|:---:|:---|
| 769 (0x0000301) | Market scalar root below zero |
| 770 (0x0000302) | Market pt expired |
| 771 (0x0000303) | Market ln fee rate too high |
| 772 (0x0000304) | Market initial anchor too low |
| 773 (0x0000305) | Market factory reserve fee too high |
| 774 (0x0000306) | Market exists |
| 775 (0x0000307) | Market scalar root is zero |
| 776 (0x0000308) | Market pt amount is zero |
| 777 (0x0000309) | Market sy amount is zero |
| 784 (0x0000310) | Market expired |
| 785 (0x0000311) | Market liquidity too low |
| 786 (0x0000312) | Market exchange rate negative |
| 787 (0x0000313) | Market proportion too high |
| 788 (0x0000314) | Market proportion cannot be one |
| 789 (0x0000315) | Market exchange rate cannot be one |
| 790 (0x0000316) | Insufficient liquidity in the pool, please try a smaller amount |
| 791 (0x0000317) | Market burn sy amount is zero |
| 792 (0x0000318) | Market burn pt amount is zero |
| 793 (0x0000319) | Insufficient liquidity in the pool, please try a smaller amount |

### 🔐 System and Access Control Errors
*Range: 0x0000401 - 0x0000407*

| Error Code | Description |
|:---:|:---|
| 1025 (0x0000401) | Acl invalid permission |
| 1026 (0x0000402) | Acl role already exists |
| 1027 (0x0000403) | Acl role not exists |
| 1028 (0x0000404) | Version mismatch error |
| 1029 (0x0000405) | Update config invalid sender |
| 1031 (0x0000407) | Slippage is too low |

### 🧮 Calculation and Arithmetic Errors
*Range: 0x10001 - 0x20005*

| Error Code | Description |
|:---:|:---|
| 65537 (0x10001) | Denominator error |
| 65540 (0x10004) | A division by zero was encountered |
| 65542 (0x10006) | Abort code on calculation result is negative |
| 131074 (0x20002) | The quotient value would be too large to be held in a u128 |
| 131075 (0x20003) | The multiplied value would be too large to be held in a u128 |
| 131077 (0x20005) | The computed ratio when converting to a FixedPoint64 would be unrepresentable |

---

## ⚠️ Special Error Cases

### 💧 Flash Swap Liquidity Error
When encountering errors 790 or 793 (Insufficient liquidity in the pool), the following additional detail is provided:

> 📝 "To ensure the capital efficiency of the liquidity pool, Nemo's flash swap is utilized when selling YT, which requires higher liquidity. You can try swapping again later or reduce the selling amount."

### ⛽ Gas Fee Error
When encountering insufficient gas fee errors, the system will provide a detailed message including:

- 💰 Current balance in SUI
- 🎯 Required amount in SUI
- 📊 Shortfall amount
- 📋 Instructions to top up the balance

---

## 🔧 Common Solutions

### 1️⃣ Liquidity-related Errors (790, 793)
- 📉 Try reducing the transaction amount
- ⏳ Wait for more liquidity to be available in the pool
- 🔄 Try the transaction at a different time

### 2️⃣ Slippage Errors (1031)
- 🎚️ Adjust your slippage tolerance
- ⚙️ Try the transaction with a higher slippage setting

### 3️⃣ Gas-related Errors
- 💳 Ensure your wallet has sufficient SUI for gas fees
- 💰 Top up your wallet if needed

### 4️⃣ Market Expiry Errors (770, 784)
- ⏰ Check the market expiration time
- ✅ Ensure you're interacting with an active market 