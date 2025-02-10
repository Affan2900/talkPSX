"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function Footer() {
  return (
    <footer className="bg-white bg-opacity-80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="-mx-5 -my-2 flex flex-wrap justify-center"
          aria-label="Footer"
        >
          {["About", "Privacy", "Terms"].map((item) => (
            <div key={item} className="px-5 py-2">
              <Link
                href="#"
                className="text-base text-green-600 hover:text-green-800 transition duration-300 ease-in-out"
              >
                {item}
              </Link>
            </div>
          ))}
        </motion.nav>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-center text-base text-green-500"
        >
          &copy; 2025 Talk PSX, Inc. All rights reserved.
        </motion.p>
      </div>
    </footer>
  )
}

