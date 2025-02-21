"use client"

import Link from "next/link";
import Image from "next/image";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; 
import { motion } from "framer-motion";

export default function Header() {

  const { isSignedIn } = useUser();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-transparent"
    >
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Added Login component here */}
            
            
            <Image src="/logo.png" alt="Talk PSX Logo" width={200} height={200} />
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
          <div className="flex items-center space-x-4">
      {isSignedIn ? (
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-10 h-10"
            }
          }}
        />
      ) : (
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="focus:outline-none"
        >
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-green-900 text-white font-bold rounded-lg hover:bg-green-600 transition text-xl">
              Sign In
            </button>
          </SignInButton>
        </motion.div>
      )}
    </div>
          {/* Removed the absolute positioned Login */}
        </div>
      </nav>
    </motion.header>
  );
}