import { ContractError } from "./types"
import type { DebugInfo } from "./types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import type { GetObjectParams } from "./useQueryButton"

// Update GetObjectParams type definition
type ExtendedGetObjectParams<TData = unknown, TResult = TData> = GetObjectParams & {
  format?: (data: TData) => TResult;
}

type FetchObjectReturn<TResult, TDebug extends boolean> = TDebug extends true 
  ? [TResult, DebugInfo] 
  : TResult;

const useFetchObject = <TData = unknown, TResult = TData, TDebug extends boolean = false>(
  debug: TDebug = false as TDebug,
) => {
  const client = useSuiClient()
  return useMutation({
    mutationFn: async ({
      objectId,
      options,
      typeArguments = [],
      format,
    }: ExtendedGetObjectParams<TData, TResult>): Promise<FetchObjectReturn<TResult, TDebug>> => {
      const debugInfo: DebugInfo = {
        moveCall: [{
          target: "get_object",
          arguments: [
            {
              name: "object_id",
              value: objectId,
            },
          ],
          typeArguments,
        }],
        rawResult: {
          error: undefined,
          results: [],
        },
      }

      try {
        const response = await client.getObject({
          id: objectId,
          options,
        })

        // Record raw result
        debugInfo.rawResult = {
          error: undefined,
          results: [response],
        }

        if ("error" in response && response.error) {
          const message = String(response.error)
          debugInfo.rawResult.error = message
          throw new ContractError(message, debugInfo)
        }

        const data = response.data as TData
        
        if (!data) {
          const message = "Object not found"
          debugInfo.rawResult.error = message
          throw new ContractError(message, debugInfo)
        }

        // Process data with format function if provided
        const processedData = format ? format(data) : data as unknown as TResult
        debugInfo.parsedOutput = JSON.stringify(processedData)
        return (debug ? [processedData, debugInfo] : processedData) as FetchObjectReturn<TResult, TDebug>
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

export default useFetchObject
