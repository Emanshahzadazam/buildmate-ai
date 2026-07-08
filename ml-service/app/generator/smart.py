"""
Realistic Pakistani Residential Floor Plan Generator (lightweight/fast path)

Same "brief" schema as architect.py — plot / setbacks / rooms / hasGarage /
hasStoreRoom / hasStaircase / floors — so it's a drop-in alternative for
quick previews without pulling in the full ProfessionalLayoutGenerator.

v3 changes (this revision):
  1. Zone depths (public / service / private bands) are now sized
     proportionally to what's actually in each zone — ported from
     BuildMate v6's JS `buildLayout()` engine (Step 4: "zone preferred
     height, scaled so total = buildable length") — instead of a fixed
     25% / 20% / 55% split. A plot with no garage no longer wastes public
     depth on nothing; a house with 4 bedrooms gets a taller private band.
  2. Every opening (door/window) is now guaranteed a real, non-empty
     `wallId`. Previously every opening hard-coded `'wallId': ''`, which
     is what caused:
         Project validation failed: layout.openings.0.wallId: Path
         `wallId` is required.
     Root fix: `_door()` / `_window()` never accept a blank id — if one
     isn't supplied they create (or reuse, if the same wall segment was
     already used) a real wall record and use *that* id. It is now
     structurally impossible for this generator to emit an empty wallId.
  3. Corridor + bathroom wing kept (ported originally from architect.py /
     buildmate_v6.html's JS engine): every bedroom/bathroom gets its own
     door into a hallway, the hallway opens back into the rest of the
     house, and doors sit on the wall the room actually touches.
"""
import uuid
from typing import Dict, List, Any, Tuple

MIN_ROOM_SIZES = {
    "master_bedroom": 150, "bedroom": 100, "bathroom": 40, "kitchen": 100,
    "living": 150, "dining": 120, "drawing": 180, "garage": 250,
    "store": 50, "staircase": 45, "other": 80,
}
CIRCULATION_FACTOR = 1.25


