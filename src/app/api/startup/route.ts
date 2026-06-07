import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Ingestion is handled by data-pipeline/ingest.py (psxdata → Ollama → PGVector).
// Run `python data-pipeline/ingest.py` to populate or refresh the psx_kse100 table.
export async function GET() {
  return NextResponse.json({
    message: "Ingestion is managed by the Python pipeline. Run: python data-pipeline/ingest.py",
  });
}
