"use client";

import { motion } from "framer-motion";
import { BentoGrid, type BentoCardItem } from "./BentoCard";

const trustPoints: BentoCardItem[] = [
  {
    title: "Built for PSX",
    description:
      "Pakistan Stock Exchange companies, trends, and fundamentals—not generic market noise.",
    icon: "hugeicons:chart-increase",
  },
  {
    title: "AI you can follow",
    description:
      "Conversational answers tied to your questions so you can explore ideas step by step.",
    icon: "hugeicons:ai-brain-01",
  },
  {
    title: "Secure access",
    description:
      "Sign in to save chats and continue research where you left off.",
    icon: "hugeicons:shield-01",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="scroll-mt-24 bg-white/90 py-20 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
            About
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            About Talk PSX
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Talk PSX is your AI-powered companion for Pakistan&apos;s stock
            market—helping investors and curious learners get timely insights,
            compare companies, and understand PSX trends in plain language.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-10 max-w-3xl text-center"
        >
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
            Our story
          </h3>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            We started Talk PSX because researching listed companies often means
            jumping between filings, news, and spreadsheets. Our mission is to
            bring real-time PSX context and thoughtful AI analysis into one
            conversation—so you spend less time hunting data and more time
            making informed decisions.
          </p>
        </motion.div>

        <div className="mt-12">
          <BentoGrid
            items={trustPoints}
            columnsClassName="grid-cols-1 md:grid-cols-3"
          />
        </div>
      </div>
    </section>
  );
}
