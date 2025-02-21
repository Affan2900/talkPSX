"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimatedText from "./AnimatedText";

const texts = [
  "Real-Time Insights and Trends for PSX Companies",
  "Discover the Current Best Performing PSX Companies",
  "In-Depth Analysis and Predictions for PSX Stocks"
];

export default function Hero() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(""); // State to store API response
  const [loading, setLoading] = useState(false); // Loading state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return; // Prevent empty queries

    setLoading(true);
    setAnswer(""); // Clear previous answer

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnswer(data.answer); // Store API response
      } else {
        setAnswer("Error: " + data.error);
      }
    } catch (error) {
      setAnswer("Failed to fetch response.");
      console.error("API Error:", error);
    } finally {
      setLoading(false);
    }

    setQuery(""); // Clear input after submitting
  };

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
            disabled={loading}
          >
            {loading ? "Thinking..." : "Ask AI"}
          </Button>
        </div>
      </motion.form>

      {/* Display API Response */}
      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 bg-gray-100 p-6 rounded-xl shadow-lg max-w-4xl text-lg text-green-900"
        >
          <strong>Answer:</strong> {answer}
        </motion.div>
      )}
    </div>
  );
}
