import { motion } from "framer-motion"
import { containerStyles } from "./Index"
import logo from "@/assets/images/svg/logo.svg"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Link, useNavigate } from "react-router-dom"
import Squares2X2Icon from "@/assets/images/svg/squares-2x2.svg?react"

export default function HomeHeader() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [subNav, setSubNav] = useState(false)
  const subNavRef = useRef<HTMLLIElement>(null)
  const [router, setRouter] = useState<string>("Home")

  const handleClickOutside = (event: MouseEvent) => {
    if (
      subNavRef.current &&
      !subNavRef.current.contains(event.target as Node)
    ) {
      setSubNav(false)
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
          <img src={logo} alt="" />
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
            ref={subNavRef}
            onClick={() => {
              setSubNav(true)
              setRouter("Community")
            }}
            className={[
              "w-32 text-center text-white bg-transparent py-2 rounded-full cursor-pointer relative",
              router === "Community" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <div tabIndex={0} role="button">
              Community
            </div>
            {subNav && (
              <ul
                tabIndex={0}
                className="bg-white/10 rounded-box z-[1] p-2 shadow mt-4 w-[130px] absolute rounded-lg"
              >
                <li>
                  <a
                    target="_blank"
                    href="https://x.com/nemoprotocol"
                    className="py-3 hover:bg-[#28282a] rounded-lg text-white hover:text-[#1954FF] active:text-[#1954FF] w-full inline-block"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    target="_blank"
                    href="https://t.me/NemoProtocol"
                    className="py-3 hover:bg-[#28282a] rounded-lg text-white hover:text-[#1954FF] active:text-[#1954FF] w-full inline-block"
                  >
                    Telegram
                  </a>
                </li>
              </ul>
            )}
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
          <Squares2X2Icon
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
            className="py-3 text-white hover:bg-white/10 rounded-lg px-4"
            onClick={() => setSubNav(false)}
          >
            Home
          </Link>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setSubNav((subNav) => !subNav)
            }}
            className="py-3 text-white hover:bg-white/10 rounded-lg px-4 cursor-pointer"
          >
            Community
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-3 text-white hover:bg-white/10 rounded-lg px-4"
            onClick={() => setSubNav(false)}
          >
            Docs
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-3 text-white hover:bg-white/10 rounded-lg px-4"
            onClick={() => setSubNav(false)}
          >
            Learn
          </a>
        </div>
        {subNav && (
          <div className="flex flex-col p-4 border-t border-white/10">
            <a
              href="https://x.com/nemoprotocol"
              target="_blank"
              className="py-3 text-white hover:bg-white/10 rounded-lg px-4"
            >
              Twitter
            </a>
            <a
              href="https://t.me/NemoProtocol"
              target="_blank"
              className="py-3 text-white hover:bg-white/10 rounded-lg px-4"
            >
              Telegram
            </a>
          </div>
        )}
      </motion.div>
    </header>
  )
}
