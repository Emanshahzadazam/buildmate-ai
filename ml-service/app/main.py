from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.layout import GenerateRequest, GenerateResponse
from app.generator.smart import generate_smart_layout

app = FastAPI(
    title="BuildMate AI · ML Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "buildmate-ml"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if not req.rooms:
        raise HTTPException(status_code=400, detail="At least one room required")
    try:
        request_dict = req.model_dump(by_alias=False)
        layout = generate_smart_layout(request_dict)
        return layout
    except Exception as exc:
        import traceback
        print("Layout generation error:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))