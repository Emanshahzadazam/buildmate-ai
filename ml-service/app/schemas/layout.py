from pydantic import BaseModel, Field
from typing import List, Literal, Optional


# ──────────────── Request ────────────────
class BriefRoom(BaseModel):
    type: str
    count: int = Field(ge=0)
    size: Optional[str] = "default"


class BriefPlot(BaseModel):
    front_width: float = Field(gt=0, le=200, alias="frontWidth")
    back_width: float = Field(gt=0, le=200, alias="backWidth")
    left_length: float = Field(gt=0, le=200, alias="leftLength")
    right_length: float = Field(gt=0, le=200, alias="rightLength")
    unit: str = "feet"

    class Config:
        populate_by_name = True


class BriefSetbacks(BaseModel):
    front: float = 4
    back: float = 2
    left: float = 1
    right: float = 1


class BriefConnectivity(BaseModel):
    kitchen_dining: str = Field(default="connected", alias="kitchenDining")
    bathroom: str = "mixed"
    drawing_room: str = Field(default="connected-to-lounge", alias="drawingRoom")
    bedroom_near: str = Field(default="any", alias="bedroomNear")

    class Config:
        populate_by_name = True


class BriefTechnical(BaseModel):
    floor_height: float = Field(default=10, alias="floorHeight")
    wall_thickness_ext: float = Field(default=9, alias="wallThicknessExt")
    wall_thickness_int: float = Field(default=4.5, alias="wallThicknessInt")
    column_grid: str = Field(default="auto", alias="columnGrid")

    class Config:
        populate_by_name = True


class GenerateRequest(BaseModel):
    plot: BriefPlot
    setbacks: BriefSetbacks
    floors: int = Field(default=1, ge=1, le=5)
    rooms: List[BriefRoom]
    kitchen_type: str = Field(default="closed", alias="kitchenType")
    drawing_room_type: str = Field(default="closed", alias="drawingRoomType")
    has_staircase: bool = Field(default=False, alias="hasStaircase")
    staircase_type: str = Field(default="none", alias="staircaseType")
    has_garage: bool = Field(default=False, alias="hasGarage")
    has_store_room: bool = Field(default=False, alias="hasStoreRoom")
    connectivity: BriefConnectivity
    technical: BriefTechnical

    class Config:
        populate_by_name = True


# ──────────────── Response ────────────────
class LayoutRoom(BaseModel):
    id: str
    type: str
    label: str
    sizeCategory: str = "default"
    x: float
    y: float
    width: float
    height: float


class LayoutWall(BaseModel):
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    thickness: float = 0.23
    kind: Literal["exterior", "interior"]


class LayoutOpening(BaseModel):
    id: str
    wallId: str
    kind: Literal["door", "window"]
    offset: float
    width: float
    height: float = 2.1
    sillHeight: float = 0


class LayoutBuildable(BaseModel):
    width: float
    length: float
    offsetX: float
    offsetY: float


class LayoutPlot(BaseModel):
    unit: str = "m"
    corners: List[List[float]]


class LayoutMeta(BaseModel):
    generator: str
    version: str


class GenerateResponse(BaseModel):
    plot: LayoutPlot
    buildable: LayoutBuildable
    rooms: List[LayoutRoom]
    walls: List[LayoutWall]
    openings: List[LayoutOpening]
    warnings: List[str] = []
    meta: LayoutMeta