import {
  ConnectButton,
  useWallet,
  SuiChainId,
  ErrorCode,
  useSuiClient,
} from "@nemoprotocol/wallet-kit"
import "@nemoprotocol/wallet-kit/style.css"
import { Transaction } from "@mysten/sui/transactions"
import { useMemo } from "react"
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519"
import { Buffer } from "buffer"

const sampleNft = new Map([
  [
    "sui:devnet",
    "0xe146dbd6d33d7227700328a9421c58ed34546f998acdc42a1d05b4818b49faa2::nft::mint",
  ],
  [
    "sui:testnet",
    "0x5ea6aafe995ce6506f07335a40942024106a57f6311cb341239abf2c3ac7b82f::nft::mint",
  ],
  [
    "sui:mainnet",
    "0x5b45da03d42b064f5e051741b6fed3b29eb817c7923b83b92f37a1d2abf4fbab::nft::mint",
  ],
])

function createMintNftTxb(contractAddress: string) {
  const tx = new Transaction()
  tx.moveCall({
    target: contractAddress,
    arguments: [
      tx.pure.string("Suiet NFT"),
      tx.pure.string("Suiet Sample NFT"),
      tx.pure.string(
        "https://xc6fbqjny4wfkgukliockypoutzhcqwjmlw2gigombpp2ynufaxa.arweave.net/uLxQwS3HLFUailocJWHupPJxQsli7aMgzmBe_WG0KC4",
      ),
    ],
  })
  return tx
}

