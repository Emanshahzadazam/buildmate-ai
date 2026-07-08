"""
Professional Architectural Floor Plan Generator
Validates requirements and generates realistic layouts

This is the "full-featured" generator: it validates feasibility first,
then produces 3 distinct architectural variants (A/B/C), each with a
real corridor + bathroom wing so no bedroom is ever sealed off or
reachable only by walking through another bedroom.

v4 changes (this revision):
  1. Rooms placed side-by-side in a shared band (front row of variant A,
     service row of variant B, etc.) now use flexible/proportional width
     distribution ported from BuildMate v6's JS `buildLayout()` engine:
     fixed-width rooms (garage, staircase) claim their share first, and
     every other room in that row splits the remaining width equally —
     instead of hard-coded percentages. See `_place_row()`.
  2. Root fix for the wallId crash. `_add_wall()` now dedupes by
     coordinates and always returns a real id. `_add_opening()` no longer
     accepts a blank wallId "for now, fill it in later" — if none is
     supplied it synthesizes a real wall record from the opening's own
     coordinates (`_synth_wall_for_opening`) and uses that id instead.
     `_add_interior_door()` used to hard-code `wall_id=""`; it no longer
     can, because `_add_opening()` will not let it. Every opening this
     generator produces now has a guaranteed non-empty wallId, which is
     what Mongoose's `required: true` on that field expects:
         Project validation failed: layout.openings.0.wallId: Path
         `wallId` is required.
  3. Everything else — the 3 architectural strategies, the corridor +
     bathroom wing, the roof view — is unchanged in spirit, just routed
     through the fixed wall/opening plumbing above.
"""
import math
import uuid
from typing import Dict, List, Tuple, Any


def inches_to_feet(value: float) -> float:
    return value / 12.0


class ArchitecturalValidator:
    """Validates feasibility of user requirements"""

    MIN_ROOM_SIZES = {
        "master_bedroom": 150,
        "bedroom": 100,
        "bathroom": 40,
        "kitchen": 100,
        "living": 150,
        "dining": 120,
        "drawing": 180,
        "garage": 250,
        "store": 50,
        "staircase": 45,
        "study": 80,
        "other": 80,
    }

    WALL_EXT = 0.75   # 9 inches
    WALL_INT = 0.375  # 4.5 inches
    CIRCULATION_FACTOR = 1.25

    def __init__(self, brief):
        self.brief = brief or {}
        self.plot = self.brief.get("plot", {}) or {}
        self.rooms_req = self.brief.get("rooms", []) or []

    def _room_count(self, room_type: str) -> int:
        for req in self.rooms_req:
            if req.get("type") == room_type:
                return max(0, int(req.get("count", 1)))
        return 0

    def validate(self) -> Tuple[bool, str, Dict]:
        plot_width = (self.plot.get("frontWidth", 40) + self.plot.get("backWidth", 40)) / 2.0
        plot_length = (self.plot.get("leftLength", 70) + self.plot.get("rightLength", 70)) / 2.0
        plot_area = plot_width * plot_length

        setbacks = self.brief.get("setbacks", {}) or {}
        buildable_width = max(1.0, plot_width - setbacks.get("left", 1) - setbacks.get("right", 1))
        buildable_length = max(1.0, plot_length - setbacks.get("front", 4) - setbacks.get("back", 2))
        buildable_area = buildable_width * buildable_length

        required_area = 0.0
        room_counts = {}

        for req in self.rooms_req:
            room_type = req.get("type", "other")
            count = max(0, int(req.get("count", 1)))
            room_counts[room_type] = room_counts.get(room_type, 0) + count

            if room_type == "bedroom":
                min_size = self.MIN_ROOM_SIZES["master_bedroom"] if count == 1 else self.MIN_ROOM_SIZES["bedroom"]
            else:
                min_size = self.MIN_ROOM_SIZES.get(room_type, self.MIN_ROOM_SIZES["other"])

            required_area += min_size * count

        if self.brief.get("hasGarage", False):
            required_area += self.MIN_ROOM_SIZES["garage"]
        if self.brief.get("hasStoreRoom", False):
            required_area += self.MIN_ROOM_SIZES["store"]
        if self.brief.get("hasStaircase", False) or int(self.brief.get("floors", 1) or 1) > 1:
            required_area += self.MIN_ROOM_SIZES["staircase"]

        required_with_circulation = required_area * self.CIRCULATION_FACTOR
        feasible = required_with_circulation <= buildable_area

        utilization = (required_with_circulation / buildable_area) * 100 if buildable_area > 0 else 999

        analysis = {
            "plot_area": plot_area,
            "buildable_area": buildable_area,
            "required_area": required_area,
            "required_with_circulation": required_with_circulation,
            "utilization": utilization,
            "room_counts": room_counts,
            "feasible": feasible,
            "plot_width": plot_width,
            "plot_length": plot_length,
            "buildable_width": buildable_width,
            "buildable_length": buildable_length,
        }

        if not feasible:
            msg = f"""The requested requirements cannot fit realistically within the given plot dimensions while maintaining proper architectural standards.

Requirements: {required_with_circulation:.0f} sq ft (with circulation)
Available: {buildable_area:.0f} sq ft
Shortfall: {required_with_circulation - buildable_area:.0f} sq ft ({utilization:.1f}% utilization)

Suggestions:
1. Reduce the bedroom count
2. Reduce bathrooms or use more common baths
3. Add an additional floor
4. Increase the plot size
5. Reduce parking / store / staircase footprint"""
            return False, msg, analysis

        return True, "Requirements fit! Generating layout...", analysis


