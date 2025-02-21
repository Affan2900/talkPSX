import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';
// import { Roboto } from "next/font/google";
import "./globals.css";


// const roboto = Roboto({
//   variable: "--font-roboto",
//   subsets: ["latin"],
//   weight: ["400", "700"]
// });


export const metadata: Metadata = {
  title: "Talk PSX",
  description: "Get insights and trends for PSX companies with our AI-powered chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl={"/"}>
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        {children}
      </body>
    </html>
    </ClerkProvider>
  );
}