function App() {
  const wallet = useWallet()
  const client = useSuiClient()

  const nftContractAddr = useMemo(() => {
    if (!wallet.chain) return ""
    return sampleNft.get(wallet.chain.id) ?? ""
  }, [wallet])

  function uint8arrayToHex(value: Uint8Array | undefined) {
    if (!value) return ""
    return Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  async function handleSignAndExecuteTransaction(
    target: string | undefined,
    opts?: {
      isCustomExecution?: boolean
    },
  ) {
    if (!target) return
    try {
      const tx = createMintNftTxb(target)

      if (!opts?.isCustomExecution) {
        const resData = await wallet.signAndExecuteTransaction({
          transaction: tx,
        })
        console.log("signAndExecuteTransaction success", resData)
      } else {
        const resData = await wallet.signAndExecuteTransaction(
          {
            transaction: tx,
          },
          {
            execute: async ({ bytes, signature }) => {
              return await client.executeTransactionBlock({
                transactionBlock: bytes,
                signature: signature,
                options: {
                  showRawEffects: true,
                  showObjectChanges: true,
                },
              })
            },
          },
        )
        console.log("signAndExecuteTransaction success", resData)
      }

      alert("executeTransactionBlock succeeded (see response in the console)")
    } catch (e) {
      console.error("executeMoveCall failed", e)
      alert("executeTransactionBlock failed (see response in the console)")
    }
  }

  async function handleSignMsg() {
    if (!wallet.account) return
    try {
      const msg = "Hello world!"
      const msgBytes = new TextEncoder().encode(msg)
      const result = await wallet.signPersonalMessage({
        message: msgBytes,
      })
      const verifyResult = await wallet.verifySignedMessage(
        result,
        new Uint8Array(wallet.account.publicKey),
      )
      console.log("verify signedMessage", verifyResult)
      if (!verifyResult) {
        alert(`signMessage succeed, but verify signedMessage failed`)
      } else {
        alert(`signMessage succeed, and verify signedMessage succeed!`)
      }
    } catch (e) {
      console.error("signMessage failed", e)
      alert("signMessage failed (see response in the console)")
    }
  }

  const handleSignTxnAndVerifySignature = async (contractAddress: string) => {
    const txn = createMintNftTxb(contractAddress)
    txn.setSender(wallet.account?.address as string)
    try {
      const signedTxn = await wallet.signTransaction({
        transaction: txn,
      })

      console.log(`Sign and verify txn:`)
      console.log("--wallet: ", wallet.adapter?.name)
      console.log("--account: ", wallet.account?.address)
      const publicKey = wallet.account?.publicKey
      if (!publicKey) {
        console.error("no public key provided by wallet")
        return
      }
      console.log("-- publicKey: ", publicKey)
      const pubKey = new Ed25519PublicKey(publicKey)
      console.log("-- signed txnBytes: ", signedTxn.bytes)
      console.log("-- signed signature: ", signedTxn.signature)
      const txnBytes = new Uint8Array(Buffer.from(signedTxn.bytes, "base64"))
      const isValid = await pubKey.verifyTransaction(
        txnBytes,
        signedTxn.signature,
      )
      console.log("-- use pubKey to verify transaction: ", isValid)
      if (!isValid) {
        alert(`signTransaction succeed, but verify transaction failed`)
      } else {
        alert(`signTransaction succeed, and verify transaction succeed!`)
      }
    } catch (e) {
      console.error("signTransaction failed", e)
      alert("signTransaction failed (see response in the console)")
    }
  }

  const chainName = (chainId: string | undefined) => {
    switch (chainId) {
      case SuiChainId.MAIN_NET:
        return "Mainnet"
      case SuiChainId.TEST_NET:
        return "Testnet"
      case SuiChainId.DEV_NET:
        return "Devnet"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center px-4 py-8 md:p-8 text-white">
      <div className="flex items-center gap-4 md:gap-8 mb-8 md:mb-12">
        <a href="https://vitejs.dev" target="_blank">
          <img
            src="/images/vite.svg"
            className="h-16 md:h-24 transition-all hover:drop-shadow-[0_0_2em_#646cffaa]"
            alt="Vite logo"
          />
        </a>
        <a href="https://github.com/nemo-protocol/wallet-kit" target="_blank">
          <img
            src="/images/logo.png"
            className="h-16 md:h-24 transition-all hover:drop-shadow-[0_0_2em_#646cffaa]"
            alt="Nemo logo"
          />
        </a>
      </div>
      <h1 className="text-2xl md:text-5xl font-semibold mb-8 md:mb-12 text-white text-center">
        Vite + Nemo Wallet Kit
      </h1>
      <div className="flex flex-col items-center gap-4 md:gap-6 w-full max-w-2xl px-4 md:px-0">
        {!wallet.connected ? (
          <>
            <ConnectButton
              onConnectError={(error) => {
                if (
                  error.code === ErrorCode.WALLET__CONNECT_ERROR__USER_REJECTED
                ) {
                  console.warn(
                    "user rejected the connection to " + error.details?.wallet,
                  )
                } else {
                  console.warn("unknown connect error: ", error)
                }
              }}
            />
            <p className="text-base md:text-lg text-gray-400 text-center">
              Connect DApp with Nemo Wallet Kit from now!
            </p>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-y-8">
            <ConnectButton
              onConnectError={(error) => {
                if (
                  error.code === ErrorCode.WALLET__CONNECT_ERROR__USER_REJECTED
                ) {
                  console.warn(
                    "user rejected the connection to " + error.details?.wallet,
                  )
                } else {
                  console.warn("unknown connect error: ", error)
                }
              }}
            />
            <div className="space-y-3 md:space-y-4 text-gray-400 text-sm md:text-base w-full">
              <p className="flex flex-col md:flex-row md:items-center gap-1 md:gap-0">
                <span className="md:min-w-[160px]">current wallet:</span>
                <span className="text-white">{wallet.adapter?.name}</span>
              </p>
              <p className="flex flex-col md:flex-row md:items-center gap-1 md:gap-0">
                <span className="md:min-w-[160px]">wallet status:</span>
                <span className="text-white">
                  {wallet.connecting
                    ? "connecting"
                    : wallet.connected
                      ? "connected"
                      : "disconnected"}
                </span>
              </p>
              <p className="flex flex-col md:flex-row md:items-start gap-1 md:gap-0">
                <span className="md:min-w-[160px]">wallet address:</span>
                <span className="text-white break-all">
                  {wallet.account?.address}
                </span>
              </p>
              <p className="flex flex-col md:flex-row md:items-center gap-1 md:gap-0">
                <span className="md:min-w-[160px]">current network:</span>
                <span className="text-white">Sui {wallet.chain?.name}</span>
              </p>
              <p className="flex flex-col md:flex-row md:items-start gap-1 md:gap-0">
                <span className="md:min-w-[160px]">wallet publicKey:</span>
                <span className="text-white break-all">
                  {uint8arrayToHex(
                    wallet.account?.publicKey
                      ? new Uint8Array(wallet.account.publicKey)
                      : undefined,
                  )}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 md:gap-4 w-full">
              {nftContractAddr && (
                <button
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 md:px-6 py-3 rounded-lg transition-colors text-center w-full text-sm md:text-base font-medium"
                  onClick={() =>
                    handleSignAndExecuteTransaction(nftContractAddr, {
                      isCustomExecution: true,
                    })
                  }
                >
                  Mint {chainName(wallet.chain?.id)} NFT
                </button>
              )}
              <button
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 md:px-6 py-3 rounded-lg transition-colors text-center w-full text-sm md:text-base font-medium"
                onClick={handleSignMsg}
              >
                Sign & Verify PersonalMessage
              </button>
              {nftContractAddr && (
                <button
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 md:px-6 py-3 rounded-lg transition-colors text-center w-full text-sm md:text-base font-medium"
                  onClick={() =>
                    handleSignTxnAndVerifySignature(nftContractAddr)
                  }
                >
                  Sign & Verify Transaction
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-gray-500 mt-8 md:mt-12 text-center text-xs md:text-base px-4">
        Click on the Vite and Nemo logos to learn more
      </p>
    </div>
  )
}

export default App
