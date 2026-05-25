"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BentoCardItem = {
  icon: string;
  title: string;
  description: string;
};

type BentoCardProps = BentoCardItem & {
  index: number;
  className?: string;
};

export function BentoCard({
  icon,
  title,
  description,
  index,
  className,
}: BentoCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "group relative flex min-h-[240px] flex-col bg-white p-8 transition-colors duration-300 hover:bg-emerald-950/[0.03]",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/10 ring-1 ring-emerald-600/15 transition-colors group-hover:bg-emerald-600/15">
        <Icon
          icon={icon}
          className="h-8 w-8 text-emerald-700"
          aria-hidden
        />
      </div>
      <div className="mt-auto pt-12">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </motion.article>
  );
}

type BentoGridProps = {
  items: BentoCardItem[];
  columnsClassName?: string;
  className?: string;
};

export function BentoGrid({
  items,
  columnsClassName = "grid-cols-1 sm:grid-cols-2",
  className,
}: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-0 divide-x divide-y divide-zinc-200/80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/[0.04]",
        columnsClassName,
        className
      )}
    >
      {items.map((item, index) => (
        <BentoCard key={item.title} {...item} index={index} />
      ))}
    </div>
  );
}
