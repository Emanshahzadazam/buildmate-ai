"""
BuildMate AI — Smart Layout Generator

Algorithm: Zone-based room placement
- Plot ko public/service/private zones me divide karte hain
- Rooms ko zones me assign karte hain based on type
- Within zones, rooms ko bedroom sizes ke priority ke saath place karte hain
- Walls aur openings calculate karte hain

Yeh "expert system" approach hai — Pakistani residential architecture
ki standard practices ko rules me encode kiya gaya.
"""

import math
from typing import Dict, List, Tuple

# ════════════════════════════════════════════════════════════════
# CONSTANTS
# ════════════════════════════════════════════════════════════════

FT_TO_M = 0.3048
IN_TO_M = 0.0254

# Zone proportions (sum = 1.0)
ZONE_RATIOS = {
    "public": 0.35,    # front — drawing, living, dining
    "service": 0.25,   # middle — kitchen, store, staircase
    "private": 0.40,   # back — bedrooms, bathrooms
}

# Which zone a room type belongs to
ROOM_ZONES = {
    "drawing":   "public",
    "living":    "public",
    "dining":    "public",
    "kitchen":   "service",
    "store":     "service",
    "staircase": "service",
    "garage":    "service",
    "bedroom":   "private",
    "bathroom":  "private",
    "study":     "private",
}

# Room labels
ROOM_LABELS = {
    "bedroom": "Bedroom",
    "bathroom": "Bathroom",
    "kitchen": "Kitchen",
    "living": "Living Room",
    "dining": "Dining",
    "drawing": "Drawing Room",
    "study": "Study",
    "garage": "Garage",
    "store": "Store",
    "staircase": "Stairs",
    "other": "Room",
}

# Bedroom size weights (master gets more space, small less)
BEDROOM_WEIGHTS = {
    "master": 1.5,
    "medium": 1.0,
    "small":  0.7,
    "default": 1.0,
}

# Standard door/window dimensions (meters)
DOOR_WIDTH_M = 0.9
DOOR_HEIGHT_M = 2.1
WINDOW_WIDTH_M = 1.2
WINDOW_HEIGHT_M = 1.2
WINDOW_SILL_M = 0.9


# ════════════════════════════════════════════════════════════════
# MAIN ENTRY
# ════════════════════════════════════════════════════════════════

def generate_smart_layout(request_dict: dict) -> dict:
    """
    Main function — takes parsed request, returns layout response dict.
    """
    warnings = []

    # 1. Convert plot dimensions to meters
    unit = request_dict["plot"]["unit"]
    to_m = FT_TO_M if unit == "feet" else 1.0

    fw = request_dict["plot"]["front_width"] * to_m
    bw = request_dict["plot"]["back_width"] * to_m
    ll = request_dict["plot"]["left_length"] * to_m
    rl = request_dict["plot"]["right_length"] * to_m

    # Plot corners (top-left = origin, clockwise)
    # NW → NE → SE → SW
    avg_top_y = 0
    avg_bot_y = (ll + rl) / 2  # average length
    plot_corners = [
        [0,    0],
        [fw,   0],
        [bw,   avg_bot_y],
        [0,    avg_bot_y],
    ]

    # 2. Apply setbacks → buildable area
    sb = request_dict["setbacks"]
    sb_front = sb["front"] * to_m
    sb_back = sb["back"] * to_m
    sb_left = sb["left"] * to_m
    sb_right = sb["right"] * to_m

    avg_width = (fw + bw) / 2
    buildable_w = avg_width - sb_left - sb_right
    buildable_l = avg_bot_y - sb_front - sb_back

    if buildable_w <= 2 or buildable_l <= 3:
        warnings.append(
            f"Buildable area too small ({buildable_w:.1f} × {buildable_l:.1f} m). "
            "Consider reducing setbacks."
        )

    buildable = {
        "width": buildable_w,
        "length": buildable_l,
        "offsetX": sb_left,
        "offsetY": sb_front,
    }

    # 3. Expand room counts → flat list
    flat_rooms = _flatten_rooms(request_dict["rooms"])
    if not flat_rooms:
        warnings.append("No rooms specified")
        return _empty_response(plot_corners, buildable, warnings)

    # 4. Assign rooms to zones
    zone_rooms = _assign_to_zones(flat_rooms)

    # 5. Place rooms within each zone
    placed_rooms = _place_rooms_in_zones(zone_rooms, buildable_w, buildable_l, sb_left, sb_front)

    # 6. Generate walls (exterior + interior between rooms)
    wall_thickness_ext = request_dict["technical"]["wall_thickness_ext"] * IN_TO_M
    wall_thickness_int = request_dict["technical"]["wall_thickness_int"] * IN_TO_M
    walls = _generate_walls(plot_corners, placed_rooms, wall_thickness_ext, wall_thickness_int)

    # 7. Generate openings (doors + windows)
    openings = _generate_openings(placed_rooms, walls, request_dict)

    return {
        "plot": {"unit": "m", "corners": plot_corners},
        "buildable": buildable,
        "rooms": placed_rooms,
        "walls": walls,
        "openings": openings,
        "warnings": warnings,
        "meta": {"generator": "smart-zone-v1", "version": "1.0.0"},
    }


