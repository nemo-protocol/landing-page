import { motion } from "framer-motion"
import { containerStyles } from "./Index"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Link, useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutGrid } from "lucide-react"

export default function HomeHeader() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [mobileSubNav, setMobileSubNav] = useState(false)
  const [desktopSubNav, setDesktopSubNav] = useState(false)
  const subNavRef = useRef<HTMLLIElement>(null)
  const [router, setRouter] = useState<string>("Home")

  const handleClickOutside = (event: MouseEvent) => {
    if (
      subNavRef.current &&
      !subNavRef.current.contains(event.target as Node)
    ) {
      setMobileSubNav(false)
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <header className={containerStyles} style={{ zIndex: 10 }}>
      <div className="flex items-center justify-between py-6 text-xs">
        <div className="flex gap-x-2">
          <img src="/images/svg/logo.svg" alt="logo" className="w-30 h-auto" />
          <div className="text-[#44E0C3] py-1 px-2 rounded-full bg-[#ECFBF9]/10 text-xs">
            Beta
          </div>
        </div>
        <ul className="rounded-full border border-white/20 hidden md:flex items-center">
          <li
            onClick={() => setRouter("Home")}
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Home" ? "bg-white/10" : "",
            ].join(" ")}
          >
            Home
          </li>
          <li
            onClick={() => setRouter("Community")}
            className={[
              "w-32 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Community" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <DropdownMenu open={desktopSubNav} onOpenChange={setDesktopSubNav}>
              <DropdownMenuTrigger className="w-full outline-none border-none">
                Community
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E0F16] border-none mt-2">
                <DropdownMenuItem>
                  <a
                    target="_blank"
                    href="https://x.com/nemoprotocol"
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-[100px] h-8"
                  >
                    Twitter
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    target="_blank"
                    href="https://t.me/NemoProtocol"
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-[100px] h-8"
                  >
                    Telegram
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
          <li
            onClick={() => {
              toast({
                title: "Coming soon!",
              })
            }}
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Docs" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <a
              href="https://docs.nemoprotocol.com/"
              target="_blank"
              className="text-white"
            >
              Docs
            </a>
          </li>
          <li
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Learn" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <Link to="/learn" className="text-white">
              Learn
            </Link>
          </li>
        </ul>
        <button
          className="border border-white bg-transparent rounded-full text-white hidden md:inline-block py-1 px-2"
          onClick={() => navigate("/market")}
        >
          Launch App
        </button>

        <div className="flex items-center gap-x-4 md:hidden">
          <button
            className="border border-white bg-transparent rounded-full text-white py-1 px-2"
            onClick={() => navigate("/market")}
          >
            Launch App
          </button>
          <LayoutGrid
            className="text-white cursor-pointer"
            onClick={() => setIsOpen((isOpen) => !isOpen)}
          />
        </div>
      </div>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: "hidden" }}
        className="fixed left-4 right-4 top-20 text-sm md:hidden bg-[#0E0F16]/90 backdrop-blur-md z-50 rounded-2xl mx-auto max-w-screen-xl"
      >
        <div className="flex flex-col p-4">
          <Link
            to="/"
            className="py-3 text-white hover:bg-[#131520] rounded-lg px-4"
            onClick={() => setMobileSubNav(false)}
          >
            Home
          </Link>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setMobileSubNav((prev) => !prev)
            }}
            className="py-3 text-white hover:bg-[#131520] rounded-lg px-4 cursor-pointer"
          >
            Community
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-3 text-white hover:bg-[#131520] rounded-lg px-4"
            onClick={() => setMobileSubNav(false)}
          >
            Docs
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-3 text-white hover:bg-[#131520]rounded-lg px-4"
            onClick={() => setMobileSubNav(false)}
          >
            Learn
          </a>
        </div>
        {mobileSubNav && (
          <div className="flex flex-col p-4 border-t border-white/10">
            <a
              href="https://x.com/nemoprotocol"
              target="_blank"
              className="py-3 text-white hover:bg-[#131520] hover:text-[#5D94FF] rounded-lg px-4"
            >
              Twitter
            </a>
            <a
              href="https://t.me/NemoProtocol"
              target="_blank"
              className="py-3 text-white hover:bg-[#131520] hover:text-[#5D94FF] rounded-lg px-4"
            >
              Telegram
            </a>
          </div>
        )}
      </motion.div>
    </header>
  )
}
