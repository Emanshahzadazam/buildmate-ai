from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PlotDimensions(BaseModel):
    frontWidth: float
    backWidth: float
    leftLength: float
    rightLength: float
    unit: str = "feet"

class Setbacks(BaseModel):
    front: float = 5
    back: float = 5
    left: float = 5
    right: float = 5

class RoomSpec(BaseModel):
    type: str
    count: int
    size: Optional[str] = None

class TechnicalSpecs(BaseModel):
    floorHeight: float = 10
    wallThicknessExt: float = 0.75
    wallThicknessInt: float = 0.38
    columnGrid: Optional[float] = None

class Brief(BaseModel):
    buildingType: str = "residential"
    plot: PlotDimensions
    setbacks: Setbacks
    floors: int = 1
    rooms: List[RoomSpec]
    kitchenType: str = "open"
    drawingRoomType: str = "formal"
    hasStaircase: bool = True
    staircaseType: Optional[str] = "straight"
    hasGarage: bool = False
    hasStoreRoom: bool = False
    connectivity: Dict[str, bool] = {}
    technical: TechnicalSpecs

class Room(BaseModel):
    name: str
    type: str
    x: float
    y: float
    width: float
    height: float
    color: str
    area_sqft: float

class Wall(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    thickness: float
    is_external: bool
    type: str

class Opening(BaseModel):
    x: float
    y: float
    width: float
    height: float
    type: str  # door, window
    direction: str

class LayoutResponse(BaseModel):
    status: str
    plot: Dict[str, Any]
    buildable: Dict[str, float]
    zones: Dict[str, Dict[str, float]]
    rooms: List[Room]
    walls: List[Wall]
    openings: List[Opening]
    warnings: List[str]
    meta: Dict[str, Any]
    variant: Optional[str] = None