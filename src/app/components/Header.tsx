"use client"

import Link from "next/link"
import { MoonIcon } from "lucide-react"
import { motion } from "framer-motion"

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-transparent"
    >
      <nav className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} className="text-green-800 font-bold text-xl">
            Talk PSX
          </motion.div>
          <div className="hidden md:flex items-center space-x-4">
            <Link href="#" className="text-green-700 hover:text-green-900">
              Home
            </Link>
            <Link href="#" className="text-green-700 hover:text-green-900">
              About
            </Link>
            <Link href="#" className="text-green-700 hover:text-green-900">
              Services
            </Link>
            <Link href="#" className="text-green-700 hover:text-green-900">
              Contact
            </Link>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-green-700 focus:outline-none"
          >
            <MoonIcon className="h-6 w-6" />
          </motion.button>
        </div>
      </nav>
    </motion.header>
  )
}