class ProfessionalLayoutGenerator:
    """Generates professional architectural floor plans"""

    def __init__(self, brief, variant_num: int = 0):
        self.brief = brief or {}
        self.variant_num = variant_num
        self.rooms: List[Dict[str, Any]] = []
        self.walls: List[Dict[str, Any]] = []
        self.openings: List[Dict[str, Any]] = []
        self.roof_view: Dict[str, Any] = {}

        validator = ArchitecturalValidator(self.brief)
        feasible, msg, analysis = validator.validate()
        if not feasible:
            raise Exception(msg)

        self.analysis = analysis

        technical = self.brief.get("technical", {}) or {}
        self.floor_height = float(technical.get("floorHeight", 10) or 10)
        self.wall_ext = max(0.5, inches_to_feet(float(technical.get("wallThicknessExt", 9) or 9)))
        self.wall_int = max(0.25, inches_to_feet(float(technical.get("wallThicknessInt", 4.5) or 4.5)))

        self.start_x = float(self.brief.get("setbacks", {}).get("left", 1) or 1)
        self.start_y = float(self.brief.get("setbacks", {}).get("front", 4) or 4)
        self.buildable_width = float(self.analysis["buildable_width"])
        self.buildable_length = float(self.analysis["buildable_length"])
        self.min_x = self.start_x
        self.max_x = self.start_x + self.buildable_width
        self.min_y = self.start_y
        self.max_y = self.start_y + self.buildable_length

        self.wall_ids: Dict[str, str] = {}
        # coordinate -> wall id, so repeated segments (and openings on the
        # same segment) reuse a single wall record instead of creating dupes
        self._wall_registry: Dict[Tuple[float, float, float, float], str] = {}

    def _room_count(self, room_type: str) -> int:
        return int(self.analysis["room_counts"].get(room_type, 0) or 0)

    def _add_room(
        self,
        label: str,
        name: str,
        room_type: str,
        x: float,
        y: float,
        width: float,
        height: float,
        color: str,
        size_category: str = "default",
        level: int = 1,
    ) -> Dict[str, Any]:
        room = {
            "id": str(uuid.uuid4()),
            "label": label,
            "name": name,
            "type": room_type,
            "sizeCategory": size_category,
            "color": color,
            "level": level,
            "x": round(x, 3),
            "y": round(y, 3),
            "width": round(max(1.0, width), 3),
            "height": round(max(1.0, height), 3),
        }
        self.rooms.append(room)
        return room

    @staticmethod
    def _wall_key(x1: float, y1: float, x2: float, y2: float) -> Tuple[float, float, float, float]:
        return (round(min(x1, x2), 2), round(min(y1, y2), 2), round(max(x1, x2), 2), round(max(y1, y2), 2))

    def _add_wall(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        kind: str = "interior",
        direction: str = "custom",
        is_external: bool = False,
    ) -> Dict[str, Any]:
        """Creates a wall record, or reuses an existing one at the same
        coordinates. Always returns a wall with a real, non-empty id —
        this is the building block that makes a blank wallId impossible."""
        key = self._wall_key(x1, y1, x2, y2)
        existing_id = self._wall_registry.get(key)
        if existing_id:
            wall = next((w for w in self.walls if w["id"] == existing_id), None)
            if wall is not None:
                if is_external:
                    self.wall_ids[direction] = wall["id"]
                return wall

        wall = {
            "id": str(uuid.uuid4()),
            "x1": round(x1, 3),
            "y1": round(y1, 3),
            "x2": round(x2, 3),
            "y2": round(y2, 3),
            "thickness": self.wall_ext if is_external else self.wall_int,
            "kind": kind,
            "direction": direction,
            "isExternal": is_external,
        }
        self.walls.append(wall)
        self._wall_registry[key] = wall["id"]
        if is_external:
            self.wall_ids[direction] = wall["id"]
        return wall

    def _synth_wall_for_opening(self, direction: str, x: float, y: float, width: float) -> str:
        """Builds (or reuses) a small interior wall record spanning the
        exact segment an opening sits on. Used whenever an opening is
        created without an explicit wall_id, so `wallId` is never blank."""
        half = max(0.5, width) / 2.0
        if direction in ("north", "south"):
            wall = self._add_wall(x - half, y, x + half, y, kind="interior", direction=direction)
        else:  # west / east
            wall = self._add_wall(x, y - half, x, y + half, kind="interior", direction=direction)
        return wall["id"]

    def _add_opening(
        self,
        kind: str,
        direction: str,
        offset: float,
        width: float,
        height: float,
        wall_id: str,
        sill_height: float = 0.0,
        label: str = "",
        explicit_x: float = None,
        explicit_y: float = None,
    ) -> Dict[str, Any]:
        if explicit_x is not None and explicit_y is not None:
            x = explicit_x
            y = explicit_y
        elif direction == "north":
            x = self.min_x + offset
            y = self.min_y
        elif direction == "south":
            x = self.min_x + offset
            y = self.max_y
        elif direction == "west":
            x = self.min_x
            y = self.min_y + offset
        else:  # east
            x = self.max_x
            y = self.min_y + offset

        # Guarantee a real wallId — never persist an empty string.
        if not wall_id:
            wall_id = self._synth_wall_for_opening(direction, x, y, width)

        opening = {
            "id": str(uuid.uuid4()),
            "wallId": wall_id,
            "kind": kind,
            "type": kind,
            "direction": direction,
            "offset": round(offset, 3),
            "width": round(width, 3),
            "height": round(height, 3),
            "sillHeight": round(sill_height, 3),
            "label": label,
            "x": round(x, 3),
            "y": round(y, 3),
        }
        self.openings.append(opening)
        return opening

    def _add_interior_door(
        self,
        x: float,
        y: float,
        orientation: str,
        width: float = 3.0,
        label: str = "",
    ) -> Dict[str, Any]:
        """Adds a door on an INTERIOR partition wall at an explicit (x, y) point.

        orientation="horizontal" -> the wall being pierced runs left-right (like a
            north/south exterior wall), so the door is drawn as a horizontal gap.
        orientation="vertical"   -> the wall being pierced runs up-down (like a
            west/east exterior wall), so the door is drawn as a vertical gap.

        wall_id is intentionally left blank here: _add_opening() will
        synthesize a real wall record from (x, y, width) via
        _synth_wall_for_opening(), so this never produces an empty wallId.
        """
        direction = "north" if orientation == "horizontal" else "west"
        return self._add_opening(
            "door",
            direction,
            0,
            width,
            6.83,
            "",
            0.0,
            label,
            explicit_x=x,
            explicit_y=y,
        )

    def _place_row(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Flexible-width row placement, ported from BuildMate v6's JS
        `buildLayout()` (Step 5): items with a 'fixed_w' claim their share
        of the row first; every remaining item splits the leftover width
        equally. Each item dict needs: type, label, name, color, and
        optionally fixed_w / size_category. Returns the placed rooms with
        their resolved x/width so callers can add doors/windows on the
        correct edges.
        """
        n = len(items)
        gaps = max(0, n - 1) * self.wall_int
        fixed_total = sum(it.get("fixed_w", 0) or 0 for it in items)
        flex_items = [it for it in items if not it.get("fixed_w")]
        flex_w = max(6.0, (w - fixed_total - gaps) / len(flex_items)) if flex_items else 0.0

        cx = x
        placed = []
        for it in items:
            iw = it.get("fixed_w") or flex_w
            room = self._add_room(
                it.get("label", it["name"]), it["name"], it["type"],
                cx, y, iw, h, it["color"], it.get("size_category", "default"),
            )
            placed.append({**it, "x": cx, "width": iw, "room": room})
            cx += iw + self.wall_int
        return placed

    def generate(self) -> Dict:
        buildable = self.analysis
        strategy_name = "Traditional Front-to-Back"

        if self.variant_num == 0:
            strategy_name = "Traditional Front-to-Back"
            self._generate_variant_a()
        elif self.variant_num == 1:
            strategy_name = "Split Left-Right"
            self._generate_variant_b()
        else:
            strategy_name = "Open Courtyard"
            self._generate_variant_c()

        self._generate_shell()
        self._generate_openings()
        self._generate_roof_view(strategy_name)

        return {
            "status": "success",
            "variant": chr(65 + self.variant_num),
            "variantName": strategy_name,
            "rooms": self.rooms,
            "walls": self.walls,
            "openings": self.openings,
            "dimensions": {
                "plotWidth": buildable["plot_width"],
                "plotLength": buildable["plot_length"],
                "buildableWidth": self.buildable_width,
                "buildableLength": self.buildable_length,
                "totalArea": self.buildable_width * self.buildable_length,
            },
            "buildable": {
                "width": self.buildable_width,
                "length": self.buildable_length,
                "offsetX": self.start_x,
                "offsetY": self.start_y,
                "min_x": self.min_x,
                "max_x": self.max_x,
                "min_y": self.min_y,
                "max_y": self.max_y,
            },
            "plot": {
                "unit": self.brief.get("plot", {}).get("unit", "feet"),
                "corners": [
                    [0, 0],
                    [buildable["plot_width"], 0],
                    [buildable["plot_width"], buildable["plot_length"]],
                    [0, buildable["plot_length"]],
                ],
            },
            "warnings": self._build_warnings(),
            "analysis": self.analysis,
            "meta": {
                "generator": "arch-v4",
                "strategy": strategy_name,
                "floors": int(self.brief.get("floors", 1) or 1),
                "floorHeight": self.floor_height,
            },
            "roofView": self.roof_view,
        }

    def _build_warnings(self) -> List[str]:
        warnings = []
        for room in self.rooms:
            area = room["width"] * room["height"]
            if room["type"] == "bedroom" and area < 100:
                warnings.append(f"{room['name']} is compact and may need refinement.")
            if room["type"] == "kitchen" and area < 90:
                warnings.append("Kitchen is compact relative to a realistic family layout.")
        return warnings

    def _generate_bedroom_wing(self, x, zone_y, w, zone_h, style="stacked"):
        """Shared logic: lays out bedrooms + bathrooms around a real corridor.

        Every bedroom gets a genuine door into a corridor (never just windows),
        and the corridor itself gets a door connecting back to the rest of the
        house, so no room is ever sealed off or reachable only by walking
        through another bedroom.

        style="stacked": used when the private zone is a horizontal band
            below/behind the public rooms (variants A and C). Layout across
            the width is [bedrooms | corridor | bathrooms]; the corridor's
            open end faces the public zone above it (a horizontal doorway at
            its north end), and bedrooms/bathrooms each get their own vertical
            door into the corridor.

        style="side": used when the private zone is a vertical band beside
            the public rooms (variant B). Layout across the width is
            [corridor | bedrooms | bathrooms]; the corridor's open end faces
            the public zone beside it (a vertical doorway at its west end),
            bedrooms get a vertical door into the corridor, and bathrooms are
            ensuite off their bedroom (a standard, realistic arrangement).
        """
        bed_count = max(1, self._room_count("bedroom") or 3)
        bath_count = max(1, self._room_count("bathroom") or min(2, bed_count))

        corridor_w = min(4.0, max(3.0, min(w, zone_h) * 0.09))
        bed_w = max(11.0, w * 0.52 if style == "stacked" else (w - corridor_w - self.wall_int) * 0.62)
        bath_w = max(6.0, w - bed_w - corridor_w - 2 * self.wall_int)

        bed_h = (zone_h - (bed_count - 1) * self.wall_int) / bed_count
        colors = ["#E0E6F0", "#D4E4F0", "#C8DDFF"]

        if style == "stacked":
            corridor_x = x + bed_w + self.wall_int
            bath_x = corridor_x + corridor_w + self.wall_int

            self._add_room("HALL", "Corridor", "corridor", corridor_x, zone_y, corridor_w, zone_h, "#F7F7F5")
            # Corridor's open end connects north, toward the public zone above it.
            self._add_interior_door(
                corridor_x + corridor_w / 2, zone_y, "horizontal",
                width=min(3.5, corridor_w), label="D-H",
            )

            for i in range(bed_count):
                by = zone_y + i * (bed_h + self.wall_int)
                self._add_room(
                    "MASTER\nBED" if i == 0 else f"BED {i+1}",
                    "Master Bedroom" if i == 0 else f"Bedroom {i+1}",
                    "bedroom", x, by, bed_w, bed_h,
                    colors[i % len(colors)], "master" if i == 0 else "default",
                )
                self._add_interior_door(x + bed_w, by + bed_h / 2, "vertical", width=3.0, label=f"D-B{i+1}")

                if i < bath_count:
                    self._add_room(f"BATH {i+1}", f"Bathroom {i+1}", "bathroom", bath_x, by, bath_w, bed_h, "#D4E8FF")
                    self._add_interior_door(bath_x, by + bed_h / 2, "vertical", width=2.6, label=f"D-Ba{i+1}")

        else:  # style == "side"
            corridor_x = x
            bed_x = corridor_x + corridor_w + self.wall_int
            bath_x = bed_x + bed_w + self.wall_int

            self._add_room("HALL", "Corridor", "corridor", corridor_x, zone_y, corridor_w, zone_h, "#F7F7F5")
            # Corridor's open end connects west, toward the public zone beside it.
            self._add_interior_door(
                corridor_x, zone_y + zone_h / 2, "vertical",
                width=min(3.5, zone_h), label="D-H",
            )

            for i in range(bed_count):
                by = zone_y + i * (bed_h + self.wall_int)
                self._add_room(
                    "MASTER\nBED" if i == 0 else f"BED {i+1}",
                    "Master Bedroom" if i == 0 else f"Bedroom {i+1}",
                    "bedroom", bed_x, by, bed_w, bed_h,
                    colors[i % len(colors)], "master" if i == 0 else "default",
                )
                # Door from corridor straight into the bedroom.
                self._add_interior_door(bed_x, by + bed_h / 2, "vertical", width=3.0, label=f"D-B{i+1}")

                if i < bath_count:
                    self._add_room(f"BATH {i+1}", f"Bathroom {i+1}", "bathroom", bath_x, by, bath_w, bed_h, "#D4E8FF")
                    # Ensuite door: bathroom opens off its own bedroom.
                    self._add_interior_door(bath_x, by + bed_h / 2, "vertical", width=2.6, label=f"D-Ba{i+1}")

        return corridor_x

    def _generate_variant_a(self):
        """Front-to-back zoning: public -> semi-private -> private.
        Front and mid rows now use flexible/proportional widths (ported
        from buildmate_v6.html) instead of hard-coded splits."""
        x = self.start_x + self.wall_ext
        y = self.start_y + self.wall_ext
        w = self.buildable_width - 2 * self.wall_ext
        h = self.buildable_length - 2 * self.wall_ext

        front_h = max(12.0, h * 0.24)
        mid_h = max(12.0, h * 0.22)
        rear_h = max(18.0, h - front_h - mid_h - 2 * self.wall_int)

        has_garage = bool(self.brief.get("hasGarage", False))
        has_store = bool(self.brief.get("hasStoreRoom", False))
        has_stairs = bool(self.brief.get("hasStaircase", False) or int(self.brief.get("floors", 1) or 1) > 1)

        # ── Front row: garage (fixed width) + drawing room (flexible) ──
        front_items = []
        if has_garage:
            front_items.append({"type": "garage", "name": "Garage", "color": "#E8E8E8",
                                 "fixed_w": min(16.0, max(10.0, w * 0.34))})
        front_items.append({"type": "drawing", "name": "Drawing Room", "color": "#E8F0FF"})
        self._place_row(x, y, w, front_h, front_items)

        # ── Mid row: living + dining, split evenly ──
        mid_y = y + front_h + self.wall_int
        mid_items = [
            {"type": "living", "name": "Living Room", "color": "#E8F8E8"},
            {"type": "dining", "name": "Dining Room", "color": "#FFE8D4"},
        ]
        self._place_row(x, mid_y, w, mid_h, mid_items)

        # ── Rear-of-mid row: kitchen + utility/store ──
        kitchen_y = mid_y + mid_h + self.wall_int
        util_items = [
            {"type": "kitchen", "name": "Kitchen", "color": "#FFF9E6"},
            {"type": "store" if has_store else "other", "name": "Utility / Store", "color": "#F4F4F4"},
        ]
        self._place_row(x, kitchen_y, w, rear_h * 0.48, util_items)

        bedroom_y = kitchen_y + rear_h * 0.48 + self.wall_int
        remaining_h = max(10.0, rear_h - rear_h * 0.48 - self.wall_int)

        self._generate_bedroom_wing(x, bedroom_y, w, remaining_h, style="stacked")

        if has_stairs:
            stair_x = x + w * 0.48
            stair_y = mid_y
            stair_w = min(8.0, max(6.0, w * 0.18))
            stair_h = min(10.0, max(7.0, mid_h + rear_h * 0.18))
            self._add_room("STAIR", "Staircase", "staircase", stair_x, stair_y, stair_w, stair_h, "#F0F0F0")

    def _generate_variant_b(self):
        """Split layout: service on left, private rooms on right."""
        x = self.start_x + self.wall_ext
        y = self.start_y + self.wall_ext
        w = self.buildable_width - 2 * self.wall_ext
        h = self.buildable_length - 2 * self.wall_ext

        left_w = max(12.0, w * 0.42)
        right_w = max(14.0, w - left_w - self.wall_int)

        front_h = max(10.0, h * 0.28)
        mid_h = max(10.0, h * 0.24)
        rear_h = max(16.0, h - front_h - mid_h - 2 * self.wall_int)

        has_garage = bool(self.brief.get("hasGarage", False))
        has_stairs = bool(self.brief.get("hasStaircase", False) or int(self.brief.get("floors", 1) or 1) > 1)

        self._add_room("DRAWING\nROOM", "Drawing Room", "drawing", x, y, left_w, front_h, "#E8F0FF")
        if has_garage:
            self._add_room("GARAGE", "Garage", "garage", x, y + front_h + self.wall_int, left_w, mid_h, "#E8E8E8")
        else:
            self._add_room("LOUNGE", "Family Lounge", "living", x, y + front_h + self.wall_int, left_w, mid_h, "#E8F8E8")

        self._add_room(
            "KITCHEN",
            "Kitchen",
            "kitchen",
            x,
            y + front_h + mid_h + 2 * self.wall_int,
            left_w,
            rear_h * 0.55,
            "#FFF9E6",
        )

        if has_stairs:
            self._add_room(
                "STAIR",
                "Staircase",
                "staircase",
                x + left_w * 0.24,
                y + front_h + mid_h + 2 * self.wall_int,
                left_w * 0.52,
                rear_h * 0.30,
                "#F0F0F0",
            )

        self._add_room(
            "DINING",
            "Dining Room",
            "dining",
            x,
            y + front_h + mid_h + 2 * self.wall_int + rear_h * 0.55 + self.wall_int,
            left_w,
            rear_h * 0.45 - self.wall_int,
            "#FFE8D4",
        )

        self._generate_bedroom_wing(x + left_w + self.wall_int, y, right_w, h, style="side")

    def _generate_variant_c(self):
        """Open-plan layout with central family space and strong ventilation.
        Kitchen/dining row now uses flexible width distribution."""
        x = self.start_x + self.wall_ext
        y = self.start_y + self.wall_ext
        w = self.buildable_width - 2 * self.wall_ext
        h = self.buildable_length - 2 * self.wall_ext

        front_h = max(11.0, h * 0.22)
        middle_h = max(16.0, h * 0.35)
        rear_h = max(18.0, h - front_h - middle_h - 2 * self.wall_int)

        side_w = max(10.0, w * 0.28)
        center_w = max(12.0, w - 2 * side_w - 2 * self.wall_int)

        self._add_room("DRAWING\nROOM", "Drawing Room", "drawing", x, y, w, front_h, "#E8F0FF")

        self._add_room(
            "FAMILY\nLOUNGE",
            "Family Lounge",
            "living",
            x + side_w + self.wall_int,
            y + front_h + self.wall_int,
            center_w,
            middle_h,
            "#E8F8E8",
        )

        row_y = y + front_h + self.wall_int
        self._add_room("KITCHEN", "Kitchen", "kitchen", x, row_y, side_w, middle_h * 0.58, "#FFF9E6")
        self._add_room(
            "DINING", "Dining Room", "dining",
            x + side_w + self.wall_int + center_w + self.wall_int, row_y,
            side_w, middle_h * 0.58, "#FFE8D4",
        )

        if self.brief.get("hasStaircase", False) or int(self.brief.get("floors", 1) or 1) > 1:
            stair_w = max(6.5, side_w * 0.7)
            self._add_room(
                "STAIR",
                "Staircase",
                "staircase",
                x + (w - stair_w) / 2,
                y + front_h + middle_h * 0.55,
                stair_w,
                middle_h * 0.38,
                "#F0F0F0",
            )

        rear_y = y + front_h + middle_h + 2 * self.wall_int
        self._generate_bedroom_wing(x, rear_y, w, rear_h, style="stacked")

    def _generate_shell(self):
        self._add_wall(self.min_x, self.min_y, self.max_x, self.min_y, "exterior", "north", True)
        self._add_wall(self.min_x, self.max_y, self.max_x, self.max_y, "exterior", "south", True)
        self._add_wall(self.min_x, self.min_y, self.min_x, self.max_y, "exterior", "west", True)
        self._add_wall(self.max_x, self.min_y, self.max_x, self.max_y, "exterior", "east", True)

        # Simple structural grid lines / major partitions based on room edges
        for room in self.rooms:
            if room["type"] in ["drawing", "living", "dining", "kitchen", "staircase"]:
                self._add_wall(
                    room["x"],
                    room["y"],
                    room["x"] + room["width"],
                    room["y"],
                    "interior",
                    "horizontal",
                    False,
                )

    def _room_exposed_sides(self, room: Dict[str, Any]) -> List[str]:
        sides = []
        edge_tol = max(0.5, min(self.buildable_width, self.buildable_length) * 0.06)

        if room["y"] <= self.min_y + self.wall_ext + edge_tol:
            sides.append("north")
        if room["y"] + room["height"] >= self.max_y - self.wall_ext - edge_tol:
            sides.append("south")
        if room["x"] <= self.min_x + self.wall_ext + edge_tol:
            sides.append("west")
        if room["x"] + room["width"] >= self.max_x - self.wall_ext - edge_tol:
            sides.append("east")
        return sides

    def _generate_openings(self):
        door_count = 1
        win_count = 1

        for room in self.rooms:
            if room["type"] in ["store", "corridor"]:
                continue

            sides = self._room_exposed_sides(room)
            if not sides:
                continue

            for side in sides:
                if side in ["north", "south"]:
                    offset = max(1.0, (room["x"] + room["width"] / 2.0) - self.min_x)
                else:
                    offset = max(1.0, (room["y"] + room["height"] / 2.0) - self.min_y)

                is_door_room = room["type"] in ["drawing", "living", "garage", "staircase"]
                if side == "south" and room["type"] in ["kitchen", "dining"]:
                    is_door_room = True

                if is_door_room and side == "north" and room["type"] in ["drawing", "living", "garage"]:
                    self._add_opening(
                        "door",
                        side,
                        offset,
                        3.0,
                        6.83,
                        self.wall_ids.get(side, ""),
                        0.0,
                        f"D{door_count}",
                    )
                    door_count += 1
                elif is_door_room and side == "south" and room["type"] in ["kitchen", "dining"]:
                    self._add_opening(
                        "door",
                        side,
                        offset,
                        3.0,
                        6.83,
                        self.wall_ids.get(side, ""),
                        0.0,
                        f"D{door_count}",
                    )
                    door_count += 1
                else:
                    self._add_opening(
                        "window",
                        side,
                        offset,
                        3.5,
                        4.0,
                        self.wall_ids.get(side, ""),
                        3.0,
                        f"W{win_count}",
                    )
                    win_count += 1

    def _generate_roof_view(self, strategy_name: str):
        rooms = []
        for room in self.rooms:
            rooms.append(
                {
                    "id": room["id"],
                    "type": room["type"],
                    "label": room["label"],
                    "name": room["name"],
                    "x": room["x"],
                    "y": room["y"],
                    "width": room["width"],
                    "height": room["height"],
                    "color": room["color"],
                }
            )

        elements = [
            {
                "type": "parapet",
                "x": self.min_x,
                "y": self.min_y,
                "width": self.buildable_width,
                "height": self.buildable_length,
                "parapetHeight": 1.0,
            }
        ]

        stair_rooms = [r for r in self.rooms if r["type"] == "staircase"]
        if stair_rooms:
            sr = stair_rooms[0]
            elements.append(
                {
                    "type": "stair_headroom",
                    "x": sr["x"],
                    "y": sr["y"],
                    "width": sr["width"],
                    "height": sr["height"],
                }
            )
        else:
            if self.brief.get("hasStaircase", False) or int(self.brief.get("floors", 1) or 1) > 1:
                elements.append(
                    {
                        "type": "stair_headroom",
                        "x": self.min_x + self.buildable_width * 0.72,
                        "y": self.min_y + self.buildable_length * 0.68,
                        "width": min(7.0, self.buildable_width * 0.16),
                        "height": min(9.0, self.buildable_length * 0.12),
                    }
                )

        if int(self.brief.get("floors", 1) or 1) > 1:
            elements.append(
                {
                    "type": "water_tank",
                    "x": self.min_x + self.buildable_width * 0.08,
                    "y": self.min_y + self.buildable_length * 0.08,
                    "width": 5.0,
                    "height": 5.0,
                }
            )

        self.roof_view = {
            "type": "flat",
            "strategy": strategy_name,
            "outline": {
                "min_x": self.min_x,
                "min_y": self.min_y,
                "max_x": self.max_x,
                "max_y": self.max_y,
            },
            "rooms": rooms,
            "elements": elements,
            "parapetHeight": 1.0,
        }


def _count_room_type(brief: Dict[str, Any], room_type: str) -> int:
    for req in brief.get("rooms", []) or []:
        if req.get("type") == room_type:
            return max(0, int(req.get("count", 1)))
    return 0


def generate_floor_plan(brief):
    """Generate a single floor plan"""
    try:
        validator = ArchitecturalValidator(brief)
        feasible, msg, _analysis = validator.validate()

        if not feasible:
            return {
                "status": "error",
                "message": msg,
                "rooms": [],
                "walls": [],
                "openings": [],
                "feasible": False,
            }

        generator = ProfessionalLayoutGenerator(brief, variant_num=0)
        layout = generator.generate()
        layout["feasible"] = True
        return layout
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "rooms": [],
            "walls": [],
            "openings": [],
            "feasible": False,
        }


def generate_three_variants(brief):
    """Generate 3 different architectural variants"""
    try:
        validator = ArchitecturalValidator(brief)
        feasible, msg, _analysis = validator.validate()

        if not feasible:
            return [
                {
                    "status": "error",
                    "message": msg,
                    "rooms": [],
                    "walls": [],
                    "openings": [],
                    "feasible": False,
                }
            ]

        variants = []
        variant_names = [
            "Traditional Front-to-Back",
            "Split Left-Right",
            "Open Courtyard",
        ]

        for i in range(3):
            try:
                generator = ProfessionalLayoutGenerator(brief, variant_num=i)
                layout = generator.generate()
                layout["variant"] = chr(65 + i)
                layout["variantName"] = variant_names[i]
                layout["feasible"] = True
                variants.append(layout)
            except Exception as e:
                variants.append(
                    {
                        "status": "error",
                        "message": f"Variant {chr(65 + i)} failed: {str(e)}",
                        "rooms": [],
                        "walls": [],
                        "openings": [],
                        "variant": chr(65 + i),
                        "variantName": variant_names[i],
                        "feasible": False,
                    }
                )

        return variants
    except Exception as e:
        return [
            {
                "status": "error",
                "message": str(e),
                "rooms": [],
                "walls": [],
                "openings": [],
                "feasible": False,
            }
        ]


__all__ = ["generate_floor_plan", "generate_three_variants", "ArchitecturalValidator", "ProfessionalLayoutGenerator"]