def _room_counts(brief: Dict[str, Any]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for req in brief.get('rooms', []) or []:
        t = req.get('type', 'other')
        counts[t] = counts.get(t, 0) + max(0, int(req.get('count', 1)))
    return counts


def check_feasibility(brief: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """Quick feasibility pre-check — same idea as architect.py's ArchitecturalValidator."""
    plot = brief.get('plot', {}) or {}
    setbacks = brief.get('setbacks', {}) or {}

    plot_width = (plot.get('frontWidth', 40) + plot.get('backWidth', 40)) / 2.0
    plot_length = (plot.get('leftLength', 70) + plot.get('rightLength', 70)) / 2.0

    buildable_width = max(1.0, plot_width - setbacks.get('left', 1) - setbacks.get('right', 1))
    buildable_length = max(1.0, plot_length - setbacks.get('front', 4) - setbacks.get('back', 2))
    buildable_area = buildable_width * buildable_length

    counts = _room_counts(brief)
    required = 0.0
    for rtype, count in counts.items():
        if rtype == 'bedroom':
            required += MIN_ROOM_SIZES['master_bedroom'] + max(0, count - 1) * MIN_ROOM_SIZES['bedroom']
        else:
            required += MIN_ROOM_SIZES.get(rtype, MIN_ROOM_SIZES['other']) * count

    if brief.get('hasGarage'):
        required += MIN_ROOM_SIZES['garage']
    if brief.get('hasStoreRoom'):
        required += MIN_ROOM_SIZES['store']
    if brief.get('hasStaircase') or int(brief.get('floors', 1) or 1) > 1:
        required += MIN_ROOM_SIZES['staircase']

    required_with_circ = required * CIRCULATION_FACTOR
    feasible = required_with_circ <= buildable_area
    utilization = (required_with_circ / buildable_area * 100) if buildable_area > 0 else 999

    analysis = {
        'plot_width': plot_width, 'plot_length': plot_length,
        'buildable_width': buildable_width, 'buildable_length': buildable_length,
        'buildable_area': buildable_area, 'required_area': required,
        'required_with_circulation': required_with_circ, 'utilization': utilization,
        'room_counts': counts,
    }

    if not feasible:
        msg = (
            f"Requirements don't fit realistically on this plot.\n"
            f"Required (with circulation): {required_with_circ:.0f} sq ft\n"
            f"Available: {buildable_area:.0f} sq ft\n"
            f"Shortfall: {required_with_circ - buildable_area:.0f} sq ft "
            f"({utilization:.1f}% utilization)\n\n"
            f"Suggestions: reduce bedroom/bathroom count, add a floor, "
            f"or increase the plot size."
        )
        return False, msg, analysis

    return True, "Requirements fit.", analysis


# ─────────────────────────────────────────────────────────────────────────
#  WALL REGISTRY — the fix for the wallId bug lives here.
#  Every door/window is created through _door()/_window(), which always
#  resolves to a real wall id: either an existing one at that exact
#  segment (deduped by coordinates) or a freshly created one. There is no
#  code path left in this file that can emit `wallId: ''`.
# ─────────────────────────────────────────────────────────────────────────

def _wall_key(x1: float, y1: float, x2: float, y2: float) -> Tuple[float, float, float, float]:
    return (round(min(x1, x2), 2), round(min(y1, y2), 2), round(max(x1, x2), 2), round(max(y1, y2), 2))


def _get_wall(walls: List[Dict], registry: Dict, x1: float, y1: float, x2: float, y2: float,
              thickness: float, is_external: bool = False) -> str:
    key = _wall_key(x1, y1, x2, y2)
    wid = registry.get(key)
    if wid:
        return wid
    wid = str(uuid.uuid4())
    walls.append({
        'id': wid, 'x1': round(x1, 3), 'y1': round(y1, 3), 'x2': round(x2, 3), 'y2': round(y2, 3),
        'thickness': thickness, 'isExternal': is_external,
    })
    registry[key] = wid
    return wid


def _door(openings: List[Dict], wall_id: str, direction: str, x: float, y: float,
          width: float, label: str, height: float = 6.83) -> None:
    assert wall_id, "internal error: attempted to create a door with no wallId"
    openings.append({
        'id': str(uuid.uuid4()), 'kind': 'door', 'type': 'door', 'wallId': wall_id,
        'direction': direction, 'offset': 0, 'width': width, 'height': height,
        'x': round(x, 3), 'y': round(y, 3), 'label': label,
    })


def _window(openings: List[Dict], wall_id: str, direction: str, x: float, y: float,
            width: float, label: str, height: float = 4.0) -> None:
    assert wall_id, "internal error: attempted to create a window with no wallId"
    openings.append({
        'id': str(uuid.uuid4()), 'kind': 'window', 'type': 'window', 'wallId': wall_id,
        'direction': direction, 'offset': 0, 'width': width, 'height': height,
        'x': round(x, 3), 'y': round(y, 3), 'label': label,
    })


def _bedroom_wing(rooms: List[Dict], openings: List[Dict], walls: List[Dict], registry: Dict,
                   x: float, y: float, w: float, h: float, bed_count: int, bath_count: int,
                   wall_int: float) -> None:
    """Bedrooms + bathrooms around a real corridor (stacked style):
    [bedrooms | corridor | bathrooms]. The corridor opens north into
    whichever zone sits above it. Every bedroom/bathroom gets its own
    door into the corridor — nothing is ever sealed off."""
    bed_count = max(1, int(bed_count))
    bath_count = max(0, min(int(bath_count), bed_count))

    corridor_w = min(4.5, max(3.0, min(w, h) * 0.09))
    bed_w = max(9.0, w * 0.52)
    corridor_x = x + bed_w
    bath_x = corridor_x + corridor_w
    bath_w = max(4.0, (x + w) - bath_x)
    row_h = h / bed_count

    rooms.append({
        'id': str(uuid.uuid4()), 'label': 'Corridor', 'name': 'Corridor', 'type': 'corridor',
        'x': corridor_x, 'y': y, 'width': corridor_w, 'height': h, 'color': '#F7F7F5',
    })
    hall_dw = min(3.5, corridor_w)
    hall_wall = _get_wall(walls, registry, corridor_x, y + h, corridor_x + corridor_w, y + h, wall_int)
    _door(openings, hall_wall, 'north', corridor_x + corridor_w / 2, y + h, hall_dw, 'D-H')

    for i in range(bed_count):
        row_top = y + h - i * row_h
        row_bottom = row_top - row_h
        name = 'Master Bedroom' if i == 0 else f'Bedroom {i + 1}'
        rooms.append({
            'id': str(uuid.uuid4()), 'label': name, 'name': name, 'type': 'bedroom',
            'x': x, 'y': row_bottom, 'width': bed_w, 'height': row_h, 'color': '#E8F4F8',
        })
        bed_wall = _get_wall(walls, registry, x + bed_w, row_bottom, x + bed_w, row_top, wall_int)
        _door(openings, bed_wall, 'east', x + bed_w, row_bottom + row_h / 2,
              min(3.0, row_h - 0.5), f'D-B{i + 1}')

        if i < bath_count:
            bname = f'Bathroom {i + 1}'
            rooms.append({
                'id': str(uuid.uuid4()), 'label': bname, 'name': bname, 'type': 'bathroom',
                'x': bath_x, 'y': row_bottom, 'width': bath_w, 'height': row_h, 'color': '#D4E8FF',
            })
            bath_wall = _get_wall(walls, registry, bath_x, row_bottom, bath_x, row_top, wall_int)
            _door(openings, bath_wall, 'west', bath_x, row_bottom + row_h / 2,
                  min(2.6, row_h - 0.5), f'D-Ba{i + 1}')


def _place_row(rooms: List[Dict], walls: List[Dict], registry: Dict,
               x: float, y: float, w: float, h: float, items: List[Dict],
               wall_int: float, mirror: bool = False) -> List[Dict]:
    """Flexible-width row placement, ported from BuildMate v6's Step 5
    (`buildLayout`): items with a 'fixed_w' eat their share first; every
    other item shares the remaining width equally. Returns the placed
    items with their resolved x/width so callers can hang doors/windows
    off the correct edges."""
    ordered = list(reversed(items)) if mirror else items
    n = len(ordered)
    gaps = max(0, n - 1) * wall_int
    fixed_total = sum(it.get('fixed_w', 0) or 0 for it in ordered)
    flex_items = [it for it in ordered if not it.get('fixed_w')]
    flex_w = max(6.0, (w - fixed_total - gaps) / len(flex_items)) if flex_items else 0.0

    cx = x
    placed = []
    for it in ordered:
        iw = it.get('fixed_w') or flex_w
        rooms.append({
            'id': str(uuid.uuid4()), 'label': it['name'], 'name': it['name'], 'type': it['type'],
            'x': cx, 'y': y, 'width': iw, 'height': h, 'color': it['color'],
        })
        placed.append({**it, 'x': cx, 'width': iw})
        cx += iw + wall_int
    return placed


def _build_layout(brief: Dict[str, Any], analysis: Dict[str, Any], mirror: bool = False) -> Dict[str, Any]:
    """Builds one layout. mirror=True flips the public zone's kitchen/dining
    columns and the drawing/garage columns left-right — used by
    generate_floor_plan_variants() to produce quick, genuinely different
    alternatives instead of returning the same layout three times."""
    setbacks = brief.get('setbacks', {}) or {}

    plot_width = analysis['plot_width']
    plot_length = analysis['plot_length']
    buildable_width = analysis['buildable_width']
    buildable_length = analysis['buildable_length']
    counts = analysis['room_counts']

    start_x = setbacks.get('left', 1)
    start_y = setbacks.get('front', 4)

    wall_ext = 0.75
    wall_int = 0.375

    x_pos = start_x + wall_ext
    y_pos = start_y + wall_ext
    zone_width = buildable_width - 2 * wall_ext
    zone_height = buildable_length - 2 * wall_ext

    rooms: List[Dict[str, Any]] = []
    walls: List[Dict[str, Any]] = []
    openings: List[Dict[str, Any]] = []
    wall_registry: Dict = {}

    has_garage = bool(brief.get('hasGarage', False))
    has_store = bool(brief.get('hasStoreRoom', False))
    has_stairs = bool(brief.get('hasStaircase') or int(brief.get('floors', 1) or 1) > 1)
    bed_count = counts.get('bedroom', 0) or 2
    bath_count = max(1, counts.get('bathroom', 0) or min(2, bed_count))

    # ── ZONE SPLIT (ported from buildmate_v6.html Step 4: proportional
    #    zone depth instead of a fixed 25/20/55% split) ──────────────────
    pub_pref = 20.0 if has_garage else 14.0
    service_pref = 12.0
    private_pref = max(10.0 * bed_count, 20.0)
    total_pref = pub_pref + service_pref + private_pref
    scale = zone_height / total_pref if total_pref > 0 else 1.0

    public_depth = max(9.0, round(pub_pref * scale, 2))
    service_depth = max(8.0, round(service_pref * scale, 2))
    private_depth = max(12.0, round(zone_height - public_depth - service_depth - 2 * wall_int, 2))

    public_y = y_pos + zone_height - public_depth       # top-most band
    service_y = public_y - wall_int - service_depth      # middle band
    private_y = y_pos                                     # bottom band (rear of house)

    # ===== PUBLIC ZONE: garage (optional) + drawing room =====
    pub_items = []
    if has_garage:
        pub_items.append({'type': 'garage', 'name': 'Garage', 'color': '#F0F0F0',
                           'fixed_w': min(18.0, zone_width * 0.35)})
    pub_items.append({'type': 'drawing', 'name': 'Drawing Room', 'color': '#E8F0FF'})

    pub_placed = _place_row(rooms, walls, wall_registry, x_pos, public_y, zone_width, public_depth,
                             pub_items, wall_int, mirror=mirror)

    edge_y = public_y + public_depth
    for it in pub_placed:
        wid = _get_wall(walls, wall_registry, it['x'], edge_y, it['x'] + it['width'], edge_y, wall_ext, True)
        if it['type'] == 'garage':
            _door(openings, wid, 'north', it['x'] + it['width'] / 2, edge_y,
                  min(10.0, it['width'] * 0.7), 'GATE')
        else:  # drawing
            _door(openings, wid, 'north', it['x'] + it['width'] / 2, edge_y, 3.0, 'D1')
            _window(openings, wid, 'north', it['x'] + it['width'] / 2, edge_y,
                    min(4.0, it['width'] * 0.4), 'W1')

    # ===== SERVICE ZONE: kitchen [+ staircase] + dining [+ store] as real columns =====
    stair_w = min(6.0, zone_width * 0.14) if has_stairs else 0.0
    store_w = min(6.0, zone_width * 0.14) if has_store else 0.0

    svc_items = [{'type': 'kitchen', 'name': 'Kitchen', 'color': '#FFF9E6'}]
    if has_stairs:
        svc_items.append({'type': 'staircase', 'name': 'Staircase', 'color': '#F0F0F0', 'fixed_w': stair_w})
    svc_items.append({'type': 'dining', 'name': 'Dining', 'color': '#FFE8D4'})
    if has_store:
        svc_items.append({'type': 'store', 'name': 'Store Room', 'color': '#F4F4F4', 'fixed_w': store_w})

    svc_placed = _place_row(rooms, walls, wall_registry, x_pos, service_y, zone_width, service_depth,
                             svc_items, wall_int, mirror=mirror)

    svc_edge_y = service_y + service_depth
    for it in svc_placed:
        if it['type'] not in ('kitchen', 'dining'):
            continue
        wid = _get_wall(walls, wall_registry, it['x'], svc_edge_y, it['x'] + it['width'], svc_edge_y, wall_int)
        label = 'D2' if it['type'] == 'kitchen' else 'D3'
        _door(openings, wid, 'north', it['x'] + it['width'] / 2, svc_edge_y, 3.0, label)

    if abs(service_y - y_pos) < 0.5:
        kitchen_it = next((it for it in svc_placed if it['type'] == 'kitchen'), None)
        if kitchen_it:
            wid = _get_wall(walls, wall_registry, kitchen_it['x'], service_y,
                             kitchen_it['x'] + kitchen_it['width'], service_y, wall_ext, True)
            _window(openings, wid, 'south', kitchen_it['x'] + kitchen_it['width'] / 2, service_y,
                    min(3.0, kitchen_it['width'] * 0.4), 'W2')

    # ===== PRIVATE ZONE: bedroom wing with a real corridor =====
    _bedroom_wing(rooms, openings, walls, wall_registry, x_pos, private_y, zone_width, private_depth,
                  bed_count, bath_count, wall_int)

    for r in rooms:
        if r['type'] == 'bedroom' and abs(r['y'] - y_pos) < 0.5:
            wid = _get_wall(walls, wall_registry, r['x'], y_pos, r['x'] + r['width'], y_pos, wall_ext, True)
            _window(openings, wid, 'south', r['x'] + r['width'] / 2, y_pos,
                    min(3.5, r['width'] * 0.5), 'W')

    # ===== EXTERIOR SHELL (for completeness — the renderer draws its own
    #        boundary from `dimensions`/`buildable`, these are for data
    #        consistency and any future consumer that reads `walls[]`) =====
    plot_min_x, plot_max_x = start_x, start_x + buildable_width
    plot_min_y, plot_max_y = start_y, start_y + buildable_length
    _get_wall(walls, wall_registry, plot_min_x, plot_min_y, plot_max_x, plot_min_y, wall_ext, True)
    _get_wall(walls, wall_registry, plot_min_x, plot_max_y, plot_max_x, plot_max_y, wall_ext, True)
    _get_wall(walls, wall_registry, plot_min_x, plot_min_y, plot_min_x, plot_max_y, wall_ext, True)
    _get_wall(walls, wall_registry, plot_max_x, plot_min_y, plot_max_x, plot_max_y, wall_ext, True)

    return {
        'status': 'success',
        'rooms': rooms,
        'walls': walls,
        'openings': openings,
        'dimensions': {
            'plotWidth': plot_width, 'plotLength': plot_length,
            'buildableWidth': buildable_width, 'buildableLength': buildable_length,
            'totalArea': buildable_width * buildable_length,
        },
        'buildable': {
            'width': buildable_width, 'length': buildable_length,
            'offsetX': start_x, 'offsetY': start_y,
            'min_x': start_x, 'max_x': start_x + buildable_width,
            'min_y': start_y, 'max_y': start_y + buildable_length,
        },
        'feasible': True,
    }


def generate_floor_plan(brief):
    """Generate a single realistic floor plan (fast path, with corridor + bathroom wing)."""
    try:
        feasible, msg, analysis = check_feasibility(brief)
        if not feasible:
            return {'status': 'error', 'message': msg, 'rooms': [], 'walls': [], 'openings': [], 'feasible': False}

        return _build_layout(brief, analysis, mirror=False)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'status': 'error', 'message': str(e), 'rooms': [], 'walls': [], 'openings': [], 'feasible': False}


def generate_floor_plan_variants(brief):
    """3 quick alternatives (not the full architect.py A/B/C strategies —
    just left/right mirrors of the same fast layout, useful for a quick
    preview carousel). For genuinely distinct architectural strategies,
    use architect.py's generate_three_variants() instead."""
    try:
        feasible, msg, analysis = check_feasibility(brief)
        if not feasible:
            return [{'status': 'error', 'message': msg, 'rooms': [], 'walls': [], 'openings': [], 'feasible': False}]

        variants = []
        for i, mirror in enumerate([False, True, False]):
            layout = _build_layout(brief, analysis, mirror=mirror)
            layout['variant'] = chr(65 + i)
            layout['variantName'] = f'Layout {chr(65 + i)}'
            variants.append(layout)
        return variants
    except Exception as e:
        import traceback
        traceback.print_exc()
        return [{'status': 'error', 'message': str(e), 'rooms': [], 'walls': [], 'openings': [], 'feasible': False}]