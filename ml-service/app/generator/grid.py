import math

ROOM_LABELS = {
    "bedroom": "Bedroom",
    "bathroom": "Bathroom",
    "kitchen": "Kitchen",
    "living": "Living",
    "dining": "Dining",
    "study": "Study",
    "garage": "Garage",
    "store": "Store",
    "other": "Room",
}

# Target priorities — larger numbers get larger cells in the grid
TARGET_SIZE = {
    "living": 3,
    "garage": 3,
    "dining": 2,
    "kitchen": 2,
    "bedroom": 2,
    "study": 1,
    "store": 1,
    "bathroom": 1,
}


def generate_grid_layout(plot_width: float, plot_length: float, rooms: list) -> dict:
    """
    A simple grid-based layout generator. Slightly smarter than the JS stub:
      - Flattens room counts into individual rooms
      - Sorts by target size descending so big rooms come first
      - Picks a column count that roughly squares the layout
    """
    # Flatten {type, count} into individual rooms
    flat = []
    for r in rooms:
        for i in range(r["count"]):
            flat.append({
                "type": r["type"],
                "index_label": (i + 1) if r["count"] > 1 else None,
            })

    # Sort descending by target size so larger rooms appear first
    flat.sort(key=lambda r: TARGET_SIZE.get(r["type"], 1), reverse=True)

    # Pick a column count that fits the plot's aspect ratio
    aspect_ratio = plot_width / plot_length
    n = len(flat)
    cols = max(1, round(math.sqrt(n * aspect_ratio)))
    rows = math.ceil(n / cols)

    cell_w = plot_width / cols
    cell_h = plot_length / rows
    margin = 0.1  # small gap so rooms don't sit on walls

    layout_rooms = []
    for idx, r in enumerate(flat):
        col = idx % cols
        row = idx // cols
        base_label = ROOM_LABELS.get(r["type"], "Room")
        label = f"{base_label} {r['index_label']}" if r["index_label"] else base_label
        layout_rooms.append({
            "id": f"r{idx + 1}",
            "type": r["type"],
            "label": label,
            "x": col * cell_w + margin,
            "y": row * cell_h + margin,
            "width": cell_w - 2 * margin,
            "height": cell_h - 2 * margin,
        })

    # Exterior walls — perimeter rectangle
    walls = [
        {"id": "w-n", "x1": 0,          "y1": 0,           "x2": plot_width, "y2": 0,           "thickness": 0.23, "kind": "exterior"},
        {"id": "w-e", "x1": plot_width, "y1": 0,           "x2": plot_width, "y2": plot_length, "thickness": 0.23, "kind": "exterior"},
        {"id": "w-s", "x1": plot_width, "y1": plot_length, "x2": 0,          "y2": plot_length, "thickness": 0.23, "kind": "exterior"},
        {"id": "w-w", "x1": 0,          "y1": plot_length, "x2": 0,          "y2": 0,           "thickness": 0.23, "kind": "exterior"},
    ]

    # One door on the south side
    openings = [
        {
            "id": "o1",
            "wallId": "w-s",
            "kind": "door",
            "offset": plot_width / 2 - 0.45,
            "width": 0.9,
        }
    ]

    return {
        "plot": {"width": plot_width, "length": plot_length},
        "rooms": layout_rooms,
        "walls": walls,
        "openings": openings,
        "meta": {"generator": "grid-v1-py", "version": "0.1.0"},
    }