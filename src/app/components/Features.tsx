"use client";

import { motion } from "framer-motion";
import { BentoGrid, type BentoCardItem } from "./BentoCard";

const features: BentoCardItem[] = [
  {
    title: "Real-time Data",
    description:
      "Up-to-the-minute PSX prices, volume, and momentum without leaving the thread.",
    icon: "hugeicons:clock-01",
  },
  {
    title: "Trend Analysis",
    description:
      "Spot sector moves and price patterns with AI summaries you can question further.",
    icon: "hugeicons:analytics-up",
  },
  {
    title: "Company Financials",
    description:
      "Balance sheets, ratios, and filings context for listed companies on the PSX.",
    icon: "hugeicons:pie-chart-01",
  },
  {
    title: "Instant Answers",
    description:
      "Ask in plain English and get focused replies, no menu diving required.",
    icon: "hugeicons:flash",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-24 bg-zinc-50/90 py-20 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 lg:text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
            Services
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Powerful AI for PSX insights
          </h2>
        </motion.div>

        <BentoGrid
          items={features}
          columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      </div>
    </section>
  );
}
