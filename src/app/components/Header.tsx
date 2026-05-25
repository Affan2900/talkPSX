"use client";

import Link from "next/link";
import Image from "next/image";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = ["Home", "About", "Services"] as const;

type HeaderProps = {
  sidebarOpen?: boolean;
};

export default function Header({ sidebarOpen = false }: HeaderProps) {
  const { isSignedIn } = useUser();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "sticky top-0 z-20 px-4 pt-4 transition-[margin-left] duration-300 ease-in-out md:px-6",
        sidebarOpen && "md:ml-[300px]"
      )}
    >
      <nav
        className="mx-auto flex h-12 max-w-5xl items-center gap-3 rounded-full border border-white/30 bg-white/20 px-4 shadow-lg backdrop-blur-xl md:h-14 md:gap-6 md:px-6"
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Talk PSX home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-white/30"
            priority
          />
          <span className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
            TALK PSX™
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {NAV_LINKS.map((label) => (
            <Link
              key={label}
              href="#"
              className="text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto shrink-0 md:ml-0">
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9",
                },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full border border-white/40 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
