import { useQuery } from "@tanstack/react-query"
import useFetchObject from "./useFetchObject"
import type { DebugInfo } from "./types"
import { useSuiClient } from "@mysten/dapp-kit"

const POOL_OBJECT_ID =
  "0xee37c64c8ef5ba49b096a4195fea3e5cbc57aba19dd6fbaba10ccc72671d75c7"

interface PoolDetails {
  pool_address: string
  is_closed: boolean
  is_show_rewarder: boolean
  project_url: string
  show_rewarder_1: boolean
  show_rewarder_2: boolean
  show_rewarder_3: boolean
}

interface ParsedPoolData {
  poolId: string
  details?: PoolDetails
}

interface PoolObjectResponse {
  content: {
    fields: {
      pools: {
        fields: {
          id: {
            id: string
          }
        }
      }
    }
  }
}

const parsePoolData = (result: string | [string, DebugInfo]): ParsedPoolData => {
  try {
    const data: PoolObjectResponse = typeof result === "string" ? JSON.parse(result) : result
    return {
      poolId: data?.content?.fields?.pools?.fields?.id?.id || "",
    }
  } catch (error) {
    console.error("Error parsing pool data:", error)
    return { poolId: "" }
  }
}

export const usePoolObject = () => {
  const { mutateAsync } = useFetchObject()
  const client = useSuiClient()

  return useQuery({
    queryKey: ["poolObject", POOL_OBJECT_ID],
    queryFn: async () => {
      try {
        const result = await mutateAsync({
          objectId: POOL_OBJECT_ID,
          options: {
            showContent: true,
          },
        })
        const parsedData = parsePoolData(result)

        console.log("parsedData", parsedData)

        if (parsedData.poolId) {
          const dynamicFields = await client.getDynamicFields({ parentId: parsedData.poolId })
          console.log("dynamicFields", dynamicFields)
          
          const poolDetails: PoolDetails[] = []
          for (const field of dynamicFields.data) {
            const poolObject = await client.getObject({
              id: field.objectId,
              options: { showContent: true }
            })

            console.log("poolObject", poolObject)
            
            
            if (poolObject.data?.content?.dataType === "moveObject") {
              const fields = (poolObject.data.content as unknown as { fields: { value: { fields: PoolDetails } } }).fields.value.fields
              console.log("Pool Details:", {
                objectId: field.objectId,
                pool_address: fields.pool_address,
                is_closed: fields.is_closed,
                is_show_rewarder: fields.is_show_rewarder,
                project_url: fields.project_url,
                show_rewarder_1: fields.show_rewarder_1,
                show_rewarder_2: fields.show_rewarder_2,
                show_rewarder_3: fields.show_rewarder_3,
              })
              poolDetails.push({
                pool_address: fields.pool_address,
                is_closed: fields.is_closed,
                is_show_rewarder: fields.is_show_rewarder,
                project_url: fields.project_url,
                show_rewarder_1: fields.show_rewarder_1,
                show_rewarder_2: fields.show_rewarder_2,
                show_rewarder_3: fields.show_rewarder_3,
              })
            }
          }

          console.log("All Pool Details:", poolDetails)
          return {
            ...parsedData,
            details: poolDetails[0]
          }
        }

        return parsedData
      } catch (error) {
        console.error("Error fetching pool object:", error)
        throw error
      }
    },
  })
}

export default usePoolObject
