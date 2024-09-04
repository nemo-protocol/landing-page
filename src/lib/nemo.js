import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"

async function main() {
  const mnemonic =
    "cabin utility humor physical crush uniform lumber letter twin couch cargo tree"
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic)
  const address = keypair.getPublicKey().toSuiAddress()
  console.log("address", address)

  const rpcUrl = getFullnodeUrl("testnet")
  const client = new SuiClient({ url: rpcUrl })

  const Package =
    "0x21d459a82d58db2d0c81ea04c46c479ee9d652ffdf1da310fc08a4327b43ceda"
  const SyFunctionName = Package + "::sy_sSui::create"

  const result = await syFunc(SyFunctionName, client, keypair)
  console.log("result", result)
  const shareSy = result.effects.created.reference.objectId

  //这一步卡住
  // const depositFunction = Package+'::sy_sSui::deposit'
  // const depositResult = await deposit()
}

async function syFunc(target, client, keypair) {
  let tx = new Transaction()
  tx.moveCall({
    target,
    arguments: [],
    typeArguments: ["0x2::sui::SUI"],
  })
  tx.setGasBudget(3000000)

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
  })
  console.log("result", result)

  return result
}

async function deposit(syStructId, recvAddr) {
  let tx = new Transaction()
  tx.moveCall({
    target: target, //方法
    arguments: [],
    typeArguments: ["0x2::sui::SUI"], // type arguments
  })
  tx.setGasBudget(3000000)

  //第一步

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
  })
  console.log("result", result)

  return result
}

main()
