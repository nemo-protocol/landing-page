import { useState } from "react"
import { motion } from "framer-motion"
import { containerStyles } from "./Index"
import logo from "@/assets/images/svg/logo.svg"
import { Link, useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import Squares2X2Icon from "@/assets/images/svg/squares-2x2.svg?react"

export default function HomeHeader() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [subNav, setSubNav] = useState(false)
  const [router, setRouter] = useState<string>("Home")
  return (
    <header className={containerStyles}>
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
            onClick={() => setRouter("Community")}
            className={[
              "w-32 text-center text-white bg-transparent py-2 rounded-full cursor-pointer dropdown",
              router === "Community" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <div tabIndex={0} role="button">
              Community
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-white/10 rounded-box z-[1] p-2 shadow mt-4 w-[130px]"
            >
              <li>
                <a
                  target="_blank"
                  href="https://x.com/nemoprotocol"
                  className="text-white hover:text-[#1954FF] active:text-[#1954FF]"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  href="https://t.me/NemoProtocol"
                  className="text-white hover:text-[#1954FF] active:text-[#1954FF]"
                >
                  Telegram
                </a>
              </li>
            </ul>
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
          className="border border-white bg-transparent rounded-full text-white hidden md:inline-block text-white"
          onClick={() => navigate("/market")}
        >
          Launch App
        </button>

        <Squares2X2Icon
          className="md:hidden text-white cursor-pointer"
          onClick={() => setIsOpen((isOpen) => !isOpen)}
        />
      </div>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: "hidden" }}
        className="flex gap-x-8 text-sm lg:hidden"
      >
        <div className="flex flex-col">
          <Link
            to="/"
            className="py-2 text-white"
            onClick={() => setSubNav(false)}
          >
            Home
          </Link>
          <a
            href="javascript:void(0)"
            className="py-2 cursor-pointer text-white"
            onClick={() => setSubNav((subNav) => !subNav)}
          >
            Community
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-2 text-white"
            onClick={() => setSubNav(false)}
          >
            Docs
          </a>
          <a
            href="https://docs.nemoprotocol.com/"
            target="_blank"
            className="py-2 text-white"
            onClick={() => setSubNav(false)}
          >
            Learn
          </a>
        </div>
        {subNav && (
          <div className="flex flex-col">
            <a
              href="https://x.com/nemoprotocol"
              target="_blank"
              className="py-2 text-white"
            >
              Twitter
            </a>
            <a
              href="https://t.me/NemoProtocol"
              target="_blank"
              className="py-2 text-white"
            >
              Telegram
            </a>
          </div>
        )}
      </motion.div>
    </header>
  )
}
