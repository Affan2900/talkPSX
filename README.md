This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

 - Upon Startup, the createEmbeddings.ts create vector embeddings based on available CSV files and store them in PGVector store in supabase

 -  generate.ts takes in user input and generates a prompt based on the user input and the vector embeddings stored in PGVector store in supabase