"""
BuildMate AI — Architectural Layout Generator v2
================================================
Fixed version:
- Attached bathrooms properly placed next to bedrooms
- Bedroom doors open into zone boundary (not kitchen)
- 3 layout variants with different arrangements
- Proper door/window placement
"""

from typing import List

FT_TO_M = 0.3048
IN_TO_M = 0.0254
MARGIN = 0.05
DOOR_WIDTH = 0.9
WINDOW_WIDTH = 1.2


# ═══════════════════════════════════════════════════════════════
# MAIN ENTRY
# ═══════════════════════════════════════════════════════════════

def generate_variants(request: dict) -> List[dict]:
    unit = request["plot"]["unit"]
    to_m = FT_TO_M if unit == "feet" else 1.0

    fw = request["plot"]["front_width"] * to_m
    bw_plot = request["plot"]["back_width"] * to_m
    ll = request["plot"]["left_length"] * to_m
    rl = request["plot"]["right_length"] * to_m

    avg_w = (fw + bw_plot) / 2
    avg_l = (ll + rl) / 2

    sb = request["setbacks"]
    bx = sb["left"] * to_m
    by = sb["front"] * to_m
    bw = avg_w - sb["left"] * to_m - sb["right"] * to_m
    bl = avg_l - sb["front"] * to_m - sb["back"] * to_m

    ext_t = request["technical"]["wall_thickness_ext"] * IN_TO_M
    int_t = request["technical"]["wall_thickness_int"] * IN_TO_M

    brief = _parse_brief(request)

    variants = []
    for i in range(3):
        try:
            layout = _generate_layout(bx, by, bw, bl, avg_w, avg_l, ext_t, int_t, brief, variant=i)
            layout["variantIndex"] = i
            layout["variantName"] = ["Layout A", "Layout B", "Layout C"][i]
            variants.append(layout)
        except Exception as e:
            import traceback
            print(f"Variant {i} failed: {e}")
            traceback.print_exc()

    if not variants:
        raise ValueError("All layout variants failed")
    return variants


# ═══════════════════════════════════════════════════════════════
# PARSE BRIEF
# ═══════════════════════════════════════════════════════════════

def _parse_brief(req: dict) -> dict:
    rooms = req.get("rooms", [])
    bedrooms = []
    bathrooms_count = 0
    has_kitchen = False
    has_living = False
    has_dining = False
    has_drawing = False

    for r in rooms:
        rtype = r["type"]
        count = r.get("count", 1)
        size = r.get("size", "default")

        if rtype == "bedroom":
            for i in range(count):
                s = size if size != "default" else "medium"
                bedrooms.append({"size": s, "index": i + 1 if count > 1 else None})
        elif rtype == "bathroom":
            bathrooms_count += count
        elif rtype == "kitchen":
            has_kitchen = True
        elif rtype == "living":
            has_living = True
        elif rtype == "dining":
            has_dining = True
        elif rtype == "drawing":
            has_drawing = True

    connectivity = req.get("connectivity", {})

    return {
        "bedrooms": bedrooms,
        "bathrooms_count": bathrooms_count,
        "has_kitchen": has_kitchen,
        "has_living": has_living,
        "has_dining": has_dining,
        "has_drawing": has_drawing,
        "has_garage": req.get("has_garage", False),
        "has_store": req.get("has_store_room", False),
        "has_stairs": req.get("has_staircase", False) or req.get("floors", 1) > 1,
        "floors": req.get("floors", 1),
        "bathroom_mode": connectivity.get("bathroom", "mixed"),
    }


# ═══════════════════════════════════════════════════════════════
# LAYOUT GENERATOR
# ═══════════════════════════════════════════════════════════════

