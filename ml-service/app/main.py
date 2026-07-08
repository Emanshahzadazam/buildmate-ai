from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from .generator import generate_floor_plan, generate_three_variants

app = FastAPI(title="BuildMate AI - Layout Generator", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CoercedModel(BaseModel):
    # Allow coercion from strings to numbers (Pydantic v2)
    model_config = ConfigDict(coerce_numbers_to_str=False)

class PlotSpec(CoercedModel):
    frontWidth: float
    backWidth: float
    leftLength: float
    rightLength: float
    unit: Optional[str] = "feet"

class Setbacks(CoercedModel):
    front: float = 4
    back: float = 2
    left: float = 1
    right: float = 1

class RoomSpec(BaseModel):
    type: str
    count: int = 1
    size: Optional[str] = "default"

class Technical(CoercedModel):
    floorHeight: float = 10
    wallThicknessExt: float = 0.75
    wallThicknessInt: float = 0.375
    columnGrid: Optional[str] = "auto"

class LayoutBrief(BaseModel):
    plot: PlotSpec
    setbacks: Optional[Setbacks] = Setbacks()
    rooms: List[RoomSpec]
    floors: Optional[int] = 1
    hasGarage: Optional[bool] = False
    hasStoreRoom: Optional[bool] = False
    kitchenType: Optional[str] = "closed"
    drawingRoomType: Optional[str] = "closed"
    hasStaircase: Optional[bool] = False
    staircaseType: Optional[str] = "none"
    connectivity: Optional[dict] = {}
    technical: Optional[Technical] = None

@app.get("/health")
def health():
    return {"status": "healthy", "service": "BuildMate Layout API"}

@app.post("/generate")
def generate_layout(brief: LayoutBrief):
    try:
        brief_dict = brief.dict()
        if brief_dict.get("technical") is None:
            brief_dict["technical"] = Technical().dict()
        result = generate_floor_plan(brief_dict)
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-variants")
def generate_variants_api(brief: LayoutBrief):
    try:
        brief_dict = brief.dict()
        if brief_dict.get("technical") is None:
            brief_dict["technical"] = Technical().dict()
        variants = generate_three_variants(brief_dict)
        return variants
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))