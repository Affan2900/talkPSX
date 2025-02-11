"use client"

import Link from "next/link";
import Image from "next/image";
import { MoonIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-transparent py-6"
    >
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/logo.png" alt="Talk PSX Logo" width={200} height={200} />
            <motion.div whileHover={{ scale: 1.05 }} className="text-green-800 font-bold text-3xl">
              
            </motion.div>
          </div>
          <div className="hidden md:flex items-center space-x-8 font-bold">
            <Link href="#" className="text-green-700 hover:text-white text-2xl">
              Home
            </Link>
            <Link href="#" className="text-green-700 hover:text-white text-2xl">
              About
            </Link>
            <Link href="#" className="text-green-700 hover:text-white text-2xl">
              Services
            </Link>
            <Link href="#" className="text-green-700 hover:text-white text-2xl">
              Contact
            </Link>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-green-700 focus:outline-none"
          >
            <MoonIcon className="h-8 w-8" />
          </motion.button>
        </div>
      </nav>
    </motion.header>
  );
}