def _generate_layout(bx, by, bw, bl, plot_w, plot_l, ext_t, int_t, brief, variant=0) -> dict:
    rooms = []
    room_id = [1]

    def next_rid():
        r = f"r{room_id[0]}"
        room_id[0] += 1
        return r

    # Zone proportions (front to back)
    if variant == 0:
        pub_r, srv_r, prv_r = 0.28, 0.22, 0.50
    elif variant == 1:
        pub_r, srv_r, prv_r = 0.32, 0.20, 0.48
    else:
        pub_r, srv_r, prv_r = 0.25, 0.25, 0.50

    pub_h = bl * pub_r
    srv_h = bl * srv_r
    prv_h = bl * prv_r

    pub_y = by
    srv_y = by + pub_h
    prv_y = by + pub_h + srv_h

    # ── PUBLIC ZONE ──────────────────────────────────────────
    garage_w = 0
    if brief["has_garage"]:
        garage_w = min(3.5, bw * 0.30)
        rooms.append({
            "id": next_rid(), "type": "garage", "label": "Garage",
            "sizeCategory": "default",
            "x": round(bx, 3), "y": round(pub_y, 3),
            "width": round(garage_w - MARGIN, 3),
            "height": round(pub_h - MARGIN, 3)
        })

    drawing_w = 0
    if brief["has_drawing"]:
        drawing_w = min(bw * 0.38, bw - garage_w)
        rooms.append({
            "id": next_rid(), "type": "drawing", "label": "Drawing Room",
            "sizeCategory": "default",
            "x": round(bx + garage_w, 3), "y": round(pub_y, 3),
            "width": round(drawing_w - MARGIN, 3),
            "height": round(pub_h - MARGIN, 3)
        })

    living_x = bx + garage_w + drawing_w
    living_w = bw - garage_w - drawing_w
    if living_w > 2.0 and brief["has_living"]:
        rooms.append({
            "id": next_rid(), "type": "living", "label": "Living Room",
            "sizeCategory": "default",
            "x": round(living_x, 3), "y": round(pub_y, 3),
            "width": round(living_w - MARGIN, 3),
            "height": round(pub_h - MARGIN, 3)
        })

    # ── SERVICE ZONE ─────────────────────────────────────────
    # Variant 0: kitchen left, dining right
    # Variant 1: kitchen right, dining left
    # Variant 2: open layout, kitchen left larger

    if brief["has_dining"] and brief["has_kitchen"]:
        kit_ratio = 0.45 if variant == 2 else 0.40
        kit_w = bw * kit_ratio
        din_w = bw - kit_w

        if variant == 1:
            # swap: dining left, kitchen right
            rooms.append({
                "id": next_rid(), "type": "dining", "label": "Dining",
                "sizeCategory": "default",
                "x": round(bx, 3), "y": round(srv_y, 3),
                "width": round(din_w - MARGIN, 3),
                "height": round(srv_h - MARGIN, 3)
            })
            rooms.append({
                "id": next_rid(), "type": "kitchen", "label": "Kitchen",
                "sizeCategory": "default",
                "x": round(bx + din_w, 3), "y": round(srv_y, 3),
                "width": round(kit_w - MARGIN, 3),
                "height": round(srv_h - MARGIN, 3)
            })
        else:
            # kitchen left, dining right
            rooms.append({
                "id": next_rid(), "type": "kitchen", "label": "Kitchen",
                "sizeCategory": "default",
                "x": round(bx, 3), "y": round(srv_y, 3),
                "width": round(kit_w - MARGIN, 3),
                "height": round(srv_h - MARGIN, 3)
            })
            rooms.append({
                "id": next_rid(), "type": "dining", "label": "Dining",
                "sizeCategory": "default",
                "x": round(bx + kit_w, 3), "y": round(srv_y, 3),
                "width": round(din_w - MARGIN, 3),
                "height": round(srv_h - MARGIN, 3)
            })
    elif brief["has_kitchen"]:
        rooms.append({
            "id": next_rid(), "type": "kitchen", "label": "Kitchen",
            "sizeCategory": "default",
            "x": round(bx, 3), "y": round(srv_y, 3),
            "width": round(bw - MARGIN, 3),
            "height": round(srv_h - MARGIN, 3)
        })
    elif brief["has_dining"]:
        rooms.append({
            "id": next_rid(), "type": "dining", "label": "Dining",
            "sizeCategory": "default",
            "x": round(bx, 3), "y": round(srv_y, 3),
            "width": round(bw - MARGIN, 3),
            "height": round(srv_h - MARGIN, 3)
        })

    if brief["has_store"]:
        store_w = min(1.8, bw * 0.15)
        store_h = min(2.0, srv_h - MARGIN)
        rooms.append({
            "id": next_rid(), "type": "store", "label": "Store",
            "sizeCategory": "default",
            "x": round(bx + bw - store_w, 3),
            "y": round(srv_y + srv_h - store_h - MARGIN, 3),
            "width": round(store_w - MARGIN, 3),
            "height": round(store_h, 3)
        })

    # ── PRIVATE ZONE ─────────────────────────────────────────
    stair_w = 0
    if brief["has_stairs"]:
        stair_w = min(2.8, bw * 0.20)
        rooms.append({
            "id": next_rid(), "type": "staircase", "label": "Stairs",
            "sizeCategory": "default",
            "x": round(bx, 3), "y": round(prv_y, 3),
            "width": round(stair_w - MARGIN, 3),
            "height": round(prv_h - MARGIN, 3)
        })

    avail_w = bw - stair_w
    avail_h = prv_h

    bedrooms = brief["bedrooms"]
    n_beds = len(bedrooms)
    n_baths = brief["bathrooms_count"]
    bath_mode = brief.get("bathroom_mode", "mixed")

    attached_baths = min(n_baths, n_beds) if bath_mode in ("attached", "mixed") else 0
    common_baths = n_baths - attached_baths

    bed_weights = []
    for b in bedrooms:
        if b["size"] == "master":
            bed_weights.append(1.5)
        elif b["size"] == "small":
            bed_weights.append(0.7)
        else:
            bed_weights.append(1.0)

    # Place bedrooms based on variant
    if variant == 0:
        _place_beds_ltr(rooms, bedrooms, bed_weights, attached_baths,
                        bx + stair_w, prv_y, avail_w, avail_h, next_rid)
    elif variant == 1:
        if n_beds >= 3:
            _place_beds_two_rows(rooms, bedrooms, bed_weights, attached_baths,
                                 bx + stair_w, prv_y, avail_w, avail_h, next_rid)
        else:
            _place_beds_ltr(rooms, bedrooms, bed_weights, attached_baths,
                            bx + stair_w, prv_y, avail_w, avail_h, next_rid)
    else:
        # RTL — reverse order
        _place_beds_ltr(rooms, list(reversed(bedrooms)), list(reversed(bed_weights)),
                        attached_baths, bx + stair_w, prv_y, avail_w, avail_h, next_rid)

    # Common bathrooms
    if common_baths > 0:
        cb_w = min(1.8, avail_w * 0.18)
        cb_h = min(2.4, (avail_h - MARGIN) / common_baths)
        for i in range(common_baths):
            rooms.append({
                "id": next_rid(), "type": "bathroom",
                "label": "Common Bath" if common_baths == 1 else f"Toilet {i+1}",
                "sizeCategory": "default",
                "x": round(bx + stair_w, 3),
                "y": round(prv_y + i * (cb_h + MARGIN), 3),
                "width": round(cb_w - MARGIN, 3),
                "height": round(cb_h - MARGIN, 3)
            })

    # ── Walls + Openings ─────────────────────────────────────
    walls = _generate_walls(rooms, plot_w, plot_l, ext_t, int_t)
    openings = _generate_openings(rooms, walls, brief, bx, by, bw, bl)

    return {
        "plot": {"unit": "m", "corners": [[0,0],[plot_w,0],[plot_w,plot_l],[0,plot_l]]},
        "buildable": {"width": bw, "length": bl, "offsetX": bx, "offsetY": by},
        "rooms": rooms,
        "walls": walls,
        "openings": openings,
        "warnings": [],
        "meta": {"generator": "arch-v2", "version": "2.0.0", "variant": variant}
    }


