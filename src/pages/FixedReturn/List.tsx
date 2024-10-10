import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQueryFixedReturnInfos } from "@/queries"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { data: list } = useQueryFixedReturnInfos()
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-white/80 text-xs">
          <TableHead>Name</TableHead>
          <TableHead className="text-center">You pay</TableHead>
          <TableHead className="text-center">After</TableHead>
          <TableHead className="text-center">You can redeem</TableHead>
          <TableHead className="text-center">Fixed Return</TableHead>
          <TableHead className="text-center">Fixed Apy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list?.map((item) => (
          <TableRow
            key={item.name}
            className="cursor-pointer"
            onClick={() =>
              navigate(
                `/market/detail/${item.coinType || "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI"}`,
              )
            }
          >
            <TableCell className="flex items-center gap-x-3">
              <img src={item.coinLogo} alt={item.name} className="size-10" />
              <span>{item.name}</span>
            </TableCell>
            <TableCell className="text-center">{item.youPay}</TableCell>
            <TableCell className="text-center">{item.expiry}</TableCell>
            <TableCell>
              <div className="flex flex-col items-center">
                <span>{item.redeem}</span>
                {/* <span className="text-sm text-white/50">{item.redeem}</span> */}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-center">
                <span className="text-[#44E0C3]">{item.fixedReturn}</span>
                {/* <span className="text-sm text-white/50">
                  {item.fixedReturn}
                </span> */}
              </div>
            </TableCell>
            <TableCell className="text-center text-[#44E0C3]">
              {item.fixedApy}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