# ════════════════════════════════════════════════════════════════
# STEP 3: Flatten rooms
# ════════════════════════════════════════════════════════════════

def _flatten_rooms(rooms: List[dict]) -> List[dict]:
    """Expand {type: bedroom, count: 2} into 2 individual rooms."""
    flat = []
    for r in rooms:
        if r["count"] <= 0:
            continue
        for i in range(r["count"]):
            flat.append({
                "type": r["type"],
                "size": r.get("size", "default"),
                "index": i + 1 if r["count"] > 1 else None,
            })
    return flat


# ════════════════════════════════════════════════════════════════
# STEP 4: Assign rooms to zones
# ════════════════════════════════════════════════════════════════

def _assign_to_zones(flat_rooms: List[dict]) -> Dict[str, List[dict]]:
    """Group rooms by zone (public / service / private)."""
    zones = {"public": [], "service": [], "private": []}
    for room in flat_rooms:
        zone = ROOM_ZONES.get(room["type"], "service")
        zones[zone].append(room)
    return zones


# ════════════════════════════════════════════════════════════════
# STEP 5: Place rooms within zones
# ════════════════════════════════════════════════════════════════

def _place_rooms_in_zones(
    zone_rooms: Dict[str, List[dict]],
    buildable_w: float,
    buildable_l: float,
    offset_x: float,
    offset_y: float,
) -> List[dict]:
    """
    Each zone gets a horizontal strip. Within each strip,
    rooms are placed side-by-side, sized by bedroom weights.
    """
    placed = []
    margin = 0.05  # small gap between rooms
    room_id = 1

    current_y = offset_y

    for zone_name, ratio in ZONE_RATIOS.items():
        rooms = zone_rooms.get(zone_name, [])
        zone_height = buildable_l * ratio

        if not rooms:
            current_y += zone_height
            continue

        # Compute weights for room widths
        weights = []
        for r in rooms:
            if r["type"] == "bedroom":
                w = BEDROOM_WEIGHTS.get(r["size"], 1.0)
            elif r["type"] == "bathroom":
                w = 0.5  # bathrooms small
            elif r["type"] in ("living", "drawing"):
                w = 1.5
            elif r["type"] == "kitchen":
                w = 1.2
            elif r["type"] == "store":
                w = 0.4
            else:
                w = 1.0
            weights.append(w)

        total_weight = sum(weights)
        current_x = offset_x

        for r, w in zip(rooms, weights):
            room_w = (buildable_w * w / total_weight) - margin
            room_h = zone_height - margin

            base_label = ROOM_LABELS.get(r["type"], "Room")
            label = f"{base_label} {r['index']}" if r["index"] else base_label

            placed.append({
                "id": f"r{room_id}",
                "type": r["type"],
                "label": label,
                "sizeCategory": r["size"],
                "x": round(current_x, 3),
                "y": round(current_y, 3),
                "width": round(room_w, 3),
                "height": round(room_h, 3),
            })

            room_id += 1
            current_x += room_w + margin

        current_y += zone_height

    return placed


# ════════════════════════════════════════════════════════════════
# STEP 6: Generate walls
# ════════════════════════════════════════════════════════════════

def _generate_walls(
    plot_corners: List[List[float]],
    rooms: List[dict],
    thickness_ext: float,
    thickness_int: float,
) -> List[dict]:
    """Exterior walls = plot perimeter. Interior walls = between rooms."""
    walls = []
    wid = 1

    # Exterior — 4 walls around plot
    for i in range(4):
        x1, y1 = plot_corners[i]
        x2, y2 = plot_corners[(i + 1) % 4]
        walls.append({
            "id": f"w-ext-{i + 1}",
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "thickness": thickness_ext,
            "kind": "exterior",
        })

    # Interior — boundaries between adjacent rooms
    # For each room, add walls on right and bottom sides (other rooms add their own)
    for r in rooms:
        # Right wall
        walls.append({
            "id": f"w-int-{wid}",
            "x1": r["x"] + r["width"],
            "y1": r["y"],
            "x2": r["x"] + r["width"],
            "y2": r["y"] + r["height"],
            "thickness": thickness_int,
            "kind": "interior",
        })
        wid += 1
        # Bottom wall
        walls.append({
            "id": f"w-int-{wid}",
            "x1": r["x"],
            "y1": r["y"] + r["height"],
            "x2": r["x"] + r["width"],
            "y2": r["y"] + r["height"],
            "thickness": thickness_int,
            "kind": "interior",
        })
        wid += 1

    return walls