# ═══════════════════════════════════════════════════════════════
# BEDROOM PLACEMENT
# ═══════════════════════════════════════════════════════════════

def _place_beds_ltr(rooms, bedrooms, weights, attached_baths, start_x, start_y, total_w, total_h, next_rid):
    """Place bedrooms left-to-right. Each bedroom gets attached bath on its RIGHT side."""
    tw = sum(weights)
    if tw == 0:
        return
    cur_x = start_x
    MIN_UNIT_W = 2.0  # minimum unit width to fit bed+bath
    

    for i, (bed, w) in enumerate(zip(bedrooms, weights)):
        has_bath = i < attached_baths
        unit_w = (total_w * w / tw) - MARGIN

        # Attach bathroom if there's room for bed + bath both at minimum size
        if has_bath and unit_w > MIN_UNIT_W:
            # Bath width = 35% of unit but clamped to min/max
            actual_bath_w = max(0.9, min(1.75, unit_w * 0.35))
            bed_w = unit_w - actual_bath_w - MARGIN

            rooms.append({
                "id": next_rid(), "type": "bedroom",
                "label": _bed_label(bed, i),
                "sizeCategory": bed["size"],
                "x": round(cur_x, 3), "y": round(start_y, 3),
                "width": round(bed_w, 3), "height": round(total_h - MARGIN, 3)
            })
            rooms.append({
                "id": next_rid(), "type": "bathroom",
                "label": "Bathroom" if len(bedrooms) == 1 else f"Bathroom {i+1}",
                "sizeCategory": "default",
                "x": round(cur_x + bed_w + MARGIN, 3), "y": round(start_y, 3),
                "width": round(actual_bath_w, 3),
                "height": round(min(2.4, total_h - MARGIN), 3)
            })
        else:
            rooms.append({
                "id": next_rid(), "type": "bedroom",
                "label": _bed_label(bed, i),
                "sizeCategory": bed["size"],
                "x": round(cur_x, 3), "y": round(start_y, 3),
                "width": round(unit_w, 3), "height": round(total_h - MARGIN, 3)
            })

        cur_x += unit_w + MARGIN


