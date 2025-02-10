"use client"

import { motion } from "framer-motion"
import { TrendingUp, PieChart, Clock, Zap } from "lucide-react"

const features = [
  {
    name: "Real-time Data",
    description: "Get up-to-the-minute information on PSX stocks and trends.",
    icon: Clock,
  },
  {
    name: "Trend Analysis",
    description: "AI-powered insights on market trends and predictions.",
    icon: TrendingUp,
  },
  {
    name: "Company Financials",
    description: "Detailed financial information for all PSX-listed companies.",
    icon: PieChart,
  },
  {
    name: "Instant Answers",
    description: "Get quick responses to your stock market queries.",
    icon: Zap,
  },
]

export default function Features() {
  return (
    <div className="py-20 bg-white bg-opacity-80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:text-center mb-12"
        >
        
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-green-800 sm:text-4xl">
            Powerful AI for PSX Insights
          </p>
        </motion.div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative bg-white p-6 rounded-lg shadow-md"
              >
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-green-800">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-green-600">{feature.description}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

