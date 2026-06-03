from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from .generator import generate_floor_plan, generate_three_variants

app = FastAPI(title="BuildMate AI - Layout Generator", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlotSpec(BaseModel):
    frontWidth: float
    backWidth: float
    leftLength: float
    rightLength: float
    unit: Optional[str] = "feet"

class Setbacks(BaseModel):
    front: float = 5
    back: float = 5
    left: float = 5
    right: float = 5

class RoomSpec(BaseModel):
    type: str
    count: int
    size: Optional[str] = "default"

class Technical(BaseModel):
    floorHeight: float = 10
    wallThicknessExt: float = 0.75
    wallThicknessInt: float = 0.375
    columnGrid: Optional[str] = "auto"

class LayoutBrief(BaseModel):
    plot: PlotSpec
    setbacks: Setbacks
    rooms: List[RoomSpec]
    floors: Optional[int] = 1
    hasGarage: Optional[bool] = False
    hasStoreRoom: Optional[bool] = False
    kitchenType: Optional[str] = "closed"
    drawingRoomType: Optional[str] = "closed"
    hasStaircase: Optional[bool] = False
    staircaseType: Optional[str] = "none"
    connectivity: Optional[dict] = {}
    technical: Optional[Technical] = Technical()

@app.get("/health")
def health():
    return {"status": "healthy", "service": "BuildMate Layout API"}

@app.post("/generate")
def generate_layout(brief: LayoutBrief):
    """Generate single layout"""
    try:
        result = generate_floor_plan(brief.dict())
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['message'])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-variants")
def generate_variants_api(brief: LayoutBrief):
    """Generate 3 layout variants (A, B, C)"""
    try:
        variants = generate_three_variants(brief.dict())
        return variants
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))