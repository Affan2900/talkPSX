import { clerkMiddleware } from "@clerk/nextjs/server";


let hasRun = false; // Flag to ensure it runs only once

async function runEmbeddingsOnce() {
  if (!hasRun) {
    hasRun = true;
    try {
      await fetch("http://localhost:3000/api/startup").catch(console.error);
      console.log("Embeddings stored successfully.");
    } catch (error) {
      console.error("Failed to store embeddings:", error);
    }
  }
}

runEmbeddingsOnce(); // Run it once at server startup

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};