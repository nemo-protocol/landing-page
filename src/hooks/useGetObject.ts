import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import type { DebugInfo } from "./types"
import { ContractError } from "./types"
import type { GetObjectParams } from "./useQueryButton"

const useGetObject = (_coinConfig: unknown, debug = false) => {
  const client = useSuiClient()
  return useMutation({
    mutationFn: async ({ objectId, options }: GetObjectParams): Promise<[string] | [string, DebugInfo]> => {
      const debugInfo: DebugInfo = {
        moveCall: {
          target: "get_object",
          arguments: [
            {
              name: "object_id",
              value: objectId,
            }
          ],
          typeArguments: [""],
        },
      }

      try {
        const response = await client.getObject({
          id: objectId,
          options,
        })

        // Record raw result
        debugInfo.rawResult = {
          results: [response],
        }

        if ('error' in response && response.error) {
          const message = String(response.error)
          debugInfo.rawResult.error = message
          throw new ContractError(message, debugInfo)
        }

        const data = response.data
        if (!data) {
          const message = "Object not found"
          debugInfo.rawResult.error = message
          throw new ContractError(message, debugInfo)
        }

        const returnValue = JSON.stringify(data)
        debugInfo.parsedOutput = returnValue

        return debug ? [returnValue, debugInfo] : [returnValue]
      } catch (error) {
        debugInfo.rawResult = {
          error: error instanceof Error ? error.message : String(error),
        }
        throw new ContractError(
          error instanceof Error ? error.message : String(error),
          debugInfo,
        )
      }
    },
  })
}

export default useGetObject 