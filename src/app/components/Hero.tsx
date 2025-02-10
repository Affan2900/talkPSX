"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AnimatedText from "./AnimatedText"

const texts = [
  "Real-Time Insights and Trends for PSX Companies",
  "Discover the Current Best Performing PSX Companies",
  "In-Depth Analysis and Predictions for PSX Stocks"
];

export default function Hero() {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle the query submission here
    console.log("Query submitted:", query)
    setQuery("")
  }

  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-theme(spacing.24))] py-12 px-4">
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-6xl md:text-7xl font-bold text-green-800 mb-6"
        >
          Talk PSX
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-green-700 flex items-center justify-center"
        >
          <p className="mr-2 font-bold">Get Real-Time </p>
          <AnimatedText texts={texts} />
        </motion.div>
      </div>
      <motion.form
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full max-w-4xl"
      >
        <div className="flex flex-col md:flex-row items-center bg-white rounded-2xl shadow-lg overflow-hidden h-24">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about PSX companies and trends..."
            className="flex-grow px-6 py-6 text-lg md:text-xl text-green-800 focus:outline-none border-none h-24"
          />
        <Button
            type="submit"
            className="h-full w-48 bg-green-500 hover:bg-green-600 text-white text-lg md:text-xl transition duration-300 ease-in-out rounded-r-2xl"
          >
            Ask AI
          </Button>
        </div>
  
      </motion.form>
    </div>
  )
}