# ════════════════════════════════════════════════════════════════
# STEP 7: Generate openings
# ════════════════════════════════════════════════════════════════

def _generate_openings(rooms, walls, request_dict) -> List[dict]:
    """
    Door for each room (one entrance per room).
    Windows on rooms with exterior walls (front + sides).
    Main entrance: door on the front exterior wall.
    """
    openings = []
    oid = 1

    # Main entrance — front exterior wall, centered
    front_walls = [w for w in walls if w["kind"] == "exterior" and w["y1"] == 0 and w["y2"] == 0]
    if front_walls:
        front_wall = front_walls[0]
        wall_length = abs(front_wall["x2"] - front_wall["x1"])
        openings.append({
            "id": f"o{oid}",
            "wallId": front_wall["id"],
            "kind": "door",
            "offset": wall_length / 2 - DOOR_WIDTH_M / 2,
            "width": DOOR_WIDTH_M,
            "height": DOOR_HEIGHT_M,
            "sillHeight": 0,
        })
        oid += 1

    # Windows on front exterior wall — for public zone rooms
    if front_walls:
        front_wall = front_walls[0]
        wall_length = abs(front_wall["x2"] - front_wall["x1"])

        public_rooms = [r for r in rooms if ROOM_ZONES.get(r["type"]) == "public"]
        # Skip first room (door is at center), add windows at quarter points
        for i, r in enumerate(public_rooms[:2]):
            offset = wall_length * (0.25 + i * 0.5) - WINDOW_WIDTH_M / 2
            if 0 < offset < wall_length - WINDOW_WIDTH_M:
                openings.append({
                    "id": f"o{oid}",
                    "wallId": front_wall["id"],
                    "kind": "window",
                    "offset": offset,
                    "width": WINDOW_WIDTH_M,
                    "height": WINDOW_HEIGHT_M,
                    "sillHeight": WINDOW_SILL_M,
                })
                oid += 1

    # Windows on left + right exterior walls — for rooms touching them
    side_walls = [w for w in walls if w["kind"] == "exterior" and (w["x1"] == w["x2"])]
    for side_wall in side_walls:
        wall_length = abs(side_wall["y2"] - side_wall["y1"])
        # One window per side wall (middle)
        offset = wall_length / 2 - WINDOW_WIDTH_M / 2
        if offset > 0:
            openings.append({
                "id": f"o{oid}",
                "wallId": side_wall["id"],
                "kind": "window",
                "offset": offset,
                "width": WINDOW_WIDTH_M,
                "height": WINDOW_HEIGHT_M,
                "sillHeight": WINDOW_SILL_M,
            })
            oid += 1

    # Window on back exterior wall — for private zone (bedrooms)
    back_walls = [w for w in walls if w["kind"] == "exterior" and w["y1"] == w["y2"] and w["y1"] > 0]
    if back_walls:
        back_wall = back_walls[0]
        wall_length = abs(back_wall["x2"] - back_wall["x1"])
        # Bedroom windows at quarter points
        bedrooms = [r for r in rooms if r["type"] == "bedroom"]
        for i, r in enumerate(bedrooms[:2]):
            offset = wall_length * (0.25 + i * 0.5) - WINDOW_WIDTH_M / 2
            if 0 < offset < wall_length - WINDOW_WIDTH_M:
                openings.append({
                    "id": f"o{oid}",
                    "wallId": back_wall["id"],
                    "kind": "window",
                    "offset": offset,
                    "width": WINDOW_WIDTH_M,
                    "height": WINDOW_HEIGHT_M,
                    "sillHeight": WINDOW_SILL_M,
                })
                oid += 1

    return openings


# ════════════════════════════════════════════════════════════════
# Empty response (for edge cases)
# ════════════════════════════════════════════════════════════════

def _empty_response(corners, buildable, warnings):
    return {
        "plot": {"unit": "m", "corners": corners},
        "buildable": buildable,
        "rooms": [],
        "walls": [],
        "openings": [],
        "warnings": warnings,
        "meta": {"generator": "smart-zone-v1", "version": "1.0.0"},
    }