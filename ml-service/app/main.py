from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.layout import GenerateRequest, GenerateResponse
from app.generator.smart import generate_variants
from typing import List

app = FastAPI(title="BuildMate AI · ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "buildmate-ml", "version": "2.0.0"}


@app.post("/generate-variants")
async def generate_layout_variants(req: GenerateRequest):
    if not req.rooms:
        raise HTTPException(status_code=400, detail="At least one room required")
    try:
        request_dict = req.model_dump(by_alias=False)
        variants = generate_variants(request_dict)
        return {"variants": variants, "count": len(variants)}
    except Exception as exc:
        import traceback
        print("Layout generation error:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))


# Keep old endpoint for backward compat
@app.post("/generate", response_model=GenerateResponse)
async def generate_single(req: GenerateRequest):
    if not req.rooms:
        raise HTTPException(status_code=400, detail="At least one room required")
    try:
        request_dict = req.model_dump(by_alias=False)
        variants = generate_variants(request_dict)
        return variants[0] if variants else {}
    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))