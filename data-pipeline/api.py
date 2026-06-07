"""
PSX Quote API — thin FastAPI wrapper around psxdata.quote().

Local dev:
    uvicorn data-pipeline.api:app --port 8001 --reload
    (or: npm run quote-api)

Lambda (prod):
    Wrap with Mangum:
        from mangum import Mangum
        handler = Mangum(app)
"""
import math
from pathlib import Path

import psxdata
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).parent.parent / ".env.local")

app = FastAPI(title="PSX Quote API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _clean(d: dict) -> dict:
    """Replace float NaN/Inf with None so FastAPI can serialise to JSON."""
    out = {}
    for k, v in d.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            out[k] = None
        else:
            out[k] = v
    return out


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/quote/{symbol}")
def get_quote(symbol: str):
    symbol = symbol.upper().strip()
    try:
        df = psxdata.quote(symbol)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    return _clean(df.iloc[0].to_dict())


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8001, reload=True)