def _place_beds_two_rows(rooms, bedrooms, weights, attached_baths, start_x, start_y, total_w, total_h, next_rid):
    """Place bedrooms in 2 horizontal rows."""
    half = len(bedrooms) // 2 or 1
    row_h = (total_h - MARGIN) / 2

    _place_beds_ltr(rooms, bedrooms[:half], weights[:half], attached_baths,
                    start_x, start_y, total_w, row_h, next_rid)
    if bedrooms[half:]:
        _place_beds_ltr(rooms, bedrooms[half:], weights[half:],
                        max(0, attached_baths - half),
                        start_x, start_y + row_h + MARGIN, total_w, row_h, next_rid)


def _bed_label(bed, idx):
    if bed["size"] == "master":
        return "Master Bedroom"
    label_idx = bed.get("index") or (idx + 1)
    return f"Bedroom {label_idx}"


# ═══════════════════════════════════════════════════════════════
# WALL GENERATION
# ═══════════════════════════════════════════════════════════════

def _generate_walls(rooms, plot_w, plot_l, ext_t, int_t) -> list:
    walls = [
        {"id": "w-ext-N", "x1": 0,       "y1": 0,       "x2": plot_w, "y2": 0,       "thickness": ext_t, "kind": "exterior"},
        {"id": "w-ext-E", "x1": plot_w,   "y1": 0,       "x2": plot_w, "y2": plot_l,  "thickness": ext_t, "kind": "exterior"},
        {"id": "w-ext-S", "x1": plot_w,   "y1": plot_l,  "x2": 0,      "y2": plot_l,  "thickness": ext_t, "kind": "exterior"},
        {"id": "w-ext-W", "x1": 0,        "y1": plot_l,  "x2": 0,      "y2": 0,       "thickness": ext_t, "kind": "exterior"},
    ]

    added = set()
    wc = [1]

    def try_add_wall(x1, y1, x2, y2):
        key = f"{min(x1,x2):.2f},{min(y1,y2):.2f},{max(x1,x2):.2f},{max(y1,y2):.2f}"
        if key in added:
            return
        added.add(key)
        walls.append({
            "id": f"w-int-{wc[0]}",
            "x1": round(x1, 3), "y1": round(y1, 3),
            "x2": round(x2, 3), "y2": round(y2, 3),
            "thickness": int_t, "kind": "interior"
        })
        wc[0] += 1

    for i, ra in enumerate(rooms):
        for j, rb in enumerate(rooms):
            if i >= j:
                continue

            rax2 = ra["x"] + ra["width"]
            ray2 = ra["y"] + ra["height"]
            rbx2 = rb["x"] + rb["width"]
            rby2 = rb["y"] + rb["height"]

            # ra bottom touches rb top
            if abs(ray2 - rb["y"]) < 0.08:
                sx = max(ra["x"], rb["x"])
                ex = min(rax2, rbx2)
                if ex - sx > 0.1:
                    try_add_wall(sx, ray2, ex, ray2)

            # rb bottom touches ra top
            if abs(rby2 - ra["y"]) < 0.08:
                sx = max(ra["x"], rb["x"])
                ex = min(rax2, rbx2)
                if ex - sx > 0.1:
                    try_add_wall(sx, rby2, ex, rby2)

            # ra right touches rb left
            if abs(rax2 - rb["x"]) < 0.08:
                sy = max(ra["y"], rb["y"])
                ey = min(ray2, rby2)
                if ey - sy > 0.1:
                    try_add_wall(rax2, sy, rax2, ey)

            # rb right touches ra left
            if abs(rbx2 - ra["x"]) < 0.08:
                sy = max(ra["y"], rb["y"])
                ey = min(ray2, rby2)
                if ey - sy > 0.1:
                    try_add_wall(rbx2, sy, rbx2, ey)

    return walls


# ═══════════════════════════════════════════════════════════════
# OPENING GENERATION
# ═══════════════════════════════════════════════════════════════

def _generate_openings(rooms, walls, brief, bx, by, bw, bl) -> list:
    openings = []
    oid = [1]

    def add(wall_id, kind, offset, width=DOOR_WIDTH, height=None, sill=0):
        openings.append({
            "id": f"o{oid[0]}",
            "wallId": wall_id,
            "kind": kind,
            "offset": round(max(0.1, offset), 3),
            "width": round(width, 3),
            "height": round(height or (2.1 if kind == "door" else 1.2), 3),
            "sillHeight": round(sill, 3)
        })
        oid[0] += 1

    def wall_used(wall_id, kind="door"):
        return any(o["wallId"] == wall_id and o["kind"] == kind for o in openings)

    def find_wall(wall_id):
        return next((w for w in walls if w["id"] == wall_id), None)

    # ── Main entrance on front exterior wall ─────────────────
    fw = find_wall("w-ext-N")
    if fw:
        flen = abs(fw["x2"] - fw["x1"])
        add("w-ext-N", "door", flen / 2 - DOOR_WIDTH / 2)

    # ── Windows on front wall for public rooms ────────────────
    for r in rooms:
        if r["type"] not in ("living", "drawing"):
            continue
        if abs(r["y"] - by) < 0.5:
            offset = r["x"] + r["width"] / 2 - WINDOW_WIDTH / 2
            if fw and 0.3 < offset < abs(fw["x2"] - fw["x1"]) - WINDOW_WIDTH:
                add("w-ext-N", "window", offset, WINDOW_WIDTH, sill=0.9)

    # ── Windows on back wall for bedrooms ─────────────────────
    bwall = find_wall("w-ext-S")
    if bwall:
        back_edge = by + bl
        for r in rooms:
            if r["type"] != "bedroom":
                continue
            if abs((r["y"] + r["height"]) - back_edge) < 0.8:
                offset = r["x"] + r["width"] / 2 - WINDOW_WIDTH / 2
                blen = abs(bwall["x2"] - bwall["x1"])
                if 0.3 < offset < blen - WINDOW_WIDTH:
                    add("w-ext-S", "window", offset, WINDOW_WIDTH, sill=0.9)

    # ── Side windows ──────────────────────────────────────────
    lwall = find_wall("w-ext-W")
    rwall = find_wall("w-ext-E")
    right_edge = bx + bw

    for r in rooms:
        if r["type"] not in ("bedroom", "living", "dining", "drawing"):
            continue
        if lwall and abs(r["x"] - 0) < 0.5:
            offset = r["y"] + r["height"] / 2 - WINDOW_WIDTH / 2
            llen = abs(lwall["y2"] - lwall["y1"])
            if 0.3 < offset < llen - WINDOW_WIDTH:
                add("w-ext-W", "window", offset, WINDOW_WIDTH, sill=0.9)
        if rwall and abs((r["x"] + r["width"]) - right_edge) < 1.0:
            offset = r["y"] + r["height"] / 2 - WINDOW_WIDTH / 2
            rlen = abs(rwall["y2"] - rwall["y1"])
            if 0.3 < offset < rlen - WINDOW_WIDTH:
                add("w-ext-E", "window", offset, WINDOW_WIDTH, sill=0.9)

    # ── Bedroom → attached bathroom doors ────────────────────
    # Find bedroom-bathroom pairs that share a vertical wall
    for r in rooms:
        if r["type"] != "bedroom":
            continue
        bed_right = r["x"] + r["width"]
        bed_top = r["y"]
        bed_bot = r["y"] + r["height"]

        # Look for a bathroom immediately to the right
        for b in rooms:
            if b["type"] != "bathroom":
                continue
            if abs(b["x"] - bed_right) < 0.1:
                # bathroom is to the right of bedroom
                shared_top = max(bed_top, b["y"])
                shared_bot = min(bed_bot, b["y"] + b["height"])
                if shared_bot - shared_top < DOOR_WIDTH + 0.1:
                    continue
                # Find vertical wall at bed_right
                shared_wall = next((
                    w for w in walls
                    if w["kind"] == "interior"
                    and abs(w["x1"] - w["x2"]) < 0.01
                    and abs(w["x1"] - bed_right) < 0.1
                    and min(w["y1"], w["y2"]) <= shared_top + 0.1
                    and max(w["y1"], w["y2"]) >= shared_bot - 0.1
                ), None)
                if shared_wall and not wall_used(shared_wall["id"]):
                    wy1 = min(shared_wall["y1"], shared_wall["y2"])
                    door_offset = (shared_top + shared_bot) / 2 - wy1 - DOOR_WIDTH / 2
                    wlen = abs(shared_wall["y2"] - shared_wall["y1"])
                    if 0.1 < door_offset < wlen - DOOR_WIDTH:
                        add(shared_wall["id"], "door", door_offset)

    # ── Bedroom entrance doors (top wall of private zone) ─────
    # Each bedroom needs a door on the horizontal wall separating
    # service zone (kitchen/dining) from private zone (bedrooms)
    for r in rooms:
        if r["type"] != "bedroom":
            continue
        top_y = r["y"]
        # Find horizontal interior wall at exactly the top of this bedroom
        top_wall = next((
            w for w in walls
            if w["kind"] == "interior"
            and abs(w["y1"] - w["y2"]) < 0.01        # horizontal
            and abs(w["y1"] - top_y) < 0.12           # at bedroom top
            and min(w["x1"], w["x2"]) < r["x"] + r["width"] - 0.2
            and max(w["x1"], w["x2"]) > r["x"] + 0.2
        ), None)

        if not top_wall:
            continue

        # Calculate offset: door at 20% from bedroom's left within this wall
        wx1 = min(top_wall["x1"], top_wall["x2"])
        wx2 = max(top_wall["x1"], top_wall["x2"])
        wlen = wx2 - wx1

        # Door position: center of bedroom's segment on this wall
        room_center = r["x"] + r["width"] * 0.25  # slight left of center
        door_offset = room_center - wx1

        # Clamp
        door_offset = max(0.15, min(door_offset, wlen - DOOR_WIDTH - 0.15))

        # Check this specific segment doesn't already have a door too close
        seg_has_door = any(
            o["wallId"] == top_wall["id"]
            and o["kind"] == "door"
            and abs(o["offset"] - door_offset) < DOOR_WIDTH + 0.3
            for o in openings
        )
        if not seg_has_door:
            add(top_wall["id"], "door", door_offset)

    # ── Kitchen/dining entrance doors ────────────────────────
    for r in rooms:
        if r["type"] not in ("kitchen", "dining"):
            continue
        top_y = r["y"]
        top_wall = next((
            w for w in walls
            if w["kind"] == "interior"
            and abs(w["y1"] - w["y2"]) < 0.01
            and abs(w["y1"] - top_y) < 0.12
            and min(w["x1"], w["x2"]) < r["x"] + r["width"] - 0.2
            and max(w["x1"], w["x2"]) > r["x"] + 0.2
        ), None)
        if not top_wall:
            continue

        wx1 = min(top_wall["x1"], top_wall["x2"])
        wx2 = max(top_wall["x1"], top_wall["x2"])
        wlen = wx2 - wx1
        room_center = r["x"] + r["width"] / 2
        door_offset = max(0.15, min(room_center - wx1 - DOOR_WIDTH / 2, wlen - DOOR_WIDTH - 0.15))

        seg_has_door = any(
            o["wallId"] == top_wall["id"]
            and o["kind"] == "door"
            and abs(o["offset"] - door_offset) < DOOR_WIDTH + 0.3
            for o in openings
        )
        if not seg_has_door:
            add(top_wall["id"], "door", door_offset)

    # ── Living/drawing entrance from front ───────────────────
    for r in rooms:
        if r["type"] not in ("living", "drawing"):
            continue
        # Front wall already has main entrance — add window not door
        # Side wall door if room doesn't touch front
        pass  # windows already added above

    return